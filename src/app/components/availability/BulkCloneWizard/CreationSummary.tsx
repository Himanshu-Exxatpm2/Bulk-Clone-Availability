import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../ui/button';
import { FontAwesomeIcon } from '../../font-awesome-icon';
import { PublishPreferenceCardState, statusForPreferences, todayISODate } from '../publishPreferenceData';
import { NameChange } from './NameChange';
import { CreationResult, wasCreated } from './backendCheck';

interface CreationSummaryProps {
  results: CreationResult[];
  /** Names as saved (numbered against the existing list). */
  resolvedNames: Record<string, string>;
  /** Names the coordinator saw in step 1 (template name, no numbers). */
  stepOneNames: Record<string, string>;
  /** The publish preferences every clone was created with */
  preferences: PublishPreferenceCardState[];
  onDone: () => void;
}

// Every clone gets the same publish preferences, so the clones that are created are all Published
// or all Unpublished: live today, or scheduled for later / Do Not Publish.
// What the summary has to say is what did not go as selected: clones not created (every location
// inactive, or the original deleted), clones created without an inactive location, and names that
// were numbered to stay unique. Each count opens its own list below.

type Filter = 'all' | 'created' | 'notCreated' | 'partial' | 'renamed';

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

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function CreationSummary({
  results,
  resolvedNames,
  stepOneNames,
  preferences,
  onDone,
}: CreationSummaryProps) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>('all');

  const live = statusForPreferences(preferences) === 'Published';
  const visibility = visibilityLine(preferences);

  const nameOf = (r: CreationResult) => resolvedNames[r.availability.id] || r.availability.name;
  const isRenamed = (r: CreationResult) => wasCreated(r) && nameOf(r) !== (stepOneNames[r.availability.id] ?? nameOf(r));

  const counts = useMemo(() => {
    const created = results.filter(wasCreated).length;
    return {
      selected: results.length,
      created,
      notCreated: results.length - created,
      inactive: results.filter((r) => r.outcome.kind === 'inactive').length,
      deleted: results.filter((r) => r.outcome.kind === 'deleted').length,
      partial: results.filter((r) => r.outcome.kind === 'partial').length,
      renamed: results.filter(isRenamed).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, resolvedNames, stepOneNames]);

  const shown = useMemo(
    () =>
      results.filter((r) =>
        filter === 'all' ? true
        : filter === 'created' ? wasCreated(r)
        : filter === 'notCreated' ? !wasCreated(r)
        : filter === 'partial' ? r.outcome.kind === 'partial'
        : isRenamed(r),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results, filter, resolvedNames, stepOneNames],
  );

  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = shown.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const tiles: Array<{ key: Filter; label: string; value: number; tone?: 'warn' }> = [
    { key: 'all', label: 'Selected', value: counts.selected },
    { key: 'created', label: 'Created', value: counts.created },
    ...(counts.notCreated > 0 ? [{ key: 'notCreated' as const, label: 'Not created', value: counts.notCreated, tone: 'warn' as const }] : []),
    ...(counts.partial > 0 ? [{ key: 'partial' as const, label: 'Location left out', value: counts.partial, tone: 'warn' as const }] : []),
    ...(counts.renamed > 0 ? [{ key: 'renamed' as const, label: 'Names numbered', value: counts.renamed }] : []),
  ];

  return (
    <div className="space-y-4 pt-2">
      {/* ── Summary ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-card p-4 shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon name="circleCheck" className="h-4 w-4 text-positive-default" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-neutral-850">
            {`${plural(counts.created, 'availability', 'availabilities')} created`}
          </h3>
          {counts.created > 0 && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${live ? 'bg-positive-default/25 text-neutral-900' : 'bg-neutral-100 text-neutral-800'}`}
            >
              {live ? 'Published' : 'Unpublished'}
            </span>
          )}
        </div>
        {counts.created > 0 && (
          <p className="mt-1.5 text-sm text-neutral-700">{live ? visibility.published : visibility.unpublished}</p>
        )}

        {/* Counts: each one opens its list below */}
        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Filter the list below">
          {tiles.map((t) => {
            const on = filter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => { setFilter(t.key); setPage(1); }}
                className={`min-w-[120px] rounded-lg border px-3 py-2 text-left transition-colors ${
                  on ? 'border-blue-500 bg-blue-50' : 'border-neutral-200 bg-card hover:bg-neutral-50'
                }`}
              >
                <span className={`block text-xl font-semibold leading-6 ${t.tone === 'warn' && t.value > 0 ? 'text-warning-default' : 'text-neutral-900'}`}>{t.value}</span>
                <span className="block text-xs text-neutral-700">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* What did not go as selected, and why */}
        <div className="mt-3 space-y-1.5 text-xs">
          {counts.inactive > 0 && (
            <p className="text-warning-default">
              {`${plural(counts.inactive, 'availability was', 'availabilities were')} not created because ${counts.inactive === 1 ? 'its location is' : 'their locations are'} inactive. To clone ${counts.inactive === 1 ? 'it' : 'them'}, make the location active, or clone to a different location.`}
            </p>
          )}
          {counts.deleted > 0 && (
            <p className="text-warning-default">
              {`${plural(counts.deleted, 'availability was', 'availabilities were')} not created because the original was deleted before the clone ran. The rest of the batch went ahead.`}
            </p>
          )}
          {counts.partial > 0 && (
            <p className="text-warning-default">
              {`${plural(counts.partial, 'availability was', 'availabilities were')} created without an inactive location. The other locations were added.`}
            </p>
          )}
          {counts.renamed > 0 && (
            <p className="text-neutral-700">
              {`${plural(counts.renamed, 'availability with a similar name was', 'availabilities with similar names were')} found. #2, #3 and so on were added to make them unique. To change a name, open the availability and edit it.`}
            </p>
          )}
        </div>
      </div>

      {/* ── List ──────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl bg-card shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)]">
        <ul className="divide-y divide-neutral-100" aria-label="Availabilities in this job">
          {pageRows.map((r) => {
            const name = nameOf(r);
            const notCreated = !wasCreated(r);
            const o = r.outcome;
            return (
              <li key={r.availability.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <span className="block text-sm text-neutral-850">{name}</span>
                  {!notCreated && <NameChange stepOne={stepOneNames[r.availability.id]} saved={name} />}
                  {o.kind === 'partial' && (
                    <span className="mt-0.5 block text-xs text-warning-default">
                      {`Created without ${o.leftOut.join(', ')} (inactive).`}
                    </span>
                  )}
                  {o.kind === 'inactive' && (
                    <span className="mt-0.5 block text-xs text-warning-default">
                      {`Not created: ${o.locations.join(', ')} ${o.locations.length === 1 ? 'is' : 'are'} inactive.`}
                    </span>
                  )}
                  {o.kind === 'deleted' && (
                    <span className="mt-0.5 block text-xs text-warning-default">
                      The original availability was deleted before the clone ran.
                    </span>
                  )}
                </div>
                {notCreated ? (
                  <span className="shrink-0 rounded-full bg-negative-default/15 px-2.5 py-0.5 text-xs font-medium text-neutral-900">Not created</span>
                ) : (
                  <button
                    type="button"
                    className="shrink-0 text-xs text-blue-500 hover:underline"
                    onClick={() => console.log('View availability:', r.availability.id)}
                  >
                    View
                  </button>
                )}
              </li>
            );
          })}
          {pageRows.length === 0 && <li className="px-4 py-6 text-sm text-neutral-600">Nothing to show here.</li>}
        </ul>

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
