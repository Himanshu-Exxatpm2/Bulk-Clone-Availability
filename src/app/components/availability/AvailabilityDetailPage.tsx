import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ChevronDown, Info } from 'lucide-react';
import { useAvailabilityStore } from '../../data/AvailabilityContext';
import { formatListDate, STATUS_CLASSES } from './AvailabilityListTable';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

// The availability page, laid out like production: breadcrumb, a header card with the
// status, three tabs (Availability Details, School Requests, Schedules) and the details
// in sections. A clone starts with no requests or schedules.

type DetailTab = 'details' | 'requests' | 'schedules';

const CARD = 'rounded-lg bg-card shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)]';

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={CARD}>
      <h2 className="border-b border-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-900">{title}</h2>
      <div className="space-y-4 px-5 py-4">{children}</div>
    </section>
  );
}

const Heading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-semibold text-warning-default">{children}</h3>
);
const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold text-neutral-700">{children}</p>
);
const Value = ({ children }: { children: React.ReactNode }) => <p className="mt-1 text-sm text-neutral-850">{children}</p>;

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="text-xs text-neutral-700">
      <span className="font-semibold">{label}:</span> {children}
    </span>
  );
}

const WHO_SEES_TEXT: Record<string, string> = {
  Public: 'Everyone on Exxat One can discover this availability.',
  'All Partners': 'All your partner schools can discover this availability.',
  'Tiered Partners': 'Partner schools in the selected tiers can discover this availability.',
};

export function AvailabilityDetailPage() {
  const { siteId, availabilityId } = useParams<{ siteId: string; availabilityId: string }>();
  const navigate = useNavigate();
  const { availabilities } = useAvailabilityStore();
  const [tab, setTab] = useState<DetailTab>('details');

  const a = availabilities.find((x) => x.id === availabilityId);
  const backToList = () => navigate(`/site/${siteId}/availability`);

  if (!a) {
    return (
      <div className="min-h-full bg-neutral-50 px-6 py-8">
        <p className="text-sm text-neutral-800">This availability could not be found.</p>
        <button type="button" onClick={backToList} className="mt-2 text-sm text-blue-600 hover:underline">
          Back to Availability
        </button>
      </div>
    );
  }

  // Clones carry the preferences they were created with; older records show a plain Public publish
  const publishOptions =
    a.publishOptions ??
    (a.status === 'Unpublished'
      ? [{ whoSees: 'Public', publishWhen: 'Do Not Publish', publishOn: '', dueDate: '' }]
      : [{ whoSees: 'Public', publishWhen: 'Now', publishOn: a.createdOn, dueDate: a.dueDate ?? '' }]);

  const tabs: Array<{ key: DetailTab; label: string; sub?: string }> = [
    { key: 'details', label: 'Availability Details' },
    { key: 'requests', label: `${a.requestedSlots > 0 ? a.requestedSlots : 0} School Requests`, sub: `${a.pendingRequests} Pending slots` },
    { key: 'schedules', label: 'Schedules' },
  ];

  return (
    <div className="min-h-full bg-neutral-50 px-6 py-5">
      <h1 className="text-base font-semibold text-neutral-900">View and Track Availability</h1>
      <nav aria-label="Breadcrumb" className="mt-3 flex items-center gap-2 text-xs">
        <button type="button" onClick={backToList} className="text-blue-600 hover:underline">
          Availability
        </button>
        <span className="text-neutral-500">›</span>
        <span className="text-neutral-800">{a.name}</span>
      </nav>

      {/* ── Header card ──────────────────────────────────────────────────── */}
      <div className={`${CARD} mt-3 px-5 py-4`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-neutral-900">{a.name}</h2>
              <span
                className={`inline-flex min-w-[130px] items-center justify-between gap-2 rounded px-3 py-1 text-xs font-medium ${STATUS_CLASSES[a.status]}`}
              >
                {a.status}
                <ChevronDown className="size-3.5" aria-hidden />
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex text-neutral-600" tabIndex={0} aria-label="Availability status info">
                    <Info className="size-4" aria-hidden />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  Availability will automatically be closed once its end date has passed.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
              <Meta label="Experience type">{a.experienceType}</Meta>
              <Meta label="Disciplines & specializations">{a.specializations.join(', ')}</Meta>
              <Meta label="Duration">{`${formatListDate(a.startDate)} - ${formatListDate(a.endDate)}`}</Meta>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1">
              <Meta label="Location name">{a.location}</Meta>
              <span className="inline-flex items-center gap-1.5">
                <Meta label="Created On">{formatListDate(a.createdOn)}</Meta>
                {a.clonedFrom && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex text-neutral-600" tabIndex={0} aria-label="Cloned availability">
                        <Info className="size-3.5" aria-hidden />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      {`Cloned from “${a.clonedFrom.sourceName}” by ${a.clonedFrom.clonedBy}`}
                    </TooltipContent>
                  </Tooltip>
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-neutral-700">
            <span className="flex items-center gap-2">
              <span className="rounded bg-neutral-200 px-2 py-1 text-sm font-semibold text-neutral-900">{a.slotCount}</span>
              Max. group size
            </span>
            <span className="flex items-center gap-2">
              <span className="rounded bg-blue-100 px-2 py-1 text-sm font-semibold text-neutral-900">0</span>
              Total approved
            </span>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div role="tablist" aria-label="Availability sections" className="mt-4 inline-flex rounded-lg bg-card p-1 shadow-[0_1px_1.5px_rgba(0,0,0,0.1)]">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={[
              'rounded-md px-5 py-1.5 text-center text-sm font-medium transition-colors',
              tab === t.key ? 'bg-blue-700 text-white' : 'text-neutral-800 hover:bg-neutral-100',
            ].join(' ')}
          >
            {t.label}
            {t.sub && <span className="block text-[10px] font-normal opacity-90">{t.sub}</span>}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div className="mt-4 space-y-4">
        {tab === 'details' && (
          <>
            <SectionCard title="Basic Information">
              <Heading>Who is it for?</Heading>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Associated Disciplines & Specializations</Label>
                  <Value>{a.specializations.join(', ')}</Value>
                </div>
                <div>
                  <Label>Program type</Label>
                  {a.programTypes.map((p) => (
                    <Value key={p}>{p}</Value>
                  ))}
                </div>
                <div>
                  <Label>Student year</Label>
                  <Value>Not specified</Value>
                </div>
              </div>
              <Heading>When is this availability open?</Heading>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Start date - End date</Label>
                  <Value>{`${formatListDate(a.startDate)} - ${formatListDate(a.endDate)}`}</Value>
                </div>
                <div>
                  <Label>Shift</Label>
                  <Value>Not specified</Value>
                </div>
                <div>
                  <Label>Days of the week</Label>
                  <Value>Not specified</Value>
                </div>
              </div>
              <Heading>What is the maximum number of students in a group?</Heading>
              <div>
                <Label>Number of slots</Label>
                <Value>{a.slotCount}</Value>
              </div>
            </SectionCard>

            <SectionCard title="Location">
              <div className="max-w-sm rounded-md border border-neutral-200 px-3 py-2">
                <p className="text-sm font-medium text-blue-700">{a.location}</p>
                <p className="mt-0.5 text-xs text-neutral-700">{a.locationGroup}</p>
              </div>
            </SectionCard>

            <SectionCard title="Description">
              <div>
                <Heading>Availability Details</Heading>
                <Value>Not specified</Value>
              </div>
              <div>
                <Heading>Eligibility criteria</Heading>
                <Value>Not specified</Value>
              </div>
              <div>
                <Heading>Onboarding requirements</Heading>
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Site Level Requirements</Label>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {['Background check', 'Immunization Attestation', 'Tuberculosis (TB)', 'Dress Code Policy'].map((c) => (
                        <span key={c} className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] text-neutral-800">{c}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Program-Specific Requirements</Label>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] text-neutral-800">Program Specific - Both</span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <Heading>Internal notes</Heading>
                <Value>Not specified</Value>
              </div>
            </SectionCard>

            <SectionCard title="Request Fields">
              <div>
                <Heading>Default Fields (6)</Heading>
                <ul className="mt-1 list-disc pl-5 text-sm text-neutral-850">
                  {['Number of Slots', 'Start Date', 'End Date', 'Discipline and Specialization', 'Program type', 'Graduation Year and Month'].map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
              <div>
                <Heading>New Fields Added (0)</Heading>
                <Value>Not specified</Value>
              </div>
            </SectionCard>

            <SectionCard title="Publish Options">
              <p className="text-xs font-semibold text-neutral-800">{`Published to (${publishOptions.length} ${publishOptions.length === 1 ? 'preference' : 'preferences'})`}</p>
              <div className="flex flex-wrap gap-4">
                {publishOptions.map((p, i) => (
                  <div key={i} className="w-full max-w-sm">
                    <p className="text-sm font-semibold text-neutral-900">{p.whoSees || '—'}</p>
                    <p className="mt-0.5 text-xs text-neutral-700">{WHO_SEES_TEXT[p.whoSees] ?? ''}</p>
                    <div className="mt-2 space-y-0.5 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-800">
                      <p><span className="font-semibold">Publish Status:</span> {p.publishWhen || '—'}</p>
                      <p><span className="font-semibold">Published On:</span> {p.publishOn ? formatListDate(p.publishOn) : 'Not specified'}</p>
                      <p><span className="font-semibold">Due On:</span> {p.dueDate ? formatListDate(p.dueDate) : 'Not specified'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </>
        )}

        {tab === 'requests' && (
          <div className={`${CARD} overflow-hidden`}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--bg-table-header)] text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  {['School Details', 'Requested Slots', 'Requested By', 'Program Type', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="border-b border-neutral-200 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-neutral-700">No records found</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {tab === 'schedules' && (
          <div className={`${CARD} overflow-hidden`}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--bg-table-header)] text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  {['Student', 'School', 'Program Type', 'Start Date', 'End Date', 'Status'].map((h) => (
                    <th key={h} className="border-b border-neutral-200 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-neutral-700">No records found</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
