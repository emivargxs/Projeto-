import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Origem, RegistrarConclusaoBody } from '@cestacorp/contracts';
import { Banco } from '../../../compartilhado/banco';
import { hoje, iso } from '../../../compartilhado/datas';
import { CatalogoApi } from '../../catalogo';
import { Usuario } from '../../pessoas';
import { CalculoDaSituacao } from '../situacao';

export interface ArquivoEnviado {
  nomeOriginal: string;
  nomeSalvo: string;
}

/**
 * Casos de uso do colaborador sobre um curso: começar (acessar) e registrar a conclusão
 * com certificado, resumo do que aprendeu e avaliação da qualidade do treinamento.
 */
@Injectable()
export class RegistrarConclusao {
  constructor(
    private readonly banco: Banco,
    private readonly calculo: CalculoDaSituacao,
    private readonly catalogo: CatalogoApi,
  ) {}

  private async origemDoCurso(usuario: Usuario, cursoId: number): Promise<Origem> {
    const s = await this.calculo.de(usuario);
    return s.treinamentos.find((t) => t.cursoId === cursoId)?.origem ?? 'livre';
  }

  async iniciar(usuario: Usuario, cursoId: number): Promise<void> {
    if (!(await this.catalogo.obter(cursoId))) throw new NotFoundException({ mensagem: 'Curso não encontrado' });
    const origem = await this.origemDoCurso(usuario, cursoId);
    await this.banco.consultar(
      `INSERT INTO inscricao (colaborador_id, curso_id, origem, iniciada_em) VALUES ($1, $2, $3, $4)
       ON CONFLICT (colaborador_id, curso_id) DO NOTHING`,
      [usuario.id, cursoId, origem, iso(hoje())],
    );
  }

  async executar(usuario: Usuario, cursoId: number, corpo: RegistrarConclusaoBody, arquivo: ArquivoEnviado | null): Promise<{ conclusaoId: number }> {
    if (corpo.dataRealizacao > iso(hoje())) throw new BadRequestException({ mensagem: 'A data de realização não pode estar no futuro' });
    await this.iniciar(usuario, cursoId);

    return this.banco.transacao(async (tx) => {
      const insc = await tx.primeiro<{ id: number; status: string }>(
        'SELECT id, status FROM inscricao WHERE colaborador_id = $1 AND curso_id = $2 FOR UPDATE',
        [usuario.id, cursoId],
      );
      if (!insc) throw new NotFoundException({ mensagem: 'Inscrição não encontrada' });
      if (insc.status === 'enviado' || insc.status === 'concluido') {
        throw new ConflictException({ mensagem: 'Este curso já foi enviado para validação' });
      }
      const anterior = await tx.primeiro<{ id: number }>('SELECT id FROM conclusao WHERE inscricao_id = $1', [insc.id]);
      if (!anterior && !arquivo) throw new BadRequestException({ mensagem: 'Anexe o certificado do curso' });

      const valores = [
        corpo.dataRealizacao, corpo.codigoCertificado, corpo.cargaHoras, corpo.investimento, corpo.resumo,
        corpo.notaConteudo, corpo.notaDidatica, corpo.notaAplicabilidade, iso(hoje()),
      ];
      let conclusaoId: number;
      if (anterior) {
        await tx.consultar(
          `UPDATE conclusao SET data_realizacao = $2, codigo_certificado = $3, carga_horas = $4, investimento = $5, resumo = $6,
                  nota_conteudo = $7, nota_didatica = $8, nota_aplicabilidade = $9, enviado_em = $10, status = 'enviado',
                  motivo_devolucao = NULL,
                  certificado_nome = COALESCE($11, certificado_nome), certificado_arquivo = COALESCE($12, certificado_arquivo)
            WHERE id = $1`,
          [anterior.id, ...valores, arquivo?.nomeOriginal ?? null, arquivo?.nomeSalvo ?? null],
        );
        conclusaoId = anterior.id;
      } else {
        const nova = await tx.primeiro<{ id: number }>(
          `INSERT INTO conclusao (inscricao_id, data_realizacao, codigo_certificado, carga_horas, investimento, resumo,
                                  nota_conteudo, nota_didatica, nota_aplicabilidade, enviado_em, status, certificado_nome, certificado_arquivo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'enviado', $11, $12) RETURNING id`,
          [insc.id, ...valores, arquivo!.nomeOriginal, arquivo!.nomeSalvo],
        );
        conclusaoId = nova!.id;
      }
      await tx.consultar(`UPDATE inscricao SET status = 'enviado' WHERE id = $1`, [insc.id]);
      return { conclusaoId };
    });
  }
}
