import { Box, Text } from 'ink'
import React from 'react'
import { useGame } from '../contexts/GameContext.js'

const Day: React.FC = () => {
  const { gameState } = useGame()

  return (
    <Box>
      <Text  italic bold color="green">
        Day {gameState.day}/30
      </Text>
    </Box>
  )
}

export default Day
