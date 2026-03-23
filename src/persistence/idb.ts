const DB_NAME = 'fdc-tracker-db'
const STORE = 'files'
const KEY = 'sqlite'

/**
 * Implements open db for this module.
 */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE)
    }
  })
}

/**
 * Implements idb get sqlite blob for this module.
 */
export async function idbGetSqliteBlob(): Promise<Uint8Array | null> {
  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(KEY)
      req.onsuccess = () => {
        const v = req.result
        if (v instanceof ArrayBuffer) resolve(new Uint8Array(v))
        else if (v instanceof Uint8Array) resolve(v)
        else resolve(null)
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

/**
 * Implements idb set sqlite blob for this module.
 */
export async function idbSetSqliteBlob(data: Uint8Array): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
    tx.objectStore(STORE).put(buf, KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
