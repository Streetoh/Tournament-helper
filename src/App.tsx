import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useState } from 'react'
import { CalculatorView } from './components/calc/CalculatorView'
import { CoachView } from './components/coach/CoachView'
import { PinPadModal } from './components/coach/PinPadModal'
import { Layout } from './components/Layout'
import { SettingsView } from './components/settings/SettingsView'
import { TeamsView } from './components/teams/TeamsView'
import { Toast } from './components/Toast'
import { TournamentDetailView } from './components/tournaments/TournamentDetailView'
import { TournamentModal } from './components/tournaments/TournamentModal'
import { TournamentsView } from './components/tournaments/TournamentsView'
import { db, getCoachPin, markLocalModified, setCoachPin } from './db/database'
import type { ActiveTab, Player, Team, Tournament } from './types/models'
import type { ImportedPreviewRow } from './utils/jsonImporter'
import { getTeamColor } from './utils/teamColors'

function newId(): string {
  return crypto.randomUUID()
}

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('tournaments')
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null)
  const [coachUnlocked, setCoachUnlocked] = useState(false)
  const [changePinOpen, setChangePinOpen] = useState(false)
  const [tournamentModal, setTournamentModal] = useState<{ open: boolean; editing?: Tournament }>({
    open: false,
  })
  const [toast, setToast] = useState<string | null>(null)

  const rawTeams = useLiveQuery(() => db.teams.toArray(), [], [] as Team[])
  const teams = rawTeams.map((t, idx) => ({ ...t, color: getTeamColor(t.color, idx) }))
  const players = useLiveQuery(() => db.players.toArray(), [], [] as Player[])
  const tournaments = useLiveQuery(() => db.tournaments.toArray(), [], [] as Tournament[])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const selectedTournament = selectedTournamentId
    ? tournaments.find((t) => t.id === selectedTournamentId) ?? null
    : null

  // Tournament handlers
  const handleSaveTournament = async (data: Omit<Tournament, 'id' | 'participants'>) => {
    if (tournamentModal.editing) {
      await db.tournaments.put({
        ...tournamentModal.editing,
        ...data,
      })
    } else {
      const id = newId()
      await db.tournaments.add({
        id,
        ...data,
        participants: [],
      })
      setSelectedTournamentId(id)
    }
    markLocalModified()
    setTournamentModal({ open: false })
  }

  const handleUpdateTournament = async (updated: Tournament) => {
    await db.tournaments.put(updated)
    markLocalModified()
  }

  const handleDeleteTournament = async (id: string) => {
    await db.tournaments.delete(id)
    markLocalModified()
    setSelectedTournamentId(null)
  }

  // Team & Player handlers
  const handleCreateTeam = async (name: string, color: string) => {
    await db.teams.add({ id: newId(), name, color })
    markLocalModified()
  }

  const handleUpdateTeam = async (id: string, name: string, color: string) => {
    await db.teams.put({ id, name, color })
    markLocalModified()
  }

  const handleUpdateTeamMembers = async (teamId: string, selectedPlayerIds: Set<string>) => {
    await db.transaction('rw', db.players, async () => {
      const allPlayers = await db.players.toArray()
      const updates: Player[] = []
      for (const p of allPlayers) {
        const hasTeam = p.teamIds.includes(teamId)
        const shouldHave = selectedPlayerIds.has(p.id)
        if (hasTeam !== shouldHave) {
          updates.push({
            ...p,
            teamIds: shouldHave
              ? [...p.teamIds, teamId]
              : p.teamIds.filter((tid) => tid !== teamId),
          })
        }
      }
      if (updates.length > 0) {
        await db.players.bulkPut(updates)
      }
    })
    markLocalModified()
  }

  const handleTogglePlayerTeam = async (playerId: string, teamId: string) => {
    const player = await db.players.get(playerId)
    if (!player) return
    const hasTeam = player.teamIds.includes(teamId)
    await db.players.put({
      ...player,
      teamIds: hasTeam
        ? player.teamIds.filter((tid) => tid !== teamId)
        : [...player.teamIds, teamId],
    })
    markLocalModified()
  }

  const handleDeleteTeam = async (id: string) => {
    await db.transaction('rw', db.teams, db.players, async () => {
      await db.teams.delete(id)
      const affected = await db.players.where('teamIds').equals(id).toArray()
      for (const p of affected) {
        await db.players.put({
          ...p,
          teamIds: p.teamIds.filter((tid) => tid !== id),
        })
      }
    })
    markLocalModified()
  }

  const handleSavePlayer = async (data: Omit<Player, 'id'> & { id?: string }) => {
    const id = data.id ?? newId()
    await db.players.put({
      id,
      firstName: data.firstName,
      lastName: data.lastName,
      photoBase64: data.photoBase64,
      teamIds: data.teamIds,
    })
    markLocalModified()
  }

  const handleCreatePlayerDirect = async (
    firstName: string,
    lastName: string,
    teamIds: string[]
  ): Promise<Player> => {
    const player: Player = {
      id: newId(),
      firstName,
      lastName,
      teamIds,
    }
    await db.players.add(player)
    markLocalModified()
    return player
  }

  const handleDeletePlayer = async (id: string) => {
    await db.transaction('rw', db.players, db.tournaments, async () => {
      await db.players.delete(id)
      const allTournaments = await db.tournaments.toArray()
      for (const t of allTournaments) {
        if (t.participants.some((p) => p.playerId === id)) {
          await db.tournaments.put({
            ...t,
            participants: t.participants.filter((p) => p.playerId !== id),
          })
        }
      }
    })
    markLocalModified()
  }

  const handleImportPlayers = async (rows: ImportedPreviewRow[]): Promise<number> => {
    const existingTeams = await db.teams.toArray()
    const teamByName = new Map(existingTeams.map((t) => [t.name.trim().toLowerCase(), t]))
    const teamsToAdd: Team[] = []
    const playersToAdd: Player[] = []

    for (const row of rows) {
      const teamIds: string[] = []
      const rawTeam = row.teamName.trim()
      if (rawTeam) {
        const key = rawTeam.toLowerCase()
        let team = teamByName.get(key)
        if (!team) {
          team = {
            id: newId(),
            name: rawTeam,
            color: getTeamColor(undefined, existingTeams.length + teamsToAdd.length),
          }
          teamByName.set(key, team)
          teamsToAdd.push(team)
        }
        teamIds.push(team.id)
      }

      playersToAdd.push({
        id: newId(),
        firstName: row.firstName,
        lastName: row.lastName,
        photoBase64: row.photoBase64,
        teamIds,
      })
    }

    await db.transaction('rw', db.teams, db.players, async () => {
      if (teamsToAdd.length > 0) await db.teams.bulkPut(teamsToAdd)
      if (playersToAdd.length > 0) await db.players.bulkPut(playersToAdd)
    })
    markLocalModified()
    return playersToAdd.length
  }

  const existingCoachPin = getCoachPin()

  return (
    <Layout
      activeTab={activeTab}
      onSelectTab={(tab) => {
        setActiveTab(tab)
        if (tab !== 'coach') {
          setCoachUnlocked(false)
          setChangePinOpen(false)
        }
        if (tab !== 'tournaments') {
          setSelectedTournamentId(null)
        }
      }}
    >
      {activeTab === 'tournaments' &&
        (selectedTournament ? (
          <TournamentDetailView
            tournament={selectedTournament}
            teams={teams}
            players={players}
            onBack={() => setSelectedTournamentId(null)}
            onEdit={() => setTournamentModal({ open: true, editing: selectedTournament })}
            onDelete={() => handleDeleteTournament(selectedTournament.id)}
            onUpdateTournament={handleUpdateTournament}
            onCreatePlayer={handleCreatePlayerDirect}
            onShowToast={showToast}
          />
        ) : (
          <TournamentsView
            tournaments={tournaments}
            teams={teams}
            players={players}
            onSelectTournament={(id) => setSelectedTournamentId(id)}
            onCreateTournament={() => setTournamentModal({ open: true })}
          />
        ))}

      {activeTab === 'coach' &&
        (coachUnlocked ? (
          <CoachView
            tournaments={tournaments}
            teams={teams}
            players={players}
            onExit={() => setCoachUnlocked(false)}
            onChangePin={() => setChangePinOpen(true)}
            onUpdateTournament={handleUpdateTournament}
            onShowToast={showToast}
          />
        ) : (
          <PinPadModal
            inline
            mode={existingCoachPin ? 'unlock' : 'create'}
            existingPin={existingCoachPin}
            onUnlock={() => setCoachUnlocked(true)}
            onSavePin={(newPin) => {
              setCoachPin(newPin)
              markLocalModified()
              setCoachUnlocked(true)
              showToast('PIN guardado')
            }}
          />
        ))}

      {activeTab === 'teams' && (
        <TeamsView
          teams={teams}
          players={players}
          onCreateTeam={handleCreateTeam}
          onUpdateTeam={handleUpdateTeam}
          onDeleteTeam={handleDeleteTeam}
          onSavePlayer={handleSavePlayer}
          onDeletePlayer={handleDeletePlayer}
          onUpdateTeamMembers={handleUpdateTeamMembers}
          onTogglePlayerTeam={handleTogglePlayerTeam}
        />
      )}

      {activeTab === 'calc' && <CalculatorView />}

      {activeTab === 'settings' && (
        <SettingsView
          players={players}
          onImportPlayers={handleImportPlayers}
          onShowToast={showToast}
        />
      )}

      {tournamentModal.open && (
        <TournamentModal
          initial={tournamentModal.editing}
          onClose={() => setTournamentModal({ open: false })}
          onSave={handleSaveTournament}
        />
      )}

      {changePinOpen && (
        <PinPadModal
          mode="change"
          existingPin={existingCoachPin}
          onClose={() => setChangePinOpen(false)}
          onUnlock={() => setChangePinOpen(false)}
          onSavePin={(newPin) => {
            setCoachPin(newPin)
            markLocalModified()
            setChangePinOpen(false)
            showToast('PIN actualizado')
          }}
        />
      )}

      <Toast message={toast} />
    </Layout>
  )
}

export default App
