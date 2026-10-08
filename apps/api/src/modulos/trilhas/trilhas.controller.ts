import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  AtualizarMetasBody,
  AvaliarEficaciaBody,
  ConclusaoDetalhe,
  DevolverConclusaoBody,
  MetaHoras,
  MinhaTrilha,
  RegistrarConclusaoBody,
  TrilhasDaEquipe,
} from '@cestacorp/contracts';
import { Response } from 'express';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join, resolve } from 'path';
import { ZodPipe } from '../../compartilhado/zod.pipe';
import { SomenteGestor, Usuario, UsuarioAtual } from '../pessoas';
import { AcompanharEquipe } from './casos-de-uso/acompanhar-equipe';
import { DefinirMetas } from './casos-de-uso/definir-metas';
import { RegistrarConclusao } from './casos-de-uso/registrar-conclusao';
import { ValidarConclusao } from './casos-de-uso/validar-conclusao';
import { VerMinhaTrilha } from './casos-de-uso/ver-minha-trilha';

const PASTA_UPLOADS = resolve(process.cwd(), 'uploads');
mkdirSync(PASTA_UPLOADS, { recursive: true });

const TIPOS_ACEITOS = ['application/pdf', 'image/png', 'image/jpeg'];

const uploadDoCertificado = FileInterceptor('certificado', {
  storage: diskStorage({
    destination: PASTA_UPLOADS,
    filename: (_req, arquivo, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(arquivo.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, arquivo, cb) =>
    TIPOS_ACEITOS.includes(arquivo.mimetype)
      ? cb(null, true)
      : cb(new BadRequestException({ mensagem: 'Envie o certificado em PDF, PNG ou JPG' }), false),
});

@Controller()
export class TrilhasController {
  constructor(
    private readonly minhaTrilha: VerMinhaTrilha,
    private readonly conclusao: RegistrarConclusao,
    private readonly validacao: ValidarConclusao,
    private readonly equipe: AcompanharEquipe,
    private readonly metas: DefinirMetas,
  ) {}

  @Get('trilhas/minha')
  verMinhaTrilha(@UsuarioAtual() usuario: Usuario): Promise<MinhaTrilha> {
    return this.minhaTrilha.executar(usuario);
  }

  @Post('trilhas/cursos/:cursoId/iniciar')
  @HttpCode(204)
  iniciar(@Param('cursoId', ParseIntPipe) cursoId: number, @UsuarioAtual() usuario: Usuario) {
    return this.conclusao.iniciar(usuario, cursoId);
  }

  @Post('trilhas/cursos/:cursoId/conclusao')
  @UseInterceptors(uploadDoCertificado)
  registrarConclusao(
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @UsuarioAtual() usuario: Usuario,
    @Body(new ZodPipe(RegistrarConclusaoBody)) corpo: RegistrarConclusaoBody,
    @UploadedFile() arquivo?: Express.Multer.File,
  ) {
    const enviado = arquivo
      ? { nomeOriginal: Buffer.from(arquivo.originalname, 'latin1').toString('utf8'), nomeSalvo: arquivo.filename }
      : null;
    return this.conclusao.executar(usuario, cursoId, corpo, enviado);
  }

  @SomenteGestor()
  @Get('trilhas/equipe')
  verEquipe(): Promise<TrilhasDaEquipe> {
    return this.equipe.executar();
  }

  @Get('conclusoes/:id')
  detalharConclusao(@Param('id', ParseIntPipe) id: number, @UsuarioAtual() usuario: Usuario): Promise<ConclusaoDetalhe> {
    return this.validacao.detalhar(usuario, id);
  }

  @Get('conclusoes/:id/certificado')
  async baixarCertificado(@Param('id', ParseIntPipe) id: number, @UsuarioAtual() usuario: Usuario, @Res() res: Response) {
    const certificado = await this.validacao.arquivoDoCertificado(usuario, id);
    if (!certificado) throw new NotFoundException({ mensagem: 'Certificado não encontrado' });
    res.download(join(PASTA_UPLOADS, certificado.arquivo), certificado.nome);
  }

  @SomenteGestor()
  @Post('conclusoes/:id/validar')
  @HttpCode(204)
  validar(@Param('id', ParseIntPipe) id: number, @UsuarioAtual() usuario: Usuario) {
    return this.validacao.validar(usuario, id);
  }

  @SomenteGestor()
  @Post('conclusoes/:id/devolver')
  @HttpCode(204)
  devolver(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(DevolverConclusaoBody)) corpo: DevolverConclusaoBody) {
    return this.validacao.devolver(id, corpo.motivo);
  }

  @SomenteGestor()
  @Post('conclusoes/:id/eficacia')
  @HttpCode(204)
  avaliarEficacia(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(AvaliarEficaciaBody)) corpo: AvaliarEficaciaBody) {
    return this.validacao.avaliarEficacia(id, corpo.eficacia);
  }

  @Get('metas')
  listarMetas(): Promise<MetaHoras[]> {
    return this.metas.listar();
  }

  @SomenteGestor()
  @Put('metas')
  atualizarMetas(@Body(new ZodPipe(AtualizarMetasBody)) corpo: AtualizarMetasBody): Promise<MetaHoras[]> {
    return this.metas.atualizar(corpo.metas);
  }
}
