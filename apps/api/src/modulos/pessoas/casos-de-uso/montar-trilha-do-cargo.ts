import { Injectable, NotFoundException } from '@nestjs/common';
import { VincularCursoBody } from '@cestacorp/contracts';
import { Banco } from '../../../compartilhado/banco';
import { hoje, iso } from '../../../compartilhado/datas';
import { CatalogoApi } from '../../catalogo';

/** Caso de uso: o gestor adiciona ou remove cursos obrigatórios da trilha de um cargo. */
@Injectable()
export class MontarTrilhaDoCargo {
  constructor(
    private readonly banco: Banco,
    private readonly catalogo: CatalogoApi,
  ) {}

  async vincular(cargoId: number, corpo: VincularCursoBody): Promise<void> {
    const cargo = await this.banco.primeiro('SELECT id FROM cargo WHERE id = $1', [cargoId]);
    if (!cargo) throw new NotFoundException({ mensagem: 'Cargo não encontrado' });
    if (!(await this.catalogo.obter(corpo.cursoId))) throw new NotFoundException({ mensagem: 'Curso não encontrado' });
    await this.banco.consultar(
      `INSERT INTO cargo_curso (cargo_id, curso_id, prazo_dias, vinculado_em) VALUES ($1, $2, $3, $4)
       ON CONFLICT (cargo_id, curso_id) DO UPDATE SET prazo_dias = EXCLUDED.prazo_dias`,
      [cargoId, corpo.cursoId, corpo.prazoDias, iso(hoje())],
    );
  }

  async remover(cargoId: number, cursoId: number): Promise<void> {
    await this.banco.consultar('DELETE FROM cargo_curso WHERE cargo_id = $1 AND curso_id = $2', [cargoId, cursoId]);
  }
}
