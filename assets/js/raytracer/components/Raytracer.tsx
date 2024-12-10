import { useState, useEffect, useRef, useMemo } from "preact/hooks";
import { RayTracer } from "../pkg/raytracer_wasm.js";
import { RaytracerControls } from "./RaytracerControls";

import {
  PreviewQuality,
  RenderQuality,
  AspectRatio,
  calculateDimensions,
  RaysPerPixel,
} from "../types/raytracer";

export function Raytracer({ sceneJson, wasmModule }) {
  const [raytracer, setRaytracer] = useState(null);
  const renderFrameId = useRef(null);
  const [previewQuality, setPreviewQuality] =
    useState<PreviewQuality>("medium");
  const [fullRenderQuality, setFullRenderQuality] =
    useState<RenderQuality>("1k");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [raysPerPixel, setRaysPerPixel] = useState<RaysPerPixel>(25);

  const dimensions = useMemo(
    () => calculateDimensions(previewQuality, aspectRatio),
    [previewQuality, aspectRatio],
  );

  useEffect(() => {
    let stop = false;
    const cleanup = () => {
      // stop = true;
      if (renderFrameId.current) {
        cancelAnimationFrame(renderFrameId.current);
        renderFrameId.current = null;
      }

      // Remove the old canvas completely
      const oldCanvas = document.getElementById("canvas");
      if (oldCanvas) {
        oldCanvas.remove();
      }

      // Create a new canvas
      const container = document.querySelector(".raytracer-preview");
      if (container) {
        const newCanvas = document.createElement("canvas");
        newCanvas.id = "canvas";
        newCanvas.width = dimensions.width;
        newCanvas.height = dimensions.height;
        container.insertBefore(newCanvas, container.firstChild);
      }

      if (raytracer) {
        console.log(`[Raytracer ${DEBUG_ID}] Cleaning up raytracer instance`);
        setRaytracer(null);
      }
    };

    const setupRaytracer = async () => {
      cleanup(); // Ensure previous instance is cleaned up

      const canvas = document.getElementById("canvas");
      if (!canvas) {
        console.error("Canvas element not found!");
        return;
      }

      const width = Math.floor(dimensions.width);
      const height = Math.floor(dimensions.height);

      if (!width || !height || width < 1 || height < 1) {
        console.error("Invalid dimensions:", {
          width,
          height,
          rawDimensions: dimensions,
        });
        return;
      }

      const scene_args = {
        width,
        height,
        rays_per_pixel: raysPerPixel,
      };

      try {
        const rt = await RayTracer.init("canvas", sceneJson, scene_args);
        setRaytracer(rt);

        startRenderToCanvas(rt);

        rt.set_dimensions(width, height);
        let date_start = performance.now();

        let scans = 0;
        while (scans < 10 && !stop) {
          await runChunkedProcessingWithRAF(rt);
          scans++;

          if (stop) break;

          rt.rescan();
        }

        if (!stop) {
          rt.render_to_canvas();
          console.log(
            `Completed render in ${(performance.now() - date_start).toFixed(2)}ms`,
          );
        }
      } catch (e) {
        console.error("Error rendering scene:", e);
      }
    };

    setupRaytracer();
    return cleanup;
  }, [sceneJson, dimensions, raysPerPixel]); // Reinitialize when rays per pixel changes

  const runChunkedProcessingWithRAF = (raytracer) => {
    return new Promise<void>((resolve) => {
      const TARGET_MS_MIN = 1000 / 32;
      const TARGET_MS_MAX = 1000 / 28;
      const TARGET_MS_MID = (TARGET_MS_MIN + TARGET_MS_MAX) / 2;
      let pixels_per_chunk = 40;

      const processNextChunk = async (start_time) => {
        if (raytracer.complete) {
          raytracer.render_to_canvas();
          return resolve();
        }

        renderFrameId.current = requestAnimationFrame(processNextChunk);
        const progress = await raytracer.raytrace_next_pixels(pixels_per_chunk);
        let elapsed = performance.now() - start_time;

        if (elapsed < TARGET_MS_MIN) {
          pixels_per_chunk = Math.ceil(
            pixels_per_chunk *
              (1 + 0.5 * ((TARGET_MS_MIN - elapsed) / TARGET_MS_MIN)),
          );
        } else if (elapsed > TARGET_MS_MAX) {
          pixels_per_chunk = Math.max(
            1,
            Math.floor(
              pixels_per_chunk *
                (1 - 0.5 * ((elapsed - TARGET_MS_MAX) / TARGET_MS_MAX)),
            ),
          );
        } else {
          pixels_per_chunk = Math.round(
            pixels_per_chunk *
              (1 + 0.1 * ((TARGET_MS_MID - elapsed) / TARGET_MS_MID)),
          );
        }
      };

      renderFrameId.current = requestAnimationFrame(processNextChunk);
    });
  };

  const startRenderToCanvas = (raytracer) => {
    const PERIOD = 1000 / 30;
    let last_frame_time = 0;

    function animate(current_time) {
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
  );
}
