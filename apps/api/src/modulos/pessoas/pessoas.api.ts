import { Injectable } from '@nestjs/common';
import { Colaborador, Nivel, PessoaRef, Perfil } from '@cestacorp/contracts';
import { Banco } from '../../compartilhado/banco';
import { isoDe } from '../../compartilhado/datas';

export type ColaboradorComCargo = Colaborador & { inicioNoCargo: string };

export interface ItemObrigatorio {
  cursoId: number;
  prazoDias: number;
  vinculadoEm: string;
}

interface LinhaColaborador {
  id: number;
  nome: string;
  iniciais: string;
  perfil: Perfil;
  cargo_id: number;
  cargo_nome: string;
  nivel: Nivel;
  area_nome: string;
  gestor_id: number | null;
  inicio_no_cargo: Date;
}

const SQL_COLABORADOR = `
  SELECT c.id, c.nome, c.iniciais, c.perfil, c.cargo_id, c.gestor_id, c.inicio_no_cargo,
         g.nome AS cargo_nome, g.nivel, a.nome AS area_nome
    FROM colaborador c
    JOIN cargo g ON g.id = c.cargo_id
    JOIN area a ON a.id = g.area_id`;

const paraColaborador = (l: LinhaColaborador): ColaboradorComCargo => ({
  id: l.id,
  nome: l.nome,
  iniciais: l.iniciais,
  perfil: l.perfil,
  cargoId: l.cargo_id,
  cargoNome: l.cargo_nome,
  nivel: l.nivel,
  areaNome: l.area_nome,
  gestorId: l.gestor_id,
  inicioNoCargo: isoDe(l.inicio_no_cargo)!,
});

/** Interface pública do módulo Pessoas. */
@Injectable()
export class PessoasApi {
  constructor(private readonly banco: Banco) {}

  async obter(id: number): Promise<ColaboradorComCargo | null> {
    const l = await this.banco.primeiro<LinhaColaborador>(`${SQL_COLABORADOR} WHERE c.id = $1`, [id]);
    return l ? paraColaborador(l) : null;
  }

  async listar(): Promise<ColaboradorComCargo[]> {
    const linhas = await this.banco.consultar<LinhaColaborador>(`${SQL_COLABORADOR} ORDER BY c.perfil DESC, c.nome`);
    return linhas.map(paraColaborador);
  }

  /** Colaboradores acompanhados pelos gestores (todos que não são gestores). */
  async listarEquipe(): Promise<ColaboradorComCargo[]> {
    return (await this.listar()).filter((c) => c.perfil === 'colaborador').sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async referencia(id: number): Promise<PessoaRef> {
    const c = await this.obter(id);
    if (!c) throw new Error(`Colaborador ${id} não encontrado`);
    return { id: c.id, nome: c.nome, iniciais: c.iniciais, cargoNome: c.cargoNome };
  }

  /** Cursos obrigatórios da trilha do cargo. */
  async trilhaDoCargo(cargoId: number): Promise<ItemObrigatorio[]> {
    const linhas = await this.banco.consultar<{ curso_id: number; prazo_dias: number; vinculado_em: Date }>(
      'SELECT curso_id, prazo_dias, vinculado_em FROM cargo_curso WHERE cargo_id = $1 ORDER BY curso_id',
      [cargoId],
    );
    return linhas.map((l) => ({ cursoId: l.curso_id, prazoDias: l.prazo_dias, vinculadoEm: isoDe(l.vinculado_em)! }));
  }

  /** Critérios do cargo usados para abrir a avaliação anual. */
  async criteriosDoCargo(cargoId: number) {
    const l = await this.banco.primeiro<{ descricao: { conhecimentos: string[]; habilidades: string[]; atitudes: string[]; indicadores: string[] } }>(
      'SELECT descricao FROM cargo WHERE id = $1',
      [cargoId],
    );
    return l?.descricao ?? { conhecimentos: [], habilidades: [], atitudes: [], indicadores: [] };
  }
}
