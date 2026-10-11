/**
 * Reading a stored drummer record for its page (Phase 11-b): every real record
 * reads, a masked performer's identity never shows, and one bad field costs
 * only that field.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

import { readDrummerRecord } from '@/lib/app/lineage/record';
import { DRUMMER_MODEL_DIR, readFolder } from '@/scripts/lineage/read-corpus';

function realRecord(slug: string): unknown {
  return JSON.parse(readFileSync(join(DRUMMER_MODEL_DIR, 'drummers', `${slug}.json`), 'utf8'));
}

describe('readDrummerRecord', () => {
  it('reads every record in the model, with its name and its traits', () => {
    const files = readFolder(DRUMMER_MODEL_DIR, 'drummers');
    expect(files.length).toBeGreaterThanOrEqual(20);
    for (const { file, json } of files) {
      const r = readDrummerRecord(json);
      expect(r, file).not.toBeNull();
      expect(r!.name.length, file).toBeGreaterThan(0);
      expect(r!.traits.length, file).toBeGreaterThan(0);
    }
  });

  it('reads Bonham as the page shows him', () => {
    const r = readDrummerRecord(realRecord('john-bonham'))!;
    expect(r.name).toBe('John Bonham');
    expect(r.fullName).toBe('John Henry Bonham');
    expect(r.born).toBe('1948-05-31');
    expect(r.died).toBe('1980-09-25');
    expect([r.activeFrom, r.activeTo, r.ongoing]).toEqual([1962, 1980, false]);
    expect(r.roles).toContain('band member');
    expect(r.traits[0]).toMatchObject({
      label: 'The Bonham triplet',
      category: 'fill',
      confidence: 'widely_reported',
    });
    expect(r.techniques.map((t) => t.name)).toContain('Bonham triplets');
    expect(r.eras[0]).toMatchObject({ label: 'Midlands bands', from: 1962, to: 1968 });
    expect(new Set(r.descriptors).size).toBe(r.descriptors.length);
  });

  it('shows a masked performer’s persona and never a real name or date, even if one was stored', () => {
    const stored = realRecord('klek-de-poitrine');
    const r = readDrummerRecord(stored)!;
    expect(r.persona).toMatch(/space-time voyagers/);
    expect(r.ongoing).toBe(true);

    // a record that broke the rule (the check refuses it; the page must not show it either)
    const leaked = structuredClone(stored) as { identity: Record<string, unknown> };
    leaked.identity.full_name = 'A Real Name';
    leaked.identity.born = { date: '1990-01-01' };
    const r2 = readDrummerRecord(leaked)!;
    expect(r2.fullName).toBeNull();
    expect(r2.born).toBeNull();
    expect(JSON.stringify(r2)).not.toContain('A Real Name');
  });

  it('drops one field that does not read and keeps the rest', () => {
    const r = readDrummerRecord({
      identity: { name: 'Someone', summary: 'Plays.', active: 'not an object' },
      eras: [{ label: 'Early', years: { from: 1960 } }, { nope: true }],
      signature_traits: 'not a list',
      technique_profile: { hand_techniques: [{ name: 'Rolls' }, 42] },
      meta: { record_status: 'draft' },
    })!;
    expect(r.name).toBe('Someone');
    expect(r.summary).toBe('Plays.');
    expect(r.activeFrom).toBeNull();
    expect(r.eras).toEqual([{ label: 'Early', from: 1960, to: null, context: null }]);
    expect(r.traits).toEqual([]);
    expect(r.techniques).toEqual([{ name: 'Rolls', description: null }]);
    expect(r.status).toBe('draft');
  });

  it('is null for something with no name to show', () => {
    expect(readDrummerRecord(null)).toBeNull();
    expect(readDrummerRecord({ identity: {} })).toBeNull();
    expect(readDrummerRecord('a string')).toBeNull();
  });

  it('reads an unknown confidence on a trait as none, not as a claim', () => {
    const r = readDrummerRecord({
      identity: { name: 'X' },
      signature_traits: [{ label: 'T', evidence: { confidence: 'certain' } }],
    })!;
    expect(r.traits).toEqual([{ label: 'T', category: null, description: null, confidence: null }]);
  });
});
