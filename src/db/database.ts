import Dexie, { type Table } from 'dexie'
import type { AppDataPayload, Player, Team, Tournament } from '../types/models'
import { getTeamColor } from '../utils/teamColors'

class TournamentDatabase extends Dexie {
  teams!: Table<Team, string>
  players!: Table<Player, string>
  tournaments!: Table<Tournament, string>

  constructor() {
    super('AsistenteTorneosDB')
    this.version(1).stores({
      teams: 'id, name',
      players: 'id, firstName, lastName, *teamIds',
      tournaments: 'id, date, name',
    })
  }
}

export const db = new TournamentDatabase()

const LOCAL_UPDATED_AT_KEY = 'torneos_local_updated_at'
const COACH_PIN_KEY = 'torneos_coach_pin'

export function getCoachPin(): string | undefined {
  return localStorage.getItem(COACH_PIN_KEY) ?? undefined
}

export function setCoachPin(pin?: string): void {
  if (pin) {
    localStorage.setItem(COACH_PIN_KEY, pin)
  } else {
    localStorage.removeItem(COACH_PIN_KEY)
  }
}

export function markLocalModified(): string {
  const now = new Date().toISOString()
  localStorage.setItem(LOCAL_UPDATED_AT_KEY, now)
  return now
}

export function getLocalUpdatedAt(): string | undefined {
  return localStorage.getItem(LOCAL_UPDATED_AT_KEY) ?? undefined
}

export function setLocalUpdatedAt(iso: string): void {
  localStorage.setItem(LOCAL_UPDATED_AT_KEY, iso)
}

export async function exportAllData(): Promise<AppDataPayload> {
  const [teams, players, tournaments] = await Promise.all([
    db.teams.toArray(),
    db.players.toArray(),
    db.tournaments.toArray(),
  ])

  return {
    version: 1,
    updatedAt: getLocalUpdatedAt() ?? new Date().toISOString(),
    teams,
    players,
    tournaments,
    coachPin: getCoachPin(),
  }
}

export async function replaceAllData(payload: AppDataPayload): Promise<void> {
  const normalizedTeams: Team[] = payload.teams.map((t, idx) => ({
    ...t,
    color: getTeamColor(t.color, idx),
  }))

  await db.transaction('rw', db.teams, db.players, db.tournaments, async () => {
    await db.teams.clear()
    await db.players.clear()
    await db.tournaments.clear()

    if (normalizedTeams.length > 0) await db.teams.bulkPut(normalizedTeams)
    if (payload.players.length > 0) await db.players.bulkPut(payload.players)
    if (payload.tournaments.length > 0) await db.tournaments.bulkPut(payload.tournaments)
  })

  if (payload.coachPin) {
    setCoachPin(payload.coachPin)
  }

  if (payload.updatedAt) {
    setLocalUpdatedAt(payload.updatedAt)
  } else {
    markLocalModified()
  }
}
