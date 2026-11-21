interface AvatarProps {
  firstName: string
  lastName: string
  photoBase64?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Avatar({ firstName, lastName, photoBase64, size = 'md' }: AvatarProps) {
  const sizeClass =
    size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-xs'

  const initials = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase() || '?'

  if (photoBase64) {
    return (
      <img
        src={photoBase64}
        alt={`${firstName} ${lastName}`.trim()}
        className={`${sizeClass} shrink-0 rounded-full object-cover border border-[#232938] bg-[#1C2230]`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} shrink-0 rounded-full border border-[#232938] bg-[#1C2230] text-[#94A3B8] font-semibold flex items-center justify-center select-none`}
    >
      {initials}
    </div>
  )
}
