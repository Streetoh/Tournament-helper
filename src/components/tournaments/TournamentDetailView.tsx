import {
  Banknote,
  Bus,
  Calendar,
  Car,
  Check,
  ChevronLeft,
  Copy,
  CreditCard,
  Euro,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { PaymentMethod, Player, Team, Tournament, TransportMode } from '../../types/models'
import {
  calculateTournamentFees,
  formatDateBlock,
  formatMoney,
  formatMoneyCompact,
  getParticipantFee,
} from '../../utils/calculations'
import { generateParentMessage } from '../../utils/clipboardTemplates'
import { getTeamBadgeStyle } from '../../utils/teamColors'
import { Avatar } from '../Avatar'
import { AddParticipantsModal } from './AddParticipantsModal'

interface TournamentDetailViewProps {
  tournament: Tournament
  teams: Team[]
  players: Player[]
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onUpdateTournament: (updated: Tournament) => Promise<void>
  onCreatePlayer: (firstName: string, lastName: string, teamIds: string[]) => Promise<Player>
  onShowToast: (msg: string) => void
}

export function TournamentDetailView({
  tournament,
  teams,
  players,
  onBack,
  onEdit,
  onDelete,
  onUpdateTournament,
  onCreatePlayer,
  onShowToast,
}: TournamentDetailViewProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null)
  const [copiedLang, setCopiedLang] = useState<'et' | 'en' | null>(null)
  const [revealedFees, setRevealedFees] = useState<Set<string>>(() => new Set())

  const toggleFeeReveal = (playerId: string) => {
    setRevealedFees((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])
  const tournamentTeams = useMemo(() => {
    const found = new Map<string, Team>()
    for (const part of tournament.participants) {
      const p = playerMap.get(part.playerId)
      if (!p) continue
      for (const tid of p.teamIds) {
        const team = teamMap.get(tid)
        if (team) found.set(team.id, team)
      }
    }
    return Array.from(found.values())
  }, [tournament.participants, playerMap, teamMap])

  const fin = useMemo(
    () => calculateTournamentFees(tournament, Boolean(tournament.publishCoachPrices)),
    [tournament]
  )
  const existingIds = useMemo(
    () => new Set(tournament.participants.map((p) => p.playerId)),
    [tournament.participants]
  )

  const sortedParticipants = useMemo(() => {
    return [...tournament.participants].sort((a, b) => {
      const pa = playerMap.get(a.playerId)
      const pb = playerMap.get(b.playerId)
      const nameA = pa ? `${pa.firstName} ${pa.lastName}`.trim() : (a.name ?? '')
      const nameB = pb ? `${pb.firstName} ${pb.lastName}`.trim() : (b.name ?? '')
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' })
    })
  }, [tournament.participants, playerMap])

  const progressPct =
    fin.expectedTotal > 0 ? Math.min(100, Math.round((fin.collectedTotal / fin.expectedTotal) * 100)) : 0
  const allPaid = fin.totalCount > 0 && fin.pendingCount === 0

  const handleCopy = async (lang: 'et' | 'en') => {
    const text = generateParentMessage(tournament, lang)
    try {
      await navigator.clipboard.writeText(text)
      setCopiedLang(lang)
      window.setTimeout(() => setCopiedLang((curr) => (curr === lang ? null : curr)), 1500)
      onShowToast(lang === 'et' ? 'Copiado (ET)' : 'Copiado (EN)')
    } catch {
      onShowToast('Error al copiar')
    }
  }

  const handleToggleTransport = async (playerId: string) => {
    const nextParticipants = tournament.participants.map((p) => {
      if (p.playerId !== playerId) return p
      const isDbPlayer = playerMap.has(p.playerId)
      if (!isDbPlayer) {
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
    await onUpdateTournament({ ...tournament, participants: nextParticipants })
  }

  const handleTogglePaid = async (playerId: string) => {
    const nextParticipants = tournament.participants.map((p) => {
      if (p.playerId !== playerId) return p
      const nextPaid = !p.paid
      return {
        ...p,
        paid: nextPaid,
        paymentMethod: nextPaid ? p.paymentMethod ?? 'cash' : undefined,
      }
    })
    await onUpdateTournament({ ...tournament, participants: nextParticipants })
  }

  const handleTogglePaymentMethod = async (playerId: string) => {
    const nextParticipants = tournament.participants.map((p) => {
      if (p.playerId !== playerId) return p
      const nextMethod: PaymentMethod = p.paymentMethod === 'cash' ? 'transfer' : 'cash'
      return { ...p, paid: true, paymentMethod: nextMethod }
    })
    await onUpdateTournament({ ...tournament, participants: nextParticipants })
  }

  const handleRemoveParticipant = async (playerId: string) => {
    const nextParticipants = tournament.participants.filter((p) => p.playerId !== playerId)
    await onUpdateTournament({ ...tournament, participants: nextParticipants })
  }

  const handleAddPlayers = async (playerIds: string[], transport: TransportMode) => {
    const added = playerIds
      .filter((id) => !existingIds.has(id))
      .map((playerId) => ({
        playerId,
        transport,
        paid: false,
      }))
    if (added.length === 0) return
    await onUpdateTournament({
      ...tournament,
      participants: [...tournament.participants, ...added],
    })
  }

  const handleCreateAndAddPlayer = async (
    firstName: string,
    lastName: string,
    teamIds: string[],
    transport: TransportMode
  ) => {
    const created = await onCreatePlayer(firstName, lastName, teamIds)
    await handleAddPlayers([created.id], transport)
  }

  const handleAddPassenger = async (name: string) => {
    await onUpdateTournament({
      ...tournament,
      participants: [
        ...tournament.participants,
        {
          playerId: crypto.randomUUID(),
          role: 'passenger',
          name,
          transport: 'bus',
          paid: false,
        },
      ],
    })
  }

  const formatParticipantName = (part: (typeof tournament.participants)[number], p?: Player): string => {
    if (p) return `${p.firstName} ${p.lastName}`.trim()
    return part.name?.trim() || 'Pasajero'
  }

  const dateBlock = formatDateBlock(tournament.date)
  const formattedDateLabel = dateBlock.weekday
    ? `${dateBlock.weekday}, ${Number(dateBlock.day)} ${dateBlock.month.charAt(0)}${dateBlock.month.slice(1).toLowerCase()}`
    : tournament.date

  return (
    <div className="space-y-3.5">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver"
            className="min-h-[44px] min-w-[44px] -ml-2 rounded-xl text-[#9A9AA6] hover:text-[#F5F5F0] hover:bg-[#131316] flex items-center justify-center active:scale-[0.98] transition-all cursor-pointer shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight text-[#F5F5F0]">{tournament.name}</h1>
          {tournamentTeams.map((team) => (
            <span
              key={team.id}
              style={getTeamBadgeStyle(team.color)}
              className="rounded-md border px-2 py-0.5 text-[11px] font-semibold shrink-0"
            >
              {team.name}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Editar torneo"
            className="min-h-[44px] min-w-[44px] rounded-xl text-[#9A9AA6] hover:text-[#F5F5F0] hover:bg-[#131316] flex items-center justify-center active:scale-[0.98] cursor-pointer"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {confirmDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/40 px-3 min-h-[38px] text-xs font-bold text-[#F43F5E] active:scale-[0.98] cursor-pointer"
            >
              Confirmar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Eliminar torneo"
              className="min-h-[44px] min-w-[44px] rounded-xl text-[#9A9AA6] hover:text-[#F43F5E] hover:bg-[#131316] flex items-center justify-center active:scale-[0.98] cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bento Logistics */}
      {(formattedDateLabel ||
        tournament.address ||
        tournament.busDepartureTime ||
        tournament.carArrivalTime ||
        tournament.tournamentCost > 0 ||
        tournament.busCost > 0 ||
        tournament.matchSchedule) && (
        <div className="rounded-2xl border border-[#24242B] bg-[#131316] p-4 space-y-2.5 text-xs">
          {(formattedDateLabel || tournament.address) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              {formattedDateLabel && (
                <div className="flex items-center gap-2 text-[#F5F5F0] font-medium">
                  <Calendar className="h-4 w-4 text-[#C8FF2E] shrink-0" />
                  <span className="tabular-nums">{formattedDateLabel}</span>
                </div>
              )}
              {tournament.address && (
                <div className="flex items-center gap-2 text-[#F5F5F0]">
                  <MapPin className="h-4 w-4 text-[#F43F5E] shrink-0" />
                  <span>{tournament.address}</span>
                </div>
              )}
            </div>
          )}

          {(tournament.busDepartureTime || tournament.carArrivalTime) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[#9A9AA6]">
              {tournament.busDepartureTime && (
                <div className="flex items-center gap-2">
                  <Bus className="h-4 w-4 text-[#38BDF8] shrink-0" />
                  <span className="tabular-nums">Bus — {tournament.busDepartureTime}</span>
                </div>
              )}
              {tournament.carArrivalTime && (
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-[#F59E0B] shrink-0" />
                  <span className="tabular-nums">Coche — {tournament.carArrivalTime}</span>
                </div>
              )}
            </div>
          )}

          {(tournament.tournamentCost > 0 || tournament.busCost > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-2.5 border-t border-[#24242B] text-[#9A9AA6]">
              {tournament.tournamentCost > 0 && (
                <div className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-[#22C55E] shrink-0" />
                  <span className="tabular-nums">
                    Inscripción: <strong className="text-[#F5F5F0] font-mono">{formatMoneyCompact(tournament.tournamentCost)}</strong>
                  </span>
                </div>
              )}
              {tournament.busCost > 0 && (
                <div className="flex items-center gap-2">
                  <Bus className="h-4 w-4 text-[#38BDF8] shrink-0" />
                  <span className="tabular-nums">
                    Transporte: <strong className="text-[#F5F5F0] font-mono">{formatMoneyCompact(tournament.busCost)}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {tournament.matchSchedule && (
            <p className="text-[#9A9AA6] whitespace-pre-line pt-2.5 border-t border-[#24242B]">
              {tournament.matchSchedule}
            </p>
          )}
        </div>
      )}

      {/* Bento Financial */}
      <div className="rounded-2xl border border-[#24242B] bg-[#131316] p-4 space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="leading-tight tabular-nums">
              <span className="font-mono text-2xl font-bold text-[#C8FF2E]">
                {formatMoneyCompact(fin.collectedTotal)}
              </span>
              <span className="font-mono text-sm font-medium text-[#9A9AA6]">
                {' '}
                / {formatMoneyCompact(fin.expectedTotal)}
              </span>
            </div>
            <div className="text-[11px] font-medium text-[#9A9AA6] mt-0.5">recaudado</div>
          </div>

          <div className="text-right">
            <div className="font-mono text-lg font-bold leading-tight text-[#F43F5E] tabular-nums">
              {formatMoneyCompact(fin.pendingTotal)}
            </div>
            <div className="text-[11px] font-medium text-[#F43F5E] mt-0.5">pendiente</div>
          </div>
        </div>

        <div className="h-2 w-full rounded-full bg-[#1C1C21] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              allPaid ? 'bg-[#22C55E]' : 'bg-[#C8FF2E]'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Copy ET / EN */}
      <div className="grid grid-cols-2 gap-2.5">
        {(
          [
            ['et', 'ET', 'Copiar ET'],
            ['en', 'EN', 'Copiar EN'],
          ] as const
        ).map(([lang, code, label]) => {
          const isCopied = copiedLang === lang
          return (
            <button
              key={lang}
              type="button"
              onClick={() => handleCopy(lang)}
              className={`flex items-center justify-center gap-2 rounded-xl border min-h-[44px] text-xs font-bold active:scale-[0.98] transition-all cursor-pointer ${
                isCopied
                  ? 'bg-[#C8FF2E] border-[#C8FF2E] text-[#0A0A0C]'
                  : 'bg-[#1C1C21] border-[#24242B] text-[#F5F5F0] hover:border-[#32323C]'
              }`}
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#131316] border border-[#24242B] text-[#9A9AA6]">
                    {code}
                  </span>
                  <Copy className="h-3.5 w-3.5 text-[#9A9AA6]" />
                  <span>{label}</span>
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* Players Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-[#F5F5F0]">
            Jugadores <span className="font-mono text-[#9A9AA6] tabular-nums">({fin.playerCount})</span>
          </h2>
          {fin.passengerCount > 0 && (
            <span className="rounded-md bg-[#A855F7]/15 border border-[#A855F7]/30 px-2 py-0.5 text-[11px] font-semibold text-[#C084FC] tabular-nums">
              +{fin.passengerCount} pasaj.
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-[#C8FF2E] px-3.5 min-h-[40px] text-xs font-bold text-[#0A0A0C] hover:brightness-95 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Añadir</span>
        </button>
      </div>

      {/* Participants 2-Line Bento List */}
      {tournament.participants.length === 0 ? (
        <div className="rounded-2xl border border-[#24242B] bg-[#131316] p-6 flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-[#63636E]">Sin jugadores</p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="rounded-xl bg-[#C8FF2E] px-4 min-h-[44px] text-xs font-bold text-[#0A0A0C] hover:brightness-95 active:scale-[0.98] cursor-pointer"
          >
            + Añadir jugadores
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#24242B] bg-[#131316] divide-y divide-[#24242B]">
          {sortedParticipants.map((part) => {
            const player = playerMap.get(part.playerId)
            const displayName = formatParticipantName(part, player)
            const nameParts = displayName.split(/\s+/)
            const fee = getParticipantFee(part, tournament, fin)
            const isPassenger = part.role === 'passenger'
            const isRevealed = revealedFees.has(part.playerId)

            return (
              <div key={part.playerId} className="flex items-start gap-3 px-3.5 py-3">
                <Avatar
                  firstName={player?.firstName ?? (nameParts[0] || '?')}
                  lastName={player?.lastName ?? (nameParts[1] || '')}
                  photoBase64={player?.photoBase64}
                  size="md"
                />

                <div className="flex-1 min-w-0 space-y-2">
                  {/* Line 1: Full Name + Fee */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="text-sm font-semibold text-[#F5F5F0] leading-snug break-words">
                        {displayName}
                      </span>
                      {isPassenger && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-[#A855F7]/15 border border-[#A855F7]/30 text-[#C084FC]">
                          Pasajero
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFeeReveal(part.playerId)}
                      aria-label={isRevealed ? 'Ocultar importe' : 'Mostrar importe'}
                      className={`font-mono font-bold text-[15px] text-[#F5F5F0] tabular-nums shrink-0 px-1.5 py-0.5 -mr-1.5 rounded-lg transition-all cursor-pointer ${
                        isRevealed ? '' : 'blur-[6px] select-none'
                      }`}
                    >
                      {formatMoney(fee)}
                    </button>
                  </div>

                  {/* Line 2: Touch Controls */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
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

                      {part.paid ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleTogglePaymentMethod(part.playerId)}
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/12 px-3 min-h-[36px] text-[11px] font-bold text-[#22C55E] hover:bg-[#22C55E]/20 active:scale-[0.97] cursor-pointer"
                          >
                            {part.paymentMethod === 'cash' ? (
                              <>
                                <Banknote className="h-3.5 w-3.5 shrink-0" />
                                <span>Efectivo</span>
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-3.5 w-3.5 shrink-0" />
                                <span>Transferencia</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTogglePaid(part.playerId)}
                            title="Marcar pendiente"
                            className="min-h-[36px] min-w-[36px] rounded-xl text-[#63636E] hover:text-[#F43F5E] flex items-center justify-center active:scale-[0.95] cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleTogglePaid(part.playerId)}
                          className="whitespace-nowrap rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/12 px-3 min-h-[36px] text-[11px] font-bold text-[#F43F5E] hover:bg-[#F43F5E]/20 active:scale-[0.97] cursor-pointer"
                        >
                          Pendiente
                        </button>
                      )}
                    </div>

                    {!part.paid && (
                      <button
                        type="button"
                        onClick={() => setConfirmRemove({ id: part.playerId, name: displayName })}
                        title="Quitar"
                        className="min-h-[36px] min-w-[36px] rounded-xl text-[#63636E] hover:text-[#F43F5E] flex items-center justify-center active:scale-[0.95] cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Comentarios */}
      <div className="rounded-2xl border border-[#24242B] bg-[#131316] p-4 space-y-2">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#63636E]">
          Comentarios
        </label>
        <textarea
          rows={3}
          value={tournament.notes ?? ''}
          onChange={(e) => onUpdateTournament({ ...tournament, notes: e.target.value })}
          placeholder="Comentarios..."
          className="w-full rounded-xl bg-[#1C1C21] border border-[#24242B] px-3 py-2.5 text-sm text-[#F5F5F0] placeholder-[#63636E] focus:outline-none focus:border-[#C8FF2E] resize-y"
        />
      </div>

      {confirmRemove && (
        <div
          onClick={() => setConfirmRemove(null)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl bg-[#131316] border-t sm:border border-[#24242B] p-4 space-y-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            <div className="sm:hidden flex justify-center -mt-1.5">
              <div className="w-10 h-1 rounded-full bg-[#32323C]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#F5F5F0]">Quitar participante</h3>
              <p className="text-sm text-[#9A9AA6]">
                ¿Quitar a <strong className="text-[#F5F5F0]">{confirmRemove.name}</strong> de este torneo?
              </p>
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmRemove(null)}
                className="flex-1 rounded-xl border border-[#24242B] bg-[#1C1C21] min-h-[44px] text-sm font-semibold text-[#9A9AA6] hover:text-[#F5F5F0] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleRemoveParticipant(confirmRemove.id)
                  setConfirmRemove(null)
                }}
                className="flex-1 rounded-xl bg-[#F43F5E] min-h-[44px] text-sm font-bold text-white hover:brightness-95 active:scale-[0.98] cursor-pointer"
              >
                Quitar
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddParticipantsModal
          teams={teams}
          players={players}
          existingPlayerIds={existingIds}
          onClose={() => setShowAddModal(false)}
          onAddPlayers={handleAddPlayers}
          onCreateAndAddPlayer={handleCreateAndAddPlayer}
          onAddPassenger={handleAddPassenger}
        />
      )}
    </div>
  )
}
