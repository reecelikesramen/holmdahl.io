import { useState, useEffect, useCallback, useRef } from "preact/hooks"
import { FixedSizeList } from 'react-window'
import { db } from "../utils/db"
import { isSceneModified, loadScene, sceneIndex, saveScene } from "../utils/sceneStorage"
import Bowser from "bowser"

interface DeletedScene {
  scene: Scene
  content: string
  timestamp: number
}

let lastDeletedScene: DeletedScene | null = null;

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
  const containerRef = useRef<HTMLDivElement>(null)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)

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
      // Load all scenes from IndexedDB
      const savedScenes = await db.scenes.toArray()
      const savedSceneMap = new Map(savedScenes.map(scene => [scene.filename, scene]))
      
      // Process built-in scenes
      const builtInScenes = sceneIndex.scenes.map(scene => {
        const filename = scene.name
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

  const selectScene = async (scene: Scene) => {
    try {
      const { content, isRemote } = await loadScene(scene.filename)
      setSelectedScene(scene)
      onSceneSelect(content, scene.filename, isRemote)
    } catch (error) {
      console.error('Failed to load scene:', error)
      setError(error.message)
    }
  }

  const handleUndo = async () => {
    if (!lastDeletedScene) return;

    try {
      await saveScene(
        lastDeletedScene.scene.filename,
        lastDeletedScene.content
      );
      
      // If this was the last selected scene, restore it
      if (currentFile === null) {
        onSceneSelect(lastDeletedScene.content, lastDeletedScene.scene.filename, false);
      }

      lastDeletedScene = null; // Clear the undo history
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Failed to restore scene:', error);
      setError('Failed to restore scene');
    }
  };

  const handleDelete = useCallback(async (scene: Scene) => {
    // Only allow deletion of local scenes (those without a path)
    if (scene.path) {
      return
    }

    const confirmed = window.confirm(`Are you sure you want to delete "${scene.filename}"?`)
    if (!confirmed) {
      return
    }

    try {
      // Store the scene content before deletion
      const { content } = await loadScene(scene.filename);
      lastDeletedScene = {
        scene,
        content,
        timestamp: Date.now()
      };

      console.log("Starting deletion process for scene:", {
        deletingScene: scene.filename,
        currentFile,
        isCurrentScene: scene.filename === currentFile
      });

      // If this is the current scene, handle selection first
      if (scene.filename === currentFile) {
        console.log("Handling current scene deletion:", {
          deletingScene: scene.filename,
          currentFile
        });
        
        // Get remaining scenes before deletion
        const remainingScenes = await db.scenes
          .filter(s => s.filename !== scene.filename)
          .toArray()
        
        console.log("Remaining scenes for selection:", {
          count: remainingScenes.length,
          filenames: remainingScenes.map(s => s.filename)
        });
        
        console.log("Scene being deleted is current scene");
        if (remainingScenes.length > 0) {
          // Load the first available scene
          const nextScene = remainingScenes[0]
          console.log("Loading next scene:", nextScene.filename);
          const { content: nextContent, isRemote } = await loadScene(nextScene.filename)
          console.log("Loaded next scene content:", nextContent.substring(0, 100) + "...");
          onSceneSelect(nextContent, nextScene.filename, isRemote)
        } else {
          console.log("No remaining scenes, clearing editor");
          onSceneSelect("", "", false)
        }
      }

      // Now perform the actual deletion
      await db.scenes.where('filename').equals(scene.filename).delete()

      setRefreshTrigger(prev => prev + 1)
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('scenesUpdated'))

      // Show temporary undo message
      const undoMsg = document.createElement('div');
      undoMsg.style.position = 'fixed';
      undoMsg.style.bottom = '20px';
      undoMsg.style.right = '20px';
      undoMsg.style.padding = '10px';
      undoMsg.style.background = 'var(--entry)';
      undoMsg.style.border = '1px solid var(--border)';
      undoMsg.style.borderRadius = '4px';
      undoMsg.innerHTML = 'Scene deleted. Press ⌘Z to undo.';
      document.body.appendChild(undoMsg);
      setTimeout(() => undoMsg.remove(), 3000);
    } catch (error) {
      console.error('Failed to delete scene:', error)
      setError('Failed to delete scene')
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const browser = Bowser.getParser(window.navigator.userAgent)
      const isMac = browser.getOS().name === 'macOS'
      const modifierKey = isMac ? e.metaKey : e.ctrlKey

      // Check if the active element is within our container
      const isContainerFocused = containerRef.current?.contains(document.activeElement)
      
      if (modifierKey && (e.key === 'Delete' || e.key === 'Backspace') && isContainerFocused && selectedScene) {
        e.preventDefault()
        handleDelete(selectedScene)
      }

      // Add undo handler
      if (modifierKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (lastDeletedScene && (Date.now() - lastDeletedScene.timestamp) < 10000) { // 10 second window
          handleUndo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedScene, handleDelete])

  if (loading) return <div>Loading scenes...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="editor-pane">
      <div className="pane-title">
        Scenes
        <button onClick={onClose}>✕</button>
      </div>
      <div className="scenes-container" ref={containerRef} tabIndex={0}>
        <FixedSizeList
          height={565}
          width="100%"
          itemCount={scenes.length}
          itemSize={35}
        >
          {({ index, style }) => (
            <div 
              className={`scene-item ${scenes[index].filename === currentFile ? 'active' : ''} ${isSceneModified(scenes[index].filename) ? 'modified' : ''}`}
              style={style}
              onClick={() => selectScene(scenes[index])}
            >
              {scenes[index].filename}
            </div>
          )}
        </FixedSizeList>
      </div>
    </div>
  )
}
