# Analytics and the policies (Phase 8, 8-iii)

What the app counts, where each count fires, and how the privacy policy and
terms stay true to the code.

## The events — `lib/app/breaks/events.ts`

Sent through Sunrise's `AnalyticsContext`, so they go to whichever provider is
configured, and only with **optional consent**. Call `useAppEvents()`; never
`useAnalytics()` from app code. Its `track` is a no-op outside an
`AnalyticsProvider` (component tests mount none), and it **holds** an event
sent with consent before the client is ready, sending it once the client is
ready. The provider's `track` drops anything sent before that, which would
lose every event fired as a page mounts. An event sent without consent is
dropped, never held.

| Event               | Fires                                                                                                                                                  | Properties                                                 | Where                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------- |
| `pattern_created`   | A new row of yours: first Save of scratch, Save As, or the plain-create fallback when a copy's original has gone                                       | —                                                          | `use-pattern-document.ts` `create`                        |
| `pattern_saved`     | Edits to a saved pattern of yours reached the server, **once per opening** (each attach, or the page's first load). Not after a create in that opening | —                                                          | `use-pattern-document.ts` `patch`                         |
| `pattern_opened`    | A saved pattern **of yours** put on the stage: by its address, or from Back / Recent / a pin                                                           | `days_since_created` (whole days)                          | `studio-provider.tsx`: mount effect, and `openTarget`     |
| `pattern_published` | The publish POST succeeded                                                                                                                             | —                                                          | `use-pattern-document.ts` `publish`                       |
| `pattern_copied`    | A copy or variation was made through the copy route                                                                                                    | `kind`: `copy`/`variation`, `from`: `studio`/`shared_page` | `use-pattern-document.ts` `create`; `pattern-actions.tsx` |
| `buddy_turn`        | The stream route accepted a turn (stopped ones too)                                                                                                    | `changed`: the chart moved                                 | `use-buddy-chat.ts` `send`                                |
| `buddy_undo`        | Undo on one of **BeatBuddy's** changes (not an imported file's)                                                                                        | —                                                          | `use-buddy-chat.ts` `undoChange`                          |

Read them as:

- **Reopened next day:** `pattern_opened` where `days_since_created >= 1`. It
  is derived in the tool, never stored. `createdAt` reaches the client on
  `InitialPattern` (the `[id]` page) and in `GET /api/v1/breaks/:id`.
- **BeatBuddy undo rate:** `buddy_undo` ÷ `buddy_turn{changed: true}`. One Undo
  takes back a whole turn, so the two count the same thing.

**No content leaves.** `AppEventProps` fixes each event's properties as
numbers, booleans and closed sets of words. Nothing takes a free string, so a
title, notes, slug or id can't be passed. To add a property, add it to the
type. `tests/helpers/analytics.tsx` has `recordEvents()`, a recording context,
and `expectNoContent()`, the property scan each event test runs.

### Anti-patterns

- **An event per autosave.** An autosave fires every two seconds of editing,
  which is noise and costs money with a metered provider. Count the moment
  that means something.
- **Firing `pattern_opened` before the open happened.** In `openTarget` it is
  inside the `replace` thunk, which runs only if the unsaved-changes prompt
  lets it.
- **Expecting the provider to be anonymous.** Sunrise's `UserIdentifier`
  calls `identify(user.id)` on sign-in, and page views carry the address
  (`/studio/<id>`, `/p/<slug>`). Plausible ignores `identify`, but GA4 and
  PostHog keep the id. The privacy policy is written for Plausible, and an
  `[OWNER: …]` field there says so. Choosing another provider means
  rewording that paragraph.

## The policies — `components/app/legal/`

`/privacy` and `/terms` are Sunrise's page files reduced to a shell: the
metadata, the `h1` and one component. The text is in `privacy-policy.tsx` and
`terms.tsx`, so an upstream change to the template merges with a small
conflict rather than a rewrite.

- **What is kept is rendered, not written.** _Everything in your download_
  lists `getAppSubjectSources()` and Sunrise's `exportedSources()` with their
  own descriptions, and `attributionSources()` by name. A table added to the
  export shows up in the policy, and the page test fails if a source is
  filtered out. To change what the policy says about a table, change its
  `description` in `lib/app/data-export.ts`.
- **`<OwnerField>`** renders `[OWNER: …]` for facts only the owner has: the
  entity, region, minimum age, contact, analytics provider, backup retention,
  transfer mechanism, liability and governing law. They are visible on
  purpose. `grep -rn OwnerField components/app/legal` is what D7's review
  still has to fill in.
- **OpenAI's terms** were read from its "Your data" page on 2026-10-03: API
  data isn't used for training unless the customer opts in, and
  abuse-monitoring logs are kept for up to 30 days. Read it again when the
  model provider changes.
- **Settings → Your data** (`components/app/account/your-data-section.tsx`,
  through the `account-sections` seam) is the download the policy promises. It
  links to Sunrise's `GET /api/v1/users/me/export`, which sends an attachment.
  Before 8.9 the endpoint existed and nothing on screen reached it.
