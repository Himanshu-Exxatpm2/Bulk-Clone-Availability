import { Availability } from '../../../data/mockAvailabilities';

// Stand-in for the backend call that runs when the clones are created. Until that
// call runs the app cannot know whether a Location Group, Discipline, Program Type
// or Experience Type on the original is still valid, so nothing before the last
// step checks them. The prototype marks the values the backend would reject with
// `retiredValues` on the mock record.

export interface DraftIssue {
  problem: string;
  fix: string;
}

const FIELD_LABELS: Record<string, string> = {
  locationGroup: 'Location Group',
  discipline: 'Discipline',
  programType: 'Program Type',
  experienceType: 'Experience Type',
};

export function simulateBackendCheck(a: Availability): DraftIssue[] {
  return (a.retiredValues ?? []).map((field) => {
    const label = FIELD_LABELS[field];
    return {
      problem: `${label} "${a[field]}" is no longer active in the system.`,
      fix: `Open the draft, choose an active ${label}, then publish.`,
    };
  });
}
