import { Injectable } from '@nestjs/common';
import { AcaoPdi, Pdi } from '@cestacorp/contracts';
import { Banco } from '../../../compartilhado/banco';
import { hoje, iso, isoDe } from '../../../compartilhado/datas';
import { CatalogoApi } from '../../catalogo';
import { PessoasApi } from '../../pessoas';
import { cicloAtual } from '../pdi.api';

/** Caso de uso: ver o PDI do ciclo atual (o que fazer, responsável, prazo, acompanhamento). */
@Injectable()
export class VerPdi {
  constructor(
    private readonly banco: Banco,
    private readonly pessoas: PessoasApi,
    private readonly catalogo: CatalogoApi,
  ) {}

  async executar(colaboradorId: number): Promise<Pdi | null> {
    const pdi = await this.banco.primeiro<{ id: number; ciclo: string; inicio: Date; fim: Date }>(
      'SELECT id, ciclo, inicio, fim FROM pdi WHERE colaborador_id = $1 AND ciclo = $2',
      [colaboradorId, cicloAtual()],
    );
    if (!pdi) return null;

    const linhas = await this.banco.consultar<{
      id: number; o_que_fazer: string; como_fazer: string; responsavel: string; prazo: Date; progresso: number; curso_id: number | null;
    }>('SELECT * FROM pdi_acao WHERE pdi_id = $1 ORDER BY prazo, id', [pdi.id]);
    const cursos = await this.catalogo.obterVarios(linhas.flatMap((l) => (l.curso_id ? [l.curso_id] : [])));
    const hojeIso = iso(hoje());

    const acoes: AcaoPdi[] = linhas.map((l) => {
      const prazo = isoDe(l.prazo)!;
      return {
        id: l.id,
        oQueFazer: l.o_que_fazer,
        comoFazer: l.como_fazer,
        responsavel: l.responsavel,
        prazo,
        progresso: l.progresso,
        situacao: l.progresso === 100 ? 'concluida' : prazo < hojeIso ? 'atrasada' : 'em_andamento',
        cursoId: l.curso_id,
        cursoNome: l.curso_id ? cursos.get(l.curso_id)?.nome ?? null : null,
      };
    });

    return {
      id: pdi.id,
      colaborador: await this.pessoas.referencia(colaboradorId),
      ciclo: pdi.ciclo,
      inicio: isoDe(pdi.inicio)!,
      fim: isoDe(pdi.fim)!,
      emDia: acoes.every((a) => a.situacao !== 'atrasada'),
      progresso: acoes.length ? Math.round(acoes.reduce((s, a) => s + a.progresso, 0) / acoes.length) : 0,
      acoes,
    };
  }
}
