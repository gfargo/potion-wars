import fs from 'node:fs'
import test from 'ava'
import { type GameState } from '../../../types/game.types.js'
import { createGameState } from '../../state/tests/utils/testHelper.js'
import { SaveFileManager, SaveFileType } from '../utils.js'

// This file exclusively uses slot 1 to avoid cross-file filesystem contamination.
// Other persistence test files use different slots:
//   saveLoadSystemUpdates → slot 2
//   reputationPersistence → slot 3
//   reputationIntegration → slots 4, 5
const SLOT = 1

const cleanup = () => {
  const manager = SaveFileManager.getInstance()
  try {
    manager.clearSaveFile(SLOT, SaveFileType.GAME_SAVE)
    manager.clearSaveFile(SLOT, SaveFileType.GAME_LOG)
  } catch {
    // Ignore cleanup errors
  }
}

test.after(cleanup)
test.beforeEach(cleanup)

test.serial("creates save directory if it doesn't exist", (t) => {
  const manager = SaveFileManager.getInstance()
  const { saveDir } = manager

  t.true(fs.existsSync(saveDir))
})

test.serial('writes and reads save file', (t) => {
  const manager = SaveFileManager.getInstance()
  const testState = createGameState({ cash: 1000 })

  manager.writeSaveFile(SLOT, SaveFileType.GAME_SAVE, testState)
  const loadedState = manager.readSaveFile<GameState>(SLOT, SaveFileType.GAME_SAVE)

  t.is(loadedState?.cash, 1000)
})

test.serial('handles invalid slot numbers', (t) => {
  const manager = SaveFileManager.getInstance()

  const error = t.throws(() => {
    manager.writeSaveFile(0, SaveFileType.GAME_SAVE, {})
  })

  t.is(error?.name, 'PersistenceError')
  // @ts-ignore
  t.is(error?.code, 'INVALID_SLOT')
})

test.serial('validates data on read', (t) => {
  const manager = SaveFileManager.getInstance()
  const invalidData = { notAGameState: true }

  manager.writeSaveFile(SLOT, SaveFileType.GAME_SAVE, invalidData)

  const result = manager.readSaveFile(SLOT, SaveFileType.GAME_SAVE, {
    validator: (data): data is GameState => 'cash' in data,
    createIfNotExists: true,
    defaultValue: createGameState(),
  })

  t.true('cash' in (result ?? {}))
})

test.serial('handles missing files gracefully', (t) => {
  const manager = SaveFileManager.getInstance()
  manager.deleteSlotSaveFiles(SLOT)
  const result = manager.readSaveFile(SLOT, SaveFileType.GAME_SAVE, {
    createIfNotExists: false,
  })

  t.is(result, undefined)
})

test.serial('manages active slot', (t) => {
  const manager = SaveFileManager.getInstance()
  manager.setActiveSlot(2)
  t.is(manager.getActiveSlot(), 2)
})

test.serial('lists all save slots', (t) => {
  const manager = SaveFileManager.getInstance()

  // Write to our dedicated slot only
  manager.writeSaveFile(SLOT, SaveFileType.GAME_SAVE, createGameState())

  const slots = manager.getAllSaveSlots()
  t.is(slots.length, 5)
  t.true(slots[0]?.exists) // Slot 1 exists (our slot)
})
