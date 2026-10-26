import { DraftIssue } from './backendCheck';

/** What went wrong with a clone, and how to fix it. */
export function IssueList({ issues }: { issues: DraftIssue[] }) {
  return (
    <ul className="mt-1 space-y-1.5">
      {issues.map((issue) => (
        <li key={issue.problem} className="text-xs leading-snug">
          <span className="block text-warning-default">{issue.problem}</span>
          <span className="block text-neutral-700">
            <span className="font-medium">How to fix:</span> {issue.fix}
          </span>
        </li>
      ))}
    </ul>
  );
}
