import { Box, Text } from 'ink'
import React from 'react'
import { useGame } from '../../../contexts/GameContext.js'
import { selectPriceList } from '../../../core/state/index.js'

function PriceList() {
  const { gameState } = useGame()
  const prices = selectPriceList(gameState)

  return (
    <Box
      borderDimColor
      flexDirection="column"
      paddingX={1}
      borderStyle="singleDouble"
      minWidth={40}
    >
      <Text bold>Prices 🧪</Text>
      {prices.map(([potion, price]) => (
        <Text key={potion}>
          {potion}: {price}g
        </Text>
      ))}
    </Box>
  )
}

export default PriceList
