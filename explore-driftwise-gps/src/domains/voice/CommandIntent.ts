/**
 * CommandIntent - Value enum representing voice command intentions
 * Maps user voice commands to actionable intents for the application
 */
export enum CommandIntent {
  /** User asks to pause the current voice session */
  PAUSE = 'PAUSE',

  /** User asks to continue/resume the current voice session */
  CONTINUE = 'CONTINUE',

  /** User asks to skip current fact and get a new one */
  SKIP = 'SKIP',

  /** User wants to receive facts more frequently */
  MORE_OFTEN = 'MORE_OFTEN',

  /** User wants to receive facts less frequently */
  LESS_OFTEN = 'LESS_OFTEN',

  /** User asks a follow-up question about the delivered fact */
  FOLLOW_UP = 'FOLLOW_UP',
}

/**
 * Get all valid command intents
 */
export function getCommandIntents(): CommandIntent[] {
  return Object.values(CommandIntent);
}

/**
 * Check if a value is a valid CommandIntent
 */
export function isCommandIntent(value: unknown): value is CommandIntent {
  return typeof value === 'string' && Object.values(CommandIntent).includes(value as CommandIntent);
}
