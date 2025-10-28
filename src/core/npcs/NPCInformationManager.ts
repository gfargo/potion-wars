import { type GameState } from '../../types/game.types.js'
import { type NPC, type NPCInformation, type NPCInformationCondition } from '../../types/npc.types.js'

export class NPCInformationError extends Error {
  constructor(
    message: string,
    public code: 'INFORMATION_NOT_FOUND' | 'ACCESS_DENIED' | 'INVALID_CONDITION',
    public informationId?: string
  ) {
    super(message)
    this.name = 'NPCInformationError'
  }
}

export class NPCInformationManager {
  /**
   * Get all available information from an NPC based on current game state
   */
  static getAvailableInformation(npc: NPC, gameState: GameState): NPCInformation[] {
    if (!npc.information) {
      return []
    }

    return npc.information.filter(info => 
      this.isInformationAvailable(info, gameState, npc.location)
    )
  }

  /**
   * Get information by category from an NPC
   */
  static getInformationByCategory(
    npc: NPC, 
    category: NPCInformation['category'], 
    gameState: GameState
  ): NPCInformation[] {
    const availableInfo = this.getAvailableInformation(npc, gameState)
    return availableInfo.filter(info => info.category === category)
  }

  /**
   * Check if specific information is available to the player
   */
  static isInformationAvailable(
    information: NPCInformation, 
    gameState: GameState, 
    npcLocation: string
  ): boolean {
    // Check reputation requirement
    if (information.reputationRequirement !== undefined) {
      const locationReputation = gameState.reputation.locations[npcLocation] || 0
      if (locationReputation < information.reputationRequirement) {
        return false
      }
    }

    // Check additional conditions
    if (information.conditions) {
      return this.evaluateInformationConditions(information.conditions, gameState, npcLocation)
    }

    return true
  }

  /**
   * Evaluate information conditions against game state
   */
  static evaluateInformationConditions(
    conditions: NPCInformationCondition[], 
    gameState: GameState, 
    npcLocation: string
  ): boolean {
    return conditions.every(condition => 
      this.evaluateInformationCondition(condition, gameState, npcLocation)
    )
  }

  /**
   * Evaluate a single information condition
   */
  private static evaluateInformationCondition(
    condition: NPCInformationCondition, 
    gameState: GameState, 
    npcLocation: string
  ): boolean {
    let actualValue: number | string

    switch (condition.type) {
      case 'reputation':
        actualValue = gameState.reputation.locations[npcLocation] || 0
        break
      case 'cash':
        actualValue = gameState.cash
        break
      case 'inventory':
        if (!condition.item) {
          throw new NPCInformationError(
            'Inventory condition requires item property',
            'INVALID_CONDITION'
          )
        }
        actualValue = gameState.inventory[condition.item] || 0
        break
      case 'day':
        actualValue = gameState.day
        break
      case 'location':
        actualValue = gameState.location.name
        break
      default:
        throw new NPCInformationError(
          `Unknown condition type: ${condition.type}`,
          'INVALID_CONDITION'
        )
    }

    return this.compareValues(actualValue, condition.operator, condition.value)
  }

  /**
   * Compare values using the specified operator
   */
  private static compareValues(actual: number | string, operator: string, expected: number | string): boolean {
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
        throw new NPCInformationError(
          `Unknown operator: ${operator}`,
          'INVALID_CONDITION'
        )
    }
  }

  /**
   * Get information quality level based on reputation
   * Higher reputation provides more detailed/valuable information
   */
  static getInformationQuality(reputation: number): 'basic' | 'detailed' | 'exclusive' {
    if (reputation >= 50) {
      return 'exclusive'
    } else if (reputation >= 20) {
      return 'detailed'
    } else {
      return 'basic'
    }
  }

  /**
   * Filter information content based on quality level
   */
  static filterInformationByQuality(
    information: NPCInformation, 
    _quality: 'basic' | 'detailed' | 'exclusive'
  ): string {
    // For now, return the full content
    // In the future, this could be enhanced to provide different levels of detail
    return information.content
  }

  /**
   * Calculate reputation reward for receiving information
   */
  static calculateInformationReward(information: NPCInformation): number {
    // Base reward varies by category
    const baseRewards = {
      market: 2,
      event: 1,
      location: 1,
      general: 0.5
    }

    const baseReward = baseRewards[information.category] || 0

    // Higher reputation requirement = higher reward
    const reputationMultiplier = information.reputationRequirement 
      ? Math.max(1, information.reputationRequirement / 20)
      : 1

    return Math.round(baseReward * reputationMultiplier)
  }

  /**
   * Validate information data structure
   */
  static validateInformation(information: NPCInformation): string[] {
    const errors: string[] = []

    if (!information.id || information.id.trim() === '') {
      errors.push('Information must have a valid ID')
    }

    if (!information.content || information.content.trim() === '') {
      errors.push('Information must have content')
    }

    if (!['market', 'event', 'location', 'general'].includes(information.category)) {
      errors.push('Information must have a valid category')
    }

    if (information.reputationRequirement !== undefined && information.reputationRequirement < -100) {
      errors.push('Reputation requirement cannot be less than -100')
    }

    // Validate conditions if present
    if (information.conditions) {
      for (const condition of information.conditions) {
        if (!['reputation', 'cash', 'inventory', 'day', 'location'].includes(condition.type)) {
          errors.push(`Invalid condition type: ${condition.type}`)
        }

        if (!['gt', 'lt', 'eq', 'gte', 'lte'].includes(condition.operator)) {
          errors.push(`Invalid condition operator: ${condition.operator}`)
        }

        if (condition.value === undefined || condition.value === null) {
          errors.push('Condition must have a value')
        }
      }
    }

    return errors
  }
}