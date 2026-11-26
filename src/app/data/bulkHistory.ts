import { Availability } from './mockAvailabilities';

// Bulk Creation History: one entry per bulk job, from Bulk Creation or
// Bulk Clone. Creating a single availability is not recorded here; it already
// shows in the Availability list.

export type HistoryType = 'Bulk Creation' | 'Bulk Clone';
// Cancelled and Undone are left out until those features exist
export type HistoryStatus = 'In progress' | 'Completed' | 'Partially completed' | 'Failed';

export interface HistoryRow {
  /** The record in the Availability list; missing when nothing was created */
  availabilityId?: string;
  /** Name the coordinator saw in the Naming step */
  stepOneName: string;
  /** Name the availability was saved under; for a row that was not created, the name it would have had */
  savedName: string;
  /** The availability that was selected to be cloned, as it was named then */
  originalName?: string;
  /** The selected original in the Availability list, if it still exists */
  sourceId?: string;
  /** created: a clone exists. failed: nothing was created, `problems` says why. */
  status: 'created' | 'failed';
  problems?: Array<{ problem: string; fix: string }>;
}

export interface HistoryEntry {
  id: string;
  type: HistoryType;
  /** ISO date-time, UTC */
  ranAt: string;
  runBy: string;
  status: HistoryStatus;
  namePattern: string;
  total: number;
  created: number;
  failed: number;
  /** Bulk Clone only: short description of what was cloned and where it went */
  source?: string;
  target?: string;
  /** Per-row results; older entries do not have them */
  rows?: HistoryRow[];
}

export function statusFor(created: number, failed: number): HistoryStatus {
  if (failed > 0 && created === 0) return 'Failed';
  if (failed > 0) return 'Partially completed';
  return 'Completed';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function monthYear(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
function range(isos: string[]): string {
  const sorted = [...isos].sort();
  const a = monthYear(sorted[0]);
  const b = monthYear(sorted[sorted.length - 1]);
  return a === b ? a : `${a} – ${b}`;
}

/** The user shown as "Run by", in the same form the production history uses */
export const CURRENT_USER_EMAIL = 'snehal@exxat.com';

/** e.g. "124 availabilities" */
export function describeSource(rows: Availability[]): string {
  return `${rows.length} ${rows.length === 1 ? 'availability' : 'availabilities'}`;
}

/** e.g. "Roll forward: +1 year" or "Custom: Dec 2026 – May 2027" */
export function describeTarget(
  mode: 'roll' | 'custom',
  rollMonths: number | undefined,
  dates: Array<{ startDate: string; endDate: string }>,
): string {
  if (mode === 'custom') return `Custom: ${range(dates.flatMap((d) => [d.startDate, d.endDate]))}`;
  return `Roll forward: ${rollMonths === 12 ? '+1 year' : `+${rollMonths} months`}`;
}

export const SEED_HISTORY: HistoryEntry[] = [
  {
    id: 'h-clone-3',
    type: 'Bulk Clone',
    ranAt: '2026-10-29T14:10:00Z',
    runBy: 'darp_test@mailinator.com',
    status: 'Partially completed',
    namePattern: '@location - @discipline - Spring 2027',
    total: 3,
    created: 2,
    failed: 1,
    source: '3 availabilities',
    target: 'Roll forward: +1 year',
    rows: [
      { availabilityId: 'seed-h3-1', stepOneName: 'MedStar ICU - Nursing - Spring 2027', savedName: 'MedStar ICU - Nursing - Spring 2027', status: 'created' },
      { availabilityId: 'seed-h3-2', stepOneName: 'MedStar NICU - Nursing - Spring 2027', savedName: 'MedStar NICU - Nursing - Spring 2027', status: 'created' },
      {
        stepOneName: 'MedStar Legacy Rehab - Physical Therapy - Spring 2027',
        savedName: 'MedStar Legacy Rehab - Physical Therapy - Spring 2027',
        originalName: 'MedStar PT - Spring Session #1 2024',
        sourceId: 'avail-011',
        status: 'failed',
        problems: [
          {
            problem: 'Not created: MedStar Legacy Rehabilitation Center is inactive.',
            fix: 'Make the location active, then clone the availability again.',
          },
        ],
      },
    ],
  },
  {
    id: 'h-clone-2',
    type: 'Bulk Clone',
    ranAt: '2026-10-20T09:42:00Z',
    runBy: 'ruchita.parikh@exxat.com',
    status: 'Completed',
    namePattern: '@location - @program_type - Fall 2026',
    total: 2,
    created: 2,
    failed: 0,
    source: '2 availabilities',
    target: 'Custom: Sep 2026 – Dec 2026',
    rows: [
      { availabilityId: 'seed-h2-1', stepOneName: 'Hendrick ICU - BSN - Fall 2026', savedName: 'Hendrick ICU - BSN - Fall 2026', status: 'created' },
      { availabilityId: 'seed-h2-2', stepOneName: 'Hendrick ICU - BSN - Fall 2026 #2', savedName: 'Hendrick ICU - BSN - Fall 2026 #2', status: 'created' },
    ],
  },
  {
    id: 'h-clone-1',
    type: 'Bulk Clone',
    ranAt: '2026-10-12T16:05:00Z',
    runBy: 'siteadminsingle@exxat.testinator.com',
    status: 'Failed',
    namePattern: '@location - Summer 2027',
    total: 4,
    created: 0,
    failed: 4,
    source: '4 availabilities',
    target: 'Roll forward: +1 year',
    rows: [
      { stepOneName: 'MedStar ICU - Summer 2027', savedName: 'MedStar ICU - Summer 2027', originalName: 'MedStar ICU - Spring Session #1 2025', sourceId: 'avail-001', status: 'failed', problems: [{ problem: 'Not created: MedStar ICU is inactive.', fix: 'Make the location active, then clone the availability again.' }] },
      { stepOneName: 'MedStar NICU - Summer 2027', savedName: 'MedStar NICU - Summer 2027', originalName: 'MedStar NICU - Fall Session #1 2025', sourceId: 'avail-004', status: 'failed', problems: [{ problem: 'Not created: MedStar NICU is inactive.', fix: 'Make the location active, then clone the availability again.' }] },
      { stepOneName: 'Hendrick ICU - Summer 2027', savedName: 'Hendrick ICU - Summer 2027', originalName: 'Hendrick ICU Nursing Rotation', sourceId: 'avail-015', status: 'failed', problems: [{ problem: 'Not created: Hendrick ICU is inactive.', fix: 'Make the location active, then clone the availability again.' }] },
      { stepOneName: 'Hendrick Pharmacy - Summer 2027', savedName: 'Hendrick Pharmacy - Summer 2027', originalName: 'Hendrick Pharmacy - Summer 2026', status: 'failed', problems: [{ problem: 'The original availability was deleted before the clone ran.', fix: 'Nothing to do unless the delete was a mistake; then restore the original and clone it again.' }] },
    ],
  },
  { id: 'h-m-6', type: 'Bulk Creation', ranAt: '2026-10-26T16:35:00Z', runBy: 'siteadminsingle@exxat.testinator.com', status: 'Completed', namePattern: '@availability_id WishlistAndExxatOne', total: 1, created: 1, failed: 0 },
  { id: 'h-m-5', type: 'Bulk Creation', ranAt: '2026-09-15T11:24:00Z', runBy: 'darp_test@mailinator.com', status: 'Completed', namePattern: '@availability_id@location_name', total: 2, created: 2, failed: 0 },
  { id: 'h-m-4', type: 'Bulk Creation', ranAt: '2026-08-03T14:32:00Z', runBy: 'darp_test@mailinator.com', status: 'Completed', namePattern: '@availability_id@location_city', total: 2, created: 2, failed: 0 },
  { id: 'h-m-3', type: 'Bulk Creation', ranAt: '2026-06-30T12:43:00Z', runBy: 'darp_test@mailinator.com', status: 'Completed', namePattern: '@availability_id@location_name', total: 3, created: 3, failed: 0 },
  { id: 'h-m-2', type: 'Bulk Creation', ranAt: '2026-05-12T16:31:00Z', runBy: 'darp_test@mailinator.com', status: 'Completed', namePattern: '@availability_id', total: 3, created: 3, failed: 0 },
  { id: 'h-m-1', type: 'Bulk Creation', ranAt: '2026-02-04T11:12:00Z', runBy: 'darp_test@mailinator.com', status: 'Completed', namePattern: 'test @availability_id', total: 101, created: 101, failed: 0 },
];
