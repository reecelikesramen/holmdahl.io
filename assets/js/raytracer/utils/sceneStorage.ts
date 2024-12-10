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

export async function loadScene(filename: string) {
  return await db.scenes.get(filename)
}

export function isSceneModified(originalContent: string, currentContent: string): boolean {
  return originalContent !== currentContent
}
