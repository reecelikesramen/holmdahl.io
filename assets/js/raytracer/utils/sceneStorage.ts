interface Scene {
  path: string
  content: string
  hash: string
}

export async function openSceneDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("raytracer-scenes", 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains("scenes")) {
        db.createObjectStore("scenes", { keyPath: "path" })
      }
    }
  })
}

export async function saveScene(filename: string, content: string): Promise<void> {
  const db = await openSceneDB()
  const transaction = db.transaction(["scenes"], "readwrite")
  const store = transaction.objectStore("scenes")

  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content)).then((buf) =>
    Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  )

  await store.put({
    path: filename,
    content,
    hash,
  })
}

export async function loadScene(filename: string): Promise<Scene | null> {
  const db = await openSceneDB()
  const transaction = db.transaction(["scenes"], "readonly")
  const store = transaction.objectStore("scenes")
  return store.get(filename)
}

export function isSceneModified(originalContent: string, currentContent: string): boolean {
  return originalContent !== currentContent
}
