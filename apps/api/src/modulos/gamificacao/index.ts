import { Module } from '@nestjs/common';
import { PessoasModule } from '../pessoas';
import { TrilhasModule } from '../trilhas';
import { CalcularGamificacao } from './casos-de-uso/calcular-gamificacao';
import { GamificacaoController } from './gamificacao.controller';

@Module({
  imports: [PessoasModule, TrilhasModule],
  controllers: [GamificacaoController],
  providers: [CalcularGamificacao],
})
export class GamificacaoModule {}
