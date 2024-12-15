import { Box } from 'ink'
import React from 'react'
import { GameProvider, useGame } from './contexts/GameContext.js'
import { MessageProvider } from './contexts/MessageContext.js'
import { UIProvider, useUI } from './contexts/UIContext.js'
import GameOver from './screens/GameOver.js'
import GameScreen from './screens/GameScreen.js'
import { LoadingScreen } from './screens/LoadingScreen.js'
import TitleScreen from './screens/TitleScreen/index.js'

function AppContent() {
  // Const { exit } = useApp()
  const { currentScreen, setScreen } = useUI()
  const { gameState } = useGame()
  // Const [_, columns] = useStdoutDimensions()

  // useEffect(() => {
  //   const handleExit = () => {
  //     saveGame(gameState, activeSlot) // Auto-save to active slot when exiting
  //     exit()
  //   }

  //   process.on('SIGINT', handleExit)
  //   process.on('SIGTERM', handleExit)

  //   return () => {
  //     process.off('SIGINT', handleExit)
  //     process.off('SIGTERM', handleExit)
  //   }
  // }, [gameState, activeSlot])

  return (
    <Box
      flexDirection="column"
      paddingX={1}
      // MinHeight={columns >= GAME_SCREEN_HEIGHT ? columns : GAME_SCREEN_HEIGHT}
    >
      {currentScreen === 'title' && <TitleScreen />}
      {currentScreen === 'loading' && (
        <LoadingScreen
          onFinish={() => {
            setScreen('game')
          }}
        />
      )}
      {currentScreen === 'traveling' && <GameScreen />}
      {currentScreen === 'event' && <GameScreen />}
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
