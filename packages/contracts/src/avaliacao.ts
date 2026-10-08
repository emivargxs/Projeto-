import { z } from 'zod';
import { Escala, PessoaRef } from './comum';

/** Módulo Avaliação: avaliação de desempenho anual (autoavaliação, gestor, consenso, resultados, objetivos). */

export const GrupoCriterio = z.enum(['conhecimentos', 'habilidades', 'atitudes']);
export type GrupoCriterio = z.infer<typeof GrupoCriterio>;

export const EtapaAvaliacao = z.enum(['autoavaliacao', 'avaliacao_gestor', 'consenso', 'concluida']);
export type EtapaAvaliacao = z.infer<typeof EtapaAvaliacao>;

export const ETAPA_ROTULO: Record<EtapaAvaliacao, string> = {
  autoavaliacao: 'Autoavaliação',
  avaliacao_gestor: 'Avaliação do gestor',
  consenso: 'Consenso',
  concluida: 'Concluída',
};

export const Criterio = z.object({
  id: z.number().int(),
  grupo: GrupoCriterio,
  texto: z.string(),
  auto: Escala.nullable(),
  /** Ocultada do colaborador até a etapa de consenso. */
  gestor: Escala.nullable(),
  consenso: Escala.nullable(),
});
export type Criterio = z.infer<typeof Criterio>;

export const Resultado = z.object({
  id: z.number().int(),
  indicador: z.string(),
  meta: z.string(),
  realizado: z.string(),
  atingido: z.boolean(),
});
export type Resultado = z.infer<typeof Resultado>;

export const Avaliacao = z.object({
  id: z.number().int(),
  ciclo: z.string(),
  colaborador: PessoaRef,
  etapa: EtapaAvaliacao,
  criterios: z.array(Criterio),
  resultados: z.array(Resultado),
  objetivos5Anos: z.string(),
  comentarioResultados: z.string(),
});
export type Avaliacao = z.infer<typeof Avaliacao>;
export const AvaliacaoOuNada = Avaliacao.nullable();

export const ListaAvaliacoes = z.array(
  z.object({ id: z.number().int(), colaborador: PessoaRef, ciclo: z.string(), etapa: EtapaAvaliacao, divergencias: z.number().int() }),
);
export type ListaAvaliacoes = z.infer<typeof ListaAvaliacoes>;

const Notas = z.array(z.object({ criterioId: z.number().int(), valor: Escala }));

export const AutoavaliacaoBody = z.object({
  notas: Notas,
  objetivos5Anos: z.string().trim(),
  comentarioResultados: z.string().trim(),
  enviar: z.boolean(),
});
export type AutoavaliacaoBody = z.infer<typeof AutoavaliacaoBody>;

export const AvaliacaoGestorBody = z.object({
  notas: Notas,
  /** O gestor registra meta x realizado dos indicadores do cargo. */
  resultados: z.array(z.object({ id: z.number().int(), meta: z.string().trim(), realizado: z.string().trim(), atingido: z.boolean() })),
  enviar: z.boolean(),
});
export type AvaliacaoGestorBody = z.infer<typeof AvaliacaoGestorBody>;

export const ConsensoBody = z.object({ notas: Notas, concluir: z.boolean() });
export type ConsensoBody = z.infer<typeof ConsensoBody>;
