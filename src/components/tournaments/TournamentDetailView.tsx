import {
  Banknote,
  Bus,
  Calendar,
  Car,
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

  const handleCopy = async (lang: 'et' | 'en') => {
    const text = generateParentMessage(tournament, lang)
    try {
      await navigator.clipboard.writeText(text)
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
            className="p-1.5 -ml-1.5 rounded-xl text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#141821] cursor-pointer shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-[#F1F5F9] truncate">{tournament.name}</h1>
          {tournamentTeams.map((team) => (
            <span
              key={team.id}
              style={getTeamBadgeStyle(team.color)}
              className="rounded-md border px-2 py-0.5 text-[11px] font-medium shrink-0"
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
            className="p-2 rounded-xl text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#141821] cursor-pointer"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {confirmDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg bg-[#FB7185]/20 border border-[#FB7185] px-2.5 py-1 text-xs font-semibold text-[#FB7185] cursor-pointer"
            >
              Confirmar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Eliminar torneo"
              className="p-2 rounded-xl text-[#94A3B8] hover:text-[#FB7185] hover:bg-[#141821] cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Logistics Card */}
      {(formattedDateLabel ||
        tournament.address ||
        tournament.busDepartureTime ||
        tournament.carArrivalTime ||
        tournament.tournamentCost > 0 ||
        tournament.busCost > 0 ||
        tournament.matchSchedule) && (
        <div className="rounded-2xl border border-[#232938] bg-[#141821] p-3.5 space-y-2.5 text-xs">
          {/* Fila 1: Fecha y Lugar */}
          {(formattedDateLabel || tournament.address) && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
              {formattedDateLabel && (
                <div className="flex items-center gap-1.5 text-[#E2E8F0]">
                  <Calendar className="h-4 w-4 text-[#3B82F6] shrink-0" />
                  <span>{formattedDateLabel}</span>
                </div>
              )}
              {tournament.address && (
                <div className="flex items-center gap-1.5 text-[#E2E8F0]">
                  <MapPin className="h-4 w-4 text-[#FB7185] shrink-0" />
                  <span>{tournament.address}</span>
                </div>
              )}
            </div>
          )}

          {/* Fila 2: Horarios Bus / Coche */}
          {(tournament.busDepartureTime || tournament.carArrivalTime) && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[#CBD5E1]">
              {tournament.busDepartureTime && (
                <div className="flex items-center gap-1.5">
                  <Bus className="h-4 w-4 text-[#3B82F6] shrink-0" />
                  <span className="tabular-nums">Bus — {tournament.busDepartureTime}</span>
                </div>
              )}
              {tournament.carArrivalTime && (
                <div className="flex items-center gap-1.5">
                  <Car className="h-4 w-4 text-[#F59E0B] shrink-0" />
                  <span className="tabular-nums">Coche — {tournament.carArrivalTime}</span>
                </div>
              )}
            </div>
          )}

          {/* Fila 3: Costes nominales */}
          {(tournament.tournamentCost > 0 || tournament.busCost > 0) && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-2 border-t border-[#232938]/70 text-[#CBD5E1]">
              {tournament.tournamentCost > 0 && (
                <div className="flex items-center gap-1.5">
                  <Euro className="h-4 w-4 text-[#34D399] shrink-0" />
                  <span className="tabular-nums">
                    Inscripción: {formatMoneyCompact(tournament.tournamentCost)}
                  </span>
                </div>
              )}
              {tournament.busCost > 0 && (
                <div className="flex items-center gap-1.5">
                  <Bus className="h-4 w-4 text-[#94A3B8] shrink-0" />
                  <span className="tabular-nums">
                    Transporte: {formatMoneyCompact(tournament.busCost)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Fila 4: Horario de partidos */}
          {tournament.matchSchedule && (
            <p className="text-[#94A3B8] whitespace-pre-line pt-2 border-t border-[#232938]/70">
              {tournament.matchSchedule}
            </p>
          )}
        </div>
      )}

      {/* Financial Card */}
      <div className="rounded-2xl border border-[#232938] bg-[#141821] p-3.5 space-y-2.5">
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-lg font-bold tabular-nums leading-tight">
              <span className="text-[#34D399]">{formatMoneyCompact(fin.collectedTotal)}</span>
              <span className="text-[#64748B] font-medium"> / {formatMoneyCompact(fin.expectedTotal)}</span>
            </div>
            <div className="text-[11px] text-[#34D399]">recaudado</div>
          </div>

          <div className="text-right">
            <div className="text-lg font-bold tabular-nums leading-tight text-[#FB7185]">
              {formatMoneyCompact(fin.pendingTotal)}
            </div>
            <div className="text-[11px] text-[#FB7185]">pendiente</div>
          </div>
        </div>

        <div className="h-1.5 w-full rounded-full bg-[#1F2433] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#34D399] transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Copy ET / EN */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => handleCopy('et')}
          className="flex items-center justify-center gap-2 rounded-xl border border-[#232938] bg-[#141821] py-2.5 text-xs font-semibold text-[#E2E8F0] hover:border-[#3B82F6] transition-colors cursor-pointer"
        >
          <Copy className="h-3.5 w-3.5 text-[#94A3B8]" />
          <span>Copiar ET</span>
        </button>
        <button
          type="button"
          onClick={() => handleCopy('en')}
          className="flex items-center justify-center gap-2 rounded-xl border border-[#232938] bg-[#141821] py-2.5 text-xs font-semibold text-[#E2E8F0] hover:border-[#3B82F6] transition-colors cursor-pointer"
        >
          <Copy className="h-3.5 w-3.5 text-[#94A3B8]" />
          <span>Copiar EN</span>
        </button>
      </div>

      {/* Players Header */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-sm font-semibold text-[#F1F5F9]">
          Jugadores <span className="text-[#64748B] tabular-nums">({fin.playerCount})</span>
          {fin.passengerCount > 0 && (
            <span className="text-[#C084FC] text-xs font-medium tabular-nums ml-2">
              · {fin.passengerCount} {fin.passengerCount === 1 ? 'pasajero' : 'pasajeros'}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 rounded-lg bg-[#3B82F6] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2563EB] cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Añadir</span>
        </button>
      </div>

      {/* Participants List */}
      {tournament.participants.length === 0 ? (
        <div className="rounded-2xl border border-[#232938] bg-[#141821] p-6 flex flex-col items-center justify-center gap-2.5">
          <p className="text-sm text-[#64748B]">Sin jugadores</p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="rounded-xl bg-[#3B82F6] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2563EB] cursor-pointer"
          >
            + Añadir jugadores
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#232938] bg-[#141821] divide-y divide-[#232938]">
          {sortedParticipants.map((part) => {
            const player = playerMap.get(part.playerId)
            const displayName = formatParticipantName(part, player)
            const nameParts = displayName.split(/\s+/)
            const fee = getParticipantFee(part, tournament, fin)
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
                  {/* Transport / Role Pill */}
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

                  {/* Fee */}
                  <span className="text-xs font-semibold text-[#E2E8F0] tabular-nums w-14 text-right">
                    {formatMoney(fee)}
                  </span>

                  {/* Paid / Pending + Method */}
                  {part.paid ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTogglePaymentMethod(part.playerId)}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#34D399]/15 px-2.5 py-1 text-[11px] font-semibold text-[#34D399] hover:bg-[#34D399]/25 cursor-pointer"
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
                        className="rounded-full p-1 text-[#64748B] hover:text-[#FB7185] cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTogglePaid(part.playerId)}
                        className="whitespace-nowrap rounded-full bg-[#FB7185]/15 px-2.5 py-1 text-[11px] font-semibold text-[#FB7185] hover:bg-[#FB7185]/25 cursor-pointer"
                      >
                        Pendiente
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(part.playerId)}
                        title="Quitar"
                        className="rounded-full p-1 text-[#475569] hover:text-[#FB7185] cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
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

      {/* Comentarios */}
      <div className="rounded-2xl border border-[#232938] bg-[#141821] p-3.5 space-y-2">
        <label className="block text-xs font-semibold text-[#94A3B8]">Comentarios</label>
        <textarea
          rows={3}
          value={tournament.notes ?? ''}
          onChange={(e) => onUpdateTournament({ ...tournament, notes: e.target.value })}
          placeholder="Comentarios..."
          className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6] resize-y"
        />
      </div>
    </div>
  )
}
