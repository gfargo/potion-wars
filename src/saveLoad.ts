import fs from 'fs'
import path from 'path'
import os from 'os'
import { GameState } from './gameLogic'

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
  if (!fs.existsSync(SAVE_FILE)) {
    const initialData: SaveData = { slots: [null, null, null] }
    fs.writeFileSync(SAVE_FILE, JSON.stringify(initialData))
  }
}

export const saveGame = (state: GameState, slot: number) => {
  initializeSaveFile()
  const saveData: SaveData = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf-8'))
  saveData.slots[slot] = state
  fs.writeFileSync(SAVE_FILE, JSON.stringify(saveData))
}

export const loadGame = (slot: number): GameState | null => {
  initializeSaveFile()
  const saveData: SaveData = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf-8'))
  return saveData.slots[slot]
}

export const getSaveSlots = (): (GameState | null)[] => {
  initializeSaveFile()
  const saveData: SaveData = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf-8'))
  return saveData.slots
}

