# Studio controls

Every control in the Studio: where it is, what it is called, the help it has,
its shortcut and its smallest target (task 5.16). After the inventory comes the
owner's browser checklist, which lists what a unit test cannot see.

**This file is tested.**
`tests/unit/components/app/shell/controls-inventory.test.tsx` opens the Studio
on a saved pattern of yours with a shelf and a history, then opens every drawer
and every Patterns tab. Every control it finds by role must match a row here by
role and accessible name. Any row it cannot match fails too, so a control that
goes takes its row with it. A `<placeholder>` stands for a per-pattern or
per-lane part of a name, and `<a\|b\|c>` for one of a fixed set. A name that is
only a free placeholder would match every control of its role, so the test
refuses one. A row whose _Where_ says "when" belongs to a state the
sweep does not reach (a scratch pattern, a stuck save, a toast), and is exempt
from the "matches nothing" half. The buttons that open a row in a list are named
by the row's own text, so they are one family, _a list row_, and are not
matched by name.

**Adding a control?** Add its row here in the same PR, or the test fails. Name
it for what it does, not its state (see [`shell.md`](./shell.md) § Building a
new control). Give it a `<StudioHelp>` if it needs more than its name, and
`aria-keyshortcuts` if a key does the same thing.

**Targets.** The floor is 24px with a fine pointer and 32px with a coarse one
(E1). The sizes below are read from the CSS:

- `.mini` buttons: about 31px tall (7px padding, 12.5px text, 1px border).
- `Segmented`: about 31px tall; `.seg.small`: about 27px.
- Sliders: 24px.
- `<StudioHelp>` ⓘ: 24px.
- Grid cells: 24px, or 32px with a coarse pointer, times the Grid zoom.
- The 36px controls are the header steppers and the rail's icons.

## The frame: header, transport, chart and grid

| role     | name                                                                                      | where                                   | help                                 | shortcut         | target             |
| -------- | ----------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------ | ---------------- | ------------------ |
| button   | `Back — nothing opened before this`                                                       | header                                  | its title names what Back would open | ⌥←               | 32px               |
| button   | `Back to <title>`                                                                         | header, when there is somewhere to go   | —                                    | ⌥← / ⌥→          | 32px               |
| button   | `Save`                                                                                    | header, when the pattern is scratch     | the header's status line             | S, ⌘S            | 32px               |
| button   | `Save a copy`                                                                             | header, when it is someone else's       | —                                    | S, ⌘S            | 32px               |
| button   | `Save as variation`                                                                       | header, when a fixed pattern is edited  | the variation banner                 | S, ⌘S            | 32px               |
| button   | `Retry`                                                                                   | header, when a save is stuck            | —                                    | S, ⌘S            | 32px               |
| button   | `Play or stop`                                                                            | transport                               | —                                    | Space            | 36px               |
| button   | `Slower`                                                                                  | transport (tempo)                       | —                                    | [                | 36px               |
| button   | `Faster`                                                                                  | transport (tempo)                       | —                                    | ]                | 36px               |
| textbox  | `Tempo in bpm`                                                                            | transport (tempo)                       | —                                    | [ ]              | 36px               |
| slider   | `Tempo`                                                                                   | transport, wide screens                 | —                                    | [ ]              | 24px               |
| button   | `Count-in: <bars>`                                                                        | transport, wide screens                 | —                                    | —                | `.mini`            |
| button   | `Tap tempo`                                                                               | transport, wide screens                 | —                                    | —                | `.mini`            |
| button   | `New break`                                                                               | rail                                    | —                                    | N                | 36px               |
| button   | `Tools`                                                                                   | phone menu                              | —                                    | —                | 44px menu items    |
| button   | `Generate`                                                                                | rail                                    | —                                    | —                | 36px               |
| button   | `Edit`                                                                                    | rail                                    | —                                    | —                | 36px               |
| button   | `Patterns`                                                                                | rail                                    | —                                    | P                | 36px               |
| button   | `Sound`                                                                                   | rail                                    | —                                    | —                | 36px               |
| button   | `Practise`                                                                                | rail                                    | —                                    | —                | 36px               |
| button   | `Share`                                                                                   | rail                                    | —                                    | —                | 36px               |
| button   | `BeatBuddy`                                                                               | rail                                    | —                                    | —                | 36px               |
| button   | `Close`                                                                                   | every drawer                            | —                                    | Esc              | 36px               |
| button   | `Shortcuts ?`                                                                             | footer                                  | opens the shortcuts sheet            | ?                | `.mini`            |
| button   | `Cookie preferences`                                                                      | footer (Sunrise's)                      | —                                    | —                | Sunrise's          |
| button   | `Dismiss`                                                                                 | the toast, when an error is shown       | —                                    | —                | 24px               |
| button   | `Undo`                                                                                    | the toast, when something can be undone | —                                    | —                | `.mini`            |
| radio    | `Skeleton`                                                                                | chart, layers                           | the layer's blurb, in its title      | 1                | `Segmented`        |
| radio    | `Groove`                                                                                  | chart, layers                           | the layer's blurb, in its title      | 2                | `Segmented`        |
| radio    | `Sixteenths`                                                                              | chart, layers                           | the layer's blurb, in its title      | 3                | `Segmented`        |
| radio    | `Ghosted`                                                                                 | chart, layers                           | the layer's blurb, in its title      | 4                | `Segmented`        |
| radio    | `Full break`                                                                              | chart, layers                           | the layer's blurb, in its title      | 5                | `Segmented`        |
| radio    | `A`                                                                                       | chart, section                          | —                                    | A                | `Segmented`        |
| radio    | `B`                                                                                       | chart, section                          | —                                    | B                | `Segmented`        |
| radio    | `Both`                                                                                    | chart, section                          | —                                    | V                | `Segmented`        |
| button   | `Counting guide`                                                                          | chart                                   | —                                    | G                | `.mini`            |
| button   | `Sticking`                                                                                | chart                                   | —                                    | —                | `.mini`            |
| button   | `Preview next layer`                                                                      | chart                                   | its title names the next layer       | —                | `.mini`            |
| slider   | `Chart size`                                                                              | chart                                   | —                                    | —                | 24px               |
| slider   | `Grid size`                                                                               | chart, beside Chart size                | —                                    | —                | 24px               |
| button   | `<title> — on <shelf>`                                                                    | chart, the ★ when it is pinned          | —                                    | —                | `.mini`            |
| button   | `Pin <title>`                                                                             | chart and list rows, when not pinned    | —                                    | —                | `.mini`            |
| button   | `Save this pattern to pin it`                                                             | chart, when the pattern is scratch      | —                                    | —                | `.mini`            |
| button   | `Section <n> plays <section>`                                                             | chart, arrangement                      | its title says what a press does     | —                | 34×30px            |
| button   | `Add a section`                                                                           | chart, arrangement                      | —                                    | —                | `.mini`            |
| button   | `Remove last section`                                                                     | chart, arrangement                      | —                                    | —                | `.mini`            |
| button   | `Hide`                                                                                    | Step editor                             | —                                    | —                | `.mini`            |
| button   | `Show`                                                                                    | Step editor, when hidden                | —                                    | —                | `.mini`            |
| button   | `<lane>, bar <n> step <n>: <value>`                                                       | Step editor, every cell                 | ⓘ _Setting a cell_                   | Enter; Shift+F10 | 24px / 32px × zoom |
| menuitem | `Empty< (current)\|>`                                                                     | Step editor, the value picker           | —                                    | ↑ ↓, Esc         | 32px               |
| menuitem | `<Ghost\|Hit\|Accent\|Cross-stick\|Closed\|Open\|Ride\|Bell\|Crash\|Chick>< (current)\|>` | Step editor, the value picker           | —                                    | ↑ ↓, Esc         | 32px               |
| button   | `About The grid and layers`                                                               | Step editor                             | ⓘ                                    | —                | 24px               |
| button   | `About Setting a cell`                                                                    | Step editor                             | ⓘ                                    | —                | 24px               |

## Generate

| role     | name                 | where                               | help              | shortcut | target      |
| -------- | -------------------- | ----------------------------------- | ----------------- | -------- | ----------- |
| combobox | `Style`              | Generate                            | the style's blurb | —        | 36px select |
| combobox | `Time signature`     | Generate                            | —                 | —        | 36px select |
| radio    | `<1\|2\|3\|4>`       | Generate, bars                      | —                 | —        | `Segmented` |
| slider   | `Kick density`       | Generate                            | —                 | —        | 24px        |
| slider   | `Ghost notes`        | Generate                            | —                 | —        | 24px        |
| slider   | `Hi-hat dynamics`    | Generate                            | —                 | —        | 24px        |
| slider   | `Swing (16ths)`      | Generate                            | —                 | —        | 24px        |
| button   | `Lock <what>`        | Generate (Kick, Snare, Hats, Tempo) | —                 | —        | `.mini`     |
| button   | `New A only`         | Generate                            | —                 | —        | `.mini`     |
| button   | `New B only`         | Generate                            | —                 | —        | `.mini`     |
| button   | `Build B from A`     | Generate                            | —                 | —        | `.mini`     |
| radio    | `The style's`        | Generate, kit lanes                 | ⓘ _Kit lanes_     | —        | `Segmented` |
| radio    | `My own`             | Generate, kit lanes                 | ⓘ _Kit lanes_     | —        | `Segmented` |
| checkbox | `Toms`               | Generate, kit lanes (My own)        | —                 | —        | 24px        |
| combobox | `Perc <n>`           | Generate, kit lanes (My own)        | —                 | —        | 36px select |
| button   | `About Kit lanes`    | Generate                            | ⓘ                 | —        | 24px        |
| button   | `Change it in Sound` | Generate, under the style's kit     | —                 | —        | 24px link   |

## Edit

| role   | name                                                                                                                                                                                          | where                    | help              | shortcut | target  |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ----------------- | -------- | ------- |
| button | `↶ Undo`                                                                                                                                                                                      | Edit                     | —                 | ⌘Z       | `.mini` |
| button | `↷ Redo`                                                                                                                                                                                      | Edit                     | —                 | ⇧⌘Z      | `.mini` |
| button | `<Add ghost notes\|Strip ghosts\|Busier kick\|More space\|Open the hats\|Swap hats ↔ ride\|Push the backbeat\|Crash on 1\|Fill the last bar\|Mirror bar 1\|Reverse the beats\|Flatten to L2>` | Edit, the Doctor's moves | ⓘ _Musical edits_ | —        | `.mini` |
| button | `Clear section`                                                                                                                                                                               | Edit                     | —                 | —        | `.mini` |
| button | `About Musical edits`                                                                                                                                                                         | Edit                     | ⓘ                 | —        | 24px    |

The Doctor's moves are named by what they do. Today they are _Add ghost
notes_, _Strip ghosts_, _Busier kick_, _More space_, _Open the hats_, _Swap
hats ↔ ride_, _Push the backbeat_, _Crash on 1_, _Fill the last bar_, _Mirror
bar 1_, _Reverse the beats_ and _Flatten to L2_.

## Patterns

| role      | name                                | where                                        | help      | shortcut | target      |
| --------- | ----------------------------------- | -------------------------------------------- | --------- | -------- | ----------- |
| tab       | `Practising <count>`                | Patterns                                     | —         | —        | `.mini`     |
| tab       | `Later`                             | Patterns, when the shelf is empty            | —         | —        | `.mini`     |
| tab       | `Later <count>`                     | Patterns, when the shelf has something       | —         | —        | `.mini`     |
| tab       | `Recent`                            | Patterns                                     | —         | —        | `.mini`     |
| tab       | `All`                               | Patterns                                     | —         | —        | `.mini`     |
| tab       | `Libraries`                         | Patterns                                     | —         | —        | `.mini`     |
| tab       | `Community`                         | Patterns                                     | —         | —        | `.mini`     |
| button    | _a list row_                        | every tab: opens the pattern in place        | —         | —        | about 34px  |
| button    | `Add <title> to a practice session` | every row                                    | —         | —        | `.mini`     |
| button    | `Delete <title>`                    | rows of your own saved patterns              | its title | —        | `.mini`     |
| button    | `Make a session from this shelf`    | Practising, Later                            | —         | —        | `.mini`     |
| button    | `Clear history`                     | Recent                                       | —         | —        | `.mini`     |
| button    | `Show all <n>`                      | Recent, when it is longer than eight         | —         | —        | `.mini`     |
| button    | `Show fewer`                        | Recent, when all are shown                   | —         | —        | `.mini`     |
| searchbox | `Search your patterns`              | All                                          | —         | —        | 36px        |
| searchbox | `Search the libraries`              | Libraries                                    | —         | —        | 36px        |
| combobox  | `Style`                             | All, Libraries                               | —         | —        | 36px select |
| combobox  | `Time signature`                    | All, Libraries                               | —         | —        | 36px select |
| button    | `About The libraries`               | Libraries                                    | ⓘ         | —        | 24px        |
| button    | `Newest`                            | Community                                    | —         | —        | `.mini`     |
| button    | `Most saved`                        | Community                                    | —         | —        | `.mini`     |
| button    | `Try again`                         | All, Community, when the list would not read | —         | —        | `.mini`     |

## Sound

| role     | name                                                 | where                                    | help           | shortcut | target      |
| -------- | ---------------------------------------------------- | ---------------------------------------- | -------------- | -------- | ----------- |
| combobox | `Kit`                                                | Sound                                    | ⓘ _Kits_       | —        | 36px select |
| button   | `About Kits`                                         | Sound                                    | ⓘ              | —        | 24px        |
| radio    | `<The stool\|Out front>`                             | Sound, whose side the kit is panned from | ⓘ _Heard from_ | —        | `Segmented` |
| button   | `About Heard from`                                   | Sound                                    | ⓘ              | —        | 24px        |
| button   | `▸ Play the kit`                                     | Sound                                    | —              | —        | `.mini`     |
| radio    | `<Off\|Subtle\|Loose>`                               | Sound, Humanise                          | ⓘ _Humanise_   | —        | `Segmented` |
| button   | `About Humanise`                                     | Sound                                    | ⓘ              | —        | 24px        |
| slider   | `Amount`                                             | Sound, Humanise, hidden while Off        | ⓘ _Humanise_   | —        | 24px        |
| button   | `🎲 New take`                                        | Sound, Humanise                          | ⓘ _New take_   | —        | `.mini`     |
| button   | `About New take`                                     | Sound                                    | ⓘ              | —        | 24px        |
| radio    | `<Kick\|Snare\|Hi-hat\|Ride\|Crash\|Toms\|Perc>`     | Sound, which voice to tune               | ⓘ _Voice_      | —        | `Segmented` |
| slider   | `<Size\|Bright\|Drive\|Room\|Top end\|Closed\|Open>` | Sound, the voice's settings              | ⓘ _Voice_      | —        | 24px        |
| button   | `About Voice`                                        | Sound                                    | ⓘ              | —        | 24px        |
| button   | `▸ Hear it`                                          | Sound                                    | —              | —        | `.mini`     |
| button   | `Reset this voice`                                   | Sound                                    | —              | —        | `.mini`     |
| button   | `Reset whole kit`                                    | Sound                                    | —              | —        | `.mini`     |
| button   | `New kit of your own`                                | Sound, Your sounds                       | —              | —        | `.mini`     |

A voice's settings are named for what they shape. Today they are _Size_,
_Bright_, _Drive_, _Room_, _Top end_, _Closed_ and _Open_, depending on the
voice. A kit of your own adds the per-slot controls in `your-sounds.tsx`
(upload, rename, delete), which need an account's samples and are tested in
`your-sounds.test.tsx`.

## Practise

| role   | name                                                                                                                                                                                        | where                                 | help                     | shortcut | target      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------ | -------- | ----------- |
| button | `Back to 100%`                                                                                                                                                                              | Practise, quick tempo                 | —                        | —        | `.mini`     |
| button | `<pct>%`                                                                                                                                                                                    | Practise, quick tempo                 | —                        | —        | `.mini`     |
| button | `Match tempo`                                                                                                                                                                               | Practise                              | ⓘ _Match tempo to layer_ | —        | `.mini`     |
| button | `About Match tempo to layer`                                                                                                                                                                | Practise                              | ⓘ                        | —        | 24px        |
| radio  | `<off\|1 bar\|2 bars>`                                                                                                                                                                      | Practise, count-in (off, 1 or 2 bars) | —                        | —        | `Segmented` |
| button | `Click`                                                                                                                                                                                     | Practise, metronome                   | —                        | —        | `.mini`     |
| radio  | `Quarters`                                                                                                                                                                                  | Practise, metronome                   | —                        | —        | `Segmented` |
| radio  | `Eighths`                                                                                                                                                                                   | Practise, metronome                   | —                        | —        | `Segmented` |
| radio  | `<Off\|+1\|+2\|+5>`                                                                                                                                                                         | Practise, tempo trainer               | ⓘ _Tempo trainer_        | —        | `Segmented` |
| slider | `Ceiling`                                                                                                                                                                                   | Practise, tempo trainer               | ⓘ _Tempo trainer_        | —        | 24px        |
| button | `About Tempo trainer`                                                                                                                                                                       | Practise                              | ⓘ                        | —        | 24px        |
| button | `Mark my speed · <bpm> bpm`                                                                                                                                                                 | Practise, Your speeds                 | ⓘ _Your speeds_          | —        | `.mini`     |
| button | `About Your speeds`                                                                                                                                                                         | Practise                              | ⓘ                        | —        | 24px        |
| slider | `<Kick\|Snare\|Hi-hat\|Hi-hat foot\|Ride\|Crash\|High tom\|Mid tom\|Floor tom\|Perc 1\|Perc 2\|Tambourine\|Shaker\|Claves\|Cowbell\|Woodblock\|Congas\|Timbales\|Cascara\|Handclap\|Agogo>` | Practise, mixer fader                 | ⓘ _Mixer_                | —        | 24px        |
| button | `Mute <lane>`                                                                                                                                                                               | Practise, mixer                       | ⓘ _Mixer_                | —        | 52px wide   |
| button | `Solo <lane>`                                                                                                                                                                               | Practise, mixer                       | ⓘ _Mixer_                | —        | 52px wide   |
| button | `Back to the style`                                                                                                                                                                         | Practise, mixer, when a fader moved   | —                        | —        | `.mini`     |
| button | `About Mixer`                                                                                                                                                                               | Practise                              | ⓘ                        | —        | 24px        |

## Share

| role    | name                    | where                                              | help                | shortcut | target      |
| ------- | ----------------------- | -------------------------------------------------- | ------------------- | -------- | ----------- |
| textbox | `Name`                  | Share, Details                                     | ⓘ _Name_            | —        | 36px        |
| textbox | `Description`           | Share, Details                                     | ⓘ _Description_     | —        | 36px        |
| textbox | `Link <n>`              | Share, Details, one per link, when there are links | ⓘ _Reference links_ | —        | 36px        |
| button  | `Remove link <n>`       | Share, Details, one per link, when there are links | —                   | —        | `.mini`     |
| button  | `Add a link`            | Share, Details                                     | ⓘ _Reference links_ | —        | `.mini`     |
| button  | `Save details`          | Share, Details                                     | —                   | —        | `.mini`     |
| button  | `Save a copy`           | Share, Details                                     | ⓘ _Save a copy_     | —        | `.mini`     |
| button  | `Delete pattern`        | Share, Details, on a saved pattern of yours        | ⓘ _Delete pattern_  | —        | `.mini`     |
| button  | `About Name`            | Share                                              | ⓘ                   | —        | 24px        |
| button  | `About Description`     | Share                                              | ⓘ                   | —        | 24px        |
| button  | `About Reference links` | Share                                              | ⓘ                   | —        | 24px        |
| button  | `About Save a copy`     | Share                                              | ⓘ                   | —        | 24px        |
| button  | `About Delete pattern`  | Share                                              | ⓘ                   | —        | 24px        |
| button  | `Share with a link`     | Share, sharing                                     | —                   | —        | `.mini`     |
| button  | `Publish…`              | Share, sharing                                     | the publish dialog  | —        | `.mini`     |
| button  | `Copy Studio link`      | Share                                              | —                   | —        | `.mini`     |
| button  | `Copy break code`       | Share                                              | ⓘ _Break code_      | —        | `.mini`     |
| textbox | `Load a break code`     | Share                                              | ⓘ _Break code_      | —        | 36px        |
| button  | `Load it`               | Share                                              | —                   | —        | `.mini`     |
| button  | `About Break code`      | Share                                              | ⓘ                   | —        | 24px        |
| button  | `Download .mid`         | Share                                              | ⓘ _MIDI_            | —        | `.mini`     |
| radio   | `<Played\|Quantised>`   | Share, how Download .mid writes the timing         | ⓘ _MIDI_            | —        | `Segmented` |
| button  | `About MIDI`            | Share                                              | ⓘ                   | —        | 24px        |
| button  | `MIDI out`              | Share                                              | ⓘ _MIDI out_        | —        | `.mini`     |
| button  | `About MIDI out`        | Share, when the browser has no Web MIDI            | ⓘ                   | —        | 24px        |
| button  | `Print chart`           | Share                                              | ⓘ _Print_           | ⌘P       | `.mini`     |
| button  | `About Print`           | Share                                              | ⓘ                   | —        | 24px        |

## BeatBuddy

| role    | name                                                                                                                               | where                            | help          | shortcut | target  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------- | -------- | ------- |
| textbox | `Message BeatBuddy`                                                                                                                | BeatBuddy                        | —             | Enter    | 36px    |
| button  | `Send`                                                                                                                             | BeatBuddy                        | —             | Enter    | `.mini` |
| button  | `Attach a photo, PDF or MIDI file`                                                                                                 | BeatBuddy                        | ⓘ _Attaching_ | —        | `.mini` |
| button  | `About Attaching`                                                                                                                  | BeatBuddy                        | ⓘ             | —        | 24px    |
| button  | `<Write me a new funk groove\|Make this a bossa nova\|Tidy this up\|Take the ghost notes out of bar 2\|Why is this hard to play?>` | BeatBuddy, before the first turn | —             | —        | `.mini` |

The suggestions are starter prompts, such as _Write me a new funk groove_,
_Make this a bossa nova_, _Tidy this up_, _Take the ghost notes out of bar 2_
and _Why is this hard to play?_.

## The first-run tour

Shown once per browser, the first time the Studio has a break on it
(`studio-tour.tsx`, task 8.6). Three steps: Play, the layers, the tools.
Escape is Skip. `/help` has _Show the tour again_.

| role   | name           | where                            | help                       | shortcut | target     |
| ------ | -------------- | -------------------------------- | -------------------------- | -------- | ---------- |
| button | `Next`         | tour card, when the tour is up   | the step's own line        | —        | about 30px |
| button | `Done`         | tour card, when on its last step | —                          | —        | about 30px |
| button | `Skip`         | tour card, when the tour is up   | —                          | Escape   | about 30px |
| link   | `More in Help` | tour card, when on its last step | opens `/help` in a new tab | —        | about 30px |

## The owner's browser checklist

These are not tested here. Claude can look at widths and light/dark with Claude
in Chrome. VoiceOver, iOS Safari and the iPhone's silent switch stay with the
owner. None of them blocks a PR. The items carried in from Phases 1 and 4:

- [ ] The frame at 360, 768, 1024 and 1440px, in light and dark: nothing
      overlaps, the chart does not move when a drawer opens.
- [ ] VoiceOver through one drawer: each control is announced by its name
      above, and a toggle's state as pressed or not.
- [ ] 4.5's save status, Save / Save a copy / Retry, and the unsaved-changes
      prompt, on a phone and a laptop.

And the ones 5-iii and 5-iv add:

- [ ] Grid cells on a phone are at least 32px, and the Grid zoom makes them
      bigger without the count row drifting from its cells.
- [ ] A long press on a cell opens the picker on iOS without a text callout,
      and a drag along a lane paints without scrolling the page sideways.
- [ ] Delete, then Undo, on a phone: the row comes back and nothing was sent.
- [ ] Solo a lane while playing: only it sounds; Mute on it silences it.
- [ ] Roll, N, N, then Back twice: the first roll, with its tempo and layer.

And the ones 8-ii adds:

- [ ] The tour on a first visit (clear `bb.tourSeen`), at 390 and 1440px:
      each card sits beside its control without covering it, and the ring
      is round the control.
- [ ] Focus is on Next when the tour opens, stays in the card on Tab, and
      goes back to where it was when the tour closes. (A unit test can't
      show this: happy-dom loses track of focus while the Studio first
      draws.)
- [ ] VoiceOver reads the tour card's step title and line.

The five tasks in `planning/app-plan.md` §5 (Method) are the walk to do once
these are ticked.
