import { NPCManager } from './NPCManager.js'
import { NPCDataLoader } from './NPCDataLoader.js'
import { type NPC } from '../../types/npc.types.js'
import { type GameState } from '../../types/game.types.js'

export class NPCEncounter {
  private static initialized = false

  /**
   * Initialize the NPC system with default NPCs
   */
  static initialize(): void {
    if (this.initialized) {
      return
    }

    const manager = NPCManager.getInstance()
    const defaultNPCs = NPCDataLoader.getDefaultNPCs()
    
    for (const npc of defaultNPCs) {
      manager.registerNPC(npc)
    }

    this.initialized = true
  }

  /**
   * Check for NPC encounters when traveling to a location
   */
  static checkForEncounter(gameState: GameState): NPC | null {
    this.initialize()
    
    const manager = NPCManager.getInstance()
    return manager.rollForEncounter(gameState.location.name, gameState)
  }

  /**
   * Get all available NPCs for the current location
   */
  static getAvailableNPCs(gameState: GameState): NPC[] {
    this.initialize()
    
    const manager = NPCManager.getInstance()
    return manager.getNPCsForLocation(gameState.location.name, gameState)
  }

  /**
   * Get a specific NPC by ID
   */
  static getNPC(id: string): NPC | undefined {
    this.initialize()
    
    const manager = NPCManager.getInstance()
    return manager.getNPC(id)
  }

  /**
   * Check if a specific NPC is available in the current game state
   */
  static isNPCAvailable(npcId: string, gameState: GameState): boolean {
    this.initialize()
    
    const manager = NPCManager.getInstance()
    const npc = manager.getNPC(npcId)
    
    if (!npc) {
      return false
    }

    return manager.isNPCAvailable(npc, gameState)
  }

  /**
   * Get NPCs by type for the current location
   */
  static getNPCsByType(type: string, gameState: GameState): NPC[] {
    this.initialize()
    
    const manager = NPCManager.getInstance()
    const locationNPCs = manager.getNPCsForLocation(gameState.location.name, gameState)
    
    return locationNPCs.filter(npc => npc.type === type)
  }

  /**
   * Reset the NPC system (for testing purposes)
   */
  static reset(): void {
    const manager = NPCManager.getInstance()
    manager.clearNPCs()
    this.initialized = false
  }
}