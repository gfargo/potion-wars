export type Enemy = {
  name: string
  health: number
  strength: number
  agility: number
  intelligence: number
}

export type CombatAction = 'attack' | 'defend' | 'use_potion' | 'flee'

export type CombatResult = {
  health: number
  cash: number
  inventory: Record<string, number>
  message: string
}

export type CombatPhase = 'player_turn' | 'enemy_turn' | 'resolved'

export type ActiveCombat = {
  enemy: Enemy
  enemyMaxHealth: number
  round: number
  phase: CombatPhase
  log: string[]
  defendingThisRound: boolean
}
