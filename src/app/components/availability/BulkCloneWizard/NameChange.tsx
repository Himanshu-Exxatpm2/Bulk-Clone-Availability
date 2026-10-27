/** Shown when numbering at creation changed a name from the one the coordinator saw in step 1. */
export function NameChange({ stepOne, saved }: { stepOne?: string; saved: string }) {
  if (!stepOne || stepOne === saved) return null;
  return (
    <span className="mt-0.5 block text-xs text-neutral-600">
      Step 1: {stepOne} <span aria-hidden="true">→</span> Saved as: <span className="font-medium text-neutral-800">{saved}</span>
    </span>
  );
}
