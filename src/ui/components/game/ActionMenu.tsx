import { Box, Text, type TextProps, useInput } from 'ink'
import React, { useCallback, useMemo, useState } from 'react'
import { useStore } from '../../../store/appStore.js'
import { type Location } from '../../../types/game.types.js'
import { EnhancedSelectInput } from '../common/index.js'

type ActionMenuProperties = {
  readonly potions: string[]
  readonly locations: Location[]
}

type ActionMenuEnum = 'main' | 'brew' | 'sell' | 'travel' | 'repay' | 'save'

// Stable selectors defined outside component
const selectPrices = (state: any) => state.game.prices
const selectInventory = (state: any) => state.game.inventory
const selectDebt = (state: any) => state.game.debt

function ActionMenu({ potions, locations }: ActionMenuProperties) {
  // Get state from Zustand store - use specific selectors to avoid subscribing to entire game object
  const cash = useStore((state) => state.game.cash)
  const currentLocationName = useStore((state) => state.game.location.name)
  const prices = useStore(selectPrices)
  const inventory = useStore(selectInventory)
  const debt = useStore(selectDebt)

  // Get store actions
  const brewPotion = useStore((state) => state.brewPotion)
  const sellPotion = useStore((state) => state.sellPotion)
  const repayDebt = useStore((state) => state.repayDebt)
  const startTravel = useStore((state) => state.startTravel)
  const setQuitConfirmation = useStore((state) => state.setQuitConfirmation)
  const searchForNPCs = useStore((state) => state.searchForNPCs)
  const saveGame = useStore((state) => state.saveGame)

  const [currentMenu, setCurrentMenu] = useState<ActionMenuEnum>('main')
  const [travelLocationPreview, setTravelLocationPreview] = useState<
    string | undefined
  >(locations[0]!.name)
  const [selectedPotion, setSelectedPotion] = useState<string | undefined>(
    undefined
  )
  const [quantity, setQuantity] = useState<number>(0)
  const [repayAmount, setRepayAmount] = useState<number>(0)

  // Compute derived values in useMemo to avoid re-subscribing
  const affordablePotions = useMemo(() => {
    return potions.filter((potion) =>
      prices[potion] ? prices[potion] <= cash : false
    )
  }, [potions, prices, cash])

  const maxAffordableQuantity = useMemo(() => {
    if (!selectedPotion || !prices[selectedPotion]) {
      return 0
    }
    return Math.floor(cash / prices[selectedPotion])
  }, [cash, prices, selectedPotion])

  const currentInventoryQuantity = useMemo(() => {
    return inventory[selectedPotion || ''] ?? 0
  }, [inventory, selectedPotion])

  const mainItems = useMemo(
    () => [
      { label: 'Brew (B)', value: 'brew' },
      { label: 'Sell (S)', value: 'sell' },
      { label: 'Travel (T)', value: 'travel' },
      { label: 'Look for NPCs (N)', value: 'npcs' },
      { label: 'Repay Debt (R)', value: 'repay' },
      { label: 'Save Game (V)', value: 'save' },
      { label: 'Quit (Q)', value: 'quit' },
    ],
    []
  )

  const handleSelect = useCallback(
    (item: { value: string }) => {
      if (item.value === 'quit') {
        setQuitConfirmation(true)
        return
      }

      if (item.value === 'npcs') {
        searchForNPCs()
        return
      }

      if (item.value === 'save') {
        setCurrentMenu('save' as ActionMenuEnum)
        return
      }

      setCurrentMenu(item.value as ActionMenuEnum)
    },
    [setQuitConfirmation, searchForNPCs]
  )

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

        case 'n': {
          searchForNPCs()
          break
        }

        case 'r': {
          setCurrentMenu('repay')
          break
        }

        case 'v': {
          setCurrentMenu('save')
          break
        }

        case 'q': {
          setQuitConfirmation(true)
          break
        }

        default: {
          break
        }
      }
    } else if (selectedPotion ?? currentMenu === 'repay') {
      if (key.upArrow) {
        switch (currentMenu) {
          case 'repay': {
            setRepayAmount((previous) => Math.min(previous + 100, cash))

            break
          }

          case 'brew': {
            setQuantity((previous) =>
              Math.min(previous + 1, maxAffordableQuantity)
            )

            break
          }

          case 'sell': {
            setQuantity((previous) =>
              Math.min(previous + 1, currentInventoryQuantity)
            )

            break
          }
          // No default
        }
      } else if (key.downArrow) {
        if (currentMenu === 'repay') {
          setRepayAmount((previous) => Math.max(previous - 100, 0))
        } else {
          setQuantity((previous) => Math.max(previous - 1, 0))
        }
      } else if (/^\d$/.test(input)) {
        // Direct number input: append digit to current quantity
        const digit = Number.parseInt(input, 10)
        switch (currentMenu) {
          case 'repay': {
            setRepayAmount((previous) => {
              const newAmount = previous * 10 + digit
              return Math.min(newAmount, cash)
            })

            break
          }

          case 'brew': {
            setQuantity((previous) => {
              const newQuantity = previous * 10 + digit
              return Math.min(newQuantity, maxAffordableQuantity)
            })

            break
          }

          case 'sell': {
            setQuantity((previous) => {
              const newQuantity = previous * 10 + digit
              return Math.min(newQuantity, currentInventoryQuantity)
            })

            break
          }
          // No default
        }
      } else if (key.delete || key.backspace) {
        // Allow deleting digits
        if (currentMenu === 'repay') {
          setRepayAmount((previous) => Math.floor(previous / 10))
        } else {
          setQuantity((previous) => Math.floor(previous / 10))
        }
      } else if (key.return) {
        switch (currentMenu) {
          case 'brew': {
            if (selectedPotion) {
              brewPotion(selectedPotion, quantity)
            }

            break
          }

          case 'sell': {
            // Validate we're not trying to sell more than we have
            if (quantity > currentInventoryQuantity) {
              // Don't execute the action, just reset
              setCurrentMenu('main')
              setSelectedPotion(undefined)
              setQuantity(0)
              break
            }

            if (selectedPotion) {
              sellPotion(selectedPotion, quantity)
            }

            break
          }

          case 'repay': {
            repayDebt(repayAmount)
            break
          }

          case 'travel': {
            if (travelLocationPreview) {
              startTravel(travelLocationPreview)
            }

            break
          }
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

                  case 'npcs': {
                    returnValue = '👥 '
                    color = 'magenta'
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

                  default: {
                    break
                  }
                }
              }

              return <Text color={color}>{returnValue}</Text>
            }}
            onSelect={handleSelect}
          />
        )
      }

      case 'brew': {
        return selectedPotion ? (
          <Box flexDirection="column">
            <Text>Selected: {selectedPotion}</Text>
            <Text>Price: ${prices[selectedPotion]}</Text>
            <Text>
              Quantity: {quantity} (Use ↑↓ or type number, Backspace to delete,
              Enter to confirm)
            </Text>
            <Text>
              Total Cost: ${(prices[selectedPotion] || 0) * quantity}
            </Text>
            <Text>Max Affordable: {maxAffordableQuantity}</Text>
          </Box>
        ) : (
          <EnhancedSelectInput
            items={affordablePotions.map((potion) => ({
              label: `${potion} - $${prices[potion]}`,
              value: potion,
            }))}
            onSelect={({ value }) => {
              setSelectedPotion(value)
            }}
          />
        )
      }

      case 'sell': {
        const sellableItems = Object.entries(inventory)
          .filter(([_, amount]) => (amount as number) > 0)
          .map(([name, quantity]) => ({ name, quantity: quantity as number }))

        return selectedPotion ? (
          <Box flexDirection="column">
            <Text>Selected: {selectedPotion}</Text>
            <Text>Price: ${prices[selectedPotion]}</Text>
            <Text>
              Quantity: {quantity} (Use ↑↓ or type number, Backspace to delete,
              Enter to confirm)
            </Text>
            <Text>
              Total Value: ${(prices[selectedPotion] || 0) * quantity}
            </Text>
            <Text>
              Max Sellable: {inventory[selectedPotion] || 0}
            </Text>
          </Box>
        ) : (
          <EnhancedSelectInput
            items={sellableItems.map(({ name, quantity }) => ({
              label: `${name} - ${quantity} units`,
              value: name,
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
                  ?.description ?? ''}
              </Text>
            </Box>
            <EnhancedSelectInput
              key="selectLocation"
              items={locations
                .filter((location) => location.name !== currentLocationName)
                .map((location) => ({
                  label: location.name,
                  value: location.name,
                }))}
              onHighlight={({ value }) => {
                setTravelLocationPreview(value)
              }}
              onSelect={({ value }) => {
                startTravel(value)
                setTravelLocationPreview(undefined)
                setCurrentMenu('main')
              }}
            />
          </>
        )
      }

      case 'repay': {
        const maxRepayable = Math.min(cash, debt)
        return (
          <Box key="repay" flexDirection="column">
            <Text>
              Repay Amount: ${repayAmount} (Use ↑↓ or type number, Backspace to
              delete, Enter to confirm)
            </Text>
            <Text>Max Repayable: ${maxRepayable}</Text>
          </Box>
        )
      }

      case 'save': {
        return (
          <Box key="save" flexDirection="column">
            <Text bold color="cyan">
              Choose Save Slot
            </Text>
            <EnhancedSelectInput
              items={[
                { label: 'Slot 1', value: '1' },
                { label: 'Slot 2', value: '2' },
                { label: 'Slot 3', value: '3' },
                { label: 'Slot 4', value: '4' },
                { label: 'Slot 5', value: '5' },
              ]}
              onSelect={({ value }) => {
                const slotNumber = Number.parseInt(value, 10)
                saveGame(slotNumber)
                setCurrentMenu('main')
              }}
            />
          </Box>
        )
      }
    }
  }, [
    currentMenu,
    affordablePotions,
    prices,
    inventory,
    debt,
    cash,
    currentLocationName,
    selectedPotion,
    quantity,
    maxAffordableQuantity,
    currentInventoryQuantity,
    locations,
    travelLocationPreview,
    repayAmount,
    saveGame,
    startTravel,
    handleSelect,
    mainItems,
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
