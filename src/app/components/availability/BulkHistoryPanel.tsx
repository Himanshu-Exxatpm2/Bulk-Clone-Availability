import { useMemo, useState } from 'react';
import { ArrowLeft, SlidersHorizontal, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '../ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { HistoryEntry, HistoryStatus } from '../../data/bulkHistory';
import { IssueList } from './BulkCloneWizard/IssueList';
import { NameChange } from './BulkCloneWizard/NameChange';

interface BulkHistoryPanelProps {
  entries: HistoryEntry[];
  /** Availabilities each job made that are still in the list, by job id */
  cloneCounts: Record<string, number>;
  onClose: () => void;
  /** Close the panel and show only the availabilities this job made */
  onViewJob: (id: string) => void;
}

const PAGE_SIZE = 10;
const ALL = 'all';

function formatRan(iso: string): string {
  return (
    new Date(iso).toLocaleString('en-US', {
      month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC',
    }) + ' UTC'
  );
}

const PILL: Record<HistoryStatus, string> = {
  'In progress': 'bg-blue-50 text-blue-600',
  Completed: 'bg-positive-default/10 text-positive-default',
  'Completed with issues': 'bg-accent-100 text-warning-default',
  Failed: 'bg-negative-default/10 text-negative-default',
};

function StatusPill({ status }: { status: HistoryStatus }) {
  return <span className={`shrink-0 rounded-full px-3 py-0.5 text-xs font-medium ${PILL[status]}`}>{status}</span>;
}

function results(e: HistoryEntry): string {
  if (e.status === 'In progress') return `Creating ${e.total} availabilities…`;
  const parts = [`${e.created} created`];
  if (e.drafts > 0) parts.push(`${e.drafts} saved as draft`);
  if (e.failed > 0) parts.push(`${e.failed} failed`);
  return parts.join(' · ');
}

const count = (n: number) => `${n} ${n === 1 ? 'Availability' : 'Availabilities'}`;

// ── Detail view ──────────────────────────────────────────────────────────────

function EntryDetail({ entry, cloned, onViewJob }: { entry: HistoryEntry; cloned: number; onViewJob: () => void }) {
  const line = (label: string, value: React.ReactNode) => (
    <p className="text-sm text-neutral-700">
      {label} <span className="font-semibold text-neutral-900">{value}</span>
    </p>
  );
  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-lg border border-neutral-200 bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-neutral-900">{entry.type === 'Bulk Clone' ? 'Bulk Clone' : 'Bulk Creation'}</p>
          <StatusPill status={entry.status} />
        </div>
        <p className="text-sm text-neutral-700">
          {count(entry.total)} named <span className="font-semibold text-neutral-900">{entry.namePattern}</span>
        </p>
        {entry.source && line('Source', entry.source)}
        {entry.target && line('Target', entry.target)}
        {line('Results', results(entry))}
        <p className="text-sm text-neutral-700">
          Initiated by <span className="font-semibold text-neutral-900">{entry.runBy}</span> on {formatRan(entry.ranAt)}
        </p>
        {entry.type === 'Bulk Clone' && cloned > 0 && (
          <button type="button" onClick={onViewJob} className="pt-1 text-sm font-medium text-blue-600 hover:underline">
            View {cloned} {cloned === 1 ? 'availability' : 'availabilities'} in the list
          </button>
        )}
      </div>

      {entry.rows ? (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-card">
          <p className="border-b border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-900">
            Availabilities in this job
          </p>
          <ul className="divide-y divide-neutral-100">
            {entry.rows.map((r) => (
              <li key={r.savedName} className="px-4 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm text-neutral-850">{r.savedName}</p>
                    <NameChange stepOne={r.stepOneName} saved={r.savedName} />
                  </div>
                  <span
                    className={`shrink-0 text-xs font-medium ${
                      r.status === 'created' ? 'text-positive-default' : r.status === 'draft' ? 'text-warning-default' : 'text-negative-default'
                    }`}
                  >
                    {r.status === 'created' ? 'Created' : r.status === 'draft' ? 'Saved as draft' : 'Failed'}
                  </span>
                </div>
                {r.problems && <IssueList issues={r.problems} />}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-lg border border-neutral-200 bg-card p-4 text-sm text-neutral-700">
          A row-by-row list is not kept for this entry.
        </p>
      )}
    </div>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────────

export function BulkHistoryPanel({ entries, cloneCounts, onClose, onViewJob }: BulkHistoryPanelProps) {
  const [type, setType] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [runBy, setRunBy] = useState<string>(ALL);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const runners = useMemo(() => Array.from(new Set(entries.map((e) => e.runBy))).sort(), [entries]);
  const shown = useMemo(
    () =>
      [...entries]
        .filter(
          (e) =>
            (type === ALL || e.type === type) &&
            (status === ALL || e.status === status) &&
            (runBy === ALL || e.runBy === runBy) &&
            (from === '' || e.ranAt.slice(0, 10) >= from) &&
            (to === '' || e.ranAt.slice(0, 10) <= to),
        )
        .sort((a, b) => b.ranAt.localeCompare(a.ranAt)),
    [entries, type, status, runBy, from, to],
  );
  const moreActive = (runBy !== ALL ? 1 : 0) + (from !== '' ? 1 : 0) + (to !== '' ? 1 : 0);
  const anyActive = moreActive > 0 || type !== ALL || status !== ALL;
  const clearAll = () => { setType(ALL); setStatus(ALL); setRunBy(ALL); setFrom(''); setTo(''); setPage(0); };

  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const pageRows = shown.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  // Any filter change goes back to the first page
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(0); };

  const open = entries.find((e) => e.id === openId) ?? null;

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        aria-describedby={undefined}
        className="flex h-full w-[50vw] min-w-[420px] max-w-none flex-col gap-0 bg-neutral-50 p-0 sm:max-w-none [&>button]:hidden"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-neutral-200 bg-card px-4 py-3">
          <button
            type="button"
            onClick={open ? () => setOpenId(null) : onClose}
            aria-label={open ? 'Back to history' : 'Close history'}
            className="flex size-8 items-center justify-center rounded-md bg-blue-50 text-blue-500 hover:bg-blue-100"
          >
            {open ? <ArrowLeft className="size-4" strokeWidth={2} /> : <X className="size-4" strokeWidth={2} />}
          </button>
          <SheetTitle className="min-w-0 flex-1 truncate text-base font-semibold text-neutral-900">
            {open ? formatRan(open.ranAt) : 'Bulk Creation History'}
          </SheetTitle>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {open ? (
            <EntryDetail entry={open} cloned={cloneCounts[open.id] ?? 0} onViewJob={() => onViewJob(open.id)} />
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={type} onValueChange={reset(setType)}>
                  <SelectTrigger size="sm" className="h-9 w-[190px] bg-card" aria-label="Filter by type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All types</SelectItem>
                    <SelectItem value="Bulk Clone">Bulk Clone</SelectItem>
                    <SelectItem value="Multiple Availabilities">Multiple Availabilities</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={reset(setStatus)}>
                  <SelectTrigger size="sm" className="h-9 w-[190px] bg-card" aria-label="Filter by status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All statuses</SelectItem>
                    <SelectItem value="In progress">In progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Completed with issues">Completed with issues</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-neutral-300 bg-card px-3 text-sm text-neutral-850 hover:bg-neutral-50"
                    >
                      <SlidersHorizontal className="size-3.5" aria-hidden />
                      More
                      {moreActive > 0 && <span className="rounded-full bg-blue-500 px-1.5 text-xs font-medium text-white">{moreActive}</span>}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-72 space-y-3 p-3">
                    <div>
                      <p className="mb-1 text-xs text-neutral-700">Run by</p>
                      <Select value={runBy} onValueChange={reset(setRunBy)}>
                        <SelectTrigger size="sm" className="h-9 w-full" aria-label="Filter by who ran it">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL}>Anyone</SelectItem>
                          {runners.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <label className="block text-xs text-neutral-700">
                      From
                      <input type="date" value={from} max={to || undefined} onChange={(e) => reset(setFrom)(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-neutral-300 px-2 text-sm text-neutral-900" />
                    </label>
                    <label className="block text-xs text-neutral-700">
                      To
                      <input type="date" value={to} min={from || undefined} onChange={(e) => reset(setTo)(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-neutral-300 px-2 text-sm text-neutral-900" />
                    </label>
                  </PopoverContent>
                </Popover>

                {anyActive && (
                  <button type="button" onClick={clearAll} className="text-xs font-medium text-blue-600 hover:underline">
                    Clear
                  </button>
                )}
                <span className="ml-auto text-xs text-neutral-600">{shown.length} {shown.length === 1 ? 'job' : 'jobs'}</span>
              </div>

              {shown.length === 0 && (
                <p className="rounded-lg border border-neutral-200 bg-card px-4 py-8 text-center text-sm text-neutral-600">
                  No jobs match these filters.
                </p>
              )}

              {/* Same card as production: title and status, what was made, who ran it */}
              {pageRows.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setOpenId(e.id)}
                  className="block w-full space-y-2 rounded-lg border border-neutral-200 bg-card p-4 text-left hover:border-neutral-300 hover:bg-neutral-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-neutral-900">{e.type === 'Bulk Clone' ? 'Bulk Clone' : 'Bulk Creation'}</p>
                    <StatusPill status={e.status} />
                  </div>
                  <p className="text-sm text-neutral-700">
                    {count(e.total)} named <span className="font-semibold text-neutral-900">{e.namePattern}</span>
                  </p>
                  {e.source && (
                    <p className="text-sm text-neutral-700">
                      {e.source} <span className="text-neutral-500">→</span> {e.target}
                    </p>
                  )}
                  {(e.type === 'Bulk Clone' || e.status !== 'Completed') && <p className="text-sm text-neutral-700">{results(e)}</p>}
                  <p className="text-sm text-neutral-700">
                    Initiated by <span className="font-semibold text-neutral-900">{e.runBy}</span> on {formatRan(e.ranAt)}
                  </p>
                </button>
              ))}

              {pages > 1 && (
                <div className="flex items-center justify-end gap-3 text-xs text-neutral-700">
                  <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="text-blue-600 hover:underline disabled:text-neutral-500 disabled:no-underline">
                    Previous
                  </button>
                  Page {page + 1} of {pages}
                  <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="text-blue-600 hover:underline disabled:text-neutral-500 disabled:no-underline">
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
