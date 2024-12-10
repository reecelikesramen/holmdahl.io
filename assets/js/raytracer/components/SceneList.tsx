import { useState, useEffect } from "preact/hooks"
import { FixedSizeList } from 'react-window'
import { db } from "../utils/db"

interface Scene {
  filename: string
  path?: string  // Only present for built-in scenes
  hash: string
}

interface SceneListProps {
  onSceneSelect: (sceneJson: string, path: string, isRemote: boolean) => void
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
      const savedSceneMap = new Map(savedScenes.map(scene => [scene.filename, scene]))
      
      // Process built-in scenes
      const builtInScenes = data.scenes.map(scene => {
        const filename = scene.filename
        const savedScene = savedSceneMap.get(filename)
        
        return {
          filename,
          path: scene.path,  // Keep server path for built-in scenes
          hash: savedScene?.hash || scene.hash
        }
      })
      
      // Add user-created scenes (those without paths)
      const userScenes = savedScenes
        .filter(scene => !scene.path)  // Only include scenes without paths (user-created)
        .map(scene => ({
          filename: scene.filename,
          hash: scene.hash
        }))
      
      setScenes([...builtInScenes, ...userScenes])
    } catch (err) {
      setError(err.message)
      console.error('Error loading scenes:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadScene = async (scene: Scene) => {
    try {
      const { content, isRemote } = await loadScene(scene.filename)
      onSceneSelect(content, scene.filename, isRemote)
    } catch (error) {
      console.error('Failed to load scene:', error)
      setError(error.message)
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
              className={`scene-item ${scenes[index].filename === currentFile ? 'active' : ''}`}
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
