import { Calculator, Lock, Settings, Trophy, Users } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ActiveTab } from '../types/models'

interface LayoutProps {
  activeTab: ActiveTab
  coachUnlocked?: boolean
  onSelectTab: (tab: ActiveTab) => void
  children: ReactNode
}

const NAV_ITEMS: { id: ActiveTab; label: string; icon: typeof Trophy }[] = [
  { id: 'tournaments', label: 'Torneos', icon: Trophy },
  { id: 'teams', label: 'Equipos', icon: Users },
  { id: 'calc', label: 'Calc', icon: Calculator },
  { id: 'coach', label: 'Entrenador', icon: Lock },
  { id: 'settings', label: 'Ajustes', icon: Settings },
]

export function Layout({ activeTab, coachUnlocked = false, onSelectTab, children }: LayoutProps) {
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const maxHeightRef = useRef(typeof window !== 'undefined' ? window.innerHeight : 800)

  useEffect(() => {
    const handleResize = () => {
      const h = window.innerHeight
      if (h > maxHeightRef.current) {
        maxHeightRef.current = h
      }
      setKeyboardOpen(h < maxHeightRef.current - 150)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F5F5F0] flex flex-col md:flex-row">
      {/* Compact desktop sidebar */}
      <aside className="hidden md:flex md:w-20 lg:w-52 shrink-0 flex-col border-r border-[#24242B] bg-[#131316] py-5 px-2.5 lg:px-3 gap-1.5 sticky top-0 h-screen">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = activeTab === item.id
          const isCoachActive = active && item.id === 'coach' && coachUnlocked
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center justify-center lg:justify-start gap-3 rounded-xl px-3 min-h-[44px] text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer ${
                isCoachActive
                  ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30'
                  : active
                    ? 'bg-[#C8FF2E]/12 text-[#C8FF2E] border border-[#C8FF2E]/25'
                    : 'text-[#63636E] hover:text-[#F5F5F0] hover:bg-[#1C1C21] border border-transparent'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </button>
          )
        })}
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 min-w-0 pt-[env(safe-area-inset-top)] ${
          keyboardOpen ? 'pb-4' : 'pb-24'
        } md:pb-8`}
      >
        <div className="mx-auto max-w-2xl px-4 pt-4 md:pt-6">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      {!keyboardOpen && (
        <nav
          aria-label="Navegación principal"
          className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#24242B] bg-[#0A0A0C]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
        >
          <div className="grid grid-cols-5 h-16">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = activeTab === item.id
              const isCoachActive = active && item.id === 'coach' && coachUnlocked
              const activeColor = isCoachActive ? 'text-[#F59E0B]' : 'text-[#C8FF2E]'
              const barColor = isCoachActive ? 'bg-[#F59E0B]' : 'bg-[#C8FF2E]'

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`relative flex flex-col items-center justify-center gap-1 px-1 min-h-[44px] text-[10px] font-semibold transition-colors active:scale-[0.96] cursor-pointer ${
                    active ? activeColor : 'text-[#63636E]'
                  }`}
                >
                  {active && (
                    <span className={`absolute top-0 w-8 h-0.5 rounded-full ${barColor}`} />
                  )}
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate max-w-full">{item.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
