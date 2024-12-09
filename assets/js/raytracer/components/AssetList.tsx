import { useState, useEffect } from "preact/hooks"

interface Asset {
  name: string
  path: string
}

interface AssetListProps {
  onClose: () => void
}

export function AssetList({ onClose }: AssetListProps) {
  const [models, setModels] = useState<Asset[]>([])
  const [textures, setTextures] = useState<Asset[]>([])
  const [downloadedAssets, setDownloadedAssets] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAssets()
  }, [])

  const openDB = async () => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('raytracer-assets', 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'path' })
        }
        if (!db.objectStoreNames.contains('textures')) {
          db.createObjectStore('textures', { keyPath: 'path' })
        }
      }
    })
  }

  const loadAssets = async () => {
    try {
      const response = await fetch('/raytracer/index.json')
      if (!response.ok) throw new Error('Failed to fetch assets index')
      const data = await response.json()
      setModels(data.models)
      setTextures(data.textures)
      await checkDownloadedAssets() // Check after setting the assets
    } catch (err) {
      setError(err.message)
      console.error('Error loading assets:', err)
    }
  }

  const checkDownloadedAssets = async () => {
    const db = await openDB()
    const modelTx = db.transaction(['models'], 'readonly')
    const textureTx = db.transaction(['textures'], 'readonly')
    
    const modelStore = modelTx.objectStore('models')
    const textureStore = textureTx.objectStore('textures')

    const downloaded = new Set<string>()

    for (const model of models) {
      const result = await modelStore.get(model.path)
      if (result) downloaded.add(model.path)
    }

    for (const texture of textures) {
      const result = await textureStore.get(texture.path)
      if (result) downloaded.add(texture.path)
    }

    setDownloadedAssets(downloaded)
  }

  const downloadAsset = async (asset: Asset, type: 'models' | 'textures') => {
    if (downloadedAssets.has(asset.path)) {
      await copyToClipboard(asset.name)
      return
    }

    setDownloading(prev => new Set(prev).add(asset.path))

    try {
      const response = await fetch(asset.path)
      const content = await response.blob()
      
      const db = await openDB()
      const tx = db.transaction([type], 'readwrite')
      const store = tx.objectStore(type)
      
      await store.put({
        path: asset.path,
        content
      })

      setDownloadedAssets(prev => new Set(prev).add(asset.path))
      await copyToClipboard(asset.name)
    } catch (err) {
      console.error(`Error downloading ${asset.path}:`, err)
    } finally {
      setDownloading(prev => {
        const next = new Set(prev)
        next.delete(asset.path)
        return next
      })
    }
  }

  const copyToClipboard = async (name: string) => {
    try {
      await navigator.clipboard.writeText(name)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const getAssetIcon = (path: string) => {
    if (downloading.has(path)) return '⟳'
    return downloadedAssets.has(path) ? '✓' : '□'
  }

  if (error) return <div>Error: {error}</div>

  return (
    <div className="assets-container">
      <div className="asset-section">
        <h3>Models</h3>
        {models.map(model => (
          <div 
            key={model.path}
            className="asset-item"
            onClick={() => downloadAsset(model, 'models')}
          >
            <span className="asset-icon">[{getAssetIcon(model.path)}]</span>
            {model.name}
          </div>
        ))}
      </div>
      <div className="asset-section">
        <h3>Textures</h3>
        {textures.map(texture => (
          <div 
            key={texture.path}
            className="asset-item"
            onClick={() => downloadAsset(texture, 'textures')}
          >
            <span className="asset-icon">[{getAssetIcon(texture.path)}]</span>
            {texture.name}
          </div>
        ))}
      </div>
    </div>
  )
}
