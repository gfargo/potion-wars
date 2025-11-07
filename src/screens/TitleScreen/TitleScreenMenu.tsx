import { Box, Text, useApp, useInput } from 'ink'
import Gradient from 'ink-gradient'
import React, { useMemo, useState } from 'react'
import { TITLE_ART } from '../../constants.js'
import { useStore } from '../../store/appStore.js'
import { getSaveSlots } from '../../core/persistence/saveLoad.js'
import { EnhancedSelectInput } from '../../ui/components/common/index.js'

export function TitleScreenMenu() {
  const toggleHelp = useStore((state) => state.toggleHelp)
  const setScreen = useStore((state) => state.setScreen)
  const initializeGame = useStore((state) => state.initializeGame)
  const loadGame = useStore((state) => state.loadGame)
  const activeSlot = useStore((state) => state.persistence.activeSlot)
  const { exit } = useApp()

  // eslint-disable-next-line react/hook-use-state
  const [displaySaveSlots, toggleSaveSlotDisplay] = useState<
    'load' | 'new' | false
  >(false)
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)
  const [confirmRestartGameOver, setConfirmRestartGameOver] = useState(false)
  const [pendingSlotIndex, setPendingSlotIndex] = useState<number>(-1)

  const saveSlots = getSaveSlots()

  useInput((_, key) => {
    if (key.escape) {
      toggleSaveSlotDisplay(false)
      setConfirmOverwrite(false)
      setConfirmRestartGameOver(false)
      setPendingSlotIndex(-1)
    }
  })

  const topLevelMenuItems = useMemo(() => {
    const defaultItems = [
      {
        label: 'New Game',
        value: 'newGame',
        hotkey: 'n',
      },
      {
        label: 'Load Game',
        value: 'load',
        hotkey: 'l',
      },
      {
        label: 'Help',
        value: 'help',
        hotkey: 'h',
      },
      {
        label: 'Quit',
        value: 'quit',
        hotkey: 'q',
      },
    ]

    if (activeSlot > 0) {
      return [
        {
          label: 'Continue',
          value: 'continue',
          hotkey: 'c',
        },
        ...defaultItems,
      ]
    }

    return defaultItems
  }, [activeSlot])

  return (
    <Box paddingX={2}>
      {confirmRestartGameOver ? (
        <Box flexDirection="column" gap={1} alignItems="center" marginTop={1}>
          <Text dimColor>
            This save is marked as GAME OVER. You cannot load it.
          </Text>
          <Text dimColor>
            Would you like to start a new game in this slot instead?
          </Text>
          <EnhancedSelectInput
            items={[
              {
                label: 'No, go back',
                value: 'no',
                hotkey: 'n',
              },
              {
                label: 'Yes, start new game',
                value: 'yes',
                hotkey: 'y',
              },
            ]}
            orientation="horizontal"
            onSelect={(item) => {
              if (item.value === 'yes' && pendingSlotIndex >= 0) {
                setScreen('loading')
                initializeGame('Player', pendingSlotIndex)
              }

              setConfirmRestartGameOver(false)
              setPendingSlotIndex(-1)
            }}
          />
        </Box>
      ) : confirmOverwrite ? (
        <Box flexDirection="column" gap={1} alignItems="center" marginTop={1}>
          <Text dimColor>
            Are you sure you want to overwrite the save slot?
          </Text>
          <EnhancedSelectInput
            items={[
              {
                label: 'No',
                value: 'no',
                hotkey: 'n',
              },
              {
                label: 'Yes',
                value: 'yes',
                hotkey: 'y',
              },
            ]}
            orientation="horizontal"
            onSelect={(item) => {
              console.log(item)

              if (item.value === 'yes' && pendingSlotIndex >= 0) {
                setScreen('loading')
                initializeGame('Player', pendingSlotIndex)
              }

              setConfirmOverwrite(false)
              setPendingSlotIndex(-1)
            }}
          />
        </Box>
      ) : displaySaveSlots ? (
        <Box flexDirection="column" gap={1} alignItems="center" marginTop={1}>
          <Text dimColor>
            {displaySaveSlots === 'new'
              ? 'Choose a slot for your new adventure'
              : 'Select a saved game to continue'}
          </Text>
          <EnhancedSelectInput
            initialIndex={activeSlot > 0 ? activeSlot - 1 : 0}
            indicatorComponent={({ isSelected, item }) =>
              isSelected && item.value === 'back' ? (
                <Text color="red">✘ </Text>
              ) : isSelected ? (
                <Text color={isSelected ? 'green' : 'gray'}>☛ </Text>
              ) : (
                <Text>{`  `}</Text>
              )
            }
            items={[
              ...saveSlots.map((slot, index) => {
                if (slot === null || slot === undefined) {
                  return {
                    label: 'Empty',
                    value: `slot-${index + 1}`,
                  }
                }

                // Check if game is over (health <= 0 or debt >= cash and can't continue)
                const isGameOver = slot.health <= 0
                const healthPercent = Math.max(0, Math.min(100, slot.health))

                // Build label with health and status
                let label = `Day ${slot.day} - ${slot.cash}g - ${healthPercent}% HP`
                if (isGameOver) {
                  label += ' [GAME OVER]'
                }

                return {
                  label,
                  value: `slot-${index + 1}`,
                }
              }),
              {
                label: 'Back',
                value: 'back',
                hotkey: 'esc',
              },
            ]}
            orientation="horizontal"
            onSelect={(item) => {
              if (item.value === 'back') {
                toggleSaveSlotDisplay(false)
                return
              }

              const slotIndex = Number(item.value.replace('slot-', ''))
              const selectedSlot = saveSlots[slotIndex]

              if (displaySaveSlots === 'new') {
                if (selectedSlot !== null && selectedSlot !== undefined) {
                  setPendingSlotIndex(slotIndex)
                  setConfirmOverwrite(true)
                  return
                }

                setScreen('loading')
                initializeGame('Player', slotIndex)
                return
              }

              // Loading a game - check if it's game over
              if (selectedSlot && selectedSlot.health <= 0) {
                setPendingSlotIndex(slotIndex)
                setConfirmRestartGameOver(true)
                return
              }

              setScreen('loading')
              loadGame(slotIndex)
            }}
          />
        </Box>
      ) : (
        <Box flexDirection="column" justifyContent="center" alignItems="center">
          <Gradient name="pastel">
            <Text>{TITLE_ART}</Text>
          </Gradient>
          <EnhancedSelectInput
            items={topLevelMenuItems}
            indicatorComponent={({ isSelected, item }) =>
              isSelected && item.value === 'quit' ? (
                <Text color="red">✘ </Text>
              ) : isSelected ? (
                <Text color={isSelected ? 'green' : 'gray'}>☛ </Text>
              ) : (
                <Text>{`  `}</Text>
              )
            }
            orientation="horizontal"
            onSelect={(item) => {
              if (item.value === 'help') {
                toggleHelp()
                return
              }

              if (item.value === 'quit') {
                exit()
                return
              }

              if (item.value === 'load') {
                toggleSaveSlotDisplay('load')
                return
              }

              if (item.value === 'newGame') {
                toggleSaveSlotDisplay('new')
                return
              }

              if (item.value === 'continue') {
                setScreen('loading')
                loadGame(activeSlot)
              }
            }}
          />
        </Box>
      )}
    </Box>
  )
}
