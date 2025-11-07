import { Box, Text } from 'ink'
import React, { useMemo } from 'react'
import { useStore } from '../../../store/appStore.js'
// import { EnhancedMarketDisplay } from './EnhancedMarketDisplay.js'

// Stable selectors defined outside component to prevent recreation
const selectGamePrices = (state: any) => state.game.prices

function PriceList() {
  const gamePrices = useStore(selectGamePrices)

  // Get prices for fallback display
  const prices = useMemo(() => {
    return Object.entries(gamePrices).sort((a, b) => a[0].localeCompare(b[0]))
  }, [gamePrices])

  // TEMPORARILY DISABLED: If enhanced market data is available, use the enhanced display
  // TODO: Fix EnhancedMarketDisplay infinite render loop
  // if (locationMarkets && Object.keys(locationMarkets).length > 0) {
  //   return (
  //     <EnhancedMarketDisplay
  //       compact
  //       showTrends
  //       markets={locationMarkets}
  //       reputation={reputation}
  //       currentLocation={locationName}
  //       prices={gamePrices}
  //     />
  //   )
  // }

  // Fallback to original price list
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
          {potion}: {String(price)}g
        </Text>
      ))}
    </Box>
  )
}

export default PriceList
