import { Availability } from '../../../data/mockAvailabilities';

// Stand-in for the backend call that runs when the clones are created. Nothing about the
// location, discipline or any other field holds a clone back: an availability at an inactive
// location is created and published exactly as the publish preference says, the same as the
// single-row copy. The one thing that can stop a clone is that the original is gone: it, or
// its location, was deleted after it was selected. Deleting a location also deletes its
// availabilities, so that is the only way a deletion shows up here. That row is skipped and
// the rest of the batch carries on. The prototype marks such a record with `deletedBeforeRun`.
export function sourceDeleted(a: Availability): boolean {
  return !!a.deletedBeforeRun;
}
