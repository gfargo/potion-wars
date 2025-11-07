import { Box, Text } from 'ink'
import Gradient from 'ink-gradient'
import React, { useEffect, useState } from 'react'
import { HELP_TEXT, locations, potions } from '../constants.js'
import { useStore } from '../store/appStore.js'
import {
  selectShouldShowEvent,
  selectShouldShowNPC,
  selectActiveScreen,
} from '../store/selectors.js'
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
import { NPCManager } from '../core/npcs/NPCManager.js'
import MultiStepEventScreen from './MultiStepEventScreen.js'
import NPCInteractionScreen from './NPCInteractionScreen.js'
import TravelingScreen from './TravelingScreen.js'

export function GameScreen() {
  // Get state from Zustand store using selectors
  const showHelp = useStore((state) => state.ui.showHelp)
  const quitConfirmation = useStore((state) => state.ui.quitConfirmation)
  const activeScreen = useStore(selectActiveScreen)
  const showEvent = useStore(selectShouldShowEvent)
  const showNPC = useStore(selectShouldShowNPC)
  const locationName = useStore((state) => state.game.location.name)
  const currentNPCId = useStore((state) => state.npc.current?.npcId)
  const endNPCInteraction = useStore((state) => state.endNPCInteraction)
  const currentEvent = useStore((state) => state.events.current)
  const eventPhase = useStore((state) => state.events.phase)

  // Debug logging
  if (currentEvent || showEvent) {
    console.error('[GameScreen] showEvent:', showEvent, 'currentEvent:', currentEvent?.name, 'phase:', eventPhase)
  }

  const [isTraveling, setIsTraveling] = useState(false)
  const [previousLocation, setPreviousLocation] = useState<string | undefined>(
    undefined
  )

  // Track location changes for travel animation
  useEffect(() => {
    if (activeScreen === 'traveling' && !previousLocation) {
      // When entering traveling screen, capture the current location as "from"
      setPreviousLocation(locationName)
    } else if (activeScreen === 'game' && previousLocation) {
      // When returning to game screen, clear the previous location
      setPreviousLocation(undefined)
    }
  }, [activeScreen, locationName, previousLocation])

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
  if (activeScreen === 'traveling' || isTraveling) {
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
      <Box
        flexDirection="column"
        height="100%"
        alignItems="center"
        justifyContent="center"
      >
        <QuitMenu />
      </Box>
    )
  }

  // Check for NPC interaction
  if (showNPC && currentNPCId) {
    const npcManager = NPCManager.getInstance()
    const npc = npcManager.getNPC(currentNPCId)

    if (npc) {
      return (
        <NPCInteractionScreen
          npc={npc}
          onComplete={() => {
            // End the NPC interaction using store action
            console.error('[GameScreen] onComplete callback triggered')
            endNPCInteraction()
            console.error('[GameScreen] endNPCInteraction called')
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
            <Box marginTop={1} flexDirection="column" justifyContent="flex-end">
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
