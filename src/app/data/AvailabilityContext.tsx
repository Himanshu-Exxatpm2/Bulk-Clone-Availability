import { createContext, useContext, useState, type ReactNode } from 'react';
import { Availability, mockAvailabilities } from './mockAvailabilities';
import { HistoryEntry, SEED_HISTORY } from './bulkHistory';

// The Availability list and the availability page share one set of records, so a
// clone made in Bulk Clone is still there after opening it and coming back.
// Prototype state only: a reload starts again from the mock data.

interface AvailabilityStore {
  availabilities: Availability[];
  setAvailabilities: React.Dispatch<React.SetStateAction<Availability[]>>;
  history: HistoryEntry[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
}

const Ctx = createContext<AvailabilityStore | null>(null);

export function AvailabilityProvider({ children }: { children: ReactNode }) {
  const [availabilities, setAvailabilities] = useState<Availability[]>(mockAvailabilities);
  const [history, setHistory] = useState<HistoryEntry[]>(SEED_HISTORY);
  return <Ctx.Provider value={{ availabilities, setAvailabilities, history, setHistory }}>{children}</Ctx.Provider>;
}

export function useAvailabilityStore(): AvailabilityStore {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAvailabilityStore must be used inside AvailabilityProvider');
  return v;
}
