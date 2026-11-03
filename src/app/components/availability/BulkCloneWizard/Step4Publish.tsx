import { useState } from 'react';
import { Availability } from '../../../data/mockAvailabilities';
import { FontAwesomeIcon } from '../../font-awesome-icon';
import { Button } from '../../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { PublishPreferenceCard } from '../PublishPreferenceCard';
import {
  PublishPreferenceCardState,
  makeEmptyCard,
  publicOverlapWarnings,
  publishIssuesForStart,
} from '../publishPreferenceData';

function formatDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Per-clone problems with any of the preferences, checked against its new start date. */
export function publishRowIssues(
  availabilities: Availability[],
  dates: Record<string, { startDate: string; endDate: string }>,
  preferences: PublishPreferenceCardState[],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const a of availabilities) {
    const issues = Array.from(
      new Set(preferences.flatMap((p) => publishIssuesForStart(p, dates[a.id]?.startDate ?? ''))),
    );
    if (issues.length > 0) out[a.id] = issues;
  }
  return out;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Step4PublishProps {
  availabilities: Availability[];
  resolvedNames: Record<string, string>;
  dates: Record<string, { startDate: string; endDate: string }>;
  initialPreferences: PublishPreferenceCardState[];
  onDataChange: (preferences: PublishPreferenceCardState[]) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
// Same as Publish Preferences when creating an availability: one or more preferences,
// each with who sees it and when it is published. Every clone gets all of them; there
// is no per-availability setting.

export function Step4Publish({
  availabilities,
  resolvedNames,
  dates,
  initialPreferences,
  onDataChange,
}: Step4PublishProps) {
  const [preferences, setPreferences] = useState<PublishPreferenceCardState[]>(
    initialPreferences.length > 0 ? initialPreferences : [makeEmptyCard()],
  );

  const update = (next: PublishPreferenceCardState[]) => {
    setPreferences(next);
    onDataChange(next);
  };

  const warnings = publicOverlapWarnings(preferences);
  const rowIssues = publishRowIssues(availabilities, dates, preferences);
  // Clones the preferences don't work for
  const conflicts = availabilities.filter((a) => rowIssues[a.id]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-card p-4 shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="text-base font-semibold text-neutral-850">{`Publish Preferences (${preferences.length})`}</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex text-neutral-600" tabIndex={0} aria-label="About publish preferences">
                  <FontAwesomeIcon name="circleQuestion" className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Every clone gets these preferences.
              </TooltipContent>
            </Tooltip>
            <p className="text-xs text-neutral-700">
              Give partner schools or specific partner categories early access and expand visibility to all schools
              later with multiple publish preferences
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => update([...preferences, makeEmptyCard()])}
          >
            <FontAwesomeIcon name="plus" className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Add Publish Preference
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-start gap-4">
          {preferences.map((pref, i) => (
            <div key={pref.cardId} className="w-full sm:w-[340px]">
              <PublishPreferenceCard
                card={pref}
                index={i}
                canDelete={preferences.length > 1}
                warning={warnings[pref.cardId]}
                onChange={(next) => update(preferences.map((p) => (p.cardId === pref.cardId ? next : p)))}
                onDelete={() => update(preferences.filter((p) => p.cardId !== pref.cardId))}
              />
            </div>
          ))}
        </div>
      </div>

      {conflicts.length > 0 && (
        <div role="alert" className="rounded-lg border border-negative-default/30 bg-negative-default/5 p-3 text-sm text-negative-default">
          <p className="font-medium">
            These settings don't work for {conflicts.length} {conflicts.length === 1 ? 'clone' : 'clones'} — schools must be able to request before the rotation starts:
          </p>
          <ul className="mt-1.5 space-y-0.5 text-xs">
            {conflicts.map((a) => (
              <li key={a.id}>
                {resolvedNames[a.id] || a.name} (starts {formatDate(dates[a.id]?.startDate ?? '')}) — {rowIssues[a.id].join(' and ')}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs">Choose an earlier publish or due date, or go back to Dates and choose later ones.</p>
        </div>
      )}
    </div>
  );
}
