import { ConclusaoDetalhe, Eficacia, EFICACIA_ROTULO, MODALIDADE_ROTULO } from '@cestacorp/contracts';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../compartilhado/api';
import { data, horas, moeda } from '../../compartilhado/formatos';
import { useSessao } from '../../compartilhado/sessao';
import { Aviso, Botao, Campo, Card, Duas, Erro, Estado, Pagina, Selo } from '../../compartilhado/ui';
import { useAcao, useDados } from '../../compartilhado/use-dados';

const ROTULO_NOTA = [
  { chave: 'conteudo', rotulo: 'Conteúdo' },
  { chave: 'didatica', rotulo: 'Didática do instrutor' },
  { chave: 'aplicabilidade', rotulo: 'Aplicabilidade na rotina' },
] as const;

/**
 * Caso de uso (gestor): conferir o certificado e o resumo, validar ou devolver,
 * e avaliar a eficácia 30 dias depois. O colaborador vê a mesma tela, só leitura.
 */
export function ConclusaoPagina() {
  const id = Number(useParams().id);
  const navegar = useNavigate();
  const { usuario } = useSessao();
  const gestor = usuario?.perfil === 'gestor';
  const { dados, erro, carregando, recarregar } = useDados(() => api.get(`/conclusoes/${id}`, ConclusaoDetalhe), [id]);
  const [motivo, setMotivo] = useState('');
  const [devolvendo, setDevolvendo] = useState(false);
  const [eficacia, setEficacia] = useState<Eficacia | null>(null);
  const acao = useAcao();
  const voltar = gestor ? '/trilhas' : '/minha-trilha';

  const validar = () => acao.executar(() => api.post(`/conclusoes/${id}/validar`)).then((ok) => ok && recarregar());
  const devolver = () => acao.executar(() => api.post(`/conclusoes/${id}/devolver`, { motivo })).then((ok) => ok && navegar('/trilhas'));
  const salvarEficacia = () => acao.executar(() => api.post(`/conclusoes/${id}/eficacia`, { eficacia })).then((ok) => ok && recarregar());

  return (
    <Pagina
      contexto={gestor ? 'Trilhas da equipe · validar conclusão' : 'Minha trilha · comprovante'}
      titulo={dados ? `${dados.curso.nome} · ${dados.colaborador.nome}` : 'Conclusão'}
      descricao={gestor ? 'Confira o certificado e o resumo e avalie a eficácia do treinamento.' : 'Comprovante enviado e situação da validação.'}
      acoes={<Link to={voltar}><Botao variante="secundario">Voltar</Botao></Link>}
    >
      <Estado carregando={carregando} erro={erro}>
        {dados && (
          <Duas>
            <Card titulo="Comprovação" subtitulo={`Enviado por ${dados.colaborador.nome} em ${data(dados.enviadoEm)}`}>
              <div className="arquivo">
                <span className="icone-arquivo">PDF</span>
                <span style={{ flex: 1 }}>
                  <strong>{dados.certificado?.nome ?? 'Sem arquivo'}</strong>
                  <small style={{ display: 'block', color: 'var(--suave)' }}>
                    {dados.curso.entidade} · {MODALIDADE_ROTULO[dados.curso.modalidade]}
                  </small>
                </span>
                {dados.certificado && (
                  <Botao variante="link" onClick={() => api.abrirArquivo(dados.certificado!.url.replace('/api', ''))}>Abrir certificado ↗</Botao>
                )}
              </div>
              <table className="tabela">
                <tbody>
                  <tr><td>Código do certificado</td><td><strong>{dados.codigoCertificado}</strong></td></tr>
                  <tr><td>Data de realização</td><td><strong>{data(dados.dataRealizacao)}</strong></td></tr>
                  <tr><td>Carga horária</td><td><strong>{horas(dados.cargaHoras)}</strong></td></tr>
                  <tr><td>Investimento</td><td><strong>{moeda(dados.investimento)}</strong></td></tr>
                  <tr><td>Origem</td><td><Selo>{dados.origem === 'pdi' ? 'Trilha do PDI' : dados.origem === 'obrigatorio' ? 'Trilha obrigatória' : 'Livre'}</Selo></td></tr>
                </tbody>
              </table>
              <Campo rotulo={`Resumo do que ${dados.colaborador.nome.split(' ')[0]} aprendeu`}>
                <div className="entrada" style={{ minHeight: 70 }}>{dados.resumo}</div>
              </Campo>
            </Card>

            <Card titulo="Avaliação e validação" subtitulo="Qualidade avaliada pelo colaborador e eficácia avaliada pelo gestor">
              <span className="contexto tom-azul" style={{ fontWeight: 600 }}>Qualidade · avaliada pelo colaborador</span>
              {ROTULO_NOTA.map((n) => (
                <div key={n.chave} className="linha-nota">
                  <span>{n.rotulo}</span>
                  <div className="notas">
                    {[1, 2, 3, 4, 5].map((v) => <span key={v} className={`nota ${dados.notas[n.chave] >= v ? 'marcada' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{v}</span>)}
                  </div>
                </div>
              ))}

              <span className="contexto tom-verde" style={{ fontWeight: 600, marginTop: 8 }}>Eficácia · avaliada pelo gestor</span>
              {dados.eficacia ? (
                <Selo tom="verde">{EFICACIA_ROTULO[dados.eficacia]}</Selo>
              ) : dados.status === 'concluido' && dados.eficaciaLiberada && gestor ? (
                <>
                  <div className="opcoes">
                    {(Object.keys(EFICACIA_ROTULO) as Eficacia[]).map((e) => (
                      <button key={e} type="button" className={`opcao ${eficacia === e ? 'marcada' : ''}`} onClick={() => setEficacia(e)}>{EFICACIA_ROTULO[e]}</button>
                    ))}
                  </div>
                  <Botao onClick={salvarEficacia} disabled={!eficacia} carregando={acao.enviando}>Registrar eficácia</Botao>
                </>
              ) : (
                <small style={{ color: 'var(--suave)' }}>Liberada em {data(dados.eficaciaLiberadaEm)}, 30 dias após a conclusão.</small>
              )}

              {dados.status === 'enviado' && gestor && (
                <>
                  <Aviso>Ao validar, as {horas(dados.cargaHoras)} entram nas horas de {dados.colaborador.nome.split(' ')[0]} e o curso conta na trilha.</Aviso>
                  {devolvendo ? (
                    <>
                      <Campo rotulo="O que precisa ser ajustado?">
                        <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: o certificado está ilegível" />
                      </Campo>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <Botao variante="secundario" onClick={() => setDevolvendo(false)}>Cancelar</Botao>
                        <Botao onClick={devolver} carregando={acao.enviando} style={{ flex: 1 }}>Devolver para ajuste</Botao>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Botao variante="secundario" onClick={() => setDevolvendo(true)}>Devolver para ajuste</Botao>
                      <Botao onClick={validar} carregando={acao.enviando} style={{ flex: 1 }}>Validar conclusão</Botao>
                    </div>
                  )}
                </>
              )}
              {dados.status === 'enviado' && !gestor && <Aviso tom="ambar">Aguardando a validação do gestor.</Aviso>}
              {dados.status === 'concluido' && <Aviso tom="verde">Validado em {data(dados.validadoEm)}.</Aviso>}
              {dados.status === 'devolvido' && <Aviso tom="vermelho" titulo="Devolvido para ajuste">{dados.motivoDevolucao}</Aviso>}
              <Erro mensagem={acao.erro} />
            </Card>
          </Duas>
        )}
      </Estado>
    </Pagina>
  );
}
