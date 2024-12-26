import init, { initThreadPool, full_render } from "./pkg/raytracer_wasm"
import delay from "./utils/delay"

interface SceneArgs {
  width: number
  height: number
  raysPerPixel: number
}

interface FullRenderParams {
  sceneJson: string
  sceneArgs: SceneArgs
  dataNeeded: Record<string, Uint8Array>
}

self.addEventListener("message", async (event: MessageEvent<FullRenderParams>) => {
  await init()
  await initThreadPool(navigator.hardwareConcurrency)
  const { sceneJson, sceneArgs, dataNeeded } = event.data
  self.postMessage({ type: "status", msg: "starting render" })
  try {
    const offscreenCanvas = new OffscreenCanvas(sceneArgs.width, sceneArgs.height)
    const start = performance.now()
    full_render(sceneJson, sceneArgs, dataNeeded, offscreenCanvas)
    const blob = await offscreenCanvas.convertToBlob()
    const bitmap = offscreenCanvas.transferToImageBitmap()
    self.postMessage({ type: "image", blob, bitmap }, undefined, [blob, bitmap])
    self.postMessage({ type: "status", msg: `render took ${performance.now() - start}ms` })
  } catch (e) {
    self.postMessage({ type: "status", msg: e })
  } finally {
    self.postMessage({ type: "status", msg: "worker done" })
  }
})
