import { BookOpen, BriefcaseBusiness, ChartNoAxesCombined, ClipboardCheck, LucideIcon, Network, Settings, Target } from 'lucide-react';
import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSessao } from './compartilhado/sessao';
import { Aviso, Pessoa } from './compartilhado/ui';

interface ItemDeMenu {
  rota: string;
  rotulo: string;
  icone: LucideIcon;
}

const MENU_GESTOR: ItemDeMenu[] = [
  { rota: '/organograma', rotulo: 'Organograma', icone: Network },
  { rota: '/cargos', rotulo: 'Cargos e salários', icone: BriefcaseBusiness },
  { rota: '/trilhas', rotulo: 'Trilhas da equipe', icone: BookOpen },
  { rota: '/avaliacoes', rotulo: 'Avaliação anual', icone: ClipboardCheck },
  { rota: '/pdi', rotulo: 'PDI', icone: Target },
  { rota: '/indicadores', rotulo: 'Indicadores', icone: ChartNoAxesCombined },
  { rota: '/metas-e-pins', rotulo: 'Metas e pins', icone: Settings },
];

const MENU_COLABORADOR: ItemDeMenu[] = [
  { rota: '/organograma', rotulo: 'Organograma', icone: Network },
  { rota: '/meu-cargo', rotulo: 'Meu cargo', icone: BriefcaseBusiness },
  { rota: '/minha-trilha', rotulo: 'Minha trilha', icone: BookOpen },
  { rota: '/autoavaliacao', rotulo: 'Avaliação anual', icone: ClipboardCheck },
  { rota: '/meu-pdi', rotulo: 'Meu PDI', icone: Target },
  { rota: '/meus-indicadores', rotulo: 'Meus indicadores', icone: ChartNoAxesCombined },
];

export function Layout({ children }: { children: ReactNode }) {
  const { usuario, usuarios, trocarUsuario, erro } = useSessao();
  const { pathname } = useLocation();
  const menu = usuario?.perfil === 'gestor' ? MENU_GESTOR : MENU_COLABORADOR;
  const atual = menu.find((m) => pathname.startsWith(m.rota)) ?? (pathname.startsWith('/conclusoes') ? menu.find((m) => m.rota.includes('trilha')) : undefined);

  return (
    <div className="app">
      <aside className="lateral">
        <div className="marca"><b>cesta</b><span>corp</span></div>
        <div>
          <div className="nav-titulo">DESENVOLVIMENTO</div>
          <nav className="nav">
            {menu.map((m) => (
              <NavLink key={m.rota} to={m.rota} className={({ isActive }) => (isActive ? 'ativo' : '')}>
                <m.icone size={18} />
                {m.rotulo}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="lateral-rodape">
          <label htmlFor="usuario">ENTRAR COMO (PROTÓTIPO)</label>
          {usuario && <Pessoa nome={usuario.nome} iniciais={usuario.iniciais} detalhe={`${usuario.perfil === 'gestor' ? 'Gestor · administrador' : 'Colaborador'} · ${usuario.cargoNome}`} />}
          <select id="usuario" value={usuario?.id ?? ''} onChange={(e) => trocarUsuario(Number(e.target.value))}>
            <optgroup label="Gestores">
              {usuarios.filter((u) => u.perfil === 'gestor').map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </optgroup>
            <optgroup label="Colaboradores">
              {usuarios.filter((u) => u.perfil === 'colaborador').map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </optgroup>
          </select>
        </div>
      </aside>
      <div>
        <header className="topo">
          <div className="trilha-nav">
            Cestacorp <span>›</span> <strong>{atual?.rotulo ?? ''}</strong>
          </div>
          <span className="selo tom-azul">{usuario?.perfil === 'gestor' ? 'Gestor (administrador)' : 'Colaborador'}</span>
        </header>
        <main className="conteudo">
          {erro ? <Aviso tom="vermelho" titulo="Não foi possível conectar à API">{erro} Confira se a API está rodando (npm run dev) e se o banco foi criado.</Aviso> : children}
        </main>
      </div>
    </div>
  );
}
