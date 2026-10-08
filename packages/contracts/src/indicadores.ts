import { z } from 'zod';
import { Percentual, SerieMensal } from './comum';

/** Módulo Indicadores: hora-homem, % de cumprimento das trilhas e horas mês a mês. */

export const IndicadoresOrganizacao = z.object({
  mesRotulo: z.string(),
  ano: z.number().int(),
  colaboradores: z.number().int(),
  horaHomemAno: z.number(),
  horasPorColaborador: z.number(),
  obrigatoriaPercentual: Percentual,
  pdiPercentual: Percentual,
  pdisAtivos: z.number().int(),
  horasMes: z.number(),
  metaMes: z.number(),
  serie: SerieMensal,
  metaMensalTime: z.number(),
  pdiPorArea: z.array(z.object({ area: z.string(), percentual: Percentual })),
});
export type IndicadoresOrganizacao = z.infer<typeof IndicadoresOrganizacao>;

export const IndicadoresColaborador = z.object({
  mesRotulo: z.string(),
  ano: z.number().int(),
  horasAno: z.number(),
  mediaTimeHorasAno: z.number(),
  obrigatoriaPercentual: Percentual,
  obrigatoriaTime: Percentual,
  pdiPercentual: Percentual,
  pdiTime: Percentual,
  horasMes: z.number(),
  metaMes: z.number(),
  serie: SerieMensal,
});
export type IndicadoresColaborador = z.infer<typeof IndicadoresColaborador>;
