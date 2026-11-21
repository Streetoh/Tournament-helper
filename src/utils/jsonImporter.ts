import type { Player } from '../types/models'

export interface FieldMapping {
  firstNameKey: string
  lastNameKey: string
  photoKey: string
  teamKey: string
}

export interface ImportedPreviewRow {
  index: number
  firstName: string
  lastName: string
  photoBase64?: string
  teamName: string
  isDuplicate: boolean
}

const FIRST_NAME_CANDIDATES = ['firstname', 'first_name', 'nombre', 'eesnimi', 'name', 'givenname']
const LAST_NAME_CANDIDATES = ['lastname', 'last_name', 'surname', 'apellidos', 'apellido', 'perenimi', 'familyname']
const PHOTO_CANDIDATES = ['photobase64', 'photo', 'avatar', 'image', 'foto', 'img', 'picture']
const TEAM_CANDIDATES = ['team', 'equipo', 'group', 'grupp', 'grupo', 'teams', 'equipos']

export function extractRecordsFromJson(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    for (const key of ['players', 'jugadores', 'data', 'items', 'records', 'members']) {
      if (Array.isArray(obj[key])) {
        return obj[key].filter(
          (item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)
        )
      }
    }
    // Fallback: first array property
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) {
        return val.filter(
          (item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)
        )
      }
    }
  }
  return []
}

export function collectAvailableKeys(records: Record<string, unknown>[]): string[] {
  const keySet = new Set<string>()
  for (const record of records.slice(0, 50)) {
    for (const key of Object.keys(record)) {
      keySet.add(key)
    }
  }
  return Array.from(keySet)
}

function findMatchingKey(keys: string[], candidates: string[]): string {
  const lowerMap = new Map(keys.map((k) => [k.toLowerCase(), k]))
  for (const candidate of candidates) {
    const match = lowerMap.get(candidate)
    if (match) return match
  }
  return ''
}

export function detectFieldMapping(keys: string[]): FieldMapping {
  return {
    firstNameKey: findMatchingKey(keys, FIRST_NAME_CANDIDATES),
    lastNameKey: findMatchingKey(keys, LAST_NAME_CANDIDATES),
    photoKey: findMatchingKey(keys, PHOTO_CANDIDATES),
    teamKey: findMatchingKey(keys, TEAM_CANDIDATES),
  }
}

export function normalizePlayerKey(firstName: string, lastName: string): string {
  return `${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}`
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value) && value.length > 0) return asString(value[0])
  return ''
}

export function buildImportPreview(
  records: Record<string, unknown>[],
  mapping: FieldMapping,
  existingPlayers: Player[]
): ImportedPreviewRow[] {
  const seen = new Set(existingPlayers.map((p) => normalizePlayerKey(p.firstName, p.lastName)))

  return records.map((record, index) => {
    let firstName = mapping.firstNameKey ? asString(record[mapping.firstNameKey]) : ''
    let lastName = mapping.lastNameKey ? asString(record[mapping.lastNameKey]) : ''

    // If only firstName is mapped and contains space while lastNameKey is empty, split cleanly
    if (firstName && !mapping.lastNameKey && firstName.includes(' ')) {
      const parts = firstName.split(/\s+/)
      firstName = parts[0] ?? ''
      lastName = parts.slice(1).join(' ')
    }

    const rawPhoto = mapping.photoKey ? asString(record[mapping.photoKey]) : ''
    const photoBase64 = rawPhoto.startsWith('data:image/') ? rawPhoto : undefined
    const teamName = mapping.teamKey ? asString(record[mapping.teamKey]) : ''

    const key = normalizePlayerKey(firstName, lastName)
    const isDuplicate = !firstName || seen.has(key)
    if (firstName) {
      seen.add(key)
    }

    return {
      index,
      firstName,
      lastName,
      photoBase64,
      teamName,
      isDuplicate,
    }
  })
}
