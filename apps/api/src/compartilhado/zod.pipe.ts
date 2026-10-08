import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodTypeAny, z } from 'zod';

/** Valida o corpo da requisição com o contrato Zod compartilhado com o front. */
export class ZodPipe<S extends ZodTypeAny> implements PipeTransform<unknown, z.infer<S>> {
  constructor(private readonly schema: S) {}

  transform(valor: unknown): z.infer<S> {
    const resultado = this.schema.safeParse(valor);
    if (!resultado.success) {
      const primeiro = resultado.error.issues[0];
      throw new BadRequestException({
        mensagem: primeiro?.message ?? 'Dados inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      });
    }
    return resultado.data;
  }
}
