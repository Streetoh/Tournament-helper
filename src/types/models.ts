export type RoundingRule = 'exact' | '0.50' | '1.00'
export type TransportMode = 'bus' | 'car'
export type PaymentMethod = 'cash' | 'transfer'
export type PricingMode = 'split' | 'unified'

export interface Team {
  id: string
  name: string
  color: string
}

export interface Player {
  id: string
  firstName: string
  lastName: string
  photoBase64?: string
  teamIds: string[]
}

export type ParticipantRole = 'player' | 'passenger'

export interface TournamentParticipant {
  playerId: string
  role?: ParticipantRole
  name?: string
  transport: TransportMode
  paid: boolean
  paymentMethod?: PaymentMethod
  customPrice?: number | null
}

export interface Tournament {
  id: string
  name: string
  date: string
  address: string
  matchSchedule: string
  busDepartureTime: string
  carArrivalTime: string
  tournamentCost: number
  busCost: number
  realTournamentCost?: number | null
  realBusCost?: number | null
  roundingRule: RoundingRule
  pricingMode?: PricingMode
  customBusPrice?: number | null
  customCarPrice?: number | null
  customUnifiedPrice?: number | null
  publishCoachPrices?: boolean
  notes?: string
  coachNotes?: string
  participants: TournamentParticipant[]
}

export interface AppDataPayload {
  version: number
  updatedAt: string
  teams: Team[]
  players: Player[]
  tournaments: Tournament[]
  coachPin?: string
}

export interface GitHubConfig {
  owner: string
  repo: string
  branch: string
  path: string
  token: string
  lastSyncedAt?: string
  lastSyncedSha?: string
}

export type ActiveTab = 'tournaments' | 'teams' | 'calc' | 'coach' | 'settings'
