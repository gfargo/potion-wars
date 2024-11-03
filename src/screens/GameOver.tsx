import { Box, Text, useInput } from 'ink'
import React from 'react'
import { useUI } from '../contexts/UIContext.js'

interface GameOverProps {
  finalScore: number
}

export const GameOver: React.FC<GameOverProps> = ({ finalScore }) => {
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
      <Text>Final score: ${finalScore}</Text>
      <Text>Press 'Enter' to return to the main menu</Text>
    </Box>
  )
}

export default GameOver
