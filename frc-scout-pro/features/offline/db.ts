// ─── Offline IndexedDB Layer ───────────────────────────────────────────────
// All scouting writes go here first. The sync engine (sync.ts) drains the
// queue when connectivity is restored.
//
// Schema — DB name: "frc-scout", current version: 2
//
//   scouting_entries   Primary offline store for match scouting forms.
//                      Indexed by `synced` (bool) so the sync loop can
//                      cheaply find unsubmitted entries without a full scan.
//
//   sync_queue         Queue for any pending write (match OR pit scouting).
//                      Uses auto-increment PK so items can be removed by id
//                      after a successful server-side upsert.
//
//   matches_cache      Read cache for match schedule. Prevents blank screens
//                      when the device is offline mid-event.
//
//   teams_cache        Read cache for team list. Indexed by event_id so we
//                      can load all teams for the active event offline.
//
// Why IndexedDB and not localStorage?
//   localStorage is synchronous and capped at ~5 MB — insufficient for a
//   full event's scouting history. IDB is async, quota-managed by the
//   browser, and survives a page reload. The `idb` wrapper gives us a
//   promise-based API without the raw IDB boilerplate.
// ──────────────────────────────────────────────────────────────────────────

import { openDB, type IDBPDatabase } from 'idb'

interface FRCScoutDB {
  scouting_entries: {
    key: string
    value: {
      offline_id: string
      synced: boolean
      submitted_at: string
      [key: string]: unknown
    }
    indexes: { by_synced: boolean; by_match: string }
  }
  sync_queue: {
    key: number
    value: {
      id?: number
      type: 'scouting_entry' | 'pit_scouting'
      data: Record<string, unknown>
      attempts: number
      created_at: string
    }
  }
  matches_cache: {
    key: string
    value: {
      id: string
      event_id: string
      cached_at: string
      [key: string]: unknown
    }
    indexes: { by_event: string }
  }
  teams_cache: {
    key: number
    value: {
      team_number: number
      event_id: string
      cached_at: string
      [key: string]: unknown
    }
    indexes: { by_event: string }
  }
}

let dbPromise: Promise<IDBPDatabase<FRCScoutDB>> | null = null

export function getDB() {
  if (typeof window === 'undefined') return null
  if (!dbPromise) {
    dbPromise = openDB<FRCScoutDB>('frc-scout', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const entriesStore = db.createObjectStore('scouting_entries', { keyPath: 'offline_id' })
          entriesStore.createIndex('by_synced', 'synced')
          entriesStore.createIndex('by_match', 'match_id')

          db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true })

          const matchesStore = db.createObjectStore('matches_cache', { keyPath: 'id' })
          matchesStore.createIndex('by_event', 'event_id')

          const teamsStore = db.createObjectStore('teams_cache', { keyPath: 'team_number' })
          teamsStore.createIndex('by_event', 'event_id')
        }
      },
    })
  }
  return dbPromise
}

export async function saveEntryOffline(entry: Record<string, unknown>) {
  const db = await getDB()
  if (!db) return
  await db.put('scouting_entries', entry as Parameters<typeof db.put>[1])
}

export async function getUnsyncedEntries() {
  const db = await getDB()
  if (!db) return []
  return db.getAllFromIndex('scouting_entries', 'by_synced', false as unknown as IDBKeyRange)
}

export async function markEntrySynced(offlineId: string) {
  const db = await getDB()
  if (!db) return
  const entry = await db.get('scouting_entries', offlineId)
  if (entry) {
    entry.synced = true
    await db.put('scouting_entries', entry)
  }
}

export async function addToSyncQueue(type: 'scouting_entry' | 'pit_scouting', data: Record<string, unknown>) {
  const db = await getDB()
  if (!db) return
  await db.add('sync_queue', {
    type,
    data,
    attempts: 0,
    created_at: new Date().toISOString(),
  })
}

export async function getSyncQueue() {
  const db = await getDB()
  if (!db) return []
  return db.getAll('sync_queue')
}

export async function removeSyncQueueItem(id: number) {
  const db = await getDB()
  if (!db) return
  await db.delete('sync_queue', id)
}

export async function cacheMatches(matches: Array<Record<string, unknown>>) {
  const db = await getDB()
  if (!db) return
  const tx = db.transaction('matches_cache', 'readwrite')
  const cached_at = new Date().toISOString()
  await Promise.all([
    ...matches.map((m) => tx.store.put({ ...m, cached_at })),
    tx.done,
  ])
}

export async function getCachedMatches(eventId: string) {
  const db = await getDB()
  if (!db) return []
  return db.getAllFromIndex('matches_cache', 'by_event', eventId)
}
