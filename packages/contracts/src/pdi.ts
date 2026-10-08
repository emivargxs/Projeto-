import { z } from 'zod';
import { DataISO, PessoaRef } from './comum';

/** Módulo PDI: plano de desenvolvimento individual (o que fazer, responsável, prazo, acompanhamento). */

export const SituacaoAcao = z.enum(['em_andamento', 'concluida', 'atrasada']);
export type SituacaoAcao = z.infer<typeof SituacaoAcao>;

export const AcaoPdi = z.object({
  id: z.number().int(),
  oQueFazer: z.string(),
  comoFazer: z.string(),
  responsavel: z.string(),
  prazo: DataISO,
  progresso: z.number().int().min(0).max(100),
  situacao: SituacaoAcao,
  /** Quando a ação é um curso, ele entra na trilha do PDI do colaborador. */
  cursoId: z.number().int().nullable(),
  cursoNome: z.string().nullable(),
});
export type AcaoPdi = z.infer<typeof AcaoPdi>;

export const Pdi = z.object({
  id: z.number().int(),
  colaborador: PessoaRef,
  ciclo: z.string(),
  inicio: DataISO,
  fim: DataISO,
  emDia: z.boolean(),
  progresso: z.number().int(),
  acoes: z.array(AcaoPdi),
});
export type Pdi = z.infer<typeof Pdi>;

export const PdiOuNada = Pdi.nullable();

export const NovaAcaoBody = z.object({
  oQueFazer: z.string().trim().min(3, 'Descreva a ação'),
  comoFazer: z.string().trim().default(''),
  responsavel: z.string().trim().min(2, 'Informe o responsável'),
  prazo: DataISO,
  cursoId: z.number().int().positive().nullable().default(null),
});
export type NovaAcaoBody = z.input<typeof NovaAcaoBody>;

export const AtualizarProgressoBody = z.object({ progresso: z.number().int().min(0).max(100) });
export type AtualizarProgressoBody = z.infer<typeof AtualizarProgressoBody>;
