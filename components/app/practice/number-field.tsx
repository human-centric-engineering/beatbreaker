'use client';

import { useState } from 'react';

import { Input } from '@/components/ui/input';

/**
 * A whole-number input that takes effect when you leave it or press Enter,
 * not on every keystroke — typing "12" must not re-split a session at "1" on
 * the way. Out of range is held to the range; nonsense goes back to what it
 * was. With `blank`, an empty field is null ("the session's", "your best").
 */
export function NumberField({
  id,
  value,
  min,
  max,
  onCommit,
  blank = false,
  placeholder,
  className,
  describedBy,
}: {
  id: string;
  value: number | null;
  min: number;
  max: number;
  onCommit: (value: number | null) => void;
  blank?: boolean;
  placeholder?: string;
  className?: string;
  describedBy?: string;
}) {
  const shown = value === null ? '' : String(value);
  const [text, setText] = useState(shown);
  const [was, setWas] = useState(shown);
  // the value changed from outside (a re-split, a save): show it
  if (shown !== was) {
    setWas(shown);
    setText(shown);
  }

  const commit = () => {
    const trimmed = text.trim();
    if (trimmed === '' && blank) {
      if (value !== null) onCommit(null);
      return;
    }
    const n = Number(trimmed);
    if (trimmed === '' || !Number.isFinite(n)) {
      setText(shown);
      return;
    }
    const held = Math.min(max, Math.max(min, Math.round(n)));
    setText(String(held));
    if (held !== value) onCommit(held);
  };

  return (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={1}
      value={text}
      placeholder={placeholder}
      className={className}
      aria-describedby={describedBy}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        }
      }}
    />
  );
}
