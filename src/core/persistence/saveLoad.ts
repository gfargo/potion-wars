import os from 'node:os'
import path from 'node:path'
import { DEFAULT_GAME_STATE } from '../../contexts/GameContext.js'
import { type GameState } from '../../types/game.types.js'
import { SaveFileManager, SaveFileType } from './utils.js'

export const getSaveDirectory = () => {
  const homeDirectory = os.homedir()
  // eslint-disable-next-line n/prefer-global/process
  if (process.platform === 'win32') {
    return path.join(homeDirectory, 'AppData', 'Roaming', 'potion-wars')
  }

  return path.join(homeDirectory, '.config', 'potion-wars')
}

const isValidGameState = (state: any): state is GameState => {
  return (
    typeof state === 'object' &&
    state !== null &&
    typeof state.day === 'number' &&
    typeof state.cash === 'number' &&
    typeof state.debt === 'number' &&
    typeof state.health === 'number' &&
    typeof state.strength === 'number' &&
    typeof state.agility === 'number' &&
    typeof state.intelligence === 'number' &&
    typeof state.location === 'object' &&
    typeof state.inventory === 'object' &&
    typeof state.prices === 'object' &&
    typeof state.weather === 'string'
  )
}

export const saveGame = (state: GameState, slot: number) => {
  const saveManager = SaveFileManager.getInstance()
  saveManager.writeSaveFile(slot, SaveFileType.GAME_SAVE, {
    ...state,
    lastSave: new Date().toISOString(),
  })
}

export const loadGame = (slot: number): GameState | undefined => {
  try {
    return SaveFileManager.getInstance().readSaveFile<GameState>(
      slot,
      SaveFileType.GAME_SAVE,
      {
        createIfNotExists: true,
        validator: isValidGameState,
        defaultValue: DEFAULT_GAME_STATE,
      }
    )
  } catch {
    return undefined
  }
}

export const getSaveSlots = (): Array<GameState | undefined> => {
  const saveManager = SaveFileManager.getInstance()
  const slots = saveManager.getAllSaveSlots()
  return slots.map(({ slot }) => loadGame(slot))
}
