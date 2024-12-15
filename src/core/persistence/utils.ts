import fs from 'node:fs'
import path from 'node:path'
import { getSaveDirectory } from './saveLoad.js'

export enum SaveFileType {
  GAME_SAVE = 'save',
  GAME_LOG = 'game_log',
  ACTIVE_SLOT = 'active_slot',
}

export class PersistenceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly slot?: number,
    public readonly type?: SaveFileType,
    public override readonly cause?: Error
  ) {
    super(message)
    this.name = 'PersistenceError'
  }
}

type SaveOptions<T> = {
  createIfNotExists?: boolean
  defaultValue?: T
  validator?: (data: T) => data is T
  onError?: (error: PersistenceError) => void
}

const defaultOptions: SaveOptions<any> = {
  createIfNotExists: true,
  defaultValue: undefined,
  validator: (data: any): data is any => data !== null,
  onError(error) {
    console.error(error.message)
  },
}

/**
 * SaveFileManager handles all file operations for game saves, message logs, and active slot information.
 * It uses a singleton pattern to ensure consistent file access across the application.
 *
 * File naming convention:
 * - Game saves: slot_[N]_save.json
 * - Message logs: slot_[N]_game_log.json
 * - Active slot: active_slot.json
 *
 * Where [N] is a slot number between 1 and 3.
 *
 * @example
 * ```typescript
 * const manager = SaveFileManager.getInstance()
 * manager.writeSaveFile(1, SaveFileType.GAME_SAVE, gameState)
 * ```
 */
export class SaveFileManager {
  public static getInstance(): SaveFileManager {
    SaveFileManager.instance ||= new SaveFileManager()
    return SaveFileManager.instance
  }

  private static instance: SaveFileManager

  public readonly saveDir: string

  private constructor() {
    this.saveDir = getSaveDirectory()
    if (!fs.existsSync(this.saveDir)) {
      fs.mkdirSync(this.saveDir, { recursive: true })
    }
  }

  /**
   * Reads data from a save file with validation and error handling.
   *
   * @template T - The expected type of the saved data
   * @param slot - The save slot number (1-3)
   * @param type - The type of save file to read
   * @param options - Options for reading the file
   * @returns The saved data or null if the file doesn't exist or is invalid
   * @throws {PersistenceError} If there's an error reading the file
   *
   * @example
   * ```typescript
   * const data = manager.readSaveFile<GameState>(
   *   1,
   *   SaveFileType.GAME_SAVE,
   *   {
   *     validator: isValidGameState,
   *     onError: handleError
   *   }
   * )
   * ```
   */
  public readSaveFile<T>(
    slot: number,
    type: SaveFileType,
    options: SaveOptions<T> = defaultOptions
  ): T | undefined {
    const filePath = this.getFilePath(slot, type)
    const parsedOptions = { ...defaultOptions, ...options }

    try {
      // Don't validate slot for active slot file
      if (type !== SaveFileType.ACTIVE_SLOT) {
        this.validateSlot(slot)
      }

      if (!fs.existsSync(filePath)) {
        if (
          parsedOptions.createIfNotExists &&
          parsedOptions.defaultValue !== undefined
        ) {
          this.writeSaveFile(slot, type, parsedOptions.defaultValue)
          return parsedOptions.defaultValue as T
        }

        throw new PersistenceError(
          `Save file does not exist: ${filePath}`,
          'FILE_NOT_FOUND',
          slot,
          type
        )
      }

      const fileContent = fs.readFileSync(filePath, 'utf8')
      let data: T

      try {
        data = JSON.parse(fileContent) as T
      } catch (error) {
        throw new PersistenceError(
          `Invalid JSON in save file: ${filePath}`,
          'INVALID_JSON',
          slot,
          type,
          error as Error
        )
      }

      if (parsedOptions.validator && !parsedOptions.validator(data)) {
        throw new PersistenceError(
          `Invalid data structure in save file: ${filePath}`,
          'INVALID_DATA',
          slot,
          type
        )
      }

      return data
    } catch (error) {
      if (error instanceof PersistenceError) {
        parsedOptions.onError?.(error)
        if (
          parsedOptions.createIfNotExists &&
          parsedOptions.defaultValue !== undefined
        ) {
          this.writeSaveFile(slot, type, parsedOptions.defaultValue)
          return parsedOptions.defaultValue as T
        }

        return undefined
      }

      const persistenceError = new PersistenceError(
        `Error reading save file: ${filePath}`,
        'READ_ERROR',
        slot,
        type,
        error as Error
      )
      parsedOptions.onError?.(persistenceError)

      if (
        parsedOptions.createIfNotExists &&
        parsedOptions.defaultValue !== undefined
      ) {
        this.writeSaveFile(slot, type, parsedOptions.defaultValue)
        return parsedOptions.defaultValue as T
      }

      return undefined
    }
  }

  /**
   * Writes data to a save file with error handling.
   *
   * @template T - The type of data to save
   * @param slot - The save slot number (1-3)
   * @param type - The type of save file to write
   * @param data - The data to save
   * @throws {PersistenceError} If there's an error writing the file
   *
   * @example
   * ```typescript
   * manager.writeSaveFile(
   *   1,
   *   SaveFileType.GAME_SAVE,
   *   gameState
   * )
   * ```
   */
  public writeSaveFile<T>(slot: number, type: SaveFileType, data: T): void {
    const filePath = this.getFilePath(slot, type)

    try {
      // Don't validate slot for active slot file
      if (type !== SaveFileType.ACTIVE_SLOT) {
        this.validateSlot(slot)
      }

      // Ensure the save directory exists
      if (!fs.existsSync(this.saveDir)) {
        fs.mkdirSync(this.saveDir, { recursive: true })
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    } catch (error) {
      if (error instanceof PersistenceError) {
        throw error
      }

      throw new PersistenceError(
        `Error writing save file: ${filePath}`,
        'WRITE_ERROR',
        slot,
        type,
        error as Error
      )
    }
  }

  /**
   * Deletes a save file if it exists.
   *
   * @param slot - The save slot number (1-3)
   * @param type - The type of save file to clear
   * @throws {PersistenceError} If there's an error deleting the file
   *
   * @example
   * ```typescript
   * manager.clearSaveFile(1, SaveFileType.GAME_LOG)
   * ```
   */
  public clearSaveFile(slot: number, type: SaveFileType): void {
    const filePath = this.getFilePath(slot, type)

    try {
      // Don't validate slot for active slot file
      if (type !== SaveFileType.ACTIVE_SLOT) {
        this.validateSlot(slot)
      }

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (error) {
      if (error instanceof PersistenceError) {
        throw error
      }

      throw new PersistenceError(
        `Error clearing save file: ${filePath}`,
        'DELETE_ERROR',
        slot,
        type,
        error as Error
      )
    }
  }

  /**
   * Gets the currently active save slot number.
   *
   * @returns The active slot number (1-3)
   * @throws {PersistenceError} If there's an error reading the active slot file
   *
   * @example
   * ```typescript
   * const activeSlot = manager.getActiveSlot()
   * ```
   */
  public getActiveSlot(): number {
    const data = this.readSaveFile<{ activeSlot: number }>(
      0,
      SaveFileType.ACTIVE_SLOT,
      {
        createIfNotExists: true,
        defaultValue: { activeSlot: 1 },
        validator: (data): data is { activeSlot: number } =>
          typeof data === 'object' &&
          data !== null &&
          typeof data.activeSlot === 'number' &&
          data.activeSlot >= 1 &&
          data.activeSlot <= 3,
      }
    )
    return data?.activeSlot ?? 1
  }

  public setActiveSlot(slot: number): void {
    if (slot < 1 || slot > 3) {
      throw new Error('Invalid slot number. Must be between 1 and 3.')
    }

    this.writeSaveFile(0, SaveFileType.ACTIVE_SLOT, { activeSlot: slot })
  }

  public getAllSaveSlots(): Array<{ slot: number; exists: boolean }> {
    return [1, 2, 3].map((slot) => ({
      slot,
      exists: fs.existsSync(this.getFilePath(slot, SaveFileType.GAME_SAVE)),
    }))
  }

  public deleteSlotSaveFiles(slot: number): void {
    this.clearSaveFile(slot, SaveFileType.GAME_SAVE)
    this.clearSaveFile(slot, SaveFileType.GAME_LOG)
  }

  private getFilePath(slot: number, type: SaveFileType): string {
    // Special case for active slot which doesn't use slot number
    if (type === SaveFileType.ACTIVE_SLOT) {
      return path.join(this.saveDir, 'active_slot.json')
    }

    return path.join(this.saveDir, `slot_${slot}_${type}.json`)
  }

  private validateSlot(slot: number): void {
    if (slot < 1 || slot > 3) {
      throw new PersistenceError(
        `Invalid slot number: ${slot}. Must be between 1 and 3.`,
        'INVALID_SLOT',
        slot
      )
    }
  }
}
