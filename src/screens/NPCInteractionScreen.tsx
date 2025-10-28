import { Box, Text, useInput } from 'ink'
import React, { useCallback, useEffect, useState } from 'react'
import { useGame } from '../contexts/GameContext.js'
import { useMessage } from '../contexts/MessageContext.js'
import { DialogueEngine } from '../core/dialogue/DialogueEngine.js'
import { EnhancedSelectInput, ContextualHelp, useContextualHelp } from '../ui/components/common/index.js'
import { NPCPortrait } from '../ui/components/common/NPCPortrait.js'
import type { NPC, DialogueNode, DialogueChoice } from '../types/npc.types.js'

type NPCInteractionScreenProps = {
  readonly npc: NPC
  readonly onComplete: () => void
}

export function NPCInteractionScreen({ npc, onComplete }: NPCInteractionScreenProps) {
  const { gameState } = useGame()
  const { addMessage } = useMessage()
  
  const [currentNode, setCurrentNode] = useState<DialogueNode | null>(null)
  const [conversationHistory, setConversationHistory] = useState<string[]>([])
  const [animationType, setAnimationType] = useState<'idle' | 'talking' | 'trading'>('idle')
  const [isLoading, setIsLoading] = useState(true)
  
  // Contextual help system
  const { currentHint, showHint, dismissHint } = useContextualHelp()
  
  // Handle help dismissal
  useInput((input) => {
    if (input === 'x' && currentHint) {
      dismissHint()
    }
  })

  // Initialize dialogue
  useEffect(() => {
    try {
      const initialNode = DialogueEngine.processDialogue(npc, gameState)
      setCurrentNode(initialNode)
      setAnimationType('talking')
      setIsLoading(false)
      
      // Add greeting to conversation history
      setConversationHistory([npc.personality.greeting])
      
      // Show contextual help for first NPC encounter
      showHint('first_npc_encounter')
      
      // Show specific hints based on NPC type
      if (npc.type === 'merchant') {
        showHint('npc_trading')
      } else if (npc.type === 'informant') {
        showHint('information_gathering')
      } else if (npc.type === 'rival') {
        showHint('rival_encounter')
      }
    } catch (error) {
      console.error('Failed to initialize dialogue:', error)
      addMessage('error', 'Failed to start conversation')
      onComplete()
    }
  }, [npc, gameState, addMessage, onComplete, showHint])

  const handleChoiceSelection = useCallback(({ value }: { value: string }) => {
    if (!currentNode) return

    const selectedChoice = currentNode.choices.find(choice => choice.text === value)
    if (!selectedChoice) {
      console.error('Selected choice not found:', value)
      return
    }

    // Add player's choice to conversation history
    setConversationHistory(prev => [...prev, `You: ${selectedChoice.text}`])

    // Apply choice effects to game state
    try {
      const newGameState = DialogueEngine.handleChoice(selectedChoice, gameState, npc.location)
      
      // Update game state if there were changes
      if (newGameState !== gameState) {
        // Note: In a real implementation, we'd need to update the game state through the context
        // For now, we'll just log the changes
        console.log('Dialogue effects applied:', selectedChoice.effects)
      }

      // Get next dialogue node
      const nextNode = DialogueEngine.getNextNode(npc, selectedChoice, newGameState)
      
      if (!nextNode) {
        // End of conversation
        setConversationHistory(prev => [...prev, npc.personality.farewell])
        setAnimationType('idle')
        
        // Wait a moment before closing
        setTimeout(() => {
          onComplete()
        }, 2000)
        return
      }

      // Continue conversation
      setCurrentNode(nextNode)
      setConversationHistory(prev => [...prev, `${npc.name}: ${nextNode.text}`])
      
      // Update animation based on dialogue content
      if (nextNode.id.includes('trade') || selectedChoice.text.toLowerCase().includes('trade')) {
        setAnimationType('trading')
      } else {
        setAnimationType('talking')
      }

    } catch (error) {
      console.error('Error handling dialogue choice:', error)
      addMessage('error', 'Something went wrong in the conversation')
      onComplete()
    }
  }, [currentNode, gameState, npc, addMessage, onComplete])

  if (isLoading) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center">
        <Text>Starting conversation with {npc.name}...</Text>
      </Box>
    )
  }

  if (!currentNode) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center">
        <Text>Conversation ended.</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header with NPC info */}
      <Box marginBottom={1} paddingX={2} borderStyle="single">
        <Text bold color="cyan">Conversation with {npc.name}</Text>
        <Text dimColor> - {npc.description}</Text>
      </Box>

      {/* Main conversation area */}
      <Box flexDirection="row" flexGrow={1}>
        {/* NPC Portrait */}
        <Box width="25%" marginRight={2} flexDirection="column" alignItems="center">
          <NPCPortrait 
            npc={npc} 
            animationType={animationType}
            autoStart={true}
          />
          <Text bold color="green">{npc.name}</Text>
          <Text dimColor>{npc.type}</Text>
        </Box>

        {/* Conversation content */}
        <Box flexDirection="column" width="75%">
          {/* Conversation history */}
          <Box 
            flexDirection="column" 
            height="60%" 
            borderStyle="single" 
            paddingX={1}
            marginBottom={1}
          >
            <Text bold color="yellow">Conversation:</Text>
            <Box flexDirection="column">
              {conversationHistory.map((message, index) => (
                <Text key={index} wrap="wrap">
                  {message}
                </Text>
              ))}
            </Box>
          </Box>

          {/* Current dialogue and choices */}
          <Box flexDirection="column">
            <Text bold color="cyan">{npc.name} says:</Text>
            <Text wrap="wrap">
              {currentNode.text}
            </Text>
            <Box height={1} />

            {/* Dialogue choices */}
            {currentNode.choices.length > 0 && (
              <Box flexDirection="column">
                <Text bold color="yellow">Your response:</Text>
                <EnhancedSelectInput
                  items={currentNode.choices.map((choice: DialogueChoice) => ({
                    label: choice.text,
                    value: choice.text,
                  }))}
                  onSelect={handleChoiceSelection}
                />
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Contextual Help */}
      {currentHint && (
        <ContextualHelp 
          hint={currentHint} 
          visible={true}
          onDismiss={dismissHint}
        />
      )}

      {/* Footer with instructions */}
      <Box marginTop={1} paddingX={2} borderStyle="single">
        <Text dimColor>
          Use arrow keys to select a response, Enter to confirm, or Ctrl+C to exit
        </Text>
      </Box>
    </Box>
  )
}

export default NPCInteractionScreen