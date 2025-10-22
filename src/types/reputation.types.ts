export type ReputationState = {
  global: number // Overall reputation across all locations
  locations: Record<string, number> // Location-specific reputation
  npcRelationships: Record<string, number> // Individual NPC relationships
}

export type ReputationChange = {
  global?: number
  location?: string
  locationChange?: number
  npc?: string
  npcChange?: number
  reason?: string // Optional reason for the change
}

export enum ReputationLevel {
  DESPISED = 'Despised',      // < -50
  DISLIKED = 'Disliked',      // -50 to -20
  NEUTRAL = 'Neutral',        // -20 to 20
  LIKED = 'Liked',            // 20 to 50
  RESPECTED = 'Respected',    // 50 to 80
  REVERED = 'Revered'         // > 80
}

export type ReputationModifier = {
  priceMultiplier: number // Multiplier applied to prices (0.5 = 50% discount, 1.5 = 50% markup)
  accessLevel: number // Level of access to exclusive content/NPCs
  encounterProbability: number // Modifier for positive/negative encounter chances
}

export type ReputationThreshold = {
  level: ReputationLevel
  minValue: number
  maxValue: number
  modifier: ReputationModifier
}