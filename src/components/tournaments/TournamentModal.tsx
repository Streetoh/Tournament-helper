import { X } from 'lucide-react'
import { useState } from 'react'
import type { RoundingRule, Tournament } from '../../types/models'

interface TournamentModalProps {
  initial?: Tournament
  onClose: () => void
  onSave: (data: Omit<Tournament, 'id' | 'participants'>) => void
}

export function TournamentModal({ initial, onClose, onSave }: TournamentModalProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [date, setDate] = useState(() => initial?.date ?? new Date().toISOString().slice(0, 10))
  const [address, setAddress] = useState(initial?.address ?? '')
  const [matchSchedule, setMatchSchedule] = useState(initial?.matchSchedule ?? '')
  const [busDepartureTime, setBusDepartureTime] = useState(initial?.busDepartureTime ?? '')
  const [carArrivalTime, setCarArrivalTime] = useState(initial?.carArrivalTime ?? '')
  const [tournamentCost, setTournamentCost] = useState(
    initial !== undefined ? String(initial.tournamentCost) : ''
  )
  const [busCost, setBusCost] = useState(initial !== undefined ? String(initial.busCost) : '')
  const [roundingRule, setRoundingRule] = useState<RoundingRule>(initial?.roundingRule ?? 'exact')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      date,
      address: address.trim(),
      matchSchedule: matchSchedule.trim(),
      busDepartureTime: busDepartureTime.trim(),
      carArrivalTime: carArrivalTime.trim(),
      tournamentCost: Math.max(0, Number.parseFloat(tournamentCost.replace(',', '.')) || 0),
      busCost: Math.max(0, Number.parseFloat(busCost.replace(',', '.')) || 0),
      roundingRule,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-[#141821] border border-[#232938] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#232938]">
          <h2 className="text-base font-semibold text-[#F1F5F9]">
            {initial ? 'Editar torneo' : 'Nuevo torneo'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#F1F5F9] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1">Nombre</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Torneo Tartu"
              className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1">Fecha</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1">Redondeo</label>
              <select
                value={roundingRule}
                onChange={(e) => setRoundingRule(e.target.value as RoundingRule)}
                className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
              >
                <option value="exact">Exacto</option>
                <option value="0.50">0,50 € superior</option>
                <option value="1.00">Entero superior</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1">Dirección</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Tartu, Estonia"
              className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1">Salida autobús</label>
              <input
                type="text"
                value={busDepartureTime}
                onChange={(e) => setBusDepartureTime(e.target.value)}
                placeholder="08:30"
                className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1">Llegada coche</label>
              <input
                type="text"
                value={carArrivalTime}
                onChange={(e) => setCarArrivalTime(e.target.value)}
                placeholder="09:00"
                className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1">Coste torneo (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tournamentCost}
                onChange={(e) => setTournamentCost(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-sm text-[#F1F5F9] tabular-nums placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1">Coste autobús (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={busCost}
                onChange={(e) => setBusCost(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-sm text-[#F1F5F9] tabular-nums placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1">Horario de partidos</label>
            <textarea
              rows={3}
              value={matchSchedule}
              onChange={(e) => setMatchSchedule(e.target.value)}
              placeholder="10:00 vs Tammeka&#10;11:30 vs Kalev"
              className="w-full rounded-xl bg-[#0B0D12] border border-[#232938] px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#232938] bg-[#0B0D12] py-2.5 text-sm font-medium text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer"
            >
              Cancelar
            </button>
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
  )
}
