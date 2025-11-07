import { type GameState } from '../../types/game.types.js'
import {
  type SupplyDemandFactor,
  type MarketState,
} from '../../types/economy.types.js'
import { type ReputationChange } from '../../types/reputation.types.js'

export type RivalAlchemistType =
  | 'aggressive'
  | 'cunning'
  | 'merchant'
  | 'saboteur'

export type RivalAlchemistPersonality = {
  name: string
  description: string
  greeting: string
  victory: string
  defeat: string
  threat: string
  bribe: string
}

export type RivalEncounterType =
  | 'price_war'
  | 'sabotage'
  | 'theft'
  | 'competition'
  | 'negotiation'

export type RivalEncounterOutcome = {
  success: boolean
  reputationChange: ReputationChange
  cashChange: number
  inventoryChange?: Record<string, number>
  marketImpact?: SupplyDemandFactor[]
  message: string
}

export type RivalAlchemist = {
  id: string
  type: RivalAlchemistType
  personality: RivalAlchemistPersonality
  strength: number // 1-10, affects combat and competition outcomes
  cunning: number // 1-10, affects sabotage and negotiation
  wealth: number // 1-10, affects bribery and price wars
  reputation: number // Current reputation in the game world
  activeLocations: string[] // Locations where this rival is currently active
  lastEncounter?: number // Day of last encounter with player
  encounterHistory: RivalEncounterRecord[]
}

export type RivalEncounterRecord = {
  day: number
  location: string
  type: RivalEncounterType
  outcome: 'player_win' | 'rival_win' | 'draw'
  impact: string
}

export type RivalEncounterContext = {
  rival: RivalAlchemist
  location: string
  day: number
  playerReputation: number
  marketConditions: MarketState
}

export class RivalAlchemistManager {
  private static instance: RivalAlchemistManager
  private readonly rivals = new Map<string, RivalAlchemist>()

  static getInstance(): RivalAlchemistManager {
    RivalAlchemistManager.instance ||= new RivalAlchemistManager()
    return RivalAlchemistManager.instance
  }

  // Rival Management
  registerRival(rival: RivalAlchemist): void {
    this.rivals.set(rival.id, rival)
  }

  getRival(id: string): RivalAlchemist | undefined {
    return this.rivals.get(id)
  }

  getAllRivals(): RivalAlchemist[] {
    return [...this.rivals.values()]
  }

  // For testing purposes - clear all rivals
  clearAllRivals(): void {
    this.rivals.clear()
  }

  // Encounter Logic
  rollForRivalEncounter(
    location: string,
    gameState: GameState
  ): RivalAlchemist | undefined {
    const activeRivals = this.getActiveRivalsInLocation(location, gameState)

    if (activeRivals.length === 0) {
      return undefined
    }

    // Calculate encounter probability based on player reputation and rival activity
    const playerReputation = gameState.reputation.locations[location] || 0
    const baseEncounterChance = 0.15 // 15% base chance

    // Higher reputation attracts more rival attention
    const reputationModifier = Math.max(0, playerReputation / 100) * 0.1
    const encounterChance = baseEncounterChance + reputationModifier

    if (Math.random() < encounterChance) {
      // Weight selection by rival strength and recent activity
      const weightedRivals = activeRivals.map((rival) => ({
        rival,
        weight: this.calculateRivalWeight(rival, gameState),
      }))

      const totalWeight = weightedRivals.reduce(
        (sum, item) => sum + item.weight,
        0
      )
      const randomValue = Math.random() * totalWeight

      let currentWeight = 0
      for (const item of weightedRivals) {
        currentWeight += item.weight
        if (randomValue <= currentWeight) {
          return item.rival
        }
      }
    }

    return undefined
  }

  private getActiveRivalsInLocation(
    location: string,
    gameState: GameState
  ): RivalAlchemist[] {
    return this.getAllRivals().filter((rival) => {
      // Check if rival is active in this location
      if (!rival.activeLocations.includes(location)) {
        return false
      }

      // Avoid too frequent encounters with the same rival
      if (rival.lastEncounter && gameState.day - rival.lastEncounter < 3) {
        return false
      }

      return true
    })
  }

  private calculateRivalWeight(
    rival: RivalAlchemist,
    gameState: GameState
  ): number {
    let weight = 1

    // More aggressive rivals are more likely to encounter
    if (rival.type === 'aggressive') {
      weight *= 1.5
    } else if (rival.type === 'cunning') {
      weight *= 1.2
    }

    // Rivals with higher strength are more active
    weight *= rival.strength / 10 + 0.5

    // Recent losses make rivals more likely to seek revenge
    const recentLosses = rival.encounterHistory
      .filter((record) => gameState.day - record.day <= 7)
      .filter((record) => record.outcome === 'rival_win').length

    weight *= 1 + recentLosses * 0.3

    return weight
  }

  // Encounter Resolution
  resolveEncounter(
    context: RivalEncounterContext,
    encounterType: RivalEncounterType,
    playerChoice?: string
  ): RivalEncounterOutcome {
    switch (encounterType) {
      case 'price_war': {
        return this.resolvePriceWar(context, playerChoice)
      }

      case 'sabotage': {
        return this.resolveSabotage(context, playerChoice)
      }

      case 'theft': {
        return this.resolveTheft(context, playerChoice)
      }

      case 'competition': {
        return this.resolveCompetition(context, playerChoice)
      }

      case 'negotiation': {
        return this.resolveNegotiation(context, playerChoice)
      }

      default: {
        return this.resolveCompetition(context, playerChoice)
      }
    }
  }

  private resolvePriceWar(
    context: RivalEncounterContext,
    _playerChoice?: string
  ): RivalEncounterOutcome {
    const { rival, location } = context
    const playerWealthAdvantage = Math.random() * 0.4 + 0.3 // 30-70% chance based on player choice
    const rivalWealthFactor = rival.wealth / 10

    const playerWins = playerWealthAdvantage > rivalWealthFactor

    if (playerWins) {
      return {
        success: true,
        reputationChange: { location, locationChange: 5 },
        cashChange: -200, // Cost of price war
        marketImpact: [
          {
            type: 'rival',
            potionType: 'all',
            location,
            demandChange: 0.1,
            supplyChange: -0.05,
            duration: 3,
            startDay: context.day,
          },
        ],
        message: `You outmaneuvered ${rival.personality.name} in a price war! Your reputation improves, but it cost you gold.`,
      }
    }

    return {
      success: false,
      reputationChange: { location, locationChange: -3 },
      cashChange: -100,
      marketImpact: [
        {
          type: 'rival',
          potionType: 'all',
          location,
          demandChange: -0.05,
          supplyChange: 0.1,
          duration: 2,
          startDay: context.day,
        },
      ],
      message: `${rival.personality.name} undercut your prices! You lose reputation and gold in the failed price war.`,
    }
  }

  private resolveSabotage(
    context: RivalEncounterContext,
    _playerChoice?: string
  ): RivalEncounterOutcome {
    const { rival, location } = context
    const playerAwareness = Math.random() * 0.6 + 0.2 // 20-80% chance to detect
    const rivalCunning = rival.cunning / 10

    const playerDetects = playerAwareness > rivalCunning

    if (playerDetects) {
      return {
        success: true,
        reputationChange: { location, locationChange: 8 },
        cashChange: 0,
        message: `You caught ${rival.personality.name} trying to sabotage your operation! Your reputation soars as word spreads.`,
      }
    }

    const inventoryLoss: Record<string, number> = {}
    const potionTypes = [
      'Healing Potion',
      'Strength Potion',
      'Agility Potion',
      'Intelligence Potion',
    ]
    const lostPotion =
      potionTypes[Math.floor(Math.random() * potionTypes.length)]
    if (lostPotion) {
      inventoryLoss[lostPotion] = Math.floor(Math.random() * 3) + 1
    }

    return {
      success: false,
      reputationChange: { location, locationChange: -5 },
      cashChange: 0,
      inventoryChange: Object.fromEntries(
        Object.entries(inventoryLoss).map(([key, value]) => [key, -value])
      ),
      message: `${rival.personality.name} successfully sabotaged your supplies! You lost potions and reputation.`,
    }
  }

  private resolveTheft(
    context: RivalEncounterContext,
    _playerChoice?: string
  ): RivalEncounterOutcome {
    const { rival, location } = context
    const playerDefense = Math.random() * 0.5 + 0.3 // 30-80% chance to defend
    const rivalStrength = rival.strength / 10

    const playerDefends = playerDefense > rivalStrength

    if (playerDefends) {
      return {
        success: true,
        reputationChange: { location, locationChange: 6 },
        cashChange: 50, // Reward for catching thief
        message: `You caught ${rival.personality.name} red-handed! The authorities reward you and your reputation improves.`,
      }
    }

    const stolenAmount = Math.floor(Math.random() * 300) + 100

    return {
      success: false,
      reputationChange: { location, locationChange: -2 },
      cashChange: -stolenAmount,
      message: `${rival.personality.name} stole ${stolenAmount} gold from you! Your reputation suffers from the theft.`,
    }
  }

  private resolveCompetition(
    context: RivalEncounterContext,
    _playerChoice?: string
  ): RivalEncounterOutcome {
    const { rival, location, playerReputation } = context

    // Competition based on overall player performance vs rival stats
    const playerScore = playerReputation / 10 + Math.random() * 5
    const rivalScore =
      (rival.strength + rival.cunning + rival.wealth) / 3 + Math.random() * 3

    const playerWins = playerScore > rivalScore

    if (playerWins) {
      return {
        success: true,
        reputationChange: { location, locationChange: 10 },
        cashChange: 150,
        marketImpact: [
          {
            type: 'rival',
            potionType: 'all',
            location,
            demandChange: 0.15,
            supplyChange: -0.1,
            duration: 5,
            startDay: context.day,
          },
        ],
        message: `You outperformed ${rival.personality.name} in direct competition! Customers flock to you, boosting demand.`,
      }
    }

    return {
      success: false,
      reputationChange: { location, locationChange: -8 },
      cashChange: -75,
      marketImpact: [
        {
          type: 'rival',
          potionType: 'all',
          location,
          demandChange: -0.1,
          supplyChange: 0.05,
          duration: 3,
          startDay: context.day,
        },
      ],
      message: `${rival.personality.name} outshined you in competition! Your reputation and market position suffer.`,
    }
  }

  private resolveNegotiation(
    context: RivalEncounterContext,
    playerChoice?: string
  ): RivalEncounterOutcome {
    const { rival, location } = context

    // Negotiation success based on player choice and rival personality
    let successChance = 0.5

    if (playerChoice === 'bribe' && rival.type === 'merchant') {
      successChance = 0.8
    } else if (playerChoice === 'threaten' && rival.type === 'aggressive') {
      successChance = 0.3
    } else if (playerChoice === 'reason' && rival.type === 'cunning') {
      successChance = 0.7
    }

    const playerSucceeds = Math.random() < successChance

    if (playerSucceeds) {
      const cost = playerChoice === 'bribe' ? 200 : 0
      return {
        success: true,
        reputationChange: { location, locationChange: 3 },
        cashChange: -cost,
        message: `You successfully negotiated with ${rival.personality.name}! ${
          playerChoice === 'bribe'
            ? 'The bribe was expensive but effective.'
            : 'Your diplomatic skills paid off.'
        }`,
      }
    }

    return {
      success: false,
      reputationChange: { location, locationChange: -4 },
      cashChange: playerChoice === 'bribe' ? -100 : 0, // Partial loss if bribe failed
      message: `Negotiations with ${rival.personality.name} failed! ${
        playerChoice === 'threaten'
          ? 'Your threats backfired.'
          : 'They saw through your approach.'
      }`,
    }
  }

  // Market Impact
  calculateMarketImpact(
    rival: RivalAlchemist,
    location: string,
    day: number
  ): SupplyDemandFactor[] {
    const impacts: SupplyDemandFactor[] = []

    // Rivals generally increase competition, affecting supply
    impacts.push({
      type: 'rival',
      potionType: 'all',
      location,
      demandChange: -0.02, // Slight demand decrease due to competition
      supplyChange: 0.05, // Supply increase due to additional competitor
      duration: 7,
      startDay: day,
    })

    // Aggressive rivals have stronger market impact
    if (rival.type === 'aggressive') {
      impacts.push({
        type: 'rival',
        potionType: 'all',
        location,
        demandChange: -0.05,
        supplyChange: 0.1,
        duration: 5,
        startDay: day,
      })
    }

    return impacts
  }

  // Update rival state after encounter
  updateRivalAfterEncounter(
    rivalId: string,
    encounter: RivalEncounterRecord
  ): void {
    const rival = this.rivals.get(rivalId)
    if (!rival) return

    rival.lastEncounter = encounter.day
    rival.encounterHistory.push(encounter)

    // Adjust rival reputation based on outcome
    if (encounter.outcome === 'rival_win') {
      rival.reputation += 2
    } else if (encounter.outcome === 'player_win') {
      rival.reputation -= 1
    }

    // Limit encounter history to last 20 encounters
    if (rival.encounterHistory.length > 20) {
      rival.encounterHistory = rival.encounterHistory.slice(-20)
    }

    this.rivals.set(rivalId, rival)
  }

  // Determine encounter type based on rival and context
  determineEncounterType(
    rival: RivalAlchemist,
    _context: RivalEncounterContext
  ): RivalEncounterType {
    const encounterTypes: RivalEncounterType[] = []

    // Base encounter types available to all rivals
    encounterTypes.push('competition', 'negotiation')

    // Type-specific encounter types
    switch (rival.type) {
      case 'aggressive': {
        encounterTypes.push('theft', 'competition')
        break
      }

      case 'cunning': {
        encounterTypes.push('sabotage', 'negotiation')
        break
      }

      case 'merchant': {
        encounterTypes.push('price_war', 'negotiation')
        break
      }

      case 'saboteur': {
        encounterTypes.push('sabotage', 'theft')
        break
      }
    }

    // Weight by rival stats
    const weights: Record<RivalEncounterType, number> = {
      price_war: rival.wealth / 10,
      sabotage: rival.cunning / 10,
      theft: rival.strength / 10,
      competition: (rival.strength + rival.cunning) / 20,
      negotiation: rival.cunning / 15,
    }

    // Select weighted random encounter type
    const availableTypes = encounterTypes.filter((type) => weights[type] > 0)
    const totalWeight = availableTypes.reduce(
      (sum, type) => sum + weights[type],
      0
    )
    const randomValue = Math.random() * totalWeight

    let currentWeight = 0
    for (const type of availableTypes) {
      currentWeight += weights[type]
      if (randomValue <= currentWeight) {
        return type
      }
    }

    return 'competition' // Fallback
  }
}
