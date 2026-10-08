import { Injectable } from '@nestjs/common';
import { MinhaTrilha } from '@cestacorp/contracts';
import { Usuario } from '../../pessoas';
import { CalculoDaSituacao } from '../situacao';

/** Caso de uso: o colaborador vê a própria trilha, o aviso de atraso e o progresso do ano. */
@Injectable()
export class VerMinhaTrilha {
  constructor(private readonly calculo: CalculoDaSituacao) {}

  async executar(usuario: Usuario): Promise<MinhaTrilha> {
    const s = await this.calculo.de(usuario);
    return {
      colaborador: { id: usuario.id, nome: usuario.nome, iniciais: usuario.iniciais, cargoNome: usuario.cargoNome },
      aviso: s.aviso,
      obrigatoria: s.obrigatoria,
      pdi: s.pdi ?? { concluidos: 0, total: 0, percentual: 0 },
      horasAno: s.horasAno,
      metaAno: s.metaMes * 12,
      treinamentos: s.treinamentos,
    };
  }
}
