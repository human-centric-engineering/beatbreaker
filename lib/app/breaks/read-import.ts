import { isGrooveScribeUrl, readGrooveScribeUrl } from '@/lib/app/breaks/groove-scribe';
import { type ImportResult, importedDoc } from '@/lib/app/breaks/import';
import { readMidi } from '@/lib/app/breaks/midi-read';
import { type BreakDoc, type StyleLookup, decodeBreak } from '@/lib/app/breaks/share';

/**
 * Read a pattern in from wherever it came from — the one entry point behind
 * `POST /api/v1/breaks/import` and, in Phase 7, BeatBuddy's composer.
 *
 * Three sources, all deterministic, no model involved:
 *
 * - **A MIDI file**, as bytes.
 * - **A BeatBreaker code, or a link carrying one** in its `#b=` fragment.
 * - **A Groove Scribe link**, read from its query string.
 *
 * **No URL is ever fetched.** A link is read for what it carries in its own
 * text. Any other web address is refused with a sentence saying what can be
 * read instead: fetching user-supplied URLs server-side is an SSRF surface,
 * and most pages would not parse anyway (§6, _Reading patterns in_).
 */

/** What an import is called when the source carried no title and no file name. */
export const DEFAULT_IMPORT_NAME = 'Imported pattern';
/** The style an import is filed under. Imports carry no style snapshot, so this is a label and a doctor's starting point. */
export const IMPORT_STYLE = 'rock';

export type ImportSource = 'midi' | 'beatbreaker' | 'groove-scribe';

export type ImportInput =
  { kind: 'midi'; bytes: Uint8Array; fileName?: string } | { kind: 'text'; text: string };

export type ReadImportResult =
  { ok: true; source: ImportSource; doc: BreakDoc; notes: string[] } | { ok: false; error: string };

const WHAT_WE_READ =
  'BeatBreaker reads its own codes and links, Groove Scribe links and MIDI files';

/** A file name as a title: no extension, no path, underscores as spaces. */
function titleFromFile(fileName: string | undefined): string {
  if (!fileName) return '';
  return fileName
    .replace(/^.*[\\/]/, '')
    .replace(/\.(mid|midi|smf)$/i, '')
    .replace(/[_]+/g, ' ')
    .trim()
    .slice(0, 120);
}

function fromImported(
  result: ImportResult,
  source: ImportSource,
  fallbackName: string
): ReadImportResult {
  if (!result.ok) return result;
  const name = result.pattern.name || fallbackName || DEFAULT_IMPORT_NAME;
  const doc = importedDoc({ ...result.pattern, name }, IMPORT_STYLE);
  return { ok: true, source, doc, notes: result.pattern.notes };
}

export function readImport(input: ImportInput, styles?: StyleLookup): ReadImportResult {
  if (input.kind === 'midi') {
    return fromImported(readMidi(input.bytes), 'midi', titleFromFile(input.fileName));
  }

  const text = input.text.trim();
  if (isGrooveScribeUrl(text)) return fromImported(readGrooveScribeUrl(text), 'groove-scribe', '');

  const at = text.indexOf('#b=');
  const code = at >= 0 ? text.slice(at + 3) : text;
  try {
    return {
      ok: true,
      source: 'beatbreaker',
      doc: decodeBreak(decodeURIComponent(code), styles),
      notes: [],
    };
  } catch {
    // not a code; say what is readable rather than why this was not
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
    return { ok: false, error: `${WHAT_WE_READ}. It does not open other web pages.` };
  }
  return {
    ok: false,
    error: `That is not a BeatBreaker code or a Groove Scribe link. ${WHAT_WE_READ}.`,
  };
}
