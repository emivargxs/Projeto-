import { Module } from '@nestjs/common';
import { CatalogoModule } from '../catalogo';
import { PdiModule } from '../pdi';
import { PessoasModule } from '../pessoas';
import { AcompanharEquipe } from './casos-de-uso/acompanhar-equipe';
import { DefinirMetas } from './casos-de-uso/definir-metas';
import { RegistrarConclusao } from './casos-de-uso/registrar-conclusao';
import { ValidarConclusao } from './casos-de-uso/validar-conclusao';
import { VerMinhaTrilha } from './casos-de-uso/ver-minha-trilha';
import { CalculoDaSituacao } from './situacao';
import { TrilhasApi } from './trilhas.api';
import { TrilhasController } from './trilhas.controller';

@Module({
  imports: [PessoasModule, CatalogoModule, PdiModule],
  controllers: [TrilhasController],
  providers: [CalculoDaSituacao, TrilhasApi, VerMinhaTrilha, RegistrarConclusao, ValidarConclusao, AcompanharEquipe, DefinirMetas],
  exports: [TrilhasApi],
})
export class TrilhasModule {}

// Interface pública do módulo
export { TrilhasApi } from './trilhas.api';
export type { ResumoDeTrilha } from './trilhas.api';
