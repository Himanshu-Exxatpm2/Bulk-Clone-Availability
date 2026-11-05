import { Availability } from '../../../data/mockAvailabilities';

// Stand-in for the backend call that runs when the clones are created. The only thing
// that can stop a clone from publishing is its location: if the location has been marked
// inactive, the clone is saved Unpublished and stays that way until the coordinator fixes
// the location and changes the publish preference. No other field is checked.
// The prototype marks such a record with `locationInactive` on the mock record.

export interface DraftIssue {
  problem: string;
  fix: string;
}

export function simulateBackendCheck(a: Availability): DraftIssue[] {
  if (!a.locationInactive) return [];
  return [
    {
      problem: `Location "${a.location}" is inactive, so this availability is saved as Unpublished and will not be published.`,
      fix: 'Open the availability, choose an active location, save it, then change the publish preference. It stays Unpublished until you do.',
    },
  ];
}
