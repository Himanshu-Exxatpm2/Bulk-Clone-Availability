import { useState, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '../../ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog';
import { Button } from '../../ui/button';
import { FontAwesomeIcon } from '../../font-awesome-icon';
import {
  Availability,
  AvailabilityStatus,
  CURRENT_USER_NAME,
  newAvailabilityId,
  todayISO,
} from '../../../data/mockAvailabilities';
import { PublishPreferenceCardState, isCardValid, makeEmptyCard, statusForPreferences } from '../publishPreferenceData';
import { WizardStepIndicator } from './WizardStepIndicator';
import { Step1Naming, Step1Data } from './Step1Naming';
import { Step2Dates, Step2Data, defaultRollMonths, rolledDates } from './Step2Dates';
import { Step3Review } from './Step3Review';
import { Step4Publish, publishRowIssues } from './Step4Publish';
import { finalizeNames, resolveName } from './naming';
import { CURRENT_USER_EMAIL, HistoryEntry, describeSource, describeTarget, statusFor } from '../../../data/bulkHistory';
import { CreationResult, cloneOutcome, wasCreated } from './backendCheck';

/** A job handed to the Availability list when the coordinator clicks Done: it runs behind the scenes */
export interface SubmittedJob {
  /** The history entry while the job is running */
  progressEntry: HistoryEntry;
  /** The history entry once it has finished */
  finalEntry: HistoryEntry;
  /** What the job creates, added to the list when it finishes */
  created: Availability[];
}

interface Step4Data {
  /** Every clone gets all of these; there is no per-availability setting */
  preferences: PublishPreferenceCardState[];
}


// Step order: 1 Naming, 2 Dates, 3 Review, 4 Publish.
// Nothing stops the batch up front; only the backend can know what it will accept, so it is
// found out at creation: an availability whose locations are all inactive is not created, one with
// some inactive locations is created with the active ones, and a deleted original is skipped.
// Everything that is created is published as the publish preference says.

// ── Props ─────────────────────────────────────────────────────────────────────

interface BulkCloneWizardProps {
  availabilities: Availability[];
  /** Every name already in the Availability list; clones may not reuse one. */
  existingNames: string[];
  /** Set when everything was selected across all pages: the Review step doesn't allow removing rows */
  removalLocked?: boolean;
  onClose: () => void;
  /** The history record of this job: written as In progress when Create is confirmed. */
  onHistoryChange: (entry: HistoryEntry) => void;
  /** Called on Done: the job runs behind the scenes, the wizard closes and a banner on the list tracks it */
  onSubmitJob: (job: SubmittedJob) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BulkCloneWizard({
  availabilities: initialAvailabilities,
  existingNames,
  removalLocked = false,
  onClose,
  onHistoryChange,
  onSubmitJob,
}: BulkCloneWizardProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  // Rows removed in Review stay removed across Back/Next
  const [removedIds, setRemovedIds] = useState<string[]>([]);

  const [step1Data, setStep1Data] = useState<Step1Data>({ template: '' });
  const [step1IsValid, setStep1IsValid] = useState(false);

  const [step2Data, setStep2Data] = useState<Step2Data>({ mode: 'roll', dates: {} });
  const [step2IsValid, setStep2IsValid] = useState(false);
  const firstDatesRef = useRef<string | null>(null);

  const [step4Data, setStep4Data] = useState<Step4Data>(() => ({ preferences: [makeEmptyCard()] }));
  // The job started by Create, handed to the list when the coordinator clicks Done
  const [pendingJob, setPendingJob] = useState<SubmittedJob | null>(null);
  // One job: its id links every clone back to its history entry; the time is when creation started
  const batchIdRef = useRef(`batch-${Date.now()}`);
  const ranAtRef = useRef<string>(new Date().toISOString());
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const activeAvailabilities = useMemo(
    () => initialAvailabilities.filter((a) => !removedIds.includes(a.id)),
    [initialAvailabilities, removedIds],
  );

  // The dates the clones will get: the ones chosen in the Dates step, or the suggested ones until then.
  // Year of Start Date in a name follows these.
  const newDates = useMemo(() => {
    const suggested = rolledDates(activeAvailabilities, defaultRollMonths(activeAvailabilities, todayISO()));
    return { ...suggested, ...step2Data.dates };
  }, [activeAvailabilities, step2Data.dates]);

  // Names shown in steps 1 to 4 are the template names only. A row's name never depends on
  // another row, so it holds across pages. #2, #3 for repeats are added when Create is confirmed.
  const resolvedNames = useMemo(
    () => Object.fromEntries(activeAvailabilities.map((a) => [a.id, resolveName(a, step1Data.template, newDates)])),
    [activeAvailabilities, step1Data.template, newDates],
  );
  const [confirmCreate, setConfirmCreate] = useState(false);

  // What the backend does with each clone. Only read once creation starts; nothing earlier knows.
  const outcomes = useMemo(
    () => Object.fromEntries(activeAvailabilities.map((a) => [a.id, cloneOutcome(a)])),
    [activeAvailabilities],
  );

  // ── Step navigation ──────────────────────────────────────────────────────
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
    }
  };

  const publishIssues = publishRowIssues(activeAvailabilities, step2Data.dates, step4Data.preferences);
  const step4Valid =
    step4Data.preferences.length > 0 &&
    step4Data.preferences.every(isCardValid) &&
    Object.keys(publishIssues).length === 0;

  const startCreation = () => {
    if (!step4Valid) return;
    setConfirmCreate(false);
    // Names are numbered against every availability already in the list, at creation.
    // Only clones that will be created take a number; one that is not created keeps its naming-step name.
    const saved = finalizeNames(activeAvailabilities.filter((a) => outcomes[a.id].kind === 'created' || outcomes[a.id].kind === 'partial'), resolvedNames, existingNames);
    const names = Object.fromEntries(Object.entries(saved).map(([id, f]) => [id, f.name]));
    ranAtRef.current = new Date().toISOString();
    const results: CreationResult[] = activeAvailabilities.map((a) => ({ availability: a, outcome: outcomes[a.id] }));
    const job: SubmittedJob = {
      progressEntry: buildHistoryEntry([], names),
      finalEntry: buildHistoryEntry(results, names),
      created: buildCreatedAvailabilities(results, names),
    };
    // The job is on record from the moment it starts, whether or not the browser stays open
    onHistoryChange(job.progressEntry);
    // The pop-up below tells the coordinator the job has started; Done hands it to the list
    setPendingJob(job);
  };
  // Every Create is confirmed first, whether the clones go live now, on a date or are not published
  const handleCreate = () => {
    if (step4Valid) setConfirmCreate(true);
  };
  // Done (or the X) on the initiated message: the wizard closes and the banner on the list takes over
  const finishInitiated = () => {
    if (pendingJob) onSubmitJob(pendingJob);
  };

  const isLastStep = currentStep === 4;

  // Closing loses the coordinator's work, so ask once anything has been entered
  const handleDatesChange = (data: Step2Data) => {
    const key = JSON.stringify(data.dates);
    if (firstDatesRef.current === null) firstDatesRef.current = key;
    setStep2Data(data);
  };
  const isDirty =
    pendingJob === null &&
    (currentStep > 1 ||
      step1Data.template !== '' ||
      removedIds.length > 0 ||
      step2Data.mode !== 'roll' ||
      (firstDatesRef.current !== null && firstDatesRef.current !== JSON.stringify(step2Data.dates)));
  const requestClose = () => (isDirty ? setConfirmDiscard(true) : onClose());

  // One stable id per clone, shared by the Availability list and this job's history entry
  const cloneIdFor = (sourceId: string) => `clone-${batchIdRef.current}-${sourceId}`;

  function buildCreatedAvailabilities(results: CreationResult[], names: Record<string, string>): Availability[] {
    const today = todayISO();
    // Clones that were not created (inactive location, deleted original) are left out
    return results.filter(wasCreated).map((r) => {
      // Published once any audience can see it today; otherwise Unpublished
      const derivedStatus: AvailabilityStatus = statusForPreferences(step4Data.preferences);
      // The last date schools can request is the latest due date among the preferences
      const dueDates = step4Data.preferences.filter((p) => p.publishWhen !== 'Do Not Publish' && p.dueDate).map((p) => p.dueDate);

      return {
        ...r.availability,
        id: cloneIdFor(r.availability.id),
        name: names[r.availability.id] || resolvedNames[r.availability.id] || r.availability.name,
        // Inactive locations are left out of the clone
        location: r.outcome.kind === 'partial' ? r.outcome.kept.join(', ') : r.availability.location,
        startDate:
          step2Data.dates[r.availability.id]?.startDate ?? r.availability.startDate,
        endDate:
          step2Data.dates[r.availability.id]?.endDate ?? r.availability.endDate,
        status: derivedStatus,
        dueDate: dueDates.length > 0 ? dueDates.sort()[dueDates.length - 1] : undefined,
        publishOptions: step4Data.preferences.map((p) => ({
          whoSees: p.whoSees ?? '',
          publishWhen: p.publishWhen ?? '',
          publishOn: p.publishWhen === 'Now' ? today : p.publishOn,
          dueDate: p.dueDate,
        })),
        // A clone is a new record: its own ID and creation stamp, no requests yet
        availabilityId: newAvailabilityId(),
        createdBy: CURRENT_USER_NAME,
        createdOn: today,
        pendingRequests: 0,
        requestedSlots: 0,
        clonedFrom: {
          batchId: batchIdRef.current,
          sourceName: r.availability.name,
          clonedOn: today,
          clonedBy: CURRENT_USER_NAME,
        },
      };
    });
  }

  // The record kept in Bulk Creation History for this job
  // `results` is empty while the job is still running
  function buildHistoryEntry(results: CreationResult[], names: Record<string, string>): HistoryEntry {
    const created = results.filter(wasCreated).length;
    const failed = results.length - created;
    return {
      id: batchIdRef.current,
      type: 'Bulk Clone',
      ranAt: ranAtRef.current,
      runBy: CURRENT_USER_EMAIL,
      status: results.length < activeAvailabilities.length ? 'In progress' : statusFor(created, failed),
      namePattern: step1Data.template.trim(),
      total: activeAvailabilities.length,
      created,
      failed,
      source: describeSource(activeAvailabilities),
      target: describeTarget(
        step2Data.mode,
        step2Data.rollMonths,
        activeAvailabilities.map((a) => step2Data.dates[a.id]).filter(Boolean),
      ),
      rows: results.map((r) => ({
        availabilityId: cloneIdFor(r.availability.id),
        stepOneName: resolvedNames[r.availability.id] || r.availability.name,
        originalName: r.availability.name,
        sourceId: r.availability.id,
        savedName: names[r.availability.id] || resolvedNames[r.availability.id] || r.availability.name,
        status: wasCreated(r) ? 'created' : 'failed',
        problems:
          r.outcome.kind === 'deleted'
            ? [{ problem: 'The original availability was deleted before the clone ran.', fix: 'Nothing to do unless the delete was a mistake; then restore the original and clone it again.' }]
            : r.outcome.kind === 'inactive'
            ? [{ problem: `Not created: ${r.outcome.locations.join(', ')} ${r.outcome.locations.length === 1 ? 'is' : 'are'} inactive.`, fix: 'Make the location active, or clone to a different location.' }]
            : r.outcome.kind === 'partial'
            ? [{ problem: `${r.outcome.leftOut.join(', ')} ${r.outcome.leftOut.length === 1 ? 'is' : 'are'} inactive and ${r.outcome.leftOut.length === 1 ? 'was' : 'were'} left out of the availability. The availability was created.`, fix: 'To include it, make the location active and add it to the availability.' }]
            : undefined,
      })),
    };
  }

  // Why Next/Create is disabled, shown in the footer so the reason is never off-screen
  const blockedReason =
    currentStep === 1 && !step1IsValid
      ? step1Data.template.trim()
        ? 'Fix the names marked in red to continue.'
        : 'Enter a name template to continue.'
      : currentStep === 2 && !step2IsValid
      ? step2Data.mode === 'custom' && !(step2Data.customStart && step2Data.customEnd)
        ? 'Choose a start and end date to continue.'
        : 'Fix the dates marked in red to continue.'
      : currentStep === 3 && activeAvailabilities.length === 0
      ? 'Restore at least one availability to continue.'
      : currentStep === 4 && !step4Valid
      ? Object.keys(publishIssues).length > 0
        ? 'Some clones would publish or close after their rotation starts.'
        : 'Complete the publish preference to continue.'
      : null;

  // ── Render ───────────────────────────────────────────────────────────────
  const batchSummary = `${activeAvailabilities.length} ${activeAvailabilities.length === 1 ? 'availability' : 'availabilities'} in this batch`;

  // Same header as Bulk Email's Compose Email side panel. onX is omitted while availabilities are being created.
  const sheetHeader = (onX?: () => void) => (
    <div className="flex shrink-0 items-center gap-2 border-b border-neutral-200 bg-card px-4 py-3">
      {onX && (
        <button type="button" onClick={onX} aria-label="Close wizard" className="flex size-8 items-center justify-center rounded-md bg-blue-50 text-blue-500 hover:bg-blue-100">
          <X className="size-4" strokeWidth={2} />
        </button>
      )}
      <SheetTitle className="min-w-0 flex-1 truncate text-base font-semibold text-neutral-900">Clone Availabilities</SheetTitle>
      <span className="hidden text-xs text-neutral-700 sm:block" aria-live="polite">{batchSummary}</span>
    </div>
  );
  const stepRow = (step: 1 | 2 | 3 | 4) => (
    <div className="shrink-0 border-b border-neutral-200 bg-card px-4 py-3">
      <WizardStepIndicator currentStep={step} />
    </div>
  );

  return (
    <Sheet open={true}>
      <SheetContent
        side="right"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="flex h-full w-[75vw] max-w-none flex-col gap-0 bg-neutral-50 p-0 sm:max-w-none [&>button]:hidden"
      >
          {/* ── Wizard steps (1 Naming, 2 Dates, 3 Review, 4 Publish) ─────── */}
          <>
              {sheetHeader(requestClose)}
              {stepRow(currentStep)}

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3">
                {currentStep === 1 && (
                  <Step1Naming
                    availabilities={activeAvailabilities}
                    existingNames={[]}
                    initialData={step1Data}
                    dates={newDates}
                    onDataChange={setStep1Data}
                    onValidityChange={setStep1IsValid}
                  />
                )}
                {currentStep === 2 && (
                  <Step2Dates
                    availabilities={activeAvailabilities}
                    initialData={step2Data}
                    onDataChange={handleDatesChange}
                    onValidityChange={setStep2IsValid}
                  />
                )}
                {currentStep === 3 && (
                  <Step3Review
                    availabilities={activeAvailabilities}
                    resolvedNames={resolvedNames}
                    dates={step2Data.dates}
                    removedCount={removedIds.length}
                    canRemove={!removalLocked}
                    onDelete={(id) => setRemovedIds((prev) => [...prev, id])}
                    onRestoreAll={() => setRemovedIds([])}
                  />
                )}
                {currentStep === 4 && (
                  <Step4Publish
                    availabilities={activeAvailabilities}
                    resolvedNames={resolvedNames}
                    dates={step2Data.dates}
                    initialPreferences={step4Data.preferences}
                    onDataChange={(preferences) => setStep4Data({ preferences })}
                  />
                )}
              </div>

              {/* Fixed footer */}
              <div className="flex-shrink-0 border-t border-neutral-200 px-4 py-3 flex items-center justify-between gap-3 bg-card">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                >
                  <FontAwesomeIcon name="chevronLeft" className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  Back
                </Button>

                <div className="flex items-center gap-3">
                  {blockedReason && (
                    <p className="text-xs text-warning-default" aria-live="polite">{blockedReason}</p>
                  )}
                  <Button
                    onClick={isLastStep ? handleCreate : handleNext}
                    disabled={!!blockedReason}
                  >
                    {isLastStep ? (
                      'Create Availabilities'
                    ) : (
                      <>
                        Next
                        <FontAwesomeIcon name="chevronRight" className="w-4 h-4 ml-1.5" aria-hidden="true" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
      </SheetContent>

      <AlertDialog open={confirmCreate} onOpenChange={setConfirmCreate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Go live?</AlertDialogTitle>
            <AlertDialogDescription>
              {`${batchSummary.replace(' in this batch', '')} will be created and go live as set in your publish preferences. Schools will be able to see and request them once they are live.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={startCreation}>Create availabilities</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingJob !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FontAwesomeIcon name="circleCheck" className="size-5 text-positive-default" aria-hidden="true" />
              Bulk creation initiated
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bulk creation for {batchSummary.replace(' in this batch', '')} has been initiated. It will take some time to publish.
              Meanwhile, feel free to keep working. You can check the status in Bulk Creation History.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={finishInitiated}>Done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this clone?</AlertDialogTitle>
            <AlertDialogDescription>
              Any names, dates or publish settings you have entered will be lost. Your selection on the list is kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={onClose}
              className="bg-negative-default text-white hover:bg-negative-default/90"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
