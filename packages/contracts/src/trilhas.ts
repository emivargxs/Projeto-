import { z } from 'zod';
import { DataISO, Eficacia, Nivel, PessoaRef, Percentual } from './comum';
import { Modalidade } from './catalogo';

/** Módulo Trilhas: treinamentos do colaborador, conclusão com certificado, validação, metas de horas. */

export const Origem = z.enum(['obrigatorio', 'pdi', 'livre']);
export type Origem = z.infer<typeof Origem>;

export const StatusTreinamento = z.enum(['nao_iniciado', 'em_andamento', 'enviado', 'devolvido', 'concluido']);
export type StatusTreinamento = z.infer<typeof StatusTreinamento>;

export const STATUS_ROTULO: Record<StatusTreinamento, string> = {
  nao_iniciado: 'Não iniciado',
  em_andamento: 'Em andamento',
  enviado: 'Aguardando validação',
  devolvido: 'Devolvido para ajuste',
  concluido: 'Concluído',
};

export const Treinamento = z.object({
  cursoId: z.number().int(),
  curso: z.string(),
  competencia: z.string(),
  origem: Origem,
  entidade: z.string(),
  modalidade: Modalidade,
  cargaHoras: z.number(),
  link: z.string(),
  prazo: DataISO.nullable(),
  status: StatusTreinamento,
  /** Prazo passou e o curso ainda não foi entregue. */
  vencido: z.boolean(),
  conclusaoId: z.number().int().nullable(),
  motivoDevolucao: z.string().nullable(),
});
export type Treinamento = z.infer<typeof Treinamento>;

export const AvisoAtraso = z.object({
  mesRotulo: z.string(),
  dia: z.number().int(),
  metaMes: z.number(),
  esperadoAteHoje: z.number(),
  realizadoNoMes: z.number(),
  percentualAtraso: Percentual,
  atrasado: z.boolean(),
});
export type AvisoAtraso = z.infer<typeof AvisoAtraso>;

export const Progresso = z.object({ concluidos: z.number().int(), total: z.number().int(), percentual: Percentual });
export type Progresso = z.infer<typeof Progresso>;

export const MinhaTrilha = z.object({
  colaborador: PessoaRef,
  aviso: AvisoAtraso,
  obrigatoria: Progresso,
  pdi: Progresso,
  horasAno: z.number(),
  metaAno: z.number(),
  treinamentos: z.array(Treinamento),
});
export type MinhaTrilha = z.infer<typeof MinhaTrilha>;

const nota = z.coerce.number().int().min(1, 'Dê uma nota de 1 a 5').max(5);

/** Campos enviados junto com o arquivo do certificado (multipart/form-data). */
export const RegistrarConclusaoBody = z.object({
  dataRealizacao: DataISO,
  codigoCertificado: z.string().trim().min(3, 'Informe o código do certificado'),
  cargaHoras: z.coerce.number().positive('Informe a carga horária'),
  investimento: z.coerce.number().min(0),
  resumo: z.string().trim().min(40, 'Escreva um resumo com pelo menos 40 caracteres'),
  notaConteudo: nota,
  notaDidatica: nota,
  notaAplicabilidade: nota,
});
export type RegistrarConclusaoBody = z.infer<typeof RegistrarConclusaoBody>;

export const ConclusaoDetalhe = z.object({
  id: z.number().int(),
  colaborador: PessoaRef,
  curso: z.object({
    id: z.number().int(),
    nome: z.string(),
    competencia: z.string(),
    entidade: z.string(),
    modalidade: Modalidade,
    link: z.string(),
  }),
  origem: Origem,
  dataRealizacao: DataISO,
  codigoCertificado: z.string(),
  cargaHoras: z.number(),
  investimento: z.number(),
  resumo: z.string(),
  notas: z.object({ conteudo: z.number(), didatica: z.number(), aplicabilidade: z.number() }),
  certificado: z.object({ nome: z.string(), url: z.string() }).nullable(),
  status: z.enum(['enviado', 'devolvido', 'concluido']),
  enviadoEm: DataISO,
  validadoEm: DataISO.nullable(),
  eficacia: Eficacia.nullable(),
  /** A partir desta data o gestor pode avaliar a eficácia (30 dias após a conclusão). */
  eficaciaLiberadaEm: DataISO,
  eficaciaLiberada: z.boolean(),
  motivoDevolucao: z.string().nullable(),
});
export type ConclusaoDetalhe = z.infer<typeof ConclusaoDetalhe>;

export const DevolverConclusaoBody = z.object({ motivo: z.string().trim().min(5, 'Explique o que precisa ser ajustado') });
export type DevolverConclusaoBody = z.infer<typeof DevolverConclusaoBody>;

export const AvaliarEficaciaBody = z.object({ eficacia: Eficacia });
export type AvaliarEficaciaBody = z.infer<typeof AvaliarEficaciaBody>;

export const TrilhasDaEquipe = z.object({
  referencia: z.object({ dia: z.number().int(), mesRotulo: z.string() }),
  indicadores: z.object({
    obrigatoriaPercentual: Percentual,
    pdiPercentual: Percentual,
    atrasados: z.number().int(),
    paraValidar: z.number().int(),
  }),
  linhas: z.array(
    z.object({
      colaborador: PessoaRef,
      obrigatoria: Progresso,
      pdi: Progresso.nullable(),
      horasMes: z.number(),
      metaMes: z.number(),
      percentualAtraso: Percentual,
    }),
  ),
  paraValidar: z.array(
    z.object({ conclusaoId: z.number().int(), colaborador: z.string(), curso: z.string(), cargaHoras: z.number(), enviadoEm: DataISO }),
  ),
  eficaciaPendente: z.array(
    z.object({ conclusaoId: z.number().int(), colaborador: z.string(), curso: z.string(), liberadaEm: DataISO }),
  ),
});
export type TrilhasDaEquipe = z.infer<typeof TrilhasDaEquipe>;

export const MetaHoras = z.object({ nivel: Nivel, horasMes: z.number().min(0).max(100) });
export type MetaHoras = z.infer<typeof MetaHoras>;
export const ListaMetas = z.array(MetaHoras);
export const AtualizarMetasBody = z.object({ metas: z.array(MetaHoras).min(1) });
export type AtualizarMetasBody = z.infer<typeof AtualizarMetasBody>;
