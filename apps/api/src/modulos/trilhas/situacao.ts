import { Injectable } from '@nestjs/common';
import { AvisoAtraso, Nivel, Origem, Progresso, StatusTreinamento, Treinamento } from '@cestacorp/contracts';
import { Banco } from '../../compartilhado/banco';
import { arredondar, diasNoMes, hoje, iso, isoDe, percentual, rotuloMes, somarDias } from '../../compartilhado/datas';
import { CatalogoApi } from '../catalogo';
import { PdiApi } from '../pdi';
import { ColaboradorComCargo, PessoasApi } from '../pessoas';

export interface Situacao {
  colaborador: ColaboradorComCargo;
  treinamentos: Treinamento[];
  obrigatoria: Progresso;
  pdi: Progresso | null;
  /** Sem ações do PDI vencidas. */
  pdiEmDia: boolean;
  /** Horas validadas por mês do ano atual (índice 0 = janeiro). */
  horasPorMes: number[];
  horasAno: number;
  horasMes: number;
  metaMes: number;
  aviso: AvisoAtraso;
  conclusoesEnviadas: number;
  certificadosValidados: number;
  trilhaEmDia: boolean;
  trilhaCompleta: boolean;
}

interface LinhaInscricao {
  curso_id: number;
  origem: Origem;
  status: Exclude<StatusTreinamento, 'nao_iniciado'>;
  conclusao_id: number | null;
  carga_horas: string | null;
  data_realizacao: Date | null;
  motivo_devolucao: string | null;
}

/**
 * Regra central do módulo Trilhas: junta a trilha obrigatória do cargo, a trilha do PDI
 * e o que o colaborador já fez, e calcula progresso, horas e o aviso de atraso.
 */
@Injectable()
export class CalculoDaSituacao {
  constructor(
    private readonly banco: Banco,
    private readonly pessoas: PessoasApi,
    private readonly catalogo: CatalogoApi,
    private readonly pdiApi: PdiApi,
  ) {}

  async metaDoNivel(nivel: Nivel): Promise<number> {
    const l = await this.banco.primeiro<{ horas_mes: string }>('SELECT horas_mes FROM meta_horas WHERE nivel = $1', [nivel]);
    return l ? Number(l.horas_mes) : 0;
  }

  async de(colaborador: ColaboradorComCargo): Promise<Situacao> {
    const dataHoje = hoje();
    const hojeIso = iso(dataHoje);
    const ano = dataHoje.getFullYear();

    const [obrigatorios, doPdi, inscricoes, metaMes, progressoPdi] = await Promise.all([
      this.pessoas.trilhaDoCargo(colaborador.cargoId),
      this.pdiApi.cursosDoPdi(colaborador.id),
      this.banco.consultar<LinhaInscricao>(
        `SELECT i.curso_id, i.origem, i.status, c.id AS conclusao_id, c.carga_horas, c.data_realizacao, c.motivo_devolucao
           FROM inscricao i LEFT JOIN conclusao c ON c.inscricao_id = i.id
          WHERE i.colaborador_id = $1`,
        [colaborador.id],
      ),
      this.metaDoNivel(colaborador.nivel),
      this.pdiApi.progresso(colaborador.id),
    ]);

    const porCurso = new Map(inscricoes.map((i) => [i.curso_id, i]));
    const itens: { cursoId: number; origem: Origem; prazo: string | null }[] = [];
    for (const o of obrigatorios) {
      const base = colaborador.inicioNoCargo > o.vinculadoEm ? colaborador.inicioNoCargo : o.vinculadoEm;
      itens.push({ cursoId: o.cursoId, origem: 'obrigatorio', prazo: somarDias(base, o.prazoDias) });
    }
    for (const p of doPdi) {
      if (!itens.some((i) => i.cursoId === p.cursoId)) itens.push({ cursoId: p.cursoId, origem: 'pdi', prazo: p.prazo });
    }
    for (const i of inscricoes) {
      if (!itens.some((x) => x.cursoId === i.curso_id)) itens.push({ cursoId: i.curso_id, origem: 'livre', prazo: null });
    }

    const cursos = await this.catalogo.obterVarios(itens.map((i) => i.cursoId));
    const ordem: Record<Origem, number> = { obrigatorio: 0, pdi: 1, livre: 2 };
    const treinamentos: Treinamento[] = itens
      .filter((i) => cursos.has(i.cursoId))
      .map((i) => {
        const c = cursos.get(i.cursoId)!;
        const insc = porCurso.get(i.cursoId);
        const status = (insc?.status ?? 'nao_iniciado') as StatusTreinamento;
        return {
          cursoId: c.id,
          curso: c.nome,
          competencia: c.competencia,
          origem: i.origem,
          entidade: c.entidade,
          modalidade: c.modalidade,
          cargaHoras: c.cargaHoras,
          link: c.link,
          prazo: i.prazo,
          status,
          vencido: !!i.prazo && i.prazo < hojeIso && (status === 'nao_iniciado' || status === 'em_andamento' || status === 'devolvido'),
          conclusaoId: insc?.conclusao_id ?? null,
          motivoDevolucao: insc?.status === 'devolvido' ? insc.motivo_devolucao : null,
        };
      })
      .sort((a, b) => ordem[a.origem] - ordem[b.origem] || (a.prazo ?? '9').localeCompare(b.prazo ?? '9'));

    const horasPorMes = Array<number>(12).fill(0);
    let certificadosValidados = 0;
    for (const i of inscricoes) {
      if (i.status !== 'concluido' || !i.data_realizacao) continue;
      certificadosValidados++;
      const data = new Date(`${isoDe(i.data_realizacao)}T12:00:00`);
      if (data.getFullYear() === ano) horasPorMes[data.getMonth()] += Number(i.carga_horas);
    }
    const horasMes = arredondar(horasPorMes[dataHoje.getMonth()]);
    const horasAno = arredondar(horasPorMes.reduce((s, h) => s + h, 0));

    const doCargo = treinamentos.filter((t) => t.origem === 'obrigatorio');
    const concluidosDoCargo = doCargo.filter((t) => t.status === 'concluido').length;
    const esperado = arredondar((metaMes * dataHoje.getDate()) / diasNoMes(dataHoje));
    const percentualAtraso = esperado > 0 ? Math.max(0, Math.round(((esperado - horasMes) / esperado) * 100)) : 0;

    return {
      colaborador,
      treinamentos,
      obrigatoria: { concluidos: concluidosDoCargo, total: doCargo.length, percentual: percentual(concluidosDoCargo, doCargo.length) },
      pdi: progressoPdi
        ? { concluidos: progressoPdi.concluidas, total: progressoPdi.total, percentual: percentual(progressoPdi.concluidas, progressoPdi.total) }
        : null,
      pdiEmDia: (progressoPdi?.atrasadas ?? 0) === 0,
      horasPorMes: horasPorMes.map((h) => arredondar(h)),
      horasAno,
      horasMes,
      metaMes,
      aviso: {
        mesRotulo: rotuloMes(dataHoje),
        dia: dataHoje.getDate(),
        metaMes,
        esperadoAteHoje: esperado,
        realizadoNoMes: horasMes,
        percentualAtraso,
        atrasado: percentualAtraso > 0,
      },
      conclusoesEnviadas: inscricoes.filter((i) => i.conclusao_id !== null).length,
      certificadosValidados,
      trilhaEmDia: doCargo.every((t) => !t.vencido),
      trilhaCompleta: doCargo.length > 0 && concluidosDoCargo === doCargo.length,
    };
  }
}
