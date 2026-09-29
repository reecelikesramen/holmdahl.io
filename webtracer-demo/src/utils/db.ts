import Dexie, { type Table } from "dexie"

interface Scene {
  filename: string
  path?: string
  content: string
  hash: string
}

interface Asset {
  path: string
  filename: string
  content: Blob
}

export class RaytracerDB extends Dexie {
  scenes!: Table<Scene>
  models!: Table<Asset>
  textures!: Table<Asset>

  constructor() {
    super("raytracer")

    this.version(3).stores({
      scenes: "filename, path, hash",
      models: "++id, path, filename",
      textures: "++id, path, filename",
    })
  }
}

export const db = new RaytracerDB()
