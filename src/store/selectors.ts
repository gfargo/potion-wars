import { ReputationManager } from '../core/reputation/ReputationManager.js'
import { type AppState, type Screen } from './appStore.js'

// ==========================================
// Screen Derivation Logic
// ==========================================

/**
 * Determines which screen should be active based on current state.
 * Priority order:
 * 1. Title/Loading (explicit UI states)
 * 2. Game Over (game state condition)
 * 3. Traveling (travel phase)
 * 4. Event/NPC overlay (renders within game screen)
 * 5. Default: Game
 */
export const selectActiveScreen = (state: AppState): Screen => {
  // 1. Title/Loading (explicit UI states)
  if (
    state.ui.activeScreen === 'title' ||
    state.ui.activeScreen === 'loading'
  ) {
    return state.ui.activeScreen
  }

  // 2. Game Over (game state condition)
  if (
    state.game.health <= 0 ||
    state.game.debt > 10_000 ||
    state.game.day > 30
  ) {
    return 'game-over'
  }

  // 3. Traveling (travel phase)
  if (state.travel.phase === 'animating') {
    return 'traveling'
  }

  // 4-5. Default: Game (will render event/npc overlays if needed)
  return 'game'
}

/**
 * Determines if MultiStepEventScreen should be shown
 */
export const selectShouldShowEvent = (state: AppState): boolean => {
  return state.events.current !== undefined && state.events.phase !== 'acknowledged'
}

/**
 * Determines if NPCInteractionScreen should be shown
 */
export const selectShouldShowNPC = (state: AppState): boolean => {
  return state.npc.current !== undefined
}

/**
 * Determines if quit confirmation menu should be shown
 */
export const selectShouldShowQuitMenu = (state: AppState): boolean => {
  return state.ui.quitConfirmation
}

/**
 * Determines if help screen should be shown
 */
export const selectShouldShowHelp = (state: AppState): boolean => {
  return state.ui.showHelp
}

// ==========================================
// Game State Selectors
// ==========================================

// Player Stats
export const selectHealth = (state: AppState): number => state.game.health
export const selectCash = (state: AppState): number => state.game.cash
export const selectDebt = (state: AppState): number => state.game.debt
export const selectDay = (state: AppState): number => state.game.day

export const selectDayInfo = (state: AppState) => ({
  current: state.game.day,
  total: 30,
  progress: (state.game.day / 30) * 100,
})

// Player Attributes
export const selectStrength = (state: AppState): number => state.game.strength
export const selectAgility = (state: AppState): number => state.game.agility
export const selectIntelligence = (state: AppState): number =>
  state.game.intelligence

export const selectPlayerLevel = (state: AppState): number =>
  Math.floor(
    (state.game.strength + state.game.agility + state.game.intelligence) / 3
  )

// Inventory and Prices
export const selectInventory = (state: AppState): Record<string, number> =>
  state.game.inventory
export const selectPrices = (state: AppState): Record<string, number> =>
  state.game.prices

export const selectPriceList = (state: AppState): Array<[string, number]> =>
  Object.entries(state.game.prices).sort((a, b) => a[0].localeCompare(b[0]))

export const selectItemQuantity = (state: AppState, itemName: string): number =>
  state.game.inventory[itemName] ?? 0

export const selectItemPrice = (state: AppState, itemName: string): number =>
  state.game.prices[itemName] ?? 0

export const selectAffordablePotions = (
  state: AppState,
  potions: string[]
): string[] =>
  potions.filter((potion) =>
    state.game.prices[potion]
      ? state.game.prices[potion] <= state.game.cash
      : false
  )

export const selectMaxAffordableQuantity = (
  state: AppState,
  itemName: string | undefined
): number => {
  if (!itemName || !state.game.prices[itemName]) {
    return 0
  }

  return Math.floor(state.game.cash / state.game.prices[itemName])
}

export const selectSellableItems = (
  state: AppState
): Array<{ name: string; quantity: number }> =>
  Object.entries(state.game.inventory)
    .filter(([_, amount]) => amount > 0)
    .map(([name, quantity]) => ({ name, quantity }))

export const selectMaxRepayableAmount = (state: AppState): number =>
  Math.min(state.game.cash, state.game.debt)

export const selectTotalCost = (
  state: AppState,
  itemName: string | undefined,
  quantity: number
): number => {
  if (!itemName || !state.game.prices[itemName]) {
    return 0
  }

  return quantity * state.game.prices[itemName]
}

export const selectCanAffordItem = (
  state: AppState,
  itemName: string,
  quantity = 1
): boolean => {
  const price = state.game.prices[itemName]
  if (price === undefined) return false
  return state.game.cash >= price * quantity
}

export const selectCanSellItem = (
  state: AppState,
  itemName: string,
  quantity = 1
): boolean => {
  const currentQuantity = state.game.inventory[itemName] ?? 0
  return currentQuantity >= quantity
}

// Location and Weather
export const selectLocation = (state: AppState) => state.game.location
export const selectLocationName = (state: AppState) => state.game.location.name
export const selectLocationDanger = (state: AppState) =>
  state.game.location.dangerLevel
export const selectLocationDescription = (state: AppState) =>
  state.game.location.description
export const selectWeather = (state: AppState) => state.game.weather

export const selectWeatherUI = (state: AppState) => {
  const { weather } = state.game
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

// Game Status
export const selectIsGameOver = (state: AppState): boolean =>
  state.game.day > 30 ||
  state.game.health <= 0 ||
  (state.game.cash <= 0 &&
    Object.values(state.game.inventory).every((v) => v === 0))

// ==========================================
// Event State Selectors
// ==========================================

export const selectCurrentEvent = (state: AppState) => state.events.current
export const selectCurrentEventStep = (state: AppState) =>
  state.events.currentStep
export const selectEventPhase = (state: AppState) => state.events.phase
export const selectEventQueue = (state: AppState) => state.events.queue
export const selectEventQueueLength = (state: AppState) =>
  state.events.queue.length
export const selectHasQueuedEvents = (state: AppState) =>
  state.events.queue.length > 0

// ==========================================
// Travel State Selectors
// ==========================================

export const selectTravelPhase = (state: AppState) => state.travel.phase
export const selectTravelDestination = (state: AppState) =>
  state.travel.destination
export const selectTravelOrigin = (state: AppState) => state.travel.origin
export const selectIsTraveling = (state: AppState) =>
  state.travel.phase === 'animating'

// ==========================================
// NPC State Selectors
// ==========================================

export const selectCurrentNPC = (state: AppState) => state.npc.current
export const selectCurrentNPCId = (state: AppState) => state.npc.current?.npcId
export const selectCurrentNPCType = (state: AppState) => state.npc.current?.type

// ==========================================
// Combat State Selectors
// ==========================================

export const selectActiveCombat = (state: AppState) => state.combat.active
export const selectIsInCombat = (state: AppState) =>
  state.combat.active !== undefined && state.combat.active.phase !== 'resolved'

// ==========================================
// Message Selectors
// ==========================================

export const selectMessages = (state: AppState) => state.messages
export const selectRecentMessages = (state: AppState, count: number) =>
  state.messages.slice(-count)
export const selectMessageCount = (state: AppState) => state.messages.length

// ==========================================
// Reputation Selectors
// ==========================================

export const selectReputation = (state: AppState) => state.game.reputation

export const selectGlobalReputation = (state: AppState): number =>
  state.game.reputation.global

export const selectLocationReputation = (
  state: AppState,
  location: string
): number => state.game.reputation.locations[location] ?? 0

export const selectCurrentLocationReputation = (state: AppState): number =>
  state.game.reputation.locations[state.game.location.name] ?? 0

export const selectNPCRelationship = (state: AppState, npcId: string): number =>
  state.game.reputation.npcRelationships[npcId] ?? 0

export const selectAllLocationReputations = (
  state: AppState
): Record<string, number> => state.game.reputation.locations

export const selectAllNPCRelationships = (
  state: AppState
): Record<string, number> => state.game.reputation.npcRelationships

// Computed Reputation Selectors
export const selectGlobalReputationLevel = (state: AppState) =>
  ReputationManager.getReputationLevel(state.game.reputation.global)

export const selectLocationReputationLevel = (
  state: AppState,
  location: string
) =>
  ReputationManager.getReputationLevel(
    state.game.reputation.locations[location] ?? 0
  )

export const selectCurrentLocationReputationLevel = (state: AppState) =>
  ReputationManager.getReputationLevel(
    state.game.reputation.locations[state.game.location.name] ?? 0
  )

export const selectReputationPriceModifier = (
  state: AppState,
  location?: string
) => {
  const reputation = location
    ? (state.game.reputation.locations[location] ?? 0)
    : (state.game.reputation.locations[state.game.location.name] ?? 0)
  return ReputationManager.calculatePriceModifier(reputation)
}

// ==========================================
// Market Data Selectors
// ==========================================

export const selectMarketData = (state: AppState) => state.game.marketData
export const selectTradeHistory = (state: AppState) => state.game.tradeHistory
export const selectRecentTrades = (state: AppState, count: number) =>
  state.game.tradeHistory.slice(-count)

// ==========================================
// UI State Selectors
// ==========================================

export const selectUIActiveScreen = (state: AppState) => state.ui.activeScreen
export const selectShowHelp = (state: AppState) => state.ui.showHelp
export const selectQuitConfirmation = (state: AppState) =>
  state.ui.quitConfirmation
export const selectCombatResult = (state: AppState) => state.ui.combatResult

// ==========================================
// Composite/Derived Selectors
// ==========================================

/**
 * Returns comprehensive game status for status displays
 */
export const selectGameStatus = (state: AppState) => ({
  day: state.game.day,
  cash: state.game.cash,
  debt: state.game.debt,
  health: state.game.health,
  location: state.game.location.name,
  weather: state.game.weather,
  reputation: state.game.reputation.global,
  isGameOver: selectIsGameOver(state),
})

/**
 * Returns player's complete profile
 */
export const selectPlayerProfile = (state: AppState) => ({
  name: state.game.playerName,
  level: selectPlayerLevel(state),
  strength: state.game.strength,
  agility: state.game.agility,
  intelligence: state.game.intelligence,
  reputation: state.game.reputation.global,
  reputationLevel: selectGlobalReputationLevel(state),
})

/**
 * Returns current inventory summary
 */
export const selectInventorySummary = (state: AppState) => {
  const items = Object.entries(state.game.inventory).filter(
    ([_, qty]) => qty > 0
  )
  const totalValue = items.reduce((sum, [name, qty]) => {
    return sum + (state.game.prices[name] || 0) * qty
  }, 0)

  return {
    items,
    totalItems: items.length,
    totalValue,
  }
}

/**
 * Returns available actions based on current state
 */
export const selectAvailableActions = (state: AppState) => {
  const isGameOver = selectIsGameOver(state)
  const hasEvent = selectShouldShowEvent(state)
  const hasNPC = selectShouldShowNPC(state)
  const isTraveling = selectIsTraveling(state)

  return {
    canBrew:
      !isGameOver &&
      !hasEvent &&
      !hasNPC &&
      !isTraveling &&
      state.game.cash > 0,
    canSell:
      !isGameOver &&
      !hasEvent &&
      !hasNPC &&
      !isTraveling &&
      selectSellableItems(state).length > 0,
    canTravel: !isGameOver && !hasEvent && !hasNPC && !isTraveling,
    canRepayDebt:
      !isGameOver &&
      !hasEvent &&
      !hasNPC &&
      !isTraveling &&
      state.game.debt > 0 &&
      state.game.cash > 0,
    canInteractNPC: !isGameOver && !hasEvent && !isTraveling,
  }
}
