import { Injectable } from '@nestjs/common';
import { ColaboradorComCargo } from '../pessoas';
import { CalculoDaSituacao, Situacao } from './situacao';

export type ResumoDeTrilha = Omit<Situacao, 'colaborador' | 'treinamentos'>;

/** Interface pública do módulo Trilhas (usada por Indicadores e Gamificação). */
@Injectable()
export class TrilhasApi {
  constructor(private readonly calculo: CalculoDaSituacao) {}

  async resumo(colaborador: ColaboradorComCargo): Promise<ResumoDeTrilha> {
    const { colaborador: _c, treinamentos: _t, ...resumo } = await this.calculo.de(colaborador);
    return resumo;
  }
}
