'use client';

import { Fragment } from 'react';

import { useStudio } from '@/components/app/studio/studio-provider';

export function LibraryPanel() {
  const c = useStudio();
  const { say } = c;
  const { styles, library } = c.catalogue;

  return (
    <>
      <div className="card">
        <div className="card-hd">
          <h3>Famous breaks</h3>
        </div>
        <div className="card-bd">
          {/* The group headings sit in the same column as the rows rather
              than wrapping each group in a box of its own: one flex
              column is what puts an even gap between every row, and what
              lets the first heading lose its top padding. */}
          <div className="list">
            {library.map(([group, items]) => (
              <Fragment key={group}>
                <div className="list-hd">{group}</div>
                {items.map(({ item, index }) => (
                  <button
                    key={index}
                    type="button"
                    className="item"
                    title={item.note}
                    onClick={() => {
                      c.loadLibraryItem(index);
                      say(item.note ? `${item.title} — ${item.note}` : `${item.title} loaded`);
                    }}
                  >
                    <div className="nm">
                      <b>{item.title}</b>
                      <span>{item.artist}</span>
                    </div>
                    {/* the meter rides with the tempo, because a break in
                        7/8 at 150 is not the same read as one in 4/4 */}
                    <span className="bpm">
                      {item.bpm}
                      {item.meter ? ` · ${item.meter}` : ''}
                    </span>
                  </button>
                ))}
              </Fragment>
            ))}
          </div>
          <div className="hint" style={{ marginTop: 12 }}>
            The main groove off each record — a bar or two of it, in the meter it was played in.
            Fills and variations are not here. The feel studies at the bottom are written rather
            than transcribed, and say so.
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-hd">
          <h3>My breaks</h3>
          <div className="spacer" />
          <button
            type="button"
            className="mini"
            onClick={() => {
              c.saveFav();
              say('Saved to your breaks');
            }}
          >
            ＋ Save current
          </button>
        </div>
        <div className="card-bd">
          {c.favs.length ? (
            <div className="list">
              {c.favs.map((fav, i) => (
                /* The row is the load button and the delete button side by
                   side rather than one nested in the other: a button inside
                   a button is not valid HTML, and every way of faking it
                   costs the keyboard the delete control. */
                <div className="favrow" key={`${fav.code.slice(0, 12)}-${i}`}>
                  <button
                    type="button"
                    className="item"
                    onClick={() =>
                      say(c.loadFav(i) ? 'Loaded' : 'That saved break could not be read')
                    }
                  >
                    <div className="nm">
                      <b>{fav.name}</b>
                      <span>
                        {styles[fav.style]?.label ?? fav.style} · L{fav.level}
                      </span>
                    </div>
                    <span className="bpm">{fav.bpm}</span>
                  </button>
                  <button
                    type="button"
                    className="item kill"
                    aria-label={`Delete ${fav.name}`}
                    onClick={() => c.deleteFav(i)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="hint">
              Nothing saved yet. <b>Save current</b> keeps the whole break — both sections, the
              tempo, the swing and the layer — in this browser, thirty of them.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
