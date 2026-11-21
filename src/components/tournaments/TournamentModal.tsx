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

  const inputCls =
    'w-full h-11 rounded-xl bg-[#1C1C21] border border-[#24242B] px-3 text-sm text-[#F5F5F0] placeholder-[#63636E] focus:outline-none focus:border-[#C8FF2E]'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-[#131316] border-t sm:border border-[#24242B] max-h-[92vh] flex flex-col">
        {/* Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#32323C]" />
        </div>

        {/* Fixed Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#24242B]">
          <h2 className="text-base font-bold text-[#F5F5F0]">
            {initial ? 'Editar torneo' : 'Nuevo torneo'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-xl text-[#9A9AA6] hover:text-[#F5F5F0] flex items-center justify-center cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto p-4 space-y-5 flex-1">
            {/* General */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#63636E]">
                General
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9A9AA6] mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Torneo Tartu"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#9A9AA6] mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`${inputCls} tabular-nums`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#9A9AA6] mb-1">Redondeo</label>
                  <select
                    value={roundingRule}
                    onChange={(e) => setRoundingRule(e.target.value as RoundingRule)}
                    className={inputCls}
                  >
                    <option value="exact">Exacto</option>
                    <option value="0.50">0,50 € superior</option>
                    <option value="1.00">Entero superior</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Logística */}
            <div className="space-y-3 pt-2 border-t border-[#24242B]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#63636E]">
                Logística
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9A9AA6] mb-1">Dirección</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Tartu, Estonia"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#9A9AA6] mb-1">Salida autobús</label>
                  <input
                    type="text"
                    value={busDepartureTime}
                    onChange={(e) => setBusDepartureTime(e.target.value)}
                    placeholder="08:30"
                    className={`${inputCls} tabular-nums`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#9A9AA6] mb-1">Llegada coche</label>
                  <input
                    type="text"
                    value={carArrivalTime}
                    onChange={(e) => setCarArrivalTime(e.target.value)}
                    placeholder="09:00"
                    className={`${inputCls} tabular-nums`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9A9AA6] mb-1">
                  Horario de partidos
                </label>
                <textarea
                  rows={3}
                  value={matchSchedule}
                  onChange={(e) => setMatchSchedule(e.target.value)}
                  placeholder="10:00 vs Tammeka&#10;11:30 vs Kalev"
                  className="w-full rounded-xl bg-[#1C1C21] border border-[#24242B] px-3 py-2.5 text-sm text-[#F5F5F0] placeholder-[#63636E] focus:outline-none focus:border-[#C8FF2E]"
                />
              </div>
            </div>

            {/* Costes */}
            <div className="space-y-3 pt-2 border-t border-[#24242B]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#63636E]">
                Costes
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#9A9AA6] mb-1">
                    Coste torneo (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tournamentCost}
                    onChange={(e) => setTournamentCost(e.target.value)}
                    placeholder="0"
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#9A9AA6] mb-1">
                    Coste autobús (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={busCost}
                    onChange={(e) => setBusCost(e.target.value)}
                    placeholder="0"
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="flex gap-2.5 p-4 border-t border-[#24242B] pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#24242B] bg-[#1C1C21] min-h-[44px] text-sm font-semibold text-[#9A9AA6] hover:text-[#F5F5F0] active:scale-[0.98] cursor-pointer"
            >
              Cancelar
            </button>
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
  )
}
