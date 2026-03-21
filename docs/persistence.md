# Persistence System Documentation

## Overview

The persistence system in Potion Wars handles saving and loading game state, message logs, and active slot information. It uses a unified approach to file management with consistent naming conventions and robust error handling.

## File Structure

Save files are stored in the user's configuration directory:

- **Windows**: `%APPDATA%/potion-wars/` (e.g., `C:\Users\Username\AppData\Roaming\potion-wars\`)
- **Unix/Mac**: `~/.config/potion-wars/` (e.g., `/Users/username/.config/potion-wars/`)

### File Naming Convention

Files are named using the following pattern:

```
slot_[N]_[type].json
```

Where:

- `[N]` is the slot number (1-5) - **Updated to 5 slots**
- `[type]` is the save type (save, game_log)

Special files:

- `active_slot.json`: Stores the currently active save slot with metadata

Example directory structure:

```
~/.config/potion-wars/
├── active_slot.json        # Current active slot tracker
├── slot_1_save.json        # Game state for slot 1
├── slot_1_game_log.json    # Message history for slot 1
├── slot_2_save.json        # Game state for slot 2
├── slot_2_game_log.json    # Message history for slot 2
├── slot_3_save.json        # Game state for slot 3
├── slot_3_game_log.json    # Message history for slot 3
├── slot_4_save.json        # Game state for slot 4
├── slot_4_game_log.json    # Message history for slot 4
├── slot_5_save.json        # Game state for slot 5
└── slot_5_game_log.json    # Message history for slot 5
```

## Core Components

### SaveFileManager

**Location**: `src/core/persistence/saveLoad.ts`

The `SaveFileManager` is a singleton class that handles all file operations with robust error handling and validation. It abstracts all file system interactions to provide a consistent, type-safe interface.

```typescript
import { SaveFileManager } from '@/core/persistence/saveLoad'

const manager = SaveFileManager.getInstance()
```

#### Key Features

- **Singleton Pattern**: Single instance for all file operations
- **Type-Safe Operations**: Generic type support for data validation
- **Automatic Directory Creation**: Creates save directory if it doesn't exist
- **Atomic Operations**: File operations are atomic to prevent corruption
- **Error Recovery**: Graceful error handling with specific error codes
- **Validation Pipeline**: Built-in data validation and sanitization

#### API Methods

##### Reading Data

```typescript
const data = manager.readSaveFile<T>(
  slot: number,
  type: SaveFileType,
  options?: SaveOptions<T>
): T | null
```

**Options**:
- `createIfNotExists`: Create file with default data if missing
- `validator`: Function to validate loaded data structure
- `onError`: Custom error handler

##### Writing Data

```typescript
manager.writeSaveFile<T>(
  slot: number,
  type: SaveFileType,
  data: T
): void
```

**Features**:
- Automatic JSON serialization
- Pretty-printed output for human readability
- Atomic write operations (write to temp, then move)

##### Clearing Data

```typescript
manager.clearSaveFile(
  slot: number,
  type: SaveFileType
): void
```

##### Checking File Existence

```typescript
manager.saveFileExists(
  slot: number,
  type: SaveFileType
): boolean
```

### Save File Types

```typescript
enum SaveFileType {
  GAME_SAVE = 'save',       // Game state (GameState object)
  GAME_LOG = 'game_log',    // Message history (Message[])
  ACTIVE_SLOT = 'active_slot' // Active slot metadata
}
```

### Data Validation System

**Location**: `src/core/persistence/dataValidation.ts`

Comprehensive validation and migration system for save data:

#### Core Functions

```typescript
// Validate complete game state structure
validateGameState(data: unknown): data is GameState

// Sanitize state for saving (remove transient fields)
sanitizeGameState(state: GameState): GameState

// Migrate old save formats to current version
migrateGameState(data: unknown): GameState

// Validate message log structure
validateMessageLog(data: unknown): data is Message[]
```

#### Sanitization Process

The sanitizer removes transient fields before saving:
- `currentEvent` - Active event (should not persist)
- `currentStep` - Event step tracker
- `isShowingEventOutcome` - UI state flag
- `currentNPCInteraction` - Active NPC interaction

This prevents stale state from affecting new game sessions.

#### Migration Support

Handles save format changes across versions:
- Adds missing fields with defaults
- Removes deprecated fields
- Updates data structures
- Maintains backward compatibility

### Reputation Validation

**Location**: `src/core/persistence/reputationValidation.ts`

Specialized validation for reputation data:

```typescript
// Validate reputation state structure
validateReputationState(data: unknown): data is ReputationState

// Sanitize reputation data before save
sanitizeReputationState(state: ReputationState): ReputationState
```

### Error Handling

The system uses a custom `PersistenceError` class with specific error codes:

```typescript
class PersistenceError extends Error {
  constructor(
    message: string,
    code: PersistenceErrorCode,
    slot?: number,
    type?: SaveFileType,
    cause?: Error
  )
}
```

#### Error Codes

- `INVALID_SLOT`: Slot number out of range (1-5)
- `FILE_NOT_FOUND`: Save file doesn't exist
- `INVALID_JSON`: File contains malformed JSON
- `INVALID_DATA`: Data doesn't match expected structure
- `READ_ERROR`: General file read error
- `WRITE_ERROR`: General file write error
- `DELETE_ERROR`: File deletion error
- `PERMISSION_ERROR`: Insufficient file system permissions
- `DISK_FULL`: Not enough disk space
- `CORRUPTED_DATA`: Data corruption detected

#### Error Handling Pattern

```typescript
try {
  const gameState = manager.readSaveFile<GameState>(
    slot,
    SaveFileType.GAME_SAVE,
    {
      validator: validateGameState,
      onError: (error) => {
        // Custom error handling
        console.error(`Failed to load slot ${slot}:`, error.code)
      }
    }
  )
} catch (error) {
  if (error instanceof PersistenceError) {
    switch (error.code) {
      case 'FILE_NOT_FOUND':
        // Handle missing file
        break
      case 'INVALID_DATA':
        // Handle corrupt data
        break
      case 'INVALID_SLOT':
        // Handle invalid slot
        break
      default:
        // Handle other errors
    }
  }
}
```

## Usage Examples

### Saving Game State

```typescript
import { SaveFileManager, SaveFileType } from './utils'

const saveGame = (state: GameState, slot: number) => {
  SaveFileManager.getInstance().writeSaveFile(slot, SaveFileType.GAME_SAVE, {
    ...state,
    lastSave: new Date().toISOString(),
  })
}
```

### Loading Game State

```typescript
const loadGame = (slot: number): GameState | null => {
  return SaveFileManager.getInstance().readSaveFile<GameState>(
    slot,
    SaveFileType.GAME_SAVE,
    {
      createIfNotExists: false,
      validator: isValidGameState,
    }
  )
}
```

### Managing Message Logs

```typescript
const saveMessages = (messages: Message[], slot: number) => {
  SaveFileManager.getInstance().writeSaveFile(
    slot,
    SaveFileType.GAME_LOG,
    messages
  )
}
```

### Error Handling Example

```typescript
try {
  const data = SaveFileManager.getInstance().readSaveFile(
    slot,
    SaveFileType.GAME_SAVE,
    {
      onError: (error) => {
        if (error.code === 'INVALID_DATA') {
          // Handle invalid data
        }
      },
    }
  )
} catch (error) {
  if (error instanceof PersistenceError) {
    // Handle error based on error.code
  }
}
```

## Best Practices

### 1. Slot Management

- **Always use slots 1-5** (not 0-4)
- Validate slot numbers before any operation
- Handle invalid slot numbers gracefully with user feedback
- Check slot existence before loading
- Provide clear feedback for empty slots

```typescript
// Good
const isValidSlot = slot >= 1 && slot <= 5
if (!isValidSlot) {
  throw new PersistenceError('Invalid slot number', 'INVALID_SLOT', slot)
}

// Bad
const data = manager.readSaveFile(0, SaveFileType.GAME_SAVE) // Slot 0 is invalid
```

### 2. Data Validation

- **Always use validator functions** when loading data
- Validate both structure and content
- Use TypeScript type guards for runtime checks
- Handle validation failures gracefully
- Provide default values for missing fields during migration

```typescript
// Good
const gameState = manager.readSaveFile<GameState>(
  slot,
  SaveFileType.GAME_SAVE,
  {
    validator: validateGameState,
    createIfNotExists: false
  }
)

// Bad
const gameState = manager.readSaveFile<GameState>(slot, SaveFileType.GAME_SAVE)
// No validation - could load corrupt data
```

### 3. Sanitization Before Saving

- **Always sanitize state** before persisting
- Remove transient UI state
- Clear active event/interaction data
- Strip computed/derived values

```typescript
// Good
import { sanitizeGameState } from '@/core/persistence/dataValidation'

const cleanState = sanitizeGameState(currentGameState)
manager.writeSaveFile(slot, SaveFileType.GAME_SAVE, cleanState)

// Bad
manager.writeSaveFile(slot, SaveFileType.GAME_SAVE, currentGameState)
// May save transient state like currentEvent
```

### 4. Error Handling Strategy

- **Always catch PersistenceError** explicitly
- Use error codes to determine recovery strategy
- Provide meaningful user-facing error messages
- Log detailed errors for debugging
- Implement fallback behavior

```typescript
// Good
try {
  const gameState = loadGameState(slot)
  return gameState
} catch (error) {
  if (error instanceof PersistenceError) {
    switch (error.code) {
      case 'FILE_NOT_FOUND':
        showMessage('Save slot is empty', 'info')
        return null
      case 'INVALID_DATA':
        showMessage('Save file is corrupted', 'error')
        return null
      case 'CORRUPTED_DATA':
        // Attempt recovery
        return attemptDataRecovery(slot)
      default:
        showMessage('Failed to load save', 'error')
        return null
    }
  }
  throw error
}

// Bad
try {
  const gameState = loadGameState(slot)
} catch (error) {
  console.error(error) // Generic handling, no recovery
  return null
}
```

### 5. File Operations

- **Use SaveFileManager exclusively** for all file operations
- Never bypass the manager to access files directly
- Don't mix different save types in single operation
- Ensure operations are atomic (provided by manager)
- Check file existence before loading

```typescript
// Good
if (manager.saveFileExists(slot, SaveFileType.GAME_SAVE)) {
  const data = manager.readSaveFile(slot, SaveFileType.GAME_SAVE)
}

// Bad
import fs from 'fs'
const data = fs.readFileSync(`slot_${slot}_save.json`) // Bypasses manager
```

### 6. Type Safety

- **Use generic types** with SaveFileManager methods
- Define explicit interfaces for all saved data
- Use type guards for validation
- Never use `any` for save data

```typescript
// Good
interface SavedGameState extends GameState {
  version: string
  lastSave: string
}

const data = manager.readSaveFile<SavedGameState>(
  slot,
  SaveFileType.GAME_SAVE,
  { validator: validateSavedGameState }
)

// Bad
const data = manager.readSaveFile(slot, SaveFileType.GAME_SAVE) as any
```

### 7. Migration Strategy

- **Plan for schema changes** from the beginning
- Increment version numbers for breaking changes
- Test migration with old save files
- Preserve user data whenever possible
- Provide clear upgrade messages

```typescript
// Good
function migrateGameState(data: unknown): GameState {
  const version = (data as any).version || '1.0.0'

  if (version < '2.0.0') {
    // Migrate from 1.x to 2.x
    data = migrateV1ToV2(data)
  }

  if (version < '3.0.0') {
    // Migrate from 2.x to 3.x
    data = migrateV2ToV3(data)
  }

  return data as GameState
}

// Bad
function loadGameState(slot: number): GameState {
  const data = manager.readSaveFile(slot, SaveFileType.GAME_SAVE)
  return data // No migration, breaks with old saves
}
```

### 8. Message Log Management

- Keep message logs bounded in size
- Trim old messages during save
- Preserve critical messages (errors, achievements)
- Consider log rotation for performance

```typescript
// Good
const MAX_MESSAGES = 1000
const trimmedMessages = messages.slice(-MAX_MESSAGES)
manager.writeSaveFile(slot, SaveFileType.GAME_LOG, trimmedMessages)

// Bad
manager.writeSaveFile(slot, SaveFileType.GAME_LOG, messages)
// Unbounded growth, can cause performance issues
```

### 9. Debugging Persistence Issues

When debugging save/load issues, **always check the actual save files**:

```bash
# View save file
cat ~/.config/potion-wars/slot_1_save.json | jq '.'

# Check for specific issues
grep -i "nan\|null\|undefined" ~/.config/potion-wars/slot_1_save.json

# View message log
tail -50 ~/.config/potion-wars/slot_1_game_log.json

# Backup before testing
cp ~/.config/potion-wars/slot_1_save.json ~/backup_slot_1.json
```

### 10. Testing Persistence

- Test save/load cycles thoroughly
- Verify data integrity after save/load
- Test migration paths
- Test error recovery scenarios
- Test with corrupted data

```typescript
// Example test pattern
test('saves and loads game state correctly', async (t) => {
  const originalState = createTestGameState()

  // Save
  manager.writeSaveFile(1, SaveFileType.GAME_SAVE, originalState)

  // Load
  const loadedState = manager.readSaveFile<GameState>(
    1,
    SaveFileType.GAME_SAVE,
    { validator: validateGameState }
  )

  // Verify
  t.deepEqual(loadedState, originalState)

  // Cleanup
  manager.clearSaveFile(1, SaveFileType.GAME_SAVE)
})
```
