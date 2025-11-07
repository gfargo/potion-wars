import { Box, Text, useInput } from 'ink'
import React, { useState, useEffect } from 'react'

export type TutorialStep = {
  id: string
  title: string
  content: string
  trigger:
    | 'game_start'
    | 'first_travel'
    | 'first_npc'
    | 'first_reputation_change'
    | 'first_market_view'
  completed?: boolean
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome_enhanced',
    title: 'Welcome to Enhanced Potion Wars!',
    content:
      "This version includes NPCs, reputation system, and dynamic markets. Press Enter to continue or 's' to skip tutorial.",
    trigger: 'game_start',
  },
  {
    id: 'npc_introduction',
    title: 'Meet the NPCs',
    content:
      "You'll now encounter NPCs while traveling. They offer trades, information, and dialogue. Your choices affect your reputation!",
    trigger: 'first_travel',
  },
  {
    id: 'reputation_introduction',
    title: 'Reputation Matters',
    content:
      'Your reputation affects prices and opportunities. Be honest and helpful to build good relationships with NPCs.',
    trigger: 'first_npc',
  },
  {
    id: 'market_dynamics',
    title: 'Dynamic Markets',
    content:
      'Markets now respond to supply and demand. Watch for trend arrows and use your reputation for better prices!',
    trigger: 'first_market_view',
  },
]

type TutorialSystemProperties = {
  readonly currentStep?: string
  readonly onComplete?: () => void
  readonly onSkip?: () => void
}

export function TutorialSystem({
  currentStep,
  onComplete,
  onSkip,
}: TutorialSystemProperties) {
  const [activeStep, setActiveStep] = useState<TutorialStep | undefined>(undefined)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [showTutorial, setShowTutorial] = useState(false)

  // Find and show tutorial step
  useEffect(() => {
    if (currentStep) {
      const step = TUTORIAL_STEPS.find((s) => s.trigger === currentStep)
      if (step && !completedSteps.has(step.id)) {
        setActiveStep(step)
        setShowTutorial(true)
      }
    }
  }, [currentStep, completedSteps])

  // Handle input
  useInput((input, key) => {
    if (!activeStep || !showTutorial) return

    if (key.return || input === ' ') {
      // Complete current step
      setCompletedSteps((previous) => new Set(previous).add(activeStep.id))
      setShowTutorial(false)
      setActiveStep(undefined)
      onComplete?.()
    } else if (input === 's') {
      // Skip tutorial
      setShowTutorial(false)
      setActiveStep(undefined)
      onSkip?.()
    } else if (key.escape) {
      // Close current step
      setShowTutorial(false)
      setActiveStep(undefined)
    }
  })

  if (!activeStep || !showTutorial) {
    return null
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="cyan">
          🎓 Tutorial
        </Text>
      </Box>

      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="yellow">
          {activeStep.title}
        </Text>
      </Box>

      <Box marginBottom={2}>
        <Text>{activeStep.content}</Text>
      </Box>

      <Box justifyContent="center" borderStyle="single" paddingX={1}>
        <Text dimColor>
          Press Enter to continue • 's' to skip tutorial • Esc to close
        </Text>
      </Box>
    </Box>
  )
}

// Hook for managing tutorial state
export function useTutorial() {
  const [currentTutorialStep, setCurrentTutorialStep] = useState<
    string | undefined
  >(undefined)
  const [tutorialCompleted, setTutorialCompleted] = useState(false)
  const [tutorialSkipped, setTutorialSkipped] = useState(false)

  const triggerTutorial = (step: TutorialStep['trigger']) => {
    if (!tutorialCompleted && !tutorialSkipped) {
      setCurrentTutorialStep(step)
    }
  }

  const completeTutorialStep = () => {
    setCurrentTutorialStep(undefined)
  }

  const skipTutorial = () => {
    setTutorialSkipped(true)
    setCurrentTutorialStep(undefined)
  }

  const resetTutorial = () => {
    setTutorialCompleted(false)
    setTutorialSkipped(false)
    setCurrentTutorialStep(undefined)
  }

  return {
    currentTutorialStep,
    tutorialCompleted,
    tutorialSkipped,
    triggerTutorial,
    completeTutorialStep,
    skipTutorial,
    resetTutorial,
  }
}

// Quick help overlay for experienced players
export function QuickHelpOverlay({
  visible,
  onClose,
}: {
  readonly visible: boolean
  readonly onClose: () => void
}) {
  useInput((input, key) => {
    if (key.escape || input === 'h') {
      onClose()
    }
  })

  if (!visible) return null

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={1}
      width={40}
    >
      <Text bold color="yellow">
        Quick Help
      </Text>
      <Text dimColor>• NPCs: Dialogue affects reputation</Text>
      <Text dimColor>• Reputation: Better prices & opportunities</Text>
      <Text dimColor>• Markets: ↗↘ show price trends</Text>
      <Text dimColor>• Trading: NPCs offer unique deals</Text>
      <Text dimColor>• Information: Ask NPCs for market tips</Text>
      <Box marginTop={1} justifyContent="center">
        <Text dimColor>Press 'h' or Esc to close</Text>
      </Box>
    </Box>
  )
}
