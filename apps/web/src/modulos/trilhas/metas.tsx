import { ListaMetas, MetaHoras, NIVEL_ROTULO } from '@cestacorp/contracts';
import { useEffect, useState } from 'react';
import { api } from '../../compartilhado/api';
import { horas } from '../../compartilhado/formatos';
import { Aviso, Botao, Card, Duas, Erro, Estado, Pagina } from '../../compartilhado/ui';
import { useAcao, useDados } from '../../compartilhado/use-dados';
import { RegrasDosPinsCard } from '../gamificacao';

/** Caso de uso (gestor): definir a meta de horas por nível e consultar as regras dos pins e do ranking. */
export function MetasEPinsPagina() {
  const { dados, erro, carregando, recarregar } = useDados(() => api.get('/metas', ListaMetas));
  const [metas, setMetas] = useState<MetaHoras[]>([]);
  const acao = useAcao();
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (dados) setMetas(dados);
  }, [dados]);

  const mudar = (nivel: MetaHoras['nivel'], valor: string) => {
    setSalvo(false);
    setMetas((ms) => ms.map((m) => (m.nivel === nivel ? { ...m, horasMes: Number(valor) } : m)));
  };
  const salvar = () =>
    acao.executar(() => api.put('/metas', { metas })).then((ok) => {
      if (ok) {
        setSalvo(true);
        recarregar();
      }
    });

  return (
    <Pagina
      contexto="Configurações · ciclo atual"
      titulo="Metas e pins"
      descricao="Regras que calculam o aviso de atraso, a gamificação e o ranking."
      acoes={<Botao onClick={salvar} carregando={acao.enviando}>Salvar metas</Botao>}
    >
      <Estado carregando={carregando} erro={erro}>
        <Erro mensagem={acao.erro} />
        {salvo && <Aviso tom="verde" titulo="Metas salvas" />}
        <Duas lateral={520}>
          <Card titulo="Meta de horas de treinamento" subtitulo="Por nível do cargo · vale para todas as áreas">
            <table className="tabela">
              <thead><tr><th>Nível</th><th>Horas por mês</th><th>Horas no ano</th></tr></thead>
              <tbody>
                {metas.map((m) => (
                  <tr key={m.nivel}>
                    <td style={{ fontWeight: 600 }}>{NIVEL_ROTULO[m.nivel]}</td>
                    <td><input className="entrada" style={{ width: 80 }} type="number" min={0} max={100} step={0.5} value={m.horasMes} onChange={(e) => mudar(m.nivel, e.target.value)} /></td>
                    <td style={{ color: 'var(--suave)' }}>{horas(m.horasMes * 12)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Aviso titulo="Como o aviso de atraso é calculado">
              Horas esperadas até hoje = meta do mês × dia de hoje ÷ dias do mês. O atraso é a diferença entre o esperado e o realizado (só contam cursos validados).
            </Aviso>
          </Card>
          <RegrasDosPinsCard />
        </Duas>
      </Estado>
    </Pagina>
  );
}
