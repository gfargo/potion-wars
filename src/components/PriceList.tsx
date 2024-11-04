import { Box, Text } from 'ink'
import React from 'react'
import { useGame } from '../contexts/GameContext.js'

function PriceList() {
  const { gameState } = useGame()

  return (
    <Box
      borderDimColor
      flexDirection="column"
      paddingX={1}
      borderStyle="singleDouble"
      minWidth={40}
    >
      <Text bold>Prices 🧪</Text>
      {Object.entries(gameState.prices).map(([potion, price]) => (
        <Text key={potion}>
          {potion}: {price}g
        </Text>
      ))}
    </Box>
  )
}

export default PriceList
