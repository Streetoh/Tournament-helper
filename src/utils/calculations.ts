import type { PricingMode, RoundingRule, Tournament, TournamentParticipant } from '../types/models'

export interface TournamentFinancials {
  isCoachMode: boolean
  pricingMode: PricingMode
  autoCarFee: number
  autoBusFee: number
  autoPassengerFee: number
  autoUnifiedFee: number
  carFee: number
  busFee: number
  passengerFee: number
  unifiedFee: number
  totalCost: number
  expectedTotal: number
  collectedTotal: number
  pendingTotal: number
  roundingBalance: number
  margin: number
  paidCount: number
  totalCount: number
  playerCount: number
  passengerCount: number
  pendingCount: number
  busCount: number
  carCount: number
}

export function roundUpFee(amount: number, rule: RoundingRule): number {
  if (amount <= 0) return 0
  // Avoid floating point precision issues like 19.000000000002
  const clean = Math.round(amount * 10000) / 10000
  if (rule === 'exact') {
    return Math.ceil(clean * 100) / 100
  }
  if (rule === '0.50') {
    return Math.ceil(clean * 2) / 2
  }
  return Math.ceil(clean)
}

export function getParticipantFee(
  participant: TournamentParticipant,
  tournament: Tournament,
  fin?: Pick<
    TournamentFinancials,
    'isCoachMode' | 'pricingMode' | 'carFee' | 'busFee' | 'passengerFee' | 'unifiedFee'
  >
): number {
  const isCoach = fin?.isCoachMode ?? false
  if (isCoach && participant.customPrice != null && Number.isFinite(participant.customPrice)) {
    return Math.max(0, Math.round(participant.customPrice * 100) / 100)
  }

  const isPassenger = participant.role === 'passenger'
  if (isPassenger) {
    if (fin) return fin.passengerFee
    const busCount = tournament.participants.filter(
      (p) => p.role === 'passenger' || p.transport === 'bus'
    ).length
    const bCost = Math.max(0, Number(tournament.busCost) || 0)
    return busCount > 0 ? roundUpFee(bCost / busCount, tournament.roundingRule) : 0
  }

  const pricingMode = isCoach ? (fin?.pricingMode ?? tournament.pricingMode ?? 'split') : 'split'
  if (pricingMode === 'unified') {
    if (fin) return fin.unifiedFee
    const playerCount = tournament.participants.filter((p) => p.role !== 'passenger').length
    const totalCost =
      Math.max(0, Number(tournament.tournamentCost) || 0) +
      Math.max(0, Number(tournament.busCost) || 0)
    const autoUnified = playerCount > 0 ? roundUpFee(totalCost / playerCount, tournament.roundingRule) : 0
    return tournament.customUnifiedPrice != null ? tournament.customUnifiedPrice : autoUnified
  }
  if (fin) {
    return participant.transport === 'bus' ? fin.busFee : fin.carFee
  }
  const playerCount = tournament.participants.filter((p) => p.role !== 'passenger').length
  const busCount = tournament.participants.filter(
    (p) => p.role === 'passenger' || p.transport === 'bus'
  ).length
  const tCost = Math.max(0, Number(tournament.tournamentCost) || 0)
  const bCost = Math.max(0, Number(tournament.busCost) || 0)
  const base = playerCount > 0 ? tCost / playerCount : 0
  if (participant.transport === 'bus') {
    return busCount > 0 ? roundUpFee(base + bCost / busCount, tournament.roundingRule) : 0
  }
  return playerCount > 0 ? roundUpFee(base, tournament.roundingRule) : 0
}

export function calculateTournamentFees(
  tournament: Tournament,
  useCoachOverrides = false
): TournamentFinancials {
  const totalCount = tournament.participants.length
  const passengerCount = tournament.participants.filter((p) => p.role === 'passenger').length
  const playerCount = totalCount - passengerCount
  const busCount = tournament.participants.filter(
    (p) => p.role === 'passenger' || p.transport === 'bus'
  ).length
  const carCount = tournament.participants.filter(
    (p) => p.role !== 'passenger' && p.transport === 'car'
  ).length

  const tournamentCost = Math.max(0, Number(tournament.tournamentCost) || 0)
  const busCost = Math.max(0, Number(tournament.busCost) || 0)
  const nominalTotalCost = Math.round((tournamentCost + busCost) * 100) / 100

  const realTournamentCost =
    useCoachOverrides && tournament.realTournamentCost != null
      ? Math.max(0, Number(tournament.realTournamentCost) || 0)
      : tournamentCost
  const realBusCost =
    useCoachOverrides && tournament.realBusCost != null
      ? Math.max(0, Number(tournament.realBusCost) || 0)
      : busCost
  const totalCost = Math.round((realTournamentCost + realBusCost) * 100) / 100

  const baseTournamentPerPlayer = playerCount > 0 ? tournamentCost / playerCount : 0
  const busPerBusRider = busCount > 0 ? busCost / busCount : 0

  const autoCarFee = playerCount > 0 ? roundUpFee(baseTournamentPerPlayer, tournament.roundingRule) : 0
  const autoBusFee =
    busCount > 0 && playerCount > 0
      ? roundUpFee(baseTournamentPerPlayer + busPerBusRider, tournament.roundingRule)
      : 0
  const autoPassengerFee = busCount > 0 ? roundUpFee(busPerBusRider, tournament.roundingRule) : 0
  const autoUnifiedFee =
    playerCount > 0 ? roundUpFee(nominalTotalCost / playerCount, tournament.roundingRule) : 0

  const pricingMode: PricingMode = useCoachOverrides ? (tournament.pricingMode ?? 'split') : 'split'
  const carFee =
    useCoachOverrides && tournament.customCarPrice != null
      ? Math.max(0, tournament.customCarPrice)
      : autoCarFee
  const busFee =
    useCoachOverrides && tournament.customBusPrice != null
      ? Math.max(0, tournament.customBusPrice)
      : autoBusFee
  const passengerFee = autoPassengerFee
  const unifiedFee =
    useCoachOverrides && tournament.customUnifiedPrice != null
      ? Math.max(0, tournament.customUnifiedPrice)
      : autoUnifiedFee

  let expectedTotal = 0
  let collectedTotal = 0
  let paidCount = 0

  for (const participant of tournament.participants) {
    const fee = getParticipantFee(participant, tournament, {
      isCoachMode: useCoachOverrides,
      pricingMode,
      carFee,
      busFee,
      passengerFee,
      unifiedFee,
    })
    expectedTotal += fee
    if (participant.paid) {
      collectedTotal += fee
      paidCount += 1
    }
  }

  expectedTotal = Math.round(expectedTotal * 100) / 100
  collectedTotal = Math.round(collectedTotal * 100) / 100
  const pendingTotal = Math.max(0, Math.round((expectedTotal - collectedTotal) * 100) / 100)
  const roundingBalance = Math.round((expectedTotal - totalCost) * 100) / 100
  const margin = roundingBalance
  const pendingCount = totalCount - paidCount

  return {
    isCoachMode: useCoachOverrides,
    pricingMode,
    autoCarFee,
    autoBusFee,
    autoPassengerFee,
    autoUnifiedFee,
    carFee,
    busFee,
    passengerFee,
    unifiedFee,
    totalCost,
    expectedTotal,
    collectedTotal,
    pendingTotal,
    roundingBalance,
    margin,
    paidCount,
    totalCount,
    playerCount,
    passengerCount,
    pendingCount,
    busCount,
    carCount,
  }
}

export function formatMoney(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  return `${rounded.toFixed(2).replace('.', ',')} €`
}

export function formatMoneyCompact(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  if (Number.isInteger(rounded)) {
    return `${rounded} €`
  }
  return `${rounded.toFixed(2).replace('.', ',')} €`
}

const MONTHS_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const WEEKDAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function parseLocalDate(isoDate: string): Date | null {
  if (!isoDate) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim())
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2]) - 1
    const day = Number(match[3])
    return new Date(year, month, day)
  }
  const parsed = new Date(isoDate)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatDateBlock(isoDate: string): { day: string; month: string; weekday: string } {
  const date = parseLocalDate(isoDate)
  if (!date) {
    return { day: '--', month: '---', weekday: '' }
  }
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: MONTHS_ES[date.getMonth()] ?? '---',
    weekday: WEEKDAYS_ES[date.getDay()] ?? '',
  }
}

export function formatSpanishDate(isoDate: string): string {
  const date = parseLocalDate(isoDate)
  if (!date) return isoDate || ''
  const day = date.getDate()
  const month = (MONTHS_ES[date.getMonth()] ?? '').toLowerCase()
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}
