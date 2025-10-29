import React, { createContext, useContext, useMemo, useState } from 'react'

export type Screen =
  | 'title'
  | 'loading'
  | 'game'
  | 'traveling'
  | 'event'
  | 'game-over'

export type TravelState =
  | { status: 'idle' }
  | { status: 'animating'; destination: string }
  | { status: 'complete'; destination: string }

type UIContextType = {
  currentScreen: Screen
  showHelp: boolean
  quitConfirmation: boolean
  combatResult: string | undefined
  travelState: TravelState
  setScreen: (screen: Screen) => void
  toggleHelp: () => void
  setQuitConfirmation: (value: boolean) => void
  setCombatResult: (result: string | undefined) => void
  setTravelDestination: (destination: string) => void
  completeTravelAnimation: () => void
  resetTravelState: () => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

type UIProviderProperties = {
  readonly children: React.ReactNode
  readonly initialScreen?: Screen
}

export function UIProvider({
  children,
  initialScreen = 'title',
}: UIProviderProperties) {
  const [currentScreen, setCurrentScreen] = useState<Screen>(initialScreen)
  const [showHelp, setShowHelp] = useState(false)
  const [quitConfirmation, setQuitConfirmation] = useState(false)
  const [combatResult, setCombatResult] = useState<string | undefined>(
    undefined
  )
  const [travelState, setTravelState] = useState<TravelState>({ status: 'idle' })

  const setScreen = (screen: Screen) => {
    setCurrentScreen(screen)
  }

  const toggleHelp = () => {
    setShowHelp((previous) => !previous)
  }

  const setTravelDestination = (destination: string) => {
    setTravelState({ status: 'animating', destination })
  }

  const completeTravelAnimation = () => {
    setTravelState((current) =>
      current.status === 'animating'
        ? { status: 'complete', destination: current.destination }
        : current
    )
  }

  const resetTravelState = () => {
    setTravelState({ status: 'idle' })
  }

  const uiContextValue = useMemo(
    () => ({
      currentScreen,
      showHelp,
      quitConfirmation,
      combatResult,
      travelState,
      setScreen,
      toggleHelp,
      setQuitConfirmation,
      setCombatResult,
      setTravelDestination,
      completeTravelAnimation,
      resetTravelState,
    }),
    [currentScreen, showHelp, quitConfirmation, combatResult, travelState]
  )

  return (
    <UIContext.Provider value={uiContextValue}>{children}</UIContext.Provider>
  )
}

export const useUI = () => {
  const context = useContext(UIContext)
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider')
  }

  return context
}
