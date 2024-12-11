import { Box, Text, TextProps, useInput } from 'ink'
import React, { useCallback, useMemo, useState } from 'react'
import EnhancedSelectInput from '../components/EnhancedSelectInput.js'
import { type Location } from '../constants.js'
import { useGame } from '../contexts/GameContext.js'
import { useUI } from '../contexts/UIContext.js'

type ActionMenuProperties = {
  readonly potions: string[]
  readonly locations: Location[]
}

function ActionMenu({ potions, locations }: ActionMenuProperties) {
  const { setQuitConfirmation } = useUI()
  const { gameState, handleAction } = useGame()
  const [currentMenu, setCurrentMenu] = useState<
    'main' | 'brew' | 'sell' | 'travel' | 'repay'
  >('main')
  const [travelLocationPreview, setTravelLocationPreview] = useState<
    string | undefined
  >(locations[0]!.name)
  const [selectedPotion, setSelectedPotion] = useState<string | undefined>(
    undefined
  )
  const [quantity, setQuantity] = useState<number>(0)
  const [repayAmount, setRepayAmount] = useState<number>(0)

  const affordablePotions = useMemo(() => {
    return potions.filter((potion) =>
      gameState.prices[potion]
        ? gameState.prices[potion] <= gameState.cash
        : false
    )
  }, [potions, gameState.prices, gameState.cash])

  const maxAffordableQuantity = useMemo(() => {
    if (selectedPotion) {
      return gameState.prices[selectedPotion]
        ? Math.floor(gameState.cash / gameState.prices[selectedPotion])
        : 0
    }

    return 0
  }, [selectedPotion, gameState.cash, gameState.prices])

  const mainItems = [
    { label: 'Brew (B)', value: 'brew' },
    { label: 'Sell (S)', value: 'sell' },
    { label: 'Travel (T)', value: 'travel' },
    { label: 'Repay Debt (R)', value: 'repay' },
    { label: 'Quit (Q)', value: 'quit' },
  ]

  const handleSelect = (item: { value: string }) => {
    setCurrentMenu(item.value as 'main' | 'brew' | 'sell' | 'travel' | 'repay')
    if (item.value === 'quit') {
      setQuitConfirmation(true)
    }
  }

  useInput((input, key) => {
    if (key.escape) {
      setCurrentMenu('main')
      setSelectedPotion(undefined)
      setQuantity(0)
      setRepayAmount(0)
    }

    if (currentMenu === 'main') {
      switch (input.toLowerCase()) {
        case 'b': {
          setCurrentMenu('brew')
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
    } else if (selectedPotion || currentMenu === 'repay') {
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
        switch (currentMenu) {
          case 'brew': {
            handleAction('brew', { potion: selectedPotion, quantity })

            break
          }

          case 'sell': {
            handleAction('sell', { potion: selectedPotion, quantity })

            break
          }

          case 'repay': {
            handleAction('repay', repayAmount)

            break
          }
          // No default
        }

        setCurrentMenu('main')
        setSelectedPotion(undefined)
        setQuantity(0)
        setRepayAmount(0)
      }
    }
  })

  const renderMenu = useCallback(() => {
    switch (currentMenu) {
      case 'main': {
        return (
          <EnhancedSelectInput
            items={mainItems}
            onSelect={handleSelect}
            indicatorComponent={({ isSelected, item }) => {
              let returnValue = `  `
              let color = 'gray' as TextProps['color']

              if (isSelected) {
                switch (item.value) {
                  case 'brew': {
                    returnValue = '⚗︎ '
                    color = 'green'
                    break
                  }

                  case 'sell': {
                    returnValue = '₺ '
                    color = 'yellow'
                    break
                  }

                  case 'travel': {
                    returnValue = '᯽ '
                    color = 'cyan'
                    break
                  }

                  case 'repay': {
                    returnValue = '⚖︎ '
                    color = 'yellow'
                    break
                  }

                  case 'quit': {
                    returnValue = '⚐ '
                    color = 'red'
                    break
                  }
                }
              }

              return <Text color={color}>{returnValue}</Text>
            }}
          />
        )
      }

      case 'brew': {
        return selectedPotion ? (
          <Box flexDirection="column">
            <Text>Selected: {selectedPotion}</Text>
            <Text>Price: ${gameState.prices[selectedPotion]}</Text>
            <Text>
              Quantity: {quantity} (Use ↑↓ to change, Enter to confirm)
            </Text>
            <Text>
              Total Cost: $
              {quantity *
                (selectedPotion && gameState.prices[selectedPotion]
                  ? gameState.prices[selectedPotion]
                  : 0)}
            </Text>
            <Text>Max Affordable: {maxAffordableQuantity}</Text>
          </Box>
        ) : (
          <EnhancedSelectInput
            items={affordablePotions.map((potion) => ({
              label: `${potion} - $${gameState.prices[potion]}`,
              value: potion,
            }))}
            onSelect={({ value }) => {
              setSelectedPotion(value)
            }}
          />
        )
      }

      case 'sell': {
        return selectedPotion ? (
          <Box flexDirection="column">
            <Text>Selected: {selectedPotion}</Text>
            <Text>Price: ${gameState.prices[selectedPotion]}</Text>
            <Text>
              Quantity: {quantity} (Use ↑↓ to change, Enter to confirm)
            </Text>
            <Text>
              Total Value: $
              {quantity *
                (selectedPotion && gameState.prices[selectedPotion]
                  ? gameState.prices[selectedPotion]
                  : 0)}
            </Text>
            <Text>
              Max Sellable: {gameState.inventory[selectedPotion] || 0}
            </Text>
          </Box>
        ) : (
          <EnhancedSelectInput
            items={Object.entries(gameState.inventory)
              .filter(([_, amount]) => amount > 0)
              .map(([potion, amount]) => ({
                label: `${potion} - ${amount} units`,
                value: potion,
              }))}
            onSelect={({ value }) => {
              setSelectedPotion(value)
            }}
          />
        )
      }

      case 'travel': {
        return (
          <>
            <Box key="currentLocation" flexDirection="column" minHeight={1}>
              <Text dimColor>
                {locations.find((loc) => loc.name === travelLocationPreview)
                  ?.description || ''}
              </Text>
            </Box>
            <EnhancedSelectInput
              key="selectLocation"
              items={locations.map((location) => ({
                label: location.name,
                value: location.name,
              }))}
              onHighlight={({ value }) => {
                setTravelLocationPreview(value)
              }}
              onSelect={({ value }) => {
                handleAction('travel', value)
                setTravelLocationPreview(undefined)
                setCurrentMenu('main')
              }}
            />
          </>
        )
      }
      case 'repay': {
        return (
          <Box flexDirection="column" key={'repay'}>
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
  }, [
    currentMenu,
    affordablePotions,
    gameState.prices,
    gameState.inventory,
    gameState.cash,
    selectedPotion,
    quantity,
    maxAffordableQuantity,
    locations,
    travelLocationPreview,
    repayAmount,
  ])

  return (
    <Box flexDirection="column">
      <Text>Current action: {currentMenu}</Text>
      {renderMenu()}
      <Text>Press Esc to return to main menu</Text>
    </Box>
  )
}

export default ActionMenu
