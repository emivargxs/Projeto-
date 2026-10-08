import { SerieMensal } from '@cestacorp/contracts';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { ButtonHTMLAttributes, ReactNode } from 'react';
import { horas } from './formatos';

export type Tom = 'azul' | 'verde' | 'ambar' | 'vermelho' | 'cinza';

export function Pagina(props: { contexto?: string; titulo: string; descricao?: string; acoes?: ReactNode; children: ReactNode }) {
  return (
    <div className="pagina">
      <header className="pagina-cabecalho">
        <div>
          {props.contexto && <p className="contexto">{props.contexto}</p>}
          <h1>{props.titulo}</h1>
          {props.descricao && <p className="descricao">{props.descricao}</p>}
        </div>
        {props.acoes && <div className="acoes">{props.acoes}</div>}
      </header>
      {props.children}
    </div>
  );
}

export function Card(props: { titulo?: string; subtitulo?: string; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${props.className ?? ''}`}>
      {(props.titulo || props.acao) && (
        <div className="card-topo">
          <div>
            {props.titulo && <h2>{props.titulo}</h2>}
            {props.subtitulo && <p className="sub">{props.subtitulo}</p>}
          </div>
          {props.acao}
        </div>
      )}
      {props.children}
    </section>
  );
}

export function Kpi(props: { rotulo: string; valor: ReactNode; rodape?: ReactNode; tom?: Tom; progresso?: number }) {
  return (
    <div className="kpi">
      <span className="rotulo">{props.rotulo}</span>
      <strong className="valor">{props.valor}</strong>
      {props.progresso !== undefined && <Barra valor={props.progresso} tom={props.tom === 'verde' ? 'verde' : 'azul'} />}
      {props.rodape && <span className={`rodape tom-${props.tom ?? 'azul'}`}>{props.rodape}</span>}
    </div>
  );
}

export const Grade = ({ colunas = 4, children }: { colunas?: number; children: ReactNode }) => (
  <div className="grade" style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` }}>
    {children}
  </div>
);

export const Duas = ({ children, lateral = 360 }: { children: ReactNode; lateral?: number }) => (
  <div className="duas" style={{ gridTemplateColumns: `minmax(0, 1fr) ${lateral}px` }}>
    {children}
  </div>
);

export const Selo = ({ tom = 'azul', children }: { tom?: Tom; children: ReactNode }) => <span className={`selo tom-${tom}`}>{children}</span>;

export function Botao({ variante = 'primario', carregando, children, ...resto }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primario' | 'secundario' | 'link'; carregando?: boolean }) {
  return (
    <button {...resto} className={`botao botao-${variante} ${resto.className ?? ''}`} disabled={resto.disabled || carregando}>
      {carregando && <Loader2 size={14} className="girando" />}
      {children}
    </button>
  );
}

export const Barra = ({ valor, tom = 'azul' }: { valor: number; tom?: 'azul' | 'verde' }) => (
  <div className="barra">
    <div className={`barra-preenchida tom-${tom}`} style={{ width: `${Math.min(100, Math.max(0, valor))}%` }} />
  </div>
);

export const Avatar = ({ iniciais }: { iniciais: string }) => <span className="avatar">{iniciais}</span>;

export function Pessoa({ nome, iniciais, detalhe }: { nome: string; iniciais: string; detalhe?: string }) {
  return (
    <div className="pessoa">
      <Avatar iniciais={iniciais} />
      <div>
        <strong>{nome}</strong>
        {detalhe && <small>{detalhe}</small>}
      </div>
    </div>
  );
}

export function Aviso({ tom = 'azul', titulo, children, acao }: { tom?: Tom; titulo?: string; children?: ReactNode; acao?: ReactNode }) {
  const Icone = tom === 'ambar' || tom === 'vermelho' ? AlertTriangle : Info;
  return (
    <div className={`aviso tom-${tom}`}>
      <Icone size={18} />
      <div className="aviso-texto">
        {titulo && <strong>{titulo}</strong>}
        {children && <span>{children}</span>}
      </div>
      {acao}
    </div>
  );
}

export function Estado({ carregando, erro, vazio, children }: { carregando: boolean; erro: string | null; vazio?: string | false; children?: ReactNode }) {
  if (carregando) return <div className="estado"><Loader2 className="girando" size={18} /> Carregando…</div>;
  if (erro) return <Aviso tom="vermelho" titulo="Não foi possível carregar">{erro}</Aviso>;
  if (vazio) return <div className="estado">{vazio}</div>;
  return <>{children}</>;
}

export const Erro = ({ mensagem }: { mensagem: string | null }) => (mensagem ? <p className="erro-form">{mensagem}</p> : null);

/** Gráfico de barras de horas por mês. Verde quando bateu a meta; o mês atual fica mais claro. */
export function HorasMesAMes({ serie, meta, mesAtual, ateMes = 12 }: { serie: SerieMensal; meta: number; mesAtual: number; ateMes?: number }) {
  const visiveis = serie.filter((s) => s.mes <= ateMes);
  // folga de 15% no topo para caber o rótulo acima da barra mais alta
  const escala = Math.max(meta, ...visiveis.map((s) => s.horas), 1) * 1.15;
  const altura = (h: number) => `${(h / escala) * 100}%`;
  return (
    <div className="grafico">
      <div className="grafico-area">
        <div className="linha-meta" style={{ bottom: altura(meta) }}>
          <span>meta {horas(meta)}</span>
        </div>
        {visiveis.map((s) => {
          const classe = s.mes === mesAtual ? 'atual' : s.horas >= meta ? 'bateu' : '';
          return (
            <div key={s.mes} className="coluna-barra">
              <div className={`barra-vertical ${classe}`} style={{ height: altura(s.horas) }} />
              {s.horas > 0 && (
                <span className={`valor-barra ${classe}`} style={{ bottom: `calc(${altura(s.horas)} + 4px)` }}>
                  {horas(s.horas)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="grafico-meses">
        {visiveis.map((s) => <span key={s.mes} className="mes">{s.rotulo}</span>)}
      </div>
    </div>
  );
}

/** Comparação horizontal "você x time" ou por área. */
export function Comparativo({ rotulo, valor, referencia, sufixo = '%' }: { rotulo: string; valor: number; referencia?: number; sufixo?: string }) {
  const tom: Tom = referencia === undefined ? 'azul' : valor >= referencia ? 'verde' : 'ambar';
  return (
    <div className="comparativo">
      <div className="comparativo-topo">
        <strong>{rotulo}</strong>
        {referencia !== undefined && <Selo tom={tom}>{valor >= referencia ? 'Acima' : 'Atenção'}</Selo>}
      </div>
      <small>
        {valor}
        {sufixo}
        {referencia !== undefined && ` · time ${referencia}${sufixo}`}
      </small>
      <Barra valor={sufixo === '%' ? valor : (valor / Math.max(valor, referencia ?? valor, 1)) * 100} />
    </div>
  );
}

export function Campo({ rotulo, children, ajuda }: { rotulo: string; children: ReactNode; ajuda?: string }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      {children}
      {ajuda && <small>{ajuda}</small>}
    </label>
  );
}
