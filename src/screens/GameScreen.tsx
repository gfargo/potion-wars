import { Box, Text } from 'ink'
import Gradient from 'ink-gradient'
import React, { useEffect, useState } from 'react'
import { HELP_TEXT, locations, potions } from '../constants.js'
import { useGame } from '../contexts/GameContext.js'
import { useMessage } from '../contexts/MessageContext.js'
import { useUI } from '../contexts/UIContext.js'
import { EnhancedSelectInput } from '../ui/components/common/index.js'
import {
  ActionMenu,
  Day,
  GameLog,
  InventoryDisplay,
  Location,
  PlayerStatus,
  PriceList,
  Weather,
} from '../ui/components/game/index.js'
import MultiStepEventScreen from './MultiStepEventScreen.js'
import TravelingScreen from './TravelingScreen.js'

export function GameScreen() {
  const { showHelp, quitConfirmation } = useUI()
  const { addMessage } = useMessage()
  const {
    gameState,
    // HandleAction,
    handleEventChoice,
  } = useGame()
  const [isTraveling, setIsTraveling] = useState(false)
  const [showEvent, setShowEvent] = useState(false)

  useEffect(() => {
    setShowEvent(Boolean(gameState.currentEvent))
  }, [gameState.currentEvent])

  // Const handleSave = (slot: number) => {
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
    return (
      <TravelingScreen
        onFinish={() => {
          setIsTraveling(false)
        }}
      />
    )
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
          <Box flexDirection="column" flexGrow={1}>
            <Box>
              <InventoryDisplay />
              <PriceList />
              <Location />
            </Box>
            <GameLog />
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
                    // Key: index,
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
                      ]?.choices.findIndex((choice) => choice.text === value) ??
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
