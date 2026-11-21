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
        <h1 className="text-[26px] font-extrabold tracking-tight text-[#F5F5F0]">Torneos</h1>
        <button
          type="button"
          onClick={onCreateTournament}
          aria-label="Nuevo torneo"
          className="w-11 h-11 rounded-2xl bg-[#C8FF2E] text-[#0A0A0C] flex items-center justify-center hover:brightness-95 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="h-5 w-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Segmented Filter */}
      <div className="grid grid-cols-3 gap-1 bg-[#131316] border border-[#24242B] p-1 rounded-xl">
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
              className={`rounded-lg min-h-[38px] text-xs transition-all active:scale-[0.98] cursor-pointer ${
                active
                  ? 'bg-[#F5F5F0] text-[#0A0A0C] font-bold'
                  : 'text-[#9A9AA6] font-medium hover:text-[#F5F5F0]'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* List */}
      {filteredTournaments.length === 0 ? (
        <div className="rounded-2xl border border-[#24242B] bg-[#131316] p-8 flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-[#63636E]">Sin torneos</p>
          <button
            type="button"
            onClick={onCreateTournament}
            className="rounded-xl bg-[#C8FF2E] px-4 min-h-[44px] text-sm font-bold text-[#0A0A0C] hover:brightness-95 active:scale-[0.98] transition-all cursor-pointer"
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
                className="w-full text-left rounded-2xl border border-[#24242B] bg-[#131316] p-3.5 hover:border-[#32323C] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-3.5"
              >
                {/* Calendar block */}
                <div className="w-14 h-16 shrink-0 rounded-xl bg-[#1C1C21] border border-[#24242B] flex flex-col items-center justify-center">
                  <span className="font-mono text-xl font-bold leading-none text-[#F5F5F0] tabular-nums">
                    {day}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#C8FF2E] mt-1">
                    {month}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[#F5F5F0] truncate">
                      {weekday ? `${weekday} — ${t.name}` : t.name}
                    </p>
                    {fin.totalCount > 0 && (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tabular-nums shrink-0 ${
                          allPaid
                            ? 'bg-[#22C55E]/12 border-[#22C55E]/25 text-[#22C55E]'
                            : 'bg-[#F43F5E]/12 border-[#F43F5E]/25 text-[#F43F5E]'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            allPaid ? 'bg-[#22C55E]' : 'bg-[#F43F5E]'
                          }`}
                        />
                        <span>{allPaid ? 'Pagado' : `${fin.pendingCount} pend.`}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      {tournamentTeams.map((team) => (
                        <span
                          key={team.id}
                          style={getTeamBadgeStyle(team.color)}
                          className="rounded-md border px-2 py-0.5 text-[11px] font-semibold truncate"
                        >
                          {team.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2.5 text-[11px] text-[#9A9AA6] tabular-nums shrink-0">
                      <span className="inline-flex items-center gap-1 text-[#38BDF8]">
                        <Bus className="h-3.5 w-3.5" />
                        <span>{fin.busCount}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#F59E0B]">
                        <Car className="h-3.5 w-3.5" />
                        <span>{fin.carCount}</span>
                      </span>
                      <span>
                        {fin.playerCount} conv.
                        {fin.passengerCount > 0 ? ` + ${fin.passengerCount} pas.` : ''} · {fin.paidCount}/
                        {fin.totalCount} pag.
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-[#1C1C21] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        allPaid ? 'bg-[#22C55E]' : 'bg-[#C8FF2E]'
                      }`}
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
