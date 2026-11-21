import { Check, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Player, Team, TransportMode } from '../../types/models'
import { getTeamBadgeStyle } from '../../utils/teamColors'
import { Avatar } from '../Avatar'

interface AddParticipantsModalProps {
  teams: Team[]
  players: Player[]
  existingPlayerIds: Set<string>
  onClose: () => void
  onAddPlayers: (playerIds: string[], transport: TransportMode) => void
  onCreateAndAddPlayer: (firstName: string, lastName: string, teamIds: string[], transport: TransportMode) => Promise<void>
  onAddPassenger: (name: string) => Promise<void>
}

export function AddParticipantsModal({
  teams,
  players,
  existingPlayerIds,
  onClose,
  onAddPlayers,
  onCreateAndAddPlayer,
  onAddPassenger,
}: AddParticipantsModalProps) {
  const [mode, setMode] = useState<'team' | 'player' | 'new' | 'passenger'>('team')
  const [transport, setTransport] = useState<TransportMode>('car')
  const [passengerName, setPassengerName] = useState('')
  const [addedPassengersCount, setAddedPassengersCount] = useState(0)

  // Team mode
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id ?? '')
  const teamPlayers = useMemo(
    () =>
      players
        .filter((p) => p.teamIds.includes(selectedTeamId) && !existingPlayerIds.has(p.id))
        .sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'es', {
            sensitivity: 'base',
          })
        ),
    [players, selectedTeamId, existingPlayerIds]
  )
  const [uncheckedIds, setUncheckedIds] = useState<Set<string>>(new Set())

  // Single/multi player mode
  const [search, setSearch] = useState('')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())
  const availablePlayers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return players
      .filter((p) => !existingPlayerIds.has(p.id))
      .filter((p) =>
        q ? `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) : true
      )
      .sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'es', {
          sensitivity: 'base',
        })
      )
  }, [players, existingPlayerIds, search])

  const toggleSelectedPlayer = (id: string) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirmPlayers = () => {
    if (selectedPlayerIds.size > 0) {
      onAddPlayers(Array.from(selectedPlayerIds), transport)
    }
    onClose()
  }

  // New player mode
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [newPlayerTeamIds, setNewPlayerTeamIds] = useState<string[]>([])

  const toggleTeamPlayer = (id: string) => {
    setUncheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirmTeam = () => {
    const toAdd = teamPlayers.filter((p) => !uncheckedIds.has(p.id)).map((p) => p.id)
    if (toAdd.length > 0) {
      onAddPlayers(toAdd, transport)
    }
    onClose()
  }

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim()) return
    await onCreateAndAddPlayer(firstName.trim(), lastName.trim(), newPlayerTeamIds, transport)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-[#141821] border border-[#232938] max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#232938]">
          <h2 className="text-base font-semibold text-[#F1F5F9]">Añadir participantes</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#F1F5F9] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode tabs + Default transport */}
        <div className="px-4 pt-3 space-y-3">
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-[#0B0D12] p-1 border border-[#232938]">
            {(
              [
                ['team', 'Equipo'],
                ['player', 'Jugador'],
                ['new', 'Nuevo'],
                ['passenger', 'Pasajero'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={`rounded-lg py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  mode === key ? 'bg-[#3B82F6] text-white' : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode !== 'passenger' && (
            <div className="flex items-center justify-between text-xs">
            <span className="text-[#94A3B8]">Transporte inicial</span>
            <div className="flex gap-1.5">
              {(['car', 'bus'] as const).map((t) => {
                const active = transport === t
                const activeStyle =
                  t === 'bus'
                    ? 'bg-[#3B82F6]/20 border-[#3B82F6] text-[#60A5FA]'
                    : 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#FBBF24]'
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTransport(t)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold border cursor-pointer ${
                      active
                        ? activeStyle
                        : 'bg-[#0B0D12] border-[#232938] text-[#94A3B8]'
                    }`}
                  >
                    {t === 'bus' ? 'Bus' : 'Coche'}
                  </button>
                )
              })}
            </div>
          </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {mode === 'team' && (
            <div className="space-y-3">
              {teams.length === 0 ? (
                <p className="text-sm text-[#64748B] text-center py-6">Sin equipos</p>
              ) : (
                <>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => {
                      setSelectedTeamId(e.target.value)
                      setUncheckedIds(new Set())
                    }}
                    className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>

                  {teamPlayers.length === 0 ? (
                    <p className="text-sm text-[#64748B] text-center py-6">Sin jugadores disponibles</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-xs px-0.5">
                        <span className="text-[#94A3B8] tabular-nums">
                          {teamPlayers.length - uncheckedIds.size}/{teamPlayers.length} seleccionados
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setUncheckedIds(
                              uncheckedIds.size === 0
                                ? new Set(teamPlayers.map((p) => p.id))
                                : new Set()
                            )
                          }
                          className="font-medium text-[#3B82F6] hover:text-[#60A5FA] cursor-pointer"
                        >
                          {uncheckedIds.size === 0 ? 'Desmarcar todos' : 'Marcar todos'}
                        </button>
                      </div>

                      <div className="divide-y divide-[#232938] rounded-xl border border-[#232938] bg-[#0B0D12]">
                      {teamPlayers.map((player) => {
                        const checked = !uncheckedIds.has(player.id)
                        return (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => toggleTeamPlayer(player.id)}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[#141821] cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar
                                firstName={player.firstName}
                                lastName={player.lastName}
                                photoBase64={player.photoBase64}
                                size="sm"
                              />
                              <span className="text-sm text-[#F1F5F9] truncate">
                                {player.firstName} {player.lastName}
                              </span>
                            </div>
                            <span
                              className={`h-5 w-5 rounded-md border flex items-center justify-center ${
                                checked
                                  ? 'bg-[#3B82F6] border-[#3B82F6] text-white'
                                  : 'border-[#334155] bg-transparent'
                              }`}
                            >
                              {checked && <Check className="h-3.5 w-3.5" />}
                            </span>
                          </button>
                        )
                      })}
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    disabled={teamPlayers.filter((p) => !uncheckedIds.has(p.id)).length === 0}
                    onClick={handleConfirmTeam}
                    className="w-full rounded-xl bg-[#3B82F6] py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-40 cursor-pointer"
                  >
                    Añadir ({teamPlayers.filter((p) => !uncheckedIds.has(p.id)).length})
                  </button>
                </>
              )}
            </div>
          )}

          {mode === 'player' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="h-4 w-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar jugador..."
                  className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] pl-9 pr-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              {availablePlayers.length === 0 ? (
                <p className="text-sm text-[#64748B] text-center py-6">Sin jugadores disponibles</p>
              ) : (
                <div className="divide-y divide-[#232938] rounded-xl border border-[#232938] bg-[#0B0D12]">
                  {availablePlayers.map((player) => {
                    const checked = selectedPlayerIds.has(player.id)
                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => toggleSelectedPlayer(player.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors cursor-pointer ${
                          checked ? 'bg-[#3B82F6]/10' : 'hover:bg-[#141821]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            firstName={player.firstName}
                            lastName={player.lastName}
                            photoBase64={player.photoBase64}
                            size="sm"
                          />
                          <span className="text-sm text-[#F1F5F9] truncate">
                            {player.firstName} {player.lastName}
                          </span>
                        </div>
                        <span
                          className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                            checked
                              ? 'bg-[#3B82F6] border-[#3B82F6] text-white'
                              : 'border-[#334155] bg-transparent'
                          }`}
                        >
                          {checked && <Check className="h-3.5 w-3.5" />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              <button
                type="button"
                disabled={selectedPlayerIds.size === 0}
                onClick={handleConfirmPlayers}
                className="w-full rounded-xl bg-[#3B82F6] py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-40 cursor-pointer"
              >
                Añadir ({selectedPlayerIds.size})
              </button>
            </div>
          )}

          {mode === 'new' && (
            <form onSubmit={handleCreateNew} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Nombre"
                  className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">Apellidos</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Apellidos"
                  className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              {teams.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Equipos</label>
                  <div className="flex flex-wrap gap-1.5">
                    {teams.map((team) => {
                      const active = newPlayerTeamIds.includes(team.id)
                      return (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() =>
                            setNewPlayerTeamIds((prev) =>
                              active ? prev.filter((id) => id !== team.id) : [...prev, team.id]
                            )
                          }
                          style={active ? getTeamBadgeStyle(team.color) : undefined}
                          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border cursor-pointer ${
                            active ? '' : 'bg-[#0B0D12] border-[#232938] text-[#94A3B8]'
                          }`}
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: team.color }}
                          />
                          <span>{team.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-[#3B82F6] py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] cursor-pointer"
              >
                Crear y añadir
              </button>
            </form>
          )}

          {mode === 'passenger' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!passengerName.trim()) return
                await onAddPassenger(passengerName.trim())
                setPassengerName('')
                setAddedPassengersCount((c) => c + 1)
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                  Nombre del pasajero
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  placeholder="Padre de..."
                  className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              {addedPassengersCount > 0 && (
                <p className="text-xs text-[#34D399] tabular-nums">
                  {addedPassengersCount} {addedPassengersCount === 1 ? 'pasajero añadido' : 'pasajeros añadidos'}
                </p>
              )}

              <div className="flex gap-2.5">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#3B82F6] py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] cursor-pointer"
                >
                  Añadir pasajero
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[#232938] bg-[#0B0D12] px-4 py-2.5 text-sm font-medium text-[#CBD5E1] hover:text-[#F1F5F9] cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
