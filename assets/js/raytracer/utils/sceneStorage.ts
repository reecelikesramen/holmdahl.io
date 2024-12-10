import { db } from './db';

export async function saveScene(filename: string, content: string): Promise<void> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content))
    .then(buf => Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join(""));

  await db.scenes.put({
    path: `/raytracer/scenes/${filename}`,
    content,
    hash,
  });
}

export async function loadScene(filename: string) {
  return await db.scenes.get(filename);
}

export function isSceneModified(originalContent: string, currentContent: string): boolean {
  return originalContent !== currentContent;
}
