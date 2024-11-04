import React, { createContext, useContext, useState } from 'react'

type Screen = 'main-menu' | 'game' | 'game-over'

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

export const UIProvider: React.FC<{ readonly children: React.ReactNode }> = ({
  children,
}) => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('main-menu')
  const [showHelp, setShowHelp] = useState(false)
  const [quitConfirmation, setQuitConfirmation] = useState(false)
  const [combatResult, setCombatResult] = useState<string | undefined>(undefined)

  const setScreen = (screen: Screen) => {
    setCurrentScreen(screen)
  }

  const toggleHelp = () => {
    setShowHelp((previous) => !previous)
  }

  return (
    <UIContext.Provider
      value={{
        currentScreen,
        showHelp,
        quitConfirmation,
        combatResult,
        setScreen,
        toggleHelp,
        setQuitConfirmation,
        setCombatResult,
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export const useUI = () => {
  const context = useContext(UIContext)
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider')
  }

  return context
}
