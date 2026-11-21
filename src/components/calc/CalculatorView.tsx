import { Delete } from 'lucide-react'
import { useState } from 'react'

type Operator = '+' | '-' | '×' | '÷'

interface HistoryEntry {
  expr: string
  result: string
}

export function CalculatorView() {
  const [display, setDisplay] = useState('0')
  const [previous, setPrevious] = useState<number | null>(null)
  const [operator, setOperator] = useState<Operator | null>(null)
  const [waitingNext, setWaitingNext] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const formatNum = (n: number): string => {
    if (!Number.isFinite(n)) return 'Error'
    const rounded = Math.round(n * 1e10) / 1e10
    return String(rounded)
  }

  const inputDigit = (digit: string) => {
    if (display === 'Error') {
      setDisplay(digit)
      setWaitingNext(false)
      return
    }
    if (waitingNext) {
      setDisplay(digit)
      setWaitingNext(false)
      return
    }
    setDisplay(display === '0' ? digit : display + digit)
  }

  const inputDecimal = () => {
    if (waitingNext) {
      setDisplay('0.')
      setWaitingNext(false)
      return
    }
    if (!display.includes('.')) {
      setDisplay(display + '.')
    }
  }

  const clearAll = () => {
    setDisplay('0')
    setPrevious(null)
    setOperator(null)
    setWaitingNext(false)
  }

  const backspace = () => {
    if (waitingNext || display === 'Error') return
    if (display.length <= 1 || (display.length === 2 && display.startsWith('-'))) {
      setDisplay('0')
    } else {
      setDisplay(display.slice(0, -1))
    }
  }

  const compute = (a: number, b: number, op: Operator): number => {
    switch (op) {
      case '+':
        return a + b
      case '-':
        return a - b
      case '×':
        return a * b
      case '÷':
        return b === 0 ? Number.NaN : a / b
    }
  }

  const handleOperator = (nextOp: Operator) => {
    const current = Number.parseFloat(display)
    if (Number.isNaN(current)) return

    if (previous !== null && operator && !waitingNext) {
      const result = compute(previous, current, operator)
      const formatted = formatNum(result)
      setDisplay(formatted)
      setPrevious(Number.isFinite(result) ? result : null)
    } else {
      setPrevious(current)
    }
    setOperator(nextOp)
    setWaitingNext(true)
  }

  const handleEquals = () => {
    if (previous === null || !operator) return
    const current = Number.parseFloat(display)
    if (Number.isNaN(current)) return

    const result = compute(previous, current, operator)
    const formatted = formatNum(result)
    setHistory((prev) => [{ expr: `${previous} ${operator} ${current}`, result: formatted }, ...prev].slice(0, 6))
    setDisplay(formatted)
    setPrevious(null)
    setOperator(null)
    setWaitingNext(true)
  }

  const handlePercent = () => {
    const current = Number.parseFloat(display)
    if (Number.isNaN(current)) return
    const val = previous !== null && operator ? (previous * current) / 100 : current / 100
    setDisplay(formatNum(val))
  }

  const handleToggleSign = () => {
    if (display === '0' || display === 'Error') return
    setDisplay(display.startsWith('-') ? display.slice(1) : `-${display}`)
  }

  const btnBase =
    'h-14 rounded-2xl border text-lg font-mono font-semibold tabular-nums flex items-center justify-center transition-transform active:scale-[0.96] cursor-pointer select-none'

  return (
    <div className="space-y-4">
      <h1 className="text-[26px] font-extrabold tracking-tight text-[#F5F5F0]">Calc</h1>

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-[#24242B] bg-[#131316] px-4 py-2.5 space-y-1 max-h-28 overflow-y-auto">
          {history.map((item, idx) => (
            <button
              key={`${item.expr}-${idx}`}
              type="button"
              onClick={() => setDisplay(item.result)}
              className="w-full flex items-center justify-between text-xs font-mono tabular-nums text-[#63636E] hover:text-[#F5F5F0] cursor-pointer"
            >
              <span>{item.expr}</span>
              <span className="font-bold text-[#9A9AA6]">= {item.result}</span>
            </button>
          ))}
        </div>
      )}

      {/* Display */}
      <div className="rounded-2xl border border-[#24242B] bg-[#131316] p-5 text-right space-y-1">
        <div className="h-5 text-sm font-mono text-[#9A9AA6] tabular-nums">
          {previous !== null && operator ? `${previous} ${operator}` : ''}
        </div>
        <div className="text-5xl font-mono font-bold tracking-tight text-[#F5F5F0] tabular-nums truncate">
          {display.replace('.', ',')}
        </div>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={clearAll}
          className={`${btnBase} bg-[#1C1C21] border-[#F43F5E]/25 text-[#F43F5E]`}
        >
          C
        </button>
        <button
          type="button"
          onClick={handleToggleSign}
          className={`${btnBase} bg-[#1C1C21] border-[#24242B] text-[#C8FF2E]`}
        >
          +/-
        </button>
        <button
          type="button"
          onClick={handlePercent}
          className={`${btnBase} bg-[#1C1C21] border-[#24242B] text-[#C8FF2E]`}
        >
          %
        </button>
        <button
          type="button"
          onClick={() => handleOperator('÷')}
          className={`${btnBase} ${
            operator === '÷' && waitingNext
              ? 'bg-[#C8FF2E] border-[#C8FF2E] text-[#0A0A0C]'
              : 'bg-[#1C1C21] border-[#24242B] text-[#C8FF2E]'
          }`}
        >
          ÷
        </button>

        {['7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => inputDigit(d)}
            className={`${btnBase} bg-[#131316] border-[#24242B] text-[#F5F5F0] hover:bg-[#1C1C21]`}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleOperator('×')}
          className={`${btnBase} ${
            operator === '×' && waitingNext
              ? 'bg-[#C8FF2E] border-[#C8FF2E] text-[#0A0A0C]'
              : 'bg-[#1C1C21] border-[#24242B] text-[#C8FF2E]'
          }`}
        >
          ×
        </button>

        {['4', '5', '6'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => inputDigit(d)}
            className={`${btnBase} bg-[#131316] border-[#24242B] text-[#F5F5F0] hover:bg-[#1C1C21]`}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleOperator('-')}
          className={`${btnBase} ${
            operator === '-' && waitingNext
              ? 'bg-[#C8FF2E] border-[#C8FF2E] text-[#0A0A0C]'
              : 'bg-[#1C1C21] border-[#24242B] text-[#C8FF2E]'
          }`}
        >
          -
        </button>

        {['1', '2', '3'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => inputDigit(d)}
            className={`${btnBase} bg-[#131316] border-[#24242B] text-[#F5F5F0] hover:bg-[#1C1C21]`}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleOperator('+')}
          className={`${btnBase} ${
            operator === '+' && waitingNext
              ? 'bg-[#C8FF2E] border-[#C8FF2E] text-[#0A0A0C]'
              : 'bg-[#1C1C21] border-[#24242B] text-[#C8FF2E]'
          }`}
        >
          +
        </button>

        <button
          type="button"
          onClick={() => inputDigit('0')}
          className={`${btnBase} bg-[#131316] border-[#24242B] text-[#F5F5F0] hover:bg-[#1C1C21]`}
        >
          0
        </button>
        <button
          type="button"
          onClick={inputDecimal}
          className={`${btnBase} bg-[#131316] border-[#24242B] text-[#F5F5F0] hover:bg-[#1C1C21]`}
        >
          ,
        </button>
        <button
          type="button"
          onClick={backspace}
          aria-label="Borrar"
          className={`${btnBase} bg-[#131316] border-[#24242B] text-[#9A9AA6] hover:bg-[#1C1C21]`}
        >
          <Delete className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleEquals}
          className={`${btnBase} bg-[#C8FF2E] border-[#C8FF2E] text-[#0A0A0C] font-bold hover:brightness-95`}
        >
          =
        </button>
      </div>
    </div>
  )
}
