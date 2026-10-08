import type { z, ZodTypeAny } from 'zod';

/**
 * Cliente HTTP do front. Toda resposta é validada com o mesmo contrato Zod usado pela API,
 * então se a API mudar o formato, o erro aparece aqui e não escondido numa tela.
 */

let usuarioAtualId: number | null = null;

export function definirUsuarioDaApi(id: number | null) {
  usuarioAtualId = id;
}

export class ErroDaApi extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
  ) {
    super(mensagem);
  }
}

async function requisitar(metodo: string, caminho: string, corpo?: unknown): Promise<unknown> {
  const headers: Record<string, string> = {};
  if (usuarioAtualId) headers['x-usuario-id'] = String(usuarioAtualId);
  let body: BodyInit | undefined;
  if (corpo instanceof FormData) {
    body = corpo;
  } else if (corpo !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(corpo);
  }

  let resposta: Response;
  try {
    resposta = await fetch(`/api${caminho}`, { method: metodo, headers, body });
  } catch {
    throw new ErroDaApi('Não foi possível falar com a API. Ela está rodando?', 0);
  }
  if (!resposta.ok) {
    const erro = (await resposta.json().catch(() => null)) as { mensagem?: string } | null;
    throw new ErroDaApi(erro?.mensagem ?? `Erro ${resposta.status}`, resposta.status);
  }
  if (resposta.status === 204) return undefined;
  return resposta.json();
}

export const api = {
  async get<S extends ZodTypeAny>(caminho: string, contrato: S): Promise<z.infer<S>> {
    return contrato.parse(await requisitar('GET', caminho));
  },
  post: (caminho: string, corpo?: unknown) => requisitar('POST', caminho, corpo),
  put: (caminho: string, corpo?: unknown) => requisitar('PUT', caminho, corpo),
  patch: (caminho: string, corpo?: unknown) => requisitar('PATCH', caminho, corpo),
  delete: (caminho: string) => requisitar('DELETE', caminho),

  /** Baixa um arquivo protegido (ex.: certificado) e abre numa nova aba. */
  async abrirArquivo(caminho: string) {
    const headers: Record<string, string> = usuarioAtualId ? { 'x-usuario-id': String(usuarioAtualId) } : {};
    const resposta = await fetch(`/api${caminho}`, { headers });
    if (!resposta.ok) throw new ErroDaApi('Arquivo não encontrado', resposta.status);
    const url = URL.createObjectURL(await resposta.blob());
    window.open(url, '_blank');
  },
};
