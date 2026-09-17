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
- **Kits** — four playback engines behind one path: synthesised voices, TR-808 /
  TR-909 voice models, recorded acoustic kits, and your own one-shots (kept in
  IndexedDB; nothing is uploaded).
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
a break from its own rhythm, and writing the practice note that says *why* a bar
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

## Credits

Every sampled recording here is licence-clean by construction, and checked
against each project's own metadata rather than a blog post. Kits under
CC-BY-SA were deliberately passed over: share-alike creates obligations when
samples are embedded in a distributed page.

| Source                                                                         | Licence      | Used for                             |
| ------------------------------------------------------------------------------ | ------------ | ------------------------------------ |
| Virtuosity Drums — Versilian Studios & Karoryfer Samples                       | CC0 1.0      | Jazz kit, recorded percussion        |
| Versilian Community Sample Library                                              | CC0 1.0      | Woodblock, handclaps                 |
| Swirly Drums — Karoryfer Samples                                                | CC0 1.0      | Brush kit                            |
| Muldjord kit — recorded by Lars Muldjord, Hydrogen conversion by FreePats       | CC BY 4.0    | Muldjord kit                         |
| Soulful Vintage, Hard Trap — Boochi44                                           | CC0 1.0      | Dusty sampler, Trap kit              |
| [`@driftbox/engine`](https://github.com/emmettl/driftbox) — Louis Emmett        | MIT          | TR-808 / TR-909 voice models         |

CC0 requires no attribution. It is given anyway, because not being obliged to is
a poor reason not to. Not affiliated with Roland; every drum-machine waveform is
generated, and no samples of theirs are used.

The 21 design patterns referenced in the inherited orchestration learning area
are adapted from *Agentic Design Patterns* by Antonio Gullí.

## License

MIT
