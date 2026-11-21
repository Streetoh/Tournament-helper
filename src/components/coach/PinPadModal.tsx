import { Delete, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface PinPadModalProps {
  mode: 'unlock' | 'create' | 'change'
  existingPin?: string
  inline?: boolean
  onClose?: () => void
  onUnlock: () => void
  onSavePin: (newPin: string) => void
}

export function PinPadModal({
  mode,
  existingPin,
  inline = false,
  onClose,
  onUnlock,
  onSavePin,
}: PinPadModalProps) {
  const [digits, setDigits] = useState('')
  const [firstPin, setFirstPin] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
    }, 80)
    return () => window.clearTimeout(timer)
  }, [mode, firstPin])

  const title =
    mode === 'unlock'
      ? 'PIN de entrenador'
      : firstPin === null
        ? mode === 'change'
          ? 'Nuevo PIN'
          : 'Crear PIN'
        : 'Confirmar PIN'

  const applyDigits = (nextRaw: string) => {
    const clean = nextRaw.replace(/\D/g, '').slice(0, 4)
    setError(null)
    setDigits(clean)

    if (clean.length === 4) {
      if (mode === 'unlock') {
        if (clean === existingPin) {
          onUnlock()
        } else {
          setError('PIN incorrecto')
          setDigits('')
        }
        return
      }

      if (firstPin === null) {
        setFirstPin(clean)
        setDigits('')
      } else if (clean === firstPin) {
        onSavePin(clean)
      } else {
        setError('Los PIN no coinciden')
        setFirstPin(null)
        setDigits('')
      }
    }
  }

  const handleDigit = (d: string) => {
    if (digits.length >= 4) return
    applyDigits(digits + d)
  }

  const handleBackspace = () => {
    setError(null)
    setDigits((prev) => prev.slice(0, -1))
  }

  const card = (
    <div className="w-full max-w-xs rounded-2xl bg-[#141821] border border-[#232938] p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#F1F5F9]">{title}</h2>
        {!inline && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#64748B] hover:text-[#F1F5F9] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* 4-dot indicator + native numeric input for Android keyboard */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="space-y-2 relative cursor-text"
      >
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          autoFocus
          autoComplete="one-time-code"
          value={digits}
          onChange={(e) => applyDigits(e.target.value)}
          aria-label={title}
          className="absolute inset-0 w-full h-full opacity-0 cursor-text"
        />
        <div className="flex items-center justify-center gap-4 py-2">
          {[0, 1, 2, 3].map((idx) => {
            const filled = idx < digits.length
            return (
              <div
                key={idx}
                className={`h-3.5 w-3.5 rounded-full border transition-all ${
                  filled
                    ? 'bg-[#3B82F6] border-[#3B82F6] scale-110'
                    : 'border-[#334155] bg-[#0B0D12]'
                }`}
              />
            )
          })}
        </div>
        <div className="h-4 text-center text-xs text-[#FB7185]">{error ?? ''}</div>
      </div>

      {/* Numeric keypad */}
      <div className="grid grid-cols-3 gap-2.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => handleDigit(n)}
            className="h-13 rounded-xl border border-[#232938] bg-[#0B0D12] text-lg font-semibold text-[#F1F5F9] tabular-nums hover:bg-[#191F2B] active:scale-95 transition-transform cursor-pointer"
          >
            {n}
          </button>
        ))}
        {inline ? (
          <button
            type="button"
            onClick={() => {
              setDigits('')
              setFirstPin(null)
              setError(null)
              inputRef.current?.focus()
            }}
            className="h-13 rounded-xl border border-[#232938] bg-[#0B0D12] text-xs font-medium text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer"
          >
            Limpiar
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="h-13 rounded-xl border border-[#232938] bg-[#0B0D12] text-xs font-medium text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer"
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-13 rounded-xl border border-[#232938] bg-[#0B0D12] text-lg font-semibold text-[#F1F5F9] tabular-nums hover:bg-[#191F2B] active:scale-95 transition-transform cursor-pointer"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          aria-label="Borrar"
          className="h-13 rounded-xl border border-[#232938] bg-[#0B0D12] text-[#94A3B8] flex items-center justify-center hover:text-[#F1F5F9] cursor-pointer"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>
    </div>
  )

  if (inline) {
    return <div className="flex items-center justify-center pt-8">{card}</div>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      {card}
    </div>
  )
}
