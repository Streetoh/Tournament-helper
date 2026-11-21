import { AlertTriangle, Download, RefreshCw, Upload } from 'lucide-react'
import { useState } from 'react'
import { exportAllData, replaceAllData } from '../../db/database'
import {
  fetchRemoteFile,
  isGitHubConfigured,
  loadGitHubConfig,
  pushRemoteFile,
  saveGitHubConfig,
  syncWithGitHub,
  testGitHubConnection,
} from '../../services/githubSync'
import type { AppDataPayload, GitHubConfig, Player } from '../../types/models'
import { extractRecordsFromJson, type ImportedPreviewRow } from '../../utils/jsonImporter'
import { JsonImportModal } from './JsonImportModal'

interface SettingsViewProps {
  players: Player[]
  onImportPlayers: (rows: ImportedPreviewRow[]) => Promise<number>
  onShowToast: (msg: string) => void
}

export function SettingsView({ players, onImportPlayers, onShowToast }: SettingsViewProps) {
  const [config, setConfig] = useState<GitHubConfig>(() => loadGitHubConfig())
  const [busy, setBusy] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [conflictRemoteSha, setConflictRemoteSha] = useState<string | null>(null)

  const [importRecords, setImportRecords] = useState<Record<string, unknown>[] | null>(null)

  const updateConfig = (patch: Partial<GitHubConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch }
      saveGitHubConfig(next)
      return next
    })
  }

  const handleTest = async () => {
    setBusy(true)
    setStatusMsg(null)
    try {
      const res = await testGitHubConnection(config)
      setStatusMsg(res.message)
      onShowToast(res.message)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexión'
      setStatusMsg(msg)
      onShowToast(msg)
    } finally {
      setBusy(false)
    }
  }

  const handleSync = async () => {
    if (!isGitHubConfigured(config)) {
      onShowToast('Completa la configuración')
      return
    }
    setBusy(true)
    setStatusMsg(null)
    setConflictRemoteSha(null)
    try {
      const local = await exportAllData()
      const res = await syncWithGitHub(config, local)

      if (res.status === 'conflict') {
        setConflictRemoteSha(res.remoteSha)
        setStatusMsg('Conflicto: versión remota más reciente')
      } else if (res.status === 'pulled') {
        await replaceAllData(res.data)
        const now = new Date().toISOString()
        updateConfig({ lastSyncedAt: now, lastSyncedSha: res.sha })
        setStatusMsg('Descargado desde GitHub')
        onShowToast('Datos actualizados')
      } else if (res.status === 'pushed') {
        const now = new Date().toISOString()
        updateConfig({ lastSyncedAt: now, lastSyncedSha: res.sha })
        setStatusMsg('Subido a GitHub')
        onShowToast('Sincronizado')
      } else {
        const now = new Date().toISOString()
        updateConfig({ lastSyncedAt: now, lastSyncedSha: res.sha })
        setStatusMsg('Sin cambios')
        onShowToast('Al día')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al sincronizar'
      setStatusMsg(msg)
      onShowToast(msg)
    } finally {
      setBusy(false)
    }
  }

  const handleForcePush = async () => {
    if (!isGitHubConfigured(config)) return
    setBusy(true)
    setStatusMsg(null)
    try {
      const local = await exportAllData()
      const remote = await fetchRemoteFile(config)
      const newSha = await pushRemoteFile(config, local, conflictRemoteSha ?? remote?.sha)
      const now = new Date().toISOString()
      updateConfig({ lastSyncedAt: now, lastSyncedSha: newSha })
      setConflictRemoteSha(null)
      setStatusMsg('Subida forzada completada')
      onShowToast('Subido')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al subir'
      setStatusMsg(msg)
      onShowToast(msg)
    } finally {
      setBusy(false)
    }
  }

  const handleForcePull = async () => {
    if (!isGitHubConfigured(config)) return
    setBusy(true)
    setStatusMsg(null)
    try {
      const remote = await fetchRemoteFile(config)
      if (!remote) {
        setStatusMsg('No existe archivo remoto')
        return
      }
      await replaceAllData(remote.data)
      const now = new Date().toISOString()
      updateConfig({ lastSyncedAt: now, lastSyncedSha: remote.sha })
      setConflictRemoteSha(null)
      setStatusMsg('Descarga forzada completada')
      onShowToast('Descargado')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al descargar'
      setStatusMsg(msg)
      onShowToast(msg)
    } finally {
      setBusy(false)
    }
  }

  const handleExportLocal = async () => {
    const data = await exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `torneos-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    onShowToast('Backup exportado')
  }

  const handleImportLocalBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as Partial<AppDataPayload>
      if (!Array.isArray(parsed.teams) || !Array.isArray(parsed.players) || !Array.isArray(parsed.tournaments)) {
        onShowToast('Formato de backup no válido')
        return
      }
      await replaceAllData({
        version: parsed.version ?? 1,
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
        teams: parsed.teams,
        players: parsed.players,
        tournaments: parsed.tournaments,
        coachPin: parsed.coachPin,
      })
      onShowToast('Backup restaurado')
    } catch {
      onShowToast('Error al leer JSON')
    }
  }

  const handleSmartJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const raw = JSON.parse(text) as unknown
      const records = extractRecordsFromJson(raw)
      if (records.length === 0) {
        onShowToast('Sin registros válidos')
        return
      }
      setImportRecords(records)
    } catch {
      onShowToast('JSON no válido')
    }
  }

  const lastSyncFormatted = config.lastSyncedAt
    ? new Date(config.lastSyncedAt).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Nunca'

  const inputCls =
    'w-full h-11 rounded-xl bg-[#1C1C21] border border-[#24242B] px-3 text-xs text-[#F5F5F0] placeholder-[#63636E] focus:outline-none focus:border-[#C8FF2E]'

  return (
    <div className="space-y-4">
      <h1 className="text-[26px] font-extrabold tracking-tight text-[#F5F5F0]">Ajustes</h1>

      {/* GitHub Sync Bento */}
      <section className="rounded-2xl border border-[#24242B] bg-[#131316] p-4 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[#F5F5F0]">GitHub</h2>
          <span className="rounded-full bg-[#1C1C21] border border-[#24242B] px-2.5 py-0.5 font-mono text-[11px] text-[#9A9AA6] tabular-nums">
            {lastSyncFormatted}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-medium text-[#9A9AA6] mb-1">Owner</label>
            <input
              type="text"
              value={config.owner}
              onChange={(e) => updateConfig({ owner: e.target.value })}
              placeholder="usuario"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#9A9AA6] mb-1">Repositorio</label>
            <input
              type="text"
              value={config.repo}
              onChange={(e) => updateConfig({ repo: e.target.value })}
              placeholder="torneos-data"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#9A9AA6] mb-1">Rama</label>
            <input
              type="text"
              value={config.branch}
              onChange={(e) => updateConfig({ branch: e.target.value })}
              placeholder="main"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#9A9AA6] mb-1">Ruta</label>
            <input
              type="text"
              value={config.path}
              onChange={(e) => updateConfig({ path: e.target.value })}
              placeholder="data.json"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#9A9AA6] mb-1">Token</label>
          <input
            type="password"
            value={config.token}
            onChange={(e) => updateConfig({ token: e.target.value })}
            placeholder="ghp_..."
            className={inputCls}
          />
        </div>

        {conflictRemoteSha && (
          <div className="flex items-center gap-2 rounded-xl border border-[#F43F5E]/35 bg-[#F43F5E]/12 px-3 py-2.5 text-xs font-medium text-[#F43F5E]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Conflicto detectado: elige Forzar subida o Forzar descarga.</span>
          </div>
        )}

        {statusMsg && !conflictRemoteSha && (
          <p className="text-xs font-medium text-[#9A9AA6]">{statusMsg}</p>
        )}

        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={handleSync}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#C8FF2E] min-h-[44px] text-xs font-bold text-[#0A0A0C] hover:brightness-95 active:scale-[0.98] disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
            <span>Sincronizar ahora</span>
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleTest}
              className="rounded-xl border border-[#24242B] bg-[#1C1C21] min-h-[42px] px-2 text-[11px] font-semibold text-[#F5F5F0] hover:border-[#32323C] disabled:opacity-40 cursor-pointer"
            >
              Probar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleForcePush}
              className="rounded-xl border border-[#24242B] bg-[#1C1C21] min-h-[42px] px-2 text-[11px] font-semibold text-[#9A9AA6] hover:text-[#F5F5F0] disabled:opacity-40 cursor-pointer"
            >
              Forzar subida
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleForcePull}
              className="rounded-xl border border-[#24242B] bg-[#1C1C21] min-h-[42px] px-2 text-[11px] font-semibold text-[#9A9AA6] hover:text-[#F5F5F0] disabled:opacity-40 cursor-pointer"
            >
              Forzar descarga
            </button>
          </div>
        </div>
      </section>

      {/* Smart JSON Importer Bento */}
      <section className="rounded-2xl border border-[#24242B] bg-[#131316] p-4 space-y-3">
        <h2 className="text-sm font-bold text-[#F5F5F0]">Importador JSON</h2>
        <label className="flex items-center justify-center gap-2 rounded-xl border border-[#24242B] bg-[#1C1C21] min-h-[44px] text-xs font-bold text-[#F5F5F0] hover:border-[#32323C] active:scale-[0.98] cursor-pointer">
          <Upload className="h-4 w-4 text-[#C8FF2E]" />
          <span>Importar jugadores (.json)</span>
          <input type="file" accept=".json,application/json" onChange={handleSmartJsonFile} className="hidden" />
        </label>
      </section>

      {/* Local Backup Bento */}
      <section className="rounded-2xl border border-[#24242B] bg-[#131316] p-4 space-y-3">
        <h2 className="text-sm font-bold text-[#F5F5F0]">Copia local</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleExportLocal}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#24242B] bg-[#1C1C21] min-h-[44px] text-xs font-bold text-[#F5F5F0] hover:border-[#32323C] active:scale-[0.98] cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#C8FF2E]" />
            <span>Exportar data.json</span>
          </button>
          <label className="flex items-center justify-center gap-1.5 rounded-xl border border-[#24242B] bg-[#1C1C21] min-h-[44px] text-xs font-bold text-[#F5F5F0] hover:border-[#32323C] active:scale-[0.98] cursor-pointer">
            <Upload className="h-4 w-4 text-[#C8FF2E]" />
            <span>Importar data.json</span>
            <input type="file" accept=".json,application/json" onChange={handleImportLocalBackup} className="hidden" />
          </label>
        </div>
      </section>

      {importRecords && (
        <JsonImportModal
          records={importRecords}
          existingPlayers={players}
          onClose={() => setImportRecords(null)}
          onConfirm={async (rows) => {
            const added = await onImportPlayers(rows)
            onShowToast(`Importados: ${added}`)
          }}
        />
      )}
    </div>
  )
}
