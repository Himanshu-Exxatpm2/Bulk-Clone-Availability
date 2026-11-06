import { Availability } from '../../../data/mockAvailabilities';
import { locationInfo } from '../../../data/locations';

// Naming rules shared by the Naming step (preview) and the wizard (final names).
// Final names are always worked out from the rows still in the batch, so removing
// a row in Review re-numbers the rest instead of leaving an orphan "#2".

export type FieldName =
  | 'location'
  | 'locationCity'
  | 'locationState'
  | 'yearOfStartDate'
  | 'discipline'
  | 'programType'
  | 'experienceType';

/** The new dates the clones will get, by availability id. The year of start date comes from here. */
export type NewDates = Record<string, { startDate: string; endDate: string }>;

export const TOKENS: Array<{ token: string; label: string; field: FieldName }> = [
  { token: '@location',        label: 'Location Name',   field: 'location' },
  { token: '@location_city',   label: 'Location City',   field: 'locationCity' },
  { token: '@location_state',  label: 'Location State',  field: 'locationState' },
  { token: '@year_of_start_date', label: 'Year of Start Date', field: 'yearOfStartDate' },
  { token: '@discipline',      label: 'Discipline',      field: 'discipline' },
  { token: '@program_type',    label: 'Program Type',    field: 'programType' },
  { token: '@experience_type', label: 'Experience Type', field: 'experienceType' },
];

export const TOKEN_TO_FIELD: Record<string, FieldName> = Object.fromEntries(
  TOKENS.map(({ token, field }) => [token, field]),
);

const TOKEN_PATTERN = /@\w+/g;

export function parseLocations(location: string): string[] {
  if (!location) return [];
  return location.split(',').map((s) => s.trim()).filter(Boolean);
}

/** Locations the clone will keep: inactive ones are left out, unless that would leave none. */
export function keptLocations(location: string): string[] {
  const all = parseLocations(location);
  const active = all.filter((l) => locationInfo(l).active);
  return active.length > 0 ? active : all;
}

/** "A" for one, "A (+2)" when more follow. Used for several locations. */
function firstWithMore(values: string[]): string {
  if (values.length === 0) return '';
  return values.length === 1 ? values[0] : `${values[0]} (+${values.length - 1})`;
}

/** Up to 3 values are spelled out; beyond that "A (+n)". Used for several disciplines. */
function spelledOrMore(values: string[]): string {
  return values.length <= 3 ? values.join(', ') : firstWithMore(values);
}

export function fieldValue(a: Availability, field: FieldName, dates?: NewDates): string {
  const locs = keptLocations(a.location);
  switch (field) {
    // Several locations: the first, then how many more. City and state are not suffixed (they are
    // almost always shared), so they come from the first location.
    case 'location':        return firstWithMore(locs);
    case 'locationCity':    return locs[0] ? locationInfo(locs[0]).city : '';
    case 'locationState':   return locs[0] ? locationInfo(locs[0]).state : '';
    // The year the clone starts, so it follows the dates chosen in the Dates step
    case 'yearOfStartDate': return (dates?.[a.id]?.startDate ?? a.startDate).slice(0, 4);
    case 'discipline':      return spelledOrMore(parseLocations(a.discipline ?? ''));
    case 'programType':     return a.programType ?? '';
    case 'experienceType':  return a.experienceType ?? '';
  }
}

/**
 * Collapses runs of spaces and trims, so "A  #2 " can't sit next to "A #2". Also
 * drops the doubled or dangling separator a blank field leaves ("A – – B" → "A – B").
 */
export function cleanName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .replace(/([-–—|])(\s*[-–—|])+/g, '$1')
    .replace(/^[\s\-–—|]+|[\s\-–—|]+$/g, '')
    .trim();
}

/** Comparison key: case- and spacing-insensitive. */
export function nameKey(name: string): string {
  return cleanName(name).toLowerCase();
}

/** Merge-field-looking words in the template that aren't real fields, e.g. "@locaton". */
export function unknownTokens(template: string): string[] {
  return Array.from(new Set((template.match(TOKEN_PATTERN) ?? []).filter((t) => !TOKEN_TO_FIELD[t])));
}

export function resolveName(a: Availability, template: string, dates?: NewDates): string {
  if (!template.trim()) return '';
  return cleanName(
    template.replace(TOKEN_PATTERN, (tok) => {
      const field = TOKEN_TO_FIELD[tok];
      return field ? fieldValue(a, field, dates) : tok;
    }),
  );
}

export interface FinalName {
  name: string;
  /** Number added because the name was already taken. */
  suffix: number | null;
  /** Why the number was added. */
  clash: 'existing' | 'batch' | null;
}

/**
 * Final, unique names for the batch, in row order. A name already used by an
 * existing availability, or by an earlier row in this batch, gets the next free
 * " #n". Matching ignores case and spacing.
 */
export function finalizeNames(
  availabilities: Availability[],
  rawNames: Record<string, string>,
  existingNames: string[],
): Record<string, FinalName> {
  const existing = new Set(existingNames.map(nameKey));
  const taken = new Set(existing);
  const result: Record<string, FinalName> = {};
  for (const a of availabilities) {
    const base = cleanName(rawNames[a.id] ?? '');
    if (!base) {
      result[a.id] = { name: '', suffix: null, clash: null };
      continue;
    }
    let candidate = base;
    let n = 1;
    while (taken.has(nameKey(candidate))) {
      n += 1;
      candidate = `${base} #${n}`;
    }
    taken.add(nameKey(candidate));
    result[a.id] = {
      name: candidate,
      suffix: n > 1 ? n : null,
      clash: n > 1 ? (existing.has(nameKey(base)) ? 'existing' : 'batch') : null,
    };
  }
  return result;
}
