// Prototype stand-in for the location directory: city, state and whether the location is
// active. The real values come from the Locations module. A name not listed here is treated
// as active with no city or state.

export interface LocationInfo {
  city: string;
  state: string;
  active: boolean;
}

const DC = { city: 'Washington', state: 'District of Columbia' };

const DIRECTORY: Record<string, LocationInfo> = {
  'MedStar Washington Hospital Center – ICU': { ...DC, active: true },
  'MedStar Washington Hospital Center – Radiology': { ...DC, active: true },
  'MedStar Washington Hospital Center – OT': { ...DC, active: true },
  'MedStar Washington Hospital Center – Pharmacy': { ...DC, active: true },
  'MedStar Georgetown University Hospital – NICU': { ...DC, active: true },
  'MedStar National Rehabilitation Network': { ...DC, active: true },
  'MedStar Legacy Rehabilitation Center': { ...DC, active: false },
  'ATI Physical Therapy – Rockville': { city: 'Rockville', state: 'Maryland', active: true },
  'ATI Physical Therapy – Bethesda': { city: 'Bethesda', state: 'Maryland', active: true },
  'ATI Physical Therapy – Arlington': { city: 'Arlington', state: 'Virginia', active: true },
  'Hendrick Medical Center – Med/Surg': { city: 'Abilene', state: 'Texas', active: true },
  'Hendrick Medical Center – ICU': { city: 'Abilene', state: 'Texas', active: true },
};

export function locationInfo(name: string): LocationInfo {
  return DIRECTORY[name] ?? { city: '', state: '', active: true };
}
