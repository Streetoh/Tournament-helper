import { Camera, Check, Pencil, Plus, Search, Tags, Trash2, UserCheck, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Player, Team } from '../../types/models'
import { getTeamBadgeStyle, TEAM_COLORS } from '../../utils/teamColors'
import { compressImageToBase64 } from '../../utils/imageCompression'
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
      .sort((a, b) => a.firstName.localeCompare(b.firstName))
  }, [players, selectedTeamFilter, search])

  const modalFilteredPlayers = useMemo(() => {
    const q = membersSearch.trim().toLowerCase()
    return [...players]
      .filter((p) => (q ? `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) : true))
      .sort((a, b) => a.firstName.localeCompare(b.firstName))
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
        <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9]">Equipos</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openNewTeam}
            className="rounded-xl border border-[#232938] bg-[#141821] px-3 py-2 text-xs font-semibold text-[#E2E8F0] hover:border-[#3B82F6] cursor-pointer"
          >
            + Equipo
          </button>
          <button
            type="button"
            onClick={openNewPlayer}
            aria-label="Nuevo jugador"
            className="h-9 w-9 rounded-xl bg-[#3B82F6] text-white flex items-center justify-center hover:bg-[#2563EB] cursor-pointer"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Team Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedTeamFilter('all')}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium border cursor-pointer ${
            selectedTeamFilter === 'all'
              ? 'bg-[#3B82F6]/20 border-[#3B82F6] text-[#F1F5F9]'
              : 'bg-[#141821] border-[#232938] text-[#94A3B8]'
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
                className={`flex items-center gap-1.5 rounded-l-lg px-3 py-1.5 text-xs font-medium border cursor-pointer ${
                  active ? '' : 'bg-[#141821] border-[#232938] text-[#94A3B8]'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: team.color }}
                />
                <span>{team.name}</span>
              </button>
              <button
                type="button"
                onClick={() => openEditTeam(team)}
                aria-label={`Editar ${team.name}`}
                style={active ? badgeStyle : undefined}
                className={`rounded-r-lg px-2 py-1.5 border border-l-0 cursor-pointer ${
                  active ? '' : 'bg-[#141821] border-[#232938] text-[#64748B] hover:text-[#F1F5F9]'
                }`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Search + Quick Manage Team Members */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar jugador..."
            className="w-full rounded-xl bg-[#141821] border border-[#232938] pl-10 pr-3 py-2.5 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
          />
        </div>
        {activeTeam && (
          <button
            type="button"
            onClick={() => openManageMembers(activeTeam)}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-[#3B82F6] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#2563EB] cursor-pointer"
          >
            <UserCheck className="h-4 w-4" />
            <span>Gestionar</span>
          </button>
        )}
      </div>

      {/* Players List */}
      {filteredPlayers.length === 0 ? (
        <div className="rounded-2xl border border-[#232938] bg-[#141821] p-8 flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-[#64748B]">Sin jugadores</p>
          {activeTeam ? (
            <button
              type="button"
              onClick={() => openManageMembers(activeTeam)}
              className="rounded-xl bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB] cursor-pointer"
            >
              Añadir jugadores
            </button>
          ) : (
            <button
              type="button"
              onClick={openNewPlayer}
              className="rounded-xl bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB] cursor-pointer"
            >
              + Nuevo jugador
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#232938] bg-[#141821] divide-y divide-[#232938]">
          {filteredPlayers.map((player) => (
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
              className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-[#191F2B] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  firstName={player.firstName}
                  lastName={player.lastName}
                  photoBase64={player.photoBase64}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#F1F5F9] truncate">
                    {player.firstName} {player.lastName}
                  </p>
                  {player.teamIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {player.teamIds.map((tid) => {
                        const team = teamMap.get(tid)
                        if (!team) return null
                        return (
                          <span
                            key={tid}
                            style={getTeamBadgeStyle(team.color)}
                            className="rounded border px-1.5 py-0.5 text-[10px] font-medium"
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
                    className="p-2 rounded-lg text-[#64748B] hover:text-[#3B82F6] hover:bg-[#0B0D12] cursor-pointer"
                  >
                    <Tags className="h-4 w-4" />
                  </button>
                )}
                <Pencil className="h-4 w-4 text-[#475569]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team Modal (Create / Edit + Color Picker) */}
      {teamModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#141821] border border-[#232938]">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#232938]">
              <h2 className="text-base font-semibold text-[#F1F5F9]">
                {teamModal.editing ? 'Editar equipo' : 'Nuevo equipo'}
              </h2>
              <button
                type="button"
                onClick={() => setTeamModal({ open: false })}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#F1F5F9] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTeam} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={teamNameInput}
                  onChange={(e) => setTeamNameInput(e.target.value)}
                  placeholder="U12 Amarillo"
                  className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2.5 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-2">Color</label>
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
                        className={`h-7 w-7 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                          selected
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-[#141821] scale-110'
                            : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        {selected && <Check className="h-3.5 w-3.5 text-[#0B0D12] stroke-[3]" />}
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
                    className="rounded-xl border border-[#FB7185]/40 bg-[#FB7185]/10 px-3 py-2.5 text-sm font-medium text-[#FB7185] hover:bg-[#FB7185]/20 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#3B82F6] py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-Select Manage Team Members Modal (Never closes on toggle) */}
      {membersModalTeam && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-[#141821] border border-[#232938] max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#232938]">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: membersModalTeam.color }}
                />
                <h2 className="text-base font-semibold text-[#F1F5F9] truncate">
                  {membersModalTeam.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setMembersModalTeam(null)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#F1F5F9] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-4 pt-3 pb-2 space-y-2">
              <div className="relative">
                <Search className="h-4 w-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={membersSearch}
                  onChange={(e) => setMembersSearch(e.target.value)}
                  placeholder="Buscar jugador..."
                  className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] pl-9 pr-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-[#94A3B8] tabular-nums px-0.5">
                <span>{selectedMemberIds.size} seleccionados</span>
                <span>{players.length} total</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-3">
              {modalFilteredPlayers.length === 0 ? (
                <p className="text-sm text-[#64748B] text-center py-6">Sin jugadores</p>
              ) : (
                <div className="divide-y divide-[#232938] rounded-xl border border-[#232938] bg-[#0B0D12]">
                  {modalFilteredPlayers.map((player) => {
                    const checked = selectedMemberIds.has(player.id)
                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => toggleMemberSelection(player.id)}
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
            </div>

            <div className="flex gap-2.5 p-4 border-t border-[#232938]">
              <button
                type="button"
                onClick={() => setMembersModalTeam(null)}
                className="flex-1 rounded-xl border border-[#232938] bg-[#0B0D12] py-2.5 text-sm font-medium text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMembers}
                className="flex-1 rounded-xl bg-[#3B82F6] py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] cursor-pointer"
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-[#141821] border border-[#232938]"
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#232938]">
              <h2 className="text-sm font-semibold text-[#F1F5F9] truncate">
                Equipos — {quickTeamsPlayer.firstName} {quickTeamsPlayer.lastName}
              </h2>
              <button
                type="button"
                onClick={() => setQuickTeamsPlayerId(null)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#F1F5F9] cursor-pointer"
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
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border cursor-pointer ${
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

            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => setQuickTeamsPlayerId(null)}
                className="w-full rounded-xl bg-[#3B82F6] py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Modal */}
      {playerModal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-[#141821] border border-[#232938]">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#232938]">
              <h2 className="text-base font-semibold text-[#F1F5F9]">
                {playerModal.editing ? 'Editar jugador' : 'Nuevo jugador'}
              </h2>
              <button
                type="button"
                onClick={() => setPlayerModal({ open: false })}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#F1F5F9] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitPlayer} className="p-4 space-y-3.5">
              {/* Photo */}
              <div className="flex items-center gap-3">
                <Avatar firstName={firstName || '?'} lastName={lastName} photoBase64={photoBase64} size="lg" />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 rounded-xl border border-[#232938] bg-[#0B0D12] px-3 py-2 text-xs font-medium text-[#E2E8F0] hover:border-[#3B82F6] cursor-pointer">
                    <Camera className="h-4 w-4 text-[#3B82F6]" />
                    <span>Foto</span>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                  {photoBase64 && (
                    <button
                      type="button"
                      onClick={() => setPhotoBase64(undefined)}
                      className="rounded-xl border border-[#232938] bg-[#0B0D12] px-2.5 py-2 text-xs text-[#94A3B8] hover:text-[#FB7185] cursor-pointer"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
              </div>

              {teams.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Equipos</label>
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

              <div className="flex gap-2 pt-1">
                {playerModal.editing && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onDeletePlayer(playerModal.editing!.id)
                      setPlayerModal({ open: false })
                    }}
                    className="rounded-xl border border-[#FB7185]/40 bg-[#FB7185]/10 px-3 py-2.5 text-sm font-medium text-[#FB7185] hover:bg-[#FB7185]/20 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#3B82F6] py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] cursor-pointer"
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
