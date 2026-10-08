import {
  CargoDetalhe,
  DescricaoCargo,
  ListaCargos,
  ListaCursos,
  MODALIDADE_ROTULO,
  NIVEL_ROTULO,
} from '@cestacorp/contracts';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../compartilhado/api';
import { horas, moeda } from '../../compartilhado/formatos';
import { useSessao } from '../../compartilhado/sessao';
import { Aviso, Botao, Campo, Card, Duas, Erro, Estado, Pagina, Selo } from '../../compartilhado/ui';
import { useAcao, useDados } from '../../compartilhado/use-dados';

const ABAS: { chave: keyof DescricaoCargo; rotulo: string }[] = [
  { chave: 'responsabilidades', rotulo: 'Responsabilidades' },
  { chave: 'conhecimentos', rotulo: 'Conhecimentos' },
  { chave: 'habilidades', rotulo: 'Habilidades' },
  { chave: 'atitudes', rotulo: 'Atitudes' },
  { chave: 'indicadores', rotulo: 'Indicadores do cargo' },
];

/** Descrição do cargo (plano de cargos e salários): usada pelo gestor e pelo colaborador. */
function DescricaoDoCargo({ cargo }: { cargo: CargoDetalhe }) {
  const [aba, setAba] = useState<keyof DescricaoCargo>('responsabilidades');
  return (
    <Card titulo="Descrição do cargo" subtitulo={`Plano de cargos e salários · ${cargo.nome}`}>
      <div className="opcoes">
        {ABAS.map((a) => (
          <button key={a.chave} className={`opcao ${aba === a.chave ? 'marcada' : ''}`} onClick={() => setAba(a.chave)}>
            {a.rotulo}
          </button>
        ))}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cargo.descricao[aba].map((item) => <li key={item}>{item}</li>)}
        {cargo.descricao[aba].length === 0 && <li style={{ color: 'var(--suave)' }}>Ainda não preenchido.</li>}
      </ul>
      <table className="tabela">
        <tbody>
          <tr><td>Formação</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{cargo.formacao || '—'}</td></tr>
          <tr><td>Experiência</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{cargo.experiencia || '—'}</td></tr>
          <tr><td>Próximo cargo</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{cargo.proximoCargo?.nome ?? 'Topo da escada'}</td></tr>
          {cargo.faixaSalarial && (
            <tr>
              <td>Faixa salarial</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>
                {moeda(cargo.faixaSalarial.minimo)} a {moeda(cargo.faixaSalarial.maximo)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}

/** Trilha obrigatória do cargo. O gestor pode adicionar e remover cursos. */
function TrilhaDoCargo({ cargo, editavel, aoMudar }: { cargo: CargoDetalhe; editavel: boolean; aoMudar: () => void }) {
  const cursos = useDados(() => (editavel ? api.get('/cursos', ListaCursos) : Promise.resolve([])), [editavel]);
  const [cursoId, setCursoId] = useState('');
  const [prazo, setPrazo] = useState('90');
  const acao = useAcao();
  const disponiveis = (cursos.dados ?? []).filter((c) => !cargo.trilha.some((t) => t.id === c.id));
  const total = cargo.trilha.reduce((s, t) => s + t.cargaHoras, 0);

  const adicionar = () =>
    acao.executar(() => api.post(`/cargos/${cargo.id}/trilha`, { cursoId: Number(cursoId), prazoDias: Number(prazo) })).then((ok) => {
      if (ok) {
        setCursoId('');
        aoMudar();
      }
    });
  const remover = (id: number) => acao.executar(() => api.delete(`/cargos/${cargo.id}/trilha/${id}`)).then((ok) => ok && aoMudar());

  return (
    <Card titulo="Trilha de conhecimentos obrigatória" subtitulo={`${NIVEL_ROTULO[cargo.nivel]} · ${cargo.trilha.length} cursos · ${horas(total)}`}>
      <table className="tabela">
        <thead>
          <tr>
            <th>Curso / competência</th>
            <th>Entidade · modalidade</th>
            <th>Carga</th>
            <th>Prazo</th>
            {editavel && <th />}
          </tr>
        </thead>
        <tbody>
          {cargo.trilha.map((t) => (
            <tr key={t.id}>
              <td>
                {t.nome}
                <small>{t.competencia}</small>
              </td>
              <td>{t.entidade} · {MODALIDADE_ROTULO[t.modalidade]}</td>
              <td>{horas(t.cargaHoras)}</td>
              <td>{t.prazoDias} dias</td>
              {editavel && (
                <td style={{ textAlign: 'right' }}>
                  <Botao variante="link" onClick={() => remover(t.id)} title="Remover da trilha">
                    <Trash2 size={14} />
                  </Botao>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {editavel && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 10, alignItems: 'end' }}>
          <Campo rotulo="Adicionar curso obrigatório">
            <select value={cursoId} onChange={(e) => setCursoId(e.target.value)}>
              <option value="">Escolha um curso…</option>
              {disponiveis.map((c) => (
                <option key={c.id} value={c.id}>{c.nome} · {horas(c.cargaHoras)}</option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Prazo (dias)">
            <input type="number" min={1} max={365} value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </Campo>
          <Botao onClick={adicionar} disabled={!cursoId} carregando={acao.enviando}>Adicionar</Botao>
        </div>
      )}
      <Erro mensagem={acao.erro} />
      <Aviso>O prazo conta a partir da entrada da pessoa no cargo (ou da inclusão do curso na trilha).</Aviso>
    </Card>
  );
}

function DetalheDoCargo({ cargoId, editavel }: { cargoId: number; editavel: boolean }) {
  const { dados, erro, carregando, recarregar } = useDados(() => api.get(`/cargos/${cargoId}`, CargoDetalhe), [cargoId]);
  return (
    <Estado carregando={carregando} erro={erro}>
      {dados && (
        <>
          <div className="aviso" style={{ padding: '18px 22px' }}>
            <div className="aviso-texto">
              <h2 style={{ fontSize: 18 }}>{dados.nome}</h2>
              <span style={{ color: 'var(--suave)' }}>
                {dados.areaNome} · {dados.ocupantes.length} {dados.ocupantes.length === 1 ? 'pessoa' : 'pessoas'}
                {dados.ocupantes.length > 0 && `: ${dados.ocupantes.map((o) => o.nome).join(', ')}`}
              </span>
            </div>
            <Selo>{NIVEL_ROTULO[dados.nivel]}</Selo>
          </div>
          <Duas>
            <TrilhaDoCargo cargo={dados} editavel={editavel} aoMudar={recarregar} />
            <DescricaoDoCargo cargo={dados} />
          </Duas>
        </>
      )}
    </Estado>
  );
}

/** Caso de uso (gestor): consultar o plano de cargos e salários e montar a trilha de cada cargo. */
export function CargosPagina() {
  const [params, setParams] = useSearchParams();
  const [area, setArea] = useState('');
  const { dados, erro, carregando } = useDados(() => api.get('/cargos', ListaCargos));
  const areas = [...new Set((dados ?? []).map((c) => c.areaNome))];
  const lista = (dados ?? []).filter((c) => !area || c.areaNome === area);
  const selecionado = Number(params.get('cargo')) || dados?.find((c) => c.pessoas > 0)?.id;

  return (
    <Pagina contexto="Plano de cargos e salários" titulo="Cargos e salários" descricao="Descrição, faixa salarial e trilha obrigatória de cada cargo do organograma.">
      <Estado carregando={carregando} erro={erro}>
        <Card
          titulo="Mapa de cargos"
          subtitulo="Selecione um cargo para ver a descrição e a trilha"
          acao={
            <select className="entrada" style={{ width: 220 }} value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="">Todas as áreas</option>
              {areas.map((a) => <option key={a}>{a}</option>)}
            </select>
          }
        >
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table className="tabela">
              <thead>
                <tr><th>Cargo</th><th>Área</th><th>Nível</th><th>Pessoas</th><th>Cursos obrigatórios</th></tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id} className={`clicavel ${c.id === selecionado ? 'destaque' : ''}`} onClick={() => setParams({ cargo: String(c.id) })}>
                    <td style={{ fontWeight: c.id === selecionado ? 600 : 400 }}>{c.nome}</td>
                    <td>{c.areaNome}</td>
                    <td>{NIVEL_ROTULO[c.nivel]}</td>
                    <td>{c.pessoas}</td>
                    <td>{c.cursosObrigatorios}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        {selecionado && <DetalheDoCargo cargoId={selecionado} editavel />}
      </Estado>
    </Pagina>
  );
}

/** Caso de uso (colaborador): ver a descrição do próprio cargo e a trilha obrigatória. */
export function MeuCargoPagina() {
  const { usuario } = useSessao();
  if (!usuario) return null;
  return (
    <Pagina contexto={`Meu cargo · ${usuario.areaNome}`} titulo="Meu cargo e minha trilha" descricao="Descrição do seu cargo, trilha obrigatória e o próximo passo na carreira.">
      <DetalheDoCargo cargoId={usuario.cargoId} editavel={false} />
    </Pagina>
  );
}
