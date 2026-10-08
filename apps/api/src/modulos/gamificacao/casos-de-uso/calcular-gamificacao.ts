import { Injectable } from '@nestjs/common';
import { MeusPins, Ranking, RegrasGamificacao } from '@cestacorp/contracts';
import { hoje } from '../../../compartilhado/datas';
import { PessoasApi, Usuario } from '../../pessoas';
import { TrilhasApi } from '../../trilhas';
import { PIN_DE_RANKING, REGRA_DO_RANKING, REGRAS, regraPublica } from '../regras';

interface Classificacao {
  colaboradorId: number;
  nome: string;
  posicao: number;
  horasAno: number;
  conquistados: Set<string>;
}

/** Casos de uso: ver as regras, meus pins e o ranking do time. */
@Injectable()
export class CalcularGamificacao {
  constructor(
    private readonly pessoas: PessoasApi,
    private readonly trilhas: TrilhasApi,
  ) {}

  regras(): RegrasGamificacao {
    return { pins: REGRAS.map(regraPublica), regraRanking: REGRA_DO_RANKING };
  }

  /** Calcula os pins de todos e ordena o ranking (pins, depois horas). */
  private async classificar(): Promise<Classificacao[]> {
    const mes = hoje().getMonth() + 1;
    const equipe = await this.pessoas.listarEquipe();
    const base = await Promise.all(
      equipe.map(async (c) => {
        const resumo = await this.trilhas.resumo(c);
        const conquistados = new Set(
          REGRAS.filter((r) => r.codigo !== PIN_DE_RANKING && r.conquistou({ resumo, posicao: 0, mes })).map((r) => r.codigo as string),
        );
        return { colaboradorId: c.id, nome: c.nome, horasAno: resumo.horasAno, conquistados, resumo, posicao: 0 };
      }),
    );
    base.sort((a, b) => b.conquistados.size - a.conquistados.size || b.horasAno - a.horasAno || a.nome.localeCompare(b.nome));
    base.forEach((item, i) => {
      item.posicao = i + 1;
      const pinDeRanking = REGRAS.find((r) => r.codigo === PIN_DE_RANKING)!;
      if (pinDeRanking.conquistou({ resumo: item.resumo, posicao: item.posicao, mes })) item.conquistados.add(PIN_DE_RANKING);
    });
    return base;
  }

  async ranking(usuario: Usuario): Promise<Ranking> {
    return (await this.classificar()).map((c) => ({
      posicao: c.posicao,
      colaboradorId: c.colaboradorId,
      nome: c.nome,
      pins: c.conquistados.size,
      horasAno: c.horasAno,
      voce: c.colaboradorId === usuario.id,
    }));
  }

  async meusPins(usuario: Usuario): Promise<MeusPins> {
    const eu = (await this.classificar()).find((c) => c.colaboradorId === usuario.id);
    const pins = REGRAS.map((r) => ({ ...regraPublica(r), conquistado: !!eu?.conquistados.has(r.codigo) }));
    return { conquistados: pins.filter((p) => p.conquistado).length, total: pins.length, posicaoRanking: eu?.posicao ?? 0, pins };
  }
}
