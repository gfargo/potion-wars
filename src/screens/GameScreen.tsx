import { Box, Text } from 'ink'
import Gradient from 'ink-gradient'
import React, { useEffect, useRef, useState } from 'react'
import { HELP_TEXT, locations, potions } from '../constants.js'
import { useStore } from '../store/appStore.js'
import {
    selectShouldShowEvent,
    selectShouldShowNPC,
    selectActiveScreen,
    selectActiveCombat,
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
import { TutorialSystem, useTutorial } from '../ui/components/common/TutorialSystem.js'
import MultiStepEventScreen from './MultiStepEventScreen.js'
import NPCInteractionScreen from './NPCInteractionScreen.js'
import TravelingScreen from './TravelingScreen.js'
import CombatScreen from './CombatScreen.js'

export function GameScreen() {
  // Get state from Zustand store using selectors
  const showHelp = useStore((state) => state.ui.showHelp)
  const quitConfirmation = useStore((state) => state.ui.quitConfirmation)
  const activeScreen = useStore(selectActiveScreen)
  const showEvent = useStore(selectShouldShowEvent)
  const showNPC = useStore(selectShouldShowNPC)
  const activeCombat = useStore(selectActiveCombat)
  const locationName = useStore((state) => state.game.location.name)
  const currentNPCId = useStore((state) => state.npc.current?.npcId)
  const endNPCInteraction = useStore((state) => state.endNPCInteraction)
  const day = useStore((state) => state.game.day)

  const [isTraveling, setIsTraveling] = useState(false)
  const [previousLocation, setPreviousLocation] = useState<string | undefined>(
    undefined
  )

  // Tutorial system
  const {
    currentTutorialStep,
    triggerTutorial,
    completeTutorialStep,
    skipTutorial,
  } = useTutorial()
  const hasTriggeredStart = useRef(false)
  const hasTriggeredTravel = useRef(false)
  const hasTriggeredNPC = useRef(false)
  const hasTriggeredMarket = useRef(false)

  // Trigger game_start tutorial on first render
  useEffect(() => {
    if (!hasTriggeredStart.current) {
      hasTriggeredStart.current = true
      triggerTutorial('game_start')
    }
  }, [])

  // Trigger first_travel after first travel completes (day goes from 0 to 1+)
  useEffect(() => {
    if (day > 0 && !hasTriggeredTravel.current) {
      hasTriggeredTravel.current = true
      triggerTutorial('first_travel')
    }
  }, [day])

  // Trigger first_npc when NPC interaction starts
  useEffect(() => {
    if (showNPC && currentNPCId && !hasTriggeredNPC.current) {
      hasTriggeredNPC.current = true
      triggerTutorial('first_npc')
    }
  }, [showNPC, currentNPCId])

  // Trigger first_market_view after game_start tutorial is dismissed
  const handleTutorialComplete = () => {
    completeTutorialStep()
    if (!hasTriggeredMarket.current && hasTriggeredStart.current) {
      hasTriggeredMarket.current = true
      // Small delay so the market tutorial doesn't stack immediately
      setTimeout(() => {
        triggerTutorial('first_market_view')
      }, 100)
    }
  }

  // Track location changes for travel animation
  useEffect(() => {
    if (activeScreen === 'traveling' && !previousLocation) {
      setPreviousLocation(locationName)
    } else if (activeScreen === 'game' && previousLocation) {
      setPreviousLocation(undefined)
    }
  }, [activeScreen, locationName, previousLocation])

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

  if (activeCombat) {
    return <CombatScreen />
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
            endNPCInteraction()
          }}
        />
      )
    }
  }

  return (
    <Box flexDirection="column" height="100%">
      <TutorialSystem
        currentStep={currentTutorialStep}
        onComplete={handleTutorialComplete}
        onSkip={skipTutorial}
      />
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
