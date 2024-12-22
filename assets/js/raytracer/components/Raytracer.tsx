import { useState, useEffect, useRef, useMemo } from "preact/hooks"
import { RayTracerApp } from "../pkg/raytracer_wasm.js"
import { RaytracerControls } from "./RaytracerControls"

import { PreviewQuality, RenderQuality, AspectRatio, calculateDimensions, RaysPerPixel } from "../types/raytracer"
import { db } from "../utils/db.js"
import delay from "../utils/delay.js"

export function Raytracer({ sceneJson, wasmModule }) {
  const [raytracer, setRaytracer] = useState<RayTracerApp>(null)
  const raytraceFrameId = useRef(null)
  const renderFrameId = useRef(null)
  const [previewQuality, setPreviewQuality] = useState<PreviewQuality>("medium")
  const [fullRenderQuality, setFullRenderQuality] = useState<RenderQuality>("1k")
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1")
  const [raysPerPixel, setRaysPerPixel] = useState<RaysPerPixel>(25)

  const dimensions = useMemo(() => calculateDimensions(previewQuality, aspectRatio), [previewQuality, aspectRatio])

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

      const scene_args = {
        width,
        height,
        rays_per_pixel: raysPerPixel,
      }

      try {
        const rt = new RayTracerApp()
        rt.parse_scene(sceneJson)
        const data_needed = {}
        for (const resource of rt.get_needed_resources()) {
          console.log(resource)
          let match: RegExpMatchArray | null
          if ((match = resource.match(/models\/(.+)/))) {
            const model = await db.models.where("filename").equals(match[1]).first()
            if (model) {
              console.log(model.content)
              data_needed[resource] = new Uint8Array(await model.content.arrayBuffer())
            } else {
              console.error("Model not found:", match[1])
            }
          } else if ((match = resource.match(/textures\/(.+)/))) {
            const texture = await db.textures.where("filename").equals(match[1]).first()
            if (texture) {
              data_needed[resource] = new Uint8Array(await texture.content.arrayBuffer())
            } else {
              console.error("Texture not found:", match[1])
            }
          } else {
            console.error("Unknown resource type:", resource)
          }
        }
        console.log(data_needed)

        rt.initialize("canvas", scene_args, data_needed)
        rt.set_dimensions(width, height)

        setRaytracer(rt)

        startRenderToCanvas(rt)

        rt.set_dimensions(width, height)
        let date_start = performance.now()

        let scans = 0
        while (scans < 3 && !stop) {
          scans++

          try {
            await runChunkedProcessingWithRAF(rt)
          } catch {
            console.warn("Aborting rendering scene")
            break
          }

          if (stop) break

          rt.rescan()
        }

        console.log(`Completed render in ${(performance.now() - date_start).toFixed(2)}ms`)
      } catch (e) {
        console.error("Error rendering scene:", e)
      } finally {
        // if (raytracer) {
        //   raytracer.free()
        //   setRaytracer(null)
        // }
      }
    }

    setupRaytracer()
    return cleanup
  }, [sceneJson, dimensions, raysPerPixel]) // Reinitialize when rays per pixel changes

  const runChunkedProcessingWithRAF = (raytracer: RayTracerApp) => {
    return new Promise<void>((resolve, reject) => {
      const TARGET_MS_MIN = 1000 / 32
      const TARGET_MS_MAX = 1000 / 28
      const TARGET_MS_MID = (TARGET_MS_MIN + TARGET_MS_MAX) / 2
      let pixels_per_chunk = 40

      const processNextChunk = async (start_time) => {
        // @ts-expect-error __wbg_ptr is not exposed in the types
        if (raytracer.__wbg_ptr === 0) {
          return reject("Raytracer was freed before processing could complete.")
        }

        if (raytracer.is_complete()) {
          raytracer.render_to_canvas()
          return resolve()
        }

        raytraceFrameId.current = requestAnimationFrame(processNextChunk)
        await raytracer.raytrace_next_pixels(pixels_per_chunk)
        let elapsed = performance.now() - start_time

        if (elapsed < TARGET_MS_MIN) {
          pixels_per_chunk = Math.ceil(pixels_per_chunk * (1 + 0.5 * ((TARGET_MS_MIN - elapsed) / TARGET_MS_MIN)))
        } else if (elapsed > TARGET_MS_MAX) {
          pixels_per_chunk = Math.max(1, Math.floor(pixels_per_chunk * (1 - 0.5 * ((elapsed - TARGET_MS_MAX) / TARGET_MS_MAX))))
        } else {
          pixels_per_chunk = Math.round(pixels_per_chunk * (1 + 0.1 * ((TARGET_MS_MID - elapsed) / TARGET_MS_MID)))
        }
      }

      raytraceFrameId.current = requestAnimationFrame(processNextChunk)
    })
  }

  const startRenderToCanvas = (raytracer: RayTracerApp) => {
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
    </div>
  )
}
