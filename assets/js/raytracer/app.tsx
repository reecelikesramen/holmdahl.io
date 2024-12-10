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
  const [sceneCode, setSceneCode] = useState(defaultScene)
  const [wasmModule, setWasmModule] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentFilename, setCurrentFilename] = useState<string | null>(null)
  const [isModified, setIsModified] = useState(false)
  const [originalContent, setOriginalContent] = useState(defaultScene)

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

  const handleSave = useCallback(async () => {
    if (!currentFilename) {
      const filename = prompt("Enter filename for scene:", "new_scene.json")
      if (!filename) return
      setCurrentFilename(filename)
    }
    
    try {
      await saveScene(currentFilename!, sceneCode)
      setOriginalContent(sceneCode)
      setIsModified(false)
    } catch (error) {
      console.error("Failed to save scene:", error)
      alert("Failed to save scene")
    }
  }, [currentFilename, sceneCode])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleSave])

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
      >
        {showScenes && (
          <Pane minSize={100} maxSize="20%">
            <SceneList 
              onSceneSelect={handleSceneChange}
              onClose={() => setShowScenes(false)}
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
              Scene Editor
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
