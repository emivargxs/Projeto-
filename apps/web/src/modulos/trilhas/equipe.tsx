import { TrilhasDaEquipe } from '@cestacorp/contracts';
import { Link } from 'react-router-dom';
import { api } from '../../compartilhado/api';
import { data, horas } from '../../compartilhado/formatos';
import { Barra, Card, Duas, Estado, Grade, Kpi, Pagina, Pessoa, Selo } from '../../compartilhado/ui';
import { useDados } from '../../compartilhado/use-dados';

/** Caso de uso (gestor): acompanhar as trilhas, os atrasos do mês e o que precisa validar. */
export function TrilhasDaEquipePagina() {
  const { dados, erro, carregando } = useDados(() => api.get('/trilhas/equipe', TrilhasDaEquipe));

  return (
    <Pagina contexto="Trilha de conhecimentos · equipe" titulo="Trilhas da equipe" descricao="Acompanhe o cumprimento das trilhas, os atrasos do mês e os certificados enviados.">
      <Estado carregando={carregando} erro={erro}>
        {dados && (
          <>
            <Grade>
              <Kpi rotulo="Trilha obrigatória do time" valor={`${dados.indicadores.obrigatoriaPercentual}%`} progresso={dados.indicadores.obrigatoriaPercentual} />
              <Kpi rotulo="Trilha do PDI do time" valor={`${dados.indicadores.pdiPercentual}%`} tom="verde" progresso={dados.indicadores.pdiPercentual} />
              <Kpi rotulo="Atrasados no mês" valor={`${dados.indicadores.atrasados} ${dados.indicadores.atrasados === 1 ? 'pessoa' : 'pessoas'}`} tom="ambar" rodape={`Abaixo do esperado até o dia ${dados.referencia.dia}`} />
              <Kpi rotulo="Certificados para validar" valor={dados.indicadores.paraValidar} rodape="Aguardando sua conferência" />
            </Grade>
            <Duas>
              <Card titulo="Acompanhamento da equipe" subtitulo={`Situação de cada colaborador em ${dados.referencia.mesRotulo} · hoje é dia ${dados.referencia.dia}`}>
                <table className="tabela">
                  <thead>
                    <tr><th>Colaborador</th><th>Trilha obrigatória</th><th>Trilha do PDI</th><th>Horas no mês</th><th>Situação</th></tr>
                  </thead>
                  <tbody>
                    {dados.linhas.map((l) => (
                      <tr key={l.colaborador.id}>
                        <td><Pessoa nome={l.colaborador.nome} iniciais={l.colaborador.iniciais} detalhe={l.colaborador.cargoNome} /></td>
                        <td style={{ width: 130 }}><strong>{l.obrigatoria.percentual}%</strong><Barra valor={l.obrigatoria.percentual} /></td>
                        <td style={{ width: 130 }}>{l.pdi ? (<><strong>{l.pdi.percentual}%</strong><Barra valor={l.pdi.percentual} tom="verde" /></>) : <small>Sem PDI ativo</small>}</td>
                        <td>{horas(l.horasMes)} de {horas(l.metaMes)}</td>
                        <td>
                          {l.percentualAtraso > 0 ? (
                            <Selo tom={l.percentualAtraso >= 50 ? 'vermelho' : 'ambar'}>{l.percentualAtraso}% atrasado</Selo>
                          ) : (
                            <Selo tom="verde">Em dia</Selo>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              <div className="pilha">
                <Card titulo="Certificados para validar" subtitulo="Confira o comprovante e o resumo">
                  {dados.paraValidar.length === 0 && <small style={{ color: 'var(--suave)' }}>Nada pendente.</small>}
                  {dados.paraValidar.map((c) => (
                    <div key={c.conclusaoId} className="aviso" style={{ background: 'var(--fundo-claro)', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <strong>{c.colaborador}</strong>
                      <small style={{ color: 'var(--suave)' }}>{c.curso} · {horas(c.cargaHoras)} · enviado em {data(c.enviadoEm, false)}</small>
                      <Link to={`/conclusoes/${c.conclusaoId}`} style={{ fontWeight: 600, fontSize: 12 }}>Validar conclusão →</Link>
                    </div>
                  ))}
                </Card>
                <Card titulo="Eficácia a avaliar" subtitulo="30 dias após a conclusão">
                  {dados.eficaciaPendente.length === 0 && <small style={{ color: 'var(--suave)' }}>Nada pendente.</small>}
                  {dados.eficaciaPendente.map((c) => (
                    <div key={c.conclusaoId} className="aviso tom-verde" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <strong className="tom-verde">{c.colaborador}</strong>
                      <small className="tom-verde">{c.curso} · liberada em {data(c.liberadaEm, false)}</small>
                      <Link to={`/conclusoes/${c.conclusaoId}`} style={{ fontWeight: 600, fontSize: 12 }}>Avaliar eficácia →</Link>
                    </div>
                  ))}
                </Card>
              </div>
            </Duas>
          </>
        )}
      </Estado>
    </Pagina>
  );
}
