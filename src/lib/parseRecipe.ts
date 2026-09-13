/**
 * Parses a recipe markdown body (SPEC.md section 2) into structured sections.
 * Line-based on purpose: the bodies use a tiny markdown subset
 * (H2/H3 headings, "- " bullets, "1. " numbered steps, **bold**, plain lines).
 * Throws on a malformed body so `astro build` fails loudly.
 */

export type Block =
  | { kind: 'heading'; text: string } // H3 sub-group, e.g. "לבצק"
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'paragraph'; text: string };

export interface ParsedRecipe {
  ingredients: Block[];
  steps: Block[];
  notes: Block[];
}

const SECTION_ORDER = ['מצרכים', 'הכנה', 'הערות'] as const;
type SectionName = (typeof SECTION_ORDER)[number];

const SECTION_KEY: Record<SectionName, keyof ParsedRecipe> = {
  מצרכים: 'ingredients',
  הכנה: 'steps',
  הערות: 'notes',
};

export function parseRecipeBody(body: string, id = '?'): ParsedRecipe {
  const result: ParsedRecipe = { ingredients: [], steps: [], notes: [] };
  const seen: SectionName[] = [];
  let current: Block[] | null = null;
  let openList: Extract<Block, { kind: 'list' }> | null = null;

  const fail = (msg: string, line?: number): never => {
    throw new Error(`[recipe ${id}] ${msg}${line !== undefined ? ` (שורה ${line})` : ''}`);
  };

  const lines = body.replace(/\r\n?/g, '\n').split('\n');

  lines.forEach((raw, i) => {
    const lineNo = i + 1;
    const line = raw.trimEnd();

    if (line.trim() === '') {
      openList = null;
      return;
    }

    const h2 = /^##\s+(.+?)\s*$/.exec(line);
    if (h2) {
      const name = h2[1] as SectionName;
      if (!SECTION_ORDER.includes(name)) fail(`כותרת לא מוכרת: "${name}"`, lineNo);
      if (seen.includes(name)) fail(`כותרת כפולה: "${name}"`, lineNo);
      const expectedIdx = seen.length === 0 ? 0 : SECTION_ORDER.indexOf(seen[seen.length - 1]!) + 1;
      if (SECTION_ORDER.indexOf(name) < expectedIdx) fail(`סדר כותרות שגוי: "${name}"`, lineNo);
      seen.push(name);
      current = result[SECTION_KEY[name]];
      openList = null;
      return;
    }

    if (current === null) return fail('תוכן לפני הכותרת הראשונה', lineNo);
    const section: Block[] = current;

    const h3 = /^###\s+(.+?)\s*$/.exec(line);
    if (h3) {
      section.push({ kind: 'heading', text: h3[1]! });
      openList = null;
      return;
    }

    if (/^#/.test(line)) fail(`רמת כותרת לא נתמכת: "${line}"`, lineNo);

    const bullet = /^\s*[-*]\s+(.+)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    const item = bullet ?? numbered;
    if (item) {
      const ordered = numbered !== null && bullet === null;
      if (!openList || openList.ordered !== ordered) {
        openList = { kind: 'list', ordered, items: [] };
        section.push(openList);
      }
      openList.items.push(item[1]!.trim());
      return;
    }

    // Continuation of the previous list item (indented text) or a plain paragraph.
    if (openList && /^\s+\S/.test(raw)) {
      openList.items[openList.items.length - 1] += ' ' + line.trim();
      return;
    }
    openList = null;
    section.push({ kind: 'paragraph', text: line.trim() });
  });

  if (!seen.includes('מצרכים')) fail('חסרה כותרת "## מצרכים"');
  if (!seen.includes('הכנה')) fail('חסרה כותרת "## הכנה"');
  if (listItems(result.ingredients).length === 0) fail('אין מצרכים');
  if (listItems(result.steps).length === 0) fail('אין שלבי הכנה');

  return result;
}

/** All list items of a section, flattened (used by cooking mode for the step cards). */
export function listItems(blocks: Block[]): string[] {
  return blocks.flatMap((b) => (b.kind === 'list' ? b.items : []));
}

const FRACTIONS = '½¼¾⅓⅔⅛⅜⅝⅞';

/**
 * Inline markdown -> safe HTML: escapes HTML, renders **bold**, and wraps
 * numeric ranges ("20-30", "¼-½", "1½-2") in <span dir="ltr"> so the bidi
 * algorithm cannot flip them in RTL text. Prefix hyphens ("כ-30", "ב-¾") are * left alone: they read correctly as-is.
 */
export function inlineHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const rangeRe = new RegExp(
    `(?<![\\w${FRACTIONS}])([\\d${FRACTIONS}]+(?:[.,]\\d+)?\\s?[-–]\\s?[\\d${FRACTIONS}]+(?:[.,]\\d+)?)(?![\\w${FRACTIONS}])`,
    'g',
  );

  // "כ-30", "ל-38-40", "ב-¾": keep the prefix letter, hyphen and number on one line.
  const prefixRe = new RegExp(
    `(?<![\\u0590-\\u05FF])([\\u0590-\\u05FF]{1,2}-(?:<span class="num" dir="ltr">[^<]*</span>|[\\d${FRACTIONS}]+(?:[.,]\\d+)?))(?![\\w${FRACTIONS}])`,
    'g',
  );

  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(rangeRe, '<span class="num" dir="ltr">$1</span>')
    .replace(prefixRe, '<span class="nobr">$1</span>');
}

/** "30 דק׳", "שעה", "שעה וחצי", "שעתיים", "3 שעות", "שעה ו-15 דק׳" */
export function formatMinutes(min: number): string {
  if (min < 60) return `${min} דק׳`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  const hours = h === 1 ? 'שעה' : h === 2 ? 'שעתיים' : `${h} שעות`;
  if (m === 0) return hours;
  if (m === 30 && h === 1) return 'שעה וחצי';
  if (m === 30) return `${hours} וחצי`;
  return `${hours} ו-${m} דק׳`;
}

const HEB = '\\u0590-\\u05FF';
const WORD_NUMBERS: Record<string, number> = {
  שתי: 2, שתיים: 2, שלוש: 3, ארבע: 4, חמש: 5, שש: 6, שבע: 7, שמונה: 8, תשע: 9, עשר: 10, עשרים: 20,
};
const NUM = '(\\d+(?:[.,]\\d+)?)(?:\\s?[-–]\\s?\\d+(?:[.,]\\d+)?)?'; // first number of a range

/**
 * First duration mentioned in a step, in seconds, or null.
 * Understands "20 דקות", "20-30 דקות", "דקה", "30 שניות", "חצי שעה",
 * "רבע שעה", "שעה וחצי", "שעתיים", "3 שעות", "שעה". A range uses its first number.
 */
export function detectDurationSeconds(text: string): number | null {
  // A single Hebrew prefix letter (כחצי שעה, לשעה, ובשעתיים) is allowed before word forms.
  const P = `(?<![${HEB}])[כלבוה]?`;
  const patterns: Array<[RegExp, (m: RegExpMatchArray) => number]> = [
    [new RegExp(`${NUM}\\s*(?:דקות|דק׳|דק')(?![${HEB}])`), (m) => parseFloat(m[1]!.replace(',', '.')) * 60],
    [new RegExp(`${P}חצי דקה(?![${HEB}])`), () => 30],
    [new RegExp(`(?<![${HEB}])(${Object.keys(WORD_NUMBERS).join('|')})\\s+דקות(?![${HEB}])`), (m) => WORD_NUMBERS[m[1]!]! * 60],
    [new RegExp(`${P}דקה(?![${HEB}])`), () => 60],
    [new RegExp(`${NUM}\\s*שניות(?![${HEB}])`), (m) => parseFloat(m[1]!.replace(',', '.'))],
    [new RegExp(`${P}שעה וחצי(?![${HEB}])`), () => 90 * 60],
    [new RegExp(`${P}שעתיים(?![${HEB}])`), () => 120 * 60],
    [new RegExp(`${P}חצי שעה(?![${HEB}])`), () => 30 * 60],
    [new RegExp(`${P}רבע שעה(?![${HEB}])`), () => 15 * 60],
    [new RegExp(`${NUM}\\s*שעות(?![${HEB}])`), (m) => parseFloat(m[1]!.replace(',', '.')) * 3600],
    [new RegExp(`${P}שעה(?![${HEB}])`), () => 60 * 60],
  ];

  let best: { index: number; seconds: number } | null = null;
  for (const [re, toSeconds] of patterns) {
    const m = re.exec(text);
    if (!m || m.index === undefined) continue;
    const seconds = Math.round(toSeconds(m));
    if (seconds > 0 && (best === null || m.index < best.index)) best = { index: m.index, seconds };
  }
  return best ? best.seconds : null;
}

/** Short Hebrew label for a timer button: "30 שנ׳", "20 דק׳", "שעה וחצי". */
export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds} שנ׳`;
  return formatMinutes(Math.round(seconds / 60));
}
