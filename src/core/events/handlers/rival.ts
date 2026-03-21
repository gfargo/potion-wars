import { type MultiStepEvent } from '../../../types/events.types.js'
import { type GameState } from '../../../types/game.types.js'
import {
    RivalAlchemistManager,
    RivalDataLoader,
    type RivalAlchemist,
    type RivalEncounterType,
} from '../../rivals/index.js'
import { ReputationManager } from '../../reputation/ReputationManager.js'
import { EnhancedEconomyManager } from '../../game/enhancedEconomy.js'

export class RivalEventHandler {
  private static instance: RivalEventHandler
  private readonly rivalManager: RivalAlchemistManager
  private readonly dataLoader: RivalDataLoader
  private initialized = false

  static getInstance(): RivalEventHandler {
    RivalEventHandler.instance ||= new RivalEventHandler()
    return RivalEventHandler.instance
  }

  constructor() {
    this.rivalManager = RivalAlchemistManager.getInstance()
    this.dataLoader = RivalDataLoader.getInstance()
  }

  initialize(): void {
    if (!this.initialized) {
      this.dataLoader.loadRivals()
      this.initialized = true
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.dataLoader.isLoaded()) {
      this.dataLoader.loadRivals()
      this.initialized = true
    }
  }

  checkForRivalEncounter(gameState: GameState): MultiStepEvent | undefined {
    this.ensureInitialized()

    const rival = this.rivalManager.rollForRivalEncounter(
      gameState.location.name,
      gameState
    )

    if (!rival) {
      return undefined
    }

    return this.createRivalEvent(rival, gameState)
  }

  // Create a multi-step event for rival encounters
  private createRivalEvent(
    rival: RivalAlchemist,
    gameState: GameState
  ): MultiStepEvent {
    const encounterType = this.rivalManager.determineEncounterType(rival, {
      rival,
      location: gameState.location.name,
      day: gameState.day,
      playerReputation:
        gameState.reputation.locations[gameState.location.name] || 0,
      marketConditions: gameState.marketData[gameState.location.name] || {},
    })

    const steps = this.generateRivalEventSteps(rival, encounterType, gameState)

    return {
      id: `rival_encounter_${rival.id}_${gameState.day}`,
      name: `Rival Encounter: ${rival.personality.name}`,
      description: rival.personality.greeting,
      probability: 1, // Already rolled for encounter
      locationSpecific: [gameState.location.name],
      type: 'negative', // Rival encounters are generally challenging
      steps,
    }
  }

  private generateRivalEventSteps(
    rival: RivalAlchemist,
    encounterType: RivalEncounterType,
    _gameState: GameState
  ): Array<{
    description: string
    choices: Array<{
      text: string
      effect: (state: GameState) => GameState
    }>
  }> {
    const steps = []

    // Step 1: Introduction and encounter type reveal
    const encounterChoices = this.getEncounterChoices(rival, encounterType)

    const mappedChoices = encounterChoices.map((choice) => ({
      text: choice.text,
      effect: (state: GameState) =>
        this.resolveRivalEncounter(
          state,
          rival,
          encounterType,
          choice.value || 'default'
        ),
    }))

    steps.push({
      description: this.getEncounterDescription(rival, encounterType),
      choices: mappedChoices,
    })

    return steps
  }

  private getEncounterDescription(
    _rival: RivalAlchemist,
    encounterType: RivalEncounterType
  ): string {
    // Don't duplicate the greeting - it's already in the event description
    // which gets logged as part of the event intro message
    switch (encounterType) {
      case 'price_war': {
        return `"I see you're trying to compete in MY market. Let's see who can offer better prices!"`
      }

      case 'sabotage': {
        return `You notice them lurking near your supplies with a suspicious look...`
      }

      case 'theft': {
        return `"Nice purse you have there. It would be a shame if something happened to it..."`
      }

      case 'competition': {
        return `"Let's settle this once and for all - a direct competition to see who's the better alchemist!"`
      }

      case 'negotiation': {
        return `"Perhaps we can come to some sort of... arrangement?"`
      }

      default: {
        return `They stand before you, ready for a confrontation.`
      }
    }
  }

  private getEncounterChoices(
    _rival: RivalAlchemist,
    encounterType: RivalEncounterType
  ): Array<{ text: string; value?: string }> {
    const choices: Array<{ text: string; value?: string }> = []

    switch (encounterType) {
      case 'price_war': {
        choices.push(
          { text: 'Accept the price war challenge', value: 'accept' },
          { text: 'Try to negotiate a truce', value: 'negotiate' },
          { text: 'Back down and leave', value: 'retreat' }
        )
        break
      }

      case 'sabotage': {
        choices.push(
          { text: 'Confront them directly', value: 'confront' },
          { text: 'Try to catch them in the act', value: 'watch' },
          { text: 'Ignore them and continue', value: 'ignore' }
        )
        break
      }

      case 'theft': {
        choices.push(
          { text: 'Stand your ground and fight', value: 'fight' },
          { text: 'Try to reason with them', value: 'reason' },
          { text: 'Offer a small bribe to leave you alone', value: 'bribe' }
        )
        break
      }

      case 'competition': {
        choices.push(
          { text: 'Accept the challenge', value: 'accept' },
          { text: 'Propose different terms', value: 'negotiate' },
          { text: 'Decline and walk away', value: 'decline' }
        )
        break
      }

      case 'negotiation': {
        choices.push(
          { text: 'Listen to their proposal', value: 'listen' },
          { text: 'Make a counter-offer', value: 'counter' },
          { text: 'Refuse to negotiate', value: 'refuse' }
        )
        break
      }

      default: {
        choices.push({ text: 'Continue', value: 'continue' })
      }
    }

    return choices
  }

  private resolveRivalEncounter(
    gameState: GameState,
    rival: RivalAlchemist,
    encounterType: RivalEncounterType,
    playerChoice: string
  ): GameState {
    const context = {
      rival,
      location: gameState.location.name,
      day: gameState.day,
      playerReputation:
        gameState.reputation.locations[gameState.location.name] || 0,
      marketConditions: gameState.marketData[gameState.location.name] || {},
    }

    const outcome = this.rivalManager.resolveEncounter(
      context,
      encounterType,
      playerChoice
    )

    // Apply the outcome to the game state
    let newState = { ...gameState }

    // Apply cash changes
    newState.cash += outcome.cashChange

    // Apply inventory changes
    if (outcome.inventoryChange) {
      newState.inventory = { ...newState.inventory }
      for (const [item, change] of Object.entries(outcome.inventoryChange)) {
        newState.inventory[item] = Math.max(
          0,
          (newState.inventory[item] || 0) + change
        )
      }
    }

    // Apply reputation changes
    if (outcome.reputationChange) {
      newState = ReputationManager.applyReputationChange(
        newState,
        outcome.reputationChange
      )
    }

    // Apply market impacts
    if (outcome.marketImpact) {
      newState = EnhancedEconomyManager.applySupplyDemandFactors(
        newState,
        outcome.marketImpact
      )
    }

    // Update rival state
    const encounterRecord = {
      day: gameState.day,
      location: gameState.location.name,
      type: encounterType,
      outcome: outcome.success
        ? ('player_win' as const)
        : ('rival_win' as const),
      impact: outcome.message,
    }
    this.rivalManager.updateRivalAfterEncounter(rival.id, encounterRecord)

    // Return the outcome message in the state so it can be displayed
    // Use type assertion since effect functions can return GameState with message
    return {
      ...newState,
      message: outcome.message,
    } as GameState
  }

  // Get all rivals active in a location (for UI display)
  getActiveRivalsInLocation(
    location: string,
    gameState: GameState
  ): RivalAlchemist[] {
    return this.rivalManager
      .getAllRivals()
      .filter(
        (rival) =>
          rival.activeLocations.includes(location) &&
          (!rival.lastEncounter || gameState.day - rival.lastEncounter >= 3)
      )
  }

  // Check if a specific rival is available for encounter
  isRivalAvailable(rivalId: string, gameState: GameState): boolean {
    const rival = this.rivalManager.getRival(rivalId)
    if (!rival) return false

    return (
      rival.activeLocations.includes(gameState.location.name) &&
      (!rival.lastEncounter || gameState.day - rival.lastEncounter >= 3)
    )
  }

  // Force an encounter with a specific rival (for testing or special events)
  forceRivalEncounter(
    rivalId: string,
    gameState: GameState
  ): MultiStepEvent | undefined {
    const rival = this.rivalManager.getRival(rivalId)
    if (!rival || !this.isRivalAvailable(rivalId, gameState)) {
      return undefined
    }

    return this.createRivalEvent(rival, gameState)
  }

  // Get rival information for display
  getRivalInfo(rivalId: string): RivalAlchemist | undefined {
    return this.rivalManager.getRival(rivalId)
  }

  // Calculate market impact from all active rivals in a location
  calculateLocationRivalImpact(
    location: string,
    gameState: GameState
  ): Array<{
    rival: RivalAlchemist
    impact: string
    severity: 'low' | 'medium' | 'high'
  }> {
    const activeRivals = this.getActiveRivalsInLocation(location, gameState)

    return activeRivals.map((rival) => {
      const recentEncounters = rival.encounterHistory.filter(
        (record) => gameState.day - record.day <= 7
      ).length

      let severity: 'low' | 'medium' | 'high' = 'low'
      let impact = `${rival.personality.name} is operating in the area.`

      if (recentEncounters > 2) {
        severity = 'high'
        impact = `${rival.personality.name} is very active and significantly affecting local trade.`
      } else if (recentEncounters > 0) {
        severity = 'medium'
        impact = `${rival.personality.name} has been seen recently and may be affecting prices.`
      }

      return { rival, impact, severity }
    })
  }
}
