import { Check, ChevronLeft, KeyRound, RotateCcw, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Player, PricingMode, Team, Tournament, TransportMode } from '../../types/models'
import {
  calculateTournamentFees,
  formatDateBlock,
  formatMoney,
  getParticipantFee,
} from '../../utils/calculations'
import { getTeamBadgeStyle } from '../../utils/teamColors'
import { Avatar } from '../Avatar'

interface PriceInputProps {
  value: number
  onCommit: (val: number) => void
  className?: string
}

function PriceInput({ value, onCommit, className }: PriceInputProps) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')

  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? draft : String(value)}
      onFocus={(e) => {
        setFocused(true)
        setDraft(String(value))
        e.target.select()
      }}
      onChange={(e) => {
        const raw = e.target.value
        setDraft(raw)
        const normalized = raw.replace(',', '.').trim()
        if (normalized !== '' && !normalized.endsWith('.')) {
          const parsed = Number.parseFloat(normalized)
          if (Number.isFinite(parsed) && parsed >= 0) {
            onCommit(parsed)
          }
        }
      }}
      onBlur={() => {
        setFocused(false)
        const normalized = draft.replace(',', '.').trim()
        if (normalized !== '') {
          const parsed = Number.parseFloat(normalized)
          if (Number.isFinite(parsed) && parsed >= 0) {
            onCommit(parsed)
          }
        }
      }}
      className={className}
    />
  )
}

interface CoachViewProps {
  tournaments: Tournament[]
  teams: Team[]
  players: Player[]
  onExit: () => void
  onChangePin: () => void
  onUpdateTournament: (updated: Tournament) => Promise<void>
  onShowToast?: (msg: string) => void
}

export function CoachView({
  tournaments,
  teams,
  players,
  onExit,
  onChangePin,
  onUpdateTournament,
  onShowToast,
}: CoachViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'closed'>('all')

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])
  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])

  const selectedTournament = selectedId
    ? tournaments.find((t) => t.id === selectedId) ?? null
    : null

  const sortedTournaments = useMemo(
    () => [...tournaments].sort((a, b) => a.date.localeCompare(b.date)),
    [tournaments]
  )

  const filteredTournaments = useMemo(() => {
    return sortedTournaments.filter((t) => {
      const fin = calculateTournamentFees(t, true)
      const isClosed = fin.totalCount > 0 && fin.pendingCount === 0
      if (filter === 'pending') return !isClosed
      if (filter === 'closed') return isClosed
      return true
    })
  }, [sortedTournaments, filter])

  const getTournamentTeams = (t: Tournament): Team[] => {
    const found = new Map<string, Team>()
    for (const part of t.participants) {
      const p = playerMap.get(part.playerId)
      if (!p) continue
      for (const tid of p.teamIds) {
        const team = teamMap.get(tid)
        if (team) found.set(team.id, team)
      }
    }
    return Array.from(found.values()).slice(0, 2)
  }

  if (selectedTournament) {
    const fin = calculateTournamentFees(selectedTournament, true)
    const pricingMode: PricingMode = fin.pricingMode

    const handlePricingModeChange = async (mode: PricingMode) => {
      await onUpdateTournament({
        ...selectedTournament,
        pricingMode: mode,
      })
    }

    const handleRealCostInput = async (
      field: 'realTournamentCost' | 'realBusCost',
      val: number | null
    ) => {
      await onUpdateTournament({
        ...selectedTournament,
        [field]: val === null ? null : Math.max(0, val),
      })
    }

    const handleCustomPriceInput = async (
      field: 'customCarPrice' | 'customBusPrice' | 'customUnifiedPrice',
      val: number | null
    ) => {
      await onUpdateTournament({
        ...selectedTournament,
        [field]: val === null ? null : Math.max(0, val),
      })
    }

    const handleParticipantCustomPrice = async (playerId: string, val: number) => {
      const nextParticipants = selectedTournament.participants.map((p) =>
        p.playerId === playerId ? { ...p, customPrice: Math.max(0, val) } : p
      )
      await onUpdateTournament({ ...selectedTournament, participants: nextParticipants })
    }

    const handleResetParticipantPrice = async (playerId: string) => {
      const nextParticipants = selectedTournament.participants.map((p) =>
        p.playerId === playerId ? { ...p, customPrice: null } : p
      )
      await onUpdateTournament({ ...selectedTournament, participants: nextParticipants })
    }

    const handleToggleTransport = async (playerId: string) => {
      const nextParticipants = selectedTournament.participants.map((p) => {
        if (p.playerId !== playerId) return p
        if (!playerMap.has(p.playerId)) {
          return { ...p, role: 'passenger' as const, transport: 'bus' as TransportMode }
        }
        if (p.role === 'passenger') {
          return { ...p, role: 'player' as const, transport: 'car' as TransportMode }
        }
        if (p.transport === 'car') {
          return { ...p, role: 'player' as const, transport: 'bus' as TransportMode }
        }
        return { ...p, role: 'passenger' as const, transport: 'bus' as TransportMode }
      })
      await onUpdateTournament({ ...selectedTournament, participants: nextParticipants })
    }

    return (
      <div className="space-y-3.5">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Volver"
              className="p-1.5 -ml-1.5 rounded-xl text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#141821] cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-[#F1F5F9] truncate">
              {selectedTournament.name}
            </h1>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="rounded-lg border border-[#232938] bg-[#141821] px-2.5 py-1.5 text-xs font-medium text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer"
          >
            Bloquear
          </button>
        </div>

        {/* Private Margin Summary */}
        <div className="rounded-2xl border border-[#232938] bg-[#141821] p-3.5 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[11px] text-[#64748B]">Coste real</div>
              <div className="text-sm font-bold text-[#F1F5F9] tabular-nums mt-0.5">
                {formatMoney(fin.totalCost)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#64748B]">Total a cobrar</div>
              <div className="text-sm font-bold text-[#F1F5F9] tabular-nums mt-0.5">
                {formatMoney(fin.expectedTotal)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-[#64748B]">Margen</div>
              <div
                className={`text-sm font-bold tabular-nums mt-0.5 ${
                  fin.margin >= 0 ? 'text-[#34D399]' : 'text-[#FB7185]'
                }`}
              >
                {fin.margin >= 0 ? '+' : ''}
                {formatMoney(fin.margin)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-[#232938]/70">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-[#94A3B8]">
                  Inscripción real (€)
                </label>
                {selectedTournament.realTournamentCost != null && (
                  <button
                    type="button"
                    onClick={() => handleRealCostInput('realTournamentCost', null)}
                    title="Restaurar coste nominal"
                    className="text-[#3B82F6] hover:text-[#60A5FA] cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <PriceInput
                value={
                  selectedTournament.realTournamentCost != null
                    ? selectedTournament.realTournamentCost
                    : selectedTournament.tournamentCost
                }
                onCommit={(val) => handleRealCostInput('realTournamentCost', val)}
                className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-1.5 text-sm text-[#F1F5F9] tabular-nums focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-[#94A3B8]">
                  Autobús real (€)
                </label>
                {selectedTournament.realBusCost != null && (
                  <button
                    type="button"
                    onClick={() => handleRealCostInput('realBusCost', null)}
                    title="Restaurar coste nominal"
                    className="text-[#3B82F6] hover:text-[#60A5FA] cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <PriceInput
                value={
                  selectedTournament.realBusCost != null
                    ? selectedTournament.realBusCost
                    : selectedTournament.busCost
                }
                onCommit={(val) => handleRealCostInput('realBusCost', val)}
                className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-1.5 text-sm text-[#F1F5F9] tabular-nums focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>
        </div>

        {/* Pricing Mode & Overrides */}
        <div className="rounded-2xl border border-[#232938] bg-[#141821] p-3.5 space-y-3">
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#0B0D12] p-1 border border-[#232938]">
            <button
              type="button"
              onClick={() => handlePricingModeChange('split')}
              className={`rounded-lg py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                pricingMode === 'split'
                  ? 'bg-[#3B82F6] text-white'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              Diferenciado (Bus / Coche)
            </button>
            <button
              type="button"
              onClick={() => handlePricingModeChange('unified')}
              className={`rounded-lg py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                pricingMode === 'unified'
                  ? 'bg-[#3B82F6] text-white'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              Precio único
            </button>
          </div>

          {pricingMode === 'split' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-[#94A3B8]">Coche (€)</label>
                  {selectedTournament.customCarPrice != null && (
                    <button
                      type="button"
                      onClick={() => handleCustomPriceInput('customCarPrice', null)}
                      title="Restaurar automático"
                      className="text-[#3B82F6] hover:text-[#60A5FA] cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <PriceInput
                  value={
                    selectedTournament.customCarPrice != null
                      ? selectedTournament.customCarPrice
                      : fin.autoCarFee
                  }
                  onCommit={(val) => handleCustomPriceInput('customCarPrice', val)}
                  className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-sm text-[#F1F5F9] tabular-nums focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-[#94A3B8]">Bus (€)</label>
                  {selectedTournament.customBusPrice != null && (
                    <button
                      type="button"
                      onClick={() => handleCustomPriceInput('customBusPrice', null)}
                      title="Restaurar automático"
                      className="text-[#3B82F6] hover:text-[#60A5FA] cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <PriceInput
                  value={
                    selectedTournament.customBusPrice != null
                      ? selectedTournament.customBusPrice
                      : fin.autoBusFee
                  }
                  onCommit={(val) => handleCustomPriceInput('customBusPrice', val)}
                  className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-sm text-[#F1F5F9] tabular-nums focus:outline-none focus:border-[#3B82F6]"
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-[#94A3B8]">Precio único (€)</label>
                {selectedTournament.customUnifiedPrice != null && (
                  <button
                    type="button"
                    onClick={() => handleCustomPriceInput('customUnifiedPrice', null)}
                    className="flex items-center gap-1 text-[11px] font-medium text-[#3B82F6] hover:text-[#60A5FA] cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Restaurar</span>
                  </button>
                )}
              </div>
              <PriceInput
                value={
                  selectedTournament.customUnifiedPrice != null
                    ? selectedTournament.customUnifiedPrice
                    : fin.autoUnifiedFee
                }
                onCommit={(val) => handleCustomPriceInput('customUnifiedPrice', val)}
                className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-sm text-[#F1F5F9] tabular-nums focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          )}

          {/* Publish coach prices to normal view */}
          <button
            type="button"
            onClick={async () => {
              const nextPublished = !selectedTournament.publishCoachPrices
              await onUpdateTournament({
                ...selectedTournament,
                publishCoachPrices: nextPublished,
              })
              onShowToast?.(
                nextPublished ? 'Precios enviados a Torneos' : 'Vista normal en cálculo automático'
              )
            }}
            className={`w-full flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
              selectedTournament.publishCoachPrices
                ? 'bg-[#34D399]/15 border-[#34D399]/40 text-[#34D399]'
                : 'bg-[#3B82F6] border-[#3B82F6] text-white hover:bg-[#2563EB]'
            }`}
          >
            {selectedTournament.publishCoachPrices ? (
              <>
                <Check className="h-4 w-4" />
                <span>Visible en vista normal</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Enviar a vista normal</span>
              </>
            )}
          </button>
        </div>

        {/* Individual Player Price Overrides */}
        <div className="text-xs font-semibold text-[#94A3B8] pt-1">
          Cuotas individuales ({fin.totalCount})
        </div>

        {selectedTournament.participants.length === 0 ? (
          <div className="rounded-2xl border border-[#232938] bg-[#141821] p-6 text-center text-sm text-[#64748B]">
            Sin jugadores
          </div>
        ) : (
          <div className="rounded-2xl border border-[#232938] bg-[#141821] divide-y divide-[#232938]">
            {[...selectedTournament.participants]
              .sort((a, b) => {
                const pa = playerMap.get(a.playerId)
                const pb = playerMap.get(b.playerId)
                const nameA = pa ? `${pa.firstName} ${pa.lastName}`.trim() : (a.name ?? '')
                const nameB = pb ? `${pb.firstName} ${pb.lastName}`.trim() : (b.name ?? '')
                return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' })
              })
              .map((part) => {
              const player = playerMap.get(part.playerId)
              const displayName = player
                ? `${player.firstName} ${player.lastName}`.trim()
                : part.name?.trim() || 'Pasajero'
              const nameParts = displayName.split(/\s+/)
              const fee = getParticipantFee(part, selectedTournament, fin)
              const hasCustom = part.customPrice != null
              const isPassenger = part.role === 'passenger'

              return (
                <div
                  key={part.playerId}
                  className="flex items-center justify-between gap-2 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Avatar
                      firstName={player?.firstName ?? (nameParts[0] || '?')}
                      lastName={player?.lastName ?? (nameParts[1] || '')}
                      photoBase64={player?.photoBase64}
                      size="sm"
                    />
                    <span className="text-sm font-medium text-[#F1F5F9] truncate">
                      {displayName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleTransport(part.playerId)}
                      className={`rounded-lg border px-2 py-1 text-[11px] font-semibold cursor-pointer transition-colors ${
                        isPassenger
                          ? 'bg-[#A855F7]/15 border-[#A855F7]/40 text-[#C084FC]'
                          : part.transport === 'bus'
                            ? 'bg-[#3B82F6]/15 border-[#3B82F6]/40 text-[#60A5FA]'
                            : 'bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#FBBF24]'
                      }`}
                    >
                      {isPassenger ? 'Pasajero' : part.transport === 'bus' ? 'Bus' : 'Coche'}
                    </button>

                    <div className="flex items-center gap-1">
                      <PriceInput
                        value={fee}
                        onCommit={(val) => handleParticipantCustomPrice(part.playerId, val)}
                        className={`w-18 rounded-lg border bg-[#0B0D12] px-2 py-1 text-right text-xs font-semibold tabular-nums focus:outline-none focus:border-[#3B82F6] ${
                          hasCustom
                            ? 'border-[#3B82F6] text-[#3B82F6]'
                            : 'border-[#232938] text-[#F1F5F9]'
                        }`}
                      />
                      <span className="text-xs text-[#64748B]">€</span>
                    </div>

                    {hasCustom && (
                      <button
                        type="button"
                        onClick={() => handleResetParticipantPrice(part.playerId)}
                        title="Restaurar precio general"
                        className="p-1 rounded-lg text-[#3B82F6] hover:bg-[#0B0D12] cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Comentarios privados del entrenador */}
        <div className="rounded-2xl border border-[#232938] bg-[#141821] p-3.5 space-y-2">
          <label className="block text-xs font-semibold text-[#94A3B8]">
            Comentarios del entrenador
          </label>
          <textarea
            rows={3}
            value={selectedTournament.coachNotes ?? ''}
            onChange={(e) =>
              onUpdateTournament({ ...selectedTournament, coachNotes: e.target.value })
            }
            placeholder="Comentarios privados..."
            className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6] resize-y"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9]">Entrenador</h1>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onChangePin}
            className="flex items-center gap-1.5 rounded-xl border border-[#232938] bg-[#141821] px-3 py-1.5 text-xs font-medium text-[#CBD5E1] hover:border-[#3B82F6] cursor-pointer"
          >
            <KeyRound className="h-3.5 w-3.5 text-[#3B82F6]" />
            <span>Cambiar PIN</span>
          </button>
          <button
            type="button"
            onClick={onExit}
            className="rounded-xl border border-[#232938] bg-[#141821] px-3 py-1.5 text-xs font-medium text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer"
          >
            Bloquear
          </button>
        </div>
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

      {/* Tournament List with Private Margin Badge */}
      {filteredTournaments.length === 0 ? (
        <div className="rounded-2xl border border-[#232938] bg-[#141821] p-8 text-center text-sm text-[#64748B]">
          Sin torneos
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTournaments.map((t) => {
            const { day, month, weekday } = formatDateBlock(t.date)
            const fin = calculateTournamentFees(t, true)
            const tournamentTeams = getTournamentTeams(t)

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className="w-full text-left rounded-2xl border border-[#232938] bg-[#141821] p-3.5 hover:border-[#334155] transition-colors cursor-pointer flex items-center gap-3.5"
              >
                <div className="w-13 h-14 shrink-0 rounded-xl bg-[#0B0D12] border border-[#232938] flex flex-col items-center justify-center">
                  <span className="text-lg font-bold leading-none text-[#F1F5F9] tabular-nums">{day}</span>
                  <span className="text-[11px] font-semibold tracking-wider text-[#94A3B8] mt-1">
                    {month}
                  </span>
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-[#F1F5F9] truncate">
                      {weekday ? `${weekday} — ${t.name}` : t.name}
                    </p>
                    <span
                      className={`text-xs font-bold tabular-nums shrink-0 ${
                        fin.margin >= 0 ? 'text-[#34D399]' : 'text-[#FB7185]'
                      }`}
                    >
                      {fin.margin >= 0 ? '+' : ''}
                      {formatMoney(fin.margin)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
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
                    <span className="text-[11px] text-[#94A3B8] tabular-nums shrink-0">
                      {fin.paidCount}/{fin.totalCount} pagados
                    </span>
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
