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
import { PublishPreferenceCardState, isCardValid } from '../publishPreferenceData';
import { WizardStepIndicator } from './WizardStepIndicator';
import { Step1Naming, Step1Data } from './Step1Naming';
import { Step2Dates, Step2Data } from './Step2Dates';
import { Step3Review } from './Step3Review';
import { Step4Publish, publishRowIssues } from './Step4Publish';
import { CreationProgress } from './CreationProgress';
import { CreationSummary } from './CreationSummary';
import { finalizeNames } from './naming';
import { DraftIssue, simulateBackendCheck } from './backendCheck';

interface CreationResult {
  availability: Availability;
  status: 'created' | 'draft';
  error?: string;
}

interface Step4Data {
  publishMode: 'all' | 'individual';
  defaultPreference: PublishPreferenceCardState | null;
  overrides: Record<string, PublishPreferenceCardState>; // keyed by availability id
}

type WizardState = 'steps' | 'progress' | 'summary';

// Step order: 1 Naming, 2 Dates, 3 Review, 4 Publish.
// Nothing stops the batch up front: an availability with a data problem is still
// cloned, saved as a draft, and the reason is shown when the clones are created.

// ── Props ─────────────────────────────────────────────────────────────────────

interface BulkCloneWizardProps {
  availabilities: Availability[];
  /** Every name already in the Availability list; clones may not reuse one. */
  existingNames: string[];
  onClose: () => void;
  onCloneComplete: (created: Availability[]) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BulkCloneWizard({
  availabilities: initialAvailabilities,
  existingNames,
  onClose,
  onCloneComplete,
}: BulkCloneWizardProps) {
  const [wizardState, setWizardState] = useState<WizardState>('steps');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  // Rows removed in Review stay removed across Back/Next
  const [removedIds, setRemovedIds] = useState<string[]>([]);

  const [step1Data, setStep1Data] = useState<Step1Data>({ template: '', rawNames: {}, locationOverrides: {} });
  const [step1IsValid, setStep1IsValid] = useState(false);

  const [step2Data, setStep2Data] = useState<Step2Data>({ mode: 'roll', dates: {} });
  const [step2IsValid, setStep2IsValid] = useState(false);
  const firstDatesRef = useRef<string | null>(null);

  const [step4Data, setStep4Data] = useState<Step4Data>({
    publishMode: 'all',
    defaultPreference: null,
    overrides: {},
  });
  const [creationResults, setCreationResults] = useState<CreationResult[]>([]);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const activeAvailabilities = useMemo(
    () => initialAvailabilities.filter((a) => !removedIds.includes(a.id)),
    [initialAvailabilities, removedIds],
  );

  // Final names come from the rows still in the batch, so a removal re-numbers the rest
  const finalNames = useMemo(
    () => finalizeNames(activeAvailabilities, step1Data.rawNames, existingNames),
    [activeAvailabilities, step1Data.rawNames, existingNames],
  );
  const resolvedNames = useMemo(
    () => Object.fromEntries(Object.entries(finalNames).map(([id, f]) => [id, f.name])),
    [finalNames],
  );

  // What the backend rejects. Only read once creation starts; nothing earlier knows.
  const draftIssues = useMemo(() => {
    const out: Record<string, DraftIssue[]> = {};
    for (const a of activeAvailabilities) {
      const issues = simulateBackendCheck(a);
      if (issues.length > 0) out[a.id] = issues;
    }
    return out;
  }, [activeAvailabilities]);

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

  const publishIssues = publishRowIssues(
    activeAvailabilities,
    step2Data.dates,
    step4Data.publishMode,
    step4Data.defaultPreference,
    step4Data.overrides,
  );
  const step4Valid =
    !!step4Data.defaultPreference &&
    isCardValid(step4Data.defaultPreference) &&
    !(step4Data.publishMode === 'individual' && Object.values(step4Data.overrides).some((o) => !isCardValid(o))) &&
    Object.keys(publishIssues).length === 0;

  const handleCreate = () => {
    if (!step4Valid) return;
    setWizardState('progress');
  };

  const isLastStep = currentStep === 4;

  // Closing loses the coordinator's work, so ask once anything has been entered
  const handleDatesChange = (data: Step2Data) => {
    const key = JSON.stringify(data.dates);
    if (firstDatesRef.current === null) firstDatesRef.current = key;
    setStep2Data(data);
  };
  const isDirty =
    wizardState === 'steps' &&
    (currentStep > 1 ||
      step1Data.template !== '' ||
      removedIds.length > 0 ||
      step2Data.mode !== 'roll' ||
      (firstDatesRef.current !== null && firstDatesRef.current !== JSON.stringify(step2Data.dates)));
  const requestClose = () => (isDirty ? setConfirmDiscard(true) : onClose());

  function buildCreatedAvailabilities(): Availability[] {
    const today = todayISO();
    return creationResults.map((r) => {
      // Use per-availability override if set; otherwise fall back to default
      const pref =
        step4Data.publishMode === 'individual' && step4Data.overrides[r.availability.id]
          ? step4Data.overrides[r.availability.id]
          : step4Data.defaultPreference;

      // Scheduled for today is published straight away
      const derivedStatus: AvailabilityStatus =
        pref?.publishWhen === 'Scheduled'      ? (pref.publishOn > today ? 'Scheduled' : 'Published') :
        pref?.publishWhen === 'Do Not Publish' ? 'Draft' :
        'Published'; // 'Now' or fallback

      return {
        ...r.availability,
        id: `clone-${Date.now()}-${newAvailabilityId()}`,
        name: resolvedNames[r.availability.id] || r.availability.name,
        startDate:
          step2Data.dates[r.availability.id]?.startDate ?? r.availability.startDate,
        endDate:
          step2Data.dates[r.availability.id]?.endDate ?? r.availability.endDate,
        status: r.status === 'draft' ? 'Draft' : derivedStatus,
        dueDate: pref?.publishWhen !== 'Do Not Publish' ? pref?.dueDate || undefined : undefined,
        // A clone is a new record: its own ID and creation stamp, no requests yet
        availabilityId: newAvailabilityId(),
        createdBy: CURRENT_USER_NAME,
        createdOn: today,
        pendingRequests: 0,
        requestedSlots: 0,
      };
    });
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
        className="flex h-full w-[min(96vw,980px)] max-w-none flex-col gap-0 bg-neutral-50 p-0 sm:max-w-none [&>button]:hidden"
      >
          {/* ── Creation in flight ───────────────────────────────────────── */}
          {wizardState === 'progress' && (
            <>
              {sheetHeader()}
              {stepRow(5 as 1 | 2 | 3 | 4)}

              <div className="flex-1 overflow-y-auto min-h-0 p-4">
                <CreationProgress
                  availabilities={activeAvailabilities}
                  resolvedNames={resolvedNames}
                  draftIssues={draftIssues}
                  onComplete={(results) => {
                    setCreationResults(results);
                    setWizardState('summary');
                  }}
                />
              </div>

              <div className="flex-shrink-0 border-t border-neutral-200 px-4 py-3 flex items-center justify-end bg-card">
                <Button disabled>
                  <FontAwesomeIcon name="spinner" className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Creating…
                </Button>
              </div>
            </>
          )}

          {/* ── Summary ──────────────────────────────────────────────────── */}
          {wizardState === 'summary' && (
            <>
              {sheetHeader(() => onCloneComplete(buildCreatedAvailabilities()))}
              {stepRow(5 as 1 | 2 | 3 | 4)}

              <div className="flex-1 overflow-y-auto min-h-0 p-4">
                <CreationSummary
                  results={creationResults}
                  resolvedNames={resolvedNames}
                  onDone={() => onCloneComplete(buildCreatedAvailabilities())}
                  onViewDrafts={() => onCloneComplete(buildCreatedAvailabilities())}
                />
              </div>
            </>
          )}

          {/* ── Wizard steps (1 Naming, 2 Dates, 3 Review, 4 Publish) ─────── */}
          {wizardState === 'steps' && (
            <>
              {sheetHeader(requestClose)}
              {stepRow(currentStep)}

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto min-h-0 p-4">
                {currentStep === 1 && (
                  <Step1Naming
                    availabilities={activeAvailabilities}
                    existingNames={existingNames}
                    initialData={step1Data}
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
                    onDelete={(id) => setRemovedIds((prev) => [...prev, id])}
                    onRestoreAll={() => setRemovedIds([])}
                  />
                )}
                {currentStep === 4 && (
                  <Step4Publish
                    availabilities={activeAvailabilities}
                    resolvedNames={resolvedNames}
                    dates={step2Data.dates}
                    initialMode={step4Data.publishMode}
                    initialDefaultPreference={step4Data.defaultPreference}
                    initialOverrides={step4Data.overrides}
                    onDataChange={(mode, defaultPref, overrides) =>
                      setStep4Data({ publishMode: mode, defaultPreference: defaultPref, overrides })
                    }
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
          )}
      </SheetContent>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this clone?</AlertDialogTitle>
            <AlertDialogDescription>
              The dates, names and publish settings you've set for {batchSummary.replace(' in this batch', '')} will be
              lost. Your selection on the list is kept.
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
