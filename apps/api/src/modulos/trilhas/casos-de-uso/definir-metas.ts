import { Injectable } from '@nestjs/common';
import { MetaHoras, Nivel } from '@cestacorp/contracts';
import { Banco } from '../../../compartilhado/banco';

const NIVEIS_COM_META: Nivel[] = [
  'estagiario', 'auxiliar', 'assistente', 'analista_junior', 'analista_pleno', 'analista_senior', 'coordenador',
];

/** Caso de uso: o gestor define a meta de horas de treinamento por nível (base do aviso de atraso). */
@Injectable()
export class DefinirMetas {
  constructor(private readonly banco: Banco) {}

  async listar(): Promise<MetaHoras[]> {
    const linhas = await this.banco.consultar<{ nivel: Nivel; horas_mes: string }>('SELECT nivel, horas_mes FROM meta_horas');
    const porNivel = new Map(linhas.map((l) => [l.nivel, Number(l.horas_mes)]));
    return NIVEIS_COM_META.map((nivel) => ({ nivel, horasMes: porNivel.get(nivel) ?? 0 }));
  }

  async atualizar(metas: MetaHoras[]): Promise<MetaHoras[]> {
    await this.banco.transacao(async (tx) => {
      for (const m of metas) {
        await tx.consultar(
          `INSERT INTO meta_horas (nivel, horas_mes) VALUES ($1, $2)
           ON CONFLICT (nivel) DO UPDATE SET horas_mes = EXCLUDED.horas_mes`,
          [m.nivel, m.horasMes],
        );
      }
    });
    return this.listar();
  }
}
