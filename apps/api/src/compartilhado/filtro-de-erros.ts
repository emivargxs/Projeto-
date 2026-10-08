import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';

/** Toda resposta de erro sai no formato { mensagem, detalhes? } (contrato ErroApi). */
@Catch()
export class FiltroDeErros implements ExceptionFilter {
  private readonly log = new Logger('API');

  catch(erro: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (erro instanceof HttpException) {
      const corpo = erro.getResponse();
      const mensagem =
        typeof corpo === 'object' && corpo && 'mensagem' in corpo
          ? (corpo as { mensagem: string }).mensagem
          : erro.message;
      const detalhes = typeof corpo === 'object' && corpo && 'detalhes' in corpo ? (corpo as { detalhes: unknown }).detalhes : undefined;
      res.status(erro.getStatus()).json({ mensagem, detalhes });
      return;
    }
    this.log.error(erro);
    res.status(500).json({ mensagem: 'Erro inesperado no servidor' });
  }
}
