# BeatBreaker — site copy

Pre-written content for the public pages and the first-run / empty states of the
app. Companion to [`app-plan.md`](./app-plan.md); Phase 2 of that plan puts this
copy on the pages.

**House style.** Plain English. Short sentences. Say what the thing does and
stop. British spelling, matching the rest of the repo (_practise_ is the verb,
_practice_ the noun). No "unlock", "supercharge", "revolutionise", "AI-powered",
"seamless", no exclamation marks, no emoji. BeatBuddy gets one short section on
the home page and is described by what it does, not by what it is built from.
Every number quoted below (37 styles, 12 time signatures, 47 grooves, five
layers, twelve doctor moves) is read from the code today — if one changes,
change the copy or derive it at build time from `STYLE_KEYS.length` and friends.

**One noun.** The copy below says **pattern** for the thing a user makes, saves
and shares, and keeps **break** for the classic recorded breaks in the library
("Famous breaks"). Decided 2026-09-21 (D1 in the plan).

---

## 1. Home — `/`

**Meta title:** BeatBreaker — learn, practise and write drum patterns
**Meta description:** BeatBreaker writes a drum pattern in the style you pick,
shows it as notation, plays it on a real kit, and gives you the tools to practise
it.

### Hero

> # Learn, practise and write drum patterns.
>
> BeatBreaker writes a drum pattern in the style you pick, shows it as proper
> notation, plays it back on a real kit, and gives you the tools to get it under
> your hands.
>
> **[Create a free account]** · [See what people are sharing]

Beside or below the hero: one real screenshot of the chart and the step grid
with the playhead mid-bar. No illustration, no stock photo. A live, playable
read-only pattern is better still if Phase 5's public pattern view exists by then.

### Three columns

> ### Learn
>
> Every pattern comes in five layers, from kick, snare and eighth-note hats up to
> the full thing with ghost notes. Start at layer 1. Add a layer when the last
> one feels easy. It is the order a teacher would give it to you.
>
> The chart is standard drum notation. Turn on the counting row and the sticking
> row if they help, and turn them off when they don't.

> ### Practise
>
> Slow it down to 60%, loop it, and let the tempo trainer nudge the speed up a
> little every time round until you reach your target. Mute the snare and play
> it yourself. Keep the click on the grid while the groove leans off it, and
> hear the difference.
>
> Works with headphones and a practice pad, an acoustic kit, or an electronic
> kit over MIDI.

> ### Write
>
> Pick from 37 styles — funk, boom bap, bossa, bebop, reggae, songo, second line
> — in 12 time signatures. Press **New** until you hear something you like, then
> edit it on the grid. Ask for a busier kick, more space, or a fill in the last
> bar.
>
> BeatBreaker checks that every pattern can be played by one person with four
> limbs, and tells you which bar is the hard one.

### The library

> ## 47 grooves worth knowing
>
> Funky Drummer. Amen, Brother. When the Levee Breaks. Rosanna. The main groove
> from each record, written out a bar or two at a time, so you can see what is
> being played and slow it down until you can play it too.
>
> These are practice versions, the way you would be taught them, not
> note-for-note transcriptions of one take.

### BeatBuddy

> ## Ask BeatBuddy
>
> BeatBuddy is the assistant built into the app. Tell it what you want in plain
> words — "a half-time shuffle at 80", "make bar 2 less busy", "turn this into a
> bossa" — and it changes the pattern in front of you. You can undo anything it
> does.
>
> It can also read a pattern you give it: a MIDI file, a BeatBreaker code, or a
> photo of a page of notation. It gets photos mostly right and tells you which
> bars it was unsure about.

### Save and share

> ## Keep your work, share what's good
>
> Everything you save is in your account, on any device. Mark the patterns you
> are working on so they are the first thing you see when you come back.
>
> Share a pattern with a link — the person who opens it can read it and play it
> without an account. Publish your best ones to the community library for other
> drummers to learn. They appear under a username you choose, not your real
> name.
>
> Add a link to a video or to the song on Spotify, so whoever opens the pattern
> can hear what it is meant to sound like.

### How it works

> 1. **Pick a style and press New.** You get a two-part pattern — an A section
>    and a B section — at a sensible tempo for the style.
> 2. **Read it, hear it, slow it down.** Drop to layer 1 and work up.
> 3. **Save it.** Come back to it tomorrow, print the chart, send it to your
>    teacher, or export it as MIDI.

### Questions

> **Do I need to read music?**
> No. The step grid shows the same pattern as coloured squares, and the two stay
> in step. Most people find they are reading the notation within a few weeks of
> looking at both.
>
> **Do I need a drum kit?**
> No. A practice pad, or your knees, will do for learning a pattern. If you have
> an electronic kit or a drum machine with MIDI, BeatBreaker can play through it.
>
> **Does it work on a phone?**
> Yes. The chart and the practice tools work on a phone. Editing on the grid is
> easier on a tablet or a computer.
>
> **Can I use the patterns in my own music?**
> Patterns you write are yours. Export them as MIDI and use them however you
> like. Patterns other people have published are there to learn from and play;
> see the terms for the detail.
>
> **What does it cost?**
> BeatBreaker is free to use. BeatBuddy has a daily allowance, so that the cost
> of running it stays sensible.
>
> **Who is behind it?**
> BeatBreaker is made by Human-Centric Engineering. It is built on Sunrise, our
> open-source application starter.

### Closing call to action

> ## Pick a style and press New.
>
> **[Create a free account]**

---

## 2. About — `/about`

**Meta title:** About
**Meta description:** Why BeatBreaker exists, how it writes patterns, and what it
does and does not use a language model for.

> # About BeatBreaker
>
> BeatBreaker started as a practice tool for one drummer who wanted an endless
> supply of grooves to sight-read, in styles they didn't already play, that were
> guaranteed to be playable. It grew a notation engraver, a drum kit, a practice
> rig and a library, and became this.
>
> _(Owner: replace the paragraph above with the true origin story. Keep it to
> three sentences.)_
>
> ## How the patterns are written
>
> By rules, not by a language model. Each style is a description of how that
> music is played: where the kick tends to fall, how busy the hi-hats are, where
> ghost notes like to sit, how far behind the beat the snare leans. The generator
> rolls dice inside those rules. A critic then checks the result — can one person
> play it, is it too busy, does it groove — and throws away the ones that fail.
>
> This is why a pattern appears instantly, why the same code always gives the
> same pattern, and why BeatBreaker never hands you something that needs three
> hands.
>
> ## Where BeatBuddy comes in
>
> BeatBuddy is a language model with access to the same tools you have: the
> generator, the editor, the critic. When you ask it for something, it uses those
> tools, and the critic checks its work the same way it checks the generator's.
> It is there for the things that are easier to say than to click — "swap the
> ride for hats in the B section and thin out the ghosts".
>
> What you type to BeatBuddy, and any file you attach, is sent to a model
> provider to be answered. The [privacy policy](/privacy) says which provider
> and what they may do with it.
>
> _(Owner: only add "it is not used to train models" once that has been checked
> against the current provider's API terms — OpenAI at launch — and re-check it
> whenever the provider changes.)_
>
> ## The community library
>
> Anyone with an account can publish a pattern. Published patterns carry the
> username of the person who wrote them — a name you pick, separate from the
> name on your account. If you build on someone else's pattern, the
> new one says so and links back.
>
> ## The famous grooves
>
> The grooves in the built-in library are short practice versions of well-known
> drum parts, credited to the drummers who played them. They are here for
> study. No recordings are used or sampled.
>
> ## The sounds
>
> The recorded kits come from free, openly licensed sample libraries: Virtuosity
> Drums, the Versilian Community Sample Library and Swirly Drums (Versilian
> Studios and Karoryfer Samples), the Boochi44 kits, built from Michael
> Fischer's TR-808 recordings, and MuldjordKit by Lars Muldjord. Drum samples
> provided by DrumGizmo.org. MuldjordKit is used under
> [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), re-encoded and
> arranged into velocity layers for BeatBreaker; the rest are CC0. Samples you
> load yourself stay in your browser.
>
> _(Owner: this section is the licence's attribution for MuldjordKit on the
> deployed site. It has to ship with the recorded kits, so don't cut it for
> length.)_
>
> ## Who makes it
>
> Human-Centric Engineering. [Get in touch](/contact) — especially if a groove
> in the library is wrong. Drummers will know.

---

## 3. Contact — `/contact`

Keep the platform's contact form. Replace only the intro copy.

> # Get in touch
>
> Found a bug, spotted a wrong note in one of the library grooves, or want a
> style added? Tell us here. We read everything. We can't always reply.
>
> To report a published pattern — spam, someone else's work passed off as the
> publisher's own, an offensive title — use the **Report** link on the pattern's
> page instead. It reaches us faster.

---

## 4. Community library — `/explore` (public, new in Phase 5)

**Meta title:** Community library
**Meta description:** Drum patterns written and published by BeatBreaker users.
Open one to read it, play it and practise it.

> # Community library
>
> Patterns published by people who use BeatBreaker. Open one to read it and play
> it. Sign in to save a copy and practise it properly.

Filter labels: **Style** · **Time signature** · **Tempo** · **Difficulty** ·
sort by **Newest** / **Most saved**.

Empty result:

> Nothing matches those filters yet. Try a different style — or write one and
> publish it.

---

## 5. A shared or published pattern — `/p/[slug]` (public, new in Phase 5)

Header block:

> **{Title}**
> by @{username} · {Style} · {Time signature} · {bpm} bpm
> _Based on "{Parent title}" by @{parent username}_ ← only when it is a remix
>
> _(A pattern shared by link by someone who has not chosen a username shows no
> "by" line.)_

Reference links, below the chart — each is a placeholder until pressed, so
nothing loads from YouTube or Spotify unless the visitor asks:

> **▶ Play video from YouTube** — {label, e.g. "Tutorial" / "Live, 1973"}
> **♫ Listen on Spotify** — {track · artist}
>
> _Pressing play loads content from YouTube / Spotify, who may set cookies._

Signed-out footer strip:

> You can read and play this pattern here. **[Create a free account]** to save a
> copy, slow it down by layers, and edit it.

Signed-in actions: **Save a copy** · **Open in the editor** · **Report**

Unpublished or removed:

> This pattern isn't shared any more. The person who made it may have made it
> private or deleted it.

---

## 6. In-app first-run and empty states

### Home (signed in) — `/dashboard`, labelled "Home"

First visit, nothing saved:

> # Welcome to BeatBreaker
>
> Nothing here yet. Press **New pattern**, pick a style, and save the first one
> you like. It will show up here.
>
> **[New pattern]** · [Browse the famous grooves] · [Browse the community library]

Section headings once there is content: **Working on** · **Recent** ·
**Published**

"Working on" when empty but the user has saved patterns:

> Pin the patterns you are practising this week and they will stay at the top.

### My patterns drawer

Empty:

> You haven't saved anything yet. **Save** is in the header, or press **S**.

Unsaved-changes prompt when opening another pattern:

> **Save your changes to "{Title}"?**
> [Save] · [Don't save] · [Cancel]

Migrating browser-only favourites (one-time, Phase 3):

> **You have {n} patterns saved in this browser from before accounts existed.**
> Move them into your account so they are on all your devices?
> [Move them] · [Not now]

### Publish dialog

> **Publish "{Title}" to the community library**
>
> Anyone will be able to find it, play it and save a copy. It will appear as
> **by @{username}** — [change]. Your account name and email are never shown.
> You can unpublish it whenever you like; copies people have already saved stay
> with them.
>
> ☐ I wrote this, or I built it from a pattern whose author is credited on it.
>
> [Publish] · [Cancel]

First publish, no username yet — shown in place of the line above:

> **Choose a username**
> This is the name other drummers will see on anything you publish. It doesn't
> have to be your real name.
> `[ username ]` 3–24 letters, numbers, `-` or `_`
>
> - Taken: "That one's taken. Try another."
> - Reserved or not allowed: "That username isn't available."

### Pattern details (top of the Share & export drawer)

> **Title** `[ … ]`
> **Notes** `[ … ]` — _What is this pattern? What should someone listen for?_
>
> **Video link** `[ https://… ]` `[ label — optional ]`
> ⓘ A YouTube or Vimeo link: someone playing this pattern, the song it comes
> from, or a lesson. Add `?t=` to a YouTube link to start at the right moment.
>
> **Song link** `[ https://… ]`
> ⓘ A Spotify link to the track, album or playlist this pattern refers to.
>
> [+ Add another link] _(up to four)_

Validation messages:

> - "That doesn't look like a YouTube, Vimeo or Spotify link. Those are the ones
>   we can show at the moment."
> - "Links need to start with https://"
> - "That's the limit — four links per pattern."

### Settings → Drummer profile

> **Username** `[ … ]`
> ⓘ Shown on patterns you publish and on your public page,
> beatbreaker.app/u/{username}. Your account name and email are never public.
> You can change it, but not more than once a month, and your old one is held
> for 30 days.
>
> **About you** `[ … ]` — _optional, shown on your public page_

_(Domain in the help text is a placeholder — owner to supply.)_

### Share dialog

> **Share with a link**
> Anyone with this link can read and play the pattern. It won't appear in the
> community library.
> [Copy link] · [Stop sharing]

### BeatBuddy drawer

Header: **BeatBuddy**

First-open body:

> I can write patterns, change the one you have open, and explain what makes a
> bar hard. Try:
>
> - "A lazy half-time shuffle around 80"
> - "Make bar 2 less busy"
> - "Turn this into a bossa nova"
> - "Tidy up the ghost notes"
> - "Why is this marked hard to play?"
> - Attach a MIDI file or a photo of a chart and say "read this"

After an edit, the inline confirmation chip:

> Changed **A · bar 2** — 3 notes removed. **[Undo]**

When the daily allowance is used up:

> That's today's BeatBuddy allowance. Everything else in the app still works,
> and it resets at midnight.

When a photo was read with low confidence:

> I've read this as 2 bars of 4/4. I'm not sure about the hi-hat in bar 2 —
> check it against your page.

---

## 7. Legal pages — `/privacy`, `/terms`

**Not pre-written here on purpose.** The shipped pages are Sunrise placeholders
that say so. Real ones depend on facts only the owner has (the legal entity's
registered details, hosting region, the model provider and its data terms, the
minimum age, the governing law) and should be reviewed by someone qualified.
Phase 2 drafts them; what they must cover, in plain English:

**Privacy**

- What is stored: account details, saved patterns, practice takes if you record
  any, BeatBuddy conversations, uploaded files you give BeatBuddy.
- What is public: only patterns you choose to share or publish, the links and
  notes you put on them, and your username and "about you" text. Never your
  account name or email.
- Embedded video and music: pattern pages can show a YouTube, Vimeo or Spotify
  player, but only after you press play. Until then nothing is loaded from those
  services. Once you press play, their own privacy policies apply.
- BeatBuddy: messages and attachments go to a named model provider (OpenAI at
  launch — update this page whenever that changes) to be answered; what that
  provider may and may not do with them, stated from their current API terms
  rather than from memory; how long conversations are kept.
- Audio samples you load as a custom kit stay in your browser and are never
  uploaded _(true today — re-check if that changes)_.
- Your rights: download everything (Settings → Account → Export), delete your
  account and everything with it, including published patterns.
- Cookies: what the consent banner already controls.

**Terms**

- Patterns you write are yours. By publishing one you let other users play it,
  save a copy and build on it with credit. Unpublishing stops new copies; it
  does not claw back existing ones.
- Links you add must point to the video or song the pattern is about — not to
  adverts, shops or anything unrelated. We remove links that don't.
- Don't publish other people's work as your own, don't use titles to abuse
  people, don't spam the library. We remove things that break this and may close
  accounts that keep doing it.
- The built-in famous grooves are study versions credited to their drummers.
- BeatBuddy has a fair-use allowance. It can be wrong; the critic checks its
  patterns, but check its explanations yourself.
- The service is provided as-is; the usual liability wording.
