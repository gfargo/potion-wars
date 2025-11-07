import { Box } from 'ink'
import React from 'react'
import { useStore } from './store/appStore.js'
import { selectActiveScreen } from './store/selectors.js'
import GameOver from './screens/GameOver.js'
import GameScreen from './screens/GameScreen.js'
import { LoadingScreen } from './screens/LoadingScreen.js'
import TitleScreen from './screens/TitleScreen/index.js'

function AppContent() {
  // Get screen and state from Zustand store
  const activeScreen = useStore(selectActiveScreen)
  const setScreen = useStore((state) => state.setScreen)
  const cash = useStore((state) => state.game.cash)
  const debt = useStore((state) => state.game.debt)
  const inventory = useStore((state) => state.game.inventory)

  // Calculate final score for game over screen
  const finalScore =
    cash -
    debt +
    Object.values(inventory).reduce((sum, count) => sum + count, 0) * 100

  return (
    <Box flexDirection="column" paddingX={1}>
      {activeScreen === 'title' && <TitleScreen />}
      {activeScreen === 'loading' && (
        <LoadingScreen
          onFinish={() => {
            setScreen('game')
          }}
        />
      )}
      {activeScreen === 'traveling' && <GameScreen />}
      {activeScreen === 'game' && <GameScreen />}
      {activeScreen === 'game-over' && <GameOver finalScore={finalScore} />}
    </Box>
  )
}

export default function App() {
  // Zustand doesn't need providers - just render the app!
  return <AppContent />
}
