import { Box, Text, useInput } from 'ink'
import React from 'react'
import { useUI } from '../contexts/UIContext.js'

type GameOverProperties = {
  readonly finalScore: number
}

export function GameOver({ finalScore }: GameOverProperties) {
  const { setScreen } = useUI()

  useInput((_, key) => {
    if (key.return) {
      setScreen('main-menu')
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

