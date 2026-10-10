// @vitest-environment happy-dom

/**
 * The grip guide: the modal (`grip-guide.tsx`) and the canvas that mounts
 * its film (`grip-guide-canvas.tsx`).
 *
 * The film itself is `GripGuideStage` (covered in `grip-guide-stage.test.ts`,
 * it needs a GPU), so here it is replaced by a fake that records what it is
 * told; `next/dynamic` renders the canvas straight away. The lessons are the
 * real ones.
 */

import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stages = vi.hoisted(() => {
  const made: {
    grip: string;
    onTime?: (t: number) => void;
    setGrip: ReturnType<typeof vi.fn>;
    setPlaying: ReturnType<typeof vi.fn>;
    seek: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }[] = [];
  class FakeGripGuideStage {
    grip: string;
    onTime?: (t: number) => void;
    setGrip = vi.fn();
    setPlaying = vi.fn();
    seek = vi.fn();
    dispose = vi.fn();
    constructor(_host: HTMLElement, options: { grip: string; onTime?: (t: number) => void }) {
      this.grip = options.grip;
      this.onTime = options.onTime;
      made.push(this);
    }
  }
  return { made, FakeGripGuideStage };
});

vi.mock('@/components/app/studio/drummer/grip-guide-stage', () => ({
  GripGuideStage: stages.FakeGripGuideStage,
}));

vi.mock('next/dynamic', async () => {
  const canvas = await import('@/components/app/studio/drummer/grip-guide-canvas');
  return { default: () => canvas.default };
});

import { GripGuide } from '@/components/app/studio/drummer/grip-guide';
import { lessonOf, stepStart } from '@/lib/app/breaks/drummer/grip-guide';

afterEach(() => {
  stages.made.length = 0;
});

function open(grip: 'american' | 'german' | 'french' | 'traditional' = 'american') {
  const onOpenChange = vi.fn();
  const view = render(<GripGuide open grip={grip} onOpenChange={onOpenChange} />);
  return { onOpenChange, ...view };
}

const caption = () => screen.getByText(/^Step \d+ of \d+:/).parentElement!;

describe('GripGuide', () => {
  it('opens on the grip the drummer plays, its first step under the film', () => {
    open('german');
    expect(screen.getByRole('tab', { name: 'German', selected: true })).toBeInTheDocument();
    const first = lessonOf('german').steps[0];
    expect(caption()).toHaveTextContent(`Step 1 of 5: ${first.title}`);
    expect(caption()).toHaveTextContent(first.caption);
    expect(stages.made).toHaveLength(1);
    expect(stages.made[0].grip).toBe('german');
  });

  it('follows the film: the caption is the step the film is playing', () => {
    open('american');
    const third = lessonOf('american').steps[2];
    act(() => stages.made[0].onTime?.(stepStart('american', 2) + 0.5));
    expect(caption()).toHaveTextContent(`Step 3 of 7: ${third.title}`);
  });

  it('steps forward and back, from the start, and to a step chosen from the list', async () => {
    const user = userEvent.setup();
    open('american');
    const stage = stages.made[0];
    await user.click(screen.getByRole('button', { name: 'Next step' }));
    expect(stage.seek).toHaveBeenLastCalledWith(stepStart('american', 1));
    expect(caption()).toHaveTextContent('Step 2 of 7');
    await user.click(screen.getByRole('button', { name: 'Previous step' }));
    await user.click(screen.getByRole('button', { name: 'Previous step' }));
    // back past the first step wraps round to the last
    expect(caption()).toHaveTextContent('Step 7 of 7');
    const steps = within(screen.getByRole('list', { name: 'Steps' }));
    await user.click(steps.getByRole('button', { name: /Find the balance point/ }));
    expect(stage.seek).toHaveBeenLastCalledWith(stepStart('american', 2));
    expect(steps.getByRole('button', { name: /Find the balance point/ })).toHaveAttribute(
      'aria-current',
      'step'
    );
    await user.click(screen.getByRole('button', { name: 'From the start' }));
    expect(stage.seek).toHaveBeenLastCalledWith(0);
  });

  it('pauses and plays the film', async () => {
    const user = userEvent.setup();
    open();
    const stage = stages.made[0];
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(stage.setPlaying).toHaveBeenLastCalledWith(false);
    await user.click(screen.getByRole('button', { name: 'Play' }));
    expect(stage.setPlaying).toHaveBeenLastCalledWith(true);
  });

  it('teaches another grip from its first step when its tab is chosen', async () => {
    const user = userEvent.setup();
    open('american');
    const stage = stages.made[0];
    await user.click(screen.getByRole('button', { name: 'Next step' }));
    await user.click(screen.getByRole('tab', { name: 'Traditional' }));
    expect(stage.setGrip).toHaveBeenLastCalledWith('traditional');
    expect(stage.seek).toHaveBeenLastCalledWith(0);
    expect(caption()).toHaveTextContent(`Step 1 of 7: ${lessonOf('traditional').steps[0].title}`);
    expect(screen.getByText(lessonOf('traditional').blurb)).toBeInTheDocument();
  });

  it('frees the film when it closes, and opens again on the drummer’s grip', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<GripGuide open grip="french" onOpenChange={onOpenChange} />);
    const first = stages.made[0];
    rerender(<GripGuide open={false} grip="american" onOpenChange={onOpenChange} />);
    expect(first.dispose).toHaveBeenCalled();
    rerender(<GripGuide open grip="american" onOpenChange={onOpenChange} />);
    expect(screen.getByRole('tab', { name: 'American', selected: true })).toBeInTheDocument();
    expect(stages.made[stages.made.length - 1].grip).toBe('american');
  });

  it('reopens at the first step of a shorter lesson, not past its end', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(<GripGuide open grip="traditional" onOpenChange={onOpenChange} />);
    // the last of traditional's seven steps
    await user.click(screen.getByRole('button', { name: 'Previous step' }));
    expect(caption()).toHaveTextContent('Step 7 of 7');
    rerender(<GripGuide open={false} grip="german" onOpenChange={onOpenChange} />);
    rerender(<GripGuide open grip="german" onOpenChange={onOpenChange} />);
    expect(caption()).toHaveTextContent(`Step 1 of 5: ${lessonOf('german').steps[0].title}`);
    expect(stages.made[stages.made.length - 1].seek).toHaveBeenLastCalledWith(0);
  });
});
