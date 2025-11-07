import { type GameState } from '../../types/game.types.js'
import { type NPC, type NPCInformation } from '../../types/npc.types.js'
import { NPCInformationManager } from './NPCInformationManager.js'
import { NPCMarketIntelligence } from './NPCMarketIntelligence.js'

export type InformationTier = 'basic' | 'detailed' | 'exclusive' | 'secret'

export type ReputationGate = {
  tier: InformationTier
  minimumReputation: number
  description: string
}

export type InformationReward = {
  baseReward: number
  categoryMultiplier: number
  tierMultiplier: number
  firstTimeBonus: number
}

export class NPCInformationReputation {
  // Reputation gates for different information tiers
  private static readonly REPUTATION_GATES: ReputationGate[] = [
    {
      tier: 'basic',
      minimumReputation: -20,
      description: 'Common knowledge available to most',
    },
    {
      tier: 'detailed',
      minimumReputation: 20,
      description: 'Trusted individuals get better details',
    },
    {
      tier: 'exclusive',
      minimumReputation: 50,
      description: 'Only well-respected people learn this',
    },
    {
      tier: 'secret',
      minimumReputation: 80,
      description: 'Reserved for the most trusted allies',
    },
  ]

  // Base rewards for receiving information
  private static readonly INFORMATION_REWARDS: Record<
    NPCInformation['category'],
    InformationReward
  > = {
    market: {
      baseReward: 2,
      categoryMultiplier: 1.5,
      tierMultiplier: 1.2,
      firstTimeBonus: 1,
    },
    event: {
      baseReward: 1,
      categoryMultiplier: 1,
      tierMultiplier: 1.1,
      firstTimeBonus: 2,
    },
    location: {
      baseReward: 1,
      categoryMultiplier: 1,
      tierMultiplier: 1.1,
      firstTimeBonus: 1,
    },
    general: {
      baseReward: 0.5,
      categoryMultiplier: 0.8,
      tierMultiplier: 1,
      firstTimeBonus: 0.5,
    },
  }

  /**
   * Get information tier based on reputation level
   */
  static getInformationTier(reputation: number): InformationTier {
    // Find the highest tier the player qualifies for
    for (let i = this.REPUTATION_GATES.length - 1; i >= 0; i--) {
      const gate = this.REPUTATION_GATES[i]!
      if (reputation >= gate.minimumReputation) {
        return gate.tier
      }
    }

    return 'basic' // Fallback
  }

  /**
   * Filter NPC information based on reputation gates
   */
  static filterInformationByReputation(
    npc: NPC,
    gameState: GameState
  ): NPCInformation[] {
    const locationReputation = gameState.reputation.locations[npc.location] || 0
    const globalReputation = gameState.reputation.global
    const npcReputation = gameState.reputation.npcRelationships[npc.id] || 0

    // Use the highest relevant reputation
    const effectiveReputation = Math.max(
      locationReputation,
      globalReputation * 0.5,
      npcReputation
    )

    // Get all NPC information and filter by effective reputation instead of using the base method
    if (!npc.information) {
      return []
    }

    return npc.information.filter((info) => {
      // Check reputation requirement against effective reputation
      const reputationRequirement = info.reputationRequirement || 0
      if (effectiveReputation < reputationRequirement) {
        return false
      }

      // Check other conditions using the base method logic
      if (info.conditions) {
        return NPCInformationManager.evaluateInformationConditions(
          info.conditions,
          gameState,
          npc.location
        )
      }

      return true
    })
  }

  /**
   * Enhance information content based on reputation quality
   */
  static enhanceInformationContent(
    information: NPCInformation,
    reputation: number,
    _npcId: string
  ): NPCInformation {
    const tier = this.getInformationTier(reputation)
    const enhancedContent = this.addReputationBasedDetails(
      information.content,
      tier,
      information.category
    )

    return {
      ...information,
      content: enhancedContent,
      id: `${information.id}_${tier}`, // Unique ID for enhanced version
    }
  }

  /**
   * Generate reputation-gated market intelligence
   */
  static generateReputationBasedMarketIntelligence(
    gameState: GameState,
    location: string,
    npcId: string
  ): NPCInformation[] {
    const locationReputation = gameState.reputation.locations[location] || 0
    const npcReputation = gameState.reputation.npcRelationships[npcId] || 0
    const effectiveReputation = Math.max(locationReputation, npcReputation)

    const tier = this.getInformationTier(effectiveReputation)
    const baseIntelligence = NPCMarketIntelligence.getLocationIntelligence(
      gameState,
      location
    )

    // Filter and enhance based on reputation
    const filteredIntelligence = baseIntelligence.filter((info) => {
      const requiredRep = info.reputationRequirement || 0
      return effectiveReputation >= requiredRep
    })

    // Add tier-specific enhancements
    return filteredIntelligence.map((info) =>
      this.enhanceMarketIntelligence(info, tier, gameState, location)
    )
  }

  /**
   * Calculate reputation reward for receiving information
   */
  static calculateInformationReputationReward(
    information: NPCInformation,
    _npcId: string,
    _gameState: GameState,
    isFirstTime = false
  ): number {
    const rewards = this.INFORMATION_REWARDS[information.category]
    const tier = this.getRequiredTier(information)
    const tierMultiplier = this.getTierMultiplier(tier)

    let reward =
      rewards.baseReward * rewards.categoryMultiplier * tierMultiplier

    // First time bonus
    if (isFirstTime) {
      reward += rewards.firstTimeBonus
    }

    // Bonus for exclusive information
    if (
      information.reputationRequirement &&
      information.reputationRequirement > 40
    ) {
      reward *= 1.5
    }

    return Math.round(reward)
  }

  /**
   * Apply reputation reward for information gathering
   */
  static applyInformationReward(
    gameState: GameState,
    npcId: string,
    information: NPCInformation,
    isFirstTime = false
  ): GameState {
    const reward = this.calculateInformationReputationReward(
      information,
      npcId,
      gameState,
      isFirstTime
    )

    if (reward <= 0) return gameState

    const npc = gameState.reputation.npcRelationships[npcId] || 0
    const location = gameState.location.name
    const locationRep = gameState.reputation.locations[location] || 0

    return {
      ...gameState,
      reputation: {
        ...gameState.reputation,
        global: gameState.reputation.global + reward * 0.1, // 10% goes to global
        locations: {
          ...gameState.reputation.locations,
          [location]: locationRep + reward * 0.7, // 70% goes to location
        },
        npcRelationships: {
          ...gameState.reputation.npcRelationships,
          [npcId]: npc + reward * 0.2, // 20% goes to NPC relationship
        },
      },
    }
  }

  /**
   * Check if player has accessed specific information before
   */
  static hasAccessedInformation(
    gameState: GameState,
    _informationId: string
  ): boolean {
    // This would typically check against a game state property tracking accessed information
    // For now, we'll use a simple heuristic based on reputation and day
    const daysSinceStart = gameState.day - 1
    const globalRep = gameState.reputation.global

    // Assume player has accessed basic information if they have some reputation and time has passed
    return daysSinceStart > 5 && globalRep > 10
  }

  /**
   * Get exclusive information opportunities based on high reputation
   */
  static getExclusiveOpportunities(
    gameState: GameState,
    location: string
  ): NPCInformation[] {
    const locationReputation = gameState.reputation.locations[location] || 0

    if (locationReputation < 60) return []

    const opportunities: NPCInformation[] = []

    // High reputation unlocks special market opportunities
    if (locationReputation >= 80) {
      opportunities.push({
        id: `exclusive_trader_${location}`,
        content: `A wealthy collector is secretly looking for rare potions. They pay 200% of market price but only deal with trusted alchemists.`,
        category: 'market',
        reputationRequirement: 80,
      })
    }

    if (locationReputation >= 70) {
      opportunities.push({
        id: `insider_info_${location}`,
        content: `The local guards are planning a crackdown on illegal brewing next week. Prices for legal potions will spike.`,
        category: 'event',
        reputationRequirement: 70,
      })
    }

    if (locationReputation >= 60) {
      opportunities.push({
        id: `safe_passage_${location}`,
        content: `I can arrange safe passage through dangerous areas for trusted friends. No risk of guard encounters.`,
        category: 'location',
        reputationRequirement: 60,
      })
    }

    return opportunities
  }

  /**
   * Get required tier for accessing information
   */
  private static getRequiredTier(information: NPCInformation): InformationTier {
    const repRequest = information.reputationRequirement || 0

    if (repRequest >= 80) return 'secret'
    if (repRequest >= 50) return 'exclusive'
    if (repRequest >= 20) return 'detailed'
    return 'basic'
  }

  /**
   * Get tier multiplier for rewards
   */
  private static getTierMultiplier(tier: InformationTier): number {
    switch (tier) {
      case 'basic': {
        return 1
      }

      case 'detailed': {
        return 1.2
      }

      case 'exclusive': {
        return 1.5
      }

      case 'secret': {
        return 2
      }

      default: {
        return 1
      }
    }
  }

  /**
   * Add reputation-based details to information content
   */
  private static addReputationBasedDetails(
    baseContent: string,
    tier: InformationTier,
    category: NPCInformation['category']
  ): string {
    switch (tier) {
      case 'basic': {
        return baseContent
      }

      case 'detailed': {
        return this.addDetailedContext(baseContent, category)
      }

      case 'exclusive': {
        return this.addExclusiveInsights(baseContent, category)
      }

      case 'secret': {
        return this.addSecretInformation(baseContent, category)
      }

      default: {
        return baseContent
      }
    }
  }

  /**
   * Add detailed context for trusted individuals
   */
  private static addDetailedContext(
    content: string,
    category: NPCInformation['category']
  ): string {
    const details = {
      market: ' The best time to act is within the next 2-3 days.',
      event: ' This information comes from a reliable source in the guard.',
      location: ' I can provide more specific directions if needed.',
      general: ' This is based on recent observations.',
    }

    return content + details[category]
  }

  /**
   * Add exclusive insights for well-respected individuals
   */
  private static addExclusiveInsights(
    content: string,
    category: NPCInformation['category']
  ): string {
    const insights = {
      market:
        ' Additionally, I know of a merchant who will pay 150% for quality goods.',
      event:
        ' Between you and me, this will affect three other locations as well.',
      location:
        " There's also a hidden cache of supplies there that few know about.",
      general: " I'll share the exact details since I trust you.",
    }

    return content + insights[category]
  }

  /**
   * Add secret information for most trusted allies
   */
  private static addSecretInformation(
    content: string,
    category: NPCInformation['category']
  ): string {
    const secrets = {
      market:
        " Here's something only my closest allies know: there's going to be a royal decree affecting potion trade next week.",
      event:
        ' This is highly confidential, but the event is orchestrated by rival alchemists trying to manipulate the market.',
      location:
        " I shouldn't tell you this, but there's a secret entrance that bypasses all the dangers.",
      general:
        " Since you're like family to me, I'll tell you the whole truth behind this situation.",
    }

    return content + secrets[category]
  }

  /**
   * Enhance market intelligence with reputation-based details
   */
  private static enhanceMarketIntelligence(
    intelligence: NPCInformation,
    tier: InformationTier,
    gameState: GameState,
    location: string
  ): NPCInformation {
    let enhancedContent = intelligence.content

    if (tier === 'detailed' || tier === 'exclusive' || tier === 'secret') {
      // Add specific price predictions
      const trends = NPCMarketIntelligence.generateMarketTrends(
        gameState,
        location
      )
      if (trends.length > 0) {
        const topTrend = trends[0]!
        enhancedContent += ` Specifically, expect ${topTrend.potion} to change by ${topTrend.priceChange}% ${topTrend.timeframe}.`
      }
    }

    if (tier === 'exclusive' || tier === 'secret') {
      // Add advice on timing
      enhancedContent +=
        ' The optimal time to act is during the morning hours when competition is lowest.'
    }

    if (tier === 'secret') {
      // Add insider knowledge
      enhancedContent +=
        ' I also know of a private buyer who pays premium prices for bulk orders.'
    }

    return {
      ...intelligence,
      content: enhancedContent,
    }
  }
}
