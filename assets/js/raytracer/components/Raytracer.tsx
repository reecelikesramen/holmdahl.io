import { useState, useEffect, useRef, useMemo } from "preact/hooks"
import { RayTracerApp } from "../pkg/raytracer_wasm.js"
import { RaytracerControls } from "./RaytracerControls"
import FullRenderWorker from "../raytracer.worker?worker"
import { PreviewQuality, RenderQuality, AspectRatio, calculateDimensions, RaysPerPixel } from "../types/raytracer"
import { db } from "../utils/db.js"
import { saveAs } from "file-saver"
import delay from "../utils/delay.js"

export function Raytracer({ sceneJson, wasmModule }) {
  const [raytracer, setRaytracer] = useState<RayTracerApp>(null)
  const raytraceFrameId = useRef(null)
  const renderFrameId = useRef(null)
  const [previewQuality, setPreviewQuality] = useState<PreviewQuality>("medium")
  const [fullRenderQuality, setFullRenderQuality] = useState<RenderQuality>("1k")
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1")
  const [raysPerPixel, setRaysPerPixel] = useState<RaysPerPixel>(25)
  const [isFullRenderRunning, setIsFullRenderRunning] = useState(false)

  const dimensions = useMemo(() => calculateDimensions(previewQuality, aspectRatio), [previewQuality, aspectRatio])

  let dataNeeded: Record<string, Uint8Array> = {}

  useEffect(() => {
    let stop = false
    const cleanup = async () => {
      console.log("cleaning up")
      // stop = true;
      if (renderFrameId.current) {
        cancelAnimationFrame(renderFrameId.current)
        renderFrameId.current = null
      }

      // Remove the old canvas completely
      const oldCanvas = document.getElementById("canvas")
      if (oldCanvas) {
        oldCanvas.remove()
      }

      // Create a new canvas
      const container = document.querySelector(".raytracer-preview")
      if (container) {
        const newCanvas = document.createElement("canvas")
        newCanvas.id = "canvas"
        newCanvas.width = dimensions.width
        newCanvas.height = dimensions.height
        container.insertBefore(newCanvas, container.firstChild)
      }

      if (raytracer) {
        // @ts-expect-error __wbg_ptr is not defined in the types
        if (raytracer.__wbg_ptr === 0) {
          console.warn("Raytracer already freed")
        } else {
          raytracer.free()
        }
        setRaytracer(null)
      }
    }

    const setupRaytracer = async () => {
      cleanup() // Ensure previous instance is cleaned up

      const canvas = document.getElementById("canvas")
      if (!canvas) {
        console.error("Canvas element not found!")
        return
      }

      const width = Math.floor(dimensions.width)
      const height = Math.floor(dimensions.height)

      if (!width || !height || width < 1 || height < 1) {
        console.error("Invalid dimensions:", {
          width,
          height,
          rawDimensions: dimensions,
        })
        return
      }

      const sceneArgs = {
        width,
        height,
        rays_per_pixel: raysPerPixel,
      }

      try {
        // Initialize app
        const rt = new RayTracerApp()

        // Parse scene description
        rt.parse_scene(sceneJson)

        // Get scene data (textures, models) from the database and put into bytes for WASM
        // const dataNeeded: Record<string, Uint8Array> = {}
        dataNeeded = {}
        for (const resource of rt.get_needed_resources()) {
          console.log(resource)

          // Fetch textures and models and turn into bytes (match on models/* and textures/*)
          let match: RegExpMatchArray | null
          if ((match = resource.match(/models\/(.+)/))) {
            const model = await db.models.where("filename").equals(match[1]).first()
            if (model) {
              dataNeeded[resource] = new Uint8Array(await model.content.arrayBuffer())
            } else {
              console.error("Model not found:", match[1])
            }
          } else if ((match = resource.match(/textures\/(.+)/))) {
            const texture = await db.textures.where("filename").equals(match[1]).first()
            if (texture) {
              dataNeeded[resource] = new Uint8Array(await texture.content.arrayBuffer())
            } else {
              console.error("Texture not found:", match[1])
            }
          } else {
            console.error("Unknown resource type:", resource)
          }
        }

        // Initialize raytracer: create scene graph from scene description
        rt.initialize("canvas", sceneArgs, dataNeeded)
        rt.set_dimensions(width, height)
        setRaytracer(rt)

        // Start render to canvas animation loop
        startRenderToCanvas(rt)

        // Preview render loop, make successive passes over the image increasing quality
        let dateStart = performance.now()
        let scans = 0
        while (scans < 10 && !stop) {
          scans++

          try {
            // Balance page performance and speed by trying to keep raytracer at 30fps where a frame is the time alotted to rendering without yielding to JS
            await runChunkedProcessingWithRAF(rt)
          } catch {
            // If the raytracer WASM component is freed before the async shutdown occurs. This is okay
            console.warn("Aborting rendering scene")
            return
          }

          if (stop) break

          // Rescan over the image: sets not completed and next pixel to the image origin
          rt.rescan()
        }

        console.log(`Completed render in ${(performance.now() - dateStart).toFixed(2)}ms`)
      } catch (e) {
        console.error("Error rendering scene:", e)
      } finally {
        // Cleanup
        if (raytracer) {
          // @ts-expect-error __wbg_ptr is not exposed in the types
          if (raytracer.__wbg_ptr !== 0) {
            raytracer.free()
          }
          setRaytracer(null)
        }
      }
    }

    setupRaytracer()
    return cleanup
  }, [sceneJson, dimensions, raysPerPixel]) // Reinitialize when rays per pixel changes

  /**
   * Ray trace the image while yielding to JS for page performance
   */
  const runChunkedProcessingWithRAF = (raytracer: RayTracerApp) => {
    return new Promise<void>((resolve, reject) => {
      const TARGET_MS_MIN = 1000 / 32
      const TARGET_MS_MAX = 1000 / 28
      const TARGET_MS_MID = (TARGET_MS_MIN + TARGET_MS_MAX) / 2
      let pixelsPerChunk = 40

      const processNextChunk = async (currentTime: number) => {
        // @ts-expect-error __wbg_ptr is not exposed in the types
        if (raytracer.__wbg_ptr === 0) {
          return reject("Raytracer was freed before processing could complete.")
        }

        if (raytracer.is_complete()) {
          raytracer.render_to_canvas()
          return resolve()
        }

        raytraceFrameId.current = requestAnimationFrame(processNextChunk)
        await raytracer.raytrace_next_pixels(pixelsPerChunk)
        let elapsed = performance.now() - currentTime

        if (elapsed < TARGET_MS_MIN) {
          pixelsPerChunk = Math.ceil(pixelsPerChunk * (1 + 0.5 * ((TARGET_MS_MIN - elapsed) / TARGET_MS_MIN)))
        } else if (elapsed > TARGET_MS_MAX) {
          pixelsPerChunk = Math.max(1, Math.floor(pixelsPerChunk * (1 - 0.5 * ((elapsed - TARGET_MS_MAX) / TARGET_MS_MAX))))
        } else {
          pixelsPerChunk = Math.round(pixelsPerChunk * (1 + 0.1 * ((TARGET_MS_MID - elapsed) / TARGET_MS_MID)))
        }
      }

      raytraceFrameId.current = requestAnimationFrame(processNextChunk)
    })
  }

  /**
   * Render current render status to the canvas at a target 30fps
   */
  const startRenderToCanvas = (raytracer: RayTracerApp) => {
    const PERIOD = 1000 / 30
    let lastFrameTime = 0

    function animate(currentTime: number) {
      renderFrameId.current = requestAnimationFrame(animate)

      // Not time to render yet
      if (currentTime - lastFrameTime < PERIOD) {
        return
      }

      raytracer.render_to_canvas()
      lastFrameTime = currentTime
    }

    renderFrameId.current = requestAnimationFrame(animate)
  }

  function fullRender() {
    if (isFullRenderRunning) {
      console.warn("Full render already running")
      return
    }

    const worker = new FullRenderWorker()
    // send worker a message
    setIsFullRenderRunning(true)
    let renderParams = { sceneJson, sceneArgs: { width: 200, height: 200, rays_per_pixel: 49 }, dataNeeded }
    console.log(renderParams)
    worker.postMessage(renderParams)

    worker.onmessage = async (e) => {
      if (e.data.type === "status") {
        console.log("Worker:", e.data.msg)
      } else if (e.data.type === "image") {
        // get transferable
        const { blob, bitmap } = e.data
        saveAs(blob, "image.png")

        // Remove the old canvas completely
        const oldCanvas = document.getElementById("canvas")
        if (oldCanvas) {
          oldCanvas.remove()
        }

        // Create a new canvas
        const container = document.querySelector(".raytracer-preview")
        if (container) {
          const newCanvas = document.createElement("canvas")
          newCanvas.id = "canvas"
          newCanvas.width = 400
          newCanvas.height = 400
          container.insertBefore(newCanvas, container.firstChild)
        }

        const canvas = document.getElementById("canvas") as HTMLCanvasElement
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0)
        } else {
          console.error("Could not get canvas context")
        }

        await delay(500)
        worker.terminate()
        setIsFullRenderRunning(false)
      }
    }
  }

  return (
    <div className="raytracer-preview">
      <canvas id="canvas" width={dimensions.width} height={dimensions.height} />
      <RaytracerControls
        previewQuality={previewQuality}
        fullRenderQuality={fullRenderQuality}
        aspectRatio={aspectRatio}
        raysPerPixel={raysPerPixel}
        onPreviewQualityChange={setPreviewQuality}
        onFullRenderQualityChange={setFullRenderQuality}
        onAspectRatioChange={setAspectRatio}
        onRaysPerPixelChange={setRaysPerPixel}
      />
      <button onClick={fullRender} disabled={isFullRenderRunning}>
        Full Render
      </button>
    </div>
  )
}
