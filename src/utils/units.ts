// Unit conversion helpers

export type WeightUnit = 'kg' | 'lbs';

const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 0.453592;

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  return from === 'kg' ? value * KG_TO_LBS : value * LBS_TO_KG;
}

export function formatWeight(value: number, unit: WeightUnit): string {
  return `${Number(value.toFixed(1))} ${unit}`;
}

export function getUnit(): WeightUnit {
  return (localStorage.getItem('gymlog_unit') as WeightUnit) || 'kg';
}

export function setUnit(unit: WeightUnit): void {
  localStorage.setItem('gymlog_unit', unit);
}
