import { Box, Text, useInput } from 'ink'
import SelectInput from 'ink-select-input'
import React, { useMemo, useState } from 'react'
import { type Location } from '../constants.js'
import { useGame } from '../contexts/GameContext.js'
import { useUI } from '../contexts/UIContext.js'

type ActionMenuProperties = {
  readonly drugs: string[]
  readonly locations: Location[]
}

const ActionMenu: React.FC<ActionMenuProperties> = ({ drugs, locations }) => {
  const { setQuitConfirmation } = useUI()
  const { gameState, handleAction } = useGame()
  const [currentMenu, setCurrentMenu] = useState<
    'main' | 'buy' | 'sell' | 'travel' | 'repay'
  >('main')
  const [travelLocationPreview, setTravelLocationPreview] = useState<
    string | undefined
  >(undefined)
  const [selectedDrug, setSelectedDrug] = useState<string | undefined>(
    undefined
  )
  const [quantity, setQuantity] = useState<number>(0)
  const [repayAmount, setRepayAmount] = useState<number>(0)

  const affordableDrugs = useMemo(() => {
    return drugs.filter((drug) =>
      gameState.prices[drug] ? gameState.prices[drug] <= gameState.cash : false
    )
  }, [drugs, gameState.prices, gameState.cash])

  const maxAffordableQuantity = useMemo(() => {
    if (selectedDrug) {
      return gameState.prices[selectedDrug]
        ? Math.floor(gameState.cash / gameState.prices[selectedDrug])
        : 0
    }

    return 0
  }, [selectedDrug, gameState.cash, gameState.prices])

  const mainItems = [
    { label: 'Buy (B)', value: 'buy' },
    { label: 'Sell (S)', value: 'sell' },
    { label: 'Travel (T)', value: 'travel' },
    { label: 'Repay Debt (R)', value: 'repay' },
    { label: 'Quit (Q)', value: 'quit' },
  ]

  const handleSelect = (item: { value: string }) => {
    setCurrentMenu(item.value as 'main' | 'buy' | 'sell' | 'travel' | 'repay')
    if (item.value === 'quit') {
      setQuitConfirmation(true)
    }
  }

  useInput((input, key) => {
    if (key.escape) {
      setCurrentMenu('main')
      setSelectedDrug(undefined)
      setQuantity(0)
      setRepayAmount(0)
    }

    if (currentMenu === 'main') {
      switch (input.toLowerCase()) {
        case 'b': {
          setCurrentMenu('buy')
          break
        }

        case 's': {
          setCurrentMenu('sell')
          break
        }

        case 't': {
          setCurrentMenu('travel')
          break
        }

        case 'r': {
          setCurrentMenu('repay')
          break
        }

        case 'q': {
          setQuitConfirmation(true)
          break
        }
      }
    } else if (selectedDrug || currentMenu === 'repay') {
      if (key.upArrow) {
        if (currentMenu === 'repay') {
          setRepayAmount((previous) => Math.min(previous + 100, gameState.cash))
        } else {
          setQuantity((previous) =>
            Math.min(previous + 1, maxAffordableQuantity)
          )
        }
      } else if (key.downArrow) {
        if (currentMenu === 'repay') {
          setRepayAmount((previous) => Math.max(previous - 100, 0))
        } else {
          setQuantity((previous) => Math.max(previous - 1, 0))
        }
      } else if (key.return) {
        if (currentMenu === 'repay') {
          handleAction('repay', { amount: repayAmount })
        } else {
          handleAction(currentMenu, { drug: selectedDrug, quantity })
        }

        setCurrentMenu('main')
        setSelectedDrug(undefined)
        setQuantity(0)
        setRepayAmount(0)
      }
    }
  })

  const renderMenu = () => {
    switch (currentMenu) {
      case 'main': {
        return <SelectInput items={mainItems} onSelect={handleSelect} />
      }

      case 'buy': {
        return selectedDrug ? (
          <Box flexDirection="column">
            <Text>Selected: {selectedDrug}</Text>
            <Text>Price: ${gameState.prices[selectedDrug]}</Text>
            <Text>
              Quantity: {quantity} (Use ↑↓ to change, Enter to confirm)
            </Text>
            <Text>
              Total Cost: $
              {quantity *
                (selectedDrug && gameState.prices[selectedDrug]
                  ? gameState.prices[selectedDrug]
                  : 0)}
            </Text>
            <Text>Max Affordable: {maxAffordableQuantity}</Text>
          </Box>
        ) : (
          <SelectInput
            items={affordableDrugs.map((drug) => ({
              label: `${drug} - $${gameState.prices[drug]}`,
              value: drug,
            }))}
            onSelect={({ value }) => {
              setSelectedDrug(value)
            }}
          />
        )
      }

      case 'sell': {
        return selectedDrug ? (
          <Box flexDirection="column">
            <Text>Selected: {selectedDrug}</Text>
            <Text>Price: ${gameState.prices[selectedDrug]}</Text>
            <Text>
              Quantity: {quantity} (Use ↑↓ to change, Enter to confirm)
            </Text>
            <Text>
              Total Value: $
              {quantity *
                (selectedDrug && gameState.prices[selectedDrug]
                  ? gameState.prices[selectedDrug]
                  : 0)}
            </Text>
            <Text>Max Sellable: {gameState.inventory[selectedDrug] || 0}</Text>
          </Box>
        ) : (
          <SelectInput
            items={Object.entries(gameState.inventory)
              .filter(([_, amount]) => amount > 0)
              .map(([drug, amount]) => ({
                label: `${drug} - ${amount} units`,
                value: drug,
              }))}
            onSelect={({ value }) => {
              setSelectedDrug(value)
            }}
          />
        )
      }

      case 'travel': {
        return (
          <Box flexDirection="column">
            <SelectInput
              items={locations.map((location) => ({
                label: location.name,
                value: location,
              }))}
              onHighlight={({ value }) => {
                setTravelLocationPreview(value.name)
              }}
              onSelect={({ value }) => {
                handleAction('travel', value.name)
                setCurrentMenu('main')
              }}
            />

            {travelLocationPreview && (
              <Box
                marginBottom={1}
                key={'currentLocation'}
                flexDirection="column"
              >
                <Text dimColor>
                  Description:{' '}
                  {
                    locations.find((loc) => loc.name === travelLocationPreview)
                      ?.description
                  }
                </Text>
              </Box>
            )}
          </Box>
        )
      }

      case 'repay': {
        return (
          <Box flexDirection="column">
            <Text>
              Repay Amount: ${repayAmount} (Use ↑↓ to change, Enter to confirm)
            </Text>
            <Text>
              Max Repayable: ${Math.min(gameState.cash, gameState.debt)}
            </Text>
          </Box>
        )
      }
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
