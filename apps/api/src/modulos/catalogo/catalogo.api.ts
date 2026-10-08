import { Injectable } from '@nestjs/common';
import { Curso, Modalidade } from '@cestacorp/contracts';
import { Banco } from '../../compartilhado/banco';

interface LinhaCurso {
  id: number;
  nome: string;
  competencia: string;
  entidade: string;
  modalidade: Modalidade;
  carga_horas: string;
  investimento: string;
  link: string;
}

const paraCurso = (l: LinhaCurso): Curso => ({
  id: l.id,
  nome: l.nome,
  competencia: l.competencia,
  entidade: l.entidade,
  modalidade: l.modalidade,
  cargaHoras: Number(l.carga_horas),
  investimento: Number(l.investimento),
  link: l.link,
});

/** Interface pública do módulo Catálogo. Outros módulos só leem cursos por aqui. */
@Injectable()
export class CatalogoApi {
  constructor(private readonly banco: Banco) {}

  async listar(): Promise<Curso[]> {
    return (await this.banco.consultar<LinhaCurso>('SELECT * FROM curso ORDER BY nome')).map(paraCurso);
  }

  async obter(id: number): Promise<Curso | null> {
    const l = await this.banco.primeiro<LinhaCurso>('SELECT * FROM curso WHERE id = $1', [id]);
    return l ? paraCurso(l) : null;
  }

  async obterVarios(ids: number[]): Promise<Map<number, Curso>> {
    if (ids.length === 0) return new Map();
    const linhas = await this.banco.consultar<LinhaCurso>('SELECT * FROM curso WHERE id = ANY($1::int[])', [ids]);
    return new Map(linhas.map((l) => [l.id, paraCurso(l)]));
  }
}
