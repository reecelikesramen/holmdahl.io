import { useState, useEffect } from "preact/hooks"
import { FixedSizeList } from 'react-window'
import { db } from "../utils/db"

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
      // Load built-in scenes
      const response = await fetch('/raytracer/index.json')
      if (!response.ok) throw new Error('Failed to fetch scenes index')
      const data = await response.json()
      
      // Load user-saved scenes from IndexedDB
      const savedScenes = await db.scenes.toArray()
      const userScenes = savedScenes.map(scene => ({
        name: scene.path.split('/').pop() || '',
        path: scene.path,
        hash: scene.hash
      }))
      
      // Combine and set all scenes
      setScenes([...data.scenes, ...userScenes])
    } catch (err) {
      setError(err.message)
      console.error('Error loading scenes:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadScene = async (scene: Scene) => {
    // For built-in scenes, check if path starts with /raytracer/scenes/
    const isBuiltIn = scene.path.startsWith('/raytracer/scenes/');
    
    if (isBuiltIn) {
      // Try to get from IndexedDB first
      const storedScene = await db.scenes.where('path').equals(scene.path).first();
      
      if (storedScene && storedScene.hash === scene.hash) {
        // Use cached version if hash matches
        onSceneSelect(storedScene.content);
      } else {
        // Download and cache if not found or hash mismatch
        const response = await fetch(scene.path);
        const content = await response.text();
        
        await db.scenes.put({
          path: scene.path,
          hash: scene.hash,
          content
        });

        onSceneSelect(content);
      }
    } else {
      // For user-created scenes, just load from IndexedDB
      const storedScene = await db.scenes.where('path').equals(scene.path).first();
      if (storedScene) {
        onSceneSelect(storedScene.content);
      }
    }
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
