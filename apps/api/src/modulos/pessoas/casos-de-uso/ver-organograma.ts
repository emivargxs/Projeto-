import { Injectable } from '@nestjs/common';
import { Nivel, Organograma } from '@cestacorp/contracts';
import { Banco } from '../../../compartilhado/banco';

interface Linha {
  diretoria_id: number;
  diretoria: string;
  diretor: string;
  area_id: number;
  area: string;
  apoio: boolean;
  cargo_id: number | null;
  cargo: string | null;
  nivel: Nivel | null;
  coordenacao: boolean | null;
  ocupantes: { id: number; nome: string; iniciais: string }[];
}

/** Caso de uso: ver o organograma (diretorias → áreas → escada de cargos, com quem ocupa cada cargo). */
@Injectable()
export class VerOrganograma {
  constructor(private readonly banco: Banco) {}

  async executar(): Promise<Organograma> {
    const linhas = await this.banco.consultar<Linha>(`
      SELECT d.id AS diretoria_id, d.nome AS diretoria, d.diretor,
             a.id AS area_id, a.nome AS area, a.apoio,
             g.id AS cargo_id, g.nome AS cargo, g.nivel, g.coordenacao,
             COALESCE((SELECT json_agg(json_build_object('id', c.id, 'nome', c.nome, 'iniciais', c.iniciais) ORDER BY c.nome)
                         FROM colaborador c WHERE c.cargo_id = g.id), '[]') AS ocupantes
        FROM diretoria d
        JOIN area a ON a.diretoria_id = d.id
        LEFT JOIN cargo g ON g.area_id = a.id AND g.nivel <> 'diretor'
       ORDER BY d.ordem, a.ordem, g.ordem DESC`);

    const diretorias = new Map<number, Organograma['diretorias'][number]>();
    for (const l of linhas) {
      if (!diretorias.has(l.diretoria_id)) {
        diretorias.set(l.diretoria_id, { id: l.diretoria_id, nome: l.diretoria, diretor: l.diretor, areas: [] });
      }
      const d = diretorias.get(l.diretoria_id)!;
      let area = d.areas.find((a) => a.id === l.area_id);
      if (!area) {
        area = { id: l.area_id, nome: l.area, apoio: l.apoio, cargos: [] };
        d.areas.push(area);
      }
      if (l.cargo_id && l.cargo && l.nivel) {
        area.cargos.push({ id: l.cargo_id, nome: l.cargo, nivel: l.nivel, coordenacao: !!l.coordenacao, ocupantes: l.ocupantes });
      }
    }
    return { diretorias: [...diretorias.values()] };
  }
}
