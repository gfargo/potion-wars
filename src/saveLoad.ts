import fs from 'fs'
import os from 'os'
import path from 'path'
import { GameState } from './gameLogic.js'

const getSaveDirectory = () => {
  const homeDir = os.homedir()
  if (process.platform === 'win32') {
    return path.join(homeDir, 'AppData', 'Roaming', 'potion-wars')
  } else {
    return path.join(homeDir, '.config', 'potion-wars')
  }
}

const SAVE_DIR = getSaveDirectory()
const SAVE_FILE = path.join(SAVE_DIR, 'saves.json')

type SaveData = {
  slots: (GameState | null)[]
}

export { getSaveDirectory }

export const initializeSaveFile = () => {
  if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR, { recursive: true })
  }
  const initialData: SaveData = { slots: [null, null, null] }
  
  if (!fs.existsSync(SAVE_FILE)) {
    fs.writeFileSync(SAVE_FILE, JSON.stringify(initialData))
    return
  }

  // Validate existing file
  try {
    const fileContent = fs.readFileSync(SAVE_FILE, 'utf-8')
    const parsedData = JSON.parse(fileContent)

    // Check if the file has the correct structure
    const isValid: boolean =
      parsedData &&
      typeof parsedData === 'object' &&
      Array.isArray(parsedData.slots) &&
      parsedData.slots.length === 3 &&
      parsedData.slots.every(
        (slot: GameState | null) =>
          slot === null || (typeof slot === 'object' && slot !== null)
      )

    // If invalid, overwrite with correct structure
    if (!isValid) {
      fs.writeFileSync(SAVE_FILE, JSON.stringify(initialData))
    }
  } catch (error) {
    // If there's any error reading or parsing the file, recreate it
    fs.writeFileSync(SAVE_FILE, JSON.stringify(initialData))
  }
}

export const saveGame = (state: GameState, slot: number) => {
  initializeSaveFile()
  const saveData: SaveData = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf-8'))
  saveData.slots[slot] = {
    ...state,
    lastSave: new Date().toISOString(),
  }
  fs.writeFileSync(SAVE_FILE, JSON.stringify(saveData))
}

export const loadGame = (slot: number): GameState | null | undefined => {
  initializeSaveFile()
  const saveData: SaveData = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf-8'))
  return saveData.slots[slot]
}

export const getSaveSlots = (): (GameState | null)[] => {
  initializeSaveFile()
  const saveData: SaveData = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf-8'))
  return saveData.slots
}
