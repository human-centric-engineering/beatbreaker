// @vitest-environment happy-dom

/**
 * The player's parts that are not the transport: the study header (who, what
 * the break is inspired by, and the song menu), New break and its creativity
 * panel, the mixer desk and the Sound panel.
 *
 * Mounted against a real `StudioProvider` and the seed catalogue, so the
 * drummer, the songs and the twist are the console's own, not a fake's.
 */

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FeelPop } from '@/components/app/studio/player/feel-deck';
import { MixerPop } from '@/components/app/studio/player/mixer-desk';
import { PlayerBar } from '@/components/app/studio/player/player-bar';
import { RandomPickButton } from '@/components/app/studio/player/random-pick';
import { SoundPop } from '@/components/app/studio/player/sound-deck';
import { StudyHeader } from '@/components/app/studio/player/study-header';
import { type Studio, StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { testCatalogue, testPolyrhythms, testRudiments } from '@/tests/helpers/catalogue';
import { LAPTOP, stubWidth } from '@/tests/helpers/media';
import { openMenu, pickOption } from '@/tests/helpers/select-menu';

/* A song picked while playing goes back to the top and counts in: the console
   tests that the restart does that; these, that the pickers ask for it. The
   real one is still called. */
const restartFromTop = vi.fn();
vi.mock('@/components/app/studio/studio-provider', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/components/app/studio/studio-provider')>();
  return {
    ...real,
    useStudio: () => {
      const s = real.useStudio();
      return {
        ...s,
        restartFromTop: () => {
          restartFromTop();
          s.restartFromTop();
        },
      };
    },
  };
});

let studio: Studio | null = null;
function Probe() {
  studio = useStudio();
  return null;
}

const mount = (ui: React.ReactNode, style?: string) =>
  render(
    <StudioProvider catalogue={testCatalogue()} openStyle={style}>
      <Probe />
      {ui}
    </StudioProvider>
  );

beforeEach(() => {
  localStorage.clear();
  studio = null;
  restartFromTop.mockClear();
  stubWidth(LAPTOP);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const ready = () => waitFor(() => expect(studio?.view.A).toBeTruthy());

describe('the study header', () => {
  it("leads with a drummer's name, and the song the break is inspired by", async () => {
    mount(<StudyHeader />, 'ulrich');
    await waitFor(() => expect(studio?.view.A?.style).toBe('ulrich'));

    expect(screen.getByText('Studying')).toBeInTheDocument();
    expect(document.querySelector('.study-name')).toHaveClass('drummer');
    expect(document.querySelector('.study-name')).toHaveTextContent('Lars Ulrich');
    // the break's own name is the heading, under the drummer's
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(studio!.view.A!.name);
    const menu = screen.getByRole('combobox', { name: 'Song inspiration' });
    const song = (studio!.catalogue.styles.ulrich.params.songs ?? []).find(
      (sg) => sg.key === studio!.view.A!.song?.split(':')[0]
    );
    expect(menu).toHaveTextContent(song!.title);
  });

  it('writes a break of the song picked, and keeps New on it', async () => {
    const user = userEvent.setup();
    mount(<StudyHeader />, 'ulrich');
    await waitFor(() => expect(studio?.view.A?.style).toBe('ulrich'));
    const songs = studio!.catalogue.styles.ulrich.params.songs ?? [];
    const other = songs.find((sg) => sg.key !== studio!.view.A!.song?.split(':')[0])!;

    await pickOption(user, screen.getByRole('combobox', { name: 'Song inspiration' }), other.key);
    expect(restartFromTop).toHaveBeenCalledTimes(1);
    expect(studio!.view.A?.song?.split(':')[0]).toBe(other.key);
    expect(studio!.nextSong).toEqual({ style: 'ulrich', song: other.key });
  });

  it('opens the crate beside the name, drummers first, and studies whoever is picked', async () => {
    const user = userEvent.setup();
    mount(<StudyHeader />, 'ulrich');
    await waitFor(() => expect(studio?.view.A?.style).toBe('ulrich'));
    const [key, next] = Object.entries(studio!.catalogue.styles).find(
      ([k, row]) => row.params.drummer && k !== 'ulrich'
    )!;

    await user.click(
      screen.getByRole('button', { name: 'Change the drummer or style (now Lars Ulrich)' })
    );
    const crate = within(await screen.findByRole('dialog', { name: 'Pick a drummer' }));
    const tabs = crate.getAllByRole('tab');
    expect(tabs[0]).toHaveTextContent('Drummers');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveTextContent('Styles');

    await user.click(crate.getByRole('option', { name: new RegExp(`^${next.params.label}`) }));
    await waitFor(() => expect(studio!.view.A?.style).toBe(key));
    expect(studio!.style).toBe(key);
    // playing, the new drummer starts from the top with a count-in
    expect(restartFromTop).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.study-name')).toHaveTextContent(next.params.label);
  });

  it('leads with the style, and names it, for a style that is not a drummer', async () => {
    mount(<StudyHeader />);
    await ready();
    expect(screen.getByText('Style')).toBeInTheDocument();
    expect(document.querySelector('.study-name')).not.toHaveClass('drummer');
  });

  it('says what a creative twist changed and what it kept', async () => {
    mount(<StudyHeader />);
    await ready();
    expect(screen.queryByRole('status')).toBeNull();

    act(() => studio!.setCreativity(100));
    act(() => {
      studio!.newBreak();
    });
    const note = await screen.findByRole('status');
    expect(note).toHaveTextContent(/experimental/i);
    expect(note).toHaveTextContent(/Kept the /);
  });
});

describe('New break', () => {
  it('names its creativity on the button, and rolls a new break with it', async () => {
    const user = userEvent.setup();
    mount(<StudyHeader />);
    await ready();
    const before = studio!.view.A;

    const go = screen.getByRole('button', { name: /^New break/ });
    // the default is faithful: the break as the style writes it
    expect(go).toHaveTextContent('Faithful');
    await user.click(go);
    expect(restartFromTop).toHaveBeenCalledTimes(1);
    expect(studio!.view.A).not.toBe(before);
  });

  it('sets the creativity on its panel, says the band, and writes from the panel', async () => {
    const user = userEvent.setup();
    mount(<StudyHeader />);
    await ready();

    await user.click(screen.getByRole('button', { name: 'Song and creativity for New break' }));
    const panel = within(await screen.findByRole('dialog', { name: 'New break' }));
    const slider = panel.getByRole('slider', { name: 'Creativity' });

    // what the next New writes sits with it: how busy the kick, how many ghosts
    fireEvent.change(panel.getByRole('slider', { name: 'Kick density' }), {
      target: { value: '20' },
    });
    fireEvent.change(panel.getByRole('slider', { name: 'Ghost notes' }), {
      target: { value: '80' },
    });
    expect(studio!.density).toBe(20);
    expect(studio!.ghosts).toBe(80);

    fireEvent.change(slider, { target: { value: '60' } });
    expect(studio!.creativity).toBe(60);
    expect(slider).toHaveAttribute('aria-valuetext', '60: Adventurous');
    expect(panel.getByText(/One bold idea/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^New break/ })).toHaveTextContent('Adventurous');

    fireEvent.change(slider, { target: { value: '90' } });
    expect(slider).toHaveAttribute('aria-valuetext', '90: Experimental');

    expect(restartFromTop).not.toHaveBeenCalled();
    await user.click(panel.getByRole('button', { name: 'Write it' }));
    expect(restartFromTop).toHaveBeenCalledTimes(1);
    expect(studio!.twist?.band).toBe('experimental');
    // written, the panel gets out of the way
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New break' })).toBeNull());
  });

  it("holds one of the drummer's songs for every New, until Any song", async () => {
    const user = userEvent.setup();
    mount(<StudyHeader />, 'ulrich');
    await waitFor(() => expect(studio?.view.A?.style).toBe('ulrich'));
    const songs = studio!.catalogue.styles.ulrich.params.songs ?? [];

    await user.click(screen.getByRole('button', { name: 'Song and creativity for New break' }));
    const panel = within(await screen.findByRole('dialog', { name: 'New break' }));
    const pick = panel.getByRole('combobox', { name: 'Song for the next New' });
    expect(pick).toHaveTextContent(`Any of the ${songs.length} songs`);
    const menu = await openMenu(user, pick);
    expect(within(menu).getAllByRole('option')).toHaveLength(songs.length + 1);
    await user.keyboard('{Escape}');

    await pickOption(user, pick, songs[0].key);
    expect(studio!.nextSong).toEqual({ style: 'ulrich', song: songs[0].key });
    await pickOption(user, pick, '');
    expect(studio!.nextSong).toBeNull();
  });
});

describe('Random', () => {
  /* Math.random is held for the pick: 0 takes the first pattern in the pool (the
     first style the picker shows), just under 1 the last (the last exercise) */
  it('writes a break in the style a pick lands on, back at the top, and says so', async () => {
    const user = userEvent.setup();
    mount(<RandomPickButton />, 'ulrich');
    await waitFor(() => expect(studio?.view.A?.style).toBe('ulrich'));
    const first = studio!.catalogue.styleGroups[0][1][0];
    vi.spyOn(Math, 'random').mockReturnValue(0);
    await user.click(screen.getByRole('button', { name: 'Random' }));
    await waitFor(() => expect(studio!.view.A?.style).toBe(first));
    expect(restartFromTop).toHaveBeenCalledTimes(1);
    const label = studio!.catalogue.styles[first].params.label;
    expect(studio!.notice?.message).toContain(label);
    vi.restoreAllMocks();
  });

  it('opens an exercise a pick lands on, as its shelf would', async () => {
    const user = userEvent.setup();
    const catalogue = testCatalogue();
    catalogue.libraries = [...catalogue.libraries, testRudiments(), testPolyrhythms()];
    render(
      <StudioProvider catalogue={catalogue} openStyle="ulrich">
        <Probe />
        <RandomPickButton />
      </StudioProvider>
    );
    await ready();
    const last = testPolyrhythms().entries.at(-1)!;
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    await user.click(screen.getByRole('button', { name: 'Random' }));
    await waitFor(() => expect(studio!.notice?.message).toBe(`Random exercise: ${last.title}`));
    expect(studio!.view.A?.name).toBe(last.title);
    vi.restoreAllMocks();
  });
});

describe('Feel', () => {
  it('says the swing on its face, and opens the swing and the hi-hat dynamics above the bar', async () => {
    const user = userEvent.setup();
    mount(<FeelPop />);
    await ready();
    act(() => studio!.setSwing(0));

    const button = screen.getByRole('button', { name: 'Feel' });
    expect(button).toHaveTextContent('Straight');
    await user.click(button);
    const pop = within(await screen.findByRole('dialog', { name: 'Feel' }));
    fireEvent.change(pop.getByLabelText('Swing (16ths)'), { target: { value: '12' } });
    expect(studio!.swing).toBe(12);
    expect(button).toHaveTextContent('Swing 12%');
    expect(pop.getByLabelText('Hi-hat dynamics')).toBeInTheDocument();
  });
});

describe('the mixer desk', () => {
  it('has a strip per lane: a fader, Mute and Solo, and Back to the style once one moves', async () => {
    const user = userEvent.setup();
    mount(<MixerPop />);
    await ready();

    await user.click(screen.getByRole('button', { name: 'Mixer' }));
    const desk = within(await screen.findByRole('group', { name: 'Mixer channels' }));
    const lanes = studio!.view.A!.lanes;
    expect(document.querySelectorAll('.strip').length).toBeGreaterThanOrEqual(lanes.length);

    const kick = desk.getByRole('slider', { name: 'Kick' });
    expect(screen.queryByRole('button', { name: 'Back to the style' })).toBeNull();
    fireEvent.change(kick, { target: { value: '40' } });
    expect(studio!.mix.k).toBeCloseTo(0.4);
    expect(kick.closest('.strip')).toHaveTextContent('40');

    await user.click(desk.getByRole('button', { name: 'Mute Kick' }));
    expect(studio!.mute.k).toBe(true);
    expect(kick.closest('.strip')).toHaveClass('muted');
    await user.click(desk.getByRole('button', { name: 'Solo Snare' }));
    expect(studio!.laneSolo.s).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Back to the style' }));
    expect(studio!.mix.k ?? 1).not.toBeCloseTo(0.4);
  });
});

describe('the Sound panel', () => {
  it('names the kit on its button, and picks the kit, the room and Humanise', async () => {
    const user = userEvent.setup();
    mount(<SoundPop />);
    await ready();
    const kitLabel = studio!.catalogue.kits[studio!.kit].label;

    const button = screen.getByRole('button', { name: 'Sound' });
    expect(button).toHaveTextContent(kitLabel);
    await user.click(button);
    const panel = within(await screen.findByRole('dialog', { name: 'Sound' }));

    fireEvent.change(panel.getByLabelText('Room'), { target: { value: '33' } });
    expect(studio!.sound.master.room).toBeCloseTo(0.33);
    await user.click(panel.getByRole('radio', { name: 'Loose' }));
    expect(studio!.humanise.mode).toBe('loose');
    // your own kits are made in the drawer, which has the room for it
    expect(panel.getByText(/Tune each drum/)).toBeInTheDocument();
  });
});

describe('the bar', () => {
  it('puts the section and the layer on a line over the chapters, not in the transport row', async () => {
    const { container } = mount(<PlayerBar variant="overlay" />);
    await ready();
    const bar = container.querySelector('.player-bar')!;
    const pick = bar.querySelector('.player-pick')!;
    const chapters = bar.querySelector('.chapters')!;

    expect(within(pick as HTMLElement).getByRole('radiogroup', { name: 'Section' })).toBeTruthy();
    expect(
      within(pick as HTMLElement).getByRole('radiogroup', { name: 'Difficulty layer' })
    ).toBeTruthy();
    // before the chapters in the bar, and out of the row under them
    expect(pick.compareDocumentPosition(chapters) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(bar.querySelector('.player-row .player-pick')).toBeNull();
  });

  it('says what an icon on the bar is, on hover, in place of the browser title', async () => {
    const user = userEvent.setup();
    mount(<PlayerBar variant="overlay" />);
    await ready();
    const mixer = screen.getByRole('button', { name: 'Mixer' });
    expect(mixer).not.toHaveAttribute('title');

    await user.hover(mixer);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      "Mixer: each drum's level, mute and solo"
    );
    // and the button still opens its panel
    await user.click(mixer);
    expect(await screen.findByRole('dialog', { name: 'Mixer' })).toBeTruthy();
  });
});
