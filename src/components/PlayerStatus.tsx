import { Box, Text } from 'ink'
import React from 'react'
import { useGame } from '../contexts/GameContext.js'

const PlayerStatus: React.FC = () => {
  const { gameState } = useGame()

  return (
    <Box borderStyle="single" borderColor="blue" paddingX={1} borderDimColor marginX={3}>
      <Text>Cash: ${gameState.cash}</Text>
      <Text>{` `}</Text>
      <Text>Debt: ${gameState.debt}</Text>
      <Text>{` `}</Text>
      <Text>Health: {gameState.health}%</Text>
    </Box>
  )
}

export default PlayerStatus
