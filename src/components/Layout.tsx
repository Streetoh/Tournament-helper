import { Calculator, Lock, Settings, Trophy, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ActiveTab } from '../types/models'

interface LayoutProps {
  activeTab: ActiveTab
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

export function Layout({ activeTab, onSelectTab, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#F1F5F9] flex flex-col md:flex-row">
      {/* Compact desktop sidebar */}
      <aside className="hidden md:flex md:w-20 lg:w-48 shrink-0 flex-col border-r border-[#232938] bg-[#0E1118] py-5 px-2 lg:px-3 gap-1.5 sticky top-0 h-screen">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center justify-center lg:justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-[#3B82F6]/15 text-[#3B82F6]'
                  : 'text-[#64748B] hover:text-[#CBD5E1] hover:bg-[#141821]'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </button>
          )
        })}
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 pb-20 md:pb-6">
        <div className="mx-auto max-w-2xl px-4 pt-4 md:pt-6">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Navegación principal"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#232938] bg-[#0E1118]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-16">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium transition-colors cursor-pointer ${
                  active ? 'text-[#3B82F6]' : 'text-[#64748B]'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate max-w-full">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
