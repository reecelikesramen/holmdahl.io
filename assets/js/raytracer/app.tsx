import { render } from "preact"
import { useState, useEffect } from "preact/hooks"
import SplitPane, { Pane } from 'split-pane-react'
import 'split-pane-react/esm/themes/default.css'
import * as JSON5 from "json5"
import defaultScene from "./scenes/cornell_room_quad.json?raw"
import init, { initThreadPool } from "./pkg/raytracer_wasm.js"
import { Raytracer } from "./components/Raytracer"
import { JsonEditor } from "./components/JsonEditor"


function App() {
  const [sceneCode, setSceneCode] = useState(defaultScene)
  const [wasmModule, setWasmModule] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

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

  const handleSceneChange = (val) => {
    try {
      let json = JSON5.parse(val)
      setSceneCode(JSON.stringify(json, null, 2))
    } catch (e) {
      console.log("error parsing JSON, ignoring")
    }
  }

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
                value={defaultScene} 
                onChange={handleSceneChange}
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
              <div className="assets-container">
                <FixedSizeList
                  height={565} // Container height minus title bar
                  width="100%"
                  itemCount={100}
                  itemSize={35}
                >
                  {({ index, style }) => (
                    <div className="asset-item" style={style}>
                      Asset Item {index + 1}
                    </div>
                  )}
                </FixedSizeList>
              </div>
            </div>
          </Pane>
        )}
      </SplitPane>
    </div>
  )
}

render(<App />, document.getElementById("app")!)
