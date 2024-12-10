import Dexie, { type Table } from 'dexie';

interface Scene {
  path: string;
  content: string;
  hash: string;
}

interface Asset {
  path: string;
  content: Blob;
}

export class RaytracerDB extends Dexie {
  scenes!: Table<Scene>;
  models!: Table<Asset>;
  textures!: Table<Asset>;

  constructor() {
    super('raytracer');
    
    this.version(1).stores({
      scenes: 'path, hash',
      models: 'path',
      textures: 'path'
    });
  }
}

export const db = new RaytracerDB();
