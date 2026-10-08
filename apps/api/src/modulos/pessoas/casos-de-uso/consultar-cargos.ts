import { Injectable, NotFoundException } from '@nestjs/common';
import { CargoDetalhe, CargoResumo, DescricaoCargo, Nivel } from '@cestacorp/contracts';
import { Banco } from '../../../compartilhado/banco';
import { CatalogoApi } from '../../catalogo';

/** Caso de uso: listar cargos e ver a descrição de um cargo (plano de cargos e salários + trilha obrigatória). */
@Injectable()
export class ConsultarCargos {
  constructor(
    private readonly banco: Banco,
    private readonly catalogo: CatalogoApi,
  ) {}

  async listar(): Promise<CargoResumo[]> {
    const linhas = await this.banco.consultar<{ id: number; nome: string; area: string; nivel: Nivel; pessoas: number; cursos: number }>(`
      SELECT g.id, g.nome, a.nome AS area, g.nivel,
             (SELECT count(*)::int FROM colaborador c WHERE c.cargo_id = g.id) AS pessoas,
             (SELECT count(*)::int FROM cargo_curso cc WHERE cc.cargo_id = g.id) AS cursos
        FROM cargo g JOIN area a ON a.id = g.area_id JOIN diretoria d ON d.id = a.diretoria_id
       WHERE g.nivel NOT IN ('diretor', 'apoio')
       ORDER BY d.ordem, a.ordem, g.ordem DESC`);
    return linhas.map((l) => ({ id: l.id, nome: l.nome, areaNome: l.area, nivel: l.nivel, pessoas: l.pessoas, cursosObrigatorios: l.cursos }));
  }

  async detalhar(id: number, verSalario: boolean): Promise<CargoDetalhe> {
    const c = await this.banco.primeiro<{
      id: number; nome: string; area: string; nivel: Nivel; descricao: DescricaoCargo; formacao: string; experiencia: string;
      proximo_id: number | null; proximo_nome: string | null; salario_min: string | null; salario_max: string | null;
    }>(`
      SELECT g.id, g.nome, a.nome AS area, g.nivel, g.descricao, g.formacao, g.experiencia,
             p.id AS proximo_id, p.nome AS proximo_nome, g.salario_min, g.salario_max
        FROM cargo g JOIN area a ON a.id = g.area_id LEFT JOIN cargo p ON p.id = g.proximo_cargo_id
       WHERE g.id = $1`, [id]);
    if (!c) throw new NotFoundException({ mensagem: 'Cargo não encontrado' });

    const ocupantes = await this.banco.consultar<{ id: number; nome: string; iniciais: string }>(
      'SELECT id, nome, iniciais FROM colaborador WHERE cargo_id = $1 ORDER BY nome', [id]);
    const itens = await this.banco.consultar<{ curso_id: number; prazo_dias: number }>(
      'SELECT curso_id, prazo_dias FROM cargo_curso WHERE cargo_id = $1', [id]);
    const cursos = await this.catalogo.obterVarios(itens.map((i) => i.curso_id));

    return {
      id: c.id,
      nome: c.nome,
      areaNome: c.area,
      nivel: c.nivel,
      descricao: c.descricao,
      formacao: c.formacao,
      experiencia: c.experiencia,
      proximoCargo: c.proximo_id ? { id: c.proximo_id, nome: c.proximo_nome! } : null,
      faixaSalarial: verSalario && c.salario_min ? { minimo: Number(c.salario_min), maximo: Number(c.salario_max) } : null,
      ocupantes,
      trilha: itens
        .filter((i) => cursos.has(i.curso_id))
        .map((i) => ({ ...cursos.get(i.curso_id)!, prazoDias: i.prazo_dias }))
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    };
  }
}
