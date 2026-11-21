import { describe, expect, it } from 'vitest'
import type { Player, Tournament } from '../../types/models'
import { calculateTournamentFees, formatDateBlock, roundUpFee } from '../calculations'
import { generateParentMessage } from '../clipboardTemplates'
import { buildImportPreview, detectFieldMapping, extractRecordsFromJson } from '../jsonImporter'

describe('roundUpFee', () => {
  it('rounds up exact to 2 decimals', () => {
    expect(roundUpFee(12.341, 'exact')).toBe(12.35)
    expect(roundUpFee(15, 'exact')).toBe(15)
  })

  it('rounds up to 0.50 increments', () => {
    expect(roundUpFee(12.01, '0.50')).toBe(12.5)
    expect(roundUpFee(12.5, '0.50')).toBe(12.5)
    expect(roundUpFee(12.51, '0.50')).toBe(13)
  })

  it('rounds up to 1.00 increments (entero superior)', () => {
    expect(roundUpFee(12.01, '1.00')).toBe(13)
    expect(roundUpFee(19.01, '1.00')).toBe(20)
    expect(roundUpFee(19.2, '1.00')).toBe(20)
    expect(roundUpFee(19.0, '1.00')).toBe(19)
  })
})

describe('calculateTournamentFees', () => {
  it('splits tournament cost among all and bus cost only among bus riders', () => {
    const tournament: Tournament = {
      id: 't1',
      name: 'Torneo Tartu',
      date: '2026-11-21',
      address: 'Tartu, Estonia',
      matchSchedule: '10:00 vs Tammeka',
      busDepartureTime: '08:30',
      carArrivalTime: '09:00',
      tournamentCost: 100,
      busCost: 60,
      roundingRule: 'exact',
      participants: [
        { playerId: 'p1', transport: 'bus', paid: true, paymentMethod: 'transfer' },
        { playerId: 'p2', transport: 'bus', paid: false },
        { playerId: 'p3', transport: 'car', paid: true, paymentMethod: 'cash' },
        { playerId: 'p4', transport: 'car', paid: false },
      ],
    }

    const res = calculateTournamentFees(tournament, true)
    expect(res.carFee).toBe(25) // 100 / 4
    expect(res.busFee).toBe(55) // 25 + (60 / 2)
    expect(res.totalCost).toBe(160)
    expect(res.expectedTotal).toBe(160)
    expect(res.collectedTotal).toBe(80)
    expect(res.pendingTotal).toBe(80)
    expect(res.roundingBalance).toBe(0)
    expect(res.paidCount).toBe(2)
    expect(res.pendingCount).toBe(2)
  })

  it('computes positive rounding balance when rounded up', () => {
    const tournament: Tournament = {
      id: 't2',
      name: 'Copa',
      date: '2026-11-29',
      address: '',
      matchSchedule: '',
      busDepartureTime: '',
      carArrivalTime: '',
      tournamentCost: 100,
      busCost: 0,
      roundingRule: '1.00',
      participants: [
        { playerId: 'p1', transport: 'car', paid: false },
        { playerId: 'p2', transport: 'car', paid: false },
        { playerId: 'p3', transport: 'car', paid: false },
      ],
    }

    const res = calculateTournamentFees(tournament, true)
    expect(res.carFee).toBe(34) // ceil(33.333)
    expect(res.expectedTotal).toBe(102)
    expect(res.roundingBalance).toBe(2)
  })

  it('supports unified pricing mode, custom overrides, and individual player prices', () => {
    const tournament: Tournament = {
      id: 't-uni',
      name: 'Copa Narva',
      date: '2026-11-29',
      address: 'Narva',
      matchSchedule: '',
      busDepartureTime: '',
      carArrivalTime: '',
      tournamentCost: 60,
      busCost: 40,
      roundingRule: '1.00',
      pricingMode: 'unified',
      customUnifiedPrice: 30,
      participants: [
        { playerId: 'p1', transport: 'bus', paid: true, paymentMethod: 'transfer' },
        { playerId: 'p2', transport: 'car', paid: false, customPrice: 20 },
        { playerId: 'p3', transport: 'car', paid: false },
      ],
    }

    const res = calculateTournamentFees(tournament, true)
    expect(res.unifiedFee).toBe(30)
    expect(res.expectedTotal).toBe(80) // 30 + 20 + 30
    expect(res.collectedTotal).toBe(30)
    expect(res.pendingTotal).toBe(50)
    expect(res.margin).toBe(-20) // 80 - 100

    // Normal view ignores coach overrides
    const normalRes = calculateTournamentFees(tournament, false)
    expect(normalRes.pricingMode).toBe('split')
    expect(normalRes.carFee).toBe(20) // 60 / 3
    expect(normalRes.busFee).toBe(60) // 20 + 40 / 1
    expect(normalRes.expectedTotal).toBe(100) // 20 + 20 + 60

    const et = generateParentMessage(tournament, 'et')
    expect(et).toContain('• Autoga: 20,00 €')
    expect(et).toContain('• Bussiga: 60,00 €')

    const en = generateParentMessage(tournament, 'en')
    expect(en).toContain('• By car: 20,00 €')
    expect(en).toContain('• By bus: 60,00 €')
  })

  it('keeps nominal tournamentCost separate from private realTournamentCost', () => {
    const tournament: Tournament = {
      id: 't-real',
      name: 'Copa',
      date: '2026-11-29',
      address: '',
      matchSchedule: '',
      busDepartureTime: '',
      carArrivalTime: '',
      tournamentCost: 100,
      busCost: 0,
      realTournamentCost: 70,
      roundingRule: 'exact',
      participants: [
        { playerId: 'p1', transport: 'car', paid: false },
        { playerId: 'p2', transport: 'car', paid: false },
      ],
    }

    const res = calculateTournamentFees(tournament, true)
    expect(res.autoCarFee).toBe(50) // Based on nominal 100 / 2
    expect(res.totalCost).toBe(70) // Real cost for coach margin
    expect(res.expectedTotal).toBe(100)
    expect(res.margin).toBe(30)
  })

  it('charges bus-only passengers without splitting tournamentCost among them', () => {
    const tournament: Tournament = {
      id: 't-pass',
      name: 'Copa Bus',
      date: '2026-11-29',
      address: '',
      matchSchedule: '',
      busDepartureTime: '08:00',
      carArrivalTime: '',
      tournamentCost: 100,
      busCost: 60,
      roundingRule: 'exact',
      participants: [
        { playerId: 'p1', transport: 'bus', paid: false },
        { playerId: 'p2', transport: 'car', paid: false },
        { playerId: 'pass1', role: 'passenger', name: 'Padre', transport: 'bus', paid: false },
      ],
    }

    const res = calculateTournamentFees(tournament)
    expect(res.playerCount).toBe(2)
    expect(res.passengerCount).toBe(1)
    expect(res.busCount).toBe(2) // p1 + pass1
    expect(res.carFee).toBe(50) // 100 / 2 players
    expect(res.busFee).toBe(80) // 50 + (60 / 2 bus riders)
    expect(res.passengerFee).toBe(30) // 60 / 2 bus riders only
    expect(res.expectedTotal).toBe(160) // 50 + 80 + 30
  })
})

describe('formatDateBlock', () => {
  it('parses YYYY-MM-DD without timezone shift', () => {
    const block = formatDateBlock('2026-11-21')
    expect(block.day).toBe('21')
    expect(block.month).toBe('NOV')
    expect(block.weekday).toBe('Sáb')
  })
})

describe('generateParentMessage', () => {
  it('generates Estonian and English messages and omits empty bus lines', () => {
    const tournament: Tournament = {
      id: 't3',
      name: 'Torneo Tartu',
      date: '2026-11-21',
      address: 'Tartu, Estonia',
      matchSchedule: '10:00 vs Kalev',
      busDepartureTime: '',
      carArrivalTime: '09:30',
      tournamentCost: 100,
      busCost: 0,
      roundingRule: 'exact',
      participants: [
        { playerId: 'p1', transport: 'car', paid: false },
        { playerId: 'p2', transport: 'car', paid: false },
      ],
    }

    const et = generateParentMessage(tournament, 'et')
    expect(et).toContain('🏆 Torneo Tartu — 21 nov 2026')
    expect(et).toContain('📍 Asukoht: Tartu, Estonia')
    expect(et).not.toContain('Bussi väljumine')
    expect(et).toContain('🚗 Kohalolek autoga: 09:30')
    expect(et).toContain('• Autoga: 50,00 €')
    expect(et).not.toContain('Bussiga')

    const en = generateParentMessage(tournament, 'en')
    expect(en).toContain('📍 Location: Tartu, Estonia')
    expect(en).toContain('🚗 Arrival by car: 09:30')
    expect(en).toContain('• By car: 50,00 €')
    expect(en).not.toContain('By bus')
  })
})

describe('jsonImporter', () => {
  it('detects Estonian and Spanish keys and flags duplicates', () => {
    const raw = {
      players: [
        { eesnimi: 'Artur', perenimi: 'Mägi', grupp: 'U12 Amarillo' },
        { eesnimi: 'Denis', perenimi: 'Kask', grupp: 'U12 Amarillo' },
      ],
    }
    const records = extractRecordsFromJson(raw)
    expect(records).toHaveLength(2)

    const mapping = detectFieldMapping(['eesnimi', 'perenimi', 'grupp'])
    expect(mapping.firstNameKey).toBe('eesnimi')
    expect(mapping.lastNameKey).toBe('perenimi')
    expect(mapping.teamKey).toBe('grupp')

    const existing: Player[] = [
      { id: '1', firstName: 'artur', lastName: 'Mägi', teamIds: [] },
    ]
    const preview = buildImportPreview(records, mapping, existing)
    expect(preview[0].isDuplicate).toBe(true)
    expect(preview[1].isDuplicate).toBe(false)
    expect(preview[1].teamName).toBe('U12 Amarillo')
  })
})
