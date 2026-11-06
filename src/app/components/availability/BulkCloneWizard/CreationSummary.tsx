import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Availability } from '../../../data/mockAvailabilities';
import { Button } from '../../ui/button';
import { FontAwesomeIcon } from '../../font-awesome-icon';
import { PublishPreferenceCardState, statusForPreferences, todayISODate } from '../publishPreferenceData';
import { NameChange } from './NameChange';

interface CreationResult {
  availability: Availability;
  status: 'created' | 'missing';
}

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

// Every clone gets the same publish preferences, so the whole batch is either Published or
// Unpublished: live today, or scheduled for later / Do Not Publish. No field, the location
// included, changes that. The one exception is rare: a clone whose original was deleted
// before the run is not created; it gets a notice and a row, nothing more.
// (Closed does not appear: a new clone is never closed.)

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

export function CreationSummary({
  results,
  resolvedNames,
  stepOneNames,
  preferences,
  onDone,
}: CreationSummaryProps) {
  const [page, setPage] = useState(1);

  const live = statusForPreferences(preferences) === 'Published';
  const visibility = visibilityLine(preferences);
  const created = useMemo(() => results.filter((r) => r.status === 'created'), [results]);
  const missing = results.length - created.length;

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-4 pt-2">
      {/* ── Summary ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-card p-4 shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon name="circleCheck" className="h-4 w-4 text-positive-default" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-neutral-850">
            {`${created.length} ${created.length === 1 ? 'availability' : 'availabilities'} created`}
          </h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${live ? 'bg-positive-default/25 text-neutral-900' : 'bg-neutral-100 text-neutral-800'}`}
          >
            {live ? 'Published' : 'Unpublished'}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-neutral-700">{live ? visibility.published : visibility.unpublished}</p>
        {missing > 0 && (
          <p className="mt-3 text-xs text-warning-default">
            {`${missing} ${missing === 1 ? 'was' : 'were'} not created because the original was deleted before the clone ran. The rest of the batch went ahead.`}
          </p>
        )}
      </div>

      {/* ── List: the saved names, which is what the coordinator could not see until now ── */}
      <div className="overflow-hidden rounded-xl bg-card shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)]">
        <ul className="divide-y divide-neutral-100" aria-label="Created availabilities">
          {pageRows.map((r) => {
            const name = resolvedNames[r.availability.id] || r.availability.name;
            const notCreated = r.status === 'missing';
            return (
              <li key={r.availability.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <span className="block text-sm text-neutral-850">{name}</span>
                  <NameChange stepOne={stepOneNames[r.availability.id]} saved={name} />
                  {notCreated && (
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
        </ul>

        {results.length > PAGE_SIZE && (
          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-2.5 text-sm text-neutral-800">
            <span>{`Page ${currentPage} of ${pageCount} (${results.length} items)`}</span>
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
