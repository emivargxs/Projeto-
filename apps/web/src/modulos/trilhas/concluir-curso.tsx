import { ConclusaoDetalhe, MinhaTrilha, MODALIDADE_ROTULO, RegistrarConclusaoBody } from '@cestacorp/contracts';
import { Upload } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../compartilhado/api';
import { data, hojeIso, horas } from '../../compartilhado/formatos';
import { Aviso, Botao, Campo, Card, Duas, Erro, Estado, Pagina, Selo } from '../../compartilhado/ui';
import { useAcao, useDados } from '../../compartilhado/use-dados';

const CRITERIOS = [
  { chave: 'notaConteudo', rotulo: 'Conteúdo' },
  { chave: 'notaDidatica', rotulo: 'Didática do instrutor' },
  { chave: 'notaAplicabilidade', rotulo: 'Aplicabilidade na rotina' },
] as const;

type Formulario = Record<keyof RegistrarConclusaoBody, string>;

/** Caso de uso (colaborador): registrar a conclusão de um curso com certificado, resumo e avaliação. */
export function ConcluirCursoPagina() {
  const cursoId = Number(useParams().cursoId);
  const navegar = useNavigate();
  const { dados, erro, carregando } = useDados(() => api.get('/trilhas/minha', MinhaTrilha));
  const treinamento = dados?.treinamentos.find((t) => t.cursoId === cursoId);
  const anterior = useDados(
    () => (treinamento?.conclusaoId ? api.get(`/conclusoes/${treinamento.conclusaoId}`, ConclusaoDetalhe) : Promise.resolve(null)),
    [treinamento?.conclusaoId],
  );

  const [form, setForm] = useState<Formulario>({
    dataRealizacao: hojeIso(), codigoCertificado: '', cargaHoras: '', investimento: '0', resumo: '',
    notaConteudo: '', notaDidatica: '', notaAplicabilidade: '',
  });
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const envio = useAcao();

  // Preenche com a carga do curso ou com o envio anterior (quando foi devolvido para ajuste)
  useEffect(() => {
    const a = anterior.dados;
    if (a) {
      setForm({
        dataRealizacao: a.dataRealizacao, codigoCertificado: a.codigoCertificado, cargaHoras: String(a.cargaHoras), investimento: String(a.investimento),
        resumo: a.resumo, notaConteudo: String(a.notas.conteudo), notaDidatica: String(a.notas.didatica), notaAplicabilidade: String(a.notas.aplicabilidade),
      });
    } else if (treinamento) {
      setForm((f) => ({ ...f, cargaHoras: f.cargaHoras || String(treinamento.cargaHoras) }));
    }
  }, [anterior.dados, treinamento]);

  const mudar = (campo: keyof Formulario, valor: string) => setForm((f) => ({ ...f, [campo]: valor }));

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErroForm(null);
    const validacao = RegistrarConclusaoBody.safeParse(form);
    if (!validacao.success) return setErroForm(validacao.error.issues[0].message);
    if (!arquivo && !anterior.dados?.certificado) return setErroForm('Anexe o certificado do curso');

    const corpo = new FormData();
    Object.entries(form).forEach(([k, v]) => corpo.append(k, v));
    if (arquivo) corpo.append('certificado', arquivo);
    const ok = await envio.executar(() => api.post(`/trilhas/cursos/${cursoId}/conclusao`, corpo));
    if (ok) navegar('/minha-trilha');
  };

  const bloqueado = treinamento && (treinamento.status === 'enviado' || treinamento.status === 'concluido');

  return (
    <Pagina
      contexto="Minha trilha · registrar conclusão"
      titulo={treinamento ? `Concluir ${treinamento.curso}` : 'Concluir curso'}
      descricao="Envie o certificado, conte o que aprendeu e avalie o treinamento."
      acoes={<Link to="/minha-trilha"><Botao variante="secundario">Voltar para a trilha</Botao></Link>}
    >
      <Estado carregando={carregando} erro={erro} vazio={!treinamento && 'Este curso não está na sua trilha.'}>
        {treinamento && (
          <>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div>
                  <h2 style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {treinamento.curso} <Selo>{treinamento.origem === 'pdi' ? 'Trilha do PDI' : treinamento.origem === 'obrigatorio' ? 'Trilha obrigatória' : 'Livre'}</Selo>
                  </h2>
                  <p className="sub">
                    Competência: {treinamento.competencia} · {treinamento.entidade} · {MODALIDADE_ROTULO[treinamento.modalidade]} · {horas(treinamento.cargaHoras)}
                    {treinamento.prazo && ` · Prazo ${data(treinamento.prazo)}`}
                  </p>
                </div>
                {treinamento.link && <a href={treinamento.link} target="_blank" rel="noreferrer"><Botao variante="secundario">Abrir curso ↗</Botao></a>}
              </div>
            </Card>
            {treinamento.motivoDevolucao && <Aviso tom="vermelho" titulo="O gestor devolveu para ajuste">{treinamento.motivoDevolucao}</Aviso>}
            {bloqueado ? (
              <Aviso tom="verde" titulo="Este curso já foi enviado">Acompanhe o status na sua trilha.</Aviso>
            ) : (
              <form onSubmit={enviar}>
                <Duas>
                  <Card titulo="Comprovação" subtitulo="Certificado e dados do curso realizado">
                    <label className="arquivo">
                      <span className="icone-arquivo">{arquivo ? 'PDF' : <Upload size={16} />}</span>
                      <span style={{ flex: 1 }}>
                        <strong>{arquivo?.name ?? anterior.dados?.certificado?.nome ?? 'Anexar certificado'}</strong>
                        <small style={{ display: 'block', color: 'var(--suave)' }}>
                          {arquivo ? `${Math.round(arquivo.size / 1024)} KB` : 'PDF, PNG ou JPG até 5 MB'}
                        </small>
                      </span>
                      <span className="tom-azul" style={{ fontWeight: 600 }}>{arquivo || anterior.dados ? 'Trocar arquivo' : 'Escolher arquivo'}</span>
                      <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
                    </label>
                    <div className="linha-form">
                      <Campo rotulo="Código do certificado">
                        <input value={form.codigoCertificado} onChange={(e) => mudar('codigoCertificado', e.target.value)} placeholder="Ex.: EVBR-2026-88341" />
                      </Campo>
                      <Campo rotulo="Data de realização">
                        <input type="date" value={form.dataRealizacao} onChange={(e) => mudar('dataRealizacao', e.target.value)} />
                      </Campo>
                      <Campo rotulo="Carga horária (h)">
                        <input type="number" step="0.5" min="0" value={form.cargaHoras} onChange={(e) => mudar('cargaHoras', e.target.value)} />
                      </Campo>
                      <Campo rotulo="Investimento (R$)">
                        <input type="number" step="0.01" min="0" value={form.investimento} onChange={(e) => mudar('investimento', e.target.value)} />
                      </Campo>
                    </div>
                    <Campo rotulo="Relatório com resumo do que aprendi" ajuda="Mínimo de 40 caracteres. O resumo fica visível para você e seu gestor.">
                      <textarea value={form.resumo} onChange={(e) => mudar('resumo', e.target.value)} placeholder="O que você aprendeu e como vai aplicar na rotina?" />
                    </Campo>
                  </Card>
                  <Card titulo="Avaliação do treinamento" subtitulo="Sua opinião ajuda o gestor a manter a trilha útil">
                    <span className="contexto tom-azul" style={{ fontWeight: 600 }}>Qualidade · avaliada por você</span>
                    {CRITERIOS.map((c) => (
                      <div key={c.chave} className="linha-nota">
                        <span>{c.rotulo}</span>
                        <div className="notas">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button type="button" key={n} className={`nota ${Number(form[c.chave]) >= n ? 'marcada' : ''}`} onClick={() => mudar(c.chave, String(n))}>
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <Aviso tom="verde" titulo="Eficácia · avaliada pelo gestor">
                      30 dias após a conclusão, o gestor confirma se o aprendizado foi aplicado na rotina, usando o seu resumo como referência.
                    </Aviso>
                    <Erro mensagem={erroForm ?? envio.erro} />
                    <Botao type="submit" carregando={envio.enviando}>Enviar para validação</Botao>
                  </Card>
                </Duas>
              </form>
            )}
          </>
        )}
      </Estado>
    </Pagina>
  );
}
