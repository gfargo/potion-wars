import { type MultiStepEvent, type Choice } from '../../../types/events.types.js'
import { type GameState } from '../../../types/game.types.js'
import { type NPC, type DialogueChoice } from '../../../types/npc.types.js'
import { DialogueEngine, DialogueTreeManager } from '../../dialogue/index.js'

/**
 * Create a MultiStepEvent from an NPC dialogue tree
 */
export const createNPCEvent = (npc: NPC): MultiStepEvent => {
  return {
    id: `npc_encounter_${npc.id}`,
    name: `Encounter: ${npc.name}`,
    description: npc.personality.greeting,
    probability: npc.availability.probability,
    locationSpecific: [npc.location],
    weatherSpecific: npc.availability.weatherRestriction,
    timeSpecific: npc.availability.timeRestriction,
    type: 'neutral',
    steps: [] // Steps will be generated dynamically during dialogue
  }
}

/**
 * Start an NPC dialogue event
 */
export const startNPCDialogue = (npc: NPC, gameState: GameState): {
  event: MultiStepEvent
  newGameState: GameState
} => {
  const manager = DialogueTreeManager.getInstance()
  
  // Start the dialogue
  const initialNode = manager.startDialogue(npc, gameState)
  
  // Create the initial event step
  const initialStep = {
    description: `${npc.name}: "${initialNode.text}"`,
    choices: initialNode.choices.map(choice => createEventChoiceFromDialogue(choice, npc))
  }

  const event: MultiStepEvent = {
    id: `npc_dialogue_${npc.id}`,
    name: `Talking to ${npc.name}`,
    description: npc.description,
    probability: 1.0, // Always happens when triggered
    locationSpecific: [npc.location],
    type: 'neutral',
    steps: [initialStep]
  }

  return {
    event,
    newGameState: {
      ...gameState,
      currentEvent: event,
      currentStep: 0
    }
  }
}

/**
 * Handle an NPC dialogue choice within the event system
 */
export const handleNPCDialogueChoice = (
  npc: NPC,
  dialogueChoice: DialogueChoice,
  gameState: GameState
): GameState => {
  const manager = DialogueTreeManager.getInstance()
  
  if (!manager.isDialogueActive()) {
    throw new Error('No active dialogue to handle choice')
  }

  // Process the dialogue choice
  const result = manager.processChoice(npc, dialogueChoice, gameState)
  
  if (result.isDialogueComplete) {
    // End the event
    return {
      ...result.newGameState,
      currentEvent: undefined,
      currentStep: undefined
    }
  }

  // Continue with next dialogue node
  if (result.nextNode) {
    const nextStep = {
      description: `${npc.name}: "${result.nextNode.text}"`,
      choices: result.nextNode.choices.map(choice => createEventChoiceFromDialogue(choice, npc))
    }

    // Update the current event with the new step
    const updatedEvent: MultiStepEvent = {
      ...gameState.currentEvent as MultiStepEvent,
      steps: [...(gameState.currentEvent as MultiStepEvent).steps, nextStep]
    }

    return {
      ...result.newGameState,
      currentEvent: updatedEvent,
      currentStep: (gameState.currentStep || 0) + 1
    }
  }

  // This shouldn't happen, but handle gracefully
  return {
    ...result.newGameState,
    currentEvent: undefined,
    currentStep: undefined
  }
}

/**
 * Convert a dialogue choice to an event choice
 */
function createEventChoiceFromDialogue(dialogueChoice: DialogueChoice, npc: NPC): Choice {
  return {
    text: dialogueChoice.text,
    effect: (gameState: GameState) => {
      return handleNPCDialogueChoice(npc, dialogueChoice, gameState)
    }
  }
}

/**
 * Create a simple NPC encounter event (without dialogue)
 */
export const createSimpleNPCEncounter = (npc: NPC): MultiStepEvent => {
  return {
    id: `npc_simple_${npc.id}`,
    name: `You encounter ${npc.name}`,
    description: `${npc.description}\n\n${npc.personality.greeting}`,
    probability: npc.availability.probability,
    locationSpecific: [npc.location],
    weatherSpecific: npc.availability.weatherRestriction,
    timeSpecific: npc.availability.timeRestriction,
    type: 'neutral',
    steps: [
      {
        description: `What would you like to do?`,
        choices: [
          {
            text: 'Talk to them',
            effect: (gameState: GameState) => {
              const dialogueResult = startNPCDialogue(npc, gameState)
              return dialogueResult.newGameState
            }
          },
          {
            text: 'Walk away',
            effect: (gameState: GameState) => ({
              ...gameState,
              currentEvent: undefined,
              currentStep: undefined
            })
          }
        ]
      }
    ]
  }
}

/**
 * Create an NPC trading event
 */
export const createNPCTradingEvent = (npc: NPC): MultiStepEvent | null => {
  if (!npc.trades || npc.trades.length === 0) {
    return null
  }

  return {
    id: `npc_trade_${npc.id}`,
    name: `Trading with ${npc.name}`,
    description: `${npc.name} has some items for trade.`,
    probability: npc.availability.probability * 0.7, // Slightly less likely than regular encounters
    locationSpecific: [npc.location],
    weatherSpecific: npc.availability.weatherRestriction,
    timeSpecific: npc.availability.timeRestriction,
    type: 'positive',
    steps: [
      {
        description: `${npc.name}: "${npc.personality.tradeAccept}"\n\nAvailable trades:${npc.trades.map(trade => 
          `\n- ${trade.offer}: ${trade.price} gold (${trade.quantity} available)`
        ).join('')}`,
        choices: [
          ...npc.trades.map((trade) => ({
            text: `Buy ${trade.offer} for ${trade.price} gold`,
            effect: (gameState: GameState) => {
              if (gameState.cash < trade.price) {
                return {
                  ...gameState,
                  _result: { message: "You don't have enough gold for this trade." }
                }
              }

              // Check reputation requirement
              if (trade.reputationRequirement !== undefined) {
                const reputation = gameState.reputation.locations[npc.location] || 0
                if (reputation < trade.reputationRequirement) {
                  return {
                    ...gameState,
                    _result: { message: "You don't meet the reputation requirements for this trade." }
                  }
                }
              }

              // Apply trade conditions if any
              if (trade.conditions) {
                const conditionsMet = trade.conditions.every(condition => {
                  switch (condition.type) {
                    case 'reputation':
                      const reputation = gameState.reputation.locations[npc.location] || 0
                      return DialogueEngine.compareValues(reputation, condition.operator, condition.value)
                    case 'cash':
                      return DialogueEngine.compareValues(gameState.cash, condition.operator, condition.value)
                    case 'inventory':
                      if (typeof condition.value === 'string') {
                        const itemCount = gameState.inventory[condition.value] || 0
                        return DialogueEngine.compareValues(itemCount, condition.operator, 0)
                      }
                      return false
                    case 'day':
                      return DialogueEngine.compareValues(gameState.day, condition.operator, condition.value)
                    default:
                      return true
                  }
                })

                if (!conditionsMet) {
                  return {
                    ...gameState,
                    _result: { message: "You don't meet the requirements for this trade." }
                  }
                }
              }

              // Execute the trade
              const newInventory = { ...gameState.inventory }
              newInventory[trade.offer] = (newInventory[trade.offer] || 0) + trade.quantity

              // Apply reputation bonus for successful trade
              const newReputation = { ...gameState.reputation }
              newReputation.locations = { ...newReputation.locations }
              newReputation.locations[npc.location] = (newReputation.locations[npc.location] || 0) + 1
              newReputation.global = newReputation.global + 0.1

              return {
                ...gameState,
                cash: gameState.cash - trade.price,
                inventory: newInventory,
                reputation: newReputation,
                currentEvent: undefined,
                currentStep: undefined,
                _result: { message: `You successfully traded for ${trade.offer}!` }
              }
            }
          })),
          {
            text: 'Not interested',
            effect: (gameState: GameState) => ({
              ...gameState,
              currentEvent: undefined,
              currentStep: undefined,
              _result: { message: npc.personality.tradeDecline }
            })
          }
        ]
      }
    ]
  }
}

/**
 * Validate that an NPC event can be triggered
 */
export const validateNPCEvent = (npc: NPC, gameState: GameState): boolean => {
  // Check location
  if (npc.location !== gameState.location.name) {
    return false
  }

  // Check reputation requirements
  if (npc.reputation.minimum !== undefined) {
    const reputation = gameState.reputation.locations[npc.location] || 0
    if (reputation < npc.reputation.minimum) {
      return false
    }
  }

  if (npc.reputation.maximum !== undefined) {
    const reputation = gameState.reputation.locations[npc.location] || 0
    if (reputation > npc.reputation.maximum) {
      return false
    }
  }

  // Check availability conditions
  if (npc.availability.reputationGate !== undefined) {
    const reputation = gameState.reputation.locations[npc.location] || 0
    if (reputation < npc.availability.reputationGate) {
      return false
    }
  }

  // Check time restrictions
  if (npc.availability.timeRestriction) {
    const [minDay, maxDay] = npc.availability.timeRestriction
    if (gameState.day < minDay || gameState.day > maxDay) {
      return false
    }
  }

  // Check weather restrictions
  if (npc.availability.weatherRestriction) {
    if (!npc.availability.weatherRestriction.includes(gameState.weather)) {
      return false
    }
  }

  return true
}

/**
 * Get all possible NPC events for the current game state
 */
export const getAvailableNPCEvents = (npcs: NPC[], gameState: GameState): MultiStepEvent[] => {
  const events: MultiStepEvent[] = []

  for (const npc of npcs) {
    if (!validateNPCEvent(npc, gameState)) {
      continue
    }

    // Add dialogue event
    const dialogueEvent = createNPCEvent(npc)
    events.push(dialogueEvent)

    // Add trading event if applicable
    const tradingEvent = createNPCTradingEvent(npc)
    if (tradingEvent) {
      events.push(tradingEvent)
    }

    // Add simple encounter event
    const simpleEvent = createSimpleNPCEncounter(npc)
    events.push(simpleEvent)
  }

  return events
}