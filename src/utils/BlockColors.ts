// Утилита для получения цвета блока (для UI)

export function getBlockColor(id: number): string {
  if (id === 1) return '#559955';      // Grass
  if (id === 2) return '#8B4513';      // Dirt
  if (id === 3) return '#808080';      // Stone
  if (id === 5) return '#654321';      // Wood
  if (id === 6) return '#228B22';      // Leaves
  if (id === 7) return '#C29A6B';      // Planks
  if (id === 8) return '#654321';      // Stick
  if (id === 9) return '#a05a2b';      // Crafting Table
  if (id >= 20) return 'transparent';  // Tools
  return '#fff';                       // Default
}

