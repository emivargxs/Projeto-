import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { AutoavaliacaoBody, Avaliacao, AvaliacaoGestorBody, ConsensoBody, ListaAvaliacoes } from '@cestacorp/contracts';
import { ZodPipe } from '../../compartilhado/zod.pipe';
import { SomenteGestor, Usuario, UsuarioAtual } from '../pessoas';
import { ConduzirAvaliacao } from './casos-de-uso/conduzir-avaliacao';
import { VerAvaliacao } from './casos-de-uso/ver-avaliacao';

@Controller('avaliacoes')
export class AvaliacaoController {
  constructor(
    private readonly ver: VerAvaliacao,
    private readonly conduzir: ConduzirAvaliacao,
  ) {}

  @Get('minha')
  minha(@UsuarioAtual() usuario: Usuario): Promise<Avaliacao | null> {
    return this.ver.doColaborador(usuario, usuario.id);
  }

  @SomenteGestor()
  @Get()
  listar(): Promise<ListaAvaliacoes> {
    return this.ver.listarDoCiclo();
  }

  @Get(':id')
  porId(@Param('id', ParseIntPipe) id: number, @UsuarioAtual() usuario: Usuario): Promise<Avaliacao> {
    return this.ver.porId(usuario, id);
  }

  @SomenteGestor()
  @Post('colaborador/:id')
  abrir(@Param('id', ParseIntPipe) id: number) {
    return this.conduzir.abrir(id);
  }

  @Put(':id/autoavaliacao')
  @HttpCode(204)
  autoavaliacao(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioAtual() usuario: Usuario,
    @Body(new ZodPipe(AutoavaliacaoBody)) corpo: AutoavaliacaoBody,
  ) {
    return this.conduzir.autoavaliacao(usuario, id, corpo);
  }

  @SomenteGestor()
  @Put(':id/gestor')
  @HttpCode(204)
  avaliacaoDoGestor(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(AvaliacaoGestorBody)) corpo: AvaliacaoGestorBody) {
    return this.conduzir.avaliacaoDoGestor(id, corpo);
  }

  @SomenteGestor()
  @Put(':id/consenso')
  @HttpCode(204)
  consenso(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(ConsensoBody)) corpo: ConsensoBody) {
    return this.conduzir.consenso(id, corpo);
  }
}
