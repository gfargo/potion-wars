import { Box, Text } from 'ink'
import React from 'react'
import { useGame } from '../contexts/GameContext.js'

const PriceList: React.FC = () => {
  const { gameState } = useGame()

  return (
    <Box flexDirection="column" paddingX={1} borderStyle="singleDouble" borderDimColor minWidth={22}>
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
