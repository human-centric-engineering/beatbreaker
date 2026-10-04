/**
 * Every library a shipped sample comes from, pinned.
 *
 * A git source is pinned to a commit. The build fetches only the files a
 * recipe names, from that commit, and checks each against its blob hash in
 * the commit's tree, so a file that changed upstream cannot slip in under the
 * same path. The sha256 of every file used is written to `build.lock.json`.
 *
 * The licence of each was checked against the source's own licence file on
 * the date given; the build copies that file to `public/kits/LICENSES/`. The
 * rules (CC0, public domain, CC BY 4.0, MIT; never share-alike, GPL or a
 * licence that forbids redistributing the samples) are in
 * `.context/app/planning/sound-plan.md` §5.
 */

export type LicenceId = 'CC0-1.0' | 'CC-BY-4.0';

export const LICENCES: Record<LicenceId, { name: string; url: string }> = {
  'CC0-1.0': {
    name: 'CC0 1.0',
    url: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  'CC-BY-4.0': {
    name: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/',
  },
};

export interface GitSource {
  kind: 'git';
  /** `owner/name` on GitHub. */
  repo: string;
  /** The commit every file is fetched from. */
  commit: string;
  /** What it is called, and who made it, for the credits. */
  title: string;
  author: string;
  /** Where a person goes to find it. */
  url: string;
  licence: LicenceId;
  /** The file in the repository that grants the licence. */
  licenceFile: string;
  /** When `licenceFile` was read and found to say `licence`. */
  checked: string;
  /** What the credits say it is used for. */
  usedFor: string;
  /** A line the source asks for, printed once under the credits. */
  notice?: string;
}

export type Source = GitSource;

export const SOURCES = {
  virtuosity: {
    kind: 'git',
    repo: 'sfzinstruments/virtuosity_drums',
    commit: '9f04cf9a734527edfbb0a4eee1f674e45bbf71bc',
    title: 'Virtuosity Drums',
    author: 'Versilian Studios & Karoryfer Samples',
    url: 'https://github.com/sfzinstruments/virtuosity_drums',
    licence: 'CC0-1.0',
    licenceFile: 'LICENSE',
    checked: '2026-10-03',
    usedFor: 'Jazz kit, recorded percussion',
  },
  vcsl: {
    kind: 'git',
    repo: 'sgossner/VCSL',
    commit: 'c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e',
    title: 'Versilian Community Sample Library',
    author: 'Versilian Studios',
    url: 'https://github.com/sgossner/VCSL',
    licence: 'CC0-1.0',
    licenceFile: 'LICENSE',
    checked: '2026-10-03',
    usedFor: 'Woodblock, handclaps, tambourine',
  },
  swirly: {
    kind: 'git',
    repo: 'sfzinstruments/karoryfer.swirly-drums',
    commit: 'c40dafe0011cb2e54c0c220ff0fa308a11fc60f5',
    title: 'Swirly Drums',
    author: 'Karoryfer Samples',
    url: 'https://github.com/sfzinstruments/karoryfer.swirly-drums',
    licence: 'CC0-1.0',
    licenceFile: 'license',
    checked: '2026-10-03',
    usedFor: 'Brush kit',
  },
  muldjord: {
    kind: 'git',
    repo: 'freepats/muldjordkit',
    commit: '719fe72bc6693b94f1229674e202881145ab44ed',
    title: 'MuldjordKit',
    author: 'Lars Muldjord, FreePats stereo version',
    url: 'https://github.com/freepats/muldjordkit',
    licence: 'CC-BY-4.0',
    licenceFile: 'LICENSE.txt',
    checked: '2026-10-03',
    usedFor: 'Muldjord kit',
    notice: 'Drum samples provided by DrumGizmo.org.',
  },
  boochi44: {
    kind: 'git',
    repo: 'Boochi44/free-drum-samples',
    commit: '77ba31428a079dd8f17c8e144c1e649ea0a198b3',
    title: 'Soulful Vintage, Hard Trap',
    author: "Boochi44, from Michael Fischer's TR-808 set",
    url: 'https://github.com/Boochi44/free-drum-samples',
    licence: 'CC0-1.0',
    // the grant is a section of the README; the repository has no licence file
    licenceFile: 'README.md',
    checked: '2026-10-03',
    usedFor: 'Dusty sampler, Trap kit',
  },
} as const satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;
