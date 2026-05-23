// Centralizované formátovacie funkcie pre celý projekt.
// Použiť všade kde sa zobrazuje číslo, hmotnosť, euro alebo percentuálna hodnota.
//
// Slovenské konvencie:
// - desatinný oddeľovač: čiarka (,)
// - tisícový oddeľovač: medzera ( )
// - 30.0 → "30" (bez zbytočného .0)
// - 4.5 → "4,5"
// - 1234.5 → "1 234,5"

// Formátuje číslo podľa slovenských pravidiel
// 30.0 → "30", 4.5 → "4,5", 1234.5 → "1 234,5"
export function formatNumber(value: number | null | undefined, decimals?: number): string {
  if (value === null || value === undefined) return '—';
  const rounded = decimals !== undefined ? Number(value.toFixed(decimals)) : value;
  return rounded.toLocaleString('sk-SK');
}

// Formátuje hmotnosť — inteligentne skráti desatinné miesta
// 30.0 → "30 kg", 4.5 → "4,5 kg", 0.5 → "500 g"
export function formatWeight(grams: number | null | undefined): string {
  if (grams === null || grams === undefined) return '—';
  if (grams >= 1000) {
    const kg = grams / 1000;
    const rounded = Number(kg.toFixed(kg % 1 === 0 ? 0 : 2));
    return rounded.toLocaleString('sk-SK') + ' kg';
  }
  return Math.round(grams) + ' g';
}

// Formátuje kg hodnotu (pre sklad kde je jednotka kg)
// 30.0 → "30 kg", 4.5 → "4,5 kg", 1.0 → "1 kg"
export function formatKg(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const rounded = Number(value.toFixed(value % 1 === 0 ? 0 : 2));
  return rounded.toLocaleString('sk-SK') + ' kg';
}

// Formátuje euro hodnotu
// 1234.5 → "1 234,50 €", 62.7 → "62,70 €"
export function formatEur(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// Formátuje percentá
// 12.5 → "12,5 %", 100 → "100 %"
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const rounded = Number(value.toFixed(value % 1 === 0 ? 0 : 1));
  return rounded.toLocaleString('sk-SK') + ' %';
}
