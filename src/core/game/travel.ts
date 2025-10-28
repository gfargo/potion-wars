import { handleCombat } from '../combat/index.js'
import { locations } from '../../constants.js'
import { type GameState } from '../../types/game.types.js'
import { generatePrices } from './economy.js'
import { NPCEncounter } from '../npcs/NPCEncounter.js'
import { type NPC } from '../../types/npc.types.js'
import { createNPCEvent } from '../events/handlers/npc.js'
import { type MultiStepEvent } from '../../types/events.types.js'

export const travel = (
  state: GameState,
  newLocationName: string
): [GameState, string] => {
  const newLocation = locations.find((loc) => loc.name === newLocationName)
  if (!newLocation) {
    return [state, 'Invalid location!']
  }

  const newState = {
    ...state,
    prices: generatePrices(),
    location: newLocation,
  }

  const message = `Traveled to ${newLocation.name}. ${newLocation.description}`

  return [newState, message]
}

/**
 * Enhanced travel function that includes NPC encounter checks and event triggering
 */
export const travelWithNPCEncounters = (
  state: GameState,
  newLocationName: string
): {
  newState: GameState
  message: string
  npcEncounter?: NPC
  npcEvent?: MultiStepEvent
} => {
  // First handle the basic travel
  const [travelState, travelMessage] = travel(state, newLocationName)
  
  // Check for NPC encounters at the new location
  const encounteredNPC = checkNPCEncounter(travelState)
  
  if (encounteredNPC) {
    // Create an NPC event for the encounter
    const npcEvent = createNPCEvent(encounteredNPC)
    
    // Update the game state with the NPC event
    const stateWithEvent = {
      ...travelState,
      currentEvent: npcEvent,
      currentStep: 0
    }
    
    const encounterMessage = `${travelMessage}\n\nYou encounter ${encounteredNPC.name}!`
    
    return {
      newState: stateWithEvent,
      message: encounterMessage,
      npcEncounter: encounteredNPC,
      npcEvent
    }
  }
  
  return {
    newState: travelState,
    message: travelMessage
  }
}

export const travelCombat = (
  state: GameState
): [GameState, string | undefined] => {
  // Chance of combat encounter during travel based on location danger level
  if (Math.random() < state.location.dangerLevel / 20) {
    const combatResult = handleCombat(state)
    const newState = {
      ...state,
      health: combatResult.health,
      cash: combatResult.cash,
      inventory: combatResult.inventory,
    }
    return [newState, combatResult.message]
  }

  return [state, undefined]
}

/**
 * Check for NPC encounters when arriving at a location
 */
export const checkNPCEncounter = (state: GameState): NPC | null => {
  return NPCEncounter.checkForEncounter(state)
}

/**
 * Get all available NPCs for the current location
 */
export const getLocationNPCs = (state: GameState): NPC[] => {
  return NPCEncounter.getAvailableNPCs(state)
}

/**
 * Get NPCs of a specific type in the current location
 */
export const getLocationNPCsByType = (state: GameState, type: string): NPC[] => {
  return NPCEncounter.getNPCsByType(type, state)
}
