import { useMemo, useState } from 'react';
import { Filter } from 'lucide-react';
import { Availability } from '../../../data/mockAvailabilities';
import { FontAwesomeIcon } from '../../font-awesome-icon';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Checkbox } from '../../ui/checkbox';
import { PublishPreferenceCard } from '../PublishPreferenceCard';
import { PublishPreferenceCardState, isCardValid, publishIssuesForStart } from '../publishPreferenceData';

// ── Default preference ─────────────────────────────────────────────────────────

const DEFAULT_PREF: PublishPreferenceCardState = {
  cardId: 'global',
  whoSees: undefined,
  selectedTierIds: [],
  tierDates: [],
  publishWhen: undefined,
  publishOn: '',
  dueDate: '',
};

function formatDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Per-clone problems with the preference that applies to it (its override in
 * "Customise" mode, otherwise the default), checked against its new start date.
 */
export function publishRowIssues(
  availabilities: Availability[],
  dates: Record<string, { startDate: string; endDate: string }>,
  mode: 'all' | 'individual',
  defaultPreference: PublishPreferenceCardState | null,
  overrides: Record<string, PublishPreferenceCardState>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const a of availabilities) {
    const pref = mode === 'individual' && overrides[a.id] ? overrides[a.id] : defaultPreference;
    const issues = pref ? publishIssuesForStart(pref, dates[a.id]?.startDate ?? '') : [];
    if (issues.length > 0) out[a.id] = issues;
  }
  return out;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Step4PublishProps {
  availabilities: Availability[];
  resolvedNames: Record<string, string>;
  dates: Record<string, { startDate: string; endDate: string }>;
  initialMode: 'all' | 'individual';
  initialDefaultPreference: PublishPreferenceCardState | null;
  initialOverrides: Record<string, PublishPreferenceCardState>;
  onDataChange: (
    mode: 'all' | 'individual',
    defaultPreference: PublishPreferenceCardState | null,
    overrides: Record<string, PublishPreferenceCardState>,
  ) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Step4Publish({
  availabilities,
  resolvedNames,
  dates,
  initialMode,
  initialDefaultPreference,
  initialOverrides,
  onDataChange,
}: Step4PublishProps) {
  const [publishMode, setPublishMode] = useState<'all' | 'individual'>(initialMode);
  const [defaultPreference, setDefaultPreference] = useState<PublishPreferenceCardState | null>(
    initialDefaultPreference,
  );
  const [overrides, setOverrides] = useState<Record<string, PublishPreferenceCardState>>(
    initialOverrides,
  );
  // Which rows have their override panel expanded
  const [expandedOverrides, setExpandedOverrides] = useState<Set<string>>(
    new Set(Object.keys(initialOverrides)),
  );

  const emit = (
    mode: 'all' | 'individual',
    def: PublishPreferenceCardState | null,
    ovr: Record<string, PublishPreferenceCardState>,
  ) => onDataChange(mode, def, ovr);

  const handleModeChange = (mode: 'all' | 'individual') => {
    setPublishMode(mode);
    emit(mode, defaultPreference, overrides);
  };

  const handleDefaultChange = (pref: PublishPreferenceCardState) => {
    setDefaultPreference(pref);
    emit(publishMode, pref, overrides);
  };

  const handleOverrideChange = (id: string, pref: PublishPreferenceCardState) => {
    const next = { ...overrides, [id]: pref };
    setOverrides(next);
    emit(publishMode, defaultPreference, next);
  };

  const handleRemoveOverride = (id: string) => {
    const next = { ...overrides };
    delete next[id];
    setOverrides(next);
    setExpandedOverrides((prev) => { const s = new Set(prev); s.delete(id); return s; });
    emit(publishMode, defaultPreference, next);
  };

  const toggleExpand = (id: string) => {
    setExpandedOverrides((prev) => {
      const s = new Set(prev);
      if (s.has(id)) { s.delete(id); } else { s.add(id); }
      return s;
    });
  };

  // ── Filter (which rows the override list shows) ───────────────────────────
  const FILTER_FIELDS = [
    { key: 'discipline', label: 'Discipline' },
    { key: 'programType', label: 'Program Type' },
    { key: 'locationGroup', label: 'Location Group' },
    { key: 'experienceType', label: 'Experience Type' },
  ] as const;
  type FilterKey = (typeof FILTER_FIELDS)[number]['key'];
  const [filters, setFilters] = useState<Record<FilterKey, string[]>>({
    discipline: [], programType: [], locationGroup: [], experienceType: [],
  });

  const filterOptions = useMemo(() => {
    const out = {} as Record<FilterKey, string[]>;
    for (const f of FILTER_FIELDS) {
      out[f.key] = Array.from(new Set(availabilities.map((a) => String(a[f.key])))).sort();
    }
    return out;
  }, [availabilities]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFilterCount = FILTER_FIELDS.reduce((n, f) => n + filters[f.key].length, 0);
  const shown = availabilities.filter((a) =>
    FILTER_FIELDS.every((f) => filters[f.key].length === 0 || filters[f.key].includes(String(a[f.key]))),
  );
  const toggleFilter = (key: FilterKey, value: string) =>
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((v) => v !== value) : [...prev[key], value],
    }));
  const clearFilters = () =>
    setFilters({ discipline: [], programType: [], locationGroup: [], experienceType: [] });

  const rowIssues = publishRowIssues(availabilities, dates, publishMode, defaultPreference, overrides);
  // Clones the default applies to and doesn't work for
  const defaultConflicts = availabilities.filter(
    (a) => rowIssues[a.id] && !(publishMode === 'individual' && overrides[a.id]),
  );

  const modeOption = (mode: 'all' | 'individual', title: string, hint: string) => (
    <button
      type="button"
      onClick={() => handleModeChange(mode)}
      className={[
        'flex w-full items-start gap-3 rounded-lg border-2 p-3 text-left transition-colors',
        publishMode === mode ? 'border-blue-500 bg-blue-50' : 'border-neutral-200 bg-white hover:border-neutral-300',
      ].join(' ')}
    >
      <div className={[
        'mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2',
        publishMode === mode ? 'border-blue-500' : 'border-neutral-300',
      ].join(' ')}>
        {publishMode === mode && <div className="h-2 w-2 rounded-full bg-blue-500" />}
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-850">{title}</p>
        <p className="mt-0.5 text-xs text-neutral-600">{hint}</p>
      </div>
    </button>
  );

  return (
    <div className="space-y-4">

      {/* ── Mode and default preference, side by side ────────────────────── */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-2 rounded-xl bg-card p-4 shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)]">
          <h3 className="text-sm font-semibold text-neutral-850">Publish Preference</h3>
          {modeOption('all', 'Same for all', `One setting for all ${availabilities.length} clones.`)}
          {modeOption('individual', 'Customise per availability', 'Set a default, then override specific clones.')}
        </div>

        <div>
          {publishMode === 'individual' && (
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Default — applies to all unless overridden below
            </p>
          )}
          <PublishPreferenceCard
            card={defaultPreference ?? DEFAULT_PREF}
            index={0}
            canDelete={false}
            onChange={handleDefaultChange}
            onDelete={() => {}}
          />
          {defaultConflicts.length > 0 && (
            <div role="alert" className="mt-3 rounded-lg border border-negative-default/30 bg-negative-default/5 p-3 text-sm text-negative-default">
              <p className="font-medium">
                This setting doesn't work for {defaultConflicts.length}{' '}
                {defaultConflicts.length === 1 ? 'clone' : 'clones'} — schools must be able to request before the rotation starts:
              </p>
              <ul className="mt-1.5 space-y-0.5 text-xs">
                {defaultConflicts.map((a) => (
                  <li key={a.id}>
                    {resolvedNames[a.id] || a.name} (starts {formatDate(dates[a.id]?.startDate ?? '')}) — {rowIssues[a.id].join(' and ')}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-xs">
                Choose earlier dates{publishMode === 'all' ? ', or customise per availability' : ', or override these clones below'}.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Per-availability overrides (individual mode only) ────────────── */}
      {publishMode === 'individual' && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Individual overrides
            </p>
            <span className="text-xs text-neutral-600">
              {activeFilterCount > 0 ? `${shown.length} of ${availabilities.length} shown` : `${availabilities.length} clones`}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {activeFilterCount > 0 && (
                <>
                  <button type="button" onClick={clearFilters} className="text-xs text-neutral-600 hover:underline">
                    Clear filter
                  </button>
                </>
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
                  >
                    <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                    Filter
                    {activeFilterCount > 0 && (
                      <span className="rounded-full bg-blue-500 px-1.5 text-[10px] font-semibold text-white">{activeFilterCount}</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="max-h-72 w-72 overflow-y-auto overscroll-contain p-0"
                  // The drawer locks page scroll; without this the wheel never reaches the list
                  onWheel={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                >
                  {FILTER_FIELDS.map((f) => (
                    <div key={f.key} className="border-b border-neutral-100 py-2 last:border-b-0">
                      <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">{f.label}</p>
                      {filterOptions[f.key].map((opt) => (
                        <label key={opt} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-50">
                          <Checkbox checked={filters[f.key].includes(opt)} onCheckedChange={() => toggleFilter(f.key, opt)} />
                          <span className="text-neutral-850">{opt}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="divide-y divide-neutral-100 overflow-hidden rounded-xl bg-card shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)]">
            {shown.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-neutral-600">No clones match this filter.</p>
            )}
            {shown.map((a) => {
              const name = resolvedNames[a.id] || a.name;
              const hasOverride = !!overrides[a.id];
              const isExpanded = expandedOverrides.has(a.id);
              const overridePref = overrides[a.id];
              const overrideValid = hasOverride ? isCardValid(overridePref) : true;
              const rowDates = dates[a.id];
              const dateRange = rowDates
                ? `${formatDate(rowDates.startDate)} – ${formatDate(rowDates.endDate)}`
                : null;

              return (
                <div key={a.id} className="bg-white">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="flex-shrink-0">
                      {hasOverride ? (
                        overrideValid ? (
                          <FontAwesomeIcon name="circleCheck" className="h-4 w-4 text-positive-default" aria-hidden="true" />
                        ) : (
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-negative-default/10 text-xs font-bold text-negative-default">!</span>
                        )
                      ) : (
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-neutral-100 text-xs text-neutral-600">—</span>
                      )}
                    </div>

                    {/* Name, dates and status on one line */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <p className="truncate text-sm text-neutral-850">{name}</p>
                        {dateRange && (
                          <span className="flex items-center gap-1 text-xs text-neutral-600">
                            <FontAwesomeIcon name="calendar" className="h-3 w-3 text-neutral-500" aria-hidden="true" />
                            {dateRange}
                          </span>
                        )}
                        <span className="text-xs text-neutral-600">
                          {hasOverride
                            ? <span className="font-medium text-blue-500">Custom preference set</span>
                            : 'Using default'}
                        </span>
                      </div>
                      {rowIssues[a.id] && (
                        <p className="mt-0.5 text-xs text-negative-default">
                          {rowIssues[a.id].join(' and ')} ({formatDate(rowDates?.startDate ?? '')})
                        </p>
                      )}
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-2">
                      {hasOverride ? (
                        <>
                          <button type="button" onClick={() => toggleExpand(a.id)} className="text-xs text-blue-500 hover:underline">
                            {isExpanded ? 'Collapse' : 'Edit'}
                          </button>
                          <button type="button" onClick={() => handleRemoveOverride(a.id)} className="text-xs text-negative-default hover:underline">
                            Remove
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            // Seed the override with the current default so the user
                            // starts from a pre-filled state rather than blank
                            handleOverrideChange(a.id, { ...(defaultPreference ?? DEFAULT_PREF) });
                            setExpandedOverrides((prev) => new Set([...prev, a.id]));
                          }}
                          className="rounded border border-blue-500 px-2 py-1 text-xs text-blue-500 transition-colors hover:bg-blue-50"
                        >
                          + Override
                        </button>
                      )}
                    </div>
                  </div>

                  {hasOverride && isExpanded && (
                    <div className="border-t border-neutral-100 bg-blue-50/30 px-3 pb-3 pt-3">
                      <PublishPreferenceCard
                        card={overridePref}
                        index={0}
                        canDelete={false}
                        onChange={(pref) => handleOverrideChange(a.id, pref)}
                        onDelete={() => {}}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
