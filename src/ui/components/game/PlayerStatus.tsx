import { Box, Text } from 'ink'
import React from 'react'
import { useGame } from '../../../contexts/GameContext.js'
import {
    selectHealth,
    selectCash,
    selectDebt,
} from '../../../core/state/index.js'
import { ReputationDisplay } from './ReputationDisplay.js'

function PlayerStatus() {
  const { gameState } = useGame()
  const health = selectHealth(gameState)
  const cash = selectCash(gameState)
  const debt = selectDebt(gameState)

  return (
    <Box gap={1}>
      <Box borderDimColor borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text>♡ {health}%</Text>
      </Box>
      <Box borderDimColor borderStyle="single" borderColor="blue" paddingX={1}>
        <Text>Purse: {cash}g</Text>
        <Text>{` | `}</Text>
        <Text>Debt: {debt}g</Text>
      </Box>
      <Box borderDimColor borderStyle="single" borderColor="magenta" paddingX={1}>
        <ReputationDisplay 
          reputation={gameState.reputation}
          currentLocation={gameState.location.name}
          compact={true}
        />
      </Box>
    </Box>
  )
}

export default PlayerStatus
