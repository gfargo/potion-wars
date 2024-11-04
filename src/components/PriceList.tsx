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
      minWidth={22}
    >
      <Text bold italic>
        Potion Prices:
      </Text>
      {Object.entries(gameState.prices).map(([potion, price]) => (
        <Text key={potion}>
          {potion}: {price} gold
        </Text>
      ))}
    </Box>
  )
}

export default PriceList

