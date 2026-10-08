import { z } from 'zod';

/** Perfil de acesso de quem usa o sistema. */
export const Perfil = z.enum(['gestor', 'colaborador']);
export type Perfil = z.infer<typeof Perfil>;

/** Níveis da escada de cargos (organograma da Cestacorp). */
export const Nivel = z.enum([
  'estagiario',
  'auxiliar',
  'assistente',
  'analista_junior',
  'analista_pleno',
  'analista_senior',
  'coordenador',
  'diretor',
  'apoio',
]);
export type Nivel = z.infer<typeof Nivel>;

export const NIVEL_ROTULO: Record<Nivel, string> = {
  estagiario: 'Estagiário',
  auxiliar: 'Auxiliar',
  assistente: 'Assistente',
  analista_junior: 'Analista Júnior',
  analista_pleno: 'Analista Pleno',
  analista_senior: 'Analista Sênior',
  coordenador: 'Coordenador',
  diretor: 'Diretor',
  apoio: 'Área de apoio',
};

/** Escala usada na avaliação de desempenho anual. */
export const Escala = z.enum(['nao_atende', 'atende_parcialmente', 'atende_plenamente', 'supera']);
export type Escala = z.infer<typeof Escala>;

export const ESCALA_ROTULO: Record<Escala, string> = {
  nao_atende: 'Não atende',
  atende_parcialmente: 'Atende parcialmente',
  atende_plenamente: 'Atende plenamente',
  supera: 'Supera as expectativas',
};

/** Escala da avaliação de eficácia do treinamento (feita pelo gestor). */
export const Eficacia = z.enum(['nao_aplicou', 'aplicou_parcialmente', 'aplicou_plenamente', 'superou']);
export type Eficacia = z.infer<typeof Eficacia>;

export const EFICACIA_ROTULO: Record<Eficacia, string> = {
  nao_aplicou: 'Não aplicou',
  aplicou_parcialmente: 'Aplicou parcialmente',
  aplicou_plenamente: 'Aplicou plenamente',
  superou: 'Superou',
};

/** Data no formato AAAA-MM-DD. */
export const DataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD');

export const PessoaRef = z.object({
  id: z.number().int(),
  nome: z.string(),
  iniciais: z.string(),
  cargoNome: z.string(),
});
export type PessoaRef = z.infer<typeof PessoaRef>;

export const Percentual = z.number().min(0).max(100);

export const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const MESES_NOME = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export const SerieMensal = z.array(z.object({ mes: z.number().int(), rotulo: z.string(), horas: z.number() }));
export type SerieMensal = z.infer<typeof SerieMensal>;

export const ErroApi = z.object({ mensagem: z.string(), detalhes: z.unknown().optional() });
export type ErroApi = z.infer<typeof ErroApi>;
