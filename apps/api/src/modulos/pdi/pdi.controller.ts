import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { AtualizarProgressoBody, NovaAcaoBody, Pdi } from '@cestacorp/contracts';
import { ZodPipe } from '../../compartilhado/zod.pipe';
import { garantirAcesso, SomenteGestor, Usuario, UsuarioAtual } from '../pessoas';
import { EditarPdi } from './casos-de-uso/editar-pdi';
import { VerPdi } from './casos-de-uso/ver-pdi';

@Controller('pdis')
export class PdiController {
  constructor(
    private readonly verPdi: VerPdi,
    private readonly editarPdi: EditarPdi,
  ) {}

  @Get('meu')
  meu(@UsuarioAtual() usuario: Usuario): Promise<Pdi | null> {
    return this.verPdi.executar(usuario.id);
  }

  @Get('colaborador/:id')
  doColaborador(@Param('id', ParseIntPipe) id: number, @UsuarioAtual() usuario: Usuario): Promise<Pdi | null> {
    garantirAcesso(usuario, id);
    return this.verPdi.executar(id);
  }

  @SomenteGestor()
  @Post('colaborador/:id')
  @HttpCode(204)
  criar(@Param('id', ParseIntPipe) id: number) {
    return this.editarPdi.criar(id);
  }

  @Post(':id/acoes')
  @HttpCode(204)
  adicionarAcao(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioAtual() usuario: Usuario,
    @Body(new ZodPipe(NovaAcaoBody)) corpo: ReturnType<typeof NovaAcaoBody.parse>,
  ) {
    return this.editarPdi.adicionarAcao(usuario, id, corpo);
  }

  @Patch('acoes/:id/progresso')
  @HttpCode(204)
  atualizarProgresso(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioAtual() usuario: Usuario,
    @Body(new ZodPipe(AtualizarProgressoBody)) corpo: AtualizarProgressoBody,
  ) {
    return this.editarPdi.atualizarProgresso(usuario, id, corpo.progresso);
  }
}
