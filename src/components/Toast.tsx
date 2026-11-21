interface ToastProps {
  message: string | null
}

export function Toast({ message }: ToastProps) {
  if (!message) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="rounded-xl bg-[#1C1C21] border border-[#32323C] px-4 py-2 text-xs font-semibold text-[#F5F5F0] shadow-2xl">
        {message}
      </div>
    </div>
  )
}
