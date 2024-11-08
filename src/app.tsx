import { Box } from 'ink'
import React, { useEffect } from 'react'
import { GAME_SCREEN_HEIGHT } from './constants.js'
import { GameProvider, useGame } from './contexts/GameContext.js'
import { MessageProvider } from './contexts/MessageContext.js'
import { UIProvider, useUI } from './contexts/UIContext.js'
import { useStdoutDimensions } from './hooks/useStdOutDimensions.js'
import GameOver from './screens/GameOver.js'
import GameScreen from './screens/GameScreen.js'
import MainMenu from './screens/MainMenu.js'
import { saveGame } from './saveLoad.js'

function AppContent() {
  const { currentScreen } = useUI()
  const { gameState, activeSlot } = useGame()
  const [_, columns] = useStdoutDimensions()

  useEffect(() => {
    const handleExit = () => {
      saveGame(gameState, activeSlot) // Auto-save to active slot when exiting
      process.exit()
    }

    process.on('SIGINT', handleExit)
    process.on('SIGTERM', handleExit)

    return () => {
      process.off('SIGINT', handleExit)
      process.off('SIGTERM', handleExit)
    }
  }, [gameState, activeSlot])

  return (
    <Box
      flexDirection="column"
      paddingX={1}
      minHeight={columns >= GAME_SCREEN_HEIGHT ? columns : GAME_SCREEN_HEIGHT}
    >
      {currentScreen === 'main-menu' && <MainMenu />}
      {currentScreen === 'game' && <GameScreen />}
      {currentScreen === 'game-over' && (
        <GameOver
          finalScore={
            gameState.cash -
            gameState.debt +
            Object.values(gameState.inventory).reduce(
              (sum, count) => sum + count,
              0
            ) *
              100
          }
        />
      )}
    </Box>
  )
}

export default function App() {
  return (
    <UIProvider>
      <MessageProvider>
        <GameProvider>
          <AppContent />
        </GameProvider>
      </MessageProvider>
    </UIProvider>
  )
}

