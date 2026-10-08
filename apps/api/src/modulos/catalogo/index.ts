import { Module } from '@nestjs/common';
import { CatalogoApi } from './catalogo.api';
import { CatalogoController } from './catalogo.controller';

@Module({
  controllers: [CatalogoController],
  providers: [CatalogoApi],
  exports: [CatalogoApi],
})
export class CatalogoModule {}

// Interface pública do módulo: só isto pode ser importado por outros módulos.
export { CatalogoApi };
