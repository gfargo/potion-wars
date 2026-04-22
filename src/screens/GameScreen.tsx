import { Box, Text } from 'ink'
import Gradient from 'ink-gradient'
import React, { useEffect } from 'react'
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
  const currentNPCId = useStore((state) => state.npc.current?.npcId)
  const endNPCInteraction = useStore((state) => state.endNPCInteraction)
  const day = useStore((state) => state.game.day)

  // Tutorial system. Gating lives in the Zustand store (`seenTutorials`) so
  // it survives screen remounts during travel. Effects may fire multiple
  // times here — TutorialSystem no-ops when the step is already seen.
  const {
    currentTutorialStep,
    triggerTutorial,
    completeTutorialStep,
    skipTutorial,
  } = useTutorial()

  // Welcome tutorial — fires on mount. Seen-gating means the second+ mount
  // requests it again but the overlay stays hidden.
  useEffect(() => {
    triggerTutorial('game_start')
  }, [])

  // First-travel tutorial — fires once day advances past 0.
  useEffect(() => {
    if (day > 0) {
      triggerTutorial('first_travel')
    }
  }, [day])

  // First-NPC tutorial — fires when an NPC interaction is active.
  useEffect(() => {
    if (showNPC && currentNPCId) {
      triggerTutorial('first_npc')
    }
  }, [showNPC, currentNPCId])

  const handleTutorialComplete = (completedStepId: string) => {
    completeTutorialStep()
    // Chain: after the welcome is dismissed, queue up the market-dynamics
    // tutorial. Small delay prevents the two overlays from stacking.
    if (completedStepId === 'welcome_enhanced') {
      setTimeout(() => {
        triggerTutorial('first_market_view')
      }, 100)
    }
  }

  // Show traveling screen when screen state is 'traveling'
  if (activeScreen === 'traveling') {
    return <TravelingScreen />
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
