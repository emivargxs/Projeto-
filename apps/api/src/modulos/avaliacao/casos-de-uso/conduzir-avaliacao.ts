import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AutoavaliacaoBody, AvaliacaoGestorBody, ConsensoBody, EtapaAvaliacao } from '@cestacorp/contracts';
import { Banco, Executor } from '../../../compartilhado/banco';
import { cicloAtual } from '../../pdi';
import { PessoasApi, Usuario } from '../../pessoas';

type Nota = { criterioId: number; valor: string };

/**
 * Casos de uso da avaliação anual, na ordem do fluxo:
 * abrir (gestor) → autoavaliação (colaborador) → avaliação do gestor → consenso → concluída.
 */
@Injectable()
export class ConduzirAvaliacao {
  constructor(
    private readonly banco: Banco,
    private readonly pessoas: PessoasApi,
  ) {}

  async abrir(colaboradorId: number): Promise<{ id: number }> {
    const colaborador = await this.pessoas.obter(colaboradorId);
    if (!colaborador) throw new NotFoundException({ mensagem: 'Colaborador não encontrado' });
    const ciclo = cicloAtual();
    const existente = await this.banco.primeiro('SELECT id FROM avaliacao WHERE colaborador_id = $1 AND ciclo = $2', [colaboradorId, ciclo]);
    if (existente) throw new ConflictException({ mensagem: 'A avaliação deste ciclo já foi aberta' });
    const criterios = await this.pessoas.criteriosDoCargo(colaborador.cargoId);

    return this.banco.transacao(async (tx) => {
      const av = await tx.primeiro<{ id: number }>('INSERT INTO avaliacao (colaborador_id, ciclo) VALUES ($1, $2) RETURNING id', [colaboradorId, ciclo]);
      const grupos = ['conhecimentos', 'habilidades', 'atitudes'] as const;
      for (const grupo of grupos) {
        for (const [ordem, texto] of criterios[grupo].entries()) {
          await tx.consultar('INSERT INTO avaliacao_criterio (avaliacao_id, grupo, texto, ordem) VALUES ($1, $2, $3, $4)', [av!.id, grupo, texto, ordem]);
        }
      }
      for (const [ordem, indicador] of criterios.indicadores.entries()) {
        await tx.consultar('INSERT INTO avaliacao_resultado (avaliacao_id, indicador, ordem) VALUES ($1, $2, $3)', [av!.id, indicador, ordem]);
      }
      return { id: av!.id };
    });
  }

  async autoavaliacao(usuario: Usuario, id: number, corpo: AutoavaliacaoBody): Promise<void> {
    const av = await this.exigirEtapa(id, 'autoavaliacao');
    if (av.colaborador_id !== usuario.id) throw new ForbiddenException({ mensagem: 'Só o próprio colaborador faz a autoavaliação' });
    await this.banco.transacao(async (tx) => {
      await this.gravarNotas(tx, id, 'auto', corpo.notas);
      await tx.consultar('UPDATE avaliacao SET objetivos_5_anos = $2, comentario_resultados = $3 WHERE id = $1', [
        id, corpo.objetivos5Anos, corpo.comentarioResultados,
      ]);
    });
    if (corpo.enviar) await this.avancar(id, 'auto', 'avaliacao_gestor');
  }

  async avaliacaoDoGestor(id: number, corpo: AvaliacaoGestorBody): Promise<void> {
    await this.exigirEtapa(id, 'avaliacao_gestor');
    await this.banco.transacao(async (tx) => {
      await this.gravarNotas(tx, id, 'gestor', corpo.notas);
      for (const r of corpo.resultados) {
        await tx.consultar('UPDATE avaliacao_resultado SET meta = $3, realizado = $4, atingido = $5 WHERE id = $1 AND avaliacao_id = $2', [
          r.id, id, r.meta, r.realizado, r.atingido,
        ]);
      }
    });
    if (corpo.enviar) await this.avancar(id, 'gestor', 'consenso');
  }

  async consenso(id: number, corpo: ConsensoBody): Promise<void> {
    await this.exigirEtapa(id, 'consenso');
    await this.banco.transacao(async (tx) => {
      await this.gravarNotas(tx, id, 'consenso', corpo.notas);
    });
    if (corpo.concluir) await this.avancar(id, 'consenso', 'concluida');
  }

  private async exigirEtapa(id: number, etapa: EtapaAvaliacao) {
    const av = await this.banco.primeiro<{ colaborador_id: number; etapa: EtapaAvaliacao }>('SELECT colaborador_id, etapa FROM avaliacao WHERE id = $1', [id]);
    if (!av) throw new NotFoundException({ mensagem: 'Avaliação não encontrada' });
    if (av.etapa !== etapa) throw new ConflictException({ mensagem: 'A avaliação não está nesta etapa' });
    return av;
  }

  private async gravarNotas(tx: Executor, avaliacaoId: number, coluna: 'auto' | 'gestor' | 'consenso', notas: Nota[]) {
    for (const n of notas) {
      await tx.consultar(`UPDATE avaliacao_criterio SET ${coluna} = $3 WHERE id = $1 AND avaliacao_id = $2`, [n.criterioId, avaliacaoId, n.valor]);
    }
  }

  /** As notas já ficaram salvas como rascunho; só avança de etapa se tudo estiver preenchido. */
  private async avancar(avaliacaoId: number, coluna: 'auto' | 'gestor' | 'consenso', proxima: EtapaAvaliacao) {
    const faltando = await this.banco.primeiro<{ n: number }>(
      `SELECT count(*)::int AS n FROM avaliacao_criterio WHERE avaliacao_id = $1 AND ${coluna} IS NULL`,
      [avaliacaoId],
    );
    if (faltando && faltando.n > 0) {
      throw new ConflictException({
        mensagem: `Rascunho salvo, mas falta${faltando.n > 1 ? 'm' : ''} ${faltando.n} critério${faltando.n > 1 ? 's' : ''} para preencher`,
      });
    }
    await this.banco.consultar('UPDATE avaliacao SET etapa = $2 WHERE id = $1', [avaliacaoId, proxima]);
  }
}
