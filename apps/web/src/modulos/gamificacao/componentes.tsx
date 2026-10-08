import { MeusPins, Ranking, RegrasGamificacao } from '@cestacorp/contracts';
import { Award, Check } from 'lucide-react';
import { api } from '../../compartilhado/api';
import { horas } from '../../compartilhado/formatos';
import { Card, Estado, Kpi } from '../../compartilhado/ui';
import { useDados } from '../../compartilhado/use-dados';

const useMeusPins = () => useDados(() => api.get('/gamificacao/meus-pins', MeusPins));

/** Indicador "Pins conquistados" do topo da Minha trilha. */
export function KpiDePins() {
  const { dados } = useMeusPins();
  return (
    <Kpi
      rotulo="Pins conquistados"
      valor={dados?.conquistados ?? '…'}
      tom="verde"
      progresso={dados ? (dados.conquistados / dados.total) * 100 : 0}
      rodape={dados ? `${dados.posicaoRanking}º lugar no ranking do time` : ''}
    />
  );
}

/** Caso de uso: ver meus pins (gamificação). */
export function MeusPinsCard() {
  const { dados, erro, carregando } = useMeusPins();
  return (
    <Card titulo="Meus pins" subtitulo={dados ? `${dados.conquistados} de ${dados.total} conquistados` : ''}>
      <Estado carregando={carregando} erro={erro}>
        <div className="pins">
          {dados?.pins.map((p) => (
            <div key={p.codigo} className={`pin ${p.conquistado ? 'conquistado' : ''}`} title={p.criterio}>
              <span className="pin-icone">{p.conquistado ? <Check size={14} /> : <Award size={14} />}</span>
              {p.nome}
            </div>
          ))}
        </div>
      </Estado>
    </Card>
  );
}

/** Caso de uso: acompanhar minha evolução em comparação com a do time (ranking). */
export function RankingDoTimeCard() {
  const { dados, erro, carregando } = useDados(() => api.get('/gamificacao/ranking', Ranking));
  return (
    <Card titulo="Ranking do time" subtitulo="Pins e horas de treinamento no ano">
      <Estado carregando={carregando} erro={erro}>
        <div className="ranking">
          {dados?.map((r) => (
            <div key={r.colaboradorId} className={`ranking-linha ${r.voce ? 'voce' : ''}`}>
              <span>{r.posicao}º  {r.nome}{r.voce ? ' (você)' : ''}</span>
              <small>{r.pins} pins · {horas(r.horasAno)}</small>
            </div>
          ))}
        </div>
      </Estado>
    </Card>
  );
}

/** Regras dos pins e do ranking (tela Metas e pins do gestor). */
export function RegrasDosPinsCard() {
  const { dados, erro, carregando } = useDados(() => api.get('/gamificacao/regras', RegrasGamificacao));
  return (
    <Card titulo="Pins e ranking" subtitulo="O que cada pin exige para ser conquistado">
      <Estado carregando={carregando} erro={erro}>
        <table className="tabela">
          <thead><tr><th>Pin</th><th>Critério</th></tr></thead>
          <tbody>
            {dados?.pins.map((p) => (
              <tr key={p.codigo}>
                <td style={{ fontWeight: 600 }}>{p.nome}</td>
                <td style={{ color: 'var(--suave)' }}>{p.criterio}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {dados && (
          <div className="aviso tom-verde">
            <div className="aviso-texto">
              <strong className="tom-verde">Ranking do time</strong>
              <span className="tom-verde">{dados.regraRanking}</span>
            </div>
          </div>
        )}
      </Estado>
    </Card>
  );
}
