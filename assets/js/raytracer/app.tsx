import * as JSON5 from "json5"
import { render } from "preact"
import { useEffect, useState, useCallback } from "preact/hooks"
import { saveScene, loadScene, isSceneModified } from "./utils/sceneStorage"
import SplitPane, { Pane } from 'split-pane-react'
import 'split-pane-react/esm/themes/default.css'
import { JsonEditor } from "./components/JsonEditor"
import { AssetList } from "./components/AssetList"
import { Raytracer } from "./components/Raytracer"
import { SceneList } from "./components/SceneList"
import init, { initThreadPool } from "./pkg/raytracer_wasm.js"
import defaultScene from "./scenes/cornell_room_quad.json?raw"


function App() {
  const [sceneCode, setSceneCode] = useState("")
  const [wasmModule, setWasmModule] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentFilename, setCurrentFilename] = useState<string | null>("cornell_room_quad.json")
  const [isModified, setIsModified] = useState(false)
  const [originalContent, setOriginalContent] = useState("")
  const [isRemoteFile, setIsRemoteFile] = useState(true)

  useEffect(() => {
    const initWasm = async () => {
      try {
        await init()
        await initThreadPool(navigator.hardwareConcurrency)
        setWasmModule(true)
      } catch (error) {
        console.error("Failed to initialize WASM:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    initWasm()
  }, [])

  const handleSceneChange = (val: string) => {
    try {
      let json = JSON5.parse(val)
      const formatted = JSON.stringify(json, null, 2)
      setSceneCode(formatted)
      setIsModified(formatted !== originalContent)
    } catch (e) {
      console.log("error parsing JSON, ignoring")
    }
  }

  // Load initial scene
  useEffect(() => {
    const loadInitialScene = async () => {
      try {
        // Simulate clicking the default scene in SceneList
        const response = await fetch('/raytracer/index.json')
        if (!response.ok) throw new Error('Failed to fetch scenes index')
        const data = await response.json()
        
        const defaultScene = data.scenes.find(s => s.path === '/raytracer/scenes/cornell_room_quad.json')
        if (!defaultScene) throw new Error('Default scene not found in index')
        
        const sceneResponse = await fetch(defaultScene.path)
        if (!sceneResponse.ok) throw new Error('Failed to fetch default scene')
        const content = await sceneResponse.text()
        
        await saveScene(defaultScene.path, content)
        handleSceneChange(content)
        setCurrentFilename(defaultScene.path)
        setOriginalContent(content)
        setIsRemoteFile(true)
      } catch (error) {
        console.error("Failed to load initial scene:", error)
      }
    }
    
    loadInitialScene()
  }, [])

  const handleSaveAs = useCallback(async () => {
    const filename = prompt("Enter filename for scene:", "new_scene.json")
    if (!filename) return
    
    // Ensure filename has .json extension
    const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`
    
    try {
      // Check if filename already exists in DB
      const existingScene = await db.scenes.where('filename').equals(finalFilename).first()
      if (existingScene?.path) {
        alert("Cannot use the same filename as a built-in scene")
        return
      }
        
      await saveScene(finalFilename, sceneCode)
      setCurrentFilename(finalFilename)
      setOriginalContent(sceneCode)
      setIsModified(false)
      setIsRemoteFile(false)
    } catch (error) {
      console.error("Failed to save scene:", error)
      alert("Failed to save scene")
    }
  }, [sceneCode])

  const handleSave = useCallback(async () => {
    // For built-in files, always do Save As
    if (!currentFilename || isRemoteFile) {
      handleSaveAs()
      return
    }
    
    try {
      await saveScene(currentFilename, sceneCode)
      setOriginalContent(sceneCode)
      setIsModified(false)
    } catch (error) {
      console.error("Failed to save scene:", error)
      alert("Failed to save scene")
    }
  }, [currentFilename, sceneCode, isRemoteFile, handleSaveAs])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey)) {
        if (e.shiftKey && e.key === 'S') {
          // CMD+SHIFT+S
          e.preventDefault()
          handleSaveAs()
        } else if (e.key === 's') {
          // CMD+S
          e.preventDefault()
          handleSave()
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleSave, handleSaveAs])

  if (isLoading) {
    return <div>Loading WebAssembly modules...</div>
  }

  const [sizes, setSizes] = useState(['50%', '50%', 0, 0]);
  const [showAssets, setShowAssets] = useState(false);
  const [showScenes, setShowScenes] = useState(false);

  useEffect(() => {
    setSizes(prev => {
      const baseSize = (showScenes && showAssets) ? '30%' : 
                      (showScenes || showAssets) ? '40%' : '50%';
      
      return [
        showScenes ? '20%' : 0,
        baseSize,
        baseSize,
        showAssets ? '20%' : 0
      ];
    });
  }, [showAssets, showScenes]);

  return (
    <div className="raytracer-container">
      <SplitPane
        split="vertical"
        sizes={sizes}
        onChange={setSizes}
        sashRender={() => <div className="split-pane-divider" />}
      >
        {showScenes && (
          <Pane minSize={100} maxSize="20%">
            <SceneList 
              onSceneSelect={(content, path, isRemote) => {
                handleSceneChange(content)
                setIsRemoteFile(isRemote)
                setOriginalContent(content)
                setIsModified(false)
                setCurrentFilename(path)
              }}
              onClose={() => setShowScenes(false)}
              currentFile={currentFilename}
            />
          </Pane>
        )}
        <Pane minSize={450}>
          <div className="editor-pane">
            <div className="pane-title">
              {!showScenes && (
                <button onClick={() => setShowScenes(true)} style={{ left: '8px', right: 'auto' }}>
                  ◪
                </button>
              )}
              Scene Editor {currentFilename ? `-- ${currentFilename}` : ''}
              {isModified && !isRemoteFile && <span className="modified-indicator">●</span>}
            </div>
            <div className="editor-container">
              <JsonEditor 
                value={sceneCode} 
                onChange={handleSceneChange}
                onSave={handleSave}
                isModified={isModified}
              />
            </div>
          </div>
        </Pane>
        <Pane minSize={350}>
          <div className="canvas-pane">
            <div className="pane-title">
              Preview
              {!showAssets && (
                <button onClick={() => setShowAssets(true)}>
                  ◪
                </button>
              )}
            </div>
            <div className="canvas-container">
              <Raytracer 
                sceneJson={sceneCode}
                wasmModule={wasmModule}
              />
            </div>
          </div>
        </Pane>
        {showAssets && (
          <Pane minSize={100} maxSize="20%">
            <div className="editor-pane">
              <div className="pane-title">
                Assets
                <button onClick={() => setShowAssets(false)}>✕</button>
              </div>
              <div className="list-container">
                <AssetList onClose={() => setShowAssets(false)} />
              </div>
            </div>
          </Pane>
        )}
      </SplitPane>
    </div>
  )
}

render(<App />, document.getElementById("app")!)
