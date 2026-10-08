import { Injectable } from '@nestjs/common';
import { Banco } from '../../compartilhado/banco';
import { hoje, iso, isoDe } from '../../compartilhado/datas';

export const cicloAtual = () => String(hoje().getFullYear());

/** Interface pública do módulo PDI. */
@Injectable()
export class PdiApi {
  constructor(private readonly banco: Banco) {}

  /** Cursos que fazem parte da trilha do PDI do colaborador no ciclo atual. */
  async cursosDoPdi(colaboradorId: number): Promise<{ cursoId: number; prazo: string }[]> {
    const linhas = await this.banco.consultar<{ curso_id: number; prazo: Date }>(
      `SELECT a.curso_id, a.prazo FROM pdi_acao a JOIN pdi p ON p.id = a.pdi_id
        WHERE p.colaborador_id = $1 AND p.ciclo = $2 AND a.curso_id IS NOT NULL`,
      [colaboradorId, cicloAtual()],
    );
    return linhas.map((l) => ({ cursoId: l.curso_id, prazo: isoDe(l.prazo)! }));
  }

  /** Ações concluídas / total do PDI do ciclo atual (null se não há PDI). */
  async progresso(colaboradorId: number): Promise<{ concluidas: number; total: number; atrasadas: number } | null> {
    const l = await this.banco.primeiro<{ total: number; concluidas: number; atrasadas: number }>(
      `SELECT count(a.id)::int AS total,
              count(a.id) FILTER (WHERE a.progresso = 100)::int AS concluidas,
              count(a.id) FILTER (WHERE a.progresso < 100 AND a.prazo < $3)::int AS atrasadas
         FROM pdi p LEFT JOIN pdi_acao a ON a.pdi_id = p.id
        WHERE p.colaborador_id = $1 AND p.ciclo = $2
        GROUP BY p.id`,
      [colaboradorId, cicloAtual(), iso(hoje())],
    );
    return l;
  }

  /** Quando um curso do PDI é validado, a ação correspondente fica 100% concluída. */
  async registrarCursoConcluido(colaboradorId: number, cursoId: number): Promise<void> {
    await this.banco.consultar(
      `UPDATE pdi_acao a SET progresso = 100 FROM pdi p
        WHERE p.id = a.pdi_id AND p.colaborador_id = $1 AND p.ciclo = $2 AND a.curso_id = $3`,
      [colaboradorId, cicloAtual(), cursoId],
    );
  }
}
