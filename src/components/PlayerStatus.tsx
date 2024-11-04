import { Box, Text } from 'ink'
import React from 'react'
import { useGame } from '../contexts/GameContext.js'

function PlayerStatus() {
  const { gameState } = useGame()

  return (
    <Box marginX={3}>
      <Box
        borderDimColor
        borderStyle="single"
        borderColor="blue"
        paddingX={1}
        marginRight={1}
      >
        <Text>Purse: {gameState.cash}g</Text>
        <Text>{` | `}</Text>
        <Text>Debt: {gameState.debt}g</Text>
      </Box>
      <Box borderDimColor borderStyle="single" borderColor="red" paddingX={1}>
        <Text>♡ {gameState.health}%</Text>
      </Box>
    </Box>
  )
}

export default PlayerStatus
