import { Box, Text } from 'ink'
import Gradient from 'ink-gradient'
import SelectInput from 'ink-select-input'
import React from 'react'
import ActionMenu from '../components/ActionMenu.js'
import Day from '../components/Day.js'
import InventoryDisplay from '../components/InventoryDisplay.js'
import Location from '../components/Location.js'
import Message from '../components/Message.js'
import PlayerStatus from '../components/PlayerStatus.js'
import PriceList from '../components/PriceList.js'
import Weather from '../components/Weather.js'
import { HELP_TEXT, locations, potions } from '../constants.js'
import { useGame } from '../contexts/GameContext.js'
import { useMessage } from '../contexts/MessageContext.js'
import { useUI } from '../contexts/UIContext.js'

function GameScreen() {
  const { showHelp, quitConfirmation } = useUI()
  const { gameState, handleEventChoice } = useGame()
  const { addMessage } = useMessage()

  return (
    <Box flexDirection="column">
      <Box
        marginTop={1}
        alignItems="center"
        width="100%"
        justifyContent="space-between"
      >
        <Box alignItems="center" gap={3}>
          <Text bold dimColor>
            <Gradient name="pastel">Potion Wars</Gradient>
          </Text>
          <Day />
          <PlayerStatus />
          <Weather />
        </Box>
      </Box>
      {showHelp ? (
        <Text>{HELP_TEXT}</Text>
      ) : (
        !quitConfirmation && (
          <Box marginY={1} flexDirection="column">
            <Box>
              <InventoryDisplay />
              <PriceList />
              <Location />
            </Box>
            <Message />
            {gameState.currentEvent && gameState.currentStep !== undefined ? (
              <Box flexDirection="column" marginY={1}>
                <Text>
                  {
                    gameState.currentEvent?.steps[gameState.currentStep]
                      ?.description
                  }
                </Text>

                <SelectInput
                  items={gameState.currentEvent.steps[
                    gameState.currentStep
                  ]?.choices.map((choice) => ({
                    // key: index,
                    label: choice.text,
                    value: choice.text,
                  }))}
                  onSelect={({ value }) => {
                    if (!gameState.currentEvent || !gameState.currentStep) {
                      addMessage(
                        'info',
                        'Invalid event or step, defaulting to first choice'
                      )
                      handleEventChoice(0)
                      return
                    }

                    const choiceIndex =
                      gameState.currentEvent.steps[
                        gameState.currentStep
                      ]?.choices.findIndex((choice) => choice.text === value) ||
                      0
                    handleEventChoice(choiceIndex)
                  }}
                />
              </Box>
            ) : (
              <Box
                flexDirection="column"
                justifyContent="flex-end"
                minHeight={9}
              >
                <Box>
                  <ActionMenu
                    potions={potions.map((potion) => potion.name)}
                    locations={locations}
                  />
                </Box>
              </Box>
            )}
          </Box>
        )
      )}
    </Box>
  )
}

export default GameScreen
