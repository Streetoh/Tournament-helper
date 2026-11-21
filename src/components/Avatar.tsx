interface AvatarProps {
  firstName: string
  lastName: string
  photoBase64?: string
  size?: 'sm' | 'md' | 'lg'
  ringColor?: string
}

export function Avatar({ firstName, lastName, photoBase64, size = 'md', ringColor }: AvatarProps) {
  const sizeClass =
    size === 'sm' ? 'h-9 w-9 text-xs' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-xs'

  const initials = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase() || '?'
  const ringStyle = ringColor ? { boxShadow: `0 0 0 1.5px ${ringColor}` } : undefined

  if (photoBase64) {
    return (
      <img
        src={photoBase64}
        alt={`${firstName} ${lastName}`.trim()}
        style={ringStyle}
        className={`${sizeClass} shrink-0 rounded-full object-cover border border-[#24242B] bg-[#1C1C21]`}
      />
    )
  }

  return (
    <div
      style={ringStyle}
      className={`${sizeClass} shrink-0 rounded-full border border-[#24242B] bg-[#1C1C21] text-[#9A9AA6] font-semibold flex items-center justify-center select-none`}
    >
      {initials}
    </div>
  )
}
