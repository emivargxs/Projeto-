import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { NovaAcaoBody } from '@cestacorp/contracts';
import { Banco } from '../../../compartilhado/banco';
import { CatalogoApi } from '../../catalogo';
import { garantirAcesso, PessoasApi, Usuario } from '../../pessoas';
import { cicloAtual } from '../pdi.api';

/** Casos de uso: criar o PDI do ciclo, adicionar ações e registrar o acompanhamento (progresso). */
@Injectable()
export class EditarPdi {
  constructor(
    private readonly banco: Banco,
    private readonly pessoas: PessoasApi,
    private readonly catalogo: CatalogoApi,
  ) {}

  async criar(colaboradorId: number): Promise<void> {
    if (!(await this.pessoas.obter(colaboradorId))) throw new NotFoundException({ mensagem: 'Colaborador não encontrado' });
    const ciclo = cicloAtual();
    const existente = await this.banco.primeiro('SELECT id FROM pdi WHERE colaborador_id = $1 AND ciclo = $2', [colaboradorId, ciclo]);
    if (existente) throw new ConflictException({ mensagem: 'Este colaborador já tem PDI neste ciclo' });
    await this.banco.consultar('INSERT INTO pdi (colaborador_id, ciclo, inicio, fim) VALUES ($1, $2, $3, $4)', [
      colaboradorId, ciclo, `${ciclo}-01-01`, `${ciclo}-12-31`,
    ]);
  }

  async adicionarAcao(usuario: Usuario, pdiId: number, corpo: ReturnType<typeof NovaAcaoBody.parse>): Promise<void> {
    const pdi = await this.obterPdi(pdiId);
    garantirAcesso(usuario, pdi.colaborador_id);
    if (corpo.cursoId && !(await this.catalogo.obter(corpo.cursoId))) throw new NotFoundException({ mensagem: 'Curso não encontrado' });
    await this.banco.consultar(
      'INSERT INTO pdi_acao (pdi_id, o_que_fazer, como_fazer, responsavel, prazo, curso_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [pdiId, corpo.oQueFazer, corpo.comoFazer, corpo.responsavel, corpo.prazo, corpo.cursoId],
    );
  }

  async atualizarProgresso(usuario: Usuario, acaoId: number, progresso: number): Promise<void> {
    const acao = await this.banco.primeiro<{ colaborador_id: number; curso_id: number | null }>(
      'SELECT p.colaborador_id, a.curso_id FROM pdi_acao a JOIN pdi p ON p.id = a.pdi_id WHERE a.id = $1', [acaoId]);
    if (!acao) throw new NotFoundException({ mensagem: 'Ação não encontrada' });
    garantirAcesso(usuario, acao.colaborador_id);
    if (acao.curso_id) {
      throw new ConflictException({ mensagem: 'Ações de curso são concluídas quando o gestor valida o certificado' });
    }
    await this.banco.consultar('UPDATE pdi_acao SET progresso = $2 WHERE id = $1', [acaoId, progresso]);
  }

  private async obterPdi(id: number) {
    const pdi = await this.banco.primeiro<{ colaborador_id: number }>('SELECT colaborador_id FROM pdi WHERE id = $1', [id]);
    if (!pdi) throw new NotFoundException({ mensagem: 'PDI não encontrado' });
    return pdi;
  }
}
