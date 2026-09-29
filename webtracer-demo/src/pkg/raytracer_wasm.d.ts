/* tslint:disable */
/* eslint-disable */
export function full_render(scene_json: string, raytracer_args: any, scene_data_js: any, offscreen_canvas: OffscreenCanvas): void;
export function initThreadPool(num_threads: number): Promise<any>;
export function wbg_rayon_start_worker(receiver: number): void;
export class RayTracerApp {
  free(): void;
  constructor();
  parse_scene(scene_json: string): any;
  is_ready(): boolean;
  is_complete(): boolean;
  get_needed_resources(): (string)[];
  initialize(canvas_id: string, raytracer_args: any, scene_data_js: any): void;
  raytrace_next_pixels(num_pixels: number): Promise<any>;
  rescan(): void;
  set_dimensions(width: number, height: number): void;
  render_to_canvas(): void;
}
export class wbg_rayon_PoolBuilder {
  private constructor();
  free(): void;
  numThreads(): number;
  receiver(): number;
  build(): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly __wbg_raytracerapp_free: (a: number, b: number) => void;
  readonly raytracerapp_new: () => number;
  readonly raytracerapp_parse_scene: (a: number, b: number, c: number) => [number, number, number];
  readonly raytracerapp_is_ready: (a: number) => number;
  readonly raytracerapp_is_complete: (a: number) => number;
  readonly raytracerapp_get_needed_resources: (a: number) => [number, number];
  readonly raytracerapp_initialize: (a: number, b: number, c: number, d: any, e: any) => [number, number];
  readonly raytracerapp_raytrace_next_pixels: (a: number, b: number) => any;
  readonly raytracerapp_rescan: (a: number) => [number, number];
  readonly raytracerapp_set_dimensions: (a: number, b: number, c: number) => [number, number];
  readonly raytracerapp_render_to_canvas: (a: number) => [number, number];
  readonly full_render: (a: number, b: number, c: any, d: any, e: any) => [number, number];
  readonly __wbg_wbg_rayon_poolbuilder_free: (a: number, b: number) => void;
  readonly wbg_rayon_poolbuilder_numThreads: (a: number) => number;
  readonly wbg_rayon_poolbuilder_receiver: (a: number) => number;
  readonly wbg_rayon_poolbuilder_build: (a: number) => void;
  readonly initThreadPool: (a: number) => any;
  readonly wbg_rayon_start_worker: (a: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly memory: WebAssembly.Memory;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __externref_drop_slice: (a: number, b: number) => void;
  readonly __wbindgen_thread_destroy: (a?: number, b?: number, c?: number) => void;
  readonly __wbindgen_start: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput, memory?: WebAssembly.Memory, thread_stack_size?: number }} module - Passing `SyncInitInput` directly is deprecated.
* @param {WebAssembly.Memory} memory - Deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput, memory?: WebAssembly.Memory, thread_stack_size?: number } | SyncInitInput, memory?: WebAssembly.Memory): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput>, memory?: WebAssembly.Memory, thread_stack_size?: number }} module_or_path - Passing `InitInput` directly is deprecated.
* @param {WebAssembly.Memory} memory - Deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput>, memory?: WebAssembly.Memory, thread_stack_size?: number } | InitInput | Promise<InitInput>, memory?: WebAssembly.Memory): Promise<InitOutput>;
