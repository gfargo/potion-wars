import { Box, Text, useInput } from 'ink'
import React, { useEffect, useMemo, useState } from 'react'
import { ASCII_PORTRAITS } from '../constants.js'
import { useStore } from '../store/appStore.js'
import { EnhancedSelectInput } from '../ui/components/common/index.js'

type EventScreenPhase =
  | 'showing_choice' // Display step description and choices
  | 'processing_choice' // Brief visual feedback that choice was made
  | 'showing_outcome' // Display the result/consequence message
  | 'awaiting_continue' // Wait for user to press key to continue

type EventScreenState = {
  phase: EventScreenPhase
  selectedChoiceIndex?: number
  selectedChoiceText?: string
  outcomeMessage?: string
  isEventComplete?: boolean
  eventName?: string // Store event name to display after event is cleared
}

export function MultiStepEventScreen() {
  // Get state and actions from Zustand store
  const currentEvent = useStore((state) => state.events.current)
  const currentStep = useStore((state) => state.events.currentStep)
  const chooseEvent = useStore((state) => state.chooseEvent)
  const acknowledgeEvent = useStore((state) => state.acknowledgeEvent)

  const [screenState, setScreenState] = useState<EventScreenState>({
    phase: 'showing_choice',
    eventName: currentEvent?.name,
  })

  // Reset state when event changes (but not when it clears)
  // Note: We only depend on currentEvent?.name, NOT currentStep
  // This ensures we only reset when a new event appears, not when moving between steps
  useEffect(() => {
    if (currentEvent?.name) {
      console.error('[MultiStepEvent] Event changed, resetting to showing_choice:', currentEvent.name, 'step:', currentStep)
      setScreenState({
        phase: 'showing_choice',
        eventName: currentEvent.name,
      })
    }
  }, [currentEvent?.name])

  // Memoize portrait selection to prevent re-randomizing on every render
  const { portraitKey, portrait, isPortraitLeft } = useMemo(() => {
    const portraitKeys = Object.keys(ASCII_PORTRAITS)
    const key = portraitKeys[Math.floor(Math.random() * portraitKeys.length)]
    return {
      portraitKey: key,
      portrait: ASCII_PORTRAITS[key as keyof typeof ASCII_PORTRAITS],
      isPortraitLeft: Math.random() < 0.5,
    }
  }, [currentEvent?.name])

  // Handle choice selection
  const handleChoiceSelected = (choiceIndex: number, choiceText: string) => {
    console.error('[MultiStepEvent] Choice selected:', choiceIndex, choiceText)
    setScreenState({
      phase: 'processing_choice',
      selectedChoiceIndex: choiceIndex,
      selectedChoiceText: choiceText,
    })
  }

  // Process the choice when in processing phase
  // IMPORTANT: Only depend on screenState.phase and screenState.selectedChoiceIndex
  // Do NOT depend on eventPhase or currentEvent - those change DURING execution causing re-runs!
  useEffect(() => {
    if (
      screenState.phase === 'processing_choice' &&
      screenState.selectedChoiceIndex !== undefined
    ) {
      console.error('[MultiStepEvent] Processing choice effect triggered, index:', screenState.selectedChoiceIndex)

      // Execute the choice using store action (synchronous!)
      chooseEvent(screenState.selectedChoiceIndex)

      // Check the updated event phase from store - use getState() to get the CURRENT value
      // after the synchronous update, not the subscribed value which updates on next render
      const updatedPhase = useStore.getState().events.phase

      const isComplete = updatedPhase === 'outcome'

      console.error('[MultiStepEvent] Choice processed, isComplete:', isComplete, 'eventPhase:', updatedPhase)

      // For now, show a simple outcome message
      // The store already updated the game state with effects
      setScreenState({
        phase: 'showing_outcome',
        selectedChoiceIndex: screenState.selectedChoiceIndex,
        selectedChoiceText: screenState.selectedChoiceText,
        outcomeMessage: 'Choice applied.', // Store handles the actual effects
        isEventComplete: isComplete,
        eventName: currentEvent?.name || screenState.eventName,
      })
    }
  }, [screenState.phase, screenState.selectedChoiceIndex])

  // Handle continuing after outcome is shown
  useInput((input, key) => {
    if (
      screenState.phase === 'showing_outcome' &&
      (key.return || input === ' ')
    ) {
      if (screenState.isEventComplete) {
        // Event is done - acknowledge to clear event state
        // The component will unmount naturally when GameScreen stops rendering it
        console.error('[MultiStepEvent] Event complete, acknowledging')
        acknowledgeEvent()
      } else {
        // Move to next step
        console.error('[MultiStepEvent] Moving to next step, currentStep:', currentStep)
        setScreenState({
          phase: 'showing_choice',
        })
      }
    }
  })

  // Only hide the screen if we're truly done showing everything
  // Keep displaying if we're showing the outcome, even if currentEvent is cleared
  const isDisplayingOutcome =
    screenState.phase === 'showing_outcome' && screenState.isEventComplete

  if (!currentEvent && !isDisplayingOutcome) {
    return null
  }

  // Get the current step if the event still exists
  // Type guard: check if currentEvent is a MultiStepEvent
  const step =
    currentEvent && 'steps' in currentEvent
      ? currentEvent.steps[currentStep]
      : undefined

  // If we have no step and we're not displaying the final outcome, bail out
  if (!step && !isDisplayingOutcome) {
    return null
  }

  return (
    <Box flexDirection="column" height="100%" width="100%" padding={1}>
      <Box marginBottom={1} borderStyle="single" paddingX={1}>
        <Text bold color="yellow">
          ⚠️ Event: {currentEvent?.name || screenState.eventName}
        </Text>
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
              <Text bold color="cyan">
                ➤ You chose: {screenState.selectedChoiceText}
              </Text>
              <Text dimColor>Processing...</Text>
            </Box>
          )}

          {/* Outcome Phase */}
          {screenState.phase === 'showing_outcome' && (
            <Box flexDirection="column" marginBottom={2}>
              <Text bold color="cyan">
                ➤ You chose: {screenState.selectedChoiceText}
              </Text>
              <Box marginTop={1} marginBottom={1}>
                <Text bold color="yellow">
                  Result:
                </Text>
              </Box>
              <Text>{screenState.outcomeMessage}</Text>
              <Box marginTop={2}>
                <Text dimColor>Press ENTER to continue...</Text>
              </Box>
            </Box>
          )}

          {/* Choice Phase */}
          {screenState.phase === 'showing_choice' && step && (
            <>
              <Box marginBottom={1}>
                <Text>{step.description}</Text>
              </Box>
              <Box>
                <EnhancedSelectInput
                  items={step.choices.map((choice: any) => ({
                    label: choice.text,
                    value: choice.text,
                  }))}
                  onSelect={({ value }) => {
                    const index = step.choices.findIndex(
                      (choice: any) => choice.text === value
                    )
                    handleChoiceSelected(index, value as string)
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
