import { Box, Text } from 'ink'
import React from 'react'

interface InventoryDisplayProps {
  inventory: { [key: string]: number }
}

const InventoryDisplay: React.FC<InventoryDisplayProps> = ({ inventory }) => {
  const inventoryEntries = Object.entries(inventory)

  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold italic>
        Inventory:
      </Text>
      {inventoryEntries.length > 0 ? (
        inventoryEntries.map(([drug, quantity]) => (
          <Text key={drug}>
            {drug}: {quantity}
          </Text>
        ))
      ) : (
        <Text dimColor>Empty</Text>
      )}
    </Box>
  )
}

export default InventoryDisplay
