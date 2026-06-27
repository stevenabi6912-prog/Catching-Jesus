import { LEADERBOARD_KEY, LEADERBOARD_SIZE, NAME_MAX_LEN } from './config.js'

export function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    return list
      .filter((e) => e && typeof e.score === 'number')
      .sort((a, b) => b.score - a.score)
      .slice(0, LEADERBOARD_SIZE)
  } catch {
    return []
  }
}

// Returns true only if `score` beats the current best (the #1 score).
// Used to show the "New High Score!" banner.
export function isHighScore(score) {
  if (score <= 0) return false
  const list = loadLeaderboard() // sorted high → low
  const best = list.length ? list[0].score : 0
  return score > best
}

// Adds an entry and returns the new top-10 list.
export function saveScore(name, score) {
  const list = loadLeaderboard()
  const clean = (name || '').trim().toUpperCase().slice(0, NAME_MAX_LEN) || '???'
  list.push({ name: clean, score, at: Date.now() })
  const next = list.sort((a, b) => b.score - a.score).slice(0, LEADERBOARD_SIZE)
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota errors */
  }
  return next
}
