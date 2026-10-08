import { Module } from '@nestjs/common';
import { PessoasModule } from '../pessoas';
import { TrilhasModule } from '../trilhas';
import { CalcularIndicadores } from './casos-de-uso/calcular-indicadores';
import { IndicadoresController } from './indicadores.controller';

@Module({
  imports: [PessoasModule, TrilhasModule],
  controllers: [IndicadoresController],
  providers: [CalcularIndicadores],
})
export class IndicadoresModule {}
