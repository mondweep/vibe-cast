/**
 * Layout fitness tests.
 *
 * jsdom has no layout engine, so nothing here may assert a computed pixel
 * width. What it can assert is the *source of truth*: the stylesheets. These
 * tests read `src/styles/*.css` and check the rules that make the console
 * usable on a phone without disturbing the 1366x768 projector budget (NFR-11).
 *
 * ---------------------------------------------------------------------------
 * Why the breakpoint is 900px, and not a number someone liked the look of
 * ---------------------------------------------------------------------------
 *
 * Every hard horizontal minimum declared in the stylesheets was extracted and
 * converted to px at a 16px root (see the arithmetic asserted below):
 *
 *   .derived-badge__detail  width: 21rem            = 336px
 *   .scenario               17rem  + minmax(0,1fr)  = 284px  (collapses @1100)
 *   .map                    minmax(0,1fr) + 15rem   = 252px  (collapses @1100)
 *   .weights__row           10rem + 1fr + 3.5rem    = 232px
 *   .severity__bar          width: 8rem             = 128px
 *   .figure-grid            minmax(9.5rem, 1fr)     = 152px per cell
 *
 * The rail costs a flat 184px (`--rail-width: 11.5rem`) and `.console__main`
 * costs 32px of padding, at every viewport. So the console's densest repeated
 * unit — `.figure-grid`, which carries "Reported by ASDMA" and "Derived
 * decision metrics" — stops being a grid and becomes a list when:
 *
 *   4 cells x 152px + 3 gaps x 8px  =  632px of grid
 *   + panel chrome (var(--s-3) padding + 1px border, both sides) = 26px
 *   + the rail 184px + the content-well padding 32px
 *   -------------------------------------------------------------
 *   = 874px of viewport
 *
 * 874px rounded up to the conventional tablet-portrait step is 900px, which is
 * where the rail becomes a drawer. Below it the rail's 184px buys nothing: at
 * 768px the well is 552px, at 390px it is 174px — narrower than a single
 * figure cell.
 *
 * The tables are deliberately NOT what sets this breakpoint. The District
 * ranking table's min-content is ~1185px (ten `white-space: nowrap` headers
 * plus an 8rem severity bar that cannot shrink), which already exceeds the
 * 1150px content well on the 1366px projector. A table that overflows at every
 * viewport needs its own scroll container regardless of where the rail goes —
 * which is what `.table-scroll` is for.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Read the stylesheets as text, not as modules: Vite rewrites
 * `new URL('...', import.meta.url)` into an asset reference, so the path has
 * to be built with `join` to reach the real file on disk.
 */
const STYLE_DIR = join(import.meta.dirname, '..', '..', 'styles');
const stylesheet = (name: string): string => readFileSync(join(STYLE_DIR, name), 'utf8');

const shell = stylesheet('shell.css');
const panels = stylesheet('panels.css');
const views = stylesheet('views.css');
const base = stylesheet('base.css');

/** The drawer breakpoint, derived above. Every narrow rule must agree with it. */
const RAIL_BREAKPOINT = 900;

/** Strip comments, so prose about a number is never mistaken for a declaration. */
const declarations = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** The body of the first `@media <query> { ... }` block, brace-balanced. */
const mediaBlock = (css: string, query: string): string => {
  const clean = declarations(css);
  const start = clean.indexOf(`@media ${query}`);
  if (start === -1) return '';
  const open = clean.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < clean.length; i += 1) {
    if (clean[i] === '{') depth += 1;
    if (clean[i] === '}') {
      depth -= 1;
      if (depth === 0) return clean.slice(open + 1, i);
    }
  }
  return '';
};

/** Everything NOT inside an `@media` block — i.e. what the projector sees. */
const outsideMediaQueries = (css: string): string => {
  const clean = declarations(css);
  let out = '';
  let mediaDepth = 0;
  for (let i = 0; i < clean.length; i += 1) {
    if (mediaDepth === 0 && clean.startsWith('@media', i)) {
      while (i < clean.length && clean[i] !== '{') i += 1;
      mediaDepth = 1;
      continue;
    }
    if (mediaDepth > 0) {
      if (clean[i] === '{') mediaDepth += 1;
      if (clean[i] === '}') mediaDepth -= 1;
      continue;
    }
    out += clean[i];
  }
  return out;
};

type Rule = { readonly selectors: readonly string[]; readonly body: string };

/** Flat list of `selector { body }` rules. Media preludes are already stripped. */
const rulesIn = (css: string): Rule[] => {
  const out: Rule[] = [];
  for (const match of declarations(css).matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const prelude = match[1].trim();
    if (!prelude || prelude.startsWith('@')) continue;
    out.push({
      selectors: prelude.split(',').map((part) => part.trim().replace(/\s+/g, ' ')),
      body: match[2],
    });
  }
  return out;
};

/**
 * The declarations of every rule whose selector list contains `selector`
 * exactly — `.headline__tile` must not silently match `.headline__tile--gap`.
 */
const ruleFor = (css: string, selector: string): string =>
  rulesIn(css)
    .filter((rule) => rule.selectors.includes(selector))
    .map((rule) => rule.body)
    .join(';');

const narrow = {
  shell: mediaBlock(shell, `(max-width: ${String(RAIL_BREAKPOINT)}px)`),
  panels: mediaBlock(panels, `(max-width: ${String(RAIL_BREAKPOINT)}px)`),
  views: mediaBlock(views, `(max-width: ${String(RAIL_BREAKPOINT)}px)`),
};

describe('the desktop console is untouched (NFR-11: 1366x768 projector)', () => {
  it('keeps the fixed two-column grid outside every media query', () => {
    const desktop = ruleFor(outsideMediaQueries(shell), '.console');
    expect(desktop).toMatch(/grid-template-columns:\s*var\(--rail-width\) 1fr/);
    expect(desktop).toMatch(/grid-template-rows:\s*var\(--header-height\) 1fr/);
    expect(desktop).toMatch(/'brand header'/);
    expect(desktop).toMatch(/'rail\s+main'/);
  });

  it('keeps the rail width and header height budget unchanged', () => {
    const tokens = stylesheet('tokens.css');
    expect(tokens).toMatch(/--rail-width:\s*11\.5rem/);
    expect(tokens).toMatch(/--header-height:\s*2\.75rem/);
  });

  it('hides the drawer toggle and the scrim by default, so the projector never sees them', () => {
    const desktop = outsideMediaQueries(shell);
    expect(ruleFor(desktop, '.console__rail-toggle')).toMatch(/display:\s*none/);
    expect(ruleFor(desktop, '.console__scrim')).toMatch(/display:\s*none/);
  });

  it('leaves the wide-table scroll container inert above the breakpoint', () => {
    // Above 900px `.console__main` already scrolls, and `thead th`'s
    // `position: sticky` is relative to it. Introducing a second scroll
    // container up there would kill the sticky header the projector relies on.
    const desktop = outsideMediaQueries(panels);
    expect(ruleFor(desktop, '.table-scroll')).not.toMatch(/overflow-x:\s*auto/);
    expect(ruleFor(desktop, '.data-table thead th')).toMatch(/position:\s*sticky/);
  });
});

describe('below the measured breakpoint the rail becomes a drawer', () => {
  it('collapses the console to a single column', () => {
    expect(narrow.shell).not.toBe('');
    const console_ = ruleFor(narrow.shell, '.console');
    expect(console_).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(console_).toMatch(/'brand'/);
    expect(console_).toMatch(/'header'/);
    expect(console_).toMatch(/'main'/);
    // The rail is no longer a grid area — it is taken out of flow entirely.
    expect(console_).not.toMatch(/'rail/);
  });

  it('takes the rail out of the tab order while it is closed', () => {
    // `transform: translateX(-100%)` alone would leave the links focusable,
    // and a keyboard user would tab into a drawer they cannot see.
    const rail = ruleFor(narrow.shell, '.console__rail');
    expect(rail).toMatch(/position:\s*fixed/);
    expect(rail).toMatch(/visibility:\s*hidden/);
    expect(rail).toMatch(/transform:\s*translateX\(-100%\)/);

    const open = ruleFor(narrow.shell, ".console[data-rail-open='true'] .console__rail");
    expect(open).toMatch(/visibility:\s*visible/);
  });

  it('shows the toggle and the scrim only down here', () => {
    expect(ruleFor(narrow.shell, '.console__rail-toggle')).toMatch(/display:\s*inline-flex/);
    expect(ruleFor(narrow.shell, '.console__scrim')).toMatch(/display:\s*block/);
  });

  it('respects prefers-reduced-motion for the drawer transition', () => {
    const reduced = mediaBlock(shell, '(prefers-reduced-motion: reduce)');
    expect(reduced).toMatch(/\.console__rail/);
    expect(reduced).toMatch(/transition:\s*none/);
    // ...and the global safety net in base.css is still there.
    expect(base).toMatch(/prefers-reduced-motion: reduce/);
  });
});

describe('every touch target is at least 44x44 CSS px on a narrow viewport', () => {
  const targets = [
    ['shell', '.console__rail-toggle'],
    ['shell', '.console__rail-link'],
    ['views', '.loader__button'],
    ['views', '.assumption__input'],
    ['views', '.map__legend-item'],
    ['panels', '.data-table__sort'],
    ['panels', '.derived-badge__marker'],
    ['panels', '.provenance'],
  ] as const;

  for (const [sheet, selector] of targets) {
    it(`sizes ${selector} for a fingertip`, () => {
      expect(ruleFor(narrow[sheet], selector)).toMatch(/min-height:\s*44px/);
    });
  }
});

describe('nothing wider than a phone survives the breakpoint', () => {
  it('caps the derived-badge popover, the widest hard minimum in the console', () => {
    // 21rem = 336px, wider than the whole content well on any phone.
    expect(ruleFor(outsideMediaQueries(panels), '.derived-badge__detail')).toMatch(
      /width:\s*21rem/,
    );
    expect(ruleFor(narrow.panels, '.derived-badge__detail')).toMatch(/width:\s*min\(21rem,/);
  });

  it('never lets a grid track fall back to min-content and push the page sideways', () => {
    // `1fr` is `minmax(auto, 1fr)`: its floor is the content's min-content
    // width, which is exactly how a long District name forces a horizontal
    // scrollbar. Every narrow fallback uses an explicit `minmax(0, 1fr)`.
    const fallbacks = mediaBlock(views, '(max-width: 1100px)');
    expect(ruleFor(fallbacks, '.map')).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(ruleFor(fallbacks, '.scenario')).toMatch(
      /grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    );
  });

  it('scales the damage map SVG rather than letting it overflow', () => {
    const canvas = ruleFor(outsideMediaQueries(views), '.map__canvas');
    expect(canvas).toMatch(/width:\s*100%/);
    expect(canvas).toMatch(/height:\s*auto/);
    expect(canvas).toMatch(/max-width:\s*100%/);
  });

  it('scrolls a wide table inside its own container, not the page', () => {
    expect(ruleFor(narrow.panels, '.table-scroll')).toMatch(/overflow-x:\s*auto/);
    // Contained, so a sideways swipe on the ranking table does not drag the
    // staleness banner and the headline figures off screen with it.
    expect(ruleFor(narrow.panels, '.table-scroll')).toMatch(
      /overscroll-behavior-x:\s*contain/,
    );
  });

  it('stacks the severity-weight rows instead of holding a 10rem label column', () => {
    expect(ruleFor(narrow.views, '.weights__row')).toMatch(/grid-template-columns:/);
  });
});

describe('FR-2.1: the derived gap tile keeps equal visual weight when stacked', () => {
  it('stacks the headline band on a narrow viewport', () => {
    const fallbacks = mediaBlock(views, '(max-width: 1100px)');
    expect(ruleFor(fallbacks, '.headline')).toMatch(/grid-template-columns:\s*1fr/);
  });

  it('sets the hero figure size once, on the class both tiles share', () => {
    // Stacking is exactly when a designer is tempted to shrink "the second
    // one". The only rule allowed to name --fs-hero is `.headline__value`,
    // which both 445,495 and 365,023 carry.
    const heroRules = [...rulesIn(panels), ...rulesIn(views)]
      .filter((rule) => rule.body.includes('--fs-hero'))
      .flatMap((rule) => rule.selectors);
    expect(heroRules).toEqual(['.headline__value']);
  });

  it('never gives one tile a type size, weight or opacity the other lacks', () => {
    const offending: string[] = [];
    for (const rule of [...rulesIn(panels), ...rulesIn(views)]) {
      for (const selector of rule.selectors) {
        if (!/headline__tile--(gap|reported)/.test(selector)) continue;
        if (
          /(^|;)\s*(font-size|font-weight|opacity|transform|visibility|display)\s*:/.test(
            rule.body,
          )
        ) {
          offending.push(`${selector} {${rule.body.trim()}}`);
        }
      }
    }
    // Colour is the *only* difference the stylesheet is allowed to make, and
    // colour alone never carries the meaning (NFR-8) — the label says
    // "Not in any Relief Camp or Relief Distribution Centre" in words.
    expect(offending).toEqual([]);
  });

  it('keeps both tiles the same minimum height, in the shared rule', () => {
    expect(ruleFor(outsideMediaQueries(panels), '.headline__tile')).toMatch(/min-height:/);
  });
});
