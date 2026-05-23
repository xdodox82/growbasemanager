// Slovenské formátovanie čísel — manuálna implementácia
function formatSK(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  if (decimals === 0 || !decPart) return intFormatted;
  return intFormatted + ',' + decPart;
}
export function formatNumber(value: number | null | undefined, decimals?: number): string {
  if (value === null || value === undefined) return '—';
  if (decimals !== undefined) return formatSK(value, decimals);
  const d = value % 1 === 0 ? 0 : 2;
  return formatSK(value, d);
}
export function formatWeight(grams: number | null | undefined): string {
  if (grams === null || grams === undefined) return '—';
  if (grams >= 1000) {
    const kg = grams / 1000;
    const d = kg % 1 === 0 ? 0 : (kg * 10 % 1 === 0 ? 1 : 2);
    return formatSK(kg, d) + ' kg';
  }
  return Math.round(grams) + ' g';
}
export function formatKg(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const d = value % 1 === 0 ? 0 : (value * 10 % 1 === 0 ? 1 : 2);
  return formatSK(value, d) + ' kg';
}
export function formatEur(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return formatSK(value, 2) + '\u00A0€';
}
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const d = value % 1 === 0 ? 0 : 1;
  return formatSK(value, d) + '\u00A0%';
}
