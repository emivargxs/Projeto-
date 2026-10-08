import {
  Avaliacao,
  AvaliacaoOuNada,
  Escala,
  ESCALA_ROTULO,
  ETAPA_ROTULO,
  EtapaAvaliacao,
  GrupoCriterio,
  ListaAvaliacoes,
  Resultado,
} from '@cestacorp/contracts';
import { Check } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../compartilhado/api';
import { useSessao } from '../../compartilhado/sessao';
import { Aviso, Botao, Campo, Card, Duas, Erro, Estado, Pagina, Selo } from '../../compartilhado/ui';
import { useAcao, useDados } from '../../compartilhado/use-dados';

const ETAPAS: EtapaAvaliacao[] = ['autoavaliacao', 'avaliacao_gestor', 'consenso', 'concluida'];
const GRUPOS: GrupoCriterio[] = ['conhecimentos', 'habilidades', 'atitudes'];
const ESCALA: Escala[] = ['nao_atende', 'atende_parcialmente', 'atende_plenamente', 'supera'];
const CURTO: Record<Escala, string> = { nao_atende: 'Não atende', atende_parcialmente: 'Parcialmente', atende_plenamente: 'Plenamente', supera: 'Supera' };

function Etapas({ atual }: { atual: EtapaAvaliacao }) {
  const indice = ETAPAS.indexOf(atual);
  return (
    <div className="etapas">
      {ETAPAS.map((e, i) => (
        <div key={e} className={`etapa ${i < indice || atual === 'concluida' ? 'feita' : i === indice ? 'atual' : ''}`}>
          <span className="etapa-numero">{i < indice || atual === 'concluida' ? <Check size={12} /> : i + 1}</span>
          <strong>{ETAPA_ROTULO[e]}</strong>
        </div>
      ))}
    </div>
  );
}

type Coluna = 'auto' | 'gestor' | 'consenso';

/** Tabela de critérios: uma coluna editável (a da etapa atual) e as demais só leitura. */
function Criterios({ avaliacao, editar, notas, mudar, mostrar }: {
  avaliacao: Avaliacao;
  editar: Coluna | null;
  notas: Record<number, Escala | null>;
  mudar: (criterioId: number, valor: Escala) => void;
  mostrar: Coluna[];
}) {
  const titulos: Record<Coluna, string> = { auto: 'Autoavaliação', gestor: 'Avaliação do gestor', consenso: 'Consenso' };
  return (
    <table className="tabela">
      <thead>
        <tr>
          <th>Critério</th>
          {mostrar.map((c) => <th key={c}>{titulos[c]}</th>)}
          {editar && <th>{titulos[editar]}</th>}
        </tr>
      </thead>
      <tbody>
        {GRUPOS.map((g) => (
          <Fragment key={g}>
            <tr className="grupo-criterio"><td colSpan={4}>{g}</td></tr>
            {avaliacao.criterios.filter((c) => c.grupo === g).map((c) => (
              <tr key={c.id}>
                <td>
                  {c.texto}
                  {editar === 'consenso' && c.auto !== c.gestor && <small className="tom-ambar">Divergência entre autoavaliação e gestor</small>}
                </td>
                {mostrar.map((col) => (
                  <td key={col}>{c[col] ? <Selo tom={col === 'consenso' ? 'azul' : 'cinza'}>{CURTO[c[col]!]}</Selo> : <small>—</small>}</td>
                ))}
                {editar && (
                  <td>
                    <div className="opcoes">
                      {ESCALA.map((v) => (
                        <button key={v} type="button" className={`opcao ${notas[c.id] === v ? 'marcada' : ''}`} onClick={() => mudar(c.id, v)} title={ESCALA_ROTULO[v]}>
                          {CURTO[v]}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}

function ResultadosEsperados({ resultados, editavel, aoMudar }: { resultados: Resultado[]; editavel: boolean; aoMudar?: (r: Resultado[]) => void }) {
  const mudar = (id: number, campo: keyof Resultado, valor: string | boolean) =>
    aoMudar?.(resultados.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)));
  return (
    <table className="tabela">
      <thead><tr><th>Indicador</th><th>Meta</th><th>Realizado</th><th>Situação</th></tr></thead>
      <tbody>
        {resultados.map((r) => (
          <tr key={r.id}>
            <td>{r.indicador}</td>
            <td>{editavel ? <input className="entrada" style={{ width: 80 }} value={r.meta} onChange={(e) => mudar(r.id, 'meta', e.target.value)} /> : r.meta || '—'}</td>
            <td>{editavel ? <input className="entrada" style={{ width: 80 }} value={r.realizado} onChange={(e) => mudar(r.id, 'realizado', e.target.value)} /> : <strong>{r.realizado || '—'}</strong>}</td>
            <td>
              {editavel ? (
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="checkbox" checked={r.atingido} onChange={(e) => mudar(r.id, 'atingido', e.target.checked)} /> Atingido
                </label>
              ) : r.meta ? (
                <Selo tom={r.atingido ? 'verde' : 'ambar'}>{r.atingido ? 'Atingido' : 'Abaixo da meta'}</Selo>
              ) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const notasIniciais = (a: Avaliacao, coluna: Coluna) =>
  Object.fromEntries(a.criterios.map((c) => [c.id, c[coluna] ?? (coluna === 'consenso' && c.auto === c.gestor ? c.auto : null)]));

/** Caso de uso (colaborador): fazer a autoavaliação e registrar objetivos dos próximos 5 anos. */
export function AutoavaliacaoPagina() {
  const { dados, erro, carregando, recarregar } = useDados(() => api.get('/avaliacoes/minha', AvaliacaoOuNada));
  const [notas, setNotas] = useState<Record<number, Escala | null>>({});
  const [objetivos, setObjetivos] = useState('');
  const [comentario, setComentario] = useState('');
  const acao = useAcao();
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (!dados) return;
    setNotas(notasIniciais(dados, 'auto'));
    setObjetivos(dados.objetivos5Anos);
    setComentario(dados.comentarioResultados);
  }, [dados]);

  const editavel = dados?.etapa === 'autoavaliacao';
  const salvar = (enviar: boolean) =>
    acao.executar(() =>
      api.put(`/avaliacoes/${dados!.id}/autoavaliacao`, {
        notas: Object.entries(notas).filter(([, v]) => v).map(([criterioId, valor]) => ({ criterioId: Number(criterioId), valor })),
        objetivos5Anos: objetivos,
        comentarioResultados: comentario,
        enviar,
      }),
    ).then((ok) => {
      setSalvo(ok);
      if (ok) recarregar();
    });

  const faltam = dados ? dados.criterios.filter((c) => !notas[c.id]).length : 0;

  return (
    <Pagina
      contexto={`Avaliação de desempenho anual · ciclo ${dados?.ciclo ?? ''}`}
      titulo="Minha autoavaliação"
      descricao="Avalie seu ano nos critérios do cargo antes da conversa de consenso."
      acoes={editavel && (
        <>
          <Botao variante="secundario" onClick={() => salvar(false)} carregando={acao.enviando}>Salvar rascunho</Botao>
          <Botao onClick={() => salvar(true)} carregando={acao.enviando}>Enviar autoavaliação</Botao>
        </>
      )}
    >
      <Estado carregando={carregando} erro={erro} vazio={!dados && 'Seu gestor ainda não abriu a avaliação deste ciclo.'}>
        {dados && (
          <>
            <Etapas atual={dados.etapa} />
            <Erro mensagem={acao.erro} />
            {salvo && !acao.erro && <Aviso tom="verde" titulo="Salvo" />}
            <Card titulo={`Critérios do meu cargo · ${dados.colaborador.cargoNome}`} subtitulo={editavel ? 'Escolha o nível que melhor descreve seu ano. A avaliação do gestor só aparece no consenso.' : 'Sua autoavaliação já foi enviada.'}>
              <Criterios
                avaliacao={dados}
                editar={editavel ? 'auto' : null}
                notas={notas}
                mudar={(id, v) => setNotas((n) => ({ ...n, [id]: v }))}
                mostrar={editavel ? [] : dados.etapa === 'avaliacao_gestor' ? ['auto'] : ['auto', 'gestor', 'consenso']}
              />
              {editavel && faltam > 0 && <Aviso>Falta{faltam > 1 ? 'm' : ''} {faltam} critério{faltam > 1 ? 's' : ''}. Você pode salvar o rascunho e voltar depois.</Aviso>}
            </Card>
            <Duas lateral={400}>
              <Card titulo="Resultados esperados" subtitulo="Indicadores do seu cargo · meta x realizado no ano">
                <ResultadosEsperados resultados={dados.resultados} editavel={false} />
                <Campo rotulo="Meu comentário sobre os resultados">
                  <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} disabled={!editavel} />
                </Campo>
              </Card>
              <Card titulo="Meus objetivos profissionais" subtitulo="Onde você quer estar daqui a 5 anos">
                <textarea className="entrada" style={{ minHeight: 120 }} value={objetivos} onChange={(e) => setObjetivos(e.target.value)} disabled={!editavel} />
                <small style={{ color: 'var(--suave)' }}>Seus objetivos e os critérios abaixo de "Atende plenamente" viram sugestões para o seu PDI.</small>
              </Card>
            </Duas>
          </>
        )}
      </Estado>
    </Pagina>
  );
}

/** Caso de uso (gestor): acompanhar as avaliações do ciclo e abrir as que faltam. */
export function AvaliacoesPagina() {
  const { usuarios } = useSessao();
  const { dados, erro, carregando, recarregar } = useDados(() => api.get('/avaliacoes', ListaAvaliacoes));
  const acao = useAcao();
  const semAvaliacao = usuarios.filter((u) => u.perfil === 'colaborador' && !dados?.some((a) => a.colaborador.id === u.id));
  const abrir = (id: number) => acao.executar(() => api.post(`/avaliacoes/colaborador/${id}`)).then((ok) => ok && recarregar());

  return (
    <Pagina contexto="Avaliação de desempenho anual" titulo="Avaliação anual" descricao="Autoavaliação, avaliação do gestor e consenso de cada colaborador.">
      <Estado carregando={carregando} erro={erro}>
        <Duas>
          <Card titulo="Avaliações do ciclo" subtitulo="Clique para continuar a avaliação">
            <table className="tabela">
              <thead><tr><th>Colaborador</th><th>Etapa</th><th>Divergências</th><th /></tr></thead>
              <tbody>
                {dados?.map((a) => (
                  <tr key={a.id}>
                    <td>{a.colaborador.nome}<small>{a.colaborador.cargoNome}</small></td>
                    <td><Selo tom={a.etapa === 'concluida' ? 'verde' : 'azul'}>{ETAPA_ROTULO[a.etapa]}</Selo></td>
                    <td>{a.divergencias > 0 ? <Selo tom="ambar">{a.divergencias}</Selo> : '—'}</td>
                    <td style={{ textAlign: 'right' }}><Link to={`/avaliacoes/${a.id}`} style={{ fontWeight: 600 }}>Abrir →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card titulo="Sem avaliação no ciclo" subtitulo="Abrir cria os critérios a partir da descrição do cargo">
            {semAvaliacao.map((u) => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{u.nome}<small style={{ display: 'block', color: 'var(--suave)' }}>{u.cargoNome}</small></span>
                <Botao variante="link" onClick={() => abrir(u.id)}>Abrir avaliação</Botao>
              </div>
            ))}
            {semAvaliacao.length === 0 && <small>Todos já têm avaliação.</small>}
            <Erro mensagem={acao.erro} />
          </Card>
        </Duas>
      </Estado>
    </Pagina>
  );
}

/** Caso de uso (gestor): avaliar o colaborador e registrar o consenso. */
export function AvaliacaoDoColaboradorPagina() {
  const id = Number(useParams().id);
  const { dados, erro, carregando, recarregar } = useDados(() => api.get(`/avaliacoes/${id}`, Avaliacao), [id]);
  const [notas, setNotas] = useState<Record<number, Escala | null>>({});
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const acao = useAcao();

  const coluna: Coluna | null = dados?.etapa === 'avaliacao_gestor' ? 'gestor' : dados?.etapa === 'consenso' ? 'consenso' : null;
  useEffect(() => {
    if (!dados) return;
    if (coluna) setNotas(notasIniciais(dados, coluna));
    setResultados(dados.resultados);
  }, [dados, coluna]);

  const lista = () => Object.entries(notas).filter(([, v]) => v).map(([criterioId, valor]) => ({ criterioId: Number(criterioId), valor }));
  const salvar = (avancar: boolean) =>
    acao.executar(() =>
      coluna === 'gestor'
        ? api.put(`/avaliacoes/${id}/gestor`, { notas: lista(), resultados, enviar: avancar })
        : api.put(`/avaliacoes/${id}/consenso`, { notas: lista(), concluir: avancar }),
    ).then((ok) => ok && recarregar());

  return (
    <Pagina
      contexto={`Avaliação de desempenho anual · ciclo ${dados?.ciclo ?? ''}`}
      titulo={dados ? `Avaliação de ${dados.colaborador.nome}` : 'Avaliação'}
      descricao="Compare autoavaliação e avaliação do gestor e registre o consenso."
      acoes={coluna && (
        <>
          <Botao variante="secundario" onClick={() => salvar(false)} carregando={acao.enviando}>Salvar rascunho</Botao>
          <Botao onClick={() => salvar(true)} carregando={acao.enviando}>{coluna === 'gestor' ? 'Enviar para consenso' : 'Concluir consenso'}</Botao>
        </>
      )}
    >
      <Estado carregando={carregando} erro={erro}>
        {dados && (
          <>
            <Etapas atual={dados.etapa} />
            <Erro mensagem={acao.erro} />
            {dados.etapa === 'autoavaliacao' && <Aviso tom="ambar">Aguardando a autoavaliação de {dados.colaborador.nome.split(' ')[0]}.</Aviso>}
            <Card titulo={`Critérios do cargo · ${dados.colaborador.cargoNome}`} subtitulo="Escala: não atende · atende parcialmente · atende plenamente · supera as expectativas">
              <Criterios
                avaliacao={dados}
                editar={coluna}
                notas={notas}
                mudar={(cid, v) => setNotas((n) => ({ ...n, [cid]: v }))}
                mostrar={coluna === 'gestor' ? ['auto'] : coluna === 'consenso' ? ['auto', 'gestor'] : ['auto', 'gestor', 'consenso']}
              />
            </Card>
            <Duas lateral={400}>
              <Card titulo="Resultados esperados" subtitulo="Indicadores do cargo · meta x realizado no ano">
                <ResultadosEsperados resultados={resultados} editavel={coluna === 'gestor'} aoMudar={setResultados} />
                {dados.comentarioResultados && <Aviso titulo="Comentário do colaborador">{dados.comentarioResultados}</Aviso>}
              </Card>
              <Card titulo="Objetivos profissionais" subtitulo="Para os próximos 5 anos, nas palavras do colaborador">
                <div className="entrada" style={{ minHeight: 80 }}>{dados.objetivos5Anos || '—'}</div>
                {dados.etapa === 'concluida' && <Link to="/pdi"><Botao style={{ width: '100%' }}>Ir para o PDI</Botao></Link>}
              </Card>
            </Duas>
          </>
        )}
      </Estado>
    </Pagina>
  );
}
