import { Module } from '@nestjs/common';
import { BancoModule } from './compartilhado/banco';
import { AvaliacaoModule } from './modulos/avaliacao';
import { CatalogoModule } from './modulos/catalogo';
import { GamificacaoModule } from './modulos/gamificacao';
import { IndicadoresModule } from './modulos/indicadores';
import { PdiModule } from './modulos/pdi';
import { PessoasModule } from './modulos/pessoas';
import { TrilhasModule } from './modulos/trilhas';

/**
 * Monolito modular. Dependências entre módulos (sempre pela interface pública):
 *   catalogo ← pessoas ← pdi ← trilhas ← { indicadores, gamificacao }
 *   avaliacao → pessoas, pdi
 */
@Module({
  imports: [
    BancoModule,
    CatalogoModule,
    PessoasModule,
    PdiModule,
    TrilhasModule,
    AvaliacaoModule,
    IndicadoresModule,
    GamificacaoModule,
  ],
})
export class AppModule {}
