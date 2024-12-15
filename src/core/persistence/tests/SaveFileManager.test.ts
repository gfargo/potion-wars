import fs from 'node:fs'
import test from 'ava'
import { type GameState } from '../../../types/game.types.js'
import { createGameState } from '../../state/tests/utils/testHelper.js'
import { SaveFileManager, SaveFileType } from '../utils.js'

// Helper to clean up test files
const cleanup = () => {
  const manager = SaveFileManager.getInstance()
  for (let slot = 1; slot <= 3; slot++) {
    try {
      manager.clearSaveFile(slot, SaveFileType.GAME_SAVE)
      manager.clearSaveFile(slot, SaveFileType.GAME_LOG)
    } catch {
      // Ignore cleanup errors
    }
  }
}

test.after(cleanup)
test.beforeEach(cleanup)

test("creates save directory if it doesn't exist", (t) => {
  const manager = SaveFileManager.getInstance()
  const { saveDir } = manager // Access private property for testing

  t.true(fs.existsSync(saveDir))
})

test('writes and reads save file', (t) => {
  const manager = SaveFileManager.getInstance()
  const testState = createGameState({ cash: 1000 })

  manager.writeSaveFile(1, SaveFileType.GAME_SAVE, testState)
  const loadedState = manager.readSaveFile<GameState>(1, SaveFileType.GAME_SAVE)

  t.is(loadedState?.cash, 1000)
})

test('handles invalid slot numbers', (t) => {
  const manager = SaveFileManager.getInstance()

  const error = t.throws(() => {
    manager.writeSaveFile(0, SaveFileType.GAME_SAVE, {})
  })

  t.is(error?.name, 'PersistenceError')
  // @ts-ignore
  t.is(error?.code, 'INVALID_SLOT')
})

test('validates data on read', (t) => {
  const manager = SaveFileManager.getInstance()
  const invalidData = { notAGameState: true }

  manager.writeSaveFile(1, SaveFileType.GAME_SAVE, invalidData)

  const result = manager.readSaveFile(1, SaveFileType.GAME_SAVE, {
    validator: (data): data is GameState => 'cash' in data,
    createIfNotExists: true,
    defaultValue: createGameState(),
  })

  t.true('cash' in (result ?? {}))
})

test('handles missing files gracefully', (t) => {
  const manager = SaveFileManager.getInstance()
  manager.deleteSlotSaveFiles(2)
  const result = manager.readSaveFile(2, SaveFileType.GAME_SAVE, {
    createIfNotExists: false,
  })

  t.is(result, undefined)
})

test('manages active slot', (t) => {
  const manager = SaveFileManager.getInstance()
  manager.setActiveSlot(2)
  t.is(manager.getActiveSlot(), 2)
})

test('lists all save slots', (t) => {
  const manager = SaveFileManager.getInstance()

  // Create some saves
  manager.writeSaveFile(1, SaveFileType.GAME_SAVE, createGameState())
  manager.writeSaveFile(3, SaveFileType.GAME_SAVE, createGameState())

  const slots = manager.getAllSaveSlots()
  t.is(slots.length, 3)
  t.true(slots[0]?.exists) // Slot 1 exists
  t.false(slots[1]?.exists) // Slot 2 doesn't exist
  t.true(slots[2]?.exists) // Slot 3 exists
})
