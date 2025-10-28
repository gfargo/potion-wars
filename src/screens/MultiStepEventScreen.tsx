import { Box, Text } from 'ink'
import React, { useMemo } from 'react'
import { ASCII_PORTRAITS } from '../constants.js'
import { useGame } from '../contexts/GameContext.js'
import { EnhancedSelectInput } from '../ui/components/common/index.js'

export function MultiStepEventScreen() {
  const { gameState, handleEventChoice } = useGame()
  const { currentEvent } = gameState
  const currentStep = gameState.currentStep ?? 0

  if (!currentEvent) {
    return null
  }

  const step = currentEvent.steps[currentStep]
  if (!step) {
    return null
  }

  // Memoize portrait selection to prevent re-randomizing on every render
  const { portraitKey, portrait, isPortraitLeft } = useMemo(() => {
    const portraitKeys = Object.keys(ASCII_PORTRAITS)
    const key = portraitKeys[Math.floor(Math.random() * portraitKeys.length)]
    return {
      portraitKey: key,
      portrait: ASCII_PORTRAITS[key as keyof typeof ASCII_PORTRAITS],
      isPortraitLeft: Math.random() < 0.5
    }
  }, [currentEvent.name]) // Only change when event changes

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
                handleEventChoice(index)
              }}
            />
          </Box>
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
