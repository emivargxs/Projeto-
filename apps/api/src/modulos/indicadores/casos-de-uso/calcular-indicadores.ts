import { Injectable } from '@nestjs/common';
import { IndicadoresColaborador, IndicadoresOrganizacao, MESES_ABREV } from '@cestacorp/contracts';
import { arredondar, hoje, percentual, rotuloMes } from '../../../compartilhado/datas';
import { ColaboradorComCargo, PessoasApi, Usuario } from '../../pessoas';
import { ResumoDeTrilha, TrilhasApi } from '../../trilhas';

type Item = { colaborador: ColaboradorComCargo; resumo: ResumoDeTrilha };

const soma = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

/**
 * Casos de uso: indicadores da organização (gestor) e meus indicadores (colaborador).
 * Não acessa tabelas: tudo vem das interfaces públicas de Pessoas e Trilhas.
 */
@Injectable()
export class CalcularIndicadores {
  constructor(
    private readonly pessoas: PessoasApi,
    private readonly trilhas: TrilhasApi,
  ) {}

  private async equipe(): Promise<Item[]> {
    const colaboradores = await this.pessoas.listarEquipe();
    return Promise.all(colaboradores.map(async (colaborador) => ({ colaborador, resumo: await this.trilhas.resumo(colaborador) })));
  }

  private percentualObrigatoria(itens: Item[]) {
    return percentual(soma(itens.map((i) => i.resumo.obrigatoria.concluidos)), soma(itens.map((i) => i.resumo.obrigatoria.total)));
  }

  private percentualPdi(itens: Item[]) {
    const comPdi = itens.filter((i) => i.resumo.pdi);
    return percentual(soma(comPdi.map((i) => i.resumo.pdi!.concluidos)), soma(comPdi.map((i) => i.resumo.pdi!.total)));
  }

  async daOrganizacao(): Promise<IndicadoresOrganizacao> {
    const dataHoje = hoje();
    const itens = await this.equipe();
    const horaHomem = arredondar(soma(itens.map((i) => i.resumo.horasAno)));
    const metaMensalTime = arredondar(soma(itens.map((i) => i.resumo.metaMes)));
    const areas = [...new Set(itens.map((i) => i.colaborador.areaNome))];

    return {
      mesRotulo: rotuloMes(dataHoje),
      ano: dataHoje.getFullYear(),
      colaboradores: itens.length,
      horaHomemAno: horaHomem,
      horasPorColaborador: itens.length ? arredondar(horaHomem / itens.length) : 0,
      obrigatoriaPercentual: this.percentualObrigatoria(itens),
      pdiPercentual: this.percentualPdi(itens),
      pdisAtivos: itens.filter((i) => i.resumo.pdi).length,
      horasMes: arredondar(soma(itens.map((i) => i.resumo.horasMes))),
      metaMes: metaMensalTime,
      metaMensalTime,
      serie: MESES_ABREV.map((rotulo, m) => ({ mes: m + 1, rotulo, horas: arredondar(soma(itens.map((i) => i.resumo.horasPorMes[m]))) })),
      pdiPorArea: areas
        .map((area) => ({ area, percentual: this.percentualPdi(itens.filter((i) => i.colaborador.areaNome === area)) }))
        .filter((a) => itens.some((i) => i.colaborador.areaNome === a.area && i.resumo.pdi))
        .sort((a, b) => b.percentual - a.percentual),
    };
  }

  async doColaborador(usuario: Usuario): Promise<IndicadoresColaborador> {
    const dataHoje = hoje();
    const [meu, equipe] = await Promise.all([this.trilhas.resumo(usuario), this.equipe()]);
    return {
      mesRotulo: rotuloMes(dataHoje),
      ano: dataHoje.getFullYear(),
      horasAno: meu.horasAno,
      mediaTimeHorasAno: equipe.length ? arredondar(soma(equipe.map((i) => i.resumo.horasAno)) / equipe.length) : 0,
      obrigatoriaPercentual: meu.obrigatoria.percentual,
      obrigatoriaTime: this.percentualObrigatoria(equipe),
      pdiPercentual: meu.pdi?.percentual ?? 0,
      pdiTime: this.percentualPdi(equipe),
      horasMes: meu.horasMes,
      metaMes: meu.metaMes,
      serie: MESES_ABREV.map((rotulo, m) => ({ mes: m + 1, rotulo, horas: meu.horasPorMes[m] })),
    };
  }
}
