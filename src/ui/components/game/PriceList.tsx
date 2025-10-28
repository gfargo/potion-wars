import { Box, Text } from 'ink'
import React from 'react'
import { useGame } from '../../../contexts/GameContext.js'
import { selectPriceList } from '../../../core/state/index.js'
import { EnhancedMarketDisplay } from './EnhancedMarketDisplay.js'

function PriceList() {
  const { gameState } = useGame()
  const prices = selectPriceList(gameState)

  // If enhanced market data is available, use the enhanced display
  if (gameState.marketData && Object.keys(gameState.marketData).length > 0) {
    const locationMarkets = gameState.marketData[gameState.location.name]
    
    if (locationMarkets && Object.keys(locationMarkets).length > 0) {
      return (
        <EnhancedMarketDisplay
          markets={locationMarkets}
          reputation={gameState.reputation}
          currentLocation={gameState.location.name}
          compact={true}
          showTrends={true}
        />
      )
    }
  }

  // Fallback to original price list if no enhanced data
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
