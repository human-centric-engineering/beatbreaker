'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { FieldHelp } from '@/components/ui/field-help';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { styleParamsSchema } from '@/lib/app/breaks/catalogue/schemas';

/**
 * Editing one style.
 *
 * Two forms, and the split is the point rather than a layout choice:
 *
 * - **Where it sits** (group, position) is a `PATCH`. It changes the picker and
 *   nothing a pattern was generated from.
 * - **What it says** (the parameters) is a `POST` that writes a **new version**.
 *   Versions are immutable, so there is no "save" for the current one — every
 *   break anyone has made points at the version it came from, and rewriting it
 *   would change breaks nobody touched. The button says so.
 *
 * The parameters are a validated JSON editor rather than a generated form, and
 * that is a deliberate stop rather than a stub. A style has thirty-odd fields,
 * half of them weighted tables and step lists; a form that rendered them all
 * would be a week of work to make worse than a text box for the three people
 * who will ever use it. What the text box must not be is *unvalidated*, so it
 * parses through the same `styleParamsSchema` the endpoint does, before the
 * request goes out — the reader gets the field name and the reason rather than
 * a 400.
 */

interface Props {
  styleKey: string;
  group: string;
  position: number;
  currentVersion: number;
  /** The current version's parameters, pretty-printed. */
  params: unknown;
}

export function StyleEditor({ styleKey, group, position, currentVersion, params }: Props) {
  const router = useRouter();

  const [shelf, setShelf] = useState({ group, position: String(position) });
  const [json, setJson] = useState(() => JSON.stringify(params, null, 2));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState('');

  async function saveShelf(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setProblem('');
    setMessage('');
    try {
      const res = await fetch(`/api/v1/admin/catalogue/styles/${styleKey}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: shelf.group, position: Number(shelf.position) }),
      });
      if (!res.ok) throw new Error(`The server refused that (${res.status})`);
      setMessage('Moved.');
      router.refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'That did not save');
    } finally {
      setBusy(false);
    }
  }

  async function addVersion(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setProblem('');
    setMessage('');

    /* Parsed and validated here, before the request. The endpoint checks the
       same schema — this is not instead of that — but a reader editing a weight
       table wants to be told which field and why, not handed a 400. */
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setProblem('That is not valid JSON.');
      setBusy(false);
      return;
    }
    const checked = styleParamsSchema.safeParse(parsed);
    if (!checked.success) {
      const first = checked.error.issues[0];
      setProblem(`${first.path.map(String).join('.') || 'style'}: ${first.message}`);
      setBusy(false);
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/catalogue/styles/${styleKey}/versions`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params: checked.data, note }),
      });
      if (!res.ok) throw new Error(`The server refused that (${res.status})`);
      setMessage(`Saved as version ${currentVersion + 1}.`);
      setNote('');
      router.refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'That did not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={(e) => void saveShelf(e)} className="space-y-4">
        <h2 className="text-lg font-semibold">Where it sits in the picker</h2>

        <div className="space-y-2">
          <Label htmlFor="style-group">
            Heading{' '}
            <FieldHelp title="Heading">
              The group this style appears under in the Studio&rsquo;s style picker — &ldquo;Funk
              and breaks&rdquo;, &ldquo;Jazz&rdquo;. Presentation only: it changes nothing about how
              the style generates. A heading nothing else uses creates a new group.
            </FieldHelp>
          </Label>
          <Input
            id="style-group"
            value={shelf.group}
            onChange={(e) => setShelf((s) => ({ ...s, group: e.target.value }))}
            required
            maxLength={60}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="style-position">
            Position{' '}
            <FieldHelp title="Position">
              Where in its heading the style appears — lowest first. Presentation only. Two styles
              sharing a position sort against each other arbitrarily, so give each one its own
              number if the order matters.
            </FieldHelp>
          </Label>
          <Input
            id="style-position"
            type="number"
            min={0}
            max={999}
            value={shelf.position}
            onChange={(e) => setShelf((s) => ({ ...s, position: e.target.value }))}
            required
          />
        </div>

        <Button type="submit" disabled={busy}>
          Move
        </Button>
      </form>

      <form onSubmit={(e) => void addVersion(e)} className="space-y-4">
        <h2 className="text-lg font-semibold">What it plays</h2>
        <p className="text-muted-foreground text-sm">
          Currently on version {currentVersion}. Saving writes version {currentVersion + 1} and
          leaves {currentVersion} alone — every break generated from it keeps sounding the way it
          sounded.
        </p>

        <div className="space-y-2">
          <Label htmlFor="style-params">
            Parameters{' '}
            <FieldHelp title="Style parameters" contentClassName="max-w-md">
              The whole style, as JSON — kick cells and their weights, where ghosts want to land,
              the feel table, the tempo range. Checked against the same schema the API uses before
              it is sent, so a bad weight is named here rather than refused there. Defaults are
              whatever the current version says; the safest edit is one field at a time.
            </FieldHelp>
          </Label>
          <Textarea
            id="style-params"
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={24}
            spellCheck={false}
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="style-note">
            What changed{' '}
            <FieldHelp title="What changed">
              One line, shown beside the version in the list. Nobody reading the version history in
              six months can diff two JSON blobs in their head — this is the sentence that saves
              them. Optional, and worth writing anyway.
            </FieldHelp>
          </Label>
          <Input
            id="style-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Softened the ghost bias"
          />
        </div>

        <Button type="submit" disabled={busy}>
          Save as version {currentVersion + 1}
        </Button>
      </form>

      {problem ? (
        <p role="alert" className="text-destructive text-sm">
          {problem}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}
