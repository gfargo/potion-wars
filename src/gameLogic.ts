import { type Location, locations } from './constants.js'
import { generatePrices, triggerRandomEvent } from './gameData.js'

export type GameState = {
  day: number
  cash: number
  debt: number
  health: number
  strength: number
  agility: number
  intelligence: number
  location: Location
  inventory: Record<string, number>
  prices: Record<string, number>
}

export type CombatResult = {
  health: number
  cash: number
  inventory: Record<string, number>
  message: string
}

type Enemy = {
  name: string
  health: number
  strength: number
  agility: number
  intelligence: number
}

type CombatAction = 'attack' | 'defend' | 'use_potion'

export const brewPotion = (
  state: GameState,
  potionName: string,
  quantity: number
): [GameState, string] => {
  const price = state.prices[potionName]
  if (price === undefined) {
    return [state, 'Price is not available for this potion!']
  }

  const totalCost = price * quantity

  if (totalCost > state.cash) {
    return [state, "You don't have enough gold!"]
  }

  const newState = {
    ...state,
    cash: state.cash - totalCost,
    inventory: {
      ...state.inventory,
      [potionName]: (state.inventory[potionName] || 0) + quantity,
    },
  }
  return [newState, `Brewed ${quantity} ${potionName} for ${totalCost} gold`]
}

export const sellPotion = (
  state: GameState,
  potionName: string,
  quantity: number
): [GameState, string] => {
  if (!state.inventory[potionName] || state.inventory[potionName] < quantity) {
    return [state, "You don't have enough to sell!"]
  }

  const price = state.prices[potionName]
  if (price === undefined) {
    return [state, 'Price is not available for this potion!']
  }

  const totalEarned = price * quantity

  const newState = {
    ...state,
    cash: state.cash + totalEarned,
    inventory: {
      ...state.inventory,
      [potionName]: state.inventory[potionName] - quantity,
    },
  }
  return [newState, `Sold ${quantity} ${potionName} for ${totalEarned} gold`]
}

const generateEnemy = (playerLevel: number): Enemy => {
  const enemyTypes = ['Royal Guard', 'Rival Alchemist', 'Bandit', 'Corrupt Merchant']
  const enemyName = enemyTypes[Math.floor(Math.random() * enemyTypes.length)] || 'Unknown Enemy'
  
  return {
    name: enemyName,
    health: 50 + Math.floor(Math.random() * 50) + playerLevel * 5,
    strength: 5 + Math.floor(Math.random() * 5) + Math.floor(playerLevel / 2),
    agility: 5 + Math.floor(Math.random() * 5) + Math.floor(playerLevel / 2),
    intelligence: 5 + Math.floor(Math.random() * 5) + Math.floor(playerLevel / 2),
  }
}

const calculateDamage = (attacker: { strength: number, agility: number }, defender: { agility: number }) => {
  const baseDamage = attacker.strength
  const hitChance = 0.5 + (attacker.agility - defender.agility) * 0.05
  return Math.random() < hitChance ? baseDamage : 0
}

const usePotionInCombat = (state: GameState, potionName: string): [GameState, string] => {
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
      message = 'You used a Strength Potion and gained 5 strength for this battle!'
      break
    case 'Agility Potion':
      newState.agility += 5
      message = 'You used an Agility Potion and gained 5 agility for this battle!'
      break
    default:
      return [state, `${potionName} cannot be used in combat!`]
  }

  newState.inventory = {
    ...newState.inventory,
    [potionName]: (newState.inventory[potionName] ?? 0) - 1,
  }

  return [newState, message]
}

export const handleCombat = (state: GameState): CombatResult => {
  const playerLevel = Math.floor((state.strength + state.agility + state.intelligence) / 3)
  const enemy = generateEnemy(playerLevel)
  let combatLog = `You've encountered a ${enemy.name}!\n`

  let currentState = { ...state }
  let roundCount = 0

  while (currentState.health > 0 && enemy.health > 0 && roundCount < 10) {
    roundCount++
    combatLog += `\nRound ${roundCount}:\n`

    // Player's turn
    const playerAction: CombatAction = Math.random() < 0.7 ? 'attack' : (Math.random() < 0.5 ? 'defend' : 'use_potion')

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
        const potions = Object.keys(currentState.inventory).filter(item => item.includes('Potion'))
        if (potions.length > 0) {
          const chosenPotion = potions[Math.floor(Math.random() * potions.length)]
          if (chosenPotion) {
            const [newState, potionMessage] = usePotionInCombat(currentState, chosenPotion)
            currentState = newState
            combatLog += potionMessage + '\n'
          } else {
            combatLog += `You try to use a potion, but you don't have any!\n`
          }
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

export const travel = (
  state: GameState,
  newLocationName: string
): [GameState, string] => {
  const newLocation = locations.find((loc) => loc.name === newLocationName)
  if (!newLocation) {
    return [state, 'Invalid location!']
  }

  const newPrices = generatePrices()
  const eventResult = triggerRandomEvent({
    inventory: state.inventory,
    prices: newPrices,
    cash: state.cash,
    location: newLocation,
  })

  const newState = {
    ...state,
    location: newLocation,
    prices: eventResult.prices,
    inventory: eventResult.inventory,
    cash: eventResult.cash,
  }

  let message = `Traveled to ${newLocation.name}. ${newLocation.description}`
  if (eventResult.message) {
    message += ` ${eventResult.message}`
  }

  return [newState, message]
}


export const travelCombat = (state: GameState): [GameState, string | undefined] => {
  // Chance of combat encounter during travel based on location danger level
  if (Math.random() < state.location.dangerLevel / 20) {
    const combatResult = handleCombat(state)
    const newState = {
      ...state,
      health: combatResult.health,
      cash: combatResult.cash,
      inventory: combatResult.inventory,
    } as GameState
    return [newState, combatResult.message]
  }
  return [state, undefined]
}

export const repayDebt = (
  state: GameState,
  amount: number
): [GameState, string] => {
  if (amount > state.cash) {
    return [state, "You don't have enough gold to repay that much!"]

  }

  if (amount > state.debt) {
    return [state, "You're trying to repay more than you owe!"]
  }

  const newState = {
    ...state,
    cash: state.cash - amount,
    debt: state.debt - amount,
  }

  return [newState, `Repaid ${amount} gold of debt.`]
}

export const initializeGame = (): GameState => {
  const initialLocation = locations[Math.floor(Math.random() * locations.length)] as Location
  return {
    day: 1,
    cash: 2000,
    debt: 5000,
    health: 100,
    strength: Math.floor(Math.random() * 5) + 5,
    agility: Math.floor(Math.random() * 5) + 5,
    intelligence: Math.floor(Math.random() * 5) + 5,
    location: initialLocation,
    inventory: {},
    prices: generatePrices(),
  }
}

export const advanceDay = (
  state: GameState,
  options: { triggerEvent: boolean; triggerDebt: boolean } = {
    triggerEvent: true,
    triggerDebt: true,
  }
): [GameState, string] => {
  let newState = { ...state, day: state.day + 1 }
  let message = `Day ${newState.day}: `

  if (options.triggerEvent) {
    const eventResult = triggerRandomEvent(newState)
    newState = {
      ...newState,
      inventory: eventResult.inventory,
      prices: eventResult.prices,
      cash: eventResult.cash,
      location: eventResult.location,
    }
    message += eventResult.message || ''
  }

  if (options.triggerDebt) {
    // Apply daily interest to debt
    const newDebt = Math.floor(newState.debt * 1.1) // 10% daily interest
    newState.debt = newDebt
    message += ` Your debt has increased to ${newDebt} gold due to interest.`
  }

  return [newState, message]
}

export const isGameOver = (state: GameState): boolean => {
  return (
    state.day > 30 ||
    state.health <= 0 ||
    (state.cash <= 0 && Object.values(state.inventory).every((v) => v === 0))
  )
}




