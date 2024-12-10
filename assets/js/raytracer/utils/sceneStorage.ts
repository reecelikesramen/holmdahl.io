import { db } from "./db"
import * as JSON5 from "json5"

export function formatJson(content: string): string {
  try {
    const parsed = JSON5.parse(content)
    return JSON.stringify(parsed, null, 2)
  } catch (e) {
    console.error("Error formatting JSON:", e)
    return content
  }
}

export async function saveScene(filename: string, content: string, path?: string): Promise<void> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content)).then((buf) =>
    Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  )

  // Delete any existing scene with the same filename
  await db.scenes.where("filename").equals(filename).delete()

  // Save the new version
  await db.scenes.put({
    filename,
    path, // path is only set for built-in scenes
    content,
    hash,
  })

  // Clear the modified content since we just saved
  clearModifiedContent(filename)

  // Dispatch event to notify scene list to refresh
  window.dispatchEvent(new Event("scenesUpdated"))
}

interface SceneIndex {
  scenes: Array<{
    name: string
    path: string
    hash: string
  }>
}

export let sceneIndex: SceneIndex | null = null

export async function initSceneIndex() {
  const response = await fetch("/raytracer/index.json")
  if (!response.ok) throw new Error("Failed to fetch scenes index")
  sceneIndex = await response.json()
}

export async function loadScene(filename: string): Promise<{ content: string; isRemote: boolean }> {
  if (!sceneIndex) {
    throw new Error("Scene index not initialized")
  }

  // First check if there's an unsaved version in memory
  const memoryContent = modifiedScenes.get(filename)
  if (memoryContent) {
    // If it's in memory, we need to determine if it was remote or not
    const dbScene = await db.scenes.get(filename)
    return { content: formatJson(memoryContent), isRemote: !!dbScene?.path }
  }

  // Find if it's a built-in scene
  const indexEntry = sceneIndex.scenes.find((s) => s.name === filename)
  const dbScene = await db.scenes.get(filename)

  if (indexEntry) {
    // Built-in scene logic
    if (dbScene && dbScene.hash === indexEntry.hash) {
      // Use cached version if hash matches
      return { content: formatJson(dbScene.content), isRemote: true }
    } else {
      // Download and cache if not found or hash mismatch
      const response = await fetch(indexEntry.path)
      if (!response.ok) throw new Error(`Failed to fetch scene: ${filename}`)
      const content = formatJson(await response.text())

      await saveScene(filename, content, indexEntry.path)
      return { content, isRemote: true }
    }
  } else if (dbScene) {
    // User-created scene
    return { content: formatJson(dbScene.content), isRemote: false }
  }

  throw new Error(`Scene not found: ${filename}`)
}

// Map to store modified but unsaved content
const modifiedScenes = new Map<string, string>()

export function setModifiedContent(filename: string, content: string) {
  // Only set if content actually changed
  console.log(modifiedScenes)
  const currentContent = modifiedScenes.get(filename)
  if (content !== currentContent) {
    modifiedScenes.set(filename, content)
  }
}

export function clearModifiedContent(filename: string) {
  modifiedScenes.delete(filename)
}

export function isSceneModified(filename: string): boolean {
  return modifiedScenes.has(filename)
}
