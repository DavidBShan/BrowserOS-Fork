/**
 * Eval-specific constants shared across agents, runners, and capture modules.
 */

export const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
export const SCREENSHOT_TIMEOUT_MS = 65_000 // 65s — ensures we get extension's error (60s)
export const MAX_ACTIONS_PER_DELEGATION = 5
export const CLADO_REQUEST_TIMEOUT_MS = 120_000
export const NO_PROGRESS_MAX_STREAK = 3
export const DOM_STATE_HASH_MAX_CHARS = 8000
