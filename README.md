# LPIC-1 Trainer

An interactive study site for the **LPIC-1 certification (version 5.0)**, covering exams **101-500** and **102-500**. It works both as a **wiki** for looking things up and as a **trainer** for testing yourself:

- **Calm layout**: the start page "Today" shows one next step; wiki pages are read step by step (one section at a time, switchable under *Settings → Layout*); less-used tools are folded into "More tools".
- **Study plan**: enter your exam dates and hours per week; the plan schedules every objective, ends with exam training and is recalculated daily (finished objectives are skipped).
- **Wiki for all 42 objectives** (101.1 – 110.3), with every term from the official objective list, worked examples, config file samples and "Exam focus" notes. Weights and term lists are checked against the official LPI Learning Materials, and every objective page links to its Learning Materials chapter.
- **1001 practice questions** (single choice, multiple choice, fill-in-the-blank, scenarios), each with an English explanation.
- **Optional German help**: a German explanation for every question and a German summary on every objective page (*Settings → Language*). The questions themselves stay in English, as in the exam.
- **Exam simulator**: 60 questions in 90 minutes, weighted by objective weight like the real exam, with 65 % as the pass mark (an approximation of LPI's scaled 500/800 score).
- **Exam analysis**: results per topic, time per question compared with the exam budget, and an exam history with a score trend chart.
- **Weak spots**: your weakest questions (practise the top 20 in one click), the commands and files you miss most, accuracy per topic, and objectives ranked by priority (exam weight × what is still missing).
- **Spaced repetition** (Leitner boxes) in a *Review* queue, plus **flashcards** for commands and questions.
- **Printable cheatsheets** per topic or per exam: commands with their key options, files, terms and all exam notes, in a two-column print layout (save as PDF).
- **Simulated Debian shell** running entirely in the browser, with about 300 commands, a virtual filesystem with permissions and links, users and sudo, systemd, apt/dpkg/rpm, disks and LVM, networking, ssh/gpg, cron/at, CUPS, a mail queue, the journal, plus vi and nano editors.
  - Every `$ command` in the wiki can be clicked to run it in the sandbox (lines starting with `#` run through `sudo`).
  - The sandbox keeps its state between visits (*Settings → reset* starts over).
- **39 hands-on labs**: tasks are checked automatically as you type commands.
- **7 troubleshooting scenarios**: a fresh system with a realistic fault (full disk, web server that fails to start, no network or DNS, locked user, silent cron job, broken shared directory, runaway process). The tasks lead you from diagnosis to repair and verification.
- **16 simulations**: chmod/umask calculators, a regex tester, a cron builder, the boot sequence, runlevels ↔ targets, a vi trainer, a subnet calculator, a ports drill, passwd/shadow fields, links, MBR/GPT partitions, redirection, bash startup files, package commands across distributions, and an fstab builder.
- **Progress tracking**: mastery per objective (studied + questions + lab), exam readiness weighted by objective weight, a streak counter, exam history and personal notes.

The content is in English, with optional German explanations. No external libraries and no internet connection are needed.

## Run with Docker (recommended)

```bash
docker compose up -d
```

Then open **http://localhost:8080**.

Your progress (answers, notes, exam results, sandbox filesystem) is stored in an SQLite database in the named volume `lpic1-data`, mounted at `/data`. It survives container restarts, image rebuilds and `docker compose down`. Only `docker compose down -v` deletes it.

```bash
docker compose logs -f              # server log
docker compose down                 # stop (data is kept)
docker compose up -d --build        # update after pulling new code

# backup / restore the database
docker run --rm -v lpic1-data:/data -v "$PWD":/backup alpine cp /data/lpic1.db /backup/
docker run --rm -v lpic1-data:/data -v "$PWD":/backup alpine cp /backup/lpic1.db /data/
```

The port is published on `127.0.0.1` only, so the site is reachable from your own PC but not from other devices in your network (there is no login). To use a different port, change `127.0.0.1:8080:8080` in `docker-compose.yml` (for example `127.0.0.1:3000:8080`). To open the site from other devices on purpose, use `"8080:8080"`; then anyone in your network can see and overwrite the progress.

The sandbox has no real network access: `ping`, `dig`, `ssh`, `apt` etc. are simulated in the browser and never send a packet.

You can also export and import your progress as a JSON file under **Settings** in the app.

### Without compose

```bash
docker build -t lpic1-trainer .
docker run -d --name lpic1 -p 127.0.0.1:8080:8080 -v lpic1-data:/data --restart unless-stopped lpic1-trainer
```

## Run without Docker

You need Node.js **22.5 or newer** (it includes `node:sqlite`). There are no npm dependencies.

```bash
npm start            # or: node server.js   → http://localhost:8080
PORT=3000 DATA_DIR=./mydata node server.js
```

You can also open `index.html` directly in a browser. In that case progress is saved only in the browser's `localStorage`.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8080` | HTTP port |
| `HOST` | `0.0.0.0` | listen address |
| `DATA_DIR` | `./data` | directory for the database |
| `DB_PATH` | `$DATA_DIR/lpic1.db` (`/data/lpic1.db` in Docker) | SQLite file |

If `node:sqlite` is not available, the server falls back to a JSON file.

### API

`GET /api/health` · `GET /api/kv` · `GET|PUT|DELETE /api/kv/<key>` (the app uses the keys `progress` and `sandbox`).

## Tests

```bash
npm test
```

The tests cover the shell simulator, all content (every objective present, exam weights adding up to 60 per exam, valid answer indices, unique questions, German explanations), each lab and scenario being solvable with its reference solution, and every example command in the wiki running without an internal error.

Browser tests (optional, need Playwright with Chromium) start the server with a temporary database and click through every page, a quiz, a lab, a scenario, an exam and the terminal:

```bash
npm install --no-save playwright && npx playwright install chromium
npm run test:ui
```

## Project layout

```
index.html                 single-page app shell
assets/css/style.css       light/dark theme
assets/js/shell/           browser bash simulator (vfs, parser, interpreter, ~300 commands, man pages, vi/nano, terminal)
assets/js/app.js           router, dashboard, wiki, quiz & exam engine, labs, flashcards
assets/js/store.js         progress store (localStorage + server sync, spaced repetition)
assets/js/sims.js          interactive simulations
assets/data/101.js … 110.js  wiki + questions per topic
assets/data/q101.js … q110.js  additional questions
assets/data/de-101.js, de-102.js  German explanations and summaries
assets/data/scenarios.js   troubleshooting scenarios
assets/data/labs.js        hands-on labs
server.js                  zero-dependency Node server + SQLite persistence
tests/run.js               test suite
tests/ui.js                browser smoke tests (Playwright)
```

> The content follows the public LPIC-1 v5.0 objectives (https://wiki.lpi.org). This is an independent study aid, not affiliated with or endorsed by the Linux Professional Institute.
