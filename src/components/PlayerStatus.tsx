import { Box, Text } from 'ink'
import React from 'react'
import { useGame } from '../contexts/GameContext.js'

function PlayerStatus() {
  const { gameState } = useGame()

  return (
    <Box
      borderDimColor
      borderStyle="single"
      borderColor="blue"
      paddingX={1}
      marginX={3}
    >
      <Text>Gold: {gameState.cash}</Text>
      <Text>{` | `}</Text>
      <Text>Debt: {gameState.debt} gold</Text>
      <Text>{` | `}</Text>
      <Text>Health: {gameState.health}%</Text>
    </Box>
  )
}

export default PlayerStatus

