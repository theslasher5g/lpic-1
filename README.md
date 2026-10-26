# LPIC-1 Trainer

An interactive study site for the **LPIC-1 certification (version 5.0)**, covering exams **101-500** and **102-500**. It works both as a **wiki** for looking things up and as a **trainer** for testing yourself:

- **Wiki for all 42 objectives** (101.1 – 110.3), with every term from the official objective list, worked examples, config file samples and "Exam focus" notes.
- **559 practice questions** (single choice, multiple choice, fill-in-the-blank), each with an explanation.
- **Exam simulator**: 60 questions in 90 minutes, weighted by objective weight like the real exam, with 65 % as the pass mark (an approximation of LPI's scaled 500/800 score).
- **Spaced repetition** (Leitner boxes) in a *Review* queue, plus **flashcards** for commands and questions.
- **Simulated Debian shell** running entirely in the browser, with about 300 commands, a virtual filesystem with permissions and links, users and sudo, systemd, apt/dpkg/rpm, disks and LVM, networking, ssh/gpg, cron/at, CUPS, a mail queue, the journal, plus vi and nano editors.
  - Every `$ command` in the wiki can be clicked to run it in the sandbox (lines starting with `#` run through `sudo`).
  - The sandbox keeps its state between visits (*Settings → reset* starts over).
- **27 hands-on labs**: tasks are checked automatically as you type commands.
- **16 simulations**: chmod/umask calculators, a regex tester, a cron builder, the boot sequence, runlevels ↔ targets, a vi trainer, a subnet calculator, a ports drill, passwd/shadow fields, links, MBR/GPT partitions, redirection, bash startup files, package commands across distributions, and an fstab builder.
- **Progress tracking**: mastery per objective (studied + questions + lab), exam readiness weighted by objective weight, a streak counter, exam history and personal notes.

All content is in English. No external libraries and no internet connection are needed.

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

To use a different port, change `"8080:8080"` in `docker-compose.yml` (for example `"3000:8080"`).

You can also export and import your progress as a JSON file under **Settings** in the app.

### Without compose

```bash
docker build -t lpic1-trainer .
docker run -d --name lpic1 -p 8080:8080 -v lpic1-data:/data --restart unless-stopped lpic1-trainer
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

The tests cover the shell simulator, all content (every objective present, exam weights adding up to 60 per exam, valid answer indices), each lab being solvable with its reference solution, and every example command in the wiki running without an internal error.

## Project layout

```
index.html                 single-page app shell
assets/css/style.css       light/dark theme
assets/js/shell/           browser bash simulator (vfs, parser, interpreter, ~300 commands, man pages, vi/nano, terminal)
assets/js/app.js           router, dashboard, wiki, quiz & exam engine, labs, flashcards
assets/js/store.js         progress store (localStorage + server sync, spaced repetition)
assets/js/sims.js          interactive simulations
assets/data/101.js … 110.js  wiki + questions per topic
assets/data/labs.js        hands-on labs
server.js                  zero-dependency Node server + SQLite persistence
tests/run.js               test suite
```

> The content follows the public LPIC-1 v5.0 objectives (https://wiki.lpi.org). This is an independent study aid, not affiliated with or endorsed by the Linux Professional Institute.
