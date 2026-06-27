// ============================================================================
//  EDIT ME — game tuning lives here.
// ============================================================================

import jesusImg from './assets/jesus.png'

// The pool of emoji targets that can spawn. Add/remove emojis freely.
export const EMOJI_POOL = ['✝️', '🙏', '😇', '⛪', '📖', '🕊️', '✨', '🤍', '🛐', '🕯️']

// Image targets (e.g. the Jesus emoji). `weight` controls how often it spawns
// relative to a single emoji (weight 3 ≈ shows up like 3 emojis would). Drop
// more PNGs in src/assets and add entries here to mix them in.
export const IMAGE_POOL = [{ src: jesusImg, alt: 'Jesus', weight: 3 }]

// Round length in seconds.
export const ROUND_SECONDS = 30

// How many seconds each difficulty stage lasts. 6 stages * 5s = 30s round.
export const STAGE_SECONDS = 5

// Number of beeps-worth of "final countdown" tension at the end of the round.
export const FINAL_COUNTDOWN_SECONDS = 5

// ----------------------------------------------------------------------------
//  Difficulty stages (index 0 = first 5s ... index 5 = final frantic 5s).
//  - maxTargets:    most targets allowed on screen at once
//  - spawnEveryMs:  delay between spawns (lower = more targets faster)
//  - size:          target diameter in px (shrinks as it gets harder)
//  - speed:         [min, max] px per second a target travels
//  - lifeMs:        how long a target lives before it despawns if missed
// ----------------------------------------------------------------------------
export const STAGES = [
  // Stage 1 — easy warm-up
  { maxTargets: 3, spawnEveryMs: 850, size: 130, speed: [60, 110], lifeMs: 3200 },
  // Stage 2
  { maxTargets: 5, spawnEveryMs: 700, size: 116, speed: [90, 150], lifeMs: 2900 },
  // Stage 3
  { maxTargets: 7, spawnEveryMs: 560, size: 102, speed: [120, 200], lifeMs: 2500 },
  // Stage 4
  { maxTargets: 9, spawnEveryMs: 440, size: 90, speed: [160, 260], lifeMs: 2200 },
  // Stage 5
  { maxTargets: 12, spawnEveryMs: 330, size: 78, speed: [210, 330], lifeMs: 1900 },
  // Stage 6 — frantic finale
  { maxTargets: 16, spawnEveryMs: 230, size: 66, speed: [280, 430], lifeMs: 1600 },
]

// Persisted leaderboard.
export const LEADERBOARD_KEY = 'catchJesus.leaderboard.v1'
export const LEADERBOARD_SIZE = 10
// Max characters for a player's name/initials on the leaderboard.
export const NAME_MAX_LEN = 12
export const MUTE_KEY = 'catchJesus.muted.v1'
