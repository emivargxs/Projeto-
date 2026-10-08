import { MESES_ABREV, MESES_NOME, SerieMensal } from '@cestacorp/contracts';
import { carregarAmbiente } from './ambiente';

/** "Hoje" do sistema. DATA_REFERENCIA no .env fixa a data para demonstrações. */
export function hoje(): Date {
  carregarAmbiente();
  const ref = process.env.DATA_REFERENCIA;
  const base = ref ? new Date(`${ref}T12:00:00`) : new Date();
  return new Date(base.getFullYear(), base.getMonth(), base.getDate());
}

export function iso(data: Date): string {
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${m}-${d}`;
}

/** Converte valores de data vindos do pg (Date) ou strings em AAAA-MM-DD. */
export function isoDe(valor: Date | string | null): string | null {
  if (valor === null) return null;
  return typeof valor === 'string' ? valor.slice(0, 10) : iso(valor);
}

export function somarDias(dataIso: string, dias: number): string {
  const d = new Date(`${dataIso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return iso(d);
}

export function diasNoMes(data: Date): number {
  return new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate();
}

export function rotuloMes(data: Date): string {
  return `${MESES_NOME[data.getMonth()]} de ${data.getFullYear()}`;
}

export function serieVazia(): SerieMensal {
  return MESES_ABREV.map((rotulo, i) => ({ mes: i + 1, rotulo, horas: 0 }));
}

export function arredondar(n: number, casas = 1): number {
  const f = 10 ** casas;
  return Math.round(n * f) / f;
}

export function percentual(parte: number, total: number): number {
  return total === 0 ? 0 : Math.round((parte / total) * 100);
}
