import { Delete, Lock, X } from 'lucide-react'
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
  const [shaking, setShaking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
    }, 80)
    return () => window.clearTimeout(timer)
  }, [mode, firstPin])

  const triggerError = (msg: string) => {
    setError(msg)
    setShaking(true)
    window.setTimeout(() => setShaking(false), 320)
  }

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
          triggerError('PIN incorrecto')
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
        triggerError('Los PIN no coinciden')
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
    <div className="w-full max-w-xs rounded-2xl bg-[#131316] border border-[#24242B] p-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B]">
            <Lock className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-base font-bold text-[#F5F5F0]">{title}</h2>
        </div>
        {!inline && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] min-w-[36px] rounded-xl text-[#9A9AA6] hover:text-[#F5F5F0] flex items-center justify-center cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* 4-dot indicator + native numeric input for Android keyboard */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="space-y-1.5 relative cursor-text"
      >
        <input
          ref={inputRef}
          type="text"
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
        <div className={`flex items-center justify-center gap-4 py-2 ${shaking ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((idx) => {
            const filled = idx < digits.length
            return (
              <div
                key={idx}
                className={`h-3.5 w-3.5 rounded-full border transition-all ${
                  filled
                    ? 'bg-[#C8FF2E] border-[#C8FF2E] shadow-[0_0_8px_rgba(200,255,46,0.45)] scale-110'
                    : 'border-[#32323C] bg-[#1C1C21]'
                }`}
              />
            )
          })}
        </div>
        <div className="h-4 text-center text-xs font-medium text-[#F43F5E]">{error ?? ''}</div>
      </div>

      {/* Numeric keypad */}
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => handleDigit(n)}
            className="h-11 rounded-xl border border-[#24242B] bg-[#1C1C21] font-mono text-base font-bold text-[#F5F5F0] tabular-nums hover:border-[#32323C] active:scale-[0.95] transition-all cursor-pointer"
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
            className="h-11 rounded-xl border border-[#24242B] bg-[#1C1C21] text-xs font-semibold text-[#9A9AA6] hover:text-[#F5F5F0] cursor-pointer"
          >
            Limpiar
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-[#24242B] bg-[#1C1C21] text-xs font-semibold text-[#9A9AA6] hover:text-[#F5F5F0] cursor-pointer"
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-11 rounded-xl border border-[#24242B] bg-[#1C1C21] font-mono text-base font-bold text-[#F5F5F0] tabular-nums hover:border-[#32323C] active:scale-[0.95] transition-all cursor-pointer"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          aria-label="Borrar"
          className="h-11 rounded-xl border border-[#24242B] bg-[#1C1C21] text-[#9A9AA6] flex items-center justify-center hover:text-[#F5F5F0] cursor-pointer"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>
    </div>
  )

  if (inline) {
    return <div className="flex items-center justify-center pt-1">{card}</div>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      {card}
    </div>
  )
}
