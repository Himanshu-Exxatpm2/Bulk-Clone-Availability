import { Availability } from './mockAvailabilities';

// Bulk Creation History: one entry per bulk job, from Multiple Availabilities or
// Bulk Clone. Creating a single availability is not recorded here; it already
// shows in the Availability list.

export type HistoryType = 'Multiple Availabilities' | 'Bulk Clone';
// Cancelled and Undone are left out until those features exist
export type HistoryStatus = 'In progress' | 'Completed' | 'Completed with issues' | 'Failed';

export interface HistoryRow {
  /** Name the coordinator saw in the Naming step */
  stepOneName: string;
  /** Name the availability was saved under */
  savedName: string;
  status: 'created' | 'draft' | 'failed';
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
  drafts: number;
  failed: number;
  /** Bulk Clone only: short description of what was cloned and where it went */
  source?: string;
  target?: string;
  /** Per-row results; older entries do not have them */
  rows?: HistoryRow[];
}

export function statusFor(created: number, drafts: number, failed: number): HistoryStatus {
  if (failed > 0 && created + drafts === 0) return 'Failed';
  if (failed > 0 || drafts > 0) return 'Completed with issues';
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

/** e.g. "12 availabilities · Nursing, Physical Therapy · Jan 2026 – Dec 2026"; names are dropped above three disciplines */
export function describeSource(rows: Availability[]): string {
  const disciplines = Array.from(new Set(rows.map((a) => a.discipline))).sort();
  return [
    `${rows.length} ${rows.length === 1 ? 'availability' : 'availabilities'}`,
    disciplines.length <= 3 ? disciplines.join(', ') : `${disciplines.length} disciplines`,
    range([...rows.map((a) => a.startDate), ...rows.map((a) => a.endDate)]),
  ].join(' · ');
}

/** e.g. "Jan 2027 – Dec 2027 (+1 year)" or "Custom: Jan 2027 – Mar 2027" */
export function describeTarget(
  mode: 'roll' | 'custom',
  rollMonths: number | undefined,
  dates: Array<{ startDate: string; endDate: string }>,
  /** Rows whose dates were changed by hand after the roll or range was applied */
  edited = 0,
): string {
  const span = range(dates.flatMap((d) => [d.startDate, d.endDate]));
  const note = edited > 0 ? `, ${edited} ${edited === 1 ? 'row' : 'rows'} edited` : '';
  if (mode === 'custom') return `Custom: ${span}${note}`;
  const shift = rollMonths === 12 ? '+1 year' : `+${rollMonths} months`;
  return `${span} (${shift}${note})`;
}

export const SEED_HISTORY: HistoryEntry[] = [
  {
    id: 'h-clone-3',
    type: 'Bulk Clone',
    ranAt: '2026-10-29T14:10:00Z',
    runBy: 'darp_test@mailinator.com',
    status: 'Completed with issues',
    namePattern: '@location - @discipline - Spring 2027',
    total: 3,
    created: 2,
    drafts: 1,
    failed: 0,
    source: '3 availabilities · Nursing, Physical Therapy · Sep 2025 – Dec 2025',
    target: 'Sep 2026 – Dec 2026 (+1 year)',
    rows: [
      { stepOneName: 'MedStar ICU - Nursing - Spring 2027', savedName: 'MedStar ICU - Nursing - Spring 2027', status: 'created' },
      { stepOneName: 'MedStar NICU - Nursing - Spring 2027', savedName: 'MedStar NICU - Nursing - Spring 2027', status: 'created' },
      {
        stepOneName: 'MedStar Legacy Rehab - Physical Therapy - Spring 2027',
        savedName: 'MedStar Legacy Rehab - Physical Therapy - Spring 2027',
        status: 'draft',
        problems: [
          {
            problem: 'Location Group "MedStar Legacy Rehab Group" is no longer active in the system.',
            fix: 'Open the draft, choose an active Location Group, then save it. It then goes live as its publish preference says.',
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
    drafts: 0,
    failed: 0,
    source: '2 availabilities · Nursing · Jan 2025 – Apr 2025',
    target: 'Custom: Sep 2026 – Dec 2026',
    rows: [
      { stepOneName: 'Hendrick ICU - BSN - Fall 2026', savedName: 'Hendrick ICU - BSN - Fall 2026', status: 'created' },
      { stepOneName: 'Hendrick ICU - BSN - Fall 2026 #2', savedName: 'Hendrick ICU - BSN - Fall 2026 #2', status: 'created' },
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
    drafts: 0,
    failed: 4,
    source: '4 availabilities · Nursing, Pharmacy · May 2026 – Aug 2026',
    target: 'May 2027 – Aug 2027 (+1 year)',
    rows: [
      { stepOneName: 'MedStar ICU - Summer 2027', savedName: 'MedStar ICU - Summer 2027', status: 'failed' },
      { stepOneName: 'MedStar NICU - Summer 2027', savedName: 'MedStar NICU - Summer 2027', status: 'failed' },
      { stepOneName: 'Hendrick ICU - Summer 2027', savedName: 'Hendrick ICU - Summer 2027', status: 'failed' },
      { stepOneName: 'Hendrick Pharmacy - Summer 2027', savedName: 'Hendrick Pharmacy - Summer 2027', status: 'failed' },
    ],
  },
  { id: 'h-m-6', type: 'Multiple Availabilities', ranAt: '2026-10-26T16:35:00Z', runBy: 'siteadminsingle@exxat.testinator.com', status: 'Completed', namePattern: '@availability_id WishlistAndExxatOne', total: 1, created: 1, drafts: 0, failed: 0 },
  { id: 'h-m-5', type: 'Multiple Availabilities', ranAt: '2026-09-15T11:24:00Z', runBy: 'darp_test@mailinator.com', status: 'Completed', namePattern: '@availability_id@location_name', total: 2, created: 2, drafts: 0, failed: 0 },
  { id: 'h-m-4', type: 'Multiple Availabilities', ranAt: '2026-08-03T14:32:00Z', runBy: 'darp_test@mailinator.com', status: 'Completed', namePattern: '@availability_id@location_city', total: 2, created: 2, drafts: 0, failed: 0 },
  { id: 'h-m-3', type: 'Multiple Availabilities', ranAt: '2026-06-30T12:43:00Z', runBy: 'darp_test@mailinator.com', status: 'Completed', namePattern: '@availability_id@location_name', total: 3, created: 3, drafts: 0, failed: 0 },
  { id: 'h-m-2', type: 'Multiple Availabilities', ranAt: '2026-05-12T16:31:00Z', runBy: 'darp_test@mailinator.com', status: 'Completed', namePattern: '@availability_id', total: 3, created: 3, drafts: 0, failed: 0 },
  { id: 'h-m-1', type: 'Multiple Availabilities', ranAt: '2026-02-04T11:12:00Z', runBy: 'darp_test@mailinator.com', status: 'Completed', namePattern: 'test @availability_id', total: 101, created: 101, drafts: 0, failed: 0 },
];
