import { z } from 'zod';

/** Módulo Catálogo: cursos externos usados nas trilhas (obrigatória e do PDI). */
export const Modalidade = z.enum(['online', 'presencial', 'hibrido', 'video', 'leitura']);
export type Modalidade = z.infer<typeof Modalidade>;

export const MODALIDADE_ROTULO: Record<Modalidade, string> = {
  online: 'Online',
  presencial: 'Presencial',
  hibrido: 'Híbrido',
  video: 'Vídeo',
  leitura: 'Leitura',
};

export const Curso = z.object({
  id: z.number().int(),
  nome: z.string(),
  competencia: z.string(),
  entidade: z.string(),
  modalidade: Modalidade,
  cargaHoras: z.number(),
  investimento: z.number(),
  link: z.string(),
});
export type Curso = z.infer<typeof Curso>;

export const ListaCursos = z.array(Curso);
export type ListaCursos = z.infer<typeof ListaCursos>;
