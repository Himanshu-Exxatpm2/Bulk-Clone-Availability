import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { FontAwesomeIcon } from '../font-awesome-icon';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Availability } from '../../data/mockAvailabilities';

// ── Columns ──────────────────────────────────────────────────────────────────
// Same columns, order and frozen columns as the production Availability list:
// checkbox + Availability Name frozen left, Status + Actions frozen right, the
// rest scrolls between them and can be hidden from the column settings (wrench).

export type ColumnKey =
  | 'availabilityId'
  | 'location'
  | 'createdBy'
  | 'specializations'
  | 'experienceType'
  | 'totalSlots'
  | 'pendingRequests'
  | 'requestedSlots'
  | 'createdOn'
  | 'duration'
  | 'programTypes';

export type SortKey = 'name' | 'createdOn' | 'duration';
export interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}

export const SCROLL_COLUMNS: Array<{ key: ColumnKey; label: string; width: number; sortKey?: SortKey }> = [
  { key: 'availabilityId', label: 'Availability ID', width: 150 },
  { key: 'location', label: 'Location Name', width: 210 },
  { key: 'createdBy', label: 'Created By', width: 170 },
  { key: 'specializations', label: 'Discipline/Specialization', width: 260 },
  { key: 'experienceType', label: 'Experience Type', width: 150 },
  { key: 'totalSlots', label: 'Total Slots', width: 130 },
  { key: 'pendingRequests', label: 'Pending Requests', width: 160 },
  { key: 'requestedSlots', label: 'Requested Slots', width: 160 },
  { key: 'createdOn', label: 'Created On', width: 150, sortKey: 'createdOn' },
  { key: 'duration', label: 'Availability Duration', width: 240, sortKey: 'duration' },
  { key: 'programTypes', label: 'Program Type', width: 290 },
];

const CHECK_W = 44;
const NAME_W = 260;
const STATUS_W = 176;
const ACTIONS_W = 136;

interface AvailabilityListTableProps {
  availabilities: Availability[];
  totalCount: number;
  selectedIds: string[];
  hiddenColumns: ColumnKey[];
  sort: SortState | null;
  onSortChange: (sort: SortState | null) => void;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onBulkClone: () => void;
}

/** Production list format, e.g. "Oct 01, 2026". */
export function formatListDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

const STATUS_CLASSES: Record<Availability['status'], string> = {
  Published: 'bg-positive-default/25 text-neutral-900',
  Scheduled: 'bg-accent-100 text-neutral-900',
  Draft:     'bg-neutral-100 text-neutral-800',
  Closed:    'bg-neutral-200 text-neutral-800',
};

function StatusBadge({ status }: { status: Availability['status'] }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex w-full max-w-[144px] items-center justify-center rounded px-3 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}
        >
          {status}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[240px] text-center text-xs leading-snug">
        Status reflects whether this availability accepts new slot requests — it's
        independent of the Upcoming/Current/Completed tab, which is based on rotation
        dates only. A Closed availability can still appear under Current or Upcoming
        if its dates haven't elapsed. Scheduled means the publish date is in the future;
        Draft means it hasn't been published yet.
      </TooltipContent>
    </Tooltip>
  );
}

// Hard cap on a single bulk-clone batch (decided Oct 2026). A soft advisory is
// shown from ADVISORY_THRESHOLD selections upward.
export const MAX_CLONE_SELECTION = 25;
export const ADVISORY_THRESHOLD = 15;

// ── Selection bar ────────────────────────────────────────────────────────────
// The list itself is unchanged; the only additions are the checkboxes and this bar.
// • 0 selected → nothing is shown
// • 1 selected → count, a disabled Clone action and a hint (the row copy icon clones one availability)
// • ≥2 selected → enabled "Clone N Availabilities"
// • ≥15 selected → dismissible advisory; 25 is the hard cap
function SelectionToolbar({
  selectedCount,
  onBulkClone,
}: {
  selectedCount: number;
  onBulkClone: () => void;
}) {
  const [advisoryDismissed, setAdvisoryDismissed] = useState(false);
  const atCap = selectedCount >= MAX_CLONE_SELECTION;
  const showAdvisory = selectedCount >= ADVISORY_THRESHOLD && !advisoryDismissed;
  if (selectedCount === 0) return null;

  return (
    <div className="border-b border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between gap-4 px-4 py-2 min-h-[48px]">
        <span className="text-sm text-neutral-800">
          {`${selectedCount} selected${atCap ? ` (maximum ${MAX_CLONE_SELECTION})` : ''}`}
        </span>

        <div className="flex items-center gap-3">
          {selectedCount === 1 && (
            <p className="text-sm text-blue-600">Select 2 or more to bulk clone</p>
          )}
          <Button size="sm" disabled={selectedCount < 2} onClick={onBulkClone}>
            <FontAwesomeIcon name="copy" className="w-4 h-4" aria-hidden="true" />
            {selectedCount >= 2 ? `Clone ${selectedCount} Availabilities` : 'Clone Availabilities'}
          </Button>
        </div>
      </div>

      {showAdvisory && (
        <div
          role="status"
          className="flex items-start gap-2 px-4 py-2 border-t border-accent-200 bg-accent-50 text-sm text-warning-default"
        >
          <FontAwesomeIcon name="circleQuestion" className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span className="flex-1">
            Large batches take longer to review — consider splitting by location or discipline.
          </span>
          <button
            type="button"
            onClick={() => setAdvisoryDismissed(true)}
            aria-label="Dismiss advisory"
            className="text-warning-default hover:underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

// ── Cell styles ──────────────────────────────────────────────────────────────
// border-separate keeps cell borders attached to the frozen (sticky) cells while
// the middle columns scroll underneath them.
const TH = 'h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wider text-neutral-800 bg-[var(--bg-table-header)] border-b border-r border-neutral-200 whitespace-nowrap';
const TD = 'px-4 py-3 align-middle text-sm text-neutral-850 bg-card group-hover:bg-neutral-50 border-b border-r border-neutral-200 transition-colors';
const LEFT_EDGE = 'shadow-[4px_0_6px_-4px_rgba(0,0,0,0.15)]';
const RIGHT_EDGE = 'shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]';

function SortButton({
  label,
  sortKey,
  sort,
  onSortChange,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState | null;
  onSortChange: (sort: SortState | null) => void;
}) {
  const active = sort?.key === sortKey;
  // Click cycles: ascending → descending → off
  const next: SortState | null = !active
    ? { key: sortKey, dir: 'asc' }
    : sort!.dir === 'asc'
    ? { key: sortKey, dir: 'desc' }
    : null;
  const Icon = !active ? ChevronsUpDown : sort!.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSortChange(next)}
      className="flex w-full min-w-0 items-center justify-between gap-2 uppercase tracking-wider hover:text-neutral-900"
      aria-label={`Sort by ${label}`}
    >
      <span className="truncate" title={label}>{label}</span>
      <Icon className={`size-3.5 shrink-0 ${active ? 'text-blue-500' : 'text-neutral-500'}`} aria-hidden />
    </button>
  );
}

function SpecializationCell({ items }: { items: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const extra = items.length - 1;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 text-[13px] text-neutral-800">
        {expanded ? (
          <ul className="space-y-0.5">
            {items.map((s) => <li key={s}>{s}</li>)}
          </ul>
        ) : (
          <span className="block truncate" title={items.join(', ')}>
            {items[0]}
            {extra > 0 && <span className="text-neutral-600"> +{extra}</span>}
          </span>
        )}
      </div>
      {extra > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-10 shrink-0 text-center text-xs leading-snug text-blue-600 hover:underline"
        >
          {expanded ? 'Show Less' : 'Show More'}
        </button>
      )}
    </div>
  );
}

function renderCell(key: ColumnKey, a: Availability) {
  switch (key) {
    case 'availabilityId':
      return <span className="tabular-nums">{a.availabilityId}</span>;
    case 'location':
      return <span className="block truncate text-blue-600" title={a.location}>{a.location}</span>;
    case 'createdBy':
      return <span className="block truncate" title={a.createdBy}>{a.createdBy}</span>;
    case 'specializations':
      return <SpecializationCell items={a.specializations} />;
    case 'experienceType':
      return a.experienceType;
    case 'totalSlots':
      return <span className="tabular-nums">{a.slotCount}</span>;
    case 'pendingRequests':
      return <span className="tabular-nums">{a.pendingRequests}</span>;
    case 'requestedSlots':
      return <span className="tabular-nums">{a.requestedSlots}</span>;
    case 'createdOn':
      return <span className="whitespace-nowrap">{formatListDate(a.createdOn)}</span>;
    case 'duration':
      return (
        <span className="whitespace-nowrap">
          {formatListDate(a.startDate)} - {formatListDate(a.endDate)}
        </span>
      );
    case 'programTypes':
      return (
        <div className="space-y-0.5 text-[13px] leading-snug text-neutral-800">
          {a.programTypes.length > 0 ? a.programTypes.map((p) => <div key={p}>{p}</div>) : '—'}
        </div>
      );
  }
}

export function AvailabilityListTable({
  availabilities,
  totalCount,
  selectedIds,
  hiddenColumns,
  sort,
  onSortChange,
  onSelectAll,
  onSelectOne,
  onBulkClone,
}: AvailabilityListTableProps) {
  const columns = SCROLL_COLUMNS.filter((c) => !hiddenColumns.includes(c.key));
  const tableWidth =
    CHECK_W + NAME_W + STATUS_W + ACTIONS_W + columns.reduce((sum, c) => sum + c.width, 0);

  // Tri-state header checkbox; a click while anything is selected clears the selection,
  // so it can't get stuck when the cap leaves some rows unselected
  const allChecked =
    availabilities.length > 0 && selectedIds.length === availabilities.length;
  const someChecked = selectedIds.length > 0 && !allChecked;
  const selectAllChecked: true | false | 'indeterminate' = allChecked
    ? true
    : someChecked
    ? 'indeterminate'
    : false;

  return (
    <div>
      <SelectionToolbar
        selectedCount={selectedIds.length}
        onBulkClone={onBulkClone}
      />

      <div className="overflow-x-auto">
        <table
          // Fixed layout so the frozen columns' sticky offsets match their widths exactly
          className="table-fixed border-separate border-spacing-0 text-sm"
          style={{ width: tableWidth, minWidth: '100%' }}
        >
          <colgroup>
            <col style={{ width: CHECK_W }} />
            <col style={{ width: NAME_W }} />
            {/* The last scrolling column (or Status, if all are hidden) takes any spare
                width, so the frozen columns never stretch when the table is narrower than the page */}
            {columns.map((c, i) => (
              <col key={c.key} style={i === columns.length - 1 ? { minWidth: c.width } : { width: c.width }} />
            ))}
            <col style={columns.length === 0 ? undefined : { width: STATUS_W }} />
            <col style={{ width: ACTIONS_W }} />
          </colgroup>

          <thead>
            <tr>
              <th className={`${TH} sticky left-0 z-[3] !px-0 text-center`}>
                <div className="inline-flex items-center justify-center">
                  <Checkbox
                    checked={selectAllChecked}
                    onCheckedChange={() => onSelectAll(selectedIds.length === 0)}
                    aria-label="Select all availabilities"
                  />
                </div>
              </th>
              <th className={`${TH} sticky z-[3] ${LEFT_EDGE}`} style={{ left: CHECK_W }}>
                <SortButton label="Availability Name" sortKey="name" sort={sort} onSortChange={onSortChange} />
              </th>
              {columns.map((c) => (
                <th key={c.key} className={TH}>
                  {c.sortKey ? (
                    <SortButton label={c.label} sortKey={c.sortKey} sort={sort} onSortChange={onSortChange} />
                  ) : (
                    <span className="block truncate" title={c.label}>{c.label}</span>
                  )}
                </th>
              ))}
              <th className={`${TH} sticky z-[3] ${RIGHT_EDGE}`} style={{ right: ACTIONS_W }}>
                Status
              </th>
              <th className={`${TH} sticky right-0 z-[3] border-r-0`}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {availabilities.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 4} className="py-12 text-center text-neutral-600 border-b border-neutral-200">
                  No availabilities match the current filters.
                </td>
              </tr>
            ) : (
              availabilities.map((avail) => {
                const isSelected = selectedIds.includes(avail.id);
                const capped = !isSelected && selectedIds.length >= MAX_CLONE_SELECTION;
                const box = (
                  <Checkbox
                    checked={isSelected}
                    disabled={capped}
                    onCheckedChange={(checked) => onSelectOne(avail.id, checked as boolean)}
                    aria-label={`Select ${avail.name}`}
                  />
                );
                return (
                  <tr key={avail.id} className="group">
                    <td className={`${TD} sticky left-0 z-[1] !px-0 text-center`}>
                      <div className="inline-flex items-center justify-center">
                        {capped ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">{box}</span>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs">
                              Maximum {MAX_CLONE_SELECTION} selections reached.
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          box
                        )}
                      </div>
                    </td>

                    <td className={`${TD} sticky z-[1] ${LEFT_EDGE}`} style={{ left: CHECK_W }}>
                      <span className="line-clamp-2 font-medium text-blue-600" title={avail.name}>
                        {avail.name}
                      </span>
                    </td>

                    {columns.map((c) => (
                      <td key={c.key} className={TD}>
                        {renderCell(c.key, avail)}
                      </td>
                    ))}

                    <td className={`${TD} sticky z-[1] ${RIGHT_EDGE}`} style={{ right: ACTIONS_W }}>
                      <StatusBadge status={avail.status} />
                    </td>

                    <td className={`${TD} sticky right-0 z-[1] border-r-0`}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-neutral-800 hover:bg-neutral-100"
                          aria-label={`Edit ${avail.name}`}
                          onClick={() => console.log('Edit:', avail.id)}
                        >
                          <FontAwesomeIcon name="pencil" className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-neutral-800 hover:bg-neutral-100"
                          aria-label={`Copy ${avail.name}`}
                          onClick={() => console.log('Copy (existing row action, not part of bulk clone):', avail.id)}
                        >
                          <FontAwesomeIcon name="copy" className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-negative-default hover:bg-negative-default/10 hover:text-negative-default"
                          aria-label={`Delete ${avail.name}`}
                          onClick={() => console.log('Delete:', avail.id)}
                        >
                          <FontAwesomeIcon name="trash" className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
