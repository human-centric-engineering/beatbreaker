import type { StudioTool } from '@/components/app/shell/studio-address';

/**
 * Each drawer's title, and one line on what it is for.
 *
 * The title is what the drawer's own heading says; the line is what `/help`
 * says about it (task 8.7). A plain module, not a client one, so the server
 * page reads the same titles the drawer is built with, and a renamed drawer
 * renames its help.
 */
export const DRAWERS: Record<StudioTool, { title: string; help: string }> = {
  gen: {
    title: 'Generate',
    help: 'Roll a new break from a style, a length and a feel, and see what the critic makes of it.',
  },
  doctor: {
    title: 'Edit',
    help: 'Musical edits to the break, with the critic’s score beside them, so you can see whether a move helped.',
  },
  patterns: {
    title: 'Patterns',
    help: 'What you’re practising, what you’ve kept for later, your recent rolls, everything you’ve saved, the famous breaks and the community library.',
  },
  kit: {
    title: 'Sound',
    help: 'The kit and how each voice sounds, and samples of your own.',
  },
  practice: {
    title: 'Practise',
    help: 'The click, count-in and tempo, the mixer with mute and solo, your practice session and your speeds.',
  },
  export: {
    title: 'Share & export',
    help: 'Name the pattern and add its links, share or publish it, download it as MIDI or print the chart.',
  },
  buddy: {
    title: 'BeatBuddy',
    help: 'Ask for a change in words. It edits the break, and Undo takes the edit back.',
  },
};
