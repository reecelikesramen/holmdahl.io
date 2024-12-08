import { render } from "preact"
import { useState, useEffect, useRef, useCallback } from "preact/hooks"
import CodeMirror from "@uiw/react-codemirror"
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
        rays_per_pixel: 25,
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
        rt.sqrt_rays_per_pixel = 20
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
        while (scans < 5 && !stop) {
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
      const TARGET_MS_MIN = 1000 / 8.5
      const TARGET_MS_MAX = 1000 / 7.5
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

    const observer = new MutationObserver(checkTheme)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    checkTheme()
    
    return () => observer.disconnect()
  }, [])

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Scene Editor</h2>
      <CodeMirror
        value={value}
        height="400px"
        extensions={[json5(), linter(json5ParseLinter())]}
        onChange={onChange}
        theme={theme}
      />
    </div>
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

  const [isDragging, setIsDragging] = useState(false);
  
  const handleMouseDown = (e) => {
    setIsDragging(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const container = document.querySelector('.raytracer-container');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const editorContainer = container.querySelector('.editor-container');
    const canvasContainer = container.querySelector('.canvas-container');
    if (!editorContainer || !canvasContainer) return;
    
    const newWidth = e.clientX - containerRect.left;
    const totalWidth = containerRect.width;
    
    if (newWidth >= 400 && (totalWidth - newWidth) >= 400) {
      const editorPercent = (newWidth / totalWidth) * 100;
      const canvasPercent = 100 - editorPercent;
      
      editorContainer.style.width = `${editorPercent}%`;
      canvasContainer.style.width = `${canvasPercent}%`;
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  return (
    <div className="raytracer-container">
      <div className="editor-container">
        <JsonEditor 
          value={sceneCode} 
          onChange={handleSceneChange}
        />
      </div>
      <div 
        className={`resize-handle ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
      />
      <div className="canvas-container">
        <Raytracer 
          sceneJson={sceneCode}
          wasmModule={wasmModule}
        />
      </div>
    </div>
  )
}

render(<App />, document.getElementById("app")!)
