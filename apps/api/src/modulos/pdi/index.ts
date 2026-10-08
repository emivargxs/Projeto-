import { Module } from '@nestjs/common';
import { CatalogoModule } from '../catalogo';
import { PessoasModule } from '../pessoas';
import { EditarPdi } from './casos-de-uso/editar-pdi';
import { VerPdi } from './casos-de-uso/ver-pdi';
import { PdiApi } from './pdi.api';
import { PdiController } from './pdi.controller';

@Module({
  imports: [PessoasModule, CatalogoModule],
  controllers: [PdiController],
  providers: [PdiApi, VerPdi, EditarPdi],
  exports: [PdiApi],
})
export class PdiModule {}

// Interface pública do módulo
export { PdiApi, cicloAtual } from './pdi.api';
