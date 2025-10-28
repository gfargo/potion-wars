import { type GameState } from '../../types/game.types.js'
import { type NPC, type NPCTrade, type NPCTradeCondition } from '../../types/npc.types.js'
import { type TradeTransaction } from '../../types/economy.types.js'
import { ReputationManager } from '../reputation/ReputationManager.js'
import { EnhancedEconomyManager } from '../game/enhancedEconomy.js'

export class NPCTradingError extends Error {
  constructor(
    message: string,
    public code: 'INSUFFICIENT_FUNDS' | 'INSUFFICIENT_INVENTORY' | 'REPUTATION_TOO_LOW' | 'TRADE_UNAVAILABLE' | 'INVALID_TRADE',
    public tradeId?: string
  ) {
    super(message)
    this.name = 'NPCTradingError'
  }
}

export type NPCTradeOffer = {
  id: string
  npcId: string
  npcName: string
  type: 'buy' | 'sell' // From player's perspective
  itemName: string
  quantity: number
  pricePerUnit: number
  totalPrice: number
  reputationRequired: number
  available: boolean
  reason?: string // Why trade is unavailable
}

export type NPCTradeResult = {
  success: boolean
  transaction?: TradeTransaction
  reputationChange: number
  message: string
  newGameState: GameState
}

/**
 * NPCTrading handles all NPC trading functionality including:
 * - Generating trade offers based on NPC data and game state
 * - Validating trades against conditions and reputation
 * - Executing trades with inventory and cash updates
 * - Calculating reputation changes from trades
 */
export class NPCTrading {
  /**
   * Generate all available trade offers for an NPC
   */
  static generateTradeOffers(npc: NPC, gameState: GameState): NPCTradeOffer[] {
    if (!npc.trades || npc.trades.length === 0) {
      return []
    }

    const offers: NPCTradeOffer[] = []
    const npcReputation = ReputationManager.getNPCReputation(
      gameState.reputation,
      npc.id,
      npc.location
    )

    for (let i = 0; i < npc.trades.length; i++) {
      const trade = npc.trades[i]
      if (!trade) continue

      const offer = this.createTradeOffer(npc, trade, i, gameState, npcReputation)
      offers.push(offer)
    }

    return offers
  }

  /**
   * Create a single trade offer from NPC trade data
   */
  private static createTradeOffer(
    npc: NPC,
    trade: NPCTrade,
    index: number,
    gameState: GameState,
    npcReputation: number
  ): NPCTradeOffer {
    const tradeId = `${npc.id}_trade_${index}`
    const reputationRequired = trade.reputationRequirement || 0

    // Determine if this is a buy or sell offer from player's perspective
    // NPCs typically sell items to players, but can also buy from them
    const isBuyOffer = trade.price > 0 // Positive price means player buys from NPC
    const type: 'buy' | 'sell' = isBuyOffer ? 'buy' : 'sell'

    // Calculate reputation-adjusted price
    const reputationModifier = ReputationManager.calculatePriceModifier(npcReputation)
    const adjustedPricePerUnit = Math.floor(Math.abs(trade.price) * reputationModifier)
    const totalPrice = adjustedPricePerUnit * trade.quantity

    // Check availability
    const { available, reason } = this.checkTradeAvailability(
      trade,
      gameState,
      npcReputation,
      totalPrice,
      type
    )

    return {
      id: tradeId,
      npcId: npc.id,
      npcName: npc.name,
      type,
      itemName: trade.offer,
      quantity: trade.quantity,
      pricePerUnit: adjustedPricePerUnit,
      totalPrice,
      reputationRequired,
      available,
      reason
    }
  }

  /**
   * Check if a trade is available based on conditions and game state
   */
  private static checkTradeAvailability(
    trade: NPCTrade,
    gameState: GameState,
    npcReputation: number,
    totalPrice: number,
    type: 'buy' | 'sell'
  ): { available: boolean; reason?: string } {
    // Check reputation requirement
    if (trade.reputationRequirement && npcReputation < trade.reputationRequirement) {
      return {
        available: false,
        reason: `Requires reputation of ${trade.reputationRequirement} (you have ${npcReputation})`
      }
    }

    // Check trade conditions
    if (trade.conditions) {
      for (const condition of trade.conditions) {
        if (!this.evaluateTradeCondition(condition, gameState)) {
          return {
            available: false,
            reason: this.getConditionFailureReason(condition, gameState)
          }
        }
      }
    }

    // Check player resources for buy trades
    if (type === 'buy' && gameState.cash < totalPrice) {
      return {
        available: false,
        reason: `Insufficient funds (need ${totalPrice}, have ${gameState.cash})`
      }
    }

    // Check player inventory for sell trades
    if (type === 'sell') {
      const playerQuantity = gameState.inventory[trade.offer] || 0
      if (playerQuantity < trade.quantity) {
        return {
          available: false,
          reason: `Insufficient inventory (need ${trade.quantity}, have ${playerQuantity})`
        }
      }
    }

    return { available: true }
  }

  /**
   * Evaluate a trade condition against game state
   */
  private static evaluateTradeCondition(condition: NPCTradeCondition, gameState: GameState): boolean {
    let actualValue: number | string

    switch (condition.type) {
      case 'reputation':
        actualValue = gameState.reputation.global
        break
      case 'cash':
        actualValue = gameState.cash
        break
      case 'inventory':
        actualValue = gameState.inventory[condition.value as string] || 0
        break
      case 'day':
        actualValue = gameState.day
        break
      default:
        return false
    }

    return this.compareValues(actualValue, condition.operator, condition.value)
  }

  /**
   * Compare values using the specified operator
   */
  private static compareValues(
    actual: number | string,
    operator: string,
    expected: number | string
  ): boolean {
    switch (operator) {
      case 'gt':
        return actual > expected
      case 'lt':
        return actual < expected
      case 'eq':
        return actual === expected
      case 'gte':
        return actual >= expected
      case 'lte':
        return actual <= expected
      default:
        return false
    }
  }

  /**
   * Get human-readable reason for condition failure
   */
  private static getConditionFailureReason(condition: NPCTradeCondition, gameState: GameState): string {
    switch (condition.type) {
      case 'reputation':
        return `Requires reputation ${condition.operator} ${condition.value} (you have ${gameState.reputation.global})`
      case 'cash':
        return `Requires cash ${condition.operator} ${condition.value} (you have ${gameState.cash})`
      case 'inventory':
        const quantity = gameState.inventory[condition.value as string] || 0
        return `Requires ${condition.value} ${condition.operator} ${condition.value} (you have ${quantity})`
      case 'day':
        return `Requires day ${condition.operator} ${condition.value} (current day is ${gameState.day})`
      default:
        return 'Condition not met'
    }
  }

  /**
   * Execute a trade with an NPC
   */
  static executeTrade(
    offer: NPCTradeOffer,
    npc: NPC,
    gameState: GameState
  ): NPCTradeResult {
    try {
      // Validate trade is still available
      if (!offer.available) {
        throw new NPCTradingError(
          offer.reason || 'Trade is not available',
          'TRADE_UNAVAILABLE',
          offer.id
        )
      }

      // Double-check player resources
      if (offer.type === 'buy' && gameState.cash < offer.totalPrice) {
        throw new NPCTradingError(
          `Insufficient funds: need ${offer.totalPrice}, have ${gameState.cash}`,
          'INSUFFICIENT_FUNDS',
          offer.id
        )
      }

      if (offer.type === 'sell') {
        const playerQuantity = gameState.inventory[offer.itemName] || 0
        if (playerQuantity < offer.quantity) {
          throw new NPCTradingError(
            `Insufficient inventory: need ${offer.quantity}, have ${playerQuantity}`,
            'INSUFFICIENT_INVENTORY',
            offer.id
          )
        }
      }

      // Execute the trade
      let newGameState = { ...gameState }

      // Update cash
      if (offer.type === 'buy') {
        newGameState.cash -= offer.totalPrice
      } else {
        newGameState.cash += offer.totalPrice
      }

      // Update inventory
      const newInventory = { ...gameState.inventory }
      if (offer.type === 'buy') {
        newInventory[offer.itemName] = (newInventory[offer.itemName] || 0) + offer.quantity
      } else {
        newInventory[offer.itemName] = (newInventory[offer.itemName] || 0) - offer.quantity
        const currentQuantity = newInventory[offer.itemName]
        if (currentQuantity !== undefined && currentQuantity <= 0) {
          delete newInventory[offer.itemName]
        }
      }
      newGameState.inventory = newInventory

      // Calculate reputation change
      const reputationChange = ReputationManager.calculateTradeReputationGain(
        offer.totalPrice,
        true // This is an NPC trade
      )

      // Apply reputation change
      newGameState = ReputationManager.applyReputationChange(newGameState, {
        global: Math.floor(reputationChange * 0.3), // 30% to global
        location: npc.location,
        locationChange: Math.floor(reputationChange * 0.5), // 50% to location
        npc: npc.id,
        npcChange: reputationChange // 100% to NPC relationship
      })

      // Create transaction record
      const transaction: TradeTransaction = {
        day: gameState.day,
        location: npc.location,
        potionType: offer.itemName,
        quantity: offer.type === 'buy' ? offer.quantity : -offer.quantity,
        pricePerUnit: offer.pricePerUnit,
        totalValue: offer.totalPrice,
        type: offer.type,
        npcInvolved: npc.id,
        reputationChange
      }

      // Add transaction to history
      newGameState.tradeHistory = [...gameState.tradeHistory, transaction]

      // Update market data if trading potions
      const locationMarket = newGameState.marketData[npc.location]
      if (locationMarket && locationMarket[offer.itemName]) {
        const marketData = locationMarket[offer.itemName]
        if (marketData) {
          const updatedMarketData = EnhancedEconomyManager.recordTransaction(
            marketData,
            offer.type === 'buy' ? offer.quantity : -offer.quantity,
            gameState.day,
            true
          )
          locationMarket[offer.itemName] = updatedMarketData
        }
      }

      const message = this.generateTradeSuccessMessage(offer, npc, reputationChange)

      return {
        success: true,
        transaction,
        reputationChange,
        message,
        newGameState
      }
    } catch (error) {
      if (error instanceof NPCTradingError) {
        return {
          success: false,
          reputationChange: 0,
          message: error.message,
          newGameState: gameState
        }
      }

      return {
        success: false,
        reputationChange: 0,
        message: 'An unexpected error occurred during the trade',
        newGameState: gameState
      }
    }
  }

  /**
   * Generate success message for completed trade
   */
  private static generateTradeSuccessMessage(
    offer: NPCTradeOffer,
    npc: NPC,
    reputationChange: number
  ): string {
    const action = offer.type === 'buy' ? 'bought' : 'sold'
    const preposition = offer.type === 'buy' ? 'from' : 'to'
    
    let message = `You ${action} ${offer.quantity} ${offer.itemName} ${preposition} ${npc.name} for ${offer.totalPrice} gold.`
    
    if (reputationChange > 0) {
      message += ` Your reputation improved! (+${reputationChange})`
    }

    return message
  }

  /**
   * Get trade offers filtered by type
   */
  static getBuyOffers(npc: NPC, gameState: GameState): NPCTradeOffer[] {
    return this.generateTradeOffers(npc, gameState).filter(offer => offer.type === 'buy')
  }

  /**
   * Get trade offers filtered by type
   */
  static getSellOffers(npc: NPC, gameState: GameState): NPCTradeOffer[] {
    return this.generateTradeOffers(npc, gameState).filter(offer => offer.type === 'sell')
  }

  /**
   * Get available trade offers only
   */
  static getAvailableOffers(npc: NPC, gameState: GameState): NPCTradeOffer[] {
    return this.generateTradeOffers(npc, gameState).filter(offer => offer.available)
  }

  /**
   * Find a specific trade offer by ID
   */
  static findTradeOffer(npc: NPC, gameState: GameState, offerId: string): NPCTradeOffer | undefined {
    return this.generateTradeOffers(npc, gameState).find(offer => offer.id === offerId)
  }
}