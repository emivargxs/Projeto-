import { Controller, Get } from '@nestjs/common';
import { ListaCursos } from '@cestacorp/contracts';
import { CatalogoApi } from './catalogo.api';

@Controller('cursos')
export class CatalogoController {
  constructor(private readonly catalogo: CatalogoApi) {}

  /** Lista de cursos usada pelo gestor ao montar a trilha de um cargo ou uma ação de PDI. */
  @Get()
  listar(): Promise<ListaCursos> {
    return this.catalogo.listar();
  }
}
