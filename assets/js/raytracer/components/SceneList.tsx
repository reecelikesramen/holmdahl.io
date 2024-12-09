import { useState, useEffect } from "preact/hooks"
import { FixedSizeList } from 'react-window'

interface Scene {
  name: string
  path: string
  hash: string
}

interface SceneListProps {
  onSceneSelect: (sceneJson: string) => void
  onClose: () => void
}

export function SceneList({ onSceneSelect, onClose }: SceneListProps) {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadScenes()
  }, [])

  const loadScenes = async () => {
    try {
      const response = await fetch('/raytracer/scenes/index.json')
      if (!response.ok) throw new Error('Failed to fetch scenes index')
      const data = await response.json()
      setScenes(data.scenes)
    } catch (err) {
      setError(err.message)
      console.error('Error loading scenes:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadScene = async (scene: Scene) => {
    const db = await openDB()
    const storedScene = await db.get('scenes', scene.path)

    if (storedScene && storedScene.hash === scene.hash) {
      onSceneSelect(storedScene.content)
    } else {
      const response = await fetch(scene.path)
      const content = await response.text()
      
      await db.put('scenes', {
        path: scene.path,
        hash: scene.hash,
        content
      })

      onSceneSelect(content)
    }
  }

  const openDB = async () => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('raytracer-scenes', 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('scenes')) {
          db.createObjectStore('scenes', { keyPath: 'path' })
        }
      }
    })
  }

  if (loading) return <div>Loading scenes...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="editor-pane">
      <div className="pane-title">
        Scenes
        <button onClick={onClose}>✕</button>
      </div>
      <div className="scenes-container">
        <FixedSizeList
          height={565}
          width="100%"
          itemCount={scenes.length}
          itemSize={35}
        >
          {({ index, style }) => (
            <div 
              className="scene-item" 
              style={style}
              onClick={() => loadScene(scenes[index])}
            >
              {scenes[index].name}
            </div>
          )}
        </FixedSizeList>
      </div>
    </div>
  )
}
