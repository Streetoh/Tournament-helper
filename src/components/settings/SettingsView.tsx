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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9]">Ajustes</h1>

      {/* GitHub Sync */}
      <section className="rounded-2xl border border-[#232938] bg-[#141821] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#F1F5F9]">GitHub</h2>
          <span className="text-[11px] text-[#64748B] tabular-nums">Última: {lastSyncFormatted}</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] text-[#94A3B8] mb-1">Owner</label>
            <input
              type="text"
              value={config.owner}
              onChange={(e) => updateConfig({ owner: e.target.value })}
              placeholder="usuario"
              className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-xs text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#94A3B8] mb-1">Repositorio</label>
            <input
              type="text"
              value={config.repo}
              onChange={(e) => updateConfig({ repo: e.target.value })}
              placeholder="torneos-data"
              className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-xs text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#94A3B8] mb-1">Rama</label>
            <input
              type="text"
              value={config.branch}
              onChange={(e) => updateConfig({ branch: e.target.value })}
              placeholder="main"
              className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-xs text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#94A3B8] mb-1">Ruta</label>
            <input
              type="text"
              value={config.path}
              onChange={(e) => updateConfig({ path: e.target.value })}
              placeholder="data.json"
              className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-xs text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-[#94A3B8] mb-1">Token</label>
          <input
            type="password"
            value={config.token}
            onChange={(e) => updateConfig({ token: e.target.value })}
            placeholder="ghp_..."
            className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-xs text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
          />
        </div>

        {conflictRemoteSha && (
          <div className="flex items-center gap-2 rounded-xl border border-[#FB7185]/40 bg-[#FB7185]/10 px-3 py-2 text-xs text-[#FB7185]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Conflicto detectado: elige Forzar subida o Forzar descarga.</span>
          </div>
        )}

        {statusMsg && !conflictRemoteSha && (
          <p className="text-xs text-[#94A3B8]">{statusMsg}</p>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={handleTest}
            className="rounded-xl border border-[#232938] bg-[#0B0D12] py-2 text-xs font-semibold text-[#E2E8F0] hover:border-[#3B82F6] disabled:opacity-40 cursor-pointer"
          >
            Probar conexión
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleSync}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#3B82F6] py-2 text-xs font-semibold text-white hover:bg-[#2563EB] disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
            <span>Sincronizar ahora</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleForcePush}
            className="rounded-xl border border-[#232938] bg-[#0B0D12] py-2 text-xs font-medium text-[#94A3B8] hover:text-[#F1F5F9] disabled:opacity-40 cursor-pointer"
          >
            Forzar subida
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleForcePull}
            className="rounded-xl border border-[#232938] bg-[#0B0D12] py-2 text-xs font-medium text-[#94A3B8] hover:text-[#F1F5F9] disabled:opacity-40 cursor-pointer"
          >
            Forzar descarga
          </button>
        </div>
      </section>

      {/* Smart JSON Importer */}
      <section className="rounded-2xl border border-[#232938] bg-[#141821] p-4 space-y-2.5">
        <h2 className="text-sm font-semibold text-[#F1F5F9]">Importador JSON</h2>
        <label className="flex items-center justify-center gap-2 rounded-xl border border-[#232938] bg-[#0B0D12] py-2.5 text-xs font-semibold text-[#E2E8F0] hover:border-[#3B82F6] cursor-pointer">
          <Upload className="h-4 w-4 text-[#3B82F6]" />
          <span>Importar jugadores (.json)</span>
          <input type="file" accept=".json,application/json" onChange={handleSmartJsonFile} className="hidden" />
        </label>
      </section>

      {/* Local Backup */}
      <section className="rounded-2xl border border-[#232938] bg-[#141821] p-4 space-y-2.5">
        <h2 className="text-sm font-semibold text-[#F1F5F9]">Copia local</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleExportLocal}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#232938] bg-[#0B0D12] py-2.5 text-xs font-semibold text-[#E2E8F0] hover:border-[#3B82F6] cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#3B82F6]" />
            <span>Exportar data.json</span>
          </button>
          <label className="flex items-center justify-center gap-1.5 rounded-xl border border-[#232938] bg-[#0B0D12] py-2.5 text-xs font-semibold text-[#E2E8F0] hover:border-[#3B82F6] cursor-pointer">
            <Upload className="h-4 w-4 text-[#3B82F6]" />
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
