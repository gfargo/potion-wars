import { type Enemy } from '../../types/combat.types.js'

export const generateEnemy = (playerLevel: number): Enemy => {
  const enemyTypes = [
    'Royal Guard',
    'Rival Alchemist',
    'Bandit',
    'Corrupt Merchant',
  ]
  const enemyName = enemyTypes[Math.floor(Math.random() * enemyTypes.length)]!

  return {
    name: enemyName,
    health: 50 + Math.floor(Math.random() * 50) + playerLevel * 5,
    strength: 5 + Math.floor(Math.random() * 5) + Math.floor(playerLevel / 2),
    agility: 5 + Math.floor(Math.random() * 5) + Math.floor(playerLevel / 2),
    intelligence:
      5 + Math.floor(Math.random() * 5) + Math.floor(playerLevel / 2),
  }
}
