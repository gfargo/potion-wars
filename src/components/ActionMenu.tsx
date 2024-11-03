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
    { label: 'Buy (B)', value: 'buy' },
    { label: 'Sell (S)', value: 'sell' },
    { label: 'Travel (T)', value: 'travel' },
    { label: 'Repay Debt (R)', value: 'repay' },
  ]

  const handleSelect = (item: { value: string }) => {
    setCurrentMenu(item.value as 'main' | 'buy' | 'sell' | 'travel' | 'repay')
    if (item.value === 'help' || item.value === 'quit') {
      onAction(item.value)
    }
  }

  useInput((input, key) => {
    if (key.escape) {
      setCurrentMenu('main')
      setSelectedDrug(null)
      setQuantity(0)
      setRepayAmount(0)
    }

    if (currentMenu === 'main') {
      switch (input.toLowerCase()) {
        case 'b':
          setCurrentMenu('buy')
          break
        case 's':
          setCurrentMenu('sell')
          break
        case 't':
          setCurrentMenu('travel')
          break
        case 'r':
          setCurrentMenu('repay')
          break
      }
    } else if (selectedDrug || currentMenu === 'repay') {
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
          <SelectInput items={drugs.map(drug => ({ label: drug, value: drug }))} onSelect={({ value }) => setSelectedDrug(value)} />
        )
      case 'travel':
        return <SelectInput items={locations.map(location => ({ label: location, value: location }))} onSelect={({ value }) => onAction('travel', value)} />
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

