import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConclusaoDetalhe, Eficacia, Modalidade, Origem } from '@cestacorp/contracts';
import { Banco } from '../../../compartilhado/banco';
import { hoje, iso, isoDe, somarDias } from '../../../compartilhado/datas';
import { CatalogoApi } from '../../catalogo';
import { PdiApi } from '../../pdi';
import { garantirAcesso, PessoasApi, Usuario } from '../../pessoas';

export const DIAS_PARA_EFICACIA = 30;

interface Linha {
  id: number;
  colaborador_id: number;
  curso_id: number;
  origem: Origem;
  data_realizacao: Date;
  codigo_certificado: string;
  carga_horas: string;
  investimento: string;
  resumo: string;
  nota_conteudo: number;
  nota_didatica: number;
  nota_aplicabilidade: number;
  certificado_nome: string | null;
  certificado_arquivo: string | null;
  status: 'enviado' | 'devolvido' | 'concluido';
  enviado_em: Date;
  validado_em: Date | null;
  eficacia: Eficacia | null;
  motivo_devolucao: string | null;
  inscricao_id: number;
}

/** Casos de uso do gestor: conferir a conclusão, validar, devolver e avaliar a eficácia (30 dias depois). */
@Injectable()
export class ValidarConclusao {
  constructor(
    private readonly banco: Banco,
    private readonly pessoas: PessoasApi,
    private readonly catalogo: CatalogoApi,
    private readonly pdi: PdiApi,
  ) {}

  private async linha(id: number): Promise<Linha> {
    const l = await this.banco.primeiro<Linha>(
      `SELECT c.*, i.colaborador_id, i.curso_id, i.origem FROM conclusao c JOIN inscricao i ON i.id = c.inscricao_id WHERE c.id = $1`,
      [id],
    );
    if (!l) throw new NotFoundException({ mensagem: 'Conclusão não encontrada' });
    return l;
  }

  async detalhar(usuario: Usuario, id: number): Promise<ConclusaoDetalhe> {
    const l = await this.linha(id);
    garantirAcesso(usuario, l.colaborador_id);
    const curso = await this.catalogo.obter(l.curso_id);
    const dataRealizacao = isoDe(l.data_realizacao)!;
    const liberadaEm = somarDias(dataRealizacao, DIAS_PARA_EFICACIA);
    return {
      id: l.id,
      colaborador: await this.pessoas.referencia(l.colaborador_id),
      curso: {
        id: l.curso_id,
        nome: curso?.nome ?? '',
        competencia: curso?.competencia ?? '',
        entidade: curso?.entidade ?? '',
        modalidade: (curso?.modalidade ?? 'online') as Modalidade,
        link: curso?.link ?? '',
      },
      origem: l.origem,
      dataRealizacao,
      codigoCertificado: l.codigo_certificado,
      cargaHoras: Number(l.carga_horas),
      investimento: Number(l.investimento),
      resumo: l.resumo,
      notas: { conteudo: l.nota_conteudo, didatica: l.nota_didatica, aplicabilidade: l.nota_aplicabilidade },
      certificado: l.certificado_nome ? { nome: l.certificado_nome, url: `/api/conclusoes/${l.id}/certificado` } : null,
      status: l.status,
      enviadoEm: isoDe(l.enviado_em)!,
      validadoEm: isoDe(l.validado_em),
      eficacia: l.eficacia,
      eficaciaLiberadaEm: liberadaEm,
      eficaciaLiberada: liberadaEm <= iso(hoje()),
      motivoDevolucao: l.motivo_devolucao,
    };
  }

  async arquivoDoCertificado(usuario: Usuario, id: number): Promise<{ nome: string; arquivo: string } | null> {
    const l = await this.linha(id);
    garantirAcesso(usuario, l.colaborador_id);
    return l.certificado_arquivo ? { nome: l.certificado_nome ?? 'certificado', arquivo: l.certificado_arquivo } : null;
  }

  async validar(gestor: Usuario, id: number): Promise<void> {
    const l = await this.linha(id);
    if (l.status !== 'enviado') throw new ConflictException({ mensagem: 'Só é possível validar conclusões aguardando validação' });
    await this.banco.transacao(async (tx) => {
      await tx.consultar(`UPDATE conclusao SET status = 'concluido', validado_em = $2, validado_por = $3 WHERE id = $1`, [id, iso(hoje()), gestor.id]);
      await tx.consultar(`UPDATE inscricao SET status = 'concluido' WHERE id = $1`, [l.inscricao_id]);
    });
    if (l.origem === 'pdi' || l.origem === 'obrigatorio') await this.pdi.registrarCursoConcluido(l.colaborador_id, l.curso_id);
  }

  async devolver(id: number, motivo: string): Promise<void> {
    const l = await this.linha(id);
    if (l.status !== 'enviado') throw new ConflictException({ mensagem: 'Só é possível devolver conclusões aguardando validação' });
    await this.banco.transacao(async (tx) => {
      await tx.consultar(`UPDATE conclusao SET status = 'devolvido', motivo_devolucao = $2 WHERE id = $1`, [id, motivo]);
      await tx.consultar(`UPDATE inscricao SET status = 'devolvido' WHERE id = $1`, [l.inscricao_id]);
    });
  }

  async avaliarEficacia(id: number, eficacia: Eficacia): Promise<void> {
    const l = await this.linha(id);
    if (l.status !== 'concluido') throw new ConflictException({ mensagem: 'Valide a conclusão antes de avaliar a eficácia' });
    const liberadaEm = somarDias(isoDe(l.data_realizacao)!, DIAS_PARA_EFICACIA);
    if (liberadaEm > iso(hoje())) {
      throw new ConflictException({ mensagem: `A eficácia pode ser avaliada a partir de ${liberadaEm.split('-').reverse().join('/')}` });
    }
    await this.banco.consultar('UPDATE conclusao SET eficacia = $2 WHERE id = $1', [id, eficacia]);
  }
}
