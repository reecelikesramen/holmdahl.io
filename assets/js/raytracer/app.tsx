import { render } from "preact"
import { useState, useEffect, useRef } from "preact/hooks"
import SplitPane, { Pane } from 'split-pane-react'
import { FixedSizeList } from 'react-window'
import 'split-pane-react/esm/themes/default.css'
import CodeMirror from "@uiw/react-codemirror"
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode'
import { json5, json5ParseLinter } from "codemirror-json5"
import { linter } from "@codemirror/lint"
import * as JSON5 from "json5"
import defaultScene from "./scenes/cornell_room_quad.json?raw"
import init, { RayTracer, initThreadPool } from "./pkg/raytracer_wasm.js"

function Raytracer({ sceneJson, wasmModule }) {
  const [raytracer, setRaytracer] = useState(null)
  const renderFrameId = useRef(null)
  const width = 600
  const height = 600

  useEffect(() => {
    let stop = false
    const cleanup = () => {
      stop = true
      if (renderFrameId.current) {
        cancelAnimationFrame(renderFrameId.current)
      }
    }

    const setupRaytracer = async () => {
      const scene_args = {
        width,
        height,
        rays_per_pixel: 16,
      }

      try {
        const rt = await RayTracer.init("canvas", sceneJson, scene_args)
        setRaytracer(rt)
        console.log("Initialized raytracer")

        // start periodic rendering
        startRenderToCanvas(rt)

        // run quarter resolution
        let date_start = performance.now()
        rt.set_dimensions(Math.floor(120), Math.floor((120 * height) / width))
        rt.sqrt_rays_per_pixel = 12
        await runChunkedProcessingWithRAF(rt)
        console.log("Quarter raytrace in", (performance.now() - date_start).toFixed(2), "ms!")

        if (stop) return

        // parallel processing using rayon
        rt.set_dimensions(width, height)
        rt.sqrt_rays_per_pixel = Math.floor(Math.sqrt(scene_args.rays_per_pixel))
        await new Promise((resolve) => setTimeout(resolve, 1000))
        console.log("Starting raytrace...")
        date_start = performance.now()

        // progressively run full resolution
        let scans = 0
        while (scans < 1 && !stop) {
          await runChunkedProcessingWithRAF(rt)
          scans++

          if (stop && rt.complete) {
            console.log("Stopped raytracing after", scans * scene_args.rays_per_pixel, "rays per pixel")
            break
          }

          rt.rescan()
        }

        // log time
        console.log("Raytraced the scene in", (performance.now() - date_start).toFixed(2), "ms!")

      } catch (e) {
        console.error("Error rendering scene:", e)
      }
    }

    setupRaytracer()
    return cleanup
  }, [sceneJson])

  const runChunkedProcessingWithRAF = (raytracer) => {
    return new Promise<void>((resolve) => {
			// performant values:
      // const TARGET_MS_MIN = 1000 / 8.5
      // const TARGET_MS_MAX = 1000 / 7.5
			// responsive values:
      const TARGET_MS_MIN = 1000 / 32
      const TARGET_MS_MAX = 1000 / 28
      const TARGET_MS_MID = (TARGET_MS_MIN + TARGET_MS_MAX) / 2
      let pixels_per_chunk = 40 // start amount

      const processNextChunk = async (start_time) => {
        if (raytracer.complete) {
          raytracer.render_to_canvas()
          return resolve()
        }

        renderFrameId.current = requestAnimationFrame(processNextChunk)

        const progress = await raytracer.raytrace_next_pixels(pixels_per_chunk)
        let elapsed = performance.now() - start_time

        if (elapsed < TARGET_MS_MIN) {
          const adjustment = 1 + 0.5 * ((TARGET_MS_MIN - elapsed) / TARGET_MS_MIN)
          pixels_per_chunk = Math.ceil(pixels_per_chunk * adjustment)
        } else if (elapsed > TARGET_MS_MAX) {
          const adjustment = 1 - 0.5 * ((elapsed - TARGET_MS_MAX) / TARGET_MS_MAX)
          pixels_per_chunk = Math.max(1, Math.floor(pixels_per_chunk * adjustment))
        } else {
          const adjustment = 1 + 0.1 * ((TARGET_MS_MID - elapsed) / TARGET_MS_MID)
          pixels_per_chunk = Math.round(pixels_per_chunk * adjustment)
        }
      }

      renderFrameId.current = requestAnimationFrame(processNextChunk)
    })
  }

  const startRenderToCanvas = (raytracer) => {
    const PERIOD = 1000 / 30
    let last_frame_time = 0

    function animate(current_time) {
      renderFrameId.current = requestAnimationFrame(animate)

      if (current_time - last_frame_time < PERIOD) {
        return
      }

      last_frame_time = current_time
      raytracer.render_to_canvas()
    }

    renderFrameId.current = requestAnimationFrame(animate)
  }

  return (
    <div>
      <canvas id="canvas" width={width} height={height} />
    </div>
  )
}

function JsonEditor({ value, onChange }) {
  const [theme, setTheme] = useState(localStorage.getItem('pref-theme') === 'dark' ? 'dark' : 'light')

  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.body.classList.contains('dark')
      setTheme(isDark ? 'dark' : 'light')
    }

    document.getElementById("theme-toggle").addEventListener("click", checkTheme)
    
    checkTheme()
  }, [])

  return (
		<CodeMirror
			value={value}
			height="100%"
			extensions={[json5(), linter(json5ParseLinter())]}
			onChange={onChange}
			theme={theme === 'dark' ? vscodeDark : vscodeLight}
		/>
  )
}

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
            <div className="editor-pane">
              <div className="pane-title">
                Scenes
                <button onClick={() => setShowScenes(false)}>✕</button>
              </div>
              <div className="assets-container">
                <FixedSizeList
                  height={565}
                  width="100%"
                  itemCount={100}
                  itemSize={35}
                >
                  {({ index, style }) => (
                    <div className="scene-item" style={style}>
                      Scene {index + 1}
                    </div>
                  )}
                </FixedSizeList>
              </div>
            </div>
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
