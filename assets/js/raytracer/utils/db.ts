import Dexie, { type Table } from 'dexie';

interface Scene {
  path: string;
  content: string;
  hash: string;
  isBuiltIn: boolean;
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
      scenes: '++id, path, hash',
      models: '++id, path',
      textures: '++id, path'
    });
  }
}

export const db = new RaytracerDB();
