import { Availability } from '../../../data/mockAvailabilities';

// Naming rules shared by the Naming step (preview) and the wizard (final names
// and draft reasons).
// Final names are always worked out from the rows still in the batch, so removing
// a row in Review re-numbers the rest instead of leaving an orphan "#2".

export type FieldName = 'location' | 'discipline' | 'programType' | 'experienceType';

export const TOKENS: Array<{ token: string; label: string; field: FieldName }> = [
  { token: '@location',        label: 'Location',        field: 'location' },
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

export function fieldValue(
  a: Availability,
  field: FieldName,
  locationOverrides: Record<string, string>,
): string {
  switch (field) {
    case 'location': {
      const locs = parseLocations(a.location);
      if (locs.length === 1) return locs[0];
      // No pick on a multi-location availability: use the location exactly as it was
      return locs.length > 1 ? locationOverrides[a.id] ?? a.location : '';
    }
    case 'discipline':     return a.discipline ?? '';
    case 'programType':    return a.programType ?? '';
    case 'experienceType': return a.experienceType ?? '';
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

export function resolveName(
  a: Availability,
  template: string,
  locationOverrides: Record<string, string>,
): string {
  if (!template.trim()) return '';
  return cleanName(
    template.replace(TOKEN_PATTERN, (tok) => {
      const field = TOKEN_TO_FIELD[tok];
      return field ? fieldValue(a, field, locationOverrides) : tok;
    }),
  );
}

/**
 * Labels of fields in the template that have no value on this availability
 * (e.g. its Program Type was retired, or no location was picked for a
 * multi-location availability). Such a clone is saved as a draft when created.
 */
export function blankFields(
  a: Availability,
  template: string,
  locationOverrides: Record<string, string>,
): string[] {
  const used = Array.from(new Set(template.match(TOKEN_PATTERN) ?? []));
  return used
    .filter((t) => TOKEN_TO_FIELD[t])
    .filter((t) => fieldValue(a, TOKEN_TO_FIELD[t], locationOverrides) === '')
    .map((t) => TOKENS.find((x) => x.token === t)!.label);
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
