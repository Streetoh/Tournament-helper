export interface TeamColorOption {
  name: string
  hex: string
}

export const TEAM_COLORS: TeamColorOption[] = [
  { name: 'Azul', hex: '#3B82F6' },
  { name: 'Amarillo', hex: '#EAB308' },
  { name: 'Verde', hex: '#22C55E' },
  { name: 'Rojo', hex: '#EF4444' },
  { name: 'Naranja', hex: '#F97316' },
  { name: 'Morado', hex: '#A855F7' },
  { name: 'Cian', hex: '#06B6D4' },
  { name: 'Rosa', hex: '#EC4899' },
  { name: 'Lima', hex: '#84CC16' },
  { name: 'Gris', hex: '#94A3B8' },
]

export function getTeamColor(color?: string, fallbackIndex = 0): string {
  if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) {
    return color
  }
  return TEAM_COLORS[fallbackIndex % TEAM_COLORS.length].hex
}

export function getTeamBadgeStyle(color?: string, fallbackIndex = 0): {
  backgroundColor: string
  borderColor: string
  color: string
} {
  const hex = getTeamColor(color, fallbackIndex)
  return {
    backgroundColor: `${hex}26`,
    borderColor: `${hex}59`,
    color: hex,
  }
}
