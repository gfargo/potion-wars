import { Box, Text, useInput } from 'ink'
import React from 'react'
import { useStore } from '../store/appStore.js'

type GameOverProperties = {
  readonly finalScore: number
}

export function GameOver({ finalScore }: GameOverProperties) {
  const setScreen = useStore((state) => state.setScreen)

  useInput((_, key) => {
    if (key.return) {
      setScreen('title')
    }
  })

  return (
    <Box flexDirection="column">
      <Text bold color="red">
        Game Over!
      </Text>
      <Text>Final score: {finalScore} gold</Text>
      <Text>Press &apos;Enter&apos; to return to the main menu</Text>
    </Box>
  )
}

export default GameOver
