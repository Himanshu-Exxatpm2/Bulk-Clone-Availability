// Published = accepting requests; Scheduled = publish date is in the future (Publish When = "Scheduled"); Draft = "Do Not Publish" was chosen, not yet visible; Closed = no longer accepting requests.
export type AvailabilityStatus = 'Published' | 'Scheduled' | 'Draft' | 'Closed';
export type ExperienceType = 'Group' | 'Individual';
export type Tenant = 'MedStar' | 'ATI' | 'Hendrick';

export interface Availability {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  slotCount: number;
  location: string;
  locationGroup: string;
  discipline: string;
  programType: string;
  experienceType: ExperienceType;
  status: AvailabilityStatus;
  dueDate?: string;     // YYYY-MM-DD; last date schools can request this slot; only set on cloned rows
  tenant: Tenant;
  // List-page fields, matching the production Availability list columns
  availabilityId: string;    // 10-digit public ID shown in the list
  createdBy: string;         // "Last, First"
  createdOn: string;         // YYYY-MM-DD
  pendingRequests: number;
  requestedSlots: number;
  specializations: string[]; // Discipline/Specialization column: discipline first, then specializations
  programTypes: string[];    // Program Type column: full program names
  /** Prototype only: values the backend would reject when the clone is created. */
  retiredValues?: Array<'locationGroup' | 'discipline' | 'programType' | 'experienceType'>;
}

type ListFields =
  | 'availabilityId'
  | 'createdBy'
  | 'createdOn'
  | 'pendingRequests'
  | 'requestedSlots'
  | 'specializations'
  | 'programTypes';

// 15 records covering all 9 date-anchor patterns, the ambiguous Season+Year case,
// the MedStar Summer low-confidence case, and mixed disciplines for filter-narrowing.
const baseAvailabilities: Omit<Availability, ListFields>[] = [
  // ── MedStar Spring Session #1 ── anchor: Jan 1–Mar 14, 92%
  {
    id: 'avail-001',
    name: 'MedStar ICU - Spring Session #1 2025',
    startDate: '2025-01-01',
    endDate: '2025-03-14',
    slotCount: 4,
    location: 'MedStar Washington Hospital Center – ICU',
    locationGroup: 'MedStar DC Metro',
    discipline: 'Nursing',
    programType: 'BSN',
    experienceType: 'Group',
    status: 'Published',    tenant: 'MedStar',
  },
  // ── MedStar Spring Session #2 ── anchor: Mar 15–May 29, 91%
  {
    id: 'avail-002',
    name: 'MedStar ICU - Spring Session #2 2025',
    startDate: '2025-03-15',
    endDate: '2025-05-29',
    slotCount: 4,
    location: 'MedStar Washington Hospital Center – ICU',
    locationGroup: 'MedStar DC Metro',
    discipline: 'Nursing',
    programType: 'BSN',
    experienceType: 'Group',
    status: 'Published',    tenant: 'MedStar',
  },
  // ── MedStar Summer ── Season+Year ambiguous toggle + low-confidence dates (~60%)
  {
    id: 'avail-003',
    name: 'MedStar ICU - Summer 2025',
    startDate: '2025-05-24',
    endDate: '2025-08-22',
    slotCount: 3,
    location: 'MedStar Washington Hospital Center – ICU',
    locationGroup: 'MedStar DC Metro',
    discipline: 'Nursing',
    programType: 'BSN',
    experienceType: 'Group',
    status: 'Published',    tenant: 'MedStar',
  },
  // ── MedStar Fall Session #1 ── anchor: Aug 23–Oct 17, 92%
  {
    id: 'avail-004',
    name: 'MedStar NICU - Fall Session #1 2025',
    startDate: '2025-08-23',
    endDate: '2025-10-17',
    slotCount: 2,
    location: 'MedStar Georgetown University Hospital – NICU',
    locationGroup: 'MedStar DC Metro',
    discipline: 'Nursing',
    programType: 'BSN',
    experienceType: 'Individual',
    status: 'Published',    tenant: 'MedStar',
  },
  // ── MedStar Fall Session #2 ── anchor: Oct 18–Dec 19, 93%
  {
    id: 'avail-005',
    name: 'MedStar NICU - Fall Session #2 2025',
    startDate: '2025-10-18',
    endDate: '2025-12-19',
    slotCount: 2,
    location: 'MedStar Georgetown University Hospital – NICU',
    locationGroup: 'MedStar DC Metro',
    discipline: 'Nursing',
    programType: 'BSN',
    experienceType: 'Individual',
    status: 'Published',    tenant: 'MedStar',
  },
  // ── ATI Full Year (-YEAR) ── anchor: Jan 1–Dec 31, 99%
  {
    id: 'avail-006',
    name: 'ATI Physical Therapy Rotation-2025',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    slotCount: 6,
    location: 'ATI Physical Therapy – Rockville',
    locationGroup: 'ATI Mid-Atlantic',
    discipline: 'Physical Therapy',
    programType: 'DPT',
    experienceType: 'Individual',
    status: 'Published',    tenant: 'ATI',
  },
  // ── ATI H1 ── anchor: Jan 1–Jun 30, 100%
  {
    id: 'avail-007',
    name: 'ATI Occupational Therapy-H1 2025',
    startDate: '2025-01-01',
    endDate: '2025-06-30',
    slotCount: 4,
    location: 'ATI Physical Therapy – Bethesda',
    locationGroup: 'ATI Mid-Atlantic',
    discipline: 'Occupational Therapy',
    programType: 'MOT',
    experienceType: 'Individual',
    status: 'Published',    tenant: 'ATI',
  },
  // ── ATI H2 ── anchor: Jul 1–Dec 31, 100%
  {
    id: 'avail-008',
    name: 'ATI Occupational Therapy-H2 2025',
    startDate: '2025-07-01',
    endDate: '2025-12-31',
    slotCount: 4,
    location: 'ATI Physical Therapy – Bethesda',
    locationGroup: 'ATI Mid-Atlantic',
    discipline: 'Occupational Therapy',
    programType: 'MOT',
    experienceType: 'Individual',
    status: 'Published',    tenant: 'ATI',
  },
  // ── Hendrick Evergreen (no temporal marker) ── anchor: May 1–Dec 31 next yr, 100%
  {
    id: 'avail-009',
    name: 'Hendrick Medical Center Nursing Practicum',
    startDate: '2025-05-01',
    endDate: '2025-12-31',
    slotCount: 8,
    location: 'Hendrick Medical Center – Med/Surg',
    locationGroup: 'Hendrick West Texas',
    discipline: 'Nursing',
    programType: 'Pre-Licensure RN',
    experienceType: 'Group',
    status: 'Published',    tenant: 'Hendrick',
  },
  // ── Closed-status records ──
  {
    id: 'avail-010',
    name: 'MedStar Radiology - Fall Session #1 2024',
    startDate: '2024-08-23',
    endDate: '2024-10-17',
    slotCount: 3,
    location: 'MedStar Washington Hospital Center – Radiology',
    locationGroup: 'MedStar DC Metro',
    discipline: 'Radiology',
    programType: 'BS Radiologic Technology',
    experienceType: 'Individual',
    status: 'Closed',    tenant: 'MedStar',
  },
  {
    id: 'avail-011',
    name: 'MedStar PT - Spring Session #1 2024',
    startDate: '2024-01-01',
    endDate: '2024-03-14',
    slotCount: 2,
    location: 'MedStar National Rehabilitation Network',
    locationGroup: 'MedStar DC Metro',
    discipline: 'Physical Therapy',
    programType: 'DPT',
    experienceType: 'Individual',
    status: 'Closed',    tenant: 'MedStar',
  },
  {
    id: 'avail-012',
    name: 'ATI Speech-Language Pathology-2024',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    slotCount: 2,
    location: 'ATI Physical Therapy – Arlington',
    locationGroup: 'ATI Mid-Atlantic',
    discipline: 'Speech-Language Pathology',
    programType: 'MS-SLP',
    experienceType: 'Individual',
    status: 'Closed',    tenant: 'ATI',
  },
  // ── Additional Published rows for filter-narrowing exercise ──
  // Walkthrough: select avail-001 (Nursing) + avail-006 (PT) + avail-013 (OT),
  // then filter Discipline → Nursing → only avail-001 stays selected.
  {
    id: 'avail-013',
    name: 'MedStar OT - Spring Session #1 2025',
    startDate: '2025-01-01',
    endDate: '2025-03-14',
    slotCount: 3,
    location: 'MedStar Washington Hospital Center – OT',
    locationGroup: 'MedStar DC Metro',
    discipline: 'Occupational Therapy',
    programType: 'MOT',
    experienceType: 'Individual',
    status: 'Published',    tenant: 'MedStar',
  },
  {
    id: 'avail-014',
    name: 'MedStar Pharmacy - Fall Session #1 2025',
    startDate: '2025-08-23',
    endDate: '2025-10-17',
    slotCount: 2,
    location: 'MedStar Washington Hospital Center – Pharmacy',
    locationGroup: 'MedStar DC Metro',
    discipline: 'Pharmacy',
    programType: 'PharmD',
    experienceType: 'Individual',
    status: 'Published',    tenant: 'MedStar',
  },
  {
    id: 'avail-015',
    name: 'Hendrick ICU Nursing Rotation',
    startDate: '2025-06-01',
    endDate: '2025-12-31',
    slotCount: 5,
    location: 'Hendrick Medical Center – ICU',
    locationGroup: 'Hendrick West Texas',
    discipline: 'Nursing',
    programType: 'BSN',
    experienceType: 'Group',
    status: 'Published',    tenant: 'Hendrick',
  },
  // ── Time-bucket records (added for the 4-tab All/Upcoming/Current/Completed
  // rebuild). avail-001–avail-015 above are all 2024–2025 dated and bucket to
  // "Completed" against a 2026-06-17 "today". These six cover Current and
  // Upcoming, plus one deliberate Closed+Current case (avail-021) showing
  // that `status` (Published/Closed) is an orthogonal dimension from the
  // time-based tab bucket — closed-to-new-requests doesn't mean the rotation
  // itself has finished.
  {
    id: 'avail-016',
    name: 'MedStar ICU - Spring Session #2 2026',
    startDate: '2026-03-15',
    endDate: '2026-08-15',
    slotCount: 4,
    location: 'MedStar Washington Hospital Center – ICU',
    locationGroup: 'MedStar DC Metro',
    discipline: 'Nursing',
    programType: 'BSN',
    experienceType: 'Group',
    status: 'Published',    tenant: 'MedStar',
  },
  {
    id: 'avail-017',
    name: 'ATI Physical Therapy Rotation-2026',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    slotCount: 6,
    location: 'ATI Physical Therapy – Rockville',
    locationGroup: 'ATI Mid-Atlantic',
    discipline: 'Physical Therapy',
    programType: 'DPT',
    experienceType: 'Individual',
    status: 'Published',    tenant: 'ATI',
  },
  {
    id: 'avail-018',
    name: 'MedStar NICU - Fall Session #1 2026',
    startDate: '2026-08-23',
    endDate: '2026-10-17',
    slotCount: 2,
    location: 'MedStar Georgetown University Hospital – NICU',
    locationGroup: 'MedStar DC Metro',
    discipline: 'Nursing',
    programType: 'BSN',
    experienceType: 'Individual',
    status: 'Published',    tenant: 'MedStar',
  },
  {
    id: 'avail-019',
    name: 'Hendrick Medical Center Nursing Practicum 2026-27',
    startDate: '2026-09-01',
    endDate: '2027-02-28',
    slotCount: 8,
    location: 'Hendrick Medical Center – Med/Surg',
    locationGroup: 'Hendrick West Texas',
    discipline: 'Nursing',
    programType: 'Pre-Licensure RN',
    experienceType: 'Group',
    status: 'Published',    tenant: 'Hendrick',
  },
  {
    id: 'avail-020',
    name: 'ATI Occupational Therapy-H1 2027',
    startDate: '2027-01-01',
    endDate: '2027-06-30',
    slotCount: 4,
    location: 'ATI Physical Therapy – Bethesda',
    locationGroup: 'ATI Mid-Atlantic',
    discipline: 'Occupational Therapy',
    programType: 'MOT',
    experienceType: 'Individual',
    status: 'Published',    tenant: 'ATI',
  },
  {
    id: 'avail-021',
    name: 'MedStar ICU - Spring Session #2 2026 (Filled)',
    startDate: '2026-05-15',
    endDate: '2026-07-30',
    slotCount: 4,
    location: 'MedStar Washington Hospital Center – ICU',
    locationGroup: 'MedStar DC Metro',
    discipline: 'Nursing',
    programType: 'BSN',
    experienceType: 'Group',
    status: 'Closed',    tenant: 'MedStar',
  },
  // ── Records that exercise the wizard's edge paths ──
  // Location Group was archived after this was posted → the backend rejects it at creation
  {
    id: 'avail-022',
    name: 'MedStar Rehab PT - Fall 2025',
    startDate: '2025-09-02',
    endDate: '2025-12-12',
    slotCount: 2,
    location: 'MedStar National Rehabilitation Network',
    locationGroup: 'MedStar Legacy Rehab Group',
    discipline: 'Physical Therapy',
    programType: 'DPT',
    experienceType: 'Individual',
    status: 'Published',    tenant: 'MedStar',
    retiredValues: ['locationGroup'],
  },
  // Program Type was retired → the backend rejects it at creation
  {
    id: 'avail-023',
    name: 'ATI Pediatric OT - Spring 2026',
    startDate: '2026-01-12',
    endDate: '2026-04-24',
    slotCount: 2,
    location: 'ATI Physical Therapy – Bethesda',
    locationGroup: 'ATI Mid-Atlantic',
    discipline: 'Occupational Therapy',
    programType: 'MOT (Legacy)',
    experienceType: 'Individual',
    status: 'Published',    tenant: 'ATI',
    retiredValues: ['programType'],
  },
  // Spans two locations → the Naming step asks which one @location should use
  {
    id: 'avail-024',
    name: 'MedStar Nursing Float Pool - Fall 2025',
    startDate: '2025-08-25',
    endDate: '2025-12-05',
    slotCount: 6,
    location: 'MedStar Washington Hospital Center – ICU, MedStar Georgetown University Hospital – NICU',
    locationGroup: 'MedStar DC Metro',
    discipline: 'Nursing',
    programType: 'BSN',
    experienceType: 'Group',
    status: 'Published',    tenant: 'MedStar',
  },
];

// ── List-page fields ─────────────────────────────────────────────────────────
// Derived so the records above stay readable. Values are deterministic, so the
// list looks the same on every load.

const SPECIALIZATIONS: Record<string, string[]> = {
  Nursing: ['Critical Care Nursing'],
  'Physical Therapy': ['Physical Therapist Assistant'],
  'Occupational Therapy': ['Pediatric Occupational Therapy'],
  'Speech-Language Pathology': ['Pediatric Speech-Language Pathology'],
  Radiology: ['Diagnostic Imaging'],
  Pharmacy: ['Clinical Pharmacy'],
};

const PROGRAM_NAMES: Record<string, string[]> = {
  BSN: ['Bachelor (Nursing - BSN)'],
  'Pre-Licensure RN': ['Associate (Pre-Licensure RN)'],
  DPT: ['Associate (Physical Therapist Assistant)', 'Doctorate (Physical Therapy)'],
  MOT: ['Master (Occupational Therapy)'],
  'MS-SLP': ['Master (Speech-Language Pathology)'],
  'BS Radiologic Technology': ['Bachelor (Radiologic Technology)'],
  PharmD: ['Doctorate (Pharmacy)'],
};

const CREATORS = ['Admin, SingleSite', 'Gajbhiye, Snehal', 'Coordinator, Location'];

/** Signed-in prototype user; set as Created By on new clones. */
export const CURRENT_USER_NAME = 'Gajbhiye, Snehal';

/** Today's date in UTC. The platform has no timezone setting and uses UTC everywhere. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

let nextAvailabilityId = 3388250468;
/** A fresh 10-digit Availability ID for a newly created availability. */
export function newAvailabilityId(): string {
  nextAvailabilityId += 7919;
  return String(nextAvailabilityId);
}

export const mockAvailabilities: Availability[] = baseAvailabilities.map((a, i) => {
  const accepting = a.status === 'Published' || a.status === 'Closed';
  const requestedSlots = accepting ? (i * 3) % (a.slotCount + 1) : 0;
  return {
    ...a,
    availabilityId: String(2687923895 + i * 35021143),
    createdBy: CREATORS[i % CREATORS.length],
    createdOn: shiftDays(a.startDate, -90 - (i % 4) * 7),
    pendingRequests: a.status === 'Published' ? Math.min(requestedSlots, (i * 2) % 3) : 0,
    requestedSlots,
    specializations: [a.discipline, ...(SPECIALIZATIONS[a.discipline] ?? [])],
    programTypes: PROGRAM_NAMES[a.programType] ?? [a.programType],
  };
});
