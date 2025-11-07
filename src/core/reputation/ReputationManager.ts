import { type GameState } from '../../types/game.types.js'
import {
  type ReputationState,
  type ReputationChange,
  ReputationLevel,
  type ReputationModifier,
  type ReputationThreshold,
} from '../../types/reputation.types.js'

/**
 * ReputationManager handles all reputation-related calculations and state modifications
 * Provides methods for calculating price modifiers, reputation levels, and applying changes
 * Includes performance optimizations with memoization for expensive calculations
 */
export class ReputationManager {
  // Performance optimization caches
  private static readonly priceModifierCache = new Map<number, number>()
  private static readonly reputationLevelCache = new Map<
    number,
    ReputationLevel
  >()

  private static readonly locationReputationCache = new Map<string, number>()
  private static readonly npcReputationCache = new Map<string, number>()

  // Cache configuration
  private static readonly CACHE_SIZE_LIMIT = 1000

  // Reputation thresholds defining levels and their effects
  private static readonly REPUTATION_THRESHOLDS: ReputationThreshold[] = [
    {
      level: ReputationLevel.DESPISED,
      minValue: -Infinity,
      maxValue: -50,
      modifier: {
        priceMultiplier: 1.5, // 50% markup
        accessLevel: 0,
        encounterProbability: -0.3, // 30% more negative encounters
      },
    },
    {
      level: ReputationLevel.DISLIKED,
      minValue: -50,
      maxValue: -20,
      modifier: {
        priceMultiplier: 1.25, // 25% markup
        accessLevel: 1,
        encounterProbability: -0.15, // 15% more negative encounters
      },
    },
    {
      level: ReputationLevel.NEUTRAL,
      minValue: -20,
      maxValue: 20,
      modifier: {
        priceMultiplier: 1, // No change
        accessLevel: 2,
        encounterProbability: 0, // No change
      },
    },
    {
      level: ReputationLevel.LIKED,
      minValue: 20,
      maxValue: 50,
      modifier: {
        priceMultiplier: 0.9, // 10% discount
        accessLevel: 3,
        encounterProbability: 0.1, // 10% more positive encounters
      },
    },
    {
      level: ReputationLevel.RESPECTED,
      minValue: 50,
      maxValue: 80,
      modifier: {
        priceMultiplier: 0.8, // 20% discount
        accessLevel: 4,
        encounterProbability: 0.2, // 20% more positive encounters
      },
    },
    {
      level: ReputationLevel.REVERED,
      minValue: 80,
      maxValue: Infinity,
      modifier: {
        priceMultiplier: 0.7, // 30% discount
        accessLevel: 5,
        encounterProbability: 0.3, // 30% more positive encounters
      },
    },
  ]

  /**
   * Calculate price modifier based on reputation value
   * Uses memoization to cache results for better performance
   * @param reputation - The reputation value to calculate modifier for
   * @returns Price multiplier (1.0 = no change, <1.0 = discount, >1.0 = markup)
   */
  static calculatePriceModifier(reputation: number): number {
    // Check cache first
    const cached = this.priceModifierCache.get(reputation)
    if (cached !== undefined) {
      return cached
    }

    const threshold = this.getReputationThreshold(reputation)
    const modifier = threshold.modifier.priceMultiplier

    // Cache the result
    this.priceModifierCache.set(reputation, modifier)
    this.limitCacheSize(this.priceModifierCache)

    return modifier
  }

  /**
   * Get reputation level enum based on reputation value
   * Uses memoization to cache results for better performance
   * @param reputation - The reputation value to evaluate
   * @returns ReputationLevel enum value
   */
  static getReputationLevel(reputation: number): ReputationLevel {
    // Check cache first
    const cached = this.reputationLevelCache.get(reputation)
    if (cached !== undefined) {
      return cached
    }

    const threshold = this.getReputationThreshold(reputation)
    const { level } = threshold

    // Cache the result
    this.reputationLevelCache.set(reputation, level)
    this.limitCacheSize(this.reputationLevelCache)

    return level
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
  static applyReputationChange(
    state: GameState,
    change: ReputationChange
  ): GameState {
    const newReputation: ReputationState = {
      global: state.reputation.global,
      locations: { ...state.reputation.locations },
      npcRelationships: { ...state.reputation.npcRelationships },
    }

    // Apply global reputation change
    if (change.global !== undefined) {
      newReputation.global = this.clampReputation(
        newReputation.global + change.global
      )
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
      reputation: newReputation,
    }
  }

  /**
   * Get effective reputation for a specific location
   * Combines global reputation with location-specific reputation
   * Uses caching to improve performance for repeated calls
   * @param reputation - Current reputation state
   * @param location - Location name to get reputation for
   * @returns Effective reputation value for the location
   */
  static getLocationReputation(
    reputation: ReputationState,
    location: string
  ): number {
    const cacheKey = `${location}_${reputation.global}_${
      reputation.locations[location] || 0
    }`

    // Check cache first
    const cached = this.locationReputationCache.get(cacheKey)
    if (cached !== undefined) {
      return cached
    }

    const globalRep = reputation.global
    const locationRep = reputation.locations[location] || 0

    // Weight: 60% location-specific, 40% global
    const result = Math.round(locationRep * 0.6 + globalRep * 0.4)

    // Cache the result
    this.locationReputationCache.set(cacheKey, result)
    this.limitCacheSize(this.locationReputationCache)

    return result
  }

  /**
   * Get reputation with a specific NPC
   * Combines location reputation with NPC-specific relationship
   * Uses caching to improve performance for repeated calls
   * @param reputation - Current reputation state
   * @param npcId - NPC identifier
   * @param location - Location where NPC is encountered
   * @returns Effective reputation with the NPC
   */
  static getNPCReputation(
    reputation: ReputationState,
    npcId: string,
    location: string
  ): number {
    const locationRep = this.getLocationReputation(reputation, location)
    const npcRep = reputation.npcRelationships[npcId] || 0
    const cacheKey = `${npcId}_${location}_${locationRep}_${npcRep}`

    // Check cache first
    const cached = this.npcReputationCache.get(cacheKey)
    if (cached !== undefined) {
      return cached
    }

    // Weight: 70% NPC-specific, 30% location reputation
    const result = Math.round(npcRep * 0.7 + locationRep * 0.3)

    // Cache the result
    this.npcReputationCache.set(cacheKey, result)
    this.limitCacheSize(this.npcReputationCache)

    return result
  }

  /**
   * Calculate reputation change from a successful trade
   * @param tradeValue - Value of the trade in gold
   * @param isNPCTrade - Whether this was an NPC trade (higher reputation gain)
   * @returns Reputation change amount
   */
  static calculateTradeReputationGain(
    tradeValue: number,
    isNPCTrade = false
  ): number {
    const baseGain = Math.min(Math.floor(tradeValue / 100), 5) // 1 point per 100 gold, max 5
    const multiplier = isNPCTrade ? 1.5 : 1
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
  static meetsReputationRequirement(
    reputation: number,
    requirement: number
  ): boolean {
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
      npcRelationships: {},
    }
  }

  /**
   * Get reputation threshold for a given reputation value
   * @private
   * @param reputation - Reputation value to find threshold for
   * @returns ReputationThreshold object
   */
  private static getReputationThreshold(
    reputation: number
  ): ReputationThreshold {
    const threshold = this.REPUTATION_THRESHOLDS.find(
      (threshold) =>
        reputation >= threshold.minValue && reputation < threshold.maxValue
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

  /**
   * Clear all caches - useful for testing or when reputation system is reset
   */
  static clearCaches(): void {
    this.priceModifierCache.clear()
    this.reputationLevelCache.clear()
    this.locationReputationCache.clear()
    this.npcReputationCache.clear()
  }

  /**
   * Limit cache size to prevent memory leaks
   * @private
   * @param cache - The cache to limit
   */
  private static limitCacheSize(cache: Map<any, any>): void {
    if (cache.size > this.CACHE_SIZE_LIMIT) {
      // Remove oldest entries (first 20% of cache)
      const entries = [...cache.entries()]
      const toRemove = Math.floor(entries.length * 0.2)

      for (let i = 0; i < toRemove; i++) {
        const entry = entries[i]
        if (entry) {
          cache.delete(entry[0])
        }
      }
    }
  }
}
