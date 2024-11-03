import { Box, Text, useInput } from 'ink'
import SelectInput from 'ink-select-input'
import React, { useState } from 'react'

interface ActionMenuProps {
  onAction: (action: string, params?: any) => void
  drugs: string[]
  locations: string[]
}

const ActionMenu: React.FC<ActionMenuProps> = ({ onAction, drugs, locations }) => {
  const [currentMenu, setCurrentMenu] = useState<'main' | 'buy' | 'sell' | 'travel' | 'repay'>('main')
  const [selectedDrug, setSelectedDrug] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<number>(0)
  const [repayAmount, setRepayAmount] = useState<number>(0)

  const mainItems = [
    { label: 'Buy', value: 'buy' },
    { label: 'Sell', value: 'sell' },
    { label: 'Travel', value: 'travel' },
    { label: 'Repay Debt', value: 'repay' },
    { label: 'Help', value: 'help' },
    { label: 'Quit', value: 'quit' },
  ]

  const handleSelect = (item: { value: string }) => {
    switch (currentMenu) {
      case 'main':
        if (item.value === 'buy' || item.value === 'sell' || item.value === 'travel' || item.value === 'repay') {
          setCurrentMenu(item.value)
        } else {
          onAction(item.value)
        }
        break
      case 'buy':
      case 'sell':
        setSelectedDrug(item.value)
        break
      case 'travel':
        onAction('travel', item.value)
        setCurrentMenu('main')
        break
    }
  }

  useInput((_, key) => {
    if (key.escape) {
      setCurrentMenu('main')
      setSelectedDrug(null)
      setQuantity(0)
      setRepayAmount(0)
    }
    if (selectedDrug || currentMenu === 'repay') {
      if (key.upArrow) {
        if (currentMenu === 'repay') {
          setRepayAmount(prev => Math.min(prev + 100, 999999))
        } else {
          setQuantity(prev => Math.min(prev + 1, 999))
        }
      } else if (key.downArrow) {
        if (currentMenu === 'repay') {
          setRepayAmount(prev => Math.max(prev - 100, 0))
        } else {
          setQuantity(prev => Math.max(prev - 1, 0))
        }
      } else if (key.return) {
        if (currentMenu === 'repay') {
          onAction('repay', { amount: repayAmount })
        } else {
          onAction(currentMenu, { drug: selectedDrug, quantity })
        }
        setCurrentMenu('main')
        setSelectedDrug(null)
        setQuantity(0)
        setRepayAmount(0)
      }
    }
  })

  const renderMenu = () => {
    switch (currentMenu) {
      case 'main':
        return <SelectInput items={mainItems} onSelect={handleSelect} />
      case 'buy':
      case 'sell':
        return selectedDrug ? (
          <Box flexDirection="column">
            <Text>Selected: {selectedDrug}</Text>
            <Text>Quantity: {quantity} (Use ↑↓ to change, Enter to confirm)</Text>
          </Box>
        ) : (
          <SelectInput items={drugs.map(drug => ({ label: drug, value: drug }))} onSelect={handleSelect} />
        )
      case 'travel':
        return <SelectInput items={locations.map(location => ({ label: location, value: location }))} onSelect={handleSelect} />
      case 'repay':
        return (
          <Box flexDirection="column">
            <Text>Repay Amount: ${repayAmount} (Use ↑↓ to change, Enter to confirm)</Text>
          </Box>
        )
    }
  }

  return (
    <Box flexDirection="column">
      <Text>Current action: {currentMenu}</Text>
      {renderMenu()}
      <Text>Press Esc to return to main menu</Text>
    </Box>
  )
}

export default ActionMenu

