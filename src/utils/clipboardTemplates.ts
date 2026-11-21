import type { Tournament } from '../types/models'
import { calculateTournamentFees, formatMoney, formatSpanishDate } from './calculations'

export function generateParentMessage(tournament: Tournament, lang: 'et' | 'en'): string {
  const financials = calculateTournamentFees(tournament, Boolean(tournament.publishCoachPrices))
  const dateText = formatSpanishDate(tournament.date)
  const headerDate = dateText ? ` — ${dateText}` : ''

  const hasBus =
    Boolean(tournament.busDepartureTime.trim()) ||
    tournament.busCost > 0 ||
    financials.busCount > 0

  const lines: string[] = []
  lines.push(`🏆 ${tournament.name.trim()}${headerDate}`)

  if (tournament.address.trim()) {
    lines.push(
      lang === 'et'
        ? `📍 Asukoht: ${tournament.address.trim()}`
        : `📍 Location: ${tournament.address.trim()}`
    )
  }

  if (tournament.busDepartureTime.trim()) {
    lines.push(
      lang === 'et'
        ? `🚌 Bussi väljumine: ${tournament.busDepartureTime.trim()}`
        : `🚌 Bus departure: ${tournament.busDepartureTime.trim()}`
    )
  }

  if (tournament.carArrivalTime.trim()) {
    lines.push(
      lang === 'et'
        ? `🚗 Kohalolek autoga: ${tournament.carArrivalTime.trim()}`
        : `🚗 Arrival by car: ${tournament.carArrivalTime.trim()}`
    )
  }

  if (tournament.matchSchedule.trim()) {
    lines.push('')
    lines.push(lang === 'et' ? '📅 Mängude ajakava:' : '📅 Match schedule:')
    lines.push(tournament.matchSchedule.trim())
  }

  if (financials.pricingMode === 'unified') {
    if (financials.unifiedFee > 0 || financials.totalCount > 0) {
      lines.push('')
      lines.push(
        lang === 'et'
          ? `💶 Osalustasu: ${formatMoney(financials.unifiedFee)}`
          : `💶 Participation fee: ${formatMoney(financials.unifiedFee)}`
      )
    }
    return lines.join('\n')
  }

  const feeLines: string[] = []
  if (financials.carFee > 0 || financials.carCount > 0 || (!hasBus && financials.totalCost > 0)) {
    feeLines.push(
      lang === 'et'
        ? `• Autoga: ${formatMoney(financials.carFee)}`
        : `• By car: ${formatMoney(financials.carFee)}`
    )
  }

  if (hasBus && financials.busFee > 0) {
    feeLines.push(
      lang === 'et'
        ? `• Bussiga: ${formatMoney(financials.busFee)}`
        : `• By bus: ${formatMoney(financials.busFee)}`
    )
  }

  if (feeLines.length > 0) {
    lines.push('')
    lines.push(lang === 'et' ? '💶 Osalustasu:' : '💶 Participation fee:')
    lines.push(...feeLines)
  }

  return lines.join('\n')
}
