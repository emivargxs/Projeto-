import { useCallback, useEffect, useState } from 'react';
import { useSessao } from './sessao';

interface Estado<T> {
  dados: T | null;
  erro: string | null;
  carregando: boolean;
}

/** Carrega dados da API e recarrega quando o usuário da sessão muda. */
export function useDados<T>(carregar: () => Promise<T>, dependencias: unknown[] = []) {
  const { usuario } = useSessao();
  const [estado, setEstado] = useState<Estado<T>>({ dados: null, erro: null, carregando: true });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!usuario) return;
    let ativo = true;
    setEstado((e) => ({ ...e, carregando: true, erro: null }));
    carregar()
      .then((dados) => ativo && setEstado({ dados, erro: null, carregando: false }))
      .catch((erro: Error) => ativo && setEstado({ dados: null, erro: erro.message, carregando: false }));
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, versao, ...dependencias]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  return { ...estado, recarregar };
}

/** Executa uma ação (salvar, enviar...) guardando o estado de envio e a mensagem de erro. */
export function useAcao() {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const executar = useCallback(async (acao: () => Promise<unknown>): Promise<boolean> => {
    setEnviando(true);
    setErro(null);
    try {
      await acao();
      return true;
    } catch (e) {
      setErro((e as Error).message);
      return false;
    } finally {
      setEnviando(false);
    }
  }, []);

  return { enviando, erro, executar, limparErro: () => setErro(null) };
}
