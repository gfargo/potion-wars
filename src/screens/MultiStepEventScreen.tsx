import { Box, Text, useInput } from 'ink'
import React, { useEffect, useMemo, useState } from 'react'
import { ASCII_PORTRAITS } from '../constants.js'
import { useGame } from '../contexts/GameContext.js'
import { EnhancedSelectInput } from '../ui/components/common/index.js'

type EventScreenPhase =
  | 'showing_choice'      // Display step description and choices
  | 'processing_choice'   // Brief visual feedback that choice was made
  | 'showing_outcome'     // Display the result/consequence message
  | 'awaiting_continue'   // Wait for user to press key to continue

type EventScreenState = {
  phase: EventScreenPhase
  selectedChoiceIndex?: number
  selectedChoiceText?: string
  outcomeMessage?: string
  isEventComplete?: boolean
}

export function MultiStepEventScreen() {
  const { gameState, handleEventChoice } = useGame()
  const { currentEvent } = gameState
  const currentStep = gameState.currentStep ?? 0

  const [screenState, setScreenState] = useState<EventScreenState>({
    phase: 'showing_choice'
  })

  // Reset state when event changes
  useEffect(() => {
    setScreenState({ phase: 'showing_choice' })
  }, [currentEvent?.name])

  // Memoize portrait selection to prevent re-randomizing on every render
  const { portraitKey, portrait, isPortraitLeft } = useMemo(() => {
    const portraitKeys = Object.keys(ASCII_PORTRAITS)
    const key = portraitKeys[Math.floor(Math.random() * portraitKeys.length)]
    return {
      portraitKey: key,
      portrait: ASCII_PORTRAITS[key as keyof typeof ASCII_PORTRAITS],
      isPortraitLeft: Math.random() < 0.5
    }
  }, [currentEvent?.name])

  // Handle choice selection
  const handleChoiceSelected = (choiceIndex: number, choiceText: string) => {
    setScreenState({
      phase: 'processing_choice',
      selectedChoiceIndex: choiceIndex,
      selectedChoiceText: choiceText
    })
  }

  // Process the choice when in processing phase
  useEffect(() => {
    if (screenState.phase === 'processing_choice' && screenState.selectedChoiceIndex !== undefined) {
      // Execute the choice
      const result = handleEventChoice(screenState.selectedChoiceIndex)

      // Check if event is complete or continuing
      const isComplete = result.isLastStep

      if (result.message) {
        // Show outcome message
        setScreenState({
          phase: 'showing_outcome',
          selectedChoiceIndex: screenState.selectedChoiceIndex,
          selectedChoiceText: screenState.selectedChoiceText,
          outcomeMessage: result.message,
          isEventComplete: isComplete
        })
      } else if (isComplete) {
        // Event complete but no message - this shouldn't happen but handle it
        setScreenState({
          phase: 'awaiting_continue',
          isEventComplete: true
        })
      } else {
        // No outcome message but event continues - reset for next step
        setScreenState({
          phase: 'showing_choice'
        })
      }
    }
  }, [screenState.phase, screenState.selectedChoiceIndex, handleEventChoice])

  // Handle continuing after outcome is shown
  useInput((input, key) => {
    if (screenState.phase === 'showing_outcome' && (key.return || input === ' ')) {
      if (screenState.isEventComplete) {
        // Event is done - parent will handle transition back to game
        setScreenState({
          phase: 'awaiting_continue',
          isEventComplete: true
        })
      } else {
        // Move to next step
        setScreenState({
          phase: 'showing_choice'
        })
      }
    }
  })

  // If event is done and we're awaiting continue, don't render (let GameScreen take over)
  if (!currentEvent || (screenState.phase === 'awaiting_continue' && screenState.isEventComplete)) {
    return null
  }

  const step = currentEvent.steps[currentStep]
  if (!step) {
    return null
  }

  return (
    <Box flexDirection="column" height="100%" width="100%" padding={1}>
      <Box marginBottom={1} borderStyle="single" paddingX={1}>
        <Text bold color="yellow">⚠️  Event: {currentEvent.name}</Text>
      </Box>

      <Box flexDirection="row" width="100%" flexGrow={1}>
        {isPortraitLeft && (
          <Box width="30%" marginRight={2}>
            <Text>{portrait}</Text>
            <Text dimColor>{portraitKey}</Text>
          </Box>
        )}

        <Box flexDirection="column" width="70%">
          {/* Processing Phase */}
          {screenState.phase === 'processing_choice' && (
            <Box flexDirection="column" marginBottom={1}>
              <Text bold color="cyan">➤ You chose: {screenState.selectedChoiceText}</Text>
              <Text dimColor>Processing...</Text>
            </Box>
          )}

          {/* Outcome Phase */}
          {screenState.phase === 'showing_outcome' && (
            <Box flexDirection="column" marginBottom={2}>
              <Text bold color="cyan">➤ You chose: {screenState.selectedChoiceText}</Text>
              <Box marginTop={1} marginBottom={1}>
                <Text bold color="yellow">Result:</Text>
              </Box>
              <Text>{screenState.outcomeMessage}</Text>
              <Box marginTop={2}>
                <Text dimColor>Press ENTER to continue...</Text>
              </Box>
            </Box>
          )}

          {/* Choice Phase */}
          {screenState.phase === 'showing_choice' && (
            <>
              <Box marginBottom={1}>
                <Text>{step.description}</Text>
              </Box>
              <Box>
                <EnhancedSelectInput
                  items={step.choices.map((choice) => ({
                    label: choice.text,
                    value: choice.text,
                  }))}
                  onSelect={({ value }) => {
                    const index = step.choices.findIndex(
                      (choice) => choice.text === value
                    )
                    handleChoiceSelected(index, value)
                  }}
                />
              </Box>
            </>
          )}
        </Box>

        {!isPortraitLeft && (
          <Box width="30%" marginLeft={2}>
            <Text>{portrait}</Text>
            <Text dimColor>{portraitKey}</Text>
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default MultiStepEventScreen
