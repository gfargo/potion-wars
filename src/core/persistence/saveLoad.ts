import os from 'node:os'
import path from 'node:path'
import { DEFAULT_GAME_STATE } from '../../contexts/GameContext.js'
import { type GameState } from '../../types/game.types.js'
import { SaveFileManager, SaveFileType } from './utils.js'
import {
    isValidGameState,
    migrateLegacySaveFile,
    sanitizeGameState
} from './dataValidation.js'

export const getSaveDirectory = () => {
  const homeDirectory = os.homedir()
  // eslint-disable-next-line n/prefer-global/process
  if (process.platform === 'win32') {
    return path.join(homeDirectory, 'AppData', 'Roaming', 'potion-wars')
  }

  return path.join(homeDirectory, '.config', 'potion-wars')
}





export const saveGame = (state: GameState, slot: number) => {
  const saveManager = SaveFileManager.getInstance()
  
  // Sanitize all data before saving
  const sanitizedState = {
    ...sanitizeGameState(state),
    lastSave: new Date().toISOString(),
  }
  
  saveManager.writeSaveFile(slot, SaveFileType.GAME_SAVE, sanitizedState)
}

export const loadGame = (slot: number): GameState | undefined => {
  try {
    const saveManager = SaveFileManager.getInstance()
    
    // First try to load with strict validation
    let gameState = saveManager.readSaveFile<GameState>(
      slot,
      SaveFileType.GAME_SAVE,
      {
        createIfNotExists: false,
        validator: isValidGameState,
      }
    )

    // If that fails, try loading as legacy format and migrate
    if (!gameState) {
      const legacyState = saveManager.readSaveFile<any>(
        slot,
        SaveFileType.GAME_SAVE,
        {
          createIfNotExists: true,
          defaultValue: DEFAULT_GAME_STATE,
          validator: (state: any): state is any => (
            typeof state === 'object' &&
            state !== null &&
            typeof state.day === 'number' &&
            typeof state.cash === 'number' &&
            typeof state.debt === 'number' &&
            typeof state.health === 'number'
          )
        }
      )

      if (legacyState) {
        // Migrate the legacy state
        gameState = migrateLegacySaveFile(legacyState)
        
        // Save the migrated state back to file
        saveManager.writeSaveFile(slot, SaveFileType.GAME_SAVE, {
          ...gameState,
          lastSave: new Date().toISOString(),
        })
      }
    }

    return gameState
  } catch {
    return undefined
  }
}

export const getSaveSlots = (): Array<GameState | undefined> => {
  const saveManager = SaveFileManager.getInstance()
  const slots = saveManager.getAllSaveSlots()
  return slots.map(({ slot }) => loadGame(slot))
}
