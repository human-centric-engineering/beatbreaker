# BeatBreaker

**BeatBreaker** generates drum breaks, engraves them as readable notation, plays
them back through a real kit, and gives you a practice rig to play along with —
tempo trainer, limb mutes, layered difficulty, and a click that stays honest
while the groove leans off it.

> **Built on Sunrise.** BeatBreaker is a leaf app on the
> [Sunrise](https://github.com/human-centric-engineering/sunrise) starter
> template. It was forked at Sunrise **v0.12.1** and pulls later Sunrise
> releases in through the `upstream` remote. The platform is extended through
> Sunrise's designed seams — `lib/app/*`, `components/app/*`,
> `prisma/schema/app.prisma` — rather than edited in place, so upgrades stay
> clean merges. Start with [`CUSTOMIZATION.md`](./CUSTOMIZATION.md) if you're
> working in this repo.

## What it does

- **Generator** — seeded, rule-based break generation across a library of
  styles, meters and kits. Kick density, ghost-note weight, swing and hi-hat
  dynamics are parameters, not presets.
- **Groove critic** — a hard playability filter (can a human with four limbs
  actually play this?) plus a 0–100 score with itemised checks. It runs on the
  server too, so a model-authored edit is checked before anyone sees it.
- **Notation** — a pure `(pattern, opts) => SVG` engraver. Beaming, rest
  merging and hi-hat accents follow the meter's pulse grouping, so 6/8 beams in
  threes without being told about compound time.
- **Five difficulty layers** — the same break reduced from skeleton (L1) to full
  break (L5), so you can learn it in the order a teacher would give it to you.
  A note written at a lower layer is pinned there rather than derived back out.
- **Practice rig** — metronome, tempo trainer that ramps to a ceiling, quick
  tempo percentages, per-lane mutes for playing a limb yourself, and a mixer
  whose faders start where the style puts them.
- **Kits** — four playback engines behind one path. Five synthesised kits (a
  graph per hit, so every knob is live) and five recorded kits are playing; the
  TR-808 / TR-909 voice models and your own one-shots are declared but not
  wired up yet, and the kit picker says so rather than quietly substituting
  something else.
- **Export** — a break code and a share link that carry both sections, and GM
  drum-map MIDI with swing, feel and ghost velocities written into the tick
  positions.

## Tech Stack

| Layer          | Technology                                           |
| -------------- | ---------------------------------------------------- |
| Framework      | Next.js 16 (App Router) + TypeScript                 |
| Database       | PostgreSQL + Prisma 7                                |
| Authentication | better-auth                                          |
| Styling        | Tailwind CSS 4 + shadcn/ui                           |
| Audio          | Web Audio API (`OfflineAudioContext` for baked kits) |
| Validation     | Zod throughout                                       |
| Deployment     | Docker-ready                                         |

Sunrise's AI agent orchestration layer comes along with the fork. BeatBreaker
uses a model in three places only — turning a sentence into a grid patch, naming
a break from its own rhythm, and writing the practice note that says _why_ a bar
is hard. The notes themselves are written by rules, which are faster and never
produce something unplayable.

## Quick Start

### Prerequisites

- Node.js 24+ (see `.nvmrc`)
- PostgreSQL 15+ (local, Docker, or hosted)

### Setup

```bash
git clone git@github.com:human-centric-engineering/beatbreaker.git
cd beatbreaker

cp .env.example .env.local

# Generate BETTER_AUTH_SECRET
openssl rand -base64 32

# Edit .env.local with your DATABASE_URL and BETTER_AUTH_SECRET

npm install
npm run db:migrate:dev
npm run dev
```

Open http://localhost:3022 — the port is set by `PORT` in the committed
`.env.development`, which `npm run dev` reads. BeatBreaker claims **3022**;
Sunrise itself is on 3010.

### First admin account

There are **no default credentials**. On a fresh database, the first account you
create at [`/signup`](http://localhost:3022/signup) is promoted to `ADMIN`;
every account after that is a regular `USER`.

## Essential Commands

```bash
npm run dev              # Start dev server (port 3022)
npm run validate         # CHANGELOG + Node version + type-check + lint + format
npm run db:studio        # Open Prisma Studio
npm test                 # Run tests
```

Full command reference: [`.context/commands.md`](./.context/commands.md)

## Staying in sync with Sunrise

```bash
git fetch upstream --tags
git checkout -b chore/sync-sunrise-0.13.0
git merge v0.13.0
```

**Merge the sync PR with a merge commit — never squash it.** Squashing discards
the second parent, so git stops knowing the release tag is in your history and
the next sync replays the entire preceding range. See
[`CUSTOMIZATION.md` §9](./CUSTOMIZATION.md); the `Fork Sync Integrity` workflow
catches it on the next push to `main` and prints the repair.

BeatBreaker's own releases are tagged `beatbreaker-vX.Y.Z`. Sunrise's `v*` tags
are fetched from `upstream` and are not pushed to this repo's origin.

## Documentation

- [**CUSTOMIZATION.md**](./CUSTOMIZATION.md) — the fork onboarding guide:
  extension model, package.json policy, staying in sync with upstream
- [**.context/substrate.md**](./.context/substrate.md) — full architecture and
  reference docs
- [**CHANGELOG.md**](./CHANGELOG.md) — carries Sunrise's release history below
  BeatBreaker's own `[Unreleased]` entries, so upstream syncs merge cleanly

## What is not built yet

The port is honest about its edges — a kit or a control that is not there says
so, rather than falling through to something that sounds nearly right.

- **TR-808 / TR-909 voice models** and **your own one-shots** — the two kit
  engines still to wire up. Both are listed in the kit picker, disabled.
- **Per-voice kit tuning** — the kit parameter tables and their knob definitions
  are ported; the panel that exposes them is not, so kits play at their shipped
  values.
- **Web MIDI out**, **recording a take against the click**, **play-along
  scoring from the mic**, and **PDF export**.

The first two of those last four are what turn it from a practice tool into a
product: film yourself against the click, the take is stored with the break
code, and the feed becomes drummers answering each other's breaks. The `Take`
model is already in the schema for it.

## Credits

Every sampled recording here is under a licence that allows redistribution,
checked on 2026-09-21 against the licence each source publishes itself. Kits
under CC-BY-SA were deliberately passed over: share-alike creates obligations
when samples are embedded in a distributed page.

| Source                                                                                                                    | Licence                                                   | Used for                      |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------- |
| [Virtuosity Drums](https://github.com/sfzinstruments/virtuosity_drums) — Versilian Studios & Karoryfer Samples            | CC0 1.0                                                   | Jazz kit, recorded percussion |
| [Versilian Community Sample Library](https://github.com/sgossner/VCSL)                                                    | CC0 1.0                                                   | Woodblock, handclaps          |
| [Swirly Drums](https://github.com/sfzinstruments/karoryfer.swirly-drums) — Karoryfer Samples                              | CC0 1.0                                                   | Brush kit                     |
| [MuldjordKit](https://github.com/freepats/muldjordkit) — recorded by Lars Muldjord, FreePats stereo version               | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Muldjord kit                  |
| [Soulful Vintage, Hard Trap](https://github.com/Boochi44/free-drum-samples) — Boochi44, from Michael Fischer's TR-808 set | CC0 1.0                                                   | Dusty sampler, Trap kit       |
| [`@driftbox/engine`](https://github.com/emmettl/driftbox) — Louis Emmett                                                  | MIT                                                       | TR-808 / TR-909 voice models  |

**Drum samples provided by DrumGizmo.org.** The Muldjord kit is changed from
the FreePats version: a subset of its samples, re-encoded as mp3 and grouped
into velocity layers. The changed files are under the same CC BY 4.0 licence.

The Boochi44 kits carry their CC0 grant in the project's README; the repository
has no separate licence file. Their sounds are processed from Michael Fischer's
1994 TR-808 recordings, which he released as "absolutely free" and which are
republished under CC0 in
[tidalcycles/sounds-tr808-fischer](https://github.com/tidalcycles/sounds-tr808-fischer).

CC0 requires no attribution. It is given anyway, because not being obliged to is
a poor reason not to. Not affiliated with Roland. The TR-808 / TR-909 kits are
synthesised; the Dusty sampler and Trap kits are processed recordings of a real
TR-808, and no Roland-published samples are used.

The 21 design patterns referenced in the inherited orchestration learning area
are adapted from _Agentic Design Patterns_ by Antonio Gullí.

## License

MIT
