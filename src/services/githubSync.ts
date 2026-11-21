import type { AppDataPayload, GitHubConfig } from '../types/models'

const GITHUB_CONFIG_KEY = 'torneos_github_config'

export function loadGitHubConfig(): GitHubConfig {
  try {
    const raw = localStorage.getItem(GITHUB_CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GitHubConfig>
      return {
        owner: parsed.owner ?? '',
        repo: parsed.repo ?? '',
        branch: parsed.branch || 'main',
        path: parsed.path || 'data.json',
        token: parsed.token ?? '',
        lastSyncedAt: parsed.lastSyncedAt,
        lastSyncedSha: parsed.lastSyncedSha,
      }
    }
  } catch {
    // Ignore corrupted storage
  }
  return {
    owner: '',
    repo: '',
    branch: 'main',
    path: 'data.json',
    token: '',
  }
}

export function saveGitHubConfig(config: GitHubConfig): void {
  localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config))
}

function encodeUtf8Base64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function decodeUtf8Base64(base64: string): string {
  const cleaned = base64.replace(/\s+/g, '')
  const binary = atob(cleaned)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

function buildHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token.trim()}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function getContentsUrl(config: GitHubConfig): string {
  const owner = encodeURIComponent(config.owner.trim())
  const repo = encodeURIComponent(config.repo.trim())
  const path = config.path
    .trim()
    .replace(/^\/+/, '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
}

export function isGitHubConfigured(config: GitHubConfig): boolean {
  return Boolean(
    config.owner.trim() && config.repo.trim() && config.branch.trim() && config.path.trim() && config.token.trim()
  )
}

export async function testGitHubConnection(config: GitHubConfig): Promise<{ ok: boolean; message: string }> {
  if (!isGitHubConfigured(config)) {
    return { ok: false, message: 'Faltan campos de configuración' }
  }

  const owner = encodeURIComponent(config.owner.trim())
  const repo = encodeURIComponent(config.repo.trim())
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: buildHeaders(config.token),
  })

  if (!res.ok) {
    return { ok: false, message: `Error HTTP ${res.status}` }
  }

  return { ok: true, message: 'Conexión correcta' }
}

export async function fetchRemoteFile(
  config: GitHubConfig
): Promise<{ data: AppDataPayload; sha: string } | null> {
  const branch = encodeURIComponent(config.branch.trim() || 'main')
  const url = `${getContentsUrl(config)}?ref=${branch}`

  const res = await fetch(url, {
    headers: buildHeaders(config.token),
    cache: 'no-store',
  })

  if (res.status === 404) {
    return null
  }

  if (!res.ok) {
    throw new Error(`Error al leer GitHub (${res.status})`)
  }

  const json = (await res.json()) as { content?: string; sha: string }
  if (!json.content) {
    throw new Error('Archivo remoto vacío')
  }

  const decoded = decodeUtf8Base64(json.content)
  const data = JSON.parse(decoded) as AppDataPayload
  return { data, sha: json.sha }
}

export async function pushRemoteFile(
  config: GitHubConfig,
  payload: AppDataPayload,
  sha?: string
): Promise<string> {
  const url = getContentsUrl(config)
  const content = encodeUtf8Base64(JSON.stringify(payload, null, 2))

  const body: Record<string, string> = {
    message: `Sync ${new Date().toISOString()}`,
    content,
    branch: config.branch.trim() || 'main',
  }
  if (sha) {
    body.sha = sha
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      ...buildHeaders(config.token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    if (res.status === 409 || res.status === 422) {
      throw new Error('Conflicto de versión en GitHub (SHA desactualizado)')
    }
    throw new Error(`Error al subir a GitHub (${res.status})`)
  }

  const json = (await res.json()) as { content: { sha: string } }
  return json.content.sha
}

export type SyncResult =
  | { status: 'pushed'; sha: string }
  | { status: 'pulled'; data: AppDataPayload; sha: string }
  | { status: 'conflict'; remoteData: AppDataPayload; remoteSha: string }
  | { status: 'up_to_date'; sha: string }

export async function syncWithGitHub(
  config: GitHubConfig,
  localPayload: AppDataPayload
): Promise<SyncResult> {
  const remote = await fetchRemoteFile(config)

  if (!remote) {
    const newSha = await pushRemoteFile(config, localPayload)
    return { status: 'pushed', sha: newSha }
  }

  const lastSyncedSha = config.lastSyncedSha
  const lastSyncedAt = config.lastSyncedAt ?? ''
  const remoteTime = remote.data.updatedAt ?? ''
  const localTime = localPayload.updatedAt ?? ''

  const remoteChanged = Boolean(lastSyncedSha && remote.sha !== lastSyncedSha) || remoteTime > lastSyncedAt
  const localChanged = localTime > lastSyncedAt

  if (lastSyncedAt && remoteChanged && localChanged && remote.sha !== lastSyncedSha) {
    return {
      status: 'conflict',
      remoteData: remote.data,
      remoteSha: remote.sha,
    }
  }

  if (remoteTime > localTime || (localPayload.tournaments.length === 0 && localPayload.players.length === 0 && remote.data.players.length > 0)) {
    return {
      status: 'pulled',
      data: remote.data,
      sha: remote.sha,
    }
  }

  if (localTime > remoteTime || !lastSyncedSha) {
    const newSha = await pushRemoteFile(config, localPayload, remote.sha)
    return { status: 'pushed', sha: newSha }
  }

  return { status: 'up_to_date', sha: remote.sha }
}
