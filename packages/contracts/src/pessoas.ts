import { z } from 'zod';
import { Nivel, Perfil } from './comum';
import { Curso } from './catalogo';

/** Módulo Pessoas: colaboradores, organograma, cargos e salários, trilha obrigatória do cargo. */

export const Colaborador = z.object({
  id: z.number().int(),
  nome: z.string(),
  iniciais: z.string(),
  perfil: Perfil,
  cargoId: z.number().int(),
  cargoNome: z.string(),
  nivel: Nivel,
  areaNome: z.string(),
  gestorId: z.number().int().nullable(),
});
export type Colaborador = z.infer<typeof Colaborador>;

export const ListaColaboradores = z.array(Colaborador);

export const CargoNoOrganograma = z.object({
  id: z.number().int(),
  nome: z.string(),
  nivel: Nivel,
  coordenacao: z.boolean(),
  ocupantes: z.array(z.object({ id: z.number().int(), nome: z.string(), iniciais: z.string() })),
});

export const Organograma = z.object({
  diretorias: z.array(
    z.object({
      id: z.number().int(),
      nome: z.string(),
      diretor: z.string(),
      areas: z.array(
        z.object({
          id: z.number().int(),
          nome: z.string(),
          apoio: z.boolean(),
          cargos: z.array(CargoNoOrganograma),
        }),
      ),
    }),
  ),
});
export type Organograma = z.infer<typeof Organograma>;

export const CargoResumo = z.object({
  id: z.number().int(),
  nome: z.string(),
  areaNome: z.string(),
  nivel: Nivel,
  pessoas: z.number().int(),
  cursosObrigatorios: z.number().int(),
});
export type CargoResumo = z.infer<typeof CargoResumo>;
export const ListaCargos = z.array(CargoResumo);

export const DescricaoCargo = z.object({
  responsabilidades: z.array(z.string()),
  conhecimentos: z.array(z.string()),
  habilidades: z.array(z.string()),
  atitudes: z.array(z.string()),
  indicadores: z.array(z.string()),
});
export type DescricaoCargo = z.infer<typeof DescricaoCargo>;

export const ItemTrilhaCargo = Curso.extend({ prazoDias: z.number().int() });
export type ItemTrilhaCargo = z.infer<typeof ItemTrilhaCargo>;

export const CargoDetalhe = z.object({
  id: z.number().int(),
  nome: z.string(),
  areaNome: z.string(),
  nivel: Nivel,
  descricao: DescricaoCargo,
  formacao: z.string(),
  experiencia: z.string(),
  proximoCargo: z.object({ id: z.number().int(), nome: z.string() }).nullable(),
  /** Só é enviada para o perfil gestor. */
  faixaSalarial: z.object({ minimo: z.number(), maximo: z.number() }).nullable(),
  ocupantes: z.array(z.object({ id: z.number().int(), nome: z.string(), iniciais: z.string() })),
  trilha: z.array(ItemTrilhaCargo),
});
export type CargoDetalhe = z.infer<typeof CargoDetalhe>;

export const VincularCursoBody = z.object({
  cursoId: z.number().int().positive(),
  prazoDias: z.number().int().min(1).max(365),
});
export type VincularCursoBody = z.infer<typeof VincularCursoBody>;
