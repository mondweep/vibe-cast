/**
 * The District names this parser has heard of — and the strict limits on what
 * that entitles it to do.
 *
 * WHY THE PARSER NEEDS A VOCABULARY AT ALL. DRIMS sizes the District column to
 * fit, and when a name does not fit it wraps mid-word: `Charaid` / `eo`,
 * `Bongaigao` / `n`, `Karbi` / `Anglong`, `Kamrup` / `(M)`. Geometry cannot
 * tell those apart from two genuine Districts that happen to print on adjacent
 * lines — on 2026-07-27 `Dhemaji`, `Nagaon` and `Kamrup (M)` each occupy a row
 * whose every other cell is empty, which is exactly the shape a name tail has.
 * A purely geometric rule therefore merges real Districts, and merging Kamrup
 * with Kamrup (M) is a wrong answer rather than a missing one. So the join has
 * to be *evidenced*, and this list is the evidence.
 *
 * WHY IT LIVES HERE AND NOT IN THE SHARED KERNEL. It is tempting: the roster of
 * Assam's Districts looks like domain knowledge. It is not, in this codebase.
 * The domain treats `DistrictName` as an opaque validated string on purpose
 * (ADR-0005: a District we have never heard of is still a District, and its
 * figures are unknown, never zero). A closed roster in `domain/shared` would
 * be an open invitation to *validate* against it, and the moment anything does
 * that, Bajali and Tamulpur — created in 2020 and 2022, after every open
 * dataset this project ships — stop being Districts. Down here it can only ever
 * be what it is: a hint used to justify a repair of a PDF layout artefact.
 * Nothing reads it to decide whether a District is real.
 *
 * WHY IT IS NOT `src/generated/assam-districts.ts`. That artefact is Census
 * 2011 (33 Districts, no Bajali, no Tamulpur, Karimganj not yet renamed
 * Sribhumi), it is regenerated from a GeoJSON whose purpose is polygons, and
 * importing it would put half a megabyte of coordinates behind the parser.
 * `src/adapters/pdf/assam-districts.test.ts` nonetheless asserts this list
 * *covers* that one, so the two cannot silently diverge.
 *
 * WHY IT IS NOT `src/adapters/ui/choropleth-scale.ts` either. That module's
 * alias table maps ASDMA spellings onto *boundary-dataset* spellings so a
 * polygon can be found; ours answers a different question — "is this string a
 * District name at all?" — and the parser must not depend on the UI adapter.
 * The small overlap is deliberate duplication between two layers, not a
 * missing abstraction.
 *
 * INCOMPLETE BY DESIGN, AND THAT IS SAFE. Assam will create more Districts.
 * A name this list does not know is not thereby invalid: an unwrapped name is
 * never touched, whatever it says, and a wrapped one whose join cannot be
 * evidenced is left exactly as it was printed. The cost of a missing entry is
 * a name we decline to repair; there is no path by which it becomes a name we
 * invent or a District we drop.
 */

/**
 * Every District of Assam, plus the spellings ASDMA itself prints.
 *
 * Thirty-five Districts: the 33 of Census 2011, plus Bajali (2020) and
 * Tamulpur (2022). The rest of the list is spellings the bulletins actually
 * use for those same Districts — `Kamrup (M)` for Kamrup Metropolitan,
 * `Sribhumi` for the District renamed from Karimganj in 2024, and the variants
 * DRIMS has printed across the days in `fixtures/`.
 */
export const ASSAM_DISTRICT_VOCABULARY: readonly string[] = [
  // The 33 of Census 2011, spelled as the boundary dataset spells them.
  'Baksa',
  'Barpeta',
  'Biswanath',
  'Bongaigaon',
  'Cachar',
  'Charaideo',
  'Chirang',
  'Darrang',
  'Dhemaji',
  'Dhubri',
  'Dibrugarh',
  'Dima Hasao',
  'Goalpara',
  'Golaghat',
  'Hailakandi',
  'Hojai',
  'Jorhat',
  'Kamrup',
  'Kamrup Metropolitan',
  'Karbi Anglong',
  'Karimganj',
  'Kokrajhar',
  'Lakhimpur',
  'Majuli',
  'Morigaon',
  'Nagaon',
  'Nalbari',
  'Sivasagar',
  'Sonitpur',
  'South Salmara Mankachar',
  'Tinsukia',
  'Udalguri',
  'West Karbi Anglong',
  // Created after the census the boundary data is drawn from.
  'Bajali',
  'Tamulpur',
  // ASDMA's own spellings for Districts already listed above. Each is a name
  // the bulletins print; none of them is a new District.
  'Kamrup (M)',
  'Kamrup (R)',
  'Sribhumi',
  'Sibsagar',
  'Marigaon',
  'Bishwanath',
  'North Cachar Hills',
];

/**
 * The form two spellings of one District agree on.
 *
 * Case-folded, and with the punctuation ASDMA sprinkles through names turned
 * into spaces so `Kamrup (M)`, `Kamrup(M)` and `Kamrup M` are one key while
 * `Kamrup` stays a different one. Deliberately NOT `normaliseName` from the
 * shared kernel, which only folds whitespace and case.
 */
export const districtNameKey = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/[().,'’\-–—_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const KEYS: ReadonlySet<string> = new Set(ASSAM_DISTRICT_VOCABULARY.map(districtNameKey));

/** Whether this text names a District of Assam that we have heard of. */
export const knownDistrictName = (raw: string): boolean => {
  const key = districtNameKey(raw);
  return key !== '' && KEYS.has(key);
};
