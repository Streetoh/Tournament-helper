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
      <label className="block text-[11px] font-medium text-[#9A9AA6] mb-1">{label}</label>
      <select
        value={mapping[field]}
        onChange={(e) => setMapping((prev) => ({ ...prev, [field]: e.target.value }))}
        className="w-full h-10 rounded-xl bg-[#1C1C21] border border-[#24242B] px-2.5 text-xs text-[#F5F5F0] focus:outline-none focus:border-[#C8FF2E]"
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-[#131316] border-t sm:border border-[#24242B] max-h-[90vh] flex flex-col">
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#32323C]" />
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#24242B]">
          <h2 className="text-base font-bold text-[#F5F5F0]">Confirmar importación JSON</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-xl text-[#9A9AA6] hover:text-[#F5F5F0] flex items-center justify-center cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-2.5">
            {renderSelect('Nombre', 'firstNameKey')}
            {renderSelect('Apellidos', 'lastNameKey')}
            {renderSelect('Equipo', 'teamKey')}
            {renderSelect('Foto', 'photoKey')}
          </div>

          <div className="flex items-center justify-between text-xs tabular-nums rounded-xl bg-[#1C1C21] border border-[#24242B] px-3 py-2.5">
            <span className="text-[#22C55E] font-bold">Nuevos: {newRows.length}</span>
            <span className="text-[#F43F5E] font-semibold">Duplicados: {duplicateCount}</span>
          </div>

          <div className="rounded-2xl border border-[#24242B] bg-[#1C1C21] divide-y divide-[#24242B] max-h-60 overflow-y-auto">
            {preview.slice(0, 50).map((row) => (
              <div
                key={row.index}
                className={`flex items-center justify-between px-3 py-2.5 text-xs ${
                  row.isDuplicate ? 'opacity-45' : ''
                }`}
              >
                <div className="min-w-0 truncate">
                  <span className="text-[#F5F5F0] font-semibold">
                    {row.firstName || '—'} {row.lastName}
                  </span>
                  {row.teamName && <span className="ml-2 text-[#9A9AA6]">({row.teamName})</span>}
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                    row.isDuplicate
                      ? 'bg-[#F43F5E]/12 border-[#F43F5E]/25 text-[#F43F5E]'
                      : 'bg-[#22C55E]/12 border-[#22C55E]/25 text-[#22C55E]'
                  }`}
                >
                  {row.isDuplicate ? 'Duplicado' : 'Nuevo'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2.5 p-4 border-t border-[#24242B] pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#24242B] bg-[#1C1C21] min-h-[44px] text-sm font-semibold text-[#9A9AA6] hover:text-[#F5F5F0] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={newRows.length === 0 || importing}
            onClick={handleConfirm}
            className="flex-1 rounded-xl bg-[#C8FF2E] min-h-[44px] text-sm font-bold text-[#0A0A0C] hover:brightness-95 disabled:opacity-40 cursor-pointer"
          >
            Importar ({newRows.length})
          </button>
        </div>
      </div>
    </div>
  )
}
