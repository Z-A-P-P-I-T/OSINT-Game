# Neon Trace - OSINT Game

Cyberpunk OSINT micro-game built for GitHub Pages. Run missions, decode signals, and pivot through a neon grid.

## Features

- 4 main missions + bonus branches
- Hard mode countdown
- Ambient synth audio (opt-in)
- Progress saved in localStorage
- Fully static (GitHub Pages ready)

## Run Locally

```bash
python3 -m http.server --directory . 8000
```
Open `http://127.0.0.1:8000` in a browser.

## Deploy on GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Set **Source** to `Deploy from a branch`.
4. Select `main` and `/root`.
5. Save and wait for the published URL.

## Notes

- Audio requires a click to start due to browser autoplay rules.
- Hard mode is a per-mission timer (toggle in the status panel).

## Author

Created by Kimi Autto (github.com/Z-A-P-P-I-T)
