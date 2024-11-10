import { Box, Text } from 'ink'
import React from 'react'
import EnhancedSelectInput from '../components/EnhancedSelectInput.js'
import { ASCII_PORTRAITS } from '../constants.js'
import { useGame } from '../contexts/GameContext.js'

const MultiStepEventScreen: React.FC = () => {
  const { gameState, handleEventChoice } = useGame()
  const currentEvent = gameState.currentEvent
  const currentStep = gameState.currentStep ?? 0

  if (!currentEvent) {
    return null
  }

  const step = currentEvent.steps[currentStep]
  if (!step) {
    return null
  }
  const portraitKeys = Object.keys(ASCII_PORTRAITS)
  const portraitKey =
    portraitKeys[Math.floor(Math.random() * portraitKeys.length)]
  const portrait = ASCII_PORTRAITS[portraitKey as keyof typeof ASCII_PORTRAITS]
  const isPortraitLeft = Math.random() < 0.5

  return (
    <Box flexDirection="row" width="100%">
      {isPortraitLeft && (
        <Box width="30%" marginRight={2}>
          <Text>{portrait}</Text>
          <Text>{portraitKey}</Text>
        </Box>
      )}
      <Box flexDirection="column" width="70%">
        <Text bold>{currentEvent.name}</Text>
        <Text>{step.description}</Text>
        <Box marginY={1}>
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
          <Text>{portraitKey}</Text>
        </Box>
      )}
    </Box>
  )
}

export default MultiStepEventScreen
