import { useState, useEffect, useRef } from "preact/hooks"
import { RayTracer } from "../pkg/raytracer_wasm.js"

export function Raytracer({ sceneJson, wasmModule }) {
  const [raytracer, setRaytracer] = useState(null)
  const renderFrameId = useRef(null)
  const width = 1200
  const height = 1200

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
        rt.set_dimensions(Math.floor(100), Math.floor((100 * height) / width))
        rt.sqrt_rays_per_pixel = 20
        await runChunkedProcessingWithRAF(rt)
        console.log("Quarter raytrace in", (performance.now() - date_start).toFixed(2), "ms!")

        if (stop) return

        // parallel processing using rayon
        rt.set_dimensions(width, height)
        rt.sqrt_rays_per_pixel = Math.floor(Math.sqrt(scene_args.rays_per_pixel))
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

        rt.render_to_canvas()

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
      <canvas id="canvas" />
    </div>
  )
}
