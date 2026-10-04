/**
 * Every library a shipped sample comes from, pinned.
 *
 * A git source is pinned to a commit. The build fetches only the files a
 * recipe names, from that commit, and checks each against its blob hash in
 * the commit's tree, so a file that changed upstream cannot slip in under the
 * same path. An archive source is pinned by the archive's sha256: it is
 * downloaded once, checked, and read member by member (`zip.ts`) or unpacked
 * whole (`tar.ts`). The sha256 of every file used is written to the build
 * lock.
 *
 * The licence of each was checked against the source's own licence file on
 * the date given; the build copies that file to `public/kits/LICENSES/`. The
 * rules (CC0, public domain, CC BY 4.0, MIT; never share-alike, GPL or a
 * licence that forbids redistributing the samples) are in
 * `.context/app/planning/sound-plan.md` §5.
 */

export type LicenceId = 'CC0-1.0' | 'CC-BY-4.0' | 'public-domain' | 'permission';

export const LICENCES: Record<LicenceId, { name: string; url: string }> = {
  'CC0-1.0': {
    name: 'CC0 1.0',
    url: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  'CC-BY-4.0': {
    name: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/',
  },
  // dedicated by its author in their own words rather than a licence
  'public-domain': {
    name: 'Public domain',
    url: 'https://creativecommons.org/publicdomain/mark/1.0/',
  },
  // free use for anything, granted in the authors' own words; not a standard
  // licence (D37), so its link is the grant itself
  permission: {
    name: 'Free use, by grant',
    url: 'https://www.kvraudio.com/forum/viewtopic.php?t=433571',
  },
};

/**
 * The author's grant, where it is published apart from the source: quoted,
 * with where it was read. The licence copy prints it above the source's
 * licence file, which is older than the grant, or alone where the source has
 * no licence file at all.
 */
export interface Grant {
  quote: string;
  at: string;
}

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
  /** The file in the repository that grants the licence. Absent only beside a `grant`. */
  licenceFile?: string;
  /** Where the licence is the author's words rather than a file (D37). */
  grant?: Grant;
  /** When `licenceFile` was read and found to say `licence`. */
  checked: string;
  /** What the credits say it is used for. */
  usedFor: string;
  /** A line the source asks for, printed once under the credits. */
  notice?: string;
}

/**
 * One archive on its publisher's server, for a library that is not in git.
 * The members a recipe names are read from the local copy, so the archive is
 * fetched once however many recipes use it.
 */
export interface ZipSource {
  kind: 'zip';
  /** Where the archive is downloaded from. */
  archive: string;
  /** Its length, checked before it is hashed. */
  bytes: number;
  /** Its sha256: the pin. */
  sha256: string;
  title: string;
  author: string;
  url: string;
  licence: LicenceId;
  /** The member that grants the licence. */
  licenceFile: string;
  checked: string;
  usedFor: string;
  notice?: string;
}

/**
 * One compressed tarball on its publisher's server. It cannot be read member
 * by member, so it is unpacked whole once it passes its pin (`tar.ts`).
 */
export interface TarSource extends Omit<ZipSource, 'kind'> {
  kind: 'tar';
  grant?: Grant;
}

export type Source = GitSource | ZipSource | TarSource;

/** Where a source is pinned, as the licence copies and the build's errors say it. */
export function pinOf(source: Source): string {
  return source.kind === 'git'
    ? `${source.repo}@${source.commit}`
    : `${source.archive} (sha256 ${source.sha256})`;
}

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
  bigrusty: {
    kind: 'git',
    repo: 'sfzinstruments/karoryfer.big-rusty-drums',
    commit: 'f07ce00df34a46b6b08375be56fe116cf15782bc',
    title: 'Big Rusty Drums',
    author: 'Karoryfer Samples',
    url: 'https://github.com/sfzinstruments/karoryfer.big-rusty-drums',
    licence: 'CC0-1.0',
    licenceFile: 'LICENSE',
    checked: '2026-10-04',
    usedFor: 'Big Rusty kit; the Gogodze kit’s cymbals',
  },
  unruly: {
    kind: 'git',
    repo: 'sfzinstruments/karoryfer.unruly-drums',
    commit: '9bf75c2a1392f190cd1c264645653629f0b3a097',
    title: 'Unruly Drums',
    author: 'Karoryfer Samples',
    url: 'https://github.com/sfzinstruments/karoryfer.unruly-drums',
    licence: 'CC0-1.0',
    licenceFile: 'LICENSE',
    checked: '2026-10-04',
    usedFor: 'Unruly kit',
  },
  gogodze: {
    kind: 'git',
    repo: 'sfzinstruments/karoryfer.gogodze-phu-vol-ii',
    commit: '69a0274cdc39c99c3098cde1bc3789690de86d62',
    title: 'Gogodze Phu Vol II',
    author: 'Karoryfer Lecolds',
    url: 'https://github.com/sfzinstruments/karoryfer.gogodze-phu-vol-ii',
    licence: 'CC0-1.0',
    licenceFile: 'LICENSE',
    checked: '2026-10-04',
    usedFor: 'Gogodze kit',
  },
  drskit: {
    kind: 'zip',
    // v2.1; the git mirror of DRSKit is v1.0, which DrumGizmo replaced
    archive: 'https://drumgizmo.org/kits/DRSKit/DRSKit2_1.zip',
    bytes: 2_803_397_710,
    // checked against the md5 DrumGizmo publishes, 8c4d4b61ad9d354b3b845edd5da9c133, on 2026-10-04
    sha256: '529f2dcad836593167d0cab218f125f591cd71199748fa681e05e3866667f090',
    title: 'DRSKit',
    author: 'Lars and Deva Muldjord, DrumGizmo, on a kit lent by DRSDrums',
    url: 'https://drumgizmo.org/wiki/doku.php?id=kits:drskit',
    licence: 'CC-BY-4.0',
    // the archive has no licence file; the grant is a line of its README
    licenceFile: 'DRSKit/README.md',
    checked: '2026-10-04',
    usedFor: 'DRS kit, DRS brushes',
    notice: 'Drum samples provided by DrumGizmo.org.',
  },
  salamander: {
    kind: 'tar',
    archive: 'https://archive.org/download/SalamanderDrumkit/salamanderDrumkit.tar.bz2',
    bytes: 387_611_727,
    // checked against the md5 archive.org publishes, af8e2067668a7f438e7d981877fb771f, on 2026-10-04
    sha256: '34e746ec1721bb530b1caf5b17443ae3cde45a2cce1a80e2637e4c11d6f1e3f5',
    title: 'Salamander Drumkit',
    author: 'Alexander Holm',
    url: 'https://rytmenpinne.wordpress.com/sounds-and-such/salamander-drumkit/',
    licence: 'public-domain',
    // the archive's README says CC BY-SA 3.0, from 2012; the author made it
    // public domain in 2022, on their own page
    licenceFile: 'REAMDE',
    grant: {
      quote: "As of 4.3.2022, this is now public domain! Have fun with it, it's yours and noones!",
      at: 'https://rytmenpinne.wordpress.com/sounds-and-such/salamander-drumkit/',
    },
    checked: '2026-10-04',
    usedFor: 'Splash, china and second crash for the kits without them',
  },
  frankensnare: {
    kind: 'git',
    repo: 'sfzinstruments/karoryfer.frankensnare',
    commit: '9151c2d79fcbb73c65d63f78918d4ba7abc91a81',
    title: 'Frankensnare',
    author: 'Karoryfer Samples',
    url: 'https://github.com/sfzinstruments/karoryfer.frankensnare',
    licence: 'CC0-1.0',
    licenceFile: 'license',
    checked: '2026-10-04',
    usedFor: 'Snares for building your own kit; the tambourine',
  },
  smdrums: {
    kind: 'git',
    // the Sforzando set, mirrored in git; the authors publish it on Google Drive
    repo: 'sfzinstruments/SMDrums',
    commit: '32cfbff5df7f33226dfd64d021a58beed8c71ba6',
    title: 'SM Drums',
    author: 'Scott McLean, Tod Stillwell and Suleiman Ali',
    url: 'https://smmdrums.wordpress.com/',
    licence: 'permission',
    // neither the site nor the mirror has a licence file; the grant is the team's post
    grant: {
      quote:
        'ALL of the content on this website is for FREE royalty free use by anyone for anything',
      at: 'https://www.kvraudio.com/forum/viewtopic.php?t=433571',
    },
    checked: '2026-10-04',
    usedFor: 'SM Drums kit',
  },
  osdk: {
    kind: 'git',
    repo: 'crabacus/the-open-source-drumkit',
    commit: 'c58808b2ff5a6cd77c2f47cf45f1a892ce6a1e2c',
    title: 'The Open Source Drumkit',
    author: 'Real Music Media',
    url: 'https://github.com/crabacus/the-open-source-drumkit',
    licence: 'public-domain',
    // the repository has no licence file; the grant is the maker's post
    grant: {
      quote:
        'The samples and the mappings are completely in the public domain. REPEAT: The samples and the mappings are completely in the public domain.',
      at: 'https://www.kvraudio.com/forum/viewtopic.php?t=277132',
    },
    checked: '2026-10-04',
    usedFor: 'Open Source kit',
  },
  worldperc: {
    kind: 'git',
    // the release is a 7z of the same files; the blob hashes match
    repo: 'freepats/world-percussion',
    commit: 'e54eb2912a0d6d4444ab205d52f778e27da0fc96',
    title: 'World Percussion',
    author: 'FreePats (Xavimart, Gonzalo and Roberto)',
    url: 'https://freepats.zenvoid.org/Percussion/world-and-rare-percussion.html',
    licence: 'CC0-1.0',
    licenceFile: 'LICENSE.txt',
    checked: '2026-10-04',
    usedFor: 'Shaker, cascara',
  },
  bodyperc: {
    kind: 'git',
    repo: 'sfzinstruments/body_percussion',
    commit: '4ac9d8966679c648b62fa10a188179e186b97f24',
    title: 'Body Percussion',
    author: 'Karoryfer Samples (D. Smolken)',
    url: 'https://github.com/sfzinstruments/body_percussion',
    licence: 'CC0-1.0',
    licenceFile: 'LICENSE',
    checked: '2026-10-04',
    usedFor: 'Handclap',
  },
} as const satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;
