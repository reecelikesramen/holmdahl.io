import init, { RayTracer, initThreadPool } from "./pkg/raytracer_wasm.js"
import { threads } from "wasm-feature-detect"
import scene from "./scenes/cornell_room_quad.json?raw"

let pixels_per_chunk = 40 // start amount

/**
 *
 * @param {RayTracer} raytracer
 */
function runChunkedProcessingWithRAF(raytracer) {
  return new Promise((resolve) => {
    const TARGET_MS_MIN = 1000 / 8.5
    const TARGET_MS_MAX = 1000 / 7.5
    const TARGET_MS_MID = (TARGET_MS_MIN + TARGET_MS_MAX) / 2

    // Animation loop
    const processNextChunk = async (start_time) => {
      // Resolve promise when complete
      if (raytracer.complete) {
        raytracer.render_to_canvas()
        return resolve()
      }

      // Request compute time
      requestAnimationFrame(processNextChunk)

      const progress = await raytracer.raytrace_next_pixels(pixels_per_chunk)
      let elapsed = performance.now() - start_time

      // Proportional control with dampening
      if (elapsed < TARGET_MS_MIN) {
        // Below target - increase chunk size proportionally to how far we are from target
        const adjustment = 1 + 0.5 * ((TARGET_MS_MIN - elapsed) / TARGET_MS_MIN)
        pixels_per_chunk = Math.ceil(pixels_per_chunk * adjustment)
      } else if (elapsed > TARGET_MS_MAX) {
        // Above target - decrease chunk size proportionally to how far we are from target
        const adjustment = 1 - 0.5 * ((elapsed - TARGET_MS_MAX) / TARGET_MS_MAX)
        pixels_per_chunk = Math.max(1, Math.floor(pixels_per_chunk * adjustment))
      } else {
        // Within target range - make minor adjustments towards the middle
        const adjustment = 1 + 0.1 * ((TARGET_MS_MID - elapsed) / TARGET_MS_MID)
        pixels_per_chunk = Math.round(pixels_per_chunk * adjustment)
      }
    }

    // Start processing
    requestAnimationFrame(processNextChunk)
  })
}

let render_to_canvas_id

/**
 * @param {RayTracer} raytracer
 */
function start_render_to_canvas(raytracer) {
  const PERIOD = 1000 / 30
  let last_frame_time = 0
  function animate(current_time) {
    // Request the next frame
    render_to_canvas_id = requestAnimationFrame(animate)

    if (current_time - last_frame_time < PERIOD) {
      return
    }

    last_frame_time = current_time

    raytracer.render_to_canvas()
  }

  // Start the animation
  render_to_canvas_id = requestAnimationFrame(animate)
}

function stop_render_to_canvas() {
  cancelAnimationFrame(render_to_canvas_id)
}

;(async function run() {
  // Initialize the WASM module
  await init()

  // const _threads = await threads()
  // console.log("We have threads:", _threads)
  // if (!_threads) {
  //   console.warn("WebAssembly multithreading is not supported in this browser")
  //   return
  // }

  await initThreadPool(navigator.hardwareConcurrency)

  const width = 600
  const height = 600

  const canvas = document.getElementById("canvas")

  let stop = false
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      stop = true
    }
  })

  // const scenes = import.meta.glob("./scenes/*")
  // console.log(scenes)
  // for (const path in scenes) {
  //   scenes[path]().then((module) => {
  //     console.log(`Loaded module from ${path}`, module.scene)
  //   })
  // }

  const scene_args = {
    width,
    height,
    rays_per_pixel: 25,
  }

  try {
    const raytracer = await RayTracer.init("canvas", scene, scene_args)
    console.log("Initialized raytracer")

    // start periodic rendering
    start_render_to_canvas(raytracer)

    // run quarter resolution
    let date_start = performance.now()
    raytracer.set_dimensions(Math.floor(120), Math.floor((120 * height) / width))
    raytracer.sqrt_rays_per_pixel = 20
    await runChunkedProcessingWithRAF(raytracer)
    console.log("Quarter raytrace in", (performance.now() - date_start).toFixed(2), "ms!")

    // parallel processing using rayon
    raytracer.set_dimensions(width, height)
    raytracer.sqrt_rays_per_pixel = Math.floor(Math.sqrt(scene_args.rays_per_pixel))
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log("Starting raytrace...")
    date_start = performance.now()

    // progressively run full resolution
    let scans = 0
    while (scans < 5) {
      await runChunkedProcessingWithRAF(raytracer)
      scans++

      if (stop && raytracer.complete) {
        console.log("Stopped raytracing after", scans * scene_args.rays_per_pixel, "rays per pixel")
        break
      }

      raytracer.rescan()
    }

    // log time
    console.log("Raytraced the scene in", (performance.now() - date_start).toFixed(2), "ms!")

    // stop periodic rendering and render final image to canvas
    stop_render_to_canvas()
  } catch (e) {
    console.error("Error rendering scene:", e)
  }
})()
