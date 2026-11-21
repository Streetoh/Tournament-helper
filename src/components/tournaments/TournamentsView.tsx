import { Bus, Car, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Player, Team, Tournament } from '../../types/models'
import { calculateTournamentFees, formatDateBlock } from '../../utils/calculations'
import { getTeamBadgeStyle } from '../../utils/teamColors'

interface TournamentsViewProps {
  tournaments: Tournament[]
  teams: Team[]
  players: Player[]
  onSelectTournament: (id: string) => void
  onCreateTournament: () => void
}

type FilterType = 'all' | 'pending' | 'closed'

export function TournamentsView({
  tournaments,
  teams,
  players,
  onSelectTournament,
  onCreateTournament,
}: TournamentsViewProps) {
  const [filter, setFilter] = useState<FilterType>('all')

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])
  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])

  const sortedTournaments = useMemo(() => {
    return [...tournaments].sort((a, b) => a.date.localeCompare(b.date))
  }, [tournaments])

  const filteredTournaments = useMemo(() => {
    return sortedTournaments.filter((t) => {
      const fin = calculateTournamentFees(t, Boolean(t.publishCoachPrices))
      const isClosed = fin.totalCount > 0 && fin.pendingCount === 0
      if (filter === 'pending') return !isClosed
      if (filter === 'closed') return isClosed
      return true
    })
  }, [sortedTournaments, filter])

  const getTournamentTeams = (t: Tournament): Team[] => {
    const found = new Map<string, Team>()
    for (const part of t.participants) {
      const player = playerMap.get(part.playerId)
      if (!player) continue
      for (const tid of player.teamIds) {
        const team = teamMap.get(tid)
        if (team) found.set(team.id, team)
      }
    }
    return Array.from(found.values()).slice(0, 2)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9]">Torneos</h1>
        <button
          type="button"
          onClick={onCreateTournament}
          aria-label="Nuevo torneo"
          className="h-9 w-9 rounded-xl bg-[#3B82F6] text-white flex items-center justify-center hover:bg-[#2563EB] transition-colors cursor-pointer"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(
          [
            ['all', 'Todos'],
            ['pending', 'Pendientes'],
            ['closed', 'Cerrados'],
          ] as const
        ).map(([key, label]) => {
          const active = filter === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                active
                  ? 'bg-[#3B82F6]/20 border-[#3B82F6] text-[#F1F5F9]'
                  : 'bg-[#141821] border-[#232938] text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* List */}
      {filteredTournaments.length === 0 ? (
        <div className="rounded-2xl border border-[#232938] bg-[#141821] p-8 flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-[#64748B]">Sin torneos</p>
          <button
            type="button"
            onClick={onCreateTournament}
            className="rounded-xl bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB] cursor-pointer"
          >
            + Nuevo torneo
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTournaments.map((t) => {
            const { day, month, weekday } = formatDateBlock(t.date)
            const fin = calculateTournamentFees(t, Boolean(t.publishCoachPrices))
            const progressPct = fin.totalCount > 0 ? Math.round((fin.paidCount / fin.totalCount) * 100) : 0
            const allPaid = fin.totalCount > 0 && fin.pendingCount === 0
            const tournamentTeams = getTournamentTeams(t)

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTournament(t.id)}
                className="w-full text-left rounded-2xl border border-[#232938] bg-[#141821] p-3.5 hover:border-[#334155] transition-colors cursor-pointer flex items-center gap-3.5"
              >
                {/* Calendar block */}
                <div className="w-13 h-14 shrink-0 rounded-xl bg-[#0B0D12] border border-[#232938] flex flex-col items-center justify-center">
                  <span className="text-lg font-bold leading-none text-[#F1F5F9] tabular-nums">{day}</span>
                  <span className="text-[11px] font-semibold tracking-wider text-[#94A3B8] mt-1">
                    {month}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#F1F5F9] truncate">
                      {weekday ? `${weekday} — ${t.name}` : t.name}
                    </p>
                    {fin.totalCount > 0 && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums shrink-0 ${
                          allPaid
                            ? 'bg-[#34D399]/15 text-[#34D399]'
                            : 'bg-[#FB7185]/15 text-[#FB7185]'
                        }`}
                      >
                        {allPaid ? 'Todos pagados' : `${fin.pendingCount} pendientes`}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      {tournamentTeams.map((team) => (
                        <span
                          key={team.id}
                          style={getTeamBadgeStyle(team.color)}
                          className="rounded-md border px-2 py-0.5 text-[11px] font-medium truncate"
                        >
                          {team.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2.5 text-[11px] text-[#94A3B8] tabular-nums shrink-0">
                      <span className="inline-flex items-center gap-1 text-[#60A5FA]">
                        <Bus className="h-3.5 w-3.5" />
                        <span>{fin.busCount}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#FBBF24]">
                        <Car className="h-3.5 w-3.5" />
                        <span>{fin.carCount}</span>
                      </span>
                      <span>
                        {fin.playerCount} convocados
                        {fin.passengerCount > 0 ? ` + ${fin.passengerCount} pasaj.` : ''} · {fin.paidCount}{' '}
                        {fin.paidCount === 1 ? 'pagado' : 'pagados'}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-[#1F2433] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#34D399] transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
