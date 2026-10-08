import { Controller, Get } from '@nestjs/common';
import { MeusPins, Ranking, RegrasGamificacao } from '@cestacorp/contracts';
import { Usuario, UsuarioAtual } from '../pessoas';
import { CalcularGamificacao } from './casos-de-uso/calcular-gamificacao';

@Controller('gamificacao')
export class GamificacaoController {
  constructor(private readonly gamificacao: CalcularGamificacao) {}

  @Get('regras')
  regras(): RegrasGamificacao {
    return this.gamificacao.regras();
  }

  @Get('ranking')
  ranking(@UsuarioAtual() usuario: Usuario): Promise<Ranking> {
    return this.gamificacao.ranking(usuario);
  }

  @Get('meus-pins')
  meusPins(@UsuarioAtual() usuario: Usuario): Promise<MeusPins> {
    return this.gamificacao.meusPins(usuario);
  }
}
