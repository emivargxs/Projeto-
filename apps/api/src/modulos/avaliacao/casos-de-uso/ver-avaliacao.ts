import { Injectable, NotFoundException } from '@nestjs/common';
import { Avaliacao, Escala, EtapaAvaliacao, GrupoCriterio, ListaAvaliacoes } from '@cestacorp/contracts';
import { Banco } from '../../../compartilhado/banco';
import { cicloAtual } from '../../pdi';
import { garantirAcesso, PessoasApi, Usuario } from '../../pessoas';

interface LinhaAvaliacao {
  id: number;
  colaborador_id: number;
  ciclo: string;
  etapa: EtapaAvaliacao;
  objetivos_5_anos: string;
  comentario_resultados: string;
}

/** Caso de uso: ver a avaliação anual do ciclo. O colaborador só vê a nota do gestor a partir do consenso. */
@Injectable()
export class VerAvaliacao {
  constructor(
    private readonly banco: Banco,
    private readonly pessoas: PessoasApi,
  ) {}

  async listarDoCiclo(): Promise<ListaAvaliacoes> {
    const linhas = await this.banco.consultar<LinhaAvaliacao & { divergencias: number }>(
      `SELECT a.*, (SELECT count(*)::int FROM avaliacao_criterio c
                     WHERE c.avaliacao_id = a.id AND c.auto IS NOT NULL AND c.gestor IS NOT NULL AND c.auto <> c.gestor) AS divergencias
         FROM avaliacao a WHERE a.ciclo = $1 ORDER BY a.id`,
      [cicloAtual()],
    );
    return Promise.all(
      linhas.map(async (l) => ({
        id: l.id,
        colaborador: await this.pessoas.referencia(l.colaborador_id),
        ciclo: l.ciclo,
        etapa: l.etapa,
        divergencias: l.divergencias,
      })),
    );
  }

  async doColaborador(usuario: Usuario, colaboradorId: number): Promise<Avaliacao | null> {
    garantirAcesso(usuario, colaboradorId);
    const l = await this.banco.primeiro<LinhaAvaliacao>('SELECT * FROM avaliacao WHERE colaborador_id = $1 AND ciclo = $2', [
      colaboradorId,
      cicloAtual(),
    ]);
    return l ? this.montar(usuario, l) : null;
  }

  async porId(usuario: Usuario, id: number): Promise<Avaliacao> {
    const l = await this.banco.primeiro<LinhaAvaliacao>('SELECT * FROM avaliacao WHERE id = $1', [id]);
    if (!l) throw new NotFoundException({ mensagem: 'Avaliação não encontrada' });
    garantirAcesso(usuario, l.colaborador_id);
    return this.montar(usuario, l);
  }

  private async montar(usuario: Usuario, l: LinhaAvaliacao): Promise<Avaliacao> {
    const criterios = await this.banco.consultar<{ id: number; grupo: GrupoCriterio; texto: string; auto: Escala | null; gestor: Escala | null; consenso: Escala | null }>(
      `SELECT id, grupo, texto, auto, gestor, consenso FROM avaliacao_criterio WHERE avaliacao_id = $1
        ORDER BY CASE grupo WHEN 'conhecimentos' THEN 0 WHEN 'habilidades' THEN 1 ELSE 2 END, ordem, id`,
      [l.id],
    );
    const resultados = await this.banco.consultar<{ id: number; indicador: string; meta: string; realizado: string; atingido: boolean }>(
      'SELECT id, indicador, meta, realizado, atingido FROM avaliacao_resultado WHERE avaliacao_id = $1 ORDER BY ordem, id',
      [l.id],
    );
    const ocultarGestor = usuario.perfil !== 'gestor' && (l.etapa === 'autoavaliacao' || l.etapa === 'avaliacao_gestor');
    return {
      id: l.id,
      ciclo: l.ciclo,
      colaborador: await this.pessoas.referencia(l.colaborador_id),
      etapa: l.etapa,
      criterios: criterios.map((c) => ({ ...c, gestor: ocultarGestor ? null : c.gestor })),
      resultados,
      objetivos5Anos: l.objetivos_5_anos,
      comentarioResultados: l.comentario_resultados,
    };
  }
}
