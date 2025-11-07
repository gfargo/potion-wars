import { type GameState } from '../../types/game.types.js'
import {
  type NPC,
  type DialogueNode,
  type DialogueChoice,
} from '../../types/npc.types.js'
import { DialogueEngine } from './DialogueEngine.js'

export type DialogueState = {
  npcId: string
  currentNodeId: string
  visitedNodes: Set<string>
  conversationHistory: DialogueHistoryEntry[]
  isActive: boolean
}

export type DialogueHistoryEntry = {
  nodeId: string
  choiceText?: string
  timestamp: number
}

export class DialogueTreeManager {
  private static instance: DialogueTreeManager
  private activeDialogue: DialogueState | undefined = undefined

  static getInstance(): DialogueTreeManager {
    DialogueTreeManager.instance ||= new DialogueTreeManager()
    return DialogueTreeManager.instance
  }

  /**
   * Start a new dialogue session with an NPC
   */
  startDialogue(npc: NPC, gameState: GameState): DialogueNode {
    // Validate the dialogue tree first
    const validationErrors = DialogueEngine.validateDialogueTree(npc)
    if (validationErrors.length > 0) {
      throw new Error(
        `Invalid dialogue tree for NPC ${npc.id}: ${validationErrors.join(
          ', '
        )}`
      )
    }

    // Initialize dialogue state
    this.activeDialogue = {
      npcId: npc.id,
      currentNodeId: npc.dialogue.rootNode,
      visitedNodes: new Set([npc.dialogue.rootNode]),
      conversationHistory: [
        {
          nodeId: npc.dialogue.rootNode,
          timestamp: Date.now(),
        },
      ],
      isActive: true,
    }

    // Get the initial dialogue node
    return DialogueEngine.processDialogue(npc, gameState)
  }

  /**
   * Process a dialogue choice and advance the conversation
   */
  processChoice(
    npc: NPC,
    choice: DialogueChoice,
    gameState: GameState
  ): {
    newGameState: GameState
    nextNode: DialogueNode | undefined
    isDialogueComplete: boolean
  } {
    if (!this.activeDialogue?.isActive) {
      throw new Error('No active dialogue session')
    }

    if (this.activeDialogue.npcId !== npc.id) {
      throw new Error(
        `Active dialogue is with different NPC (${this.activeDialogue.npcId})`
      )
    }

    // Validate the choice belongs to the current node
    const currentNode = npc.dialogue.nodes[this.activeDialogue.currentNodeId]
    if (!currentNode) {
      throw new Error(
        `Current dialogue node '${this.activeDialogue.currentNodeId}' not found`
      )
    }

    const isValidChoice = currentNode.choices.some(
      (nodeChoice) =>
        nodeChoice.text === choice.text &&
        nodeChoice.nextNode === choice.nextNode
    )

    if (!isValidChoice) {
      throw new Error('Invalid choice for current dialogue node')
    }

    // Apply choice effects to game state
    const newGameState = DialogueEngine.handleChoice(
      choice,
      gameState,
      npc.location
    )

    // Record the choice in history
    this.activeDialogue.conversationHistory.push({
      nodeId: this.activeDialogue.currentNodeId,
      choiceText: choice.text,
      timestamp: Date.now(),
    })

    // Get next node
    const nextNode = DialogueEngine.getNextNode(npc, choice, newGameState)

    if (!nextNode) {
      // End of dialogue
      this.endDialogue()
      return {
        newGameState,
        nextNode: undefined,
        isDialogueComplete: true,
      }
    }

    // Update dialogue state
    this.activeDialogue.currentNodeId = nextNode.id
    this.activeDialogue.visitedNodes.add(nextNode.id)
    this.activeDialogue.conversationHistory.push({
      nodeId: nextNode.id,
      timestamp: Date.now(),
    })

    return {
      newGameState,
      nextNode,
      isDialogueComplete: false,
    }
  }

  /**
   * End the current dialogue session
   */
  endDialogue(): void {
    if (this.activeDialogue) {
      this.activeDialogue.isActive = false
    }

    this.activeDialogue = undefined
  }

  /**
   * Get the current dialogue state
   */
  getDialogueState(): DialogueState | undefined {
    return this.activeDialogue
  }

  /**
   * Check if a dialogue is currently active
   */
  isDialogueActive(): boolean {
    return this.activeDialogue !== undefined && this.activeDialogue.isActive
  }

  /**
   * Get the current dialogue node
   */
  getCurrentNode(npc: NPC): DialogueNode | undefined {
    if (!this.activeDialogue?.isActive) {
      return undefined
    }

    if (this.activeDialogue.npcId !== npc.id) {
      return undefined
    }

    return npc.dialogue.nodes[this.activeDialogue.currentNodeId] || undefined
  }

  /**
   * Check if a specific node has been visited in the current conversation
   */
  hasVisitedNode(nodeId: string): boolean {
    if (!this.activeDialogue) {
      return false
    }

    return this.activeDialogue.visitedNodes.has(nodeId)
  }

  /**
   * Get conversation history for the current dialogue
   */
  getConversationHistory(): DialogueHistoryEntry[] {
    if (!this.activeDialogue) {
      return []
    }

    return [...this.activeDialogue.conversationHistory]
  }

  /**
   * Validate a dialogue choice against the current state
   */
  validateChoice(
    npc: NPC,
    choice: DialogueChoice,
    gameState: GameState
  ): {
    isValid: boolean
    reason?: string
  } {
    if (!this.activeDialogue?.isActive) {
      return { isValid: false, reason: 'No active dialogue session' }
    }

    if (this.activeDialogue.npcId !== npc.id) {
      return { isValid: false, reason: 'Choice is for different NPC' }
    }

    const currentNode = npc.dialogue.nodes[this.activeDialogue.currentNodeId]
    if (!currentNode) {
      return { isValid: false, reason: 'Current dialogue node not found' }
    }

    // Check if choice exists in current node
    const nodeChoice = currentNode.choices.find(
      (nodeChoice) =>
        nodeChoice.text === choice.text &&
        nodeChoice.nextNode === choice.nextNode
    )

    if (!nodeChoice) {
      return { isValid: false, reason: 'Choice not available in current node' }
    }

    // Check choice conditions
    if (nodeChoice.conditions) {
      const conditionsMet = DialogueEngine.evaluateConditions(
        nodeChoice.conditions,
        gameState,
        npc.location
      )
      if (!conditionsMet) {
        return { isValid: false, reason: 'Choice conditions not met' }
      }
    }

    return { isValid: true }
  }

  /**
   * Get available choices for the current dialogue state
   */
  getAvailableChoices(npc: NPC, gameState: GameState): DialogueChoice[] {
    if (!this.activeDialogue?.isActive) {
      return []
    }

    if (this.activeDialogue.npcId !== npc.id) {
      return []
    }

    const currentNode = npc.dialogue.nodes[this.activeDialogue.currentNodeId]
    if (!currentNode) {
      return []
    }

    // Filter choices based on conditions
    return currentNode.choices.filter((choice) => {
      if (!choice.conditions) return true
      return DialogueEngine.evaluateConditions(
        choice.conditions,
        gameState,
        npc.location
      )
    })
  }

  /**
   * Reset the dialogue tree manager (useful for testing)
   */
  reset(): void {
    this.activeDialogue = undefined
  }

  /**
   * Get dialogue statistics for the current conversation
   */
  getDialogueStats():
    | {
        totalNodes: number
        visitedNodes: number
        conversationLength: number
        startTime: number
        duration: number
      }
    | undefined {
    if (!this.activeDialogue) {
      return undefined
    }

    const startTime =
      this.activeDialogue.conversationHistory[0]?.timestamp || Date.now()
    const currentTime = Date.now()

    return {
      totalNodes: Object.keys(this.activeDialogue.visitedNodes).length,
      visitedNodes: this.activeDialogue.visitedNodes.size,
      conversationLength: this.activeDialogue.conversationHistory.length,
      startTime,
      duration: currentTime - startTime,
    }
  }
}
