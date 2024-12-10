import { db } from "./db"

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
    path,  // path is only set for built-in scenes
    content,
    hash
  })

  // Dispatch event to notify scene list to refresh
  window.dispatchEvent(new Event("scenesUpdated"))
}

interface SceneIndex {
  scenes: Array<{
    filename: string
    path: string
    hash: string
  }>
}

let sceneIndex: SceneIndex | null = null

export async function initSceneIndex() {
  const response = await fetch('/raytracer/index.json')
  if (!response.ok) throw new Error('Failed to fetch scenes index')
  sceneIndex = await response.json()
}

export async function loadScene(filename: string): Promise<{ content: string, isRemote: boolean }> {
  if (!sceneIndex) {
    throw new Error('Scene index not initialized')
  }

  // Find if it's a built-in scene
  const indexEntry = sceneIndex.scenes.find(s => s.filename === filename)
  const dbScene = await db.scenes.get(filename)

  if (indexEntry) {
    // Built-in scene logic
    if (dbScene && dbScene.hash === indexEntry.hash) {
      // Use cached version if hash matches
      return { content: dbScene.content, isRemote: true }
    } else {
      // Download and cache if not found or hash mismatch
      const response = await fetch(indexEntry.path)
      if (!response.ok) throw new Error(`Failed to fetch scene: ${filename}`)
      const content = await response.text()
      
      await saveScene(filename, content, indexEntry.path)
      return { content, isRemote: true }
    }
  } else if (dbScene) {
    // User-created scene
    return { content: dbScene.content, isRemote: false }
  }

  throw new Error(`Scene not found: ${filename}`)
}

export function isSceneModified(originalContent: string, currentContent: string): boolean {
  return originalContent !== currentContent
}
