import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Player } from '../../types/models'
import {
  buildImportPreview,
  collectAvailableKeys,
  detectFieldMapping,
  type FieldMapping,
  type ImportedPreviewRow,
} from '../../utils/jsonImporter'

interface JsonImportModalProps {
  records: Record<string, unknown>[]
  existingPlayers: Player[]
  onClose: () => void
  onConfirm: (rows: ImportedPreviewRow[]) => Promise<void>
}

export function JsonImportModal({
  records,
  existingPlayers,
  onClose,
  onConfirm,
}: JsonImportModalProps) {
  const keys = useMemo(() => collectAvailableKeys(records), [records])
  const [mapping, setMapping] = useState<FieldMapping>(() => detectFieldMapping(keys))
  const [importing, setImporting] = useState(false)

  const preview = useMemo(
    () => buildImportPreview(records, mapping, existingPlayers),
    [records, mapping, existingPlayers]
  )

  const newRows = useMemo(() => preview.filter((r) => !r.isDuplicate), [preview])
  const duplicateCount = preview.length - newRows.length

  const handleConfirm = async () => {
    if (newRows.length === 0) return
    setImporting(true)
    try {
      await onConfirm(newRows)
      onClose()
    } finally {
      setImporting(false)
    }
  }

  const renderSelect = (label: string, field: keyof FieldMapping) => (
    <div>
      <label className="block text-[11px] font-medium text-[#94A3B8] mb-1">{label}</label>
      <select
        value={mapping[field]}
        onChange={(e) => setMapping((prev) => ({ ...prev, [field]: e.target.value }))}
        className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-2.5 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
      >
        <option value="">— Ninguno —</option>
        {keys.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-[#141821] border border-[#232938] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#232938]">
          <h2 className="text-base font-semibold text-[#F1F5F9]">Confirmar importación JSON</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#64748B] hover:text-[#F1F5F9] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {/* Field mapping */}
          <div className="grid grid-cols-2 gap-2.5">
            {renderSelect('Nombre', 'firstNameKey')}
            {renderSelect('Apellidos', 'lastNameKey')}
            {renderSelect('Equipo', 'teamKey')}
            {renderSelect('Foto', 'photoKey')}
          </div>

          {/* Summary counters */}
          <div className="flex items-center justify-between text-xs tabular-nums rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2">
            <span className="text-[#34D399] font-semibold">Nuevos: {newRows.length}</span>
            <span className="text-[#FB7185]">Omitidos (duplicados): {duplicateCount}</span>
          </div>

          {/* Preview table */}
          <div className="rounded-xl border border-[#232938] bg-[#0B0D12] divide-y divide-[#232938] max-h-60 overflow-y-auto">
            {preview.slice(0, 50).map((row) => (
              <div
                key={row.index}
                className={`flex items-center justify-between px-3 py-2 text-xs ${
                  row.isDuplicate ? 'opacity-45' : ''
                }`}
              >
                <div className="min-w-0 truncate">
                  <span className="text-[#F1F5F9] font-medium">
                    {row.firstName || '—'} {row.lastName}
                  </span>
                  {row.teamName && (
                    <span className="ml-2 text-[#64748B]">({row.teamName})</span>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    row.isDuplicate
                      ? 'bg-[#FB7185]/15 text-[#FB7185]'
                      : 'bg-[#34D399]/15 text-[#34D399]'
                  }`}
                >
                  {row.isDuplicate ? 'Duplicado' : 'Nuevo'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2.5 p-4 border-t border-[#232938]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#232938] bg-[#0B0D12] py-2.5 text-sm font-medium text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={newRows.length === 0 || importing}
            onClick={handleConfirm}
            className="flex-1 rounded-xl bg-[#3B82F6] py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-40 cursor-pointer"
          >
            Importar ({newRows.length})
          </button>
        </div>
      </div>
    </div>
  )
}
