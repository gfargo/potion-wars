import { Box, Text } from 'ink'
import React from 'react'
import { useGame } from '../../../contexts/GameContext.js'
import { selectInventory } from '../../../core/state/index.js'

function InventoryDisplay() {
  const { gameState } = useGame()
  const inventory = selectInventory(gameState)
  const inventoryEntries = Object.entries(inventory)

  return (
    <Box
      borderDimColor
      flexDirection="column"
      paddingX={1}
      borderStyle="bold"
      minWidth={22}
    >
      <Text bold>Inventory 🎒</Text>
      {inventoryEntries.length > 0 ? (
        inventoryEntries.map(([potion, quantity]) => (
          <Text key={potion}>
            {potion}: {quantity}
          </Text>
        ))
      ) : (
        <Text dimColor>Empty</Text>
      )}
    </Box>
  )
}

export default InventoryDisplay
