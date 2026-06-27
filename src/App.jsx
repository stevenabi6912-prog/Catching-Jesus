import { useState, useEffect, useRef, useCallback } from 'react'
import jesusImg from './assets/jesus.png'
import {
  EMOJI_POOL,
  IMAGE_POOL,
  STAGES,
  ROUND_SECONDS,
  STAGE_SECONDS,
  FINAL_COUNTDOWN_SECONDS,
  MUTE_KEY,
  NAME_MAX_LEN,
  EMOJI_POINTS,
  JESUS_POINTS,
  STREAK_WINDOW_MS,
  STREAK_BADGE_MIN,
  STREAK_BONUS_EVERY,
  STREAK_BONUS_POINTS,
} from './config.js'

// Weighted spawn pool: emojis (kind 'emoji') + image targets (kind 'img'),
// where an image's `weight` repeats it so it spawns proportionally more often.
// Each entry carries its point value (images default to the 2x Jesus value).
const SPAWN_POOL = [
  ...EMOJI_POOL.map((value) => ({ kind: 'emoji', value, points: EMOJI_POINTS })),
  ...IMAGE_POOL.flatMap((img) =>
    Array.from({ length: img.weight || 1 }, () => ({
      kind: 'img',
      src: img.src,
      alt: img.alt,
      points: img.points ?? JESUS_POINTS,
    }))
  ),
]
import {
  initAudio,
  setMuted as setAudioMuted,
  playPop,
  playStreakBonus,
  playStageUp,
  playTick,
  playFanfare,
  playHighScore,
} from './audio.js'
import { loadLeaderboard, isHighScore, saveScore } from './leaderboard.js'


export default function App() {
  const [screen, setScreen] = useState('start') // 'start' | 'playing' | 'end'
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === '1')
  const [board, setBoard] = useState(() => loadLeaderboard())
  const [lastScore, setLastScore] = useState(0)
  const [newHigh, setNewHigh] = useState(false)

  useEffect(() => {
    setAudioMuted(muted)
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  }, [muted])

  const startGame = useCallback(() => {
    initAudio()
    setScreen('playing')
  }, [])

  const endGame = useCallback((score) => {
    setLastScore(score)
    setNewHigh(isHighScore(score))
    setScreen('end')
    if (isHighScore(score)) playHighScore()
    else playFanfare()
  }, [])

  const submitScore = useCallback((name) => {
    const next = saveScore(name, lastScore)
    setBoard(next)
  }, [lastScore])

  return (
    <div className="app">
      <div className="bg-globe" aria-hidden="true" />
      <div className="bg-cross" aria-hidden="true">✝</div>
      {screen === 'start' && (
        <StartScreen
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          onStart={startGame}
          board={board}
        />
      )}
      {screen === 'playing' && <GameScreen onEnd={endGame} />}
      {screen === 'end' && (
        <EndScreen
          score={lastScore}
          newHigh={newHigh}
          board={board}
          onSubmit={submitScore}
          onPlayAgain={startGame}
          onHome={() => setScreen('start')}
        />
      )}
    </div>
  )
}

/* ========================================================================== */
/*  START SCREEN                                                              */
/* ========================================================================== */
const FLOAT_EMOJIS = ['✝️', '🙏', '😇', '⛪', '📖', '🕊️', '✨', '🤍', '🛐', '🕯️']

function StartScreen({ muted, onToggleMute, onStart, board }) {
  const [showBoard, setShowBoard] = useState(false)
  return (
    <div className="screen start-screen">
      <div className="home-floating-emojis" aria-hidden="true">
        {FLOAT_EMOJIS.concat(FLOAT_EMOJIS).map((e, i) => (
          <div
            key={i}
            className="home-float"
            style={{
              left: `${5 + ((i * 37) % 90)}%`,
              fontSize: `${24 + ((i * 7) % 28)}px`,
              animationDuration: `${8 + ((i * 3) % 10)}s`,
              animationDelay: `${(i * 0.8) % 10}s`,
            }}
          >
            {e}
          </div>
        ))}
      </div>
      <div className="home-glow" aria-hidden="true" />

      <div className="logo-container">
        <img className="logo-jesus" src={jesusImg} alt="Jesus" draggable="false" />
        <h1 className="game-title">Catch&nbsp;Jesus</h1>
        <div className="game-subtitle">Tap the Faith Challenge</div>
      </div>

      <div className="how-to">
        Tap as many spiritual emojis as you can in <b>30 seconds!</b> Catching{' '}
        <b>Jesus is worth 2×</b>, and fast tap streaks earn <b>bonus points.</b>{' '}
        It gets harder every 5 seconds — the last 5 are <b>wild.</b> Ready?
      </div>

      <div className="btn-group">
        <button className="btn btn-primary btn-start" onClick={onStart}>
          Play Now!
        </button>
        <div className="start-actions">
          <button className="btn btn-secondary btn-small" onClick={() => setShowBoard(true)}>
            🏆 Top Scores
          </button>
          <button
            className="btn btn-secondary btn-small"
            onClick={onToggleMute}
            aria-pressed={muted}
          >
            {muted ? '🔇 Sound Off' : '🔊 Sound On'}
          </button>
        </div>
      </div>

      {showBoard && (
        <Modal onClose={() => setShowBoard(false)} title="🏆 Top Scores">
          <Leaderboard board={board} />
        </Modal>
      )}
    </div>
  )
}

/* ========================================================================== */
/*  GAME SCREEN                                                               */
/* ========================================================================== */
function GameScreen({ onEnd }) {
  const areaRef = useRef(null)
  const [targets, setTargets] = useState([])
  const [floaters, setFloaters] = useState([])
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS)
  const [stage, setStage] = useState(0)
  const [flash, setFlash] = useState(false)
  const [streak, setStreak] = useState(0)

  // Mutable game state (avoids re-render churn inside the rAF loop).
  const g = useRef({
    targets: [],
    floaters: [],
    score: 0,
    startTime: 0,
    lastFrame: 0,
    lastSpawn: 0,
    stage: 0,
    lastWhole: ROUND_SECONDS + 1,
    lastTapTime: 0,
    streak: 0,
    nextId: 1,
    raf: 0,
    ended: false,
  }).current

  const spawn = useCallback((cfg, now) => {
    const el = areaRef.current
    if (!el) return
    const w = el.clientWidth
    const h = el.clientHeight
    const size = cfg.size
    const margin = size / 2 + 6
    const x = margin + Math.random() * (w - margin * 2)
    const y = margin + Math.random() * (h - margin * 2)
    const angle = Math.random() * Math.PI * 2
    const speed = cfg.speed[0] + Math.random() * (cfg.speed[1] - cfg.speed[0])
    const pick = SPAWN_POOL[(Math.random() * SPAWN_POOL.length) | 0]
    g.targets.push({
      id: g.nextId++,
      ...pick,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      born: now,
      life: cfg.lifeMs,
    })
  }, [g])

  const hit = useCallback(
    (id, clientX, clientY) => {
      const idx = g.targets.findIndex((t) => t.id === id)
      if (idx === -1) return
      const target = g.targets[idx]
      g.targets.splice(idx, 1)

      const now = performance.now()
      // Grow the streak if this tap landed within the window of the last one.
      g.streak = now - g.lastTapTime < STREAK_WINDOW_MS ? g.streak + 1 : 1
      g.lastTapTime = now

      const isJesus = target.kind === 'img'
      const base = target.points ?? EMOJI_POINTS
      g.score += base

      // Streak milestone bonus.
      let bonus = 0
      if (g.streak > 0 && g.streak % STREAK_BONUS_EVERY === 0) {
        bonus = STREAK_BONUS_POINTS
        g.score += bonus
      }

      setScore(g.score)
      setStreak(g.streak)
      playPop(g.score, g.streak, isJesus)
      if (bonus) playStreakBonus()

      // Floating score text at the tap point (relative to play area).
      const rect = areaRef.current?.getBoundingClientRect()
      if (rect) {
        const x = clientX - rect.left
        const y = clientY - rect.top
        g.floaters.push({
          id: g.nextId++,
          x,
          y,
          born: now,
          text: isJesus ? `✝️ +${base}` : `+${base}`,
          kind: isJesus ? 'jesus' : 'normal',
        })
        if (bonus) {
          // Second popup, nudged up, for the streak bonus.
          g.floaters.push({
            id: g.nextId++,
            x,
            y: y - 38,
            born: now,
            text: `🔥 STREAK +${bonus}`,
            kind: 'bonus',
          })
        }
      }
    },
    [g]
  )

  useEffect(() => {
    const t0 = performance.now()
    g.startTime = t0
    g.lastFrame = t0
    g.lastSpawn = 0

    const frame = (now) => {
      if (g.ended) return
      const elapsed = (now - g.startTime) / 1000
      const left = Math.max(0, ROUND_SECONDS - elapsed)

      // --- difficulty stage ---
      const stageIdx = Math.min(STAGES.length - 1, Math.floor(elapsed / STAGE_SECONDS))
      if (stageIdx !== g.stage) {
        g.stage = stageIdx
        setStage(stageIdx)
        playStageUp()
        setFlash(true)
        setTimeout(() => setFlash(false), 350)
      }
      const cfg = STAGES[stageIdx]

      // --- countdown ticks (final seconds) ---
      const whole = Math.ceil(left)
      if (whole !== g.lastWhole) {
        g.lastWhole = whole
        if (whole <= FINAL_COUNTDOWN_SECONDS && whole > 0) playTick(whole <= 3)
        setTimeLeft(whole)
      }

      // --- spawning ---
      if (now - g.lastSpawn > cfg.spawnEveryMs && g.targets.length < cfg.maxTargets) {
        g.lastSpawn = now
        spawn(cfg, now)
      }

      // --- movement / bounce / cull ---
      const el = areaRef.current
      const w = el ? el.clientWidth : window.innerWidth
      const h = el ? el.clientHeight : window.innerHeight
      let dt = (now - g.lastFrame) / 1000
      g.lastFrame = now
      if (dt > 0.05) dt = 0.05 // clamp after tab-switch stalls

      const alive = []
      for (const t of g.targets) {
        t.x += t.vx * dt
        t.y += t.vy * dt
        const r = t.size / 2
        // bounce off the 4 walls so they stay catchable
        if (t.x < r) { t.x = r; t.vx = Math.abs(t.vx) }
        else if (t.x > w - r) { t.x = w - r; t.vx = -Math.abs(t.vx) }
        if (t.y < r) { t.y = r; t.vy = Math.abs(t.vy) }
        else if (t.y > h - r) { t.y = h - r; t.vy = -Math.abs(t.vy) }
        // despawn if missed (lived past its lifetime)
        if (now - t.born < t.life) alive.push(t)
      }
      g.targets = alive

      // expire the streak if there hasn't been a tap within the window
      if (g.streak > 0 && now - g.lastTapTime > STREAK_WINDOW_MS) {
        g.streak = 0
        setStreak(0)
      }

      // cull floaters
      g.floaters = g.floaters.filter((f) => now - f.born < 750)

      setTargets(g.targets.slice())
      setFloaters(g.floaters.slice())

      if (left <= 0) {
        g.ended = true
        onEnd(g.score)
        return
      }
      g.raf = requestAnimationFrame(frame)
    }

    g.raf = requestAnimationFrame(frame)
    return () => {
      g.ended = true
      cancelAnimationFrame(g.raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const urgent = timeLeft <= FINAL_COUNTDOWN_SECONDS

  return (
    <div className={`screen game-screen${flash ? ' stage-flash' : ''}`}>
      <div className="hud">
        <div className="hud-score">
          <span className="hud-label">SCORE</span>
          <span className="hud-value">{score}</span>
        </div>
        <div className="hud-center">
          <div className={`hud-timer${urgent ? ' urgent' : ''}`}>{timeLeft}</div>
          {streak >= STREAK_BADGE_MIN && (
            <div className="streak-badge" key={streak}>
              🔥 {streak} Streak!
            </div>
          )}
        </div>
        <div className="hud-stage">
          <span className="hud-label">STAGE</span>
          <span className="hud-value">{stage + 1}/6</span>
        </div>
      </div>

      <div className="play-area" ref={areaRef}>
        {targets.map((t) => (
          <button
            key={t.id}
            className={`target${t.kind === 'img' ? ' target-img' : ''}`}
            style={{
              transform: `translate(${t.x}px, ${t.y}px) translate(-50%, -50%)`,
              width: t.size,
              height: t.size,
              fontSize: t.size * 0.6,
            }}
            onPointerDown={(e) => {
              e.preventDefault()
              hit(t.id, e.clientX, e.clientY)
            }}
          >
            {t.kind === 'img' ? (
              <img src={t.src} alt={t.alt} draggable="false" />
            ) : (
              t.value
            )}
          </button>
        ))}
        {floaters.map((f) => (
          <div
            key={f.id}
            className={`floater floater-${f.kind}`}
            style={{ left: f.x, top: f.y }}
          >
            {f.text}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ========================================================================== */
/*  END SCREEN                                                                */
/* ========================================================================== */
function resultTier(score) {
  if (score >= 150) return { emoji: '🌟', title: 'Faith Champion!' }
  if (score >= 100) return { emoji: '🏆', title: 'Amazing Work!' }
  if (score >= 60) return { emoji: '💪', title: 'Great Job!' }
  if (score >= 30) return { emoji: '😊', title: 'Good Effort!' }
  return { emoji: '🙌', title: 'Keep Practicing!' }
}

function EndScreen({ score, newHigh, board, onSubmit, onPlayAgain, onHome }) {
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)
  const tier = resultTier(score)

  const submit = () => {
    if (saved) return
    onSubmit(name)
    setSaved(true)
  }

  return (
    <div className="screen end-screen">
      <div className="results-card">
        <div className="results-emoji">{tier.emoji}</div>
        {newHigh && <div className="new-high">🎉 New High Score! 🎉</div>}
        <h2 className="end-heading">{tier.title}</h2>
        <div className="final-score-value">{score}</div>
        <div className="final-score-label">points</div>

        {!saved ? (
          <div className="name-entry">
            <label className="name-label" htmlFor="playerName">
              Enter your name for the leaderboard
            </label>
            <input
              id="playerName"
              className="name-input"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase().slice(0, NAME_MAX_LEN))}
              placeholder="NAME"
              autoComplete="off"
              maxLength={NAME_MAX_LEN}
              inputMode="text"
              autoFocus
            />
            <button className="btn btn-primary btn-small" onClick={submit}>
              Save Score
            </button>
          </div>
        ) : (
          <div className="saved-msg">Saved! 🙌</div>
        )}

        <Leaderboard board={board} highlightScore={saved ? score : null} />

        <div className="btn-group end-actions">
          <button className="btn btn-primary" onClick={onPlayAgain}>
            Play Again
          </button>
          <button className="btn btn-secondary btn-small" onClick={onHome}>
            🏠 Home
          </button>
        </div>
      </div>
    </div>
  )
}

/* ========================================================================== */
/*  SHARED                                                                    */
/* ========================================================================== */
const MEDALS = ['🥇', '🥈', '🥉']

function Leaderboard({ board, highlightScore = null }) {
  let highlighted = false
  return (
    <div className="leaderboard">
      {board.length === 0 && (
        <div className="lb-empty">No scores yet —<br />be the first!</div>
      )}
      {board.map((e, i) => {
        const hl = highlightScore != null && !highlighted && e.score === highlightScore
        if (hl) highlighted = true
        return (
          <div key={i} className={`lb-row${hl ? ' lb-row-hl' : ''}`}>
            <span className={`lb-rank lb-rank-${i + 1}`}>
              {i < 3 ? <span className="lb-medal">{MEDALS[i]}</span> : i + 1}
            </span>
            <span className="lb-name">{e.name}</span>
            <span className="lb-score">{e.score}</span>
          </div>
        )
      })}
    </div>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        {children}
        <button className="btn btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
