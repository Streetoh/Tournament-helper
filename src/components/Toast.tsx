interface ToastProps {
  message: string | null
}

export function Toast({ message }: ToastProps) {
  if (!message) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="rounded-lg bg-[#141821] border border-[#232938] px-4 py-2 text-sm font-medium text-[#F1F5F9] shadow-xl">
        {message}
      </div>
    </div>
  )
}
