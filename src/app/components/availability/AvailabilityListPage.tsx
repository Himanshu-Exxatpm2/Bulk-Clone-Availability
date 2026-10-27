import { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  ChevronDown,
  CirclePlus,
  ListChecks,
  Map as MapIcon,
  MapPin,
  RotateCw,
  Search,
  UserRound,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { FontAwesomeIcon } from '../font-awesome-icon';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import {
  AvailabilityListTable,
  ColumnKey,
  MAX_CLONE_SELECTION,
  SCROLL_COLUMNS,
  SortState,
} from './AvailabilityListTable';
import { BulkCloneWizard } from './BulkCloneWizard';
import { mockAvailabilities, Availability } from '../../data/mockAvailabilities';

interface AvailabilityListPageProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

// Time-based tabs. `status` (Published/Closed/Draft/Scheduled) stays a separate
// per-row dimension shown via the Status badge column.
type ActiveTab = 'All' | 'Upcoming' | 'Current' | 'Completed';
const TABS: ActiveTab[] = ['All', 'Upcoming', 'Current', 'Completed'];
const TAB_ROUTES: Record<ActiveTab, string> = {
  All: '/availability/all',
  Upcoming: '/availability/upcoming',
  Current: '/availability/current',
  Completed: '/availability/completed',
};

// Plain string comparison on YYYY-MM-DD is safe — both sides are zero-padded ISO dates.
function getTimeBucket(a: Availability, today: string): 'Upcoming' | 'Current' | 'Completed' {
  if (a.startDate > today) return 'Upcoming';
  if (a.endDate < today) return 'Completed';
  return 'Current';
}

// ── Search (production: field picker + "Search by <field>") ──────────────────
type SearchField = 'name' | 'availabilityId' | 'location';
const SEARCH_FIELDS: Array<{ key: SearchField; label: string; value: (a: Availability) => string }> = [
  { key: 'name', label: 'Availability Name', value: (a) => a.name },
  { key: 'availabilityId', label: 'Availability ID', value: (a) => a.availabilityId },
  { key: 'location', label: 'Location Name', value: (a) => a.location },
];

// ── Filters ──────────────────────────────────────────────────────────────────
// The first five are always in the bar, as in production. The rest are added
// from "Add Filter". Within a filter, values are OR'd; across filters, AND'd.
type FilterKey = 'discipline' | 'program' | 'locationGroup' | 'location' | 'status' | 'experienceType' | 'createdBy';
const FILTERS: Array<{ key: FilterKey; label: string; icon: LucideIcon; values: (a: Availability) => string[] }> = [
  { key: 'discipline', label: 'Discipline', icon: BookOpen, values: (a) => [a.discipline] },
  { key: 'program', label: 'Programs', icon: BookOpen, values: (a) => a.programTypes },
  { key: 'locationGroup', label: 'Location Groups', icon: MapIcon, values: (a) => [a.locationGroup] },
  { key: 'location', label: 'Locations', icon: MapPin, values: (a) => [a.location] },
  { key: 'status', label: 'Status', icon: ListChecks, values: (a) => [a.status] },
  { key: 'experienceType', label: 'Experience Type', icon: Users, values: (a) => [a.experienceType] },
  { key: 'createdBy', label: 'Created By', icon: UserRound, values: (a) => [a.createdBy] },
];
const DEFAULT_FILTERS: FilterKey[] = ['discipline', 'program', 'locationGroup', 'location', 'status'];
const EXTRA_FILTERS = FILTERS.filter((f) => !DEFAULT_FILTERS.includes(f.key));
const NO_FILTERS: Record<FilterKey, string[]> = {
  discipline: [], program: [], locationGroup: [], location: [], status: [], experienceType: [], createdBy: [],
};

function matchesFilters(a: Availability, filters: Record<FilterKey, string[]>): boolean {
  return FILTERS.every(({ key, values }) => {
    const selected = filters[key];
    return selected.length === 0 || values(a).some((v) => selected.includes(v));
  });
}

function compareBy(sort: SortState) {
  const dir = sort.dir === 'asc' ? 1 : -1;
  return (x: Availability, y: Availability) => {
    if (sort.key === 'name') return x.name.localeCompare(y.name) * dir;
    if (sort.key === 'createdOn') return x.createdOn.localeCompare(y.createdOn) * dir;
    return (x.startDate.localeCompare(y.startDate) || x.endDate.localeCompare(y.endDate)) * dir;
  };
}

// ── Filter button: icon + label, multi-select menu ───────────────────────────
function FilterButton({
  label,
  icon: Icon,
  options,
  selected,
  onChange,
  onRemove,
}: {
  label: string;
  icon: LucideIcon;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Only for filters added from "Add Filter". */
  onRemove?: () => void;
}) {
  const active = selected.length > 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`h-9 gap-2 px-3 font-normal ${
            active ? 'border-blue-500 bg-blue-50 text-blue-600 hover:bg-blue-50' : 'text-neutral-850'
          }`}
          aria-label={`Filter by ${label}${active ? `, ${selected.length} selected` : ''}`}
        >
          <Icon className="size-4" strokeWidth={1.75} aria-hidden />
          {label}
          {active && (
            <span className="rounded-full bg-blue-500 px-1.5 text-xs font-medium leading-5 text-white">
              {selected.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[240px] max-h-[340px] overflow-y-auto">
        {options.length === 0 && (
          <p className="px-2 py-1.5 text-sm text-neutral-600">No values in this view</p>
        )}
        {options.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt}
            checked={selected.includes(opt)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(checked) =>
              onChange(checked ? [...selected, opt] : selected.filter((s) => s !== opt))
            }
          >
            {opt}
          </DropdownMenuCheckboxItem>
        ))}
        {(active || onRemove) && <DropdownMenuSeparator />}
        {active && <DropdownMenuItem onSelect={() => onChange([])}>Clear selection</DropdownMenuItem>}
        {onRemove && (
          <DropdownMenuItem onSelect={onRemove} className="text-negative-default focus:text-negative-default">
            <X className="size-4" aria-hidden /> Remove filter
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AvailabilityListPage({ currentPath, onNavigate }: AvailabilityListPageProps) {
  // Availability list state (seeded from mock; appended by bulk-clone submits)
  const [availabilities, setAvailabilities] = useState<Availability[]>(mockAvailabilities);

  // ── Tab state ──────────────────────────────────────────────────────────────
  const activeTab: ActiveTab =
    currentPath === '/availability/upcoming'
      ? 'Upcoming'
      : currentPath === '/availability/current'
      ? 'Current'
      : currentPath === '/availability/completed'
      ? 'Completed'
      : 'All';

  // "Today" anchored to America/New_York to match the platform's day-boundary
  // convention (reports refresh at 3:30 AM EST).
  const todayISO = useMemo(() => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year')!.value;
    const m = parts.find((p) => p.type === 'month')!.value;
    const day = parts.find((p) => p.type === 'day')!.value;
    return `${y}-${m}-${day}`;
  }, []);

  // ── Search, filter, sort and column state ──────────────────────────────────
  const [searchField, setSearchField] = useState<SearchField>('name');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<FilterKey, string[]>>(NO_FILTERS);
  const [addedFilters, setAddedFilters] = useState<FilterKey[]>([]);
  const [sort, setSort] = useState<SortState | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<ColumnKey[]>([]);

  // ── Selection + wizard state ───────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);

  const tabFiltered = useMemo<Availability[]>(
    () =>
      activeTab === 'All'
        ? availabilities
        : availabilities.filter((a) => getTimeBucket(a, todayISO) === activeTab),
    [activeTab, todayISO, availabilities],
  );

  const searchFieldDef = SEARCH_FIELDS.find((f) => f.key === searchField)!;

  const visibleAvailabilities = useMemo<Availability[]>(() => {
    const term = searchTerm.trim().toLowerCase();
    const rows = tabFiltered.filter(
      (a) =>
        (term === '' || searchFieldDef.value(a).toLowerCase().includes(term)) &&
        matchesFilters(a, filters),
    );
    return sort ? [...rows].sort(compareBy(sort)) : rows;
  }, [tabFiltered, searchTerm, searchFieldDef, filters, sort]);

  // A search or filter change narrows the selection to what's still visible
  useEffect(() => {
    const visible = new Set(visibleAvailabilities.map((a) => a.id));
    setSelectedIds((prev) => {
      const next = prev.filter((id) => visible.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [visibleAvailabilities]);

  // Options come from the current tab, plus anything already selected
  const optionsFor = (key: FilterKey) => {
    const def = FILTERS.find((f) => f.key === key)!;
    return Array.from(new Set([...tabFiltered.flatMap(def.values), ...filters[key]])).filter(Boolean).sort();
  };
  const setFilter = (key: FilterKey, next: string[]) => setFilters((prev) => ({ ...prev, [key]: next }));
  const removeFilter = (key: FilterKey) => {
    setFilter(key, []);
    setAddedFilters((prev) => prev.filter((k) => k !== key));
  };

  const handleRefresh = () => {
    setSearchField('name');
    setSearchTerm('');
    setFilters(NO_FILTERS);
    setAddedFilters([]);
    setSort(null);
  };

  // Behavior (b): a tab switch clears the selection
  const handleTabChange = (tab: ActiveTab) => {
    setSelectedIds([]);
    onNavigate(TAB_ROUTES[tab]);
  };

  // Select all selects up to the hard cap (visible rows, in the order shown)
  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? visibleAvailabilities.slice(0, MAX_CLONE_SELECTION).map((a) => a.id) : []);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) =>
        prev.includes(id) || prev.length >= MAX_CLONE_SELECTION ? prev : [...prev, id],
      );
    } else {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const handleBulkClone = () => setWizardOpen(true);

  const selectedAvailabilities = useMemo<Availability[]>(
    () => availabilities.filter((a) => selectedIds.includes(a.id)),
    [availabilities, selectedIds],
  );

  const shownFilters = [...DEFAULT_FILTERS, ...addedFilters];
  const availableExtras = EXTRA_FILTERS.filter((f) => !addedFilters.includes(f.key));
  const hasActiveFilters =
    searchTerm !== '' || addedFilters.length > 0 || sort !== null || Object.values(filters).some((v) => v.length > 0);

  return (
    <div className="bg-neutral-50 min-h-full">
      {wizardOpen && (
        <BulkCloneWizard
          availabilities={selectedAvailabilities}
          existingNames={availabilities.map((a) => a.name)}
          // Closing without creating keeps the selection, so the coordinator can reopen it
          onClose={() => setWizardOpen(false)}
          onCloneComplete={(newOnes) => {
            // Names were already numbered against the existing list when the clones were created
            if (newOnes.length > 0) setAvailabilities((prev) => [...newOnes, ...prev]);
            setWizardOpen(false);
            setSelectedIds([]);
          }}
        />
      )}

      {/* Page header */}
      <header className="bg-card border-b border-neutral-200">
        <div className="px-6 pt-5 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="size-10 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
              <FontAwesomeIcon name="calendar" className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-neutral-900 leading-7">Availability</h1>
              <p className="text-sm text-neutral-700 leading-5">Manage clinical rotation slots</p>
            </div>
          </div>
          <Button onClick={() => console.log('Post Availability')}>
            <FontAwesomeIcon name="plus" className="w-4 h-4" aria-hidden="true" />
            Post Availability
          </Button>
        </div>

        <div className="px-6 mt-4 flex gap-6" role="tablist" aria-label="Availability views">
          {TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab)}
                className={`pb-3 -mb-px text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-500'
                    : 'border-transparent text-neutral-700 hover:text-neutral-900'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </header>

      <div className="p-6">
        <section className="bg-card rounded-xl shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)] overflow-hidden">
          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap p-4 border-b border-neutral-200">
            {/* Search: field picker + input */}
            <div className="flex h-9 w-full items-stretch rounded-md border border-neutral-300 bg-card sm:w-[380px]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex w-[150px] shrink-0 items-center justify-between gap-1 border-r border-neutral-300 px-3 text-sm text-neutral-850 hover:bg-neutral-50"
                    aria-label={`Search field: ${searchFieldDef.label}`}
                  >
                    <span className="truncate">{searchFieldDef.label}</span>
                    <ChevronDown className="size-3.5 shrink-0 text-neutral-600" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[180px]">
                  <DropdownMenuLabel className="text-xs text-neutral-600">Search by</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={searchField} onValueChange={(v) => setSearchField(v as SearchField)}>
                    {SEARCH_FIELDS.map((f) => (
                      <DropdownMenuRadioItem key={f.key} value={f.key}>{f.label}</DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search by ${searchFieldDef.label}`}
                aria-label={`Search by ${searchFieldDef.label}`}
                className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-neutral-500"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="px-2.5 text-neutral-600 hover:text-neutral-900"
                  aria-label="Clear search"
                >
                  <X className="size-4" aria-hidden />
                </button>
              ) : (
                <Search className="mx-2.5 size-4 self-center text-neutral-700" aria-hidden />
              )}
            </div>

            {shownFilters.map((key) => {
              const def = FILTERS.find((f) => f.key === key)!;
              return (
                <FilterButton
                  key={key}
                  label={def.label}
                  icon={def.icon}
                  options={optionsFor(key)}
                  selected={filters[key]}
                  onChange={(next) => setFilter(key, next)}
                  onRemove={DEFAULT_FILTERS.includes(key) ? undefined : () => removeFilter(key)}
                />
              );
            })}

            <div className="ml-auto flex items-center gap-2">
              <span className="mr-1 text-sm text-neutral-700">
                {visibleAvailabilities.length} {visibleAvailabilities.length === 1 ? 'availability' : 'availabilities'}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 gap-2 border-blue-500 px-3 font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-600"
                    disabled={availableExtras.length === 0}
                  >
                    <CirclePlus className="size-4" strokeWidth={1.75} aria-hidden />
                    Add Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[200px]">
                  {availableExtras.map((f) => (
                    <DropdownMenuItem key={f.key} onSelect={() => setAddedFilters((prev) => [...prev, f.key])}>
                      <f.icon className="size-4" strokeWidth={1.75} aria-hidden />
                      {f.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-neutral-700"
                    onClick={handleRefresh}
                    disabled={!hasActiveFilters}
                    aria-label="Reset search, filters and sorting"
                  >
                    <RotateCw className="size-4" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Reset search, filters and sorting</TooltipContent>
              </Tooltip>

              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-neutral-800" aria-label="Column settings">
                        <Wrench className="size-4" aria-hidden />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">Column settings</TooltipContent>
                </Tooltip>
                <PopoverContent align="end" className="w-64 p-0">
                  <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
                    <p className="text-sm font-semibold text-neutral-900">Columns</p>
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:underline disabled:text-neutral-500 disabled:no-underline"
                      disabled={hiddenColumns.length === 0}
                      onClick={() => setHiddenColumns([])}
                    >
                      Show all
                    </button>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto py-1">
                    {SCROLL_COLUMNS.map((c) => {
                      const shown = !hiddenColumns.includes(c.key);
                      return (
                        <label key={c.key} className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm text-neutral-850 hover:bg-neutral-50">
                          <Checkbox
                            checked={shown}
                            onCheckedChange={(v) =>
                              setHiddenColumns((prev) => (v ? prev.filter((k) => k !== c.key) : [...prev, c.key]))
                            }
                          />
                          {c.label}
                        </label>
                      );
                    })}
                  </div>
                  <p className="border-t border-neutral-200 px-3 py-2 text-xs text-neutral-600">
                    Availability Name, Status and Actions are frozen and always shown.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <AvailabilityListTable
            availabilities={visibleAvailabilities}
            totalCount={visibleAvailabilities.length}
            selectedIds={selectedIds}
            hiddenColumns={hiddenColumns}
            sort={sort}
            onSortChange={setSort}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            onBulkClone={handleBulkClone}
          />
        </section>
      </div>
    </div>
  );
}
