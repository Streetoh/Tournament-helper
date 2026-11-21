import { Camera, Check, Pencil, Plus, Search, Tags, Trash2, UserCheck, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Player, Team } from '../../types/models'
import { compressImageToBase64 } from '../../utils/imageCompression'
import { getTeamBadgeStyle, TEAM_COLORS } from '../../utils/teamColors'
import { Avatar } from '../Avatar'

interface TeamsViewProps {
  teams: Team[]
  players: Player[]
  onCreateTeam: (name: string, color: string) => Promise<void>
  onUpdateTeam: (id: string, name: string, color: string) => Promise<void>
  onDeleteTeam: (id: string) => Promise<void>
  onSavePlayer: (player: Omit<Player, 'id'> & { id?: string }) => Promise<void>
  onDeletePlayer: (id: string) => Promise<void>
  onUpdateTeamMembers: (teamId: string, selectedPlayerIds: Set<string>) => Promise<void>
  onTogglePlayerTeam: (playerId: string, teamId: string) => Promise<void>
}

export function TeamsView({
  teams,
  players,
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam,
  onSavePlayer,
  onDeletePlayer,
  onUpdateTeamMembers,
  onTogglePlayerTeam,
}: TeamsViewProps) {
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Team modal
  const [teamModal, setTeamModal] = useState<{ open: boolean; editing?: Team }>({ open: false })
  const [teamNameInput, setTeamNameInput] = useState('')
  const [teamColorInput, setTeamColorInput] = useState(TEAM_COLORS[0].hex)

  // Player modal
  const [playerModal, setPlayerModal] = useState<{ open: boolean; editing?: Player }>({ open: false })
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [photoBase64, setPhotoBase64] = useState<string | undefined>(undefined)
  const [playerTeamIds, setPlayerTeamIds] = useState<string[]>([])

  // Multi-select team members modal
  const [membersModalTeam, setMembersModalTeam] = useState<Team | null>(null)
  const [membersSearch, setMembersSearch] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())

  // Quick team selector for a single player
  const [quickTeamsPlayerId, setQuickTeamsPlayerId] = useState<string | null>(null)

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])
  const activeTeam = selectedTeamFilter !== 'all' ? teamMap.get(selectedTeamFilter) ?? null : null
  const quickTeamsPlayer = quickTeamsPlayerId
    ? players.find((p) => p.id === quickTeamsPlayerId) ?? null
    : null

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return players
      .filter((p) => (selectedTeamFilter === 'all' ? true : p.teamIds.includes(selectedTeamFilter)))
      .filter((p) => (q ? `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) : true))
      .sort((a, b) => a.firstName.localeCompare(b.firstName, 'es', { sensitivity: 'base' }))
  }, [players, selectedTeamFilter, search])

  const modalFilteredPlayers = useMemo(() => {
    const q = membersSearch.trim().toLowerCase()
    return [...players]
      .filter((p) => (q ? `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) : true))
      .sort((a, b) => a.firstName.localeCompare(b.firstName, 'es', { sensitivity: 'base' }))
  }, [players, membersSearch])

  const openNewTeam = () => {
    setTeamNameInput('')
    setTeamColorInput(TEAM_COLORS[teams.length % TEAM_COLORS.length].hex)
    setTeamModal({ open: true })
  }

  const openEditTeam = (team: Team) => {
    setTeamNameInput(team.name)
    setTeamColorInput(team.color || TEAM_COLORS[0].hex)
    setTeamModal({ open: true, editing: team })
  }

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamNameInput.trim()) return
    if (teamModal.editing) {
      await onUpdateTeam(teamModal.editing.id, teamNameInput.trim(), teamColorInput)
    } else {
      await onCreateTeam(teamNameInput.trim(), teamColorInput)
    }
    setTeamModal({ open: false })
  }

  const openManageMembers = (team: Team) => {
    setMembersSearch('')
    setSelectedMemberIds(
      new Set(players.filter((p) => p.teamIds.includes(team.id)).map((p) => p.id))
    )
    setMembersModalTeam(team)
  }

  const toggleMemberSelection = (playerId: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  const handleSaveMembers = async () => {
    if (!membersModalTeam) return
    await onUpdateTeamMembers(membersModalTeam.id, selectedMemberIds)
    setMembersModalTeam(null)
  }

  const openNewPlayer = () => {
    setFirstName('')
    setLastName('')
    setPhotoBase64(undefined)
    setPlayerTeamIds(selectedTeamFilter !== 'all' ? [selectedTeamFilter] : [])
    setPlayerModal({ open: true })
  }

  const openEditPlayer = (player: Player) => {
    setFirstName(player.firstName)
    setLastName(player.lastName)
    setPhotoBase64(player.photoBase64)
    setPlayerTeamIds(player.teamIds)
    setPlayerModal({ open: true, editing: player })
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImageToBase64(file, 150)
    setPhotoBase64(compressed)
  }

  const handleSubmitPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim()) return
    await onSavePlayer({
      id: playerModal.editing?.id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      photoBase64,
      teamIds: playerTeamIds,
    })
    setPlayerModal({ open: false })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-extrabold tracking-tight text-[#F5F5F0]">Equipos</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openNewTeam}
            className="rounded-xl border border-[#24242B] bg-[#1C1C21] px-3.5 min-h-[44px] text-xs font-bold text-[#F5F5F0] hover:border-[#32323C] active:scale-[0.98] cursor-pointer"
          >
            + Equipo
          </button>
          <button
            type="button"
            onClick={openNewPlayer}
            aria-label="Nuevo jugador"
            className="w-11 h-11 rounded-2xl bg-[#C8FF2E] text-[#0A0A0C] flex items-center justify-center hover:brightness-95 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-5 w-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Team Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedTeamFilter('all')}
          className={`shrink-0 rounded-xl px-3.5 min-h-[40px] text-xs font-bold border active:scale-[0.98] cursor-pointer ${
            selectedTeamFilter === 'all'
              ? 'bg-[#F5F5F0] border-[#F5F5F0] text-[#0A0A0C]'
              : 'bg-[#131316] border-[#24242B] text-[#9A9AA6]'
          }`}
        >
          Todos ({players.length})
        </button>

        {teams.map((team) => {
          const active = selectedTeamFilter === team.id
          const badgeStyle = getTeamBadgeStyle(team.color)
          return (
            <div key={team.id} className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => setSelectedTeamFilter(team.id)}
                style={active ? badgeStyle : undefined}
                className={`flex items-center gap-2 px-3.5 min-h-[40px] text-xs font-semibold border active:scale-[0.98] cursor-pointer ${
                  active
                    ? 'rounded-l-xl'
                    : 'rounded-xl bg-[#131316] border-[#24242B] text-[#9A9AA6] hover:text-[#F5F5F0]'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: team.color }}
                />
                <span>{team.name}</span>
              </button>
              {active && (
                <button
                  type="button"
                  onClick={() => openEditTeam(team)}
                  aria-label={`Editar ${team.name}`}
                  style={badgeStyle}
                  className="rounded-r-xl px-2.5 min-h-[40px] border border-l-0 flex items-center justify-center cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Search + Quick Manage Team Members */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-[#63636E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar jugador..."
            className="w-full h-11 rounded-xl bg-[#131316] border border-[#24242B] pl-10 pr-3 text-sm text-[#F5F5F0] placeholder-[#63636E] focus:outline-none focus:border-[#C8FF2E]"
          />
        </div>
        {activeTeam && (
          <button
            type="button"
            onClick={() => openManageMembers(activeTeam)}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-[#C8FF2E] px-3.5 h-11 text-xs font-bold text-[#0A0A0C] hover:brightness-95 active:scale-[0.98] cursor-pointer"
          >
            <UserCheck className="h-4 w-4" />
            <span>Gestionar</span>
          </button>
        )}
      </div>

      {/* Players Bento List */}
      {filteredPlayers.length === 0 ? (
        <div className="rounded-2xl border border-[#24242B] bg-[#131316] p-8 flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-[#63636E]">Sin jugadores</p>
          {activeTeam ? (
            <button
              type="button"
              onClick={() => openManageMembers(activeTeam)}
              className="rounded-xl bg-[#C8FF2E] px-4 min-h-[44px] text-sm font-bold text-[#0A0A0C] hover:brightness-95 cursor-pointer"
            >
              Añadir jugadores
            </button>
          ) : (
            <button
              type="button"
              onClick={openNewPlayer}
              className="rounded-xl bg-[#C8FF2E] px-4 min-h-[44px] text-sm font-bold text-[#0A0A0C] hover:brightness-95 cursor-pointer"
            >
              + Nuevo jugador
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#24242B] bg-[#131316] divide-y divide-[#24242B]">
          {filteredPlayers.map((player) => {
            const primaryTeam = player.teamIds.length > 0 ? teamMap.get(player.teamIds[0]) : undefined
            return (
              <div
                key={player.id}
                onClick={() => openEditPlayer(player)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openEditPlayer(player)
                  }
                }}
                className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left hover:bg-[#1C1C21]/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    firstName={player.firstName}
                    lastName={player.lastName}
                    photoBase64={player.photoBase64}
                    ringColor={primaryTeam?.color}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#F5F5F0] break-words">
                      {player.firstName} {player.lastName}
                    </p>
                    {player.teamIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {player.teamIds.map((tid) => {
                          const team = teamMap.get(tid)
                          if (!team) return null
                          return (
                            <span
                              key={tid}
                              style={getTeamBadgeStyle(team.color)}
                              className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold"
                            >
                              {team.name}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {teams.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setQuickTeamsPlayerId(player.id)
                      }}
                      aria-label="Asignar equipos"
                      className="min-h-[40px] min-w-[40px] rounded-xl text-[#9A9AA6] hover:text-[#C8FF2E] hover:bg-[#1C1C21] flex items-center justify-center cursor-pointer"
                    >
                      <Tags className="h-4 w-4" />
                    </button>
                  )}
                  <span className="min-h-[40px] min-w-[32px] flex items-center justify-center text-[#63636E]">
                    <Pencil className="h-4 w-4" />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Team Modal */}
      {teamModal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl bg-[#131316] border-t sm:border border-[#24242B]">
            <div className="sm:hidden flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#32323C]" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#24242B]">
              <h2 className="text-base font-bold text-[#F5F5F0]">
                {teamModal.editing ? 'Editar equipo' : 'Nuevo equipo'}
              </h2>
              <button
                type="button"
                onClick={() => setTeamModal({ open: false })}
                className="min-h-[40px] min-w-[40px] rounded-xl text-[#9A9AA6] hover:text-[#F5F5F0] flex items-center justify-center cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTeam} className="p-4 space-y-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div>
                <label className="block text-xs font-medium text-[#9A9AA6] mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={teamNameInput}
                  onChange={(e) => setTeamNameInput(e.target.value)}
                  placeholder="U12 Amarillo"
                  className="w-full h-11 rounded-xl bg-[#1C1C21] border border-[#24242B] px-3 text-sm text-[#F5F5F0] placeholder-[#63636E] focus:outline-none focus:border-[#C8FF2E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9A9AA6] mb-2">Color</label>
                <div className="flex flex-wrap gap-2.5">
                  {TEAM_COLORS.map((option) => {
                    const selected = teamColorInput.toLowerCase() === option.hex.toLowerCase()
                    return (
                      <button
                        key={option.hex}
                        type="button"
                        onClick={() => setTeamColorInput(option.hex)}
                        aria-label={option.name}
                        style={{ backgroundColor: option.hex }}
                        className={`h-8 w-8 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                          selected
                            ? 'ring-2 ring-[#F5F5F0] ring-offset-2 ring-offset-[#131316] scale-110'
                            : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        {selected && <Check className="h-4 w-4 text-[#0A0A0C] stroke-[3]" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                {teamModal.editing && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onDeleteTeam(teamModal.editing!.id)
                      if (selectedTeamFilter === teamModal.editing!.id) {
                        setSelectedTeamFilter('all')
                      }
                      setTeamModal({ open: false })
                    }}
                    className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/12 px-3.5 min-h-[44px] text-sm font-bold text-[#F43F5E] hover:bg-[#F43F5E]/20 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#C8FF2E] min-h-[44px] text-sm font-bold text-[#0A0A0C] hover:brightness-95 active:scale-[0.98] cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-Select Manage Team Members Modal */}
      {membersModalTeam && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-[#131316] border-t sm:border border-[#24242B] max-h-[90vh] flex flex-col">
            <div className="sm:hidden flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#32323C]" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#24242B]">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: membersModalTeam.color }}
                />
                <h2 className="text-base font-bold text-[#F5F5F0] truncate">
                  {membersModalTeam.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setMembersModalTeam(null)}
                className="min-h-[40px] min-w-[40px] rounded-xl text-[#9A9AA6] hover:text-[#F5F5F0] flex items-center justify-center cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-4 pt-3 pb-2 space-y-2">
              <div className="relative">
                <Search className="h-4 w-4 text-[#63636E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={membersSearch}
                  onChange={(e) => setMembersSearch(e.target.value)}
                  placeholder="Buscar jugador..."
                  className="w-full h-11 rounded-xl bg-[#1C1C21] border border-[#24242B] pl-10 pr-3 text-sm text-[#F5F5F0] placeholder-[#63636E] focus:outline-none focus:border-[#C8FF2E]"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-[#9A9AA6] tabular-nums px-0.5">
                <span>{selectedMemberIds.size} seleccionados</span>
                <span>{players.length} total</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-3">
              {modalFilteredPlayers.length === 0 ? (
                <p className="text-sm text-[#63636E] text-center py-6">Sin jugadores</p>
              ) : (
                <div className="divide-y divide-[#24242B] rounded-2xl border border-[#24242B] bg-[#1C1C21]">
                  {modalFilteredPlayers.map((player) => {
                    const checked = selectedMemberIds.has(player.id)
                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => toggleMemberSelection(player.id)}
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
            </div>

            <div className="flex gap-2.5 p-4 border-t border-[#24242B] pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setMembersModalTeam(null)}
                className="flex-1 rounded-xl border border-[#24242B] bg-[#1C1C21] min-h-[44px] text-sm font-semibold text-[#9A9AA6] hover:text-[#F5F5F0] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMembers}
                className="flex-1 rounded-xl bg-[#C8FF2E] min-h-[44px] text-sm font-bold text-[#0A0A0C] hover:brightness-95 active:scale-[0.98] cursor-pointer"
              >
                Guardar ({selectedMemberIds.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Team Assignment Selector per Player */}
      {quickTeamsPlayer && (
        <div
          onClick={() => setQuickTeamsPlayerId(null)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl bg-[#131316] border-t sm:border border-[#24242B]"
          >
            <div className="sm:hidden flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#32323C]" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#24242B]">
              <h2 className="text-sm font-bold text-[#F5F5F0] truncate">
                Equipos — {quickTeamsPlayer.firstName} {quickTeamsPlayer.lastName}
              </h2>
              <button
                type="button"
                onClick={() => setQuickTeamsPlayerId(null)}
                className="min-h-[40px] min-w-[40px] rounded-xl text-[#9A9AA6] hover:text-[#F5F5F0] flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 flex flex-wrap gap-2">
              {teams.map((team) => {
                const active = quickTeamsPlayer.teamIds.includes(team.id)
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => onTogglePlayerTeam(quickTeamsPlayer.id, team.id)}
                    style={active ? getTeamBadgeStyle(team.color) : undefined}
                    className={`flex items-center gap-1.5 rounded-xl px-3 min-h-[40px] text-xs font-semibold border active:scale-[0.97] cursor-pointer ${
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

            <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setQuickTeamsPlayerId(null)}
                className="w-full rounded-xl bg-[#C8FF2E] min-h-[44px] text-sm font-bold text-[#0A0A0C] hover:brightness-95 cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Modal */}
      {playerModal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-[#131316] border-t sm:border border-[#24242B]">
            <div className="sm:hidden flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#32323C]" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#24242B]">
              <h2 className="text-base font-bold text-[#F5F5F0]">
                {playerModal.editing ? 'Editar jugador' : 'Nuevo jugador'}
              </h2>
              <button
                type="button"
                onClick={() => setPlayerModal({ open: false })}
                className="min-h-[40px] min-w-[40px] rounded-xl text-[#9A9AA6] hover:text-[#F5F5F0] flex items-center justify-center cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitPlayer} className="p-4 space-y-3.5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-3">
                <Avatar firstName={firstName || '?'} lastName={lastName} photoBase64={photoBase64} size="lg" />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 rounded-xl border border-[#24242B] bg-[#1C1C21] px-3.5 min-h-[40px] text-xs font-semibold text-[#F5F5F0] hover:border-[#32323C] cursor-pointer">
                    <Camera className="h-4 w-4 text-[#C8FF2E]" />
                    <span>Foto</span>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                  {photoBase64 && (
                    <button
                      type="button"
                      onClick={() => setPhotoBase64(undefined)}
                      className="rounded-xl border border-[#24242B] bg-[#1C1C21] px-3 min-h-[40px] text-xs font-semibold text-[#9A9AA6] hover:text-[#F43F5E] cursor-pointer"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
              </div>

              {teams.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-[#9A9AA6] mb-1.5">Equipos</label>
                  <div className="flex flex-wrap gap-1.5">
                    {teams.map((team) => {
                      const active = playerTeamIds.includes(team.id)
                      return (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() =>
                            setPlayerTeamIds((prev) =>
                              active ? prev.filter((id) => id !== team.id) : [...prev, team.id]
                            )
                          }
                          style={active ? getTeamBadgeStyle(team.color) : undefined}
                          className={`flex items-center gap-1.5 rounded-xl px-3 min-h-[36px] text-xs font-semibold border cursor-pointer ${
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

              <div className="flex gap-2 pt-1">
                {playerModal.editing && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onDeletePlayer(playerModal.editing!.id)
                      setPlayerModal({ open: false })
                    }}
                    className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/12 px-3.5 min-h-[44px] text-sm font-bold text-[#F43F5E] hover:bg-[#F43F5E]/20 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#C8FF2E] min-h-[44px] text-sm font-bold text-[#0A0A0C] hover:brightness-95 active:scale-[0.98] cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
