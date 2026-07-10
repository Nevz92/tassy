import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { DayEntry, PhotoRec, Profile } from './types'
import type { Food } from './parser'

interface TassyDB extends DBSchema {
  kv: { key: string; value: unknown }
  days: { key: string; value: DayEntry }
  weights: { key: string; value: number }
  photos: { key: string; value: PhotoRec; indexes: { 'by-date': string } }
  myfoods: { key: string; value: Food }
}

let dbp: Promise<IDBPDatabase<TassyDB>> | undefined

function db() {
  dbp ??= openDB<TassyDB>('tassy', 2, {
    upgrade(d, oldVersion) {
      if (oldVersion < 1) {
        d.createObjectStore('kv')
        d.createObjectStore('days', { keyPath: 'date' })
        d.createObjectStore('weights')
        d.createObjectStore('photos', { keyPath: 'id' }).createIndex('by-date', 'date')
      }
      if (oldVersion < 2) {
        d.createObjectStore('myfoods', { keyPath: 'n' })
      }
    },
  })
  return dbp
}

// ---------- meus alimentos (estimados por IA) ----------

export async function loadMyFoods(): Promise<Food[]> {
  return (await db()).getAll('myfoods')
}

export async function saveMyFood(f: Food) {
  await (await db()).put('myfoods', f)
}

// ---------- perfil ----------

export async function loadProfile(): Promise<Profile | undefined> {
  return (await (await db()).get('kv', 'profile')) as Profile | undefined
}

export async function saveProfile(p: Profile) {
  await (await db()).put('kv', p, 'profile')
}

// ---------- dias ----------

export async function loadAllDays(): Promise<Record<string, DayEntry>> {
  const all = await (await db()).getAll('days')
  const map: Record<string, DayEntry> = {}
  for (const d of all) map[d.date] = d
  return map
}

const saveTimers = new Map<string, number>()

/** grava com debounce por dia (bom para digitação em textareas) */
export function saveDay(entry: DayEntry) {
  clearTimeout(saveTimers.get(entry.date))
  saveTimers.set(
    entry.date,
    window.setTimeout(async () => {
      saveTimers.delete(entry.date)
      await (await db()).put('days', entry)
    }, 300)
  )
}

// ---------- peso (por semana, chave = segunda-feira YYYY-MM-DD) ----------

export async function loadAllWeights(): Promise<Record<string, number>> {
  const d = await db()
  const keys = await d.getAllKeys('weights')
  const map: Record<string, number> = {}
  for (const k of keys) {
    const v = await d.get('weights', k)
    if (v !== undefined) map[k] = v
  }
  return map
}

export async function saveWeight(weekStart: string, kg: number | null) {
  const d = await db()
  if (kg === null) await d.delete('weights', weekStart)
  else await d.put('weights', kg, weekStart)
}

// ---------- fotos ----------

export async function addPhoto(date: string, blob: Blob): Promise<PhotoRec> {
  const rec: PhotoRec = { id: crypto.randomUUID(), date, blob }
  await (await db()).put('photos', rec)
  return rec
}

/** prefix ex.: "2026-07" */
export async function photosOfMonth(prefix: string): Promise<PhotoRec[]> {
  const all = await (await db()).getAll('photos')
  return all.filter((p) => p.date.startsWith(prefix))
}

export async function deletePhoto(id: string) {
  await (await db()).delete('photos', id)
}

// ---------- backup ----------

export interface Backup {
  app: 'tassy'
  version: 1
  exportadoEm: string
  profile?: Profile
  days: DayEntry[]
  weights: Record<string, number>
}

export async function exportBackup(): Promise<Backup> {
  const d = await db()
  return {
    app: 'tassy',
    version: 1,
    exportadoEm: new Date().toISOString(),
    profile: (await d.get('kv', 'profile')) as Profile | undefined,
    days: await d.getAll('days'),
    weights: await loadAllWeights(),
  }
}

export async function importBackup(b: Backup) {
  const d = await db()
  if (b.profile) await d.put('kv', b.profile, 'profile')
  for (const day of b.days ?? []) await d.put('days', day)
  for (const [k, v] of Object.entries(b.weights ?? {})) await d.put('weights', v, k)
}
