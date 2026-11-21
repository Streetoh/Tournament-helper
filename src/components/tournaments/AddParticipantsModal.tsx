import { Bus, Car, Check, Search, X } from 'lucide-react'
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
  onCreateAndAddPlayer: (
    firstName: string,
    lastName: string,
    teamIds: string[],
    transport: TransportMode
  ) => Promise<void>
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

  // Multi player mode
  const [search, setSearch] = useState('')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())
  const availablePlayers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return players
      .filter((p) => !existingPlayerIds.has(p.id))
      .filter((p) => (q ? `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) : true))
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-[#131316] border-t sm:border border-[#24242B] max-h-[90vh] flex flex-col">
        {/* Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#32323C]" />
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-b border-[#24242B]">
          <h2 className="text-base font-bold text-[#F5F5F0]">Añadir participantes</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-xl text-[#9A9AA6] hover:text-[#F5F5F0] flex items-center justify-center cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode tabs + Default transport */}
        <div className="px-4 pt-3 space-y-3">
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-[#1C1C21] p-1 border border-[#24242B]">
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
                className={`rounded-lg min-h-[36px] text-xs transition-all active:scale-[0.98] cursor-pointer ${
                  mode === key
                    ? 'bg-[#C8FF2E] text-[#0A0A0C] font-bold'
                    : 'text-[#9A9AA6] font-medium hover:text-[#F5F5F0]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode !== 'passenger' && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9A9AA6] font-medium">Transporte inicial</span>
              <div className="flex gap-2">
                {(['car', 'bus'] as const).map((t) => {
                  const active = transport === t
                  const activeStyle =
                    t === 'bus'
                      ? 'bg-[#38BDF8]/15 border-[#38BDF8]/40 text-[#38BDF8]'
                      : 'bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#F59E0B]'
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTransport(t)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 min-h-[36px] text-xs font-bold border active:scale-[0.98] cursor-pointer ${
                        active ? activeStyle : 'bg-[#1C1C21] border-[#24242B] text-[#9A9AA6]'
                      }`}
                    >
                      {t === 'bus' ? <Bus className="h-3.5 w-3.5" /> : <Car className="h-3.5 w-3.5" />}
                      <span>{t === 'bus' ? 'Bus' : 'Coche'}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {mode === 'team' && (
            <div className="space-y-3">
              {teams.length === 0 ? (
                <p className="text-sm text-[#63636E] text-center py-6">Sin equipos</p>
              ) : (
                <>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => {
                      setSelectedTeamId(e.target.value)
                      setUncheckedIds(new Set())
                    }}
                    className="w-full h-11 rounded-xl bg-[#1C1C21] border border-[#24242B] px-3 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#C8FF2E]"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>

                  {teamPlayers.length === 0 ? (
                    <p className="text-sm text-[#63636E] text-center py-6">
                      Sin jugadores disponibles
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-xs px-0.5">
                        <span className="text-[#9A9AA6] tabular-nums">
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
                          className="font-bold text-[#C8FF2E] hover:brightness-90 cursor-pointer"
                        >
                          {uncheckedIds.size === 0 ? 'Desmarcar todos' : 'Marcar todos'}
                        </button>
                      </div>

                      <div className="divide-y divide-[#24242B] rounded-2xl border border-[#24242B] bg-[#1C1C21]">
                        {teamPlayers.map((player) => {
                          const checked = !uncheckedIds.has(player.id)
                          return (
                            <button
                              key={player.id}
                              type="button"
                              onClick={() => toggleTeamPlayer(player.id)}
                              className="w-full flex items-center justify-between px-3.5 min-h-[48px] py-2 text-left hover:bg-[#24242B]/50 cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar
                                  firstName={player.firstName}
                                  lastName={player.lastName}
                                  photoBase64={player.photoBase64}
                                  size="sm"
                                />
                                <span className="text-sm font-medium text-[#F5F5F0]">
                                  {player.firstName} {player.lastName}
                                </span>
                              </div>
                              <span
                                className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                                  checked
                                    ? 'bg-[#C8FF2E] border-[#C8FF2E] text-[#0A0A0C]'
                                    : 'border-[#32323C] bg-[#131316]'
                                }`}
                              >
                                {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
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
                    className="w-full rounded-xl bg-[#C8FF2E] min-h-[44px] text-sm font-bold text-[#0A0A0C] hover:brightness-95 active:scale-[0.98] disabled:opacity-40 cursor-pointer"
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
                <Search className="h-4 w-4 text-[#63636E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar jugador..."
                  className="w-full h-11 rounded-xl bg-[#1C1C21] border border-[#24242B] pl-10 pr-3 text-sm text-[#F5F5F0] placeholder-[#63636E] focus:outline-none focus:border-[#C8FF2E]"
                />
              </div>

              {availablePlayers.length === 0 ? (
                <p className="text-sm text-[#63636E] text-center py-6">Sin jugadores disponibles</p>
              ) : (
                <div className="divide-y divide-[#24242B] rounded-2xl border border-[#24242B] bg-[#1C1C21]">
                  {availablePlayers.map((player) => {
                    const checked = selectedPlayerIds.has(player.id)
                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => toggleSelectedPlayer(player.id)}
                        className={`w-full flex items-center justify-between px-3.5 min-h-[48px] py-2 text-left transition-colors cursor-pointer ${
                          checked ? 'bg-[#C8FF2E]/8' : 'hover:bg-[#24242B]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            firstName={player.firstName}
                            lastName={player.lastName}
                            photoBase64={player.photoBase64}
                            size="sm"
                          />
                          <span className="text-sm font-medium text-[#F5F5F0]">
                            {player.firstName} {player.lastName}
                          </span>
                        </div>
                        <span
                          className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                            checked
                              ? 'bg-[#C8FF2E] border-[#C8FF2E] text-[#0A0A0C]'
                              : 'border-[#32323C] bg-[#131316]'
                          }`}
                        >
                          {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
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
                className="w-full rounded-xl bg-[#C8FF2E] min-h-[44px] text-sm font-bold text-[#0A0A0C] hover:brightness-95 active:scale-[0.98] disabled:opacity-40 cursor-pointer"
              >
                Añadir ({selectedPlayerIds.size})
              </button>
            </div>
          )}

          {mode === 'new' && (
            <form onSubmit={handleCreateNew} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#9A9AA6] mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Nombre"
                  className="w-full h-11 rounded-xl bg-[#1C1C21] border border-[#24242B] px-3 text-sm text-[#F5F5F0] placeholder-[#63636E] focus:outline-none focus:border-[#C8FF2E]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9A9AA6] mb-1">Apellidos</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Apellidos"
                  className="w-full h-11 rounded-xl bg-[#1C1C21] border border-[#24242B] px-3 text-sm text-[#F5F5F0] placeholder-[#63636E] focus:outline-none focus:border-[#C8FF2E]"
                />
              </div>

              {teams.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-[#9A9AA6] mb-1.5">Equipos</label>
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
                          className={`flex items-center gap-1.5 rounded-lg px-2.5 min-h-[36px] text-xs font-semibold border cursor-pointer ${
                            active ? '' : 'bg-[#1C1C21] border-[#24242B] text-[#9A9AA6]'
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
                className="w-full rounded-xl bg-[#C8FF2E] min-h-[44px] text-sm font-bold text-[#0A0A0C] hover:brightness-95 active:scale-[0.98] cursor-pointer"
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
                <label className="block text-xs font-medium text-[#9A9AA6] mb-1">
                  Nombre del pasajero
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  placeholder="Padre de..."
                  className="w-full h-11 rounded-xl bg-[#1C1C21] border border-[#24242B] px-3 text-sm text-[#F5F5F0] placeholder-[#63636E] focus:outline-none focus:border-[#C8FF2E]"
                />
              </div>

              {addedPassengersCount > 0 && (
                <p className="text-xs font-semibold text-[#22C55E] tabular-nums">
                  {addedPassengersCount}{' '}
                  {addedPassengersCount === 1 ? 'pasajero añadido' : 'pasajeros añadidos'}
                </p>
              )}

              <div className="flex gap-2.5">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#C8FF2E] min-h-[44px] text-sm font-bold text-[#0A0A0C] hover:brightness-95 active:scale-[0.98] cursor-pointer"
                >
                  Añadir pasajero
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[#24242B] bg-[#1C1C21] px-4 min-h-[44px] text-sm font-semibold text-[#F5F5F0] cursor-pointer"
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
