import { type GameState } from '../../types/game.types.js'
import {
    type ReputationState,
    type ReputationChange,
    ReputationLevel,
    type ReputationModifier,
    type ReputationThreshold
} from '../../types/reputation.types.js'

/**
 * ReputationManager handles all reputation-related calculations and state modifications
 * Provides methods for calculating price modifiers, reputation levels, and applying changes
 */
export class ReputationManager {
  // Reputation thresholds defining levels and their effects
  private static readonly REPUTATION_THRESHOLDS: ReputationThreshold[] = [
    {
      level: ReputationLevel.DESPISED,
      minValue: -Infinity,
      maxValue: -50,
      modifier: {
        priceMultiplier: 1.5, // 50% markup
        accessLevel: 0,
        encounterProbability: -0.3 // 30% more negative encounters
      }
    },
    {
      level: ReputationLevel.DISLIKED,
      minValue: -50,
      maxValue: -20,
      modifier: {
        priceMultiplier: 1.25, // 25% markup
        accessLevel: 1,
        encounterProbability: -0.15 // 15% more negative encounters
      }
    },
    {
      level: ReputationLevel.NEUTRAL,
      minValue: -20,
      maxValue: 20,
      modifier: {
        priceMultiplier: 1.0, // No change
        accessLevel: 2,
        encounterProbability: 0 // No change
      }
    },
    {
      level: ReputationLevel.LIKED,
      minValue: 20,
      maxValue: 50,
      modifier: {
        priceMultiplier: 0.9, // 10% discount
        accessLevel: 3,
        encounterProbability: 0.1 // 10% more positive encounters
      }
    },
    {
      level: ReputationLevel.RESPECTED,
      minValue: 50,
      maxValue: 80,
      modifier: {
        priceMultiplier: 0.8, // 20% discount
        accessLevel: 4,
        encounterProbability: 0.2 // 20% more positive encounters
      }
    },
    {
      level: ReputationLevel.REVERED,
      minValue: 80,
      maxValue: Infinity,
      modifier: {
        priceMultiplier: 0.7, // 30% discount
        accessLevel: 5,
        encounterProbability: 0.3 // 30% more positive encounters
      }
    }
  ]

  /**
   * Calculate price modifier based on reputation value
   * @param reputation - The reputation value to calculate modifier for
   * @returns Price multiplier (1.0 = no change, <1.0 = discount, >1.0 = markup)
   */
  static calculatePriceModifier(reputation: number): number {
    const threshold = this.getReputationThreshold(reputation)
    return threshold.modifier.priceMultiplier
  }

  /**
   * Get reputation level enum based on reputation value
   * @param reputation - The reputation value to evaluate
   * @returns ReputationLevel enum value
   */
  static getReputationLevel(reputation: number): ReputationLevel {
    const threshold = this.getReputationThreshold(reputation)
    return threshold.level
  }

  /**
   * Get complete reputation modifier object for a reputation value
   * @param reputation - The reputation value to evaluate
   * @returns ReputationModifier with all effects
   */
  static getReputationModifier(reputation: number): ReputationModifier {
    const threshold = this.getReputationThreshold(reputation)
    return threshold.modifier
  }

  /**
   * Apply reputation change to game state
   * @param state - Current game state
   * @param change - Reputation change to apply
   * @returns Updated game state with reputation changes applied
   */
  static applyReputationChange(state: GameState, change: ReputationChange): GameState {
    const newReputation: ReputationState = {
      global: state.reputation.global,
      locations: { ...state.reputation.locations },
      npcRelationships: { ...state.reputation.npcRelationships }
    }

    // Apply global reputation change
    if (change.global !== undefined) {
      newReputation.global = this.clampReputation(newReputation.global + change.global)
    }

    // Apply location-specific reputation change
    if (change.location && change.locationChange !== undefined) {
      const currentLocationRep = newReputation.locations[change.location] || 0
      newReputation.locations[change.location] = this.clampReputation(
        currentLocationRep + change.locationChange
      )
    }

    // Apply NPC-specific reputation change
    if (change.npc && change.npcChange !== undefined) {
      const currentNpcRep = newReputation.npcRelationships[change.npc] || 0
      newReputation.npcRelationships[change.npc] = this.clampReputation(
        currentNpcRep + change.npcChange
      )
    }

    return {
      ...state,
      reputation: newReputation
    }
  }

  /**
   * Get effective reputation for a specific location
   * Combines global reputation with location-specific reputation
   * @param reputation - Current reputation state
   * @param location - Location name to get reputation for
   * @returns Effective reputation value for the location
   */
  static getLocationReputation(reputation: ReputationState, location: string): number {
    const globalRep = reputation.global
    const locationRep = reputation.locations[location] || 0
    
    // Weight: 60% location-specific, 40% global
    return Math.round(locationRep * 0.6 + globalRep * 0.4)
  }

  /**
   * Get reputation with a specific NPC
   * Combines location reputation with NPC-specific relationship
   * @param reputation - Current reputation state
   * @param npcId - NPC identifier
   * @param location - Location where NPC is encountered
   * @returns Effective reputation with the NPC
   */
  static getNPCReputation(reputation: ReputationState, npcId: string, location: string): number {
    const locationRep = this.getLocationReputation(reputation, location)
    const npcRep = reputation.npcRelationships[npcId] || 0
    
    // Weight: 70% NPC-specific, 30% location reputation
    return Math.round(npcRep * 0.7 + locationRep * 0.3)
  }

  /**
   * Calculate reputation change from a successful trade
   * @param tradeValue - Value of the trade in gold
   * @param isNPCTrade - Whether this was an NPC trade (higher reputation gain)
   * @returns Reputation change amount
   */
  static calculateTradeReputationGain(tradeValue: number, isNPCTrade: boolean = false): number {
    const baseGain = Math.min(Math.floor(tradeValue / 100), 5) // 1 point per 100 gold, max 5
    const multiplier = isNPCTrade ? 1.5 : 1.0
    return Math.round(baseGain * multiplier)
  }

  /**
   * Calculate reputation loss from negative actions
   * @param severity - Severity of the action (1-5)
   * @returns Reputation loss amount (negative number)
   */
  static calculateReputationLoss(severity: number): number {
    const clampedSeverity = Math.max(1, Math.min(5, severity))
    return -Math.round(clampedSeverity * 2 + Math.random() * clampedSeverity)
  }

  /**
   * Check if reputation meets minimum requirement
   * @param reputation - Reputation value to check
   * @param requirement - Minimum reputation required
   * @returns True if reputation meets requirement
   */
  static meetsReputationRequirement(reputation: number, requirement: number): boolean {
    return reputation >= requirement
  }

  /**
   * Get access level for current reputation
   * @param reputation - Reputation value to evaluate
   * @returns Access level (0-5)
   */
  static getAccessLevel(reputation: number): number {
    const threshold = this.getReputationThreshold(reputation)
    return threshold.modifier.accessLevel
  }

  /**
   * Get encounter probability modifier for reputation
   * @param reputation - Reputation value to evaluate
   * @returns Probability modifier (-1.0 to 1.0)
   */
  static getEncounterProbabilityModifier(reputation: number): number {
    const threshold = this.getReputationThreshold(reputation)
    return threshold.modifier.encounterProbability
  }

  /**
   * Initialize reputation state for new game
   * @returns Initial reputation state
   */
  static initializeReputation(): ReputationState {
    return {
      global: 0,
      locations: {},
      npcRelationships: {}
    }
  }

  /**
   * Get reputation threshold for a given reputation value
   * @private
   * @param reputation - Reputation value to find threshold for
   * @returns ReputationThreshold object
   */
  private static getReputationThreshold(reputation: number): ReputationThreshold {
    const threshold = this.REPUTATION_THRESHOLDS.find(
      threshold => reputation >= threshold.minValue && reputation < threshold.maxValue
    )
    return threshold ?? this.REPUTATION_THRESHOLDS[2]! // Default to NEUTRAL if not found
  }

  /**
   * Clamp reputation value to reasonable bounds
   * @private
   * @param reputation - Reputation value to clamp
   * @returns Clamped reputation value
   */
  private static clampReputation(reputation: number): number {
    return Math.max(-100, Math.min(100, Math.round(reputation)))
  }
}