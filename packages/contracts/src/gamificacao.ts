import { z } from 'zod';

/** Módulo Gamificação: pins e ranking do time. */

export const CodigoPin = z.enum([
  'primeiro_curso',
  'dez_horas_mes',
  'trilha_em_dia',
  'cinco_certificados',
  'avaliou_cinco',
  'pdi_iniciado',
  'pdi_em_dia',
  'trilha_completa',
  'top3_ano',
]);
export type CodigoPin = z.infer<typeof CodigoPin>;

export const RegraPin = z.object({ codigo: CodigoPin, nome: z.string(), criterio: z.string() });
export type RegraPin = z.infer<typeof RegraPin>;

export const RegrasGamificacao = z.object({ pins: z.array(RegraPin), regraRanking: z.string() });
export type RegrasGamificacao = z.infer<typeof RegrasGamificacao>;

export const MeusPins = z.object({
  conquistados: z.number().int(),
  total: z.number().int(),
  posicaoRanking: z.number().int(),
  pins: z.array(RegraPin.extend({ conquistado: z.boolean() })),
});
export type MeusPins = z.infer<typeof MeusPins>;

export const Ranking = z.array(
  z.object({
    posicao: z.number().int(),
    colaboradorId: z.number().int(),
    nome: z.string(),
    pins: z.number().int(),
    horasAno: z.number(),
    voce: z.boolean(),
  }),
);
export type Ranking = z.infer<typeof Ranking>;
