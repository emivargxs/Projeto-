const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-10-15" → "15 out 2026" */
export function data(iso: string | null | undefined, comAno = true): string {
  if (!iso) return '—';
  const [a, m, d] = iso.split('-');
  return `${d} ${MESES[Number(m) - 1]}${comAno ? ` ${a}` : ''}`;
}

/** 2.5 → "2,5h" */
export function horas(n: number): string {
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`;
}

export function moeda(n: number): string {
  return n === 0 ? 'Gratuito' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function hojeIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
