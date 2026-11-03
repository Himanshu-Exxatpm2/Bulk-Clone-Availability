import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Availability } from '../../../data/mockAvailabilities';
import { Button } from '../../ui/button';
import { FontAwesomeIcon } from '../../font-awesome-icon';
import { PublishPreferenceCardState, statusForPreferences, todayISODate } from '../publishPreferenceData';
import { DraftIssue } from './backendCheck';
import { IssueList } from './IssueList';
import { NameChange } from './NameChange';

interface CreationResult {
  availability: Availability;
  status: 'created' | 'draft';
  issues?: DraftIssue[];
}

interface CreationSummaryProps {
  results: CreationResult[];
  /** Names as saved (numbered against the existing list). */
  resolvedNames: Record<string, string>;
  /** Names the coordinator saw in step 1 (numbered inside the batch only). */
  stepOneNames: Record<string, string>;
  /** The publish preferences every clone was created with */
  preferences: PublishPreferenceCardState[];
  onDone: () => void;
}

// ── Where each clone ended up ─────────────────────────────────────────────────
// Published    created and visible to at least one audience today
// Unpublished  created but not live yet: scheduled for later, or Do Not Publish
// Issues       the system could not create it as asked; saved as Unpublished with the problem and fix
// (Closed does not appear: a new clone is never closed.)
type Outcome = 'published' | 'unpublished' | 'issues';
type TabKey = 'all' | Outcome;

const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

/** One line on who sees it and when, from the preferences every clone got. */
function visibilityLine(preferences: PublishPreferenceCardState[]): { published: string; unpublished: string } {
  const today = todayISODate();
  const live: string[] = [];
  const later: string[] = [];
  for (const p of preferences) {
    if (!p.whoSees || !p.publishWhen || p.publishWhen === 'Do Not Publish') continue;
    if (p.publishWhen === 'Now' || p.publishOn <= today) live.push(p.whoSees);
    else later.push(`${p.whoSees} on ${formatDate(p.publishOn)}`);
  }
  const published = live.length
    ? `Visible to ${live.join(', ')}${later.length ? `; ${later.join(', ')}` : ''}`
    : '';
  const unpublished = later.length ? `Goes live: ${later.join('; ')}` : 'Do Not Publish — stays unpublished until you publish it';
  return { published, unpublished };
}

const PILL: Record<Outcome, string> = {
  published: 'bg-positive-default/25 text-neutral-900',
  unpublished: 'bg-neutral-100 text-neutral-800',
  issues: 'bg-accent-100 text-neutral-900',
};
const PILL_LABEL: Record<Outcome, string> = {
  published: 'Published',
  unpublished: 'Unpublished',
  issues: 'Unpublished',
};

export function CreationSummary({
  results,
  resolvedNames,
  stepOneNames,
  preferences,
  onDone,
}: CreationSummaryProps) {
  const [tab, setTab] = useState<TabKey>('all');
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const live = statusForPreferences(preferences) === 'Published';
    return results.map((r) => ({
      result: r,
      outcome: (r.status === 'draft' ? 'issues' : live ? 'published' : 'unpublished') as Outcome,
    }));
  }, [results, preferences]);

  const counts = {
    all: rows.length,
    published: rows.filter((r) => r.outcome === 'published').length,
    unpublished: rows.filter((r) => r.outcome === 'unpublished').length,
    issues: rows.filter((r) => r.outcome === 'issues').length,
  };
  const created = counts.published + counts.unpublished;
  const visibility = visibilityLine(preferences);

  const shown = tab === 'all' ? rows : rows.filter((r) => r.outcome === tab);
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = shown.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const TABS: Array<{ key: TabKey; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'published', label: 'Published' },
    { key: 'unpublished', label: 'Unpublished' },
    { key: 'issues', label: 'Issues' },
  ];

  return (
    <div className="space-y-4 pt-2">
      {/* ── Summary ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-card p-4 shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon name="circleCheck" className="h-4 w-4 text-positive-default" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-neutral-850">
            {`${created} of ${counts.all} ${counts.all === 1 ? 'availability' : 'availabilities'} created`}
          </h3>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total', value: counts.all, tab: 'all' as TabKey },
            { label: 'Published', value: counts.published, tab: 'published' as TabKey },
            { label: 'Unpublished', value: counts.unpublished, tab: 'unpublished' as TabKey },
            { label: 'Issues', value: counts.issues, tab: 'issues' as TabKey },
          ].map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                setTab(s.tab);
                setPage(1);
              }}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-left hover:border-blue-500"
            >
              <dt className="text-xs text-neutral-700">{s.label}</dt>
              <dd className={`text-xl font-semibold ${s.label === 'Issues' && s.value > 0 ? 'text-warning-default' : 'text-neutral-900'}`}>
                {s.value}
              </dd>
            </button>
          ))}
        </dl>
        {counts.issues > 0 && (
          <p className="mt-3 text-xs text-warning-default">
            {`${counts.issues} could not be created as asked and ${counts.issues === 1 ? 'was' : 'were'} saved as Unpublished. Open the Issues tab for the problem and how to fix it.`}
          </p>
        )}
      </div>

      {/* ── Tabs and list ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl bg-card shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)]">
        <div role="tablist" aria-label="Created availabilities" className="flex gap-1 border-b border-neutral-200 px-3">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTab(t.key);
                  setPage(1);
                }}
                className={[
                  'relative px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'text-blue-600' : 'text-neutral-700 hover:text-neutral-900',
                ].join(' ')}
              >
                {`${t.label} (${counts[t.key]})`}
                {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-blue-500" />}
              </button>
            );
          })}
        </div>

        {pageRows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-600">
            {tab === 'issues' ? 'No issues. Every availability was created as asked.' : 'Nothing here.'}
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100" role="tabpanel">
            {pageRows.map(({ result: r, outcome }) => {
              const name = resolvedNames[r.availability.id] || r.availability.name;
              return (
                <li key={r.availability.id} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <span className="block text-sm text-neutral-850">{name}</span>
                    <NameChange stepOne={stepOneNames[r.availability.id]} saved={name} />
                    {outcome === 'issues' && r.issues ? (
                      <IssueList issues={r.issues} />
                    ) : (
                      <span className="mt-0.5 block text-xs text-neutral-600">
                        {outcome === 'published' ? visibility.published : visibility.unpublished}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PILL[outcome]}`}>
                      {PILL_LABEL[outcome]}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-blue-500 hover:underline"
                      onClick={() => console.log('View availability:', r.availability.id)}
                    >
                      View
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {shown.length > PAGE_SIZE && (
          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-2.5 text-sm text-neutral-800">
            <span>{`Page ${currentPage} of ${pageCount} (${shown.length} items)`}</span>
            <button
              type="button"
              aria-label="Previous page"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Next page"
              disabled={currentPage >= pageCount}
              onClick={() => setPage(currentPage + 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button onClick={onDone}>Done</Button>
      </div>
    </div>
  );
}
