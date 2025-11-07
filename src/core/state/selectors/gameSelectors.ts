import { type GameState } from '../../../types/game.types.js'
import { ReputationManager } from '../../reputation/ReputationManager.js'

// Player Stats
export const selectHealth = (state: GameState): number => state.health
export const selectCash = (state: GameState): number => state.cash
export const selectDebt = (state: GameState): number => state.debt
export const selectDay = (state: GameState): number => state.day
export const selectDayInfo = (state: GameState) => ({
  current: state.day,
  total: 30,
  progress: (state.day / 30) * 100,
})

// Player Attributes
export const selectStrength = (state: GameState): number => state.strength
export const selectAgility = (state: GameState): number => state.agility
export const selectIntelligence = (state: GameState): number =>
  state.intelligence

// Inventory and Prices
export const selectInventory = (state: GameState): Record<string, number> =>
  state.inventory
export const selectPrices = (state: GameState): Record<string, number> =>
  state.prices

export const selectPriceList = (state: GameState): Array<[string, number]> =>
  Object.entries(state.prices).sort((a, b) => a[0].localeCompare(b[0]))

export const selectItemQuantity = (
  state: GameState,
  itemName: string
): number => state.inventory[itemName] ?? 0

export const selectItemPrice = (state: GameState, itemName: string): number =>
  state.prices[itemName] ?? 0

export const selectAffordablePotions = (
  state: GameState,
  potions: string[]
): string[] =>
  potions.filter((potion) =>
    state.prices[potion] ? state.prices[potion] <= state.cash : false
  )

export const selectMaxAffordableQuantity = (
  state: GameState,
  itemName: string | undefined
): number => {
  if (!itemName || !state.prices[itemName]) {
    return 0
  }

  return Math.floor(state.cash / state.prices[itemName])
}

export const selectSellableItems = (
  state: GameState
): Array<{ name: string; quantity: number }> =>
  Object.entries(state.inventory)
    .filter(([_, amount]) => amount > 0)
    .map(([name, quantity]) => ({ name, quantity }))

export const selectMaxRepayableAmount = (state: GameState): number =>
  Math.min(state.cash, state.debt)

export const selectTotalCost = (
  state: GameState,
  itemName: string | undefined,
  quantity: number
): number => {
  if (!itemName || !state.prices[itemName]) {
    return 0
  }

  return quantity * state.prices[itemName]
}

// Location and Weather
export const selectLocation = (state: GameState) => state.location
export const selectLocationName = (state: GameState) => state.location.name
export const selectLocationDanger = (state: GameState) =>
  state.location.dangerLevel
export const selectLocationDescription = (state: GameState) =>
  state.location.description
export const selectWeather = (state: GameState) => state.weather

export const selectWeatherUI = (state: GameState) => {
  const { weather } = state
  const icons = {
    sunny: '☀️',
    rainy: '🌧️ ',
    stormy: '⛈️ ',
    windy: '💨',
    foggy: '🌁',
  }

  const colors = {
    sunny: 'yellow',
    rainy: 'blue',
    stormy: 'grey',
    windy: 'cyan',
    foggy: 'grey',
  }

  return {
    icon: icons[weather] ?? '❓',
    color: colors[weather] ?? 'white',
    text: weather,
  }
}

// Event State
export const selectCurrentEvent = (state: GameState) => state.currentEvent
export const selectCurrentEventStep = (state: GameState) => state.currentStep

// Game Status
export const selectIsGameOver = (state: GameState): boolean =>
  state.day > 30 ||
  state.health <= 0 ||
  (state.cash <= 0 && Object.values(state.inventory).every((v) => v === 0))

// Computed Values
export const selectPlayerLevel = (state: GameState): number =>
  Math.floor((state.strength + state.agility + state.intelligence) / 3)

export const selectCanAffordItem = (
  state: GameState,
  itemName: string,
  quantity = 1
): boolean => {
  const price = state.prices[itemName]
  if (price === undefined) return false
  return state.cash >= price * quantity
}

export const selectCanSellItem = (
  state: GameState,
  itemName: string,
  quantity = 1
): boolean => {
  const currentQuantity = state.inventory[itemName] ?? 0
  return currentQuantity >= quantity
}

// Reputation Selectors
export const selectReputation = (state: GameState) => state.reputation

export const selectGlobalReputation = (state: GameState): number =>
  state.reputation.global

export const selectLocationReputation = (
  state: GameState,
  location: string
): number => state.reputation.locations[location] ?? 0

export const selectCurrentLocationReputation = (state: GameState): number =>
  state.reputation.locations[state.location.name] ?? 0

export const selectNPCRelationship = (
  state: GameState,
  npcId: string
): number => state.reputation.npcRelationships[npcId] ?? 0

export const selectAllLocationReputations = (
  state: GameState
): Record<string, number> => state.reputation.locations

export const selectAllNPCRelationships = (
  state: GameState
): Record<string, number> => state.reputation.npcRelationships

// Computed Reputation Selectors
export const selectGlobalReputationLevel = (state: GameState) =>
  ReputationManager.getReputationLevel(state.reputation.global)

export const selectLocationReputationLevel = (
  state: GameState,
  location: string
) =>
  ReputationManager.getReputationLevel(
    state.reputation.locations[location] ?? 0
  )

export const selectCurrentLocationReputationLevel = (state: GameState) =>
  ReputationManager.getReputationLevel(
    state.reputation.locations[state.location.name] ?? 0
  )

export const selectReputationPriceModifier = (
  state: GameState,
  location?: string
) => {
  const reputation = location
    ? (state.reputation.locations[location] ?? 0)
    : (state.reputation.locations[state.location.name] ?? 0)
  return ReputationManager.calculatePriceModifier(reputation)
}
