import { AspectRatio, PreviewQuality, RenderQuality } from "../types/raytracer";

interface RaytracerControlsProps {
  previewQuality: PreviewQuality;
  fullRenderQuality: RenderQuality;
  aspectRatio: AspectRatio;
  onPreviewQualityChange: (quality: PreviewQuality) => void;
  onFullRenderQualityChange: (quality: RenderQuality) => void;
  onAspectRatioChange: (ratio: AspectRatio) => void;
}

export function RaytracerControls({
  previewQuality,
  fullRenderQuality,
  aspectRatio,
  onPreviewQualityChange,
  onFullRenderQualityChange,
  onAspectRatioChange,
}: RaytracerControlsProps) {
  return (
    <div className="raytracer-controls">
      <select
        value={previewQuality}
        onChange={(e) =>
          onPreviewQualityChange(e.currentTarget.value as PreviewQuality)
        }
      >
        <option value="low">Low (~10K px)</option>
        <option value="medium">Medium (~100K px)</option>
        <option value="sd">SD (~1M px)</option>
        <option value="hd">HD (~2M px)</option>
        <option value="1k">1K (~4M px)</option>
      </select>

      <select
        value={fullRenderQuality}
        onChange={(e) =>
          onFullRenderQualityChange(e.currentTarget.value as RenderQuality)
        }
      >
        <option value="sd">SD (1280×720)</option>
        <option value="hd">HD (1920×1080)</option>
        <option value="1k">1K (2560×1440)</option>
        <option value="4k">4K (3840×2160)</option>
        <option value="8k">8K (7680×4320)</option>
      </select>

      <select
        value={aspectRatio}
        onChange={(e) =>
          onAspectRatioChange(e.currentTarget.value as AspectRatio)
        }
      >
        <option value="1:1">1:1 Square</option>
        <option value="3:2">3:2</option>
        <option value="4:3">4:3</option>
        <option value="16:9">16:9</option>
        <option value="21:9">21:9</option>
        <option value="2:3">2:3</option>
        <option value="3:4">3:4</option>
        <option value="9:16">9:16</option>
        <option value="9:21">9:21</option>
      </select>
    </div>
  );
}
