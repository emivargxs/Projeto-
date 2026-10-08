import { Injectable } from '@nestjs/common';
import { TrilhasDaEquipe } from '@cestacorp/contracts';
import { Banco } from '../../../compartilhado/banco';
import { hoje, iso, isoDe, percentual, rotuloMes, somarDias } from '../../../compartilhado/datas';
import { CatalogoApi } from '../../catalogo';
import { PessoasApi } from '../../pessoas';
import { CalculoDaSituacao } from '../situacao';
import { DIAS_PARA_EFICACIA } from './validar-conclusao';

/** Caso de uso: o gestor acompanha trilhas, atrasos do mês, certificados a validar e eficácias a avaliar. */
@Injectable()
export class AcompanharEquipe {
  constructor(
    private readonly banco: Banco,
    private readonly pessoas: PessoasApi,
    private readonly calculo: CalculoDaSituacao,
    private readonly catalogo: CatalogoApi,
  ) {}

  async executar(): Promise<TrilhasDaEquipe> {
    const dataHoje = hoje();
    const equipe = await this.pessoas.listarEquipe();
    const situacoes = await Promise.all(equipe.map((c) => this.calculo.de(c)));

    const somaObrig = situacoes.reduce((s, x) => ({ c: s.c + x.obrigatoria.concluidos, t: s.t + x.obrigatoria.total }), { c: 0, t: 0 });
    const comPdi = situacoes.filter((x) => x.pdi);
    const somaPdi = comPdi.reduce((s, x) => ({ c: s.c + x.pdi!.concluidos, t: s.t + x.pdi!.total }), { c: 0, t: 0 });

    const enviadas = await this.banco.consultar<{ id: number; colaborador_id: number; curso_id: number; carga_horas: string; enviado_em: Date }>(
      `SELECT c.id, i.colaborador_id, i.curso_id, c.carga_horas, c.enviado_em
         FROM conclusao c JOIN inscricao i ON i.id = c.inscricao_id
        WHERE c.status = 'enviado' ORDER BY c.enviado_em`,
    );
    const semEficacia = await this.banco.consultar<{ id: number; colaborador_id: number; curso_id: number; data_realizacao: Date }>(
      `SELECT c.id, i.colaborador_id, i.curso_id, c.data_realizacao
         FROM conclusao c JOIN inscricao i ON i.id = c.inscricao_id
        WHERE c.status = 'concluido' AND c.eficacia IS NULL AND c.data_realizacao + $1::int <= $2::date
        ORDER BY c.data_realizacao`,
      [DIAS_PARA_EFICACIA, iso(dataHoje)],
    );
    const nome = (id: number) => equipe.find((c) => c.id === id)?.nome ?? '—';
    const cursos = await this.catalogo.obterVarios([...enviadas, ...semEficacia].map((e) => e.curso_id));
    const nomeDoCurso = (id: number) => cursos.get(id)?.nome ?? '—';

    return {
      referencia: { dia: dataHoje.getDate(), mesRotulo: rotuloMes(dataHoje) },
      indicadores: {
        obrigatoriaPercentual: percentual(somaObrig.c, somaObrig.t),
        pdiPercentual: percentual(somaPdi.c, somaPdi.t),
        atrasados: situacoes.filter((s) => s.aviso.atrasado).length,
        paraValidar: enviadas.length,
      },
      linhas: situacoes.map((s) => ({
        colaborador: { id: s.colaborador.id, nome: s.colaborador.nome, iniciais: s.colaborador.iniciais, cargoNome: s.colaborador.cargoNome },
        obrigatoria: s.obrigatoria,
        pdi: s.pdi,
        horasMes: s.horasMes,
        metaMes: s.metaMes,
        percentualAtraso: s.aviso.percentualAtraso,
      })),
      paraValidar: enviadas.map((e) => ({
        conclusaoId: e.id,
        colaborador: nome(e.colaborador_id),
        curso: nomeDoCurso(e.curso_id),
        cargaHoras: Number(e.carga_horas),
        enviadoEm: isoDe(e.enviado_em)!,
      })),
      eficaciaPendente: semEficacia.map((e) => ({
        conclusaoId: e.id,
        colaborador: nome(e.colaborador_id),
        curso: nomeDoCurso(e.curso_id),
        liberadaEm: somarDias(isoDe(e.data_realizacao)!, DIAS_PARA_EFICACIA),
      })),
    };
  }
}
