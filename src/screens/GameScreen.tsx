import { Box, Text } from 'ink'
import Gradient from 'ink-gradient'
import React, { useEffect, useState } from 'react'
import { HELP_TEXT, locations, potions } from '../constants.js'
import { useGame } from '../contexts/GameContext.js'
import { useUI } from '../contexts/UIContext.js'
import {
  ActionMenu,
  Day,
  GameLog,
  InventoryDisplay,
  Location,
  PlayerStatus,
  PriceList,
  QuitMenu,
  Weather,
} from '../ui/components/game/index.js'
import MultiStepEventScreen from './MultiStepEventScreen.js'
import NPCInteractionScreen from './NPCInteractionScreen.js'
import TravelingScreen from './TravelingScreen.js'
import { NPCManager } from '../core/npcs/NPCManager.js'

export function GameScreen() {
  const { showHelp, quitConfirmation, currentScreen } = useUI()
  const {
    gameState,
    handleAction,
  } = useGame()
  const [isTraveling, setIsTraveling] = useState(false)
  const [previousLocation, setPreviousLocation] = useState<string | undefined>(undefined)

  // Derive showEvent directly from gameState instead of using local state
  // This ensures we always have the latest event status
  const showEvent = Boolean(gameState.currentEvent)

  // Track location changes for travel animation
  useEffect(() => {
    if (currentScreen === 'traveling' && !previousLocation) {
      // When entering traveling screen, capture the current location as "from"
      setPreviousLocation(gameState.location.name)
    } else if (currentScreen === 'game' && previousLocation) {
      // When returning to game screen, clear the previous location
      setPreviousLocation(undefined)
    }
  }, [currentScreen, gameState.location.name, previousLocation])

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

  // Show traveling screen when screen state is 'traveling'
  if (currentScreen === 'traveling' || isTraveling) {
    return (
      <TravelingScreen
        fromLocation={previousLocation}
        onFinish={() => {
          setIsTraveling(false)
          // Note: Screen transition back to 'game' is handled by the travel action
        }}
      />
    )
  }

  if (showEvent) {
    return <MultiStepEventScreen />
  }

  if (quitConfirmation) {
    return (
      <Box flexDirection="column" height="100%" alignItems="center" justifyContent="center">
        <QuitMenu />
      </Box>
    )
  }

  // Check for NPC interaction
  if (gameState.currentNPCInteraction) {
    const npcManager = NPCManager.getInstance()
    const npc = npcManager.getNPC(gameState.currentNPCInteraction.npcId)

    if (npc) {
      return (
        <NPCInteractionScreen
          npc={npc}
          onComplete={() => {
            // End the NPC interaction
            handleAction('npcInteraction', {
              npcId: npc.id,
              action: 'end',
              data: {}
            })
          }}
        />
      )
    }
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
          </Box>
        )
      )}
    </Box>
  )
}

export default GameScreen
