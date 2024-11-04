import { Box } from 'ink'
import React from 'react'
import { GAME_SCREEN_HEIGHT } from './constants.js'
import { GameProvider, useGame } from './contexts/GameContext.js'
import { UIProvider, useUI } from './contexts/UIContext.js'
import GameOver from './screens/GameOver.js'
import GameScreen from './screens/GameScreen.js'
import MainMenu from './screens/MainMenu.js'

function AppContent() {
  const { currentScreen } = useUI()
  const { gameState } = useGame()

  return (
    <Box flexDirection="column" padding={1} minHeight={GAME_SCREEN_HEIGHT}>
      {currentScreen === 'main-menu' && <MainMenu />}
      {currentScreen === 'game' && <GameScreen />}
      {currentScreen === 'game-over' && (
        <GameOver finalScore={gameState.cash - gameState.debt + Object.values(gameState.inventory).reduce((sum, count) => sum + count, 0) * 100} />
      )}
    </Box>
  )
}

export default function App() {
  return (
    <UIProvider>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </UIProvider>
  )
}

