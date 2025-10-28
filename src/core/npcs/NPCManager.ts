import { type NPC } from '../../types/npc.types.js'
import { type GameState } from '../../types/game.types.js'

export class NPCError extends Error {
  constructor(
    message: string,
    public code: 'NPC_NOT_FOUND' | 'INVALID_NPC_DATA' | 'ENCOUNTER_FAILED',
    public npcId?: string
  ) {
    super(message)
    this.name = 'NPCError'
  }
}

export class NPCManager {
  private static instance: NPCManager
  private npcs: Map<string, NPC> = new Map()
  
  // Performance optimization caches
  private locationNPCCache: Map<string, NPC[]> = new Map()
  private availabilityCache: Map<string, { result: boolean; gameStateHash: string }> = new Map()
  private encounterCache: Map<string, { npcs: NPC[]; gameStateHash: string }> = new Map()
  private cacheExpiry: Map<string, number> = new Map()
  
  // Cache configuration
  private static readonly CACHE_TTL = 5000 // 5 seconds
  private static readonly MAX_CACHE_SIZE = 100

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): NPCManager {
    if (!NPCManager.instance) {
      NPCManager.instance = new NPCManager()
    }
    return NPCManager.instance
  }

  /**
   * Register an NPC in the system
   */
  registerNPC(npc: NPC): void {
    if (!npc.id || !npc.name || !npc.location) {
      throw new NPCError(
        'Invalid NPC data: missing required fields',
        'INVALID_NPC_DATA',
        npc.id
      )
    }
    this.npcs.set(npc.id, npc)
  }

  /**
   * Get an NPC by ID
   */
  getNPC(id: string): NPC | undefined {
    return this.npcs.get(id)
  }

  /**
   * Get all NPCs for a specific location that are available given the current game state
   * Uses caching to improve performance for repeated calls
   */
  getNPCsForLocation(location: string, gameState: GameState): NPC[] {
    const gameStateHash = this.generateGameStateHash(gameState)
    const cacheKey = `${location}_${gameStateHash}`
    
    // Check cache first
    const cached = this.encounterCache.get(cacheKey)
    const now = Date.now()
    
    if (cached && this.isCacheValid(cacheKey, now)) {
      return cached.npcs
    }
    
    // Get location NPCs from cache or compute
    let locationNPCs = this.locationNPCCache.get(location)
    if (!locationNPCs) {
      locationNPCs = Array.from(this.npcs.values()).filter(npc => npc.location === location)
      this.locationNPCCache.set(location, locationNPCs)
    }
    
    // Filter by availability
    const availableNPCs = locationNPCs.filter(npc => this.isNPCAvailable(npc, gameState))
    
    // Cache the result
    this.cacheResult(cacheKey, { npcs: availableNPCs, gameStateHash }, now)
    
    return availableNPCs
  }

  /**
   * Roll for a random NPC encounter in the given location
   * Returns null if no encounter occurs
   */
  rollForEncounter(location: string, gameState: GameState): NPC | null {
    const availableNPCs = this.getNPCsForLocation(location, gameState)
    
    if (availableNPCs.length === 0) {
      return null
    }

    // Calculate total probability weight
    let totalWeight = 0
    for (const npc of availableNPCs) {
      totalWeight += npc.availability.probability
    }

    if (totalWeight === 0) {
      return null
    }

    // Roll for encounter
    const roll = Math.random() * totalWeight
    let currentWeight = 0

    for (const npc of availableNPCs) {
      currentWeight += npc.availability.probability
      if (roll <= currentWeight) {
        return npc
      }
    }

    return null
  }

  /**
   * Check if an NPC is available based on current game state
   * Uses caching to improve performance for repeated availability checks
   */
  isNPCAvailable(npc: NPC, gameState: GameState): boolean {
    const gameStateHash = this.generateGameStateHash(gameState)
    const cacheKey = `${npc.id}_availability_${gameStateHash}`
    
    // Check cache first
    const cached = this.availabilityCache.get(cacheKey)
    const now = Date.now()
    
    if (cached && this.isCacheValid(cacheKey, now)) {
      return cached.result
    }
    
    const availability = npc.availability
    let isAvailable = true

    // Check time restrictions
    if (availability.timeRestriction) {
      const [minDay, maxDay] = availability.timeRestriction
      if (gameState.day < minDay || gameState.day > maxDay) {
        isAvailable = false
      }
    }

    // Check weather restrictions
    if (isAvailable && availability.weatherRestriction) {
      if (!availability.weatherRestriction.includes(gameState.weather)) {
        isAvailable = false
      }
    }

    // Check reputation gate
    if (isAvailable && availability.reputationGate !== undefined) {
      const locationReputation = gameState.reputation.locations[npc.location] || 0
      if (locationReputation < availability.reputationGate) {
        isAvailable = false
      }
    }

    // Check NPC-specific reputation requirements
    if (isAvailable && npc.reputation.minimum !== undefined) {
      const relevantReputation = npc.reputation.location 
        ? gameState.reputation.locations[npc.reputation.location] || 0
        : gameState.reputation.global
      
      if (relevantReputation < npc.reputation.minimum) {
        isAvailable = false
      }
    }

    if (isAvailable && npc.reputation.maximum !== undefined) {
      const relevantReputation = npc.reputation.location 
        ? gameState.reputation.locations[npc.reputation.location] || 0
        : gameState.reputation.global
      
      if (relevantReputation > npc.reputation.maximum) {
        isAvailable = false
      }
    }

    // Cache the result
    this.availabilityCache.set(cacheKey, { result: isAvailable, gameStateHash })
    this.cacheExpiry.set(cacheKey, now + NPCManager.CACHE_TTL)
    
    // Clean up cache if it gets too large
    this.cleanupCache()

    return isAvailable
  }

  /**
   * Get all registered NPCs
   */
  getAllNPCs(): NPC[] {
    return Array.from(this.npcs.values())
  }

  /**
   * Get NPCs by type
   */
  getNPCsByType(type: string): NPC[] {
    return Array.from(this.npcs.values()).filter(npc => npc.type === type)
  }

  /**
   * Clear all registered NPCs (useful for testing)
   */
  clearNPCs(): void {
    this.npcs.clear()
  }

  /**
   * Get the number of registered NPCs
   */
  getNPCCount(): number {
    return this.npcs.size
  }

  /**
   * Reset the singleton instance (for testing purposes only)
   */
  static resetInstance(): void {
    NPCManager.instance = undefined as any
  }

  /**
   * Clear all caches - useful for testing or when game state changes significantly
   */
  clearCaches(): void {
    this.locationNPCCache.clear()
    this.availabilityCache.clear()
    this.encounterCache.clear()
    this.cacheExpiry.clear()
  }

  /**
   * Generate a hash of relevant game state for caching
   */
  private generateGameStateHash(gameState: GameState): string {
    const relevantState = {
      day: gameState.day,
      weather: gameState.weather,
      location: gameState.location,
      reputation: gameState.reputation
    }
    return JSON.stringify(relevantState)
  }

  /**
   * Check if a cache entry is still valid
   */
  private isCacheValid(cacheKey: string, now: number): boolean {
    const expiry = this.cacheExpiry.get(cacheKey)
    return expiry !== undefined && now < expiry
  }

  /**
   * Cache a result with expiry
   */
  private cacheResult(cacheKey: string, result: any, now: number): void {
    this.encounterCache.set(cacheKey, result)
    this.cacheExpiry.set(cacheKey, now + NPCManager.CACHE_TTL)
  }

  /**
   * Clean up expired cache entries and limit cache size
   */
  private cleanupCache(): void {
    const now = Date.now()
    
    // Remove expired entries
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now >= expiry) {
        this.availabilityCache.delete(key)
        this.encounterCache.delete(key)
        this.cacheExpiry.delete(key)
      }
    }
    
    // Limit cache size by removing oldest entries
    if (this.availabilityCache.size > NPCManager.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cacheExpiry.entries())
        .sort(([, a], [, b]) => a - b)
      
      const toRemove = entries.slice(0, entries.length - NPCManager.MAX_CACHE_SIZE)
      for (const [key] of toRemove) {
        this.availabilityCache.delete(key)
        this.encounterCache.delete(key)
        this.cacheExpiry.delete(key)
      }
    }
  }
}