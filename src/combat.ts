import { GameState } from './contexts/GameContext.js'

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

const generateEnemy = (playerLevel: number): Enemy => {
  const enemyTypes = [
    'Royal Guard',
    'Rival Alchemist',
    'Bandit',
    'Corrupt Merchant',
  ]
  const enemyName = enemyTypes[
    Math.floor(Math.random() * enemyTypes.length)
  ] as string

  return {
    name: enemyName,
    health: 50 + Math.floor(Math.random() * 50) + playerLevel * 5,
    strength: 5 + Math.floor(Math.random() * 5) + Math.floor(playerLevel / 2),
    agility: 5 + Math.floor(Math.random() * 5) + Math.floor(playerLevel / 2),
    intelligence:
      5 + Math.floor(Math.random() * 5) + Math.floor(playerLevel / 2),
  }
}

const calculateDamage = (
  attacker: { strength: number; agility: number },
  defender: { agility: number }
) => {
  const baseDamage = attacker.strength
  const hitChance = 0.5 + (attacker.agility - defender.agility) * 0.05
  return Math.random() < hitChance ? baseDamage : 0
}

const usePotionInCombat = (
  state: GameState,
  potionName: string
): [GameState, string] => {
  if (!state.inventory[potionName] || state.inventory[potionName] <= 0) {
    return [state, `You don't have any ${potionName} to use!`]
  }

  let newState = { ...state }
  let message = ''

  switch (potionName) {
    case 'Health Potion':
      newState.health = Math.min(100, newState.health + 30)
      message = 'You used a Health Potion and restored 30 health!'
      break
    case 'Strength Potion':
      newState.strength += 5
      message =
        'You used a Strength Potion and gained 5 strength for this battle!'
      break
    case 'Agility Potion':
      newState.agility += 5
      message =
        'You used an Agility Potion and gained 5 agility for this battle!'
      break
    default:
      return [state, `${potionName} cannot be used in combat!`]
  }

  newState.inventory = {
    ...newState.inventory,
    [potionName]: (newState.inventory[potionName] || 0) - 1,
  }

  return [newState, message]
}

export const handleCombat = (state: GameState): CombatResult => {
  const playerLevel = Math.floor(
    (state.strength + state.agility + state.intelligence) / 3
  )
  const enemy = generateEnemy(playerLevel)
  let combatLog = `You've encountered a ${enemy.name}!\n`

  let currentState = { ...state }
  let roundCount = 0

  while (currentState.health > 0 && enemy.health > 0 && roundCount < 10) {
    roundCount++
    combatLog += `\nRound ${roundCount}:\n`

    // Player's turn
    const playerAction: CombatAction =
      Math.random() < 0.7
        ? 'attack'
        : Math.random() < 0.5
        ? 'defend'
        : 'use_potion'

    switch (playerAction) {
      case 'attack':
        const playerDamage = calculateDamage(currentState, enemy)
        enemy.health -= playerDamage
        combatLog += `You attack and deal ${playerDamage} damage.\n`
        break
      case 'defend':
        currentState.agility += 2
        combatLog += `You take a defensive stance, increasing your agility by 2.\n`
        break
      case 'use_potion':
        const potions = Object.keys(currentState.inventory).filter((item) =>
          item.includes('Potion')
        )
        if (potions.length > 0) {
          const chosenPotion = potions[
            Math.floor(Math.random() * potions.length)
          ] as string
          const [newState, potionMessage] = usePotionInCombat(
            currentState,
            chosenPotion
          )
          currentState = newState
          combatLog += potionMessage + '\n'
        } else {
          combatLog += `You try to use a potion, but you don't have any!\n`
        }
        break
    }

    if (enemy.health <= 0) break

    // Enemy's turn
    const enemyDamage = calculateDamage(enemy, currentState)
    currentState.health -= enemyDamage
    combatLog += `${enemy.name} attacks and deals ${enemyDamage} damage.\n`
  }

  if (currentState.health <= 0) {
    combatLog += `\nYou were defeated by the ${enemy.name}!`
    const cashLost = Math.floor(currentState.cash * 0.2)
    const inventoryLost: Record<string, number> = {}

    for (const [potion, quantity] of Object.entries(currentState.inventory)) {
      inventoryLost[potion] = Math.floor(quantity * 0.3)
    }

    currentState.cash -= cashLost
    currentState.inventory = Object.fromEntries(
      Object.entries(currentState.inventory).map(([potion, quantity]) => [
        potion,
        quantity - (inventoryLost[potion] || 0),
      ])
    )

    combatLog += ` You lost ${cashLost} gold and some potions.`
  } else {
    combatLog += `\nYou defeated the ${enemy.name}!`
    const goldGained = Math.floor(Math.random() * 100) + 50
    currentState.cash += goldGained
    combatLog += ` You gained ${goldGained} gold.`
  }

  return {
    health: currentState.health,
    cash: currentState.cash,
    inventory: currentState.inventory,
    message: combatLog,
  }
}
