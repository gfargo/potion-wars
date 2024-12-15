export type Enemy = {
  name: string
  health: number
  strength: number
  agility: number
  intelligence: number
}

export type CombatAction = 'attack' | 'defend' | 'use_potion'

export type CombatResult = {
  health: number
  cash: number
  inventory: Record<string, number>
  message: string
}
