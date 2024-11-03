import { Box, Text } from 'ink'
import React from 'react'
import { useGame } from '../contexts/GameContext.js'

const PriceList: React.FC = () => {
  const { gameState } = useGame()

  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold italic>Prices:</Text>
      {Object.entries(gameState.prices).map(([drug, price]) => (
        <Text key={drug}>
          {drug}: ${price}
        </Text>
      ))}
    </Box>
  )
}

export default PriceList

