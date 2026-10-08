import { config } from 'dotenv';
import { resolve } from 'path';

/** Lê o .env da raiz do monorepo (ou da pasta atual) uma única vez. */
let carregado = false;
export function carregarAmbiente(): void {
  if (carregado) return;
  config({ path: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')], quiet: true } as never);
  carregado = true;
}

export function urlDoBanco(): string {
  carregarAmbiente();
  return process.env.DATABASE_URL ?? 'postgres://cestacorp:cestacorp@localhost:5432/cestacorp';
}
