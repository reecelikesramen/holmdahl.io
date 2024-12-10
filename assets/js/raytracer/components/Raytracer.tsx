import { useState, useEffect, useRef, useMemo } from "preact/hooks";
import { RayTracer } from "../pkg/raytracer_wasm.js";
import { RaytracerControls } from "./RaytracerControls";

const DEBUG_ID = Math.random().toString(36).substr(2, 9);
import {
  PreviewQuality,
  RenderQuality,
  AspectRatio,
  calculateDimensions,
} from "../types/raytracer";

export function Raytracer({ sceneJson, wasmModule }) {
  console.log(`[Raytracer ${DEBUG_ID}] Component instantiated`);
  const [raytracer, setRaytracer] = useState(null);

  useEffect(() => {
    console.log(`[Raytracer ${DEBUG_ID}] Component mounted`);
    return () => {
      console.log(`[Raytracer ${DEBUG_ID}] Component unmounting`);
      if (raytracer) {
        console.log(`[Raytracer ${DEBUG_ID}] Cleaning up existing raytracer instance`);
      }
    };
  }, []);
  const renderFrameId = useRef(null);
  const [previewQuality, setPreviewQuality] = useState<PreviewQuality>("low");
  const [fullRenderQuality, setFullRenderQuality] =
    useState<RenderQuality>("1k");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");

  const dimensions = useMemo(
    () => calculateDimensions(previewQuality, aspectRatio),
    [previewQuality, aspectRatio],
  );

  useEffect(() => {
    let stop = false;
    const cleanup = () => {
      console.log(`[Raytracer ${DEBUG_ID}] Cleanup called for render effect`);
      stop = true;
      if (renderFrameId.current) {
        console.log(`[Raytracer ${DEBUG_ID}] Canceling animation frame ${renderFrameId.current}`);
        cancelAnimationFrame(renderFrameId.current);
      }
    };

    const setupRaytracer = async () => {
      const instanceId = Math.random().toString(36).substr(2, 9);
      // Wait for any previous instance to clean up
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log(`[Raytracer ${DEBUG_ID}] Setting up new raytracer instance ${instanceId}`, {
        sceneJson: sceneJson?.substring(0, 50) + "...",
        previewQuality,
        aspectRatio
      });

      const canvas = document.getElementById("canvas");
      if (!canvas) {
        console.error(`[Raytracer ${DEBUG_ID}] Canvas element not found!`);
        return;
      }

      if (canvas.dataset.raytracerId && canvas.dataset.raytracerId !== instanceId) {
        console.error(`[Raytracer ${DEBUG_ID}] Canvas already in use by raytracer ${canvas.dataset.raytracerId}`);
        return;
      }

      canvas.dataset.raytracerId = instanceId;
      // Ensure dimensions are valid integers
      const width = Math.floor(dimensions.width);
      const height = Math.floor(dimensions.height);

      // Guard against invalid dimensions
      if (!width || !height || width < 1 || height < 1) {
        console.error("Invalid dimensions:", {
          width,
          height,
          rawDimensions: dimensions,
        });
        return;
      }

      console.log("Setting up raytracer with dimensions:", { width, height });

      const scene_args = {
        width,
        height,
        rays_per_pixel: 25,
      };

      try {
        console.log(`[Raytracer ${DEBUG_ID}] Initializing WebAssembly raytracer ${instanceId}`);
        const rt = await RayTracer.init("canvas", sceneJson, scene_args);
        rt.instanceId = instanceId; // Store the ID on the raytracer instance
        setRaytracer(rt);
        console.log(`[Raytracer ${DEBUG_ID}] Initialized raytracer ${instanceId}`);

        // start periodic rendering
        startRenderToCanvas(rt, instanceId);

        // parallel processing using rayon
        rt.set_dimensions(width, height); // Ensure dimensions are set correctly
        console.log("Starting raytrace...");
        let date_start = performance.now();

        // progressively run full resolution
        let scans = 0;
        while (scans < 10 && !stop) {
          await runChunkedProcessingWithRAF(rt);
          scans++;

          if (stop && rt.complete) {
            console.log(
              "Stopped raytracing after",
              scans * scene_args.rays_per_pixel,
              "rays per pixel",
            );
            break;
          }

          rt.rescan();
        }

        rt.render_to_canvas();

        // log time
        console.log(
          "Raytraced the scene in",
          (performance.now() - date_start).toFixed(2),
          "ms!",
        );
      } catch (e) {
        console.error("Error rendering scene:", e);
      }
    };

    setupRaytracer();
    return cleanup;
  }, [sceneJson, previewQuality, aspectRatio]);

  const runChunkedProcessingWithRAF = (raytracer) => {
    const instanceId = raytracer.instanceId;
    return new Promise<void>((resolve) => {
      const TARGET_MS_MIN = 1000 / 32;
      const TARGET_MS_MAX = 1000 / 28;
      const TARGET_MS_MID = (TARGET_MS_MIN + TARGET_MS_MAX) / 2;
      let pixels_per_chunk = 40; // start amount

      const processNextChunk = async (start_time) => {
        if (raytracer.complete) {
          console.log(`[Raytracer ${DEBUG_ID}] Instance ${instanceId} chunk processing complete`);
          raytracer.render_to_canvas();
          return resolve();
        }

        console.log(`[Raytracer ${DEBUG_ID}] Instance ${instanceId} processing chunk with RAF ID: ${renderFrameId.current}`);

        renderFrameId.current = requestAnimationFrame(processNextChunk);

        const progress = await raytracer.raytrace_next_pixels(pixels_per_chunk);
        let elapsed = performance.now() - start_time;

        if (elapsed < TARGET_MS_MIN) {
          const adjustment =
            1 + 0.5 * ((TARGET_MS_MIN - elapsed) / TARGET_MS_MIN);
          pixels_per_chunk = Math.ceil(pixels_per_chunk * adjustment);
        } else if (elapsed > TARGET_MS_MAX) {
          const adjustment =
            1 - 0.5 * ((elapsed - TARGET_MS_MAX) / TARGET_MS_MAX);
          pixels_per_chunk = Math.max(
            1,
            Math.floor(pixels_per_chunk * adjustment),
          );
        } else {
          const adjustment =
            1 + 0.1 * ((TARGET_MS_MID - elapsed) / TARGET_MS_MID);
          pixels_per_chunk = Math.round(pixels_per_chunk * adjustment);
        }
      };

      renderFrameId.current = requestAnimationFrame(processNextChunk);
    });
  };

  const startRenderToCanvas = (raytracer, instanceId) => {
    const PERIOD = 1000 / 30;
    let last_frame_time = 0;

    function animate(current_time) {
      console.log(`[Raytracer ${DEBUG_ID}] Instance ${instanceId} render frame requested, RAF ID: ${renderFrameId.current}`);
      renderFrameId.current = requestAnimationFrame(animate);

      if (current_time - last_frame_time < PERIOD) {
        return;
      }

      last_frame_time = current_time;
      raytracer.render_to_canvas();
    }

    renderFrameId.current = requestAnimationFrame(animate);
  };

  return (
    <div className="raytracer-preview">
      <canvas id="canvas" />
      <RaytracerControls
        previewQuality={previewQuality}
        fullRenderQuality={fullRenderQuality}
        aspectRatio={aspectRatio}
        onPreviewQualityChange={setPreviewQuality}
        onFullRenderQualityChange={setFullRenderQuality}
        onAspectRatioChange={setAspectRatio}
      />
    </div>
  );
}
