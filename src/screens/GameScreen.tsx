import { Box, Text } from 'ink'
import Gradient from 'ink-gradient'
import React, { useEffect, useState } from 'react'
import EnhancedSelectInput from '../components/EnhancedSelectInput.js'
import { HELP_TEXT, locations, potions } from '../constants.js'
import { useGame } from '../contexts/GameContext.js'
import { useMessage } from '../contexts/MessageContext.js'
import { useUI } from '../contexts/UIContext.js'
import ActionMenu from '../ui/ActionMenu.js'
import Day from '../ui/Day.js'
import InventoryDisplay from '../ui/InventoryDisplay.js'
import Location from '../ui/Location.js'
import Message from '../ui/Message.js'
import PlayerStatus from '../ui/PlayerStatus.js'
import PriceList from '../ui/PriceList.js'
import Weather from '../ui/Weather.js'
import MultiStepEventScreen from './MultiStepEventScreen.js'
import TravelingScreen from './TravelingScreen.js'

function GameScreen() {
  const { showHelp, quitConfirmation } = useUI()
  const { addMessage } = useMessage()
  const {
    gameState,
    //handleAction,
    handleEventChoice,
  } = useGame()
  const [isTraveling, setIsTraveling] = useState(false)
  const [showEvent, setShowEvent] = useState(false)

  useEffect(() => {
    setShowEvent(!!gameState.currentEvent)
  }, [gameState.currentEvent])

  // const handleSave = (slot: number) => {
  //   handleAction('saveGame', { slot })
  // }

  // const handleTravel = (location: string) => {
  //   setIsTraveling(true)
  //   setTimeout(() => {
  //     handleAction('travel', { location })
  //     setIsTraveling(false)
  //   }, 4000)
  // }

  // const actionMenuItems = [
  //   ...potions.map((potion, index) => ({
  //     label: `Brew ${potion.name}`,
  //     value: `brew_${potion.name}`,
  //     hotkey: `${index + 1}`,
  //     indicator: '🧪',
  //     disabled: gameState.cash < potion.minPrice
  //   })),
  //   ...potions.map((potion, index) => ({
  //     label: `Sell ${potion.name}`,
  //     value: `sell_${potion.name}`,
  //     hotkey: `${index + 1 + potions.length}`,
  //     indicator: '💰',
  //     disabled: !gameState.inventory[potion.name] || gameState.inventory[potion.name] === 0
  //   })),
  //   ...locations.map((location, index) => ({
  //     label: `Travel to ${location.name}`,
  //     value: `travel_${location.name}`,
  //     hotkey: `${String.fromCharCode(97 + index)}`,
  //     indicator: '🏃‍♂️',
  //     disabled: location.name === gameState.location.name
  //   })),
  //   { label: 'Repay Debt', value: 'repay_debt', hotkey: 'r', indicator: '💸', disabled: gameState.cash === 0 || gameState.debt === 0 },
  //   { label: 'Save Game (Slot 1)', value: 'save_0', hotkey: 's', indicator: '💾' },
  //   { label: 'Save Game (Slot 2)', value: 'save_1', hotkey: 'S', indicator: '💾' },
  //   { label: 'Save Game (Slot 3)', value: 'save_2', hotkey: 'D', indicator: '💾' },
  // ]

  if (isTraveling) {
    return <TravelingScreen onFinish={() => setIsTraveling(false)} />
  }

  if (showEvent) {
    return <MultiStepEventScreen />
  }

  return (
    <Box flexDirection="column" height="100%">
      <Box
        marginTop={1}
        alignItems="center"
        width="100%"
        justifyContent="space-between"
      >
        <Box alignItems="center" gap={2}>
          <Box marginRight={3}>
            <Gradient name="pastel">
              <Text bold dimColor>
                Potion Wars
              </Text>
            </Gradient>
          </Box>
          <PlayerStatus />
        </Box>
        <Box gap={2}>
          <Day />
          <Weather />
        </Box>
      </Box>
      {showHelp ? (
        <Text>{HELP_TEXT}</Text>
      ) : (
        !quitConfirmation && (
          <Box flexDirection="column">
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

                <EnhancedSelectInput
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
                marginTop={1}
                flexDirection="column"
                justifyContent="flex-end"
                // minHeight={9}
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
