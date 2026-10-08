import { CodigoPin, RegraPin } from '@cestacorp/contracts';
import { ResumoDeTrilha } from '../trilhas';

export const REGRA_DO_RANKING =
  'Ordenado por pins conquistados no ano; em caso de empate, vence quem tem mais horas de treinamento.';

export interface Contexto {
  resumo: ResumoDeTrilha;
  posicao: number;
  mes: number;
}

type Regra = RegraPin & { conquistou: (c: Contexto) => boolean };

/** Critérios de cada pin. Para mudar uma regra, altere só este arquivo. */
export const REGRAS: Regra[] = [
  { codigo: 'primeiro_curso', nome: 'Primeiro curso', criterio: 'Concluir o 1º curso validado no ano', conquistou: (c) => c.resumo.horasAno > 0 },
  { codigo: 'dez_horas_mes', nome: '10h no mês', criterio: 'Realizar 10h de treinamento no mesmo mês', conquistou: (c) => c.resumo.horasPorMes.some((h) => h >= 10) },
  { codigo: 'trilha_em_dia', nome: 'Trilha em dia', criterio: 'Estar sem cursos obrigatórios vencidos', conquistou: (c) => c.resumo.obrigatoria.total > 0 && c.resumo.trilhaEmDia },
  { codigo: 'cinco_certificados', nome: '5 certificados', criterio: 'Ter 5 certificados validados pelo gestor', conquistou: (c) => c.resumo.certificadosValidados >= 5 },
  { codigo: 'avaliou_cinco', nome: 'Avaliou 5 cursos', criterio: 'Avaliar a qualidade de 5 cursos concluídos', conquistou: (c) => c.resumo.conclusoesEnviadas >= 5 },
  { codigo: 'pdi_iniciado', nome: 'PDI iniciado', criterio: 'Concluir a 1ª ação do PDI', conquistou: (c) => (c.resumo.pdi?.concluidos ?? 0) >= 1 },
  { codigo: 'pdi_em_dia', nome: 'PDI em dia', criterio: 'Estar sem ações do PDI atrasadas', conquistou: (c) => !!c.resumo.pdi && c.resumo.pdi.total > 0 && c.resumo.pdiEmDia },
  { codigo: 'trilha_completa', nome: 'Trilha completa', criterio: 'Concluir 100% da trilha obrigatória do cargo', conquistou: (c) => c.resumo.trilhaCompleta },
  { codigo: 'top3_ano', nome: 'Top 3 do ano', criterio: 'Terminar o ano entre os 3 primeiros do ranking', conquistou: (c) => c.mes === 12 && c.posicao <= 3 },
];

export const regraPublica = ({ codigo, nome, criterio }: Regra): RegraPin => ({ codigo, nome, criterio });
export const PIN_DE_RANKING: CodigoPin = 'top3_ano';
