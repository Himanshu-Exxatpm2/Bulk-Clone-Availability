import { useState, useEffect, useRef, useMemo } from 'react';
import { Availability } from '../../../data/mockAvailabilities';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { FontAwesomeIcon } from '../../font-awesome-icon';
import { TablePager, usePaging } from './TablePager';
import {
  TOKENS,
  TOKEN_TO_FIELD,
  fieldValue,
  parseLocations,
  resolveName,
  unknownTokens,
} from './naming';

// ── Exported types ─────────────────────────────────────────────────────────────

export interface Step1Data {
  template: string;
  /** Names from the template. Numbers for repeats (#2, #3) are added by the backend at creation. */
  rawNames: Record<string, string>;
  locationOverrides: Record<string, string>;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Step1NamingProps {
  availabilities: Availability[];
  /** Names already in the Availability list; a clone may not reuse one. */
  existingNames: string[];
  initialData: Step1Data;
  onDataChange: (data: Step1Data) => void;
  onValidityChange: (isValid: boolean) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Step1Naming({
  availabilities,
  existingNames,
  initialData,
  onDataChange,
  onValidityChange,
}: Step1NamingProps) {
  const [template, setTemplate] = useState<string>(initialData.template);
  const [locationOverrides, setLocationOverrides] = useState<Record<string, string>>(
    initialData.locationOverrides,
  );
  // @ dropdown state
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownFilter, setDropdownFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;
  const onValidityChangeRef = useRef(onValidityChange);
  onValidityChangeRef.current = onValidityChange;

  const hasTemplate = template.trim() !== '';
  const locationInTemplate = /@location(?!\w)/.test(template);
  const unknown = useMemo(() => unknownTokens(template), [template]);

  const rawNames = useMemo(() => {
    const out: Record<string, string> = {};
    for (const a of availabilities) {
      out[a.id] = resolveName(a, template, locationOverrides);
    }
    return out;
  }, [availabilities, template, locationOverrides]);

  // Only an empty name is checked here. Repeats are numbered when the clones are created.
  // The only other thing that can go wrong is an inactive location, which is found at
  // creation; that clone is saved Unpublished.
  const rowChecks = useMemo(() => {
    const out: Record<string, { errors: string[]; warnings: string[] }> = {};
    for (const a of availabilities) {
      const errors: string[] = [];
      const warnings: string[] = [];
      if (hasTemplate) {
        // A name can never be empty: it needs at least 1 character
        if (!rawNames[a.id]) errors.push("Name can't be empty");
      }
      out[a.id] = { errors, warnings };
    }
    return out;
  }, [availabilities, hasTemplate, rawNames]);

  const isValid =
    hasTemplate &&
    unknown.length === 0 &&
    availabilities.length > 0 &&
    availabilities.every((a) => rowChecks[a.id].errors.length === 0);

  useEffect(() => {
    onValidityChangeRef.current(isValid);
  }, [isValid]);

  // Propagate step data to parent whenever anything changes
  useEffect(() => {
    onDataChangeRef.current({ template, rawNames, locationOverrides });
  }, [template, rawNames, locationOverrides]);

  // ── Template mutations ───────────────────────────────────────────────────

  const handleTemplateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTemplate(val);

    // Detect @ trigger: find the word currently being typed
    const cursor = e.target.selectionStart ?? val.length;
    const match = val.slice(0, cursor).match(/@(\w*)$/);
    if (match) {
      setDropdownFilter(match[1].toLowerCase());
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
      setDropdownFilter('');
    }
  };

  // Inserts a token at the cursor, replacing a partly typed "@wor" if there is one
  const insertToken = (token: string, replacePartial: boolean) => {
    const input = inputRef.current;
    const cursor = input?.selectionStart ?? template.length;
    let before = template.slice(0, cursor);
    const after = template.slice(cursor);
    if (replacePartial) {
      before = before.replace(/@\w*$/, '');
    } else if (before && !before.endsWith(' ')) {
      before += ' ';
    }
    const spacer = after.startsWith(' ') || after === '' ? '' : ' ';
    const next = before + token + spacer + after;
    setTemplate(next);
    setShowDropdown(false);
    setDropdownFilter('');
    setTimeout(() => {
      input?.focus();
      const pos = (before + token).length;
      input?.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleTemplateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
      setDropdownFilter('');
    }
  };

  const rowsWithErrors = availabilities.filter((a) => rowChecks[a.id].errors.length > 0).length;
  // Preview table paging; the checks above still run on every row, not just the page shown
  const { pageRows, pager } = usePaging(availabilities);

  const dropdownTokens = TOKENS.filter(
    (t) => t.label.toLowerCase().includes(dropdownFilter) || t.token.toLowerCase().includes(dropdownFilter),
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Naming guideline ─────────────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <div className="flex items-start gap-2">
          <FontAwesomeIcon
            name="circleQuestion"
            className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-1">Naming Convention</p>
            <p className="text-xs text-blue-800 leading-relaxed">
              <span className="font-medium">Recommended format:</span>{' '}
              <span className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-900">
                Location – Discipline – Program Type – Season Year
              </span>
            </p>
            <p className="text-xs text-blue-700 mt-1 leading-relaxed">
              Example: <span className="italic">MedStar ICU – Nursing – BSN – Spring 2027</span>
            </p>
            <ul className="mt-2 space-y-1 text-xs text-blue-700 list-disc list-inside">
              <li>Use a separator (e.g. <span className="font-mono bg-blue-100 px-0.5 rounded"> – </span>) between fields, and add the season and year as plain text so the clone is clearly distinct from the original.</li>
              <li>If a name is already used, "#2", "#3" … is added when the clones are created. The final names are shown in the creation summary.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Section 1: Template builder ──────────────────────────────────── */}
      <div className="bg-card rounded-xl shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)] p-5">
        <h3 className="text-sm font-semibold text-neutral-850 mb-0.5">Name Template</h3>
        <p className="text-xs text-neutral-600 mb-3">
          Type freely. Use <span className="font-mono bg-neutral-100 px-1 rounded">@</span> to insert
          a merge field (e.g. <span className="font-mono bg-neutral-100 px-1 rounded">@discipline</span>).
          Add separators and season labels as plain text.
        </p>

        {/* Single input bar */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={template}
            onChange={handleTemplateInput}
            onKeyDown={handleTemplateKeyDown}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder={`e.g. @location – @discipline – Spring 2027`}
            aria-label="Name template"
            aria-invalid={unknown.length > 0}
            className={`w-full h-10 px-3 text-sm border rounded-md focus:outline-none focus:ring-2 focus:border-transparent font-mono ${
              unknown.length > 0
                ? 'border-negative-default focus:ring-negative-default'
                : 'border-neutral-300 focus:ring-blue-500'
            }`}
          />

          {/* @ dropdown */}
          {showDropdown && (
            <div className="absolute z-10 top-full mt-1 left-0 w-72 bg-card rounded-xl shadow-lg overflow-hidden border border-neutral-200">
              <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-100">
                <p className="text-xs text-neutral-600 font-medium uppercase tracking-wide">Insert field</p>
              </div>
              {dropdownTokens.map(({ token, label }) => (
                <button
                  key={token}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); insertToken(token, true); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 text-left transition-colors"
                >
                  <span className="font-mono text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded shrink-0">
                    {token}
                  </span>
                  <span className="text-sm text-neutral-800">{label}</span>
                </button>
              ))}
              {dropdownTokens.length === 0 && (
                <p className="px-3 py-3 text-xs text-neutral-600 italic">No matching fields</p>
              )}
            </div>
          )}
        </div>

        {unknown.length > 0 && (
          <p className="mt-2 text-xs text-negative-default" role="alert">
            {unknown.map((t) => `"${t}"`).join(', ')} {unknown.length === 1 ? "isn't a merge field" : "aren't merge fields"}.
            Pick a field from the list below, or remove the @.
          </p>
        )}

        {/* Available tokens */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="text-xs text-neutral-600 shrink-0 self-center">Available:</span>
          {TOKENS.map(({ token, label }) => (
            <button
              key={token}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertToken(token, false)}
              className="font-mono text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors"
              title={label}
            >
              {token}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section 2: Live preview table ────────────────────────────────── */}
      <div className="bg-card rounded-xl shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)] overflow-hidden">
        <div className="bg-neutral-50 border-b border-neutral-200 px-4 py-2.5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-800">Name Preview</h3>
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-neutral-600">
            <span>{availabilities.length} availabilit{availabilities.length !== 1 ? 'ies' : 'y'}</span>
            {hasTemplate && unknown.length === 0 && (
              <>
                {rowsWithErrors > 0 && (
                  <span className="font-medium text-negative-default">{rowsWithErrors} need fixing</span>
                )}
              </>
            )}
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--bg-table-header)]">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-700 border-b border-neutral-200 w-[30%]">
                Original Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-700 border-b border-neutral-200 w-[70%]">
                New Name
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((a, idx) => {
              const locs = parseLocations(a.location);
              const showLocPicker = locs.length > 1 && locationInTemplate;
              const { errors } = rowChecks[a.id];

              return (
                <tr key={a.id} className={idx % 2 === 0 ? 'bg-card' : 'bg-neutral-50/40'}>
                  {/* Original name */}
                  <td className="px-4 py-3 text-sm text-neutral-800 border-b border-neutral-100 align-top">
                    {a.name}
                  </td>

                  {/* New name */}
                  <td className="px-4 py-3 text-sm border-b border-neutral-100 align-top">
                    {!hasTemplate ? (
                      <span className="text-neutral-600">—</span>
                    ) : (
                      <div>
                        <div className="leading-relaxed break-words">
                          {/* The cleaned name, exactly as it will be saved */}
                          <span className="text-neutral-850">{rawNames[a.id] || '—'}</span>
                        </div>
                        {/* The only thing checked here is an empty name; there is no Check column */}
                        {unknown.length === 0 && errors.map((msg) => (
                          <p key={msg} className="mt-1 text-xs text-negative-default">{msg}</p>
                        ))}

                        {/* Location picker for multi-location availabilities; stays so the pick can change */}
                        {showLocPicker && (
                          <div className="mt-2">
                            <Select
                              value={locationOverrides[a.id] ?? ''}
                              onValueChange={(val) => setLocationOverrides((prev) => ({ ...prev, [a.id]: val }))}
                            >
                              <SelectTrigger size="sm" className="h-7 text-xs max-w-[280px]" aria-label={`Location for ${a.name}`}>
                                <SelectValue placeholder="Select location (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                {locs.map((loc) => (
                                  <SelectItem key={loc} value={loc} className="text-xs">
                                    {loc}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>

        <TablePager {...pager} />
      </div>
    </div>
  );
}
