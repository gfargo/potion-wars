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
        Prices:
      </Text>
      {Object.entries(gameState.prices).map(([drug, price]) => (
        <Text key={drug}>
          {drug}: ${price}
        </Text>
      ))}
    </Box>
  )
}

export default PriceList
