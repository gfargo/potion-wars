import { Box, Text } from 'ink'
import React from 'react'
import { useGame } from '../contexts/GameContext.js'

function PlayerStatus() {
  const { gameState } = useGame()

  return (
    <Box>
      <Box borderDimColor borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text>♡ {gameState.health}%</Text>
      </Box>
      <Box borderDimColor borderStyle="single" borderColor="blue" paddingX={1}>
        <Text>Purse: {gameState.cash}g</Text>
        <Text>{` | `}</Text>
        <Text>Debt: {gameState.debt}g</Text>
      </Box>
    </Box>
  )
}

export default PlayerStatus
