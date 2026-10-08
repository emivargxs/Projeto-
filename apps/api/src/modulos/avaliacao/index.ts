import { Module } from '@nestjs/common';
import { PdiModule } from '../pdi';
import { PessoasModule } from '../pessoas';
import { AvaliacaoController } from './avaliacao.controller';
import { ConduzirAvaliacao } from './casos-de-uso/conduzir-avaliacao';
import { VerAvaliacao } from './casos-de-uso/ver-avaliacao';

@Module({
  imports: [PessoasModule, PdiModule],
  controllers: [AvaliacaoController],
  providers: [VerAvaliacao, ConduzirAvaliacao],
})
export class AvaliacaoModule {}
