import { Availability } from '../../../data/mockAvailabilities';
import { locationInfo } from '../../../data/locations';
import { parseLocations } from './naming';

// Stand-in for the backend call that runs when the clones are created. Only the backend can know
// any of this, so nothing is checked before the last step. What can stop or trim a clone:
//   - inactive location: a single inactive location means the clone is not created; with several
//     locations the clone is created with the active ones and the inactive ones are left out.
//   - the original was deleted after it was selected (deleting a location also deletes its
//     availabilities, so that is how a deleted location shows up here).
// Discipline, specialization, program type and the rest cannot be inactive or deleted without
// taking the availability with them, so they never hold a clone back. The prototype marks a
// deleted original with `deletedBeforeRun`.

export type CloneOutcome =
  | { kind: 'created' }
  /** Created, but these inactive locations were left out */
  | { kind: 'partial'; leftOut: string[]; kept: string[] }
  /** Not created: every location is inactive */
  | { kind: 'inactive'; locations: string[] }
  /** Not created: the original no longer exists */
  | { kind: 'deleted' };

/** One row of a finished job */
export interface CreationResult {
  availability: Availability;
  outcome: CloneOutcome;
}

export const wasCreated = (r: CreationResult) => r.outcome.kind === 'created' || r.outcome.kind === 'partial';

export function cloneOutcome(a: Availability): CloneOutcome {
  if (a.deletedBeforeRun) return { kind: 'deleted' };
  const locations = parseLocations(a.location);
  const inactive = locations.filter((l) => !locationInfo(l).active);
  if (inactive.length === 0) return { kind: 'created' };
  const kept = locations.filter((l) => locationInfo(l).active);
  if (kept.length === 0) return { kind: 'inactive', locations: inactive };
  return { kind: 'partial', leftOut: inactive, kept };
}
