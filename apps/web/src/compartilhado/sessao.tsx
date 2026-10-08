import { Colaborador, ListaColaboradores } from '@cestacorp/contracts';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { api, definirUsuarioDaApi } from './api';

/**
 * Sessão simplificada do protótipo: escolhe-se "quem está usando" num seletor.
 * Para produção, trocar por login mantendo a mesma interface (useSessao).
 */
interface Sessao {
  usuario: Colaborador | null;
  usuarios: Colaborador[];
  trocarUsuario: (id: number) => void;
  erro: string | null;
}

const ContextoSessao = createContext<Sessao>({ usuario: null, usuarios: [], trocarUsuario: () => {}, erro: null });
const CHAVE = 'cestacorp.usuario';

function lerSalvo(): number | null {
  try {
    const v = localStorage.getItem(CHAVE);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

export function ProvedorDeSessao({ children }: { children: ReactNode }) {
  const [usuarios, setUsuarios] = useState<Colaborador[]>([]);
  const [usuarioId, setUsuarioId] = useState<number | null>(lerSalvo);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/sessao/usuarios', ListaColaboradores)
      .then(setUsuarios)
      .catch((e: Error) => setErro(e.message));
  }, []);

  const usuario = useMemo(() => {
    if (usuarios.length === 0) return null;
    return usuarios.find((u) => u.id === usuarioId) ?? usuarios.find((u) => u.perfil === 'gestor') ?? usuarios[0];
  }, [usuarios, usuarioId]);

  // A API precisa saber o usuário antes de qualquer tela pedir dados.
  definirUsuarioDaApi(usuario?.id ?? null);

  const trocarUsuario = (id: number) => {
    setUsuarioId(id);
    try {
      localStorage.setItem(CHAVE, String(id));
    } catch {
      /* navegador sem armazenamento: segue só em memória */
    }
  };

  return <ContextoSessao.Provider value={{ usuario, usuarios, trocarUsuario, erro }}>{children}</ContextoSessao.Provider>;
}

export const useSessao = () => useContext(ContextoSessao);
