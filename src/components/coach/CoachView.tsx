import { Bus, Car, Check, ChevronLeft, KeyRound, Lock, RotateCcw, Send } from 'lucide-react'
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
              className="min-h-[44px] min-w-[44px] -ml-2 rounded-xl text-[#9A9AA6] hover:text-[#F5F5F0] hover:bg-[#131316] flex items-center justify-center cursor-pointer shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-md bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F59E0B]">
                Modo privado
              </span>
              <h1 className="text-lg font-extrabold text-[#F5F5F0] truncate">
                {selectedTournament.name}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/12 px-3 min-h-[40px] text-xs font-bold text-[#F59E0B] hover:bg-[#F59E0B]/20 active:scale-[0.98] cursor-pointer shrink-0"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Bloquear</span>
          </button>
        </div>

        {/* Bento 3-Column Financial Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-[#24242B] bg-[#131316] p-3">
            <div className="text-[11px] font-medium text-[#9A9AA6]">Coste real</div>
            <div className="font-mono text-sm font-bold text-[#F5F5F0] tabular-nums mt-1">
              {formatMoney(fin.totalCost)}
            </div>
          </div>

          <div className="rounded-2xl border border-[#24242B] bg-[#131316] p-3">
            <div className="text-[11px] font-medium text-[#9A9AA6]">A cobrar</div>
            <div className="font-mono text-sm font-bold text-[#F5F5F0] tabular-nums mt-1">
              {formatMoney(fin.expectedTotal)}
            </div>
          </div>

          <div
            className={`rounded-2xl border p-3 ${
              fin.margin >= 0
                ? 'bg-[#22C55E]/10 border-[#22C55E]/30'
                : 'bg-[#F43F5E]/10 border-[#F43F5E]/30'
            }`}
          >
            <div
              className={`text-[11px] font-bold ${
                fin.margin >= 0 ? 'text-[#22C55E]' : 'text-[#F43F5E]'
              }`}
            >
              Margen
            </div>
            <div
              className={`font-mono text-sm font-bold tabular-nums mt-1 ${
                fin.margin >= 0 ? 'text-[#22C55E]' : 'text-[#F43F5E]'
              }`}
            >
              {fin.margin >= 0 ? '+' : ''}
              {formatMoney(fin.margin)}
            </div>
          </div>
        </div>

        {/* Real Costs Bento */}
        <div className="rounded-2xl border border-[#24242B] bg-[#131316] p-3.5 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[#9A9AA6] mb-1">
              Inscripción real (€)
            </label>
            <div className="flex items-center gap-1.5">
              <PriceInput
                value={
                  selectedTournament.realTournamentCost != null
                    ? selectedTournament.realTournamentCost
                    : selectedTournament.tournamentCost
                }
                onCommit={(val) => handleRealCostInput('realTournamentCost', val)}
                className={`w-full h-11 rounded-xl bg-[#1C1C21] border px-3 font-mono text-sm font-semibold tabular-nums focus:outline-none focus:border-[#C8FF2E] ${
                  selectedTournament.realTournamentCost != null
                    ? 'border-[#C8FF2E] text-[#C8FF2E]'
                    : 'border-[#24242B] text-[#F5F5F0]'
                }`}
              />
              {selectedTournament.realTournamentCost != null && (
                <button
                  type="button"
                  onClick={() => handleRealCostInput('realTournamentCost', null)}
                  title="Restaurar coste nominal"
                  className="min-h-[40px] min-w-[36px] rounded-xl bg-[#1C1C21] border border-[#24242B] text-[#C8FF2E] flex items-center justify-center cursor-pointer shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#9A9AA6] mb-1">
              Autobús real (€)
            </label>
            <div className="flex items-center gap-1.5">
              <PriceInput
                value={
                  selectedTournament.realBusCost != null
                    ? selectedTournament.realBusCost
                    : selectedTournament.busCost
                }
                onCommit={(val) => handleRealCostInput('realBusCost', val)}
                className={`w-full h-11 rounded-xl bg-[#1C1C21] border px-3 font-mono text-sm font-semibold tabular-nums focus:outline-none focus:border-[#C8FF2E] ${
                  selectedTournament.realBusCost != null
                    ? 'border-[#C8FF2E] text-[#C8FF2E]'
                    : 'border-[#24242B] text-[#F5F5F0]'
                }`}
              />
              {selectedTournament.realBusCost != null && (
                <button
                  type="button"
                  onClick={() => handleRealCostInput('realBusCost', null)}
                  title="Restaurar coste nominal"
                  className="min-h-[40px] min-w-[36px] rounded-xl bg-[#1C1C21] border border-[#24242B] text-[#C8FF2E] flex items-center justify-center cursor-pointer shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pricing Mode & Visibility */}
        <div className="rounded-2xl border border-[#24242B] bg-[#131316] p-3.5 space-y-3">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#1C1C21] p-1 border border-[#24242B]">
            <button
              type="button"
              onClick={() => handlePricingModeChange('split')}
              className={`rounded-lg min-h-[38px] text-xs transition-all cursor-pointer ${
                pricingMode === 'split'
                  ? 'bg-[#C8FF2E] text-[#0A0A0C] font-bold'
                  : 'text-[#9A9AA6] font-medium hover:text-[#F5F5F0]'
              }`}
            >
              Diferenciado
            </button>
            <button
              type="button"
              onClick={() => handlePricingModeChange('unified')}
              className={`rounded-lg min-h-[38px] text-xs transition-all cursor-pointer ${
                pricingMode === 'unified'
                  ? 'bg-[#C8FF2E] text-[#0A0A0C] font-bold'
                  : 'text-[#9A9AA6] font-medium hover:text-[#F5F5F0]'
              }`}
            >
              Precio único
            </button>
          </div>

          {pricingMode === 'split' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#9A9AA6] mb-1">Coche (€)</label>
                <div className="flex items-center gap-1.5">
                  <PriceInput
                    value={
                      selectedTournament.customCarPrice != null
                        ? selectedTournament.customCarPrice
                        : fin.autoCarFee
                    }
                    onCommit={(val) => handleCustomPriceInput('customCarPrice', val)}
                    className={`w-full h-11 rounded-xl bg-[#1C1C21] border px-3 font-mono text-sm font-semibold tabular-nums focus:outline-none focus:border-[#C8FF2E] ${
                      selectedTournament.customCarPrice != null
                        ? 'border-[#C8FF2E] text-[#C8FF2E]'
                        : 'border-[#24242B] text-[#F5F5F0]'
                    }`}
                  />
                  {selectedTournament.customCarPrice != null && (
                    <button
                      type="button"
                      onClick={() => handleCustomPriceInput('customCarPrice', null)}
                      title="Restaurar automático"
                      className="min-h-[40px] min-w-[36px] rounded-xl bg-[#1C1C21] border border-[#24242B] text-[#C8FF2E] flex items-center justify-center cursor-pointer shrink-0"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#9A9AA6] mb-1">Bus (€)</label>
                <div className="flex items-center gap-1.5">
                  <PriceInput
                    value={
                      selectedTournament.customBusPrice != null
                        ? selectedTournament.customBusPrice
                        : fin.autoBusFee
                    }
                    onCommit={(val) => handleCustomPriceInput('customBusPrice', val)}
                    className={`w-full h-11 rounded-xl bg-[#1C1C21] border px-3 font-mono text-sm font-semibold tabular-nums focus:outline-none focus:border-[#C8FF2E] ${
                      selectedTournament.customBusPrice != null
                        ? 'border-[#C8FF2E] text-[#C8FF2E]'
                        : 'border-[#24242B] text-[#F5F5F0]'
                    }`}
                  />
                  {selectedTournament.customBusPrice != null && (
                    <button
                      type="button"
                      onClick={() => handleCustomPriceInput('customBusPrice', null)}
                      title="Restaurar automático"
                      className="min-h-[40px] min-w-[36px] rounded-xl bg-[#1C1C21] border border-[#24242B] text-[#C8FF2E] flex items-center justify-center cursor-pointer shrink-0"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-medium text-[#9A9AA6] mb-1">
                Precio único (€)
              </label>
              <div className="flex items-center gap-1.5">
                <PriceInput
                  value={
                    selectedTournament.customUnifiedPrice != null
                      ? selectedTournament.customUnifiedPrice
                      : fin.autoUnifiedFee
                  }
                  onCommit={(val) => handleCustomPriceInput('customUnifiedPrice', val)}
                  className={`w-full h-11 rounded-xl bg-[#1C1C21] border px-3 font-mono text-sm font-semibold tabular-nums focus:outline-none focus:border-[#C8FF2E] ${
                    selectedTournament.customUnifiedPrice != null
                      ? 'border-[#C8FF2E] text-[#C8FF2E]'
                      : 'border-[#24242B] text-[#F5F5F0]'
                  }`}
                />
                {selectedTournament.customUnifiedPrice != null && (
                  <button
                    type="button"
                    onClick={() => handleCustomPriceInput('customUnifiedPrice', null)}
                    title="Restaurar automático"
                    className="min-h-[40px] min-w-[36px] rounded-xl bg-[#1C1C21] border border-[#24242B] text-[#C8FF2E] flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
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
            className={`w-full flex items-center justify-center gap-2 rounded-xl border min-h-[44px] text-xs font-bold active:scale-[0.98] transition-all cursor-pointer ${
              selectedTournament.publishCoachPrices
                ? 'bg-[#22C55E]/15 border-[#22C55E]/35 text-[#22C55E]'
                : 'bg-[#C8FF2E] border-[#C8FF2E] text-[#0A0A0C]'
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
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#63636E] pt-1">
          Cuotas individuales ({fin.totalCount})
        </div>

        {selectedTournament.participants.length === 0 ? (
          <div className="rounded-2xl border border-[#24242B] bg-[#131316] p-6 text-center text-sm text-[#63636E]">
            Sin jugadores
          </div>
        ) : (
          <div className="rounded-2xl border border-[#24242B] bg-[#131316] divide-y divide-[#24242B]">
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
                  <div key={part.playerId} className="flex items-start gap-3 px-3.5 py-3">
                    <Avatar
                      firstName={player?.firstName ?? (nameParts[0] || '?')}
                      lastName={player?.lastName ?? (nameParts[1] || '')}
                      photoBase64={player?.photoBase64}
                      size="md"
                    />

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#F5F5F0] break-words">
                          {displayName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleTransport(part.playerId)}
                          className={`inline-flex items-center gap-1 rounded-xl border px-2.5 min-h-[36px] text-[11px] font-bold active:scale-[0.97] transition-all cursor-pointer ${
                            isPassenger
                              ? 'bg-[#A855F7]/15 border-[#A855F7]/35 text-[#C084FC]'
                              : part.transport === 'bus'
                                ? 'bg-[#38BDF8]/12 border-[#38BDF8]/30 text-[#38BDF8]'
                                : 'bg-[#F59E0B]/12 border-[#F59E0B]/30 text-[#F59E0B]'
                          }`}
                        >
                          {isPassenger ? (
                            <span>Pasajero</span>
                          ) : part.transport === 'bus' ? (
                            <>
                              <Bus className="h-3.5 w-3.5" />
                              <span>Bus</span>
                            </>
                          ) : (
                            <>
                              <Car className="h-3.5 w-3.5" />
                              <span>Coche</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1.5">
                          {hasCustom && (
                            <button
                              type="button"
                              onClick={() => handleResetParticipantPrice(part.playerId)}
                              title="Restaurar precio general"
                              className="min-h-[36px] min-w-[36px] rounded-xl bg-[#1C1C21] border border-[#24242B] text-[#C8FF2E] flex items-center justify-center cursor-pointer"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <PriceInput
                            value={fee}
                            onCommit={(val) => handleParticipantCustomPrice(part.playerId, val)}
                            className={`w-20 h-9 rounded-xl border bg-[#1C1C21] px-2.5 text-right font-mono text-xs font-bold tabular-nums focus:outline-none focus:border-[#C8FF2E] ${
                              hasCustom
                                ? 'border-[#C8FF2E] text-[#C8FF2E]'
                                : 'border-[#24242B] text-[#F5F5F0]'
                            }`}
                          />
                          <span className="font-mono text-xs text-[#9A9AA6]">€</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        {/* Comentarios privados del entrenador */}
        <div className="rounded-2xl border border-[#24242B] bg-[#131316] p-4 space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#63636E]">
            Comentarios del entrenador
          </label>
          <textarea
            rows={3}
            value={selectedTournament.coachNotes ?? ''}
            onChange={(e) =>
              onUpdateTournament({ ...selectedTournament, coachNotes: e.target.value })
            }
            placeholder="Comentarios privados..."
            className="w-full rounded-xl bg-[#1C1C21] border border-[#24242B] px-3 py-2.5 text-sm text-[#F5F5F0] placeholder-[#63636E] focus:outline-none focus:border-[#C8FF2E] resize-y"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1 rounded-md bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F59E0B]">
            Modo privado
          </span>
          <h1 className="text-[26px] font-extrabold tracking-tight text-[#F5F5F0]">Entrenador</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onChangePin}
            className="flex items-center gap-1.5 rounded-xl border border-[#24242B] bg-[#1C1C21] px-3 min-h-[40px] text-xs font-semibold text-[#F5F5F0] hover:border-[#32323C] cursor-pointer"
          >
            <KeyRound className="h-3.5 w-3.5 text-[#F59E0B]" />
            <span>PIN</span>
          </button>
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/12 px-3 min-h-[40px] text-xs font-bold text-[#F59E0B] hover:bg-[#F59E0B]/20 active:scale-[0.98] cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Bloquear</span>
          </button>
        </div>
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
              className={`rounded-lg min-h-[38px] text-xs transition-all cursor-pointer ${
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

      {/* Tournament List with Private Margin Badge */}
      {filteredTournaments.length === 0 ? (
        <div className="rounded-2xl border border-[#24242B] bg-[#131316] p-8 text-center text-sm text-[#63636E]">
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
                className="w-full text-left rounded-2xl border border-[#24242B] bg-[#131316] p-3.5 hover:border-[#32323C] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-3.5"
              >
                <div className="w-14 h-16 shrink-0 rounded-xl bg-[#1C1C21] border border-[#24242B] flex flex-col items-center justify-center">
                  <span className="font-mono text-xl font-bold leading-none text-[#F5F5F0] tabular-nums">
                    {day}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#F59E0B] mt-1">
                    {month}
                  </span>
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[#F5F5F0] truncate">
                      {weekday ? `${weekday} — ${t.name}` : t.name}
                    </p>
                    <span
                      className={`font-mono text-xs font-bold tabular-nums shrink-0 ${
                        fin.margin >= 0 ? 'text-[#22C55E]' : 'text-[#F43F5E]'
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
                          className="rounded-md border px-2 py-0.5 text-[11px] font-semibold truncate"
                        >
                          {team.name}
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] text-[#9A9AA6] tabular-nums shrink-0">
                      {fin.paidCount}/{fin.totalCount} pag.
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
