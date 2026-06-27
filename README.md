# Catch Jesus 🕊️

A fast-paced **tap-the-target** game for a church-fair booth. Spiritual emojis
spawn and drift around the screen — tap as many as you can in 30 seconds. It
starts easy and ramps through 6 difficulty stages; the final 5 seconds are
frantic. Built with React + Vite, optimized for iPad / touch in landscape.

## Run it

```bash
npm install
npm run dev      # local dev server (open the printed URL on the iPad)
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## Tuning the game (no React needed)

Everything you'll want to tweak lives in [`src/config.js`](src/config.js):

- **`EMOJI_POOL`** — the emojis that spawn. Add/remove freely.
- **`STAGES`** — the 6 difficulty stages. Each controls how many targets are on
  screen, spawn rate, target size, speed range, and lifetime. Stage 1 is the
  easy warm-up; stage 6 is the frantic finale.
- **`ROUND_SECONDS`**, **`STAGE_SECONDS`**, **`FINAL_COUNTDOWN_SECONDS`** — round
  timing.

## Sound

All sound effects are synthesized live with the Web Audio API (no files to
load = no tap latency): a pitch-climbing pop on each tap, a combo sparkle for
rapid taps, a whoosh when a new stage kicks in, a countdown beep in the final 5
seconds, and a fanfare at the end. A **mute toggle** lives on the start screen
for the booth.

## Leaderboard

Top 10 scores with initials, persisted in `localStorage` on that iPad. View it
from the **Leaderboard** button on the start screen, or after a round on the end
screen.

## Deploy to GitHub Pages

**Live site:** https://stevenabi6912-prog.github.io/Catching-Jesus/

Deployment is automatic: every push to `main` triggers
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds the
app and publishes it to GitHub Pages (Pages source is set to "GitHub Actions").
Just commit and push:

```bash
git add -A && git commit -m "your change" && git push
```

`vite.config.js` uses `base: './'`, so the build works under the `/Catching-Jesus/`
repo subpath.

## Design

Navy / teal / gold palette with big, bold, rounded buttons. Drop in your Bible
Quest Trivia palette/fonts by editing the CSS variables at the top of
[`src/styles.css`](src/styles.css).
