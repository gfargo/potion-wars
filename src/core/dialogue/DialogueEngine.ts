import { type GameState } from '../../types/game.types.js'
import { type NPC, type DialogueNode, type DialogueChoice, type DialogueCondition, type DialogueEffect } from '../../types/npc.types.js'

export class DialogueEngine {
  /**
   * Process dialogue for an NPC and return the appropriate starting node
   */
  static processDialogue(npc: NPC, gameState: GameState): DialogueNode {
    const rootNodeId = npc.dialogue.rootNode
    const rootNode = npc.dialogue.nodes[rootNodeId]
    
    if (!rootNode) {
      throw new Error(`Root dialogue node '${rootNodeId}' not found for NPC '${npc.id}'`)
    }

    // Evaluate conditions on the root node
    if (rootNode.conditions && !this.evaluateConditions(rootNode.conditions, gameState, npc.location)) {
      // If root node conditions fail, create a fallback node
      return {
        id: 'fallback',
        text: npc.personality.lowReputation || "I don't have time to talk right now.",
        choices: [{
          text: 'Leave',
          nextNode: undefined
        }]
      }
    }

    // Filter choices based on conditions
    const availableChoices = rootNode.choices.filter(choice => {
      if (!choice.conditions) return true
      return this.evaluateConditions(choice.conditions, gameState, npc.location)
    })

    return {
      ...rootNode,
      choices: availableChoices
    }
  }

  /**
   * Handle a dialogue choice and apply its effects
   */
  static handleChoice(choice: DialogueChoice, gameState: GameState, npcLocation: string): GameState {
    let newState = { ...gameState }

    // Apply choice effects
    if (choice.effects) {
      newState = this.applyEffects(choice.effects, newState, npcLocation)
    }

    // Apply reputation change if specified
    if (choice.reputationChange !== undefined) {
      const reputationEffect: DialogueEffect = {
        type: 'reputation',
        value: choice.reputationChange,
        location: npcLocation
      }
      newState = this.applyEffects([reputationEffect], newState, npcLocation)
    }

    return newState
  }

  /**
   * Get the next dialogue node based on choice
   */
  static getNextNode(npc: NPC, choice: DialogueChoice, gameState: GameState): DialogueNode | null {
    if (!choice.nextNode) {
      return null // End of dialogue
    }

    const nextNode = npc.dialogue.nodes[choice.nextNode]
    if (!nextNode) {
      throw new Error(`Dialogue node '${choice.nextNode}' not found for NPC '${npc.id}'`)
    }

    // Evaluate conditions on the next node
    if (nextNode.conditions && !this.evaluateConditions(nextNode.conditions, gameState, npc.location)) {
      // If conditions fail, end dialogue or provide fallback
      return {
        id: 'blocked',
        text: "I can't discuss that with you right now.",
        choices: [{
          text: 'Understood',
          nextNode: undefined
        }]
      }
    }

    // Filter choices based on conditions
    const availableChoices = nextNode.choices.filter(choice => {
      if (!choice.conditions) return true
      return this.evaluateConditions(choice.conditions, gameState, npc.location)
    })

    return {
      ...nextNode,
      choices: availableChoices
    }
  }

  /**
   * Evaluate dialogue conditions against game state
   */
  static evaluateConditions(conditions: DialogueCondition[], gameState: GameState, npcLocation: string): boolean {
    return conditions.every(condition => this.evaluateCondition(condition, gameState, npcLocation))
  }

  /**
   * Evaluate a single dialogue condition
   */
  private static evaluateCondition(condition: DialogueCondition, gameState: GameState, npcLocation: string): boolean {
    let actualValue: number | string

    switch (condition.type) {
      case 'reputation':
        if (condition.location) {
          actualValue = gameState.reputation.locations[condition.location] || 0
        } else {
          actualValue = gameState.reputation.locations[npcLocation] || 0
        }
        break
      case 'cash':
        actualValue = gameState.cash
        break
      case 'inventory':
        if (!condition.item) {
          throw new Error('Inventory condition requires item property')
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
        throw new Error(`Unknown condition type: ${condition.type}`)
    }

    return this.compareValues(actualValue, condition.operator, condition.value)
  }

  /**
   * Apply dialogue effects to game state
   */
  static applyEffects(effects: DialogueEffect[], gameState: GameState, npcLocation: string): GameState {
    let newState = { ...gameState }

    for (const effect of effects) {
      newState = this.applyEffect(effect, newState, npcLocation)
    }

    return newState
  }

  /**
   * Apply a single dialogue effect
   */
  private static applyEffect(effect: DialogueEffect, gameState: GameState, npcLocation: string): GameState {
    const newState = { ...gameState }

    switch (effect.type) {
      case 'reputation':
        const location = effect.location || npcLocation
        newState.reputation = {
          ...newState.reputation,
          locations: {
            ...newState.reputation.locations,
            [location]: (newState.reputation.locations[location] || 0) + effect.value
          },
          global: newState.reputation.global + (effect.value * 0.1) // Global reputation changes at 10% rate
        }
        break
      case 'cash':
        newState.cash = Math.max(0, newState.cash + effect.value)
        break
      case 'inventory':
        if (!effect.item) {
          throw new Error('Inventory effect requires item name')
        }
        newState.inventory = {
          ...newState.inventory,
          [effect.item]: Math.max(0, (newState.inventory[effect.item] || 0) + effect.value)
        }
        break
      case 'health':
        newState.health = Math.max(0, Math.min(100, newState.health + effect.value))
        break
      default:
        throw new Error(`Unknown effect type: ${effect.type}`)
    }

    return newState
  }

  /**
   * Compare values using the specified operator
   */
  static compareValues(actual: number | string, operator: string, expected: number | string): boolean {
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
        throw new Error(`Unknown operator: ${operator}`)
    }
  }

  /**
   * Validate dialogue tree structure
   */
  static validateDialogueTree(npc: NPC): string[] {
    const errors: string[] = []
    const { dialogue } = npc

    // Check if root node exists
    if (!dialogue.nodes[dialogue.rootNode]) {
      errors.push(`Root node '${dialogue.rootNode}' not found`)
      return errors
    }

    // Check all referenced nodes exist
    const visitedNodes = new Set<string>()
    const nodesToCheck = [dialogue.rootNode]

    while (nodesToCheck.length > 0) {
      const nodeId = nodesToCheck.pop()!
      
      if (visitedNodes.has(nodeId)) continue
      visitedNodes.add(nodeId)

      const node = dialogue.nodes[nodeId]
      if (!node) {
        errors.push(`Referenced node '${nodeId}' not found`)
        continue
      }

      // Validate node structure
      if (!node.text || node.text.trim() === '') {
        errors.push(`Node '${nodeId}' has empty text`)
      }

      if (!Array.isArray(node.choices)) {
        errors.push(`Node '${nodeId}' has invalid choices`)
        continue
      }

      // Check choices
      for (const choice of node.choices) {
        if (!choice.text || choice.text.trim() === '') {
          errors.push(`Node '${nodeId}' has choice with empty text`)
        }

        if (choice.nextNode && !visitedNodes.has(choice.nextNode)) {
          nodesToCheck.push(choice.nextNode)
        }
      }
    }

    return errors
  }
}