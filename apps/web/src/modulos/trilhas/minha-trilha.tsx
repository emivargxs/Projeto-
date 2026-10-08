import { MinhaTrilha, MODALIDADE_ROTULO, Origem, STATUS_ROTULO, StatusTreinamento, Treinamento } from '@cestacorp/contracts';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../compartilhado/api';
import { data, horas } from '../../compartilhado/formatos';
import { Aviso, Botao, Card, Duas, Erro, Estado, Grade, Kpi, Pagina, Selo, Tom } from '../../compartilhado/ui';
import { useAcao, useDados } from '../../compartilhado/use-dados';
import { KpiDePins, MeusPinsCard, RankingDoTimeCard } from '../gamificacao';
import { MinhasHorasMesAMes } from '../indicadores';

const ORIGEM: Record<Origem, { rotulo: string; tom: Tom }> = {
  obrigatorio: { rotulo: 'Obrigatório', tom: 'azul' },
  pdi: { rotulo: 'PDI', tom: 'verde' },
  livre: { rotulo: 'Livre', tom: 'cinza' },
};

const TOM_STATUS: Record<StatusTreinamento, Tom> = {
  nao_iniciado: 'cinza',
  em_andamento: 'azul',
  enviado: 'ambar',
  devolvido: 'vermelho',
  concluido: 'verde',
};

/** Caso de uso (colaborador): ver minha trilha, o aviso de atraso, meus pins e o ranking. */
export function MinhaTrilhaPagina() {
  const navegar = useNavigate();
  const { dados, erro, carregando, recarregar } = useDados(() => api.get('/trilhas/minha', MinhaTrilha));
  const acao = useAcao();

  const acessar = async (t: Treinamento) => {
    if (t.link) window.open(t.link, '_blank', 'noopener');
    if (t.status === 'nao_iniciado') {
      const ok = await acao.executar(() => api.post(`/trilhas/cursos/${t.cursoId}/iniciar`));
      if (ok) recarregar();
    }
  };

  const acoes = (t: Treinamento) => {
    switch (t.status) {
      case 'nao_iniciado':
        return <Botao variante="link" onClick={() => acessar(t)}>Acessar curso <ExternalLink size={11} /></Botao>;
      case 'em_andamento':
        return (
          <span style={{ display: 'flex', gap: 8 }}>
            <Botao variante="link" onClick={() => acessar(t)}>Acessar <ExternalLink size={11} /></Botao>·
            <Botao variante="link" onClick={() => navegar(`/minha-trilha/cursos/${t.cursoId}/concluir`)}>Concluir</Botao>
          </span>
        );
      case 'devolvido':
        return <Botao variante="link" onClick={() => navegar(`/minha-trilha/cursos/${t.cursoId}/concluir`)}>Ajustar e reenviar</Botao>;
      case 'enviado':
        return <small>Aguardando o gestor</small>;
      case 'concluido':
        return <Botao variante="link" onClick={() => navegar(`/conclusoes/${t.conclusaoId}`)}>Ver comprovante</Botao>;
    }
  };

  return (
    <Pagina
      contexto={`Meu aprendizado · ${dados?.colaborador.cargoNome ?? ''}`}
      titulo="Minha trilha"
      descricao="Seus treinamentos obrigatórios e do PDI, com horas e conquistas do ano."
    >
      <Estado carregando={carregando} erro={erro}>
        {dados && (
          <>
            {dados.aviso.atrasado ? (
              <Aviso tom="ambar" titulo={`Você está ${dados.aviso.percentualAtraso}% atrasado(a) nos treinamentos de ${dados.aviso.mesRotulo.split(' ')[0]}`}>
                Hoje é dia {dados.aviso.dia}: até agora o esperado era {horas(dados.aviso.esperadoAteHoje)} das {horas(dados.aviso.metaMes)} previstas no mês,
                e você realizou {horas(dados.aviso.realizadoNoMes)}.
              </Aviso>
            ) : (
              <Aviso tom="verde" titulo="Você está em dia com as horas do mês">
                {horas(dados.aviso.realizadoNoMes)} realizadas de {horas(dados.aviso.metaMes)} previstas em {dados.aviso.mesRotulo}.
              </Aviso>
            )}
            <Grade>
              <Kpi rotulo="Trilha obrigatória" valor={`${dados.obrigatoria.percentual}%`} progresso={dados.obrigatoria.percentual} rodape={`${dados.obrigatoria.concluidos} de ${dados.obrigatoria.total} cursos do cargo`} />
              <Kpi rotulo="Trilha do PDI" valor={`${dados.pdi.percentual}%`} tom="verde" progresso={dados.pdi.percentual} rodape={dados.pdi.total ? `${dados.pdi.concluidos} de ${dados.pdi.total} ações concluídas` : 'Sem PDI ativo'} />
              <Kpi rotulo="Horas no ano" valor={horas(dados.horasAno)} progresso={(dados.horasAno / Math.max(dados.metaAno, 1)) * 100} rodape={`Meta anual: ${horas(dados.metaAno)}`} />
              <KpiDePins />
            </Grade>
            <Erro mensagem={acao.erro} />
            <Duas>
              <Card titulo="Meus treinamentos" subtitulo="Cursos externos da trilha do cargo e do PDI">
                <table className="tabela">
                  <thead>
                    <tr><th>Curso / competência</th><th>Origem</th><th>Entidade · modalidade</th><th>Carga</th><th>Prazo</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {dados.treinamentos.map((t) => {
                      const vencido = t.vencido;
                      return (
                        <tr key={t.cursoId}>
                          <td>{t.curso}<small>{t.competencia}</small></td>
                          <td><Selo tom={ORIGEM[t.origem].tom}>{ORIGEM[t.origem].rotulo}</Selo></td>
                          <td>{t.entidade} · {MODALIDADE_ROTULO[t.modalidade]}</td>
                          <td>{horas(t.cargaHoras)}</td>
                          <td className={vencido ? 'tom-vermelho' : ''}>{t.prazo ? data(t.prazo, false) : '—'}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                              <Selo tom={vencido ? 'vermelho' : TOM_STATUS[t.status]}>{vencido ? 'Vencido' : STATUS_ROTULO[t.status]}</Selo>
                              {t.motivoDevolucao && <small className="tom-vermelho">{t.motivoDevolucao}</small>}
                              {acoes(t)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
              <div className="pilha">
                <RankingDoTimeCard />
                <MeusPinsCard />
              </div>
            </Duas>
            <MinhasHorasMesAMes />
          </>
        )}
      </Estado>
    </Pagina>
  );
}
