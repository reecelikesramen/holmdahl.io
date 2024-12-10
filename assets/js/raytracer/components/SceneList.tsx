import { useState, useEffect } from "preact/hooks"
import { FixedSizeList } from 'react-window'
import { db } from "../utils/db"

interface Scene {
  name: string
  path: string
  hash: string
}

interface SceneListProps {
  onSceneSelect: (sceneJson: string, isRemote: boolean) => void
  onClose: () => void
  currentFile?: string | null
}

export function SceneList({ onSceneSelect, onClose, currentFile }: SceneListProps) {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    loadScenes()
  }, [refreshTrigger])

  // Subscribe to scene changes
  useEffect(() => {
    const refreshScenes = () => setRefreshTrigger(prev => prev + 1)
    window.addEventListener('scenesUpdated', refreshScenes)
    return () => window.removeEventListener('scenesUpdated', refreshScenes)
  }, [])

  const loadScenes = async () => {
    try {
      // Load built-in scenes from index.json
      const response = await fetch('/raytracer/index.json')
      if (!response.ok) throw new Error('Failed to fetch scenes index')
      const data = await response.json()
      
      // Load all scenes from IndexedDB
      const savedScenes = await db.scenes.toArray()
      const savedSceneMap = new Map(savedScenes.map(scene => [scene.path, scene]))
      
      // Combine scenes, preferring IndexedDB versions for built-in scenes
      const combinedScenes = data.scenes.map(scene => {
        const savedScene = savedSceneMap.get(scene.path)
        if (savedScene) {
          return {
            name: scene.name,
            path: scene.path,
            hash: savedScene.hash
          }
        }
        return scene
      })
      
      // Add user-created scenes (those not in index.json)
      const userScenes = savedScenes
        .filter(scene => !data.scenes.some(s => s.path === scene.path))
        .map(scene => ({
          name: scene.path.split('/').pop() || '',
          path: scene.path,
          hash: scene.hash
        }))
      
      setScenes([...combinedScenes, ...userScenes])
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
        onSceneSelect(storedScene.content, false);
      } else {
        // Download and cache if not found or hash mismatch
        const response = await fetch(scene.path);
        const content = await response.text();
        
        await db.scenes.put({
          path: scene.path,
          hash: scene.hash,
          content,
          isBuiltIn: true
        });

        onSceneSelect(content, true);
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
              className={`scene-item ${scenes[index].path === currentFile ? 'active' : ''}`}
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
