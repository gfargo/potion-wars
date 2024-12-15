import React, { createContext, useContext, useMemo, useState } from 'react'

export type Screen =
  | 'title'
  | 'loading'
  | 'game'
  | 'traveling'
  | 'event'
  | 'game-over'

type UIContextType = {
  currentScreen: Screen
  showHelp: boolean
  quitConfirmation: boolean
  combatResult: string | undefined
  setScreen: (screen: Screen) => void
  toggleHelp: () => void
  setQuitConfirmation: (value: boolean) => void
  setCombatResult: (result: string | undefined) => void
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

  const setScreen = (screen: Screen) => {
    setCurrentScreen(screen)
  }

  const toggleHelp = () => {
    setShowHelp((previous) => !previous)
  }

  const uiContextValue = useMemo(
    () => ({
      currentScreen,
      showHelp,
      quitConfirmation,
      combatResult,
      setScreen,
      toggleHelp,
      setQuitConfirmation,
      setCombatResult,
    }),
    [currentScreen, showHelp, quitConfirmation, combatResult]
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
