import {
  type ReputationState,
  type ReputationChange,
} from '../../types/reputation.types.js'

/**
 * Validates that a reputation state object has the correct structure
 */
export const isValidReputationState = (
  reputation: any
): reputation is ReputationState => {
  if (typeof reputation !== 'object' || reputation === null) {
    return false
  }

  // Check global reputation is a number
  if (typeof reputation.global !== 'number') {
    return false
  }

  // Check locations is an object with string keys and number values
  if (
    typeof reputation.locations !== 'object' ||
    reputation.locations === null
  ) {
    return false
  }

  for (const [location, value] of Object.entries(reputation.locations)) {
    if (typeof location !== 'string' || typeof value !== 'number') {
      return false
    }
  }

  // Check npcRelationships is an object with string keys and number values
  if (
    typeof reputation.npcRelationships !== 'object' ||
    reputation.npcRelationships === null
  ) {
    return false
  }

  for (const [npcId, value] of Object.entries(reputation.npcRelationships)) {
    if (typeof npcId !== 'string' || typeof value !== 'number') {
      return false
    }
  }

  return true
}

/**
 * Validates that a reputation change object has the correct structure
 */
export const isValidReputationChange = (
  change: any
): change is ReputationChange => {
  if (typeof change !== 'object' || change === null) {
    return false
  }

  // All fields are optional, but if present must be correct type
  if (change.global !== undefined && typeof change.global !== 'number') {
    return false
  }

  if (change.location !== undefined && typeof change.location !== 'string') {
    return false
  }

  if (
    change.locationChange !== undefined &&
    typeof change.locationChange !== 'number'
  ) {
    return false
  }

  if (change.npc !== undefined && typeof change.npc !== 'string') {
    return false
  }

  if (change.npcChange !== undefined && typeof change.npcChange !== 'number') {
    return false
  }

  if (change.reason !== undefined && typeof change.reason !== 'string') {
    return false
  }

  // Must have at least one change field
  const hasChange =
    change.global !== undefined ||
    (change.location !== undefined && change.locationChange !== undefined) ||
    (change.npc !== undefined && change.npcChange !== undefined)

  return hasChange
}

/**
 * Sanitizes reputation values to ensure they stay within reasonable bounds
 */
export const sanitizeReputationState = (
  reputation: ReputationState
): ReputationState => {
  const sanitized: ReputationState = {
    global: Math.max(-100, Math.min(100, reputation.global)),
    locations: {},
    npcRelationships: {},
  }

  // Sanitize location reputation values
  for (const [location, value] of Object.entries(reputation.locations)) {
    sanitized.locations[location] = Math.max(-100, Math.min(100, value))
  }

  // Sanitize NPC relationship values
  for (const [npcId, value] of Object.entries(reputation.npcRelationships)) {
    sanitized.npcRelationships[npcId] = Math.max(-100, Math.min(100, value))
  }

  return sanitized
}

/**
 * Creates a default reputation state
 */
export const createDefaultReputationState = (): ReputationState => ({
  global: 0,
  locations: {},
  npcRelationships: {},
})
