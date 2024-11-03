import { Box, Text } from 'ink'
import React from 'react'

interface PriceListProps {
  prices: { [key: string]: number }
}

const PriceList: React.FC<PriceListProps> = ({ prices }) => {
  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold italic>Prices:</Text>
      {Object.entries(prices).map(([drug, price]) => (
        <Text key={drug}>
          {drug}: ${price}
        </Text>
      ))}
    </Box>
  )
}

export default PriceList
