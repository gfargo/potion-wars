import { Box, Text, useInput } from 'ink'
import React, { useCallback, useEffect, useState } from 'react'
import { useStore } from '../store/appStore.js'
import { DialogueEngine } from '../core/dialogue/DialogueEngine.js'
import {
    EnhancedSelectInput,
    ContextualHelp,
    useContextualHelp,
} from '../ui/components/common/index.js'
import { NPCPortrait } from '../ui/components/common/NPCPortrait.js'
import type { NPC, DialogueNode, DialogueChoice } from '../types/npc.types.js'

type NPCInteractionScreenProperties = {
  readonly npc: NPC
  readonly onComplete: () => void
}

export function NPCInteractionScreen({
  npc,
  onComplete,
}: NPCInteractionScreenProperties) {
  const addMessage = useStore((state) => state.addMessage)
  const applyDialogueChoice = useStore((state) => state.applyDialogueChoice)

  const [currentNode, setCurrentNode] = useState<DialogueNode | undefined>(undefined)
  const [conversationHistory, setConversationHistory] = useState<string[]>([])
  const [animationType, setAnimationType] = useState<
    'idle' | 'talking' | 'trading'
  >('idle')
  const [isLoading, setIsLoading] = useState(true)

  // Contextual help system
  const { currentHint, showHint, dismissHint } = useContextualHelp()

  // Handle help dismissal
  useInput((input) => {
    if (input === 'x' && currentHint) {
      dismissHint()
    }
  })

  // Initialize dialogue once per NPC (reading latest gameState via getState to
  // avoid re-running whenever cash/day/inventory changes mid-conversation).
  useEffect(() => {
    try {
      const gameSnapshot = useStore.getState().game
      const initialNode = DialogueEngine.processDialogue(npc, gameSnapshot)
      setCurrentNode(initialNode)
      setAnimationType('talking')
      setIsLoading(false)

      // Add greeting to conversation history
      setConversationHistory([npc.personality.greeting])

      // Show contextual help for first NPC encounter
      showHint('first_npc_encounter')

      // Show specific hints based on NPC type
      switch (npc.type) {
        case 'merchant': {
          showHint('npc_trading')

          break
        }

        case 'informant': {
          showHint('information_gathering')

          break
        }

        case 'rival': {
          showHint('rival_encounter')

          break
        }
        // No default
      }
    } catch (error) {
      console.error('Failed to initialize dialogue:', error)
      addMessage('error', 'Failed to start conversation')
      onComplete()
    }
  }, [npc.id])

  const handleChoiceSelection = useCallback(
    ({ value }: { value: string }) => {
      if (!currentNode) return

      const selectedChoice = currentNode.choices.find(
        (choice) => choice.text === value
      )
      if (!selectedChoice) {
        return
      }

      // Add player's choice to conversation history
      setConversationHistory((previous) => [
        ...previous,
        `You: ${selectedChoice.text}`,
      ])

      // Apply choice effects to the store, then read the updated state for
      // next-node condition evaluation.
      try {
        applyDialogueChoice(selectedChoice, npc.location)
        const updatedGameState = useStore.getState().game

        // Get next dialogue node
        const nextNode = DialogueEngine.getNextNode(
          npc,
          selectedChoice,
          updatedGameState
        )

        if (!nextNode) {
          // End of conversation - immediately end the interaction
          setConversationHistory((previous) => [
            ...previous,
            npc.personality.farewell,
          ])
          setAnimationType('idle')

          // Clear the current node to hide the choices immediately
          setCurrentNode(undefined)

          // Immediately call onComplete without waiting
          onComplete()
          return
        }

        // Continue conversation
        setCurrentNode(nextNode)
        setConversationHistory((previous) => [
          ...previous,
          `${npc.name}: ${nextNode.text}`,
        ])

        // If the next node has no choices, end the conversation
        if (nextNode.choices.length === 0) {
          setAnimationType('idle')

          // Clear the current node after a brief delay to show the final message
          setTimeout(() => {
            setCurrentNode(undefined)
            onComplete()
          }, 1500)
          return
        }

        // Update animation based on dialogue content
        if (
          nextNode.id.includes('trade') ||
          selectedChoice.text.toLowerCase().includes('trade')
        ) {
          setAnimationType('trading')
        } else {
          setAnimationType('talking')
        }
      } catch (error) {
        console.error('Error handling dialogue choice:', error)
        addMessage('error', 'Something went wrong in the conversation')
        onComplete()
      }
    },
    [currentNode, npc, addMessage, onComplete, applyDialogueChoice]
  )

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
        <Text bold color="cyan">
          Conversation with {npc.name}
        </Text>
        <Text dimColor> - {npc.description}</Text>
      </Box>

      {/* Main conversation area */}
      <Box flexDirection="row" flexGrow={1}>
        {/* NPC Portrait */}
        <Box
          width="25%"
          marginRight={2}
          flexDirection="column"
          alignItems="center"
        >
          <NPCPortrait autoStart npc={npc} animationType={animationType} />
          <Text bold color="green">
            {npc.name}
          </Text>
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
            <Text bold color="yellow">
              Conversation:
            </Text>
            <Box flexDirection="column">
              {conversationHistory.map((message, index) => (
                <Text key={index} wrap="wrap">
                  {message}
                </Text>
              ))}
            </Box>
          </Box>

          {/* Current dialogue and choices */}
          {currentNode && (
            <Box flexDirection="column">
              <Text bold color="cyan">
                {npc.name} says:
              </Text>
              <Text wrap="wrap">{currentNode.text}</Text>
              <Box height={1} />

              {/* Dialogue choices */}
              {currentNode.choices.length > 0 && (
                <Box flexDirection="column">
                  <Text bold color="yellow">
                    Your response:
                  </Text>
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
          )}
        </Box>
      </Box>

      {/* Contextual Help */}
      {currentHint && (
        <ContextualHelp visible hint={currentHint} onDismiss={dismissHint} />
      )}

      {/* Footer with instructions */}
      {currentNode && currentNode.choices.length > 0 && (
        <Box marginTop={1} paddingX={2} borderStyle="single">
          <Text dimColor>
            Use arrow keys to select a response, Enter to confirm, or Ctrl+C to
            exit
          </Text>
        </Box>
      )}
    </Box>
  )
}

export default NPCInteractionScreen
