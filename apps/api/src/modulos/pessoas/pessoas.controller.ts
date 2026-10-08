import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CargoDetalhe, CargoResumo, Colaborador, Organograma, VincularCursoBody } from '@cestacorp/contracts';
import { ZodPipe } from '../../compartilhado/zod.pipe';
import { ConsultarCargos } from './casos-de-uso/consultar-cargos';
import { MontarTrilhaDoCargo } from './casos-de-uso/montar-trilha-do-cargo';
import { VerOrganograma } from './casos-de-uso/ver-organograma';
import { PessoasApi } from './pessoas.api';
import { Publico, SomenteGestor, Usuario, UsuarioAtual } from './usuario';

@Controller()
export class PessoasController {
  constructor(
    private readonly pessoas: PessoasApi,
    private readonly organograma: VerOrganograma,
    private readonly cargos: ConsultarCargos,
    private readonly trilhaDoCargo: MontarTrilhaDoCargo,
  ) {}

  /** Lista de pessoas para o seletor de usuário do protótipo. */
  @Publico()
  @Get('sessao/usuarios')
  async usuarios(): Promise<Colaborador[]> {
    return (await this.pessoas.listar()).map(({ inicioNoCargo: _, ...c }) => c);
  }

  @Get('organograma')
  verOrganograma(): Promise<Organograma> {
    return this.organograma.executar();
  }

  @Get('cargos')
  listarCargos(): Promise<CargoResumo[]> {
    return this.cargos.listar();
  }

  @Get('cargos/:id')
  detalharCargo(@Param('id', ParseIntPipe) id: number, @UsuarioAtual() usuario: Usuario): Promise<CargoDetalhe> {
    return this.cargos.detalhar(id, usuario.perfil === 'gestor');
  }

  @SomenteGestor()
  @Post('cargos/:id/trilha')
  @HttpCode(204)
  vincularCurso(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(VincularCursoBody)) corpo: VincularCursoBody) {
    return this.trilhaDoCargo.vincular(id, corpo);
  }

  @SomenteGestor()
  @Delete('cargos/:id/trilha/:cursoId')
  @HttpCode(204)
  removerCurso(@Param('id', ParseIntPipe) id: number, @Param('cursoId', ParseIntPipe) cursoId: number) {
    return this.trilhaDoCargo.remover(id, cursoId);
  }
}
