import { ListaCursos, NovaAcaoBody, PdiOuNada, SituacaoAcao } from '@cestacorp/contracts';
import { Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { api } from '../../compartilhado/api';
import { data } from '../../compartilhado/formatos';
import { useSessao } from '../../compartilhado/sessao';
import { Aviso, Barra, Botao, Campo, Card, Erro, Estado, Pagina, Pessoa, Selo, Tom } from '../../compartilhado/ui';
import { useAcao, useDados } from '../../compartilhado/use-dados';

const SITUACAO: Record<SituacaoAcao, { rotulo: string; tom: Tom }> = {
  em_andamento: { rotulo: 'Em andamento', tom: 'azul' },
  concluida: { rotulo: 'Concluída', tom: 'verde' },
  atrasada: { rotulo: 'Atrasada', tom: 'vermelho' },
};

function NovaAcao({ pdiId, responsavelPadrao, aoSalvar }: { pdiId: number; responsavelPadrao: string; aoSalvar: () => void }) {
  const cursos = useDados(() => api.get('/cursos', ListaCursos));
  const [form, setForm] = useState({ oQueFazer: '', comoFazer: '', responsavel: responsavelPadrao, prazo: '', cursoId: '' });
  const [erroForm, setErroForm] = useState<string | null>(null);
  const acao = useAcao();
  const mudar = (campo: keyof typeof form, valor: string) => setForm((f) => ({ ...f, [campo]: valor }));

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    const corpo = { ...form, cursoId: form.cursoId ? Number(form.cursoId) : null };
    const validacao = NovaAcaoBody.safeParse(corpo);
    if (!validacao.success) return setErroForm(validacao.error.issues[0].message);
    setErroForm(null);
    if (await acao.executar(() => api.post(`/pdis/${pdiId}/acoes`, validacao.data))) {
      setForm({ oQueFazer: '', comoFazer: '', responsavel: responsavelPadrao, prazo: '', cursoId: '' });
      aoSalvar();
    }
  };

  return (
    <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--borda)', paddingTop: 16 }}>
      <strong>Nova ação</strong>
      <div className="linha-form">
        <Campo rotulo="O que fazer"><input value={form.oQueFazer} onChange={(e) => mudar('oQueFazer', e.target.value)} placeholder="Ex.: Concluir Excel Avançado" /></Campo>
        <Campo rotulo="Como fazer"><input value={form.comoFazer} onChange={(e) => mudar('comoFazer', e.target.value)} placeholder="Ex.: 2h por semana" /></Campo>
        <Campo rotulo="Responsável"><input value={form.responsavel} onChange={(e) => mudar('responsavel', e.target.value)} /></Campo>
        <Campo rotulo="Prazo"><input type="date" value={form.prazo} onChange={(e) => mudar('prazo', e.target.value)} /></Campo>
      </div>
      <Campo rotulo="É um curso? (opcional)" ajuda="Se escolher um curso, ele entra na trilha do PDI e a ação é concluída quando o certificado for validado.">
        <select value={form.cursoId} onChange={(e) => mudar('cursoId', e.target.value)}>
          <option value="">Não é um curso</option>
          {cursos.dados?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Campo>
      <Erro mensagem={erroForm ?? acao.erro} />
      <div><Botao type="submit" carregando={acao.enviando}>Adicionar ação</Botao></div>
    </form>
  );
}

function PlanoDeAcao({ colaboradorId, eGestor }: { colaboradorId: number; eGestor: boolean }) {
  const { dados, erro, carregando, recarregar } = useDados(() => api.get(`/pdis/colaborador/${colaboradorId}`, PdiOuNada), [colaboradorId]);
  const [adicionando, setAdicionando] = useState(false);
  const acao = useAcao();

  const progresso = (acaoId: number, valor: number) => acao.executar(() => api.patch(`/pdis/acoes/${acaoId}/progresso`, { progresso: valor })).then((ok) => ok && recarregar());
  const criar = () => acao.executar(() => api.post(`/pdis/colaborador/${colaboradorId}`)).then((ok) => ok && recarregar());

  return (
    <Estado carregando={carregando} erro={erro}>
      {!dados ? (
        <Aviso titulo="Ainda não há PDI neste ciclo" acao={eGestor ? <Botao onClick={criar} carregando={acao.enviando}>Criar PDI do ciclo</Botao> : undefined}>
          {eGestor ? 'Crie o plano e adicione as ações combinadas com o colaborador.' : 'Seu gestor cria o PDI depois da avaliação anual.'}
        </Aviso>
      ) : (
        <>
          <div className="aviso" style={{ padding: '18px 22px' }}>
            <Pessoa nome={`PDI de ${dados.colaborador.nome}`} iniciais={dados.colaborador.iniciais} detalhe={`${dados.colaborador.cargoNome} · ${data(dados.inicio)} a ${data(dados.fim)}`} />
            <div style={{ flex: 1 }} />
            <Selo tom={dados.emDia ? 'verde' : 'vermelho'}>{dados.emDia ? 'Em dia' : 'Com ações atrasadas'}</Selo>
            <strong style={{ fontSize: 20, fontFamily: 'Poppins' }}>{dados.progresso}%</strong>
          </div>
          <Card
            titulo="Plano de ação e trilha do PDI"
            subtitulo={`${dados.acoes.length} ações · ciclo ${dados.ciclo}`}
            acao={!adicionando && <Botao variante="link" onClick={() => setAdicionando(true)}><Plus size={12} /> Adicionar ação</Botao>}
          >
            <table className="tabela">
              <thead>
                <tr><th>O que fazer / como fazer</th><th>Responsável</th><th>Prazo</th><th style={{ width: 230 }}>Acompanhamento</th></tr>
              </thead>
              <tbody>
                {dados.acoes.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.oQueFazer}</strong>
                      <small>{a.comoFazer}{a.cursoNome ? ` · curso: ${a.cursoNome}` : ''}</small>
                    </td>
                    <td>{a.responsavel}</td>
                    <td className={a.situacao === 'atrasada' ? 'tom-vermelho' : ''}>{data(a.prazo)}</td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Selo tom={SITUACAO[a.situacao].tom}>{SITUACAO[a.situacao].rotulo}</Selo>
                        {a.cursoId ? (
                          <strong>{a.progresso}%</strong>
                        ) : (
                          <select className="entrada" style={{ width: 80, padding: '2px 6px' }} value={a.progresso} onChange={(e) => progresso(a.id, Number(e.target.value))}>
                            {[0, 25, 50, 75, 100].map((v) => <option key={v} value={v}>{v}%</option>)}
                            {![0, 25, 50, 75, 100].includes(a.progresso) && <option value={a.progresso}>{a.progresso}%</option>}
                          </select>
                        )}
                      </div>
                      <Barra valor={a.progresso} />
                      {a.cursoId && a.progresso < 100 && <small>Conclui quando o certificado for validado</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Erro mensagem={acao.erro} />
            {adicionando && <NovaAcao pdiId={dados.id} responsavelPadrao={dados.colaborador.nome} aoSalvar={() => { setAdicionando(false); recarregar(); }} />}
          </Card>
        </>
      )}
    </Estado>
  );
}

/** Caso de uso: ver e acompanhar o PDI (gestor escolhe o colaborador; colaborador vê o próprio). */
export function PdiPagina() {
  const { usuario, usuarios } = useSessao();
  const eGestor = usuario?.perfil === 'gestor';
  const equipe = usuarios.filter((u) => u.perfil === 'colaborador');
  const [escolhido, setEscolhido] = useState<number | null>(null);
  if (!usuario) return null;
  const colaboradorId = eGestor ? (escolhido ?? equipe[0]?.id) : usuario.id;

  return (
    <Pagina
      contexto={eGestor ? 'Desenvolvimento · PDIs da equipe' : 'Meu desenvolvimento'}
      titulo={eGestor ? 'Planos de desenvolvimento' : 'Meu PDI'}
      descricao="O que fazer, quem é responsável, o prazo e o acompanhamento de cada ação."
      acoes={
        eGestor && (
          <select className="entrada" style={{ width: 260 }} value={colaboradorId} onChange={(e) => setEscolhido(Number(e.target.value))}>
            {equipe.map((c) => <option key={c.id} value={c.id}>{c.nome} · {c.areaNome}</option>)}
          </select>
        )
      }
    >
      {colaboradorId && <PlanoDeAcao colaboradorId={colaboradorId} eGestor={eGestor} />}
    </Pagina>
  );
}
