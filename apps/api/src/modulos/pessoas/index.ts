import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CatalogoModule } from '../catalogo';
import { ConsultarCargos } from './casos-de-uso/consultar-cargos';
import { MontarTrilhaDoCargo } from './casos-de-uso/montar-trilha-do-cargo';
import { VerOrganograma } from './casos-de-uso/ver-organograma';
import { PessoasApi } from './pessoas.api';
import { PessoasController } from './pessoas.controller';
import { UsuarioGuard } from './usuario';

@Module({
  imports: [CatalogoModule],
  controllers: [PessoasController],
  providers: [PessoasApi, VerOrganograma, ConsultarCargos, MontarTrilhaDoCargo, { provide: APP_GUARD, useClass: UsuarioGuard }],
  exports: [PessoasApi],
})
export class PessoasModule {}

// Interface pública do módulo
export { PessoasApi } from './pessoas.api';
export type { ColaboradorComCargo, ItemObrigatorio } from './pessoas.api';
export { Publico, SomenteGestor, UsuarioAtual, garantirAcesso } from './usuario';
export type { Usuario } from './usuario';
