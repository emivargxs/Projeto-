import { IndicadoresColaborador, IndicadoresOrganizacao, TrilhasDaEquipe } from '@cestacorp/contracts';
import { api } from '../../compartilhado/api';
import { horas } from '../../compartilhado/formatos';
import { Barra, Card, Comparativo, Duas, Estado, Grade, HorasMesAMes, Kpi, Pagina } from '../../compartilhado/ui';
import { useDados } from '../../compartilhado/use-dados';

const mesDe = (rotulo: string) =>
  ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'].indexOf(rotulo.split(' ')[0]) + 1;

const useMeusIndicadores = () => useDados(() => api.get('/indicadores/meus', IndicadoresColaborador));

/** Gráfico "Horas realizadas mês a mês" do colaborador (também aparece na Minha trilha). */
export function MinhasHorasMesAMes() {
  const { dados, erro, carregando } = useMeusIndicadores();
  const mes = dados ? mesDe(dados.mesRotulo) : 12;
  return (
    <Card titulo="Horas realizadas mês a mês" subtitulo={dados ? `${dados.ano} · meta de ${horas(dados.metaMes)} por mês` : ''}>
      <Estado carregando={carregando} erro={erro}>
        {dados && (
          <>
            <HorasMesAMes serie={dados.serie} meta={dados.metaMes} mesAtual={mes} ateMes={mes} />
            <small style={{ color: 'var(--suave)' }}>
              {dados.mesRotulo[0].toUpperCase() + dados.mesRotulo.slice(1)} em andamento ·{' '}
              {dados.horasMes >= dados.metaMes ? 'meta do mês batida' : `faltam ${horas(dados.metaMes - dados.horasMes)} para a meta do mês`}
            </small>
          </>
        )}
      </Estado>
    </Card>
  );
}

/** % de cumprimento da trilha obrigatória por colaborador (gráfico pedido pela Cestacorp). */
function CumprimentoPorColaborador() {
  const { dados, erro, carregando } = useDados(() => api.get('/trilhas/equipe', TrilhasDaEquipe));
  return (
    <Card titulo="% de cumprimento por colaborador" subtitulo="Trilha obrigatória do cargo e trilha do PDI">
      <Estado carregando={carregando} erro={erro}>
        <table className="tabela">
          <thead><tr><th>Colaborador</th><th style={{ width: '35%' }}>Trilha obrigatória</th><th style={{ width: '35%' }}>Trilha do PDI</th></tr></thead>
          <tbody>
            {dados?.linhas.map((l) => (
              <tr key={l.colaborador.id}>
                <td>{l.colaborador.nome}<small>{l.colaborador.cargoNome}</small></td>
                <td><strong>{l.obrigatoria.percentual}%</strong><Barra valor={l.obrigatoria.percentual} /></td>
                <td>{l.pdi ? (<><strong>{l.pdi.percentual}%</strong><Barra valor={l.pdi.percentual} tom="verde" /></>) : <small>Sem PDI ativo</small>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Estado>
    </Card>
  );
}

/** Caso de uso (gestor): indicadores da organização. */
export function IndicadoresPagina() {
  const { dados, erro, carregando } = useDados(() => api.get('/indicadores/organizacao', IndicadoresOrganizacao));
  const mes = dados ? mesDe(dados.mesRotulo) : 12;
  return (
    <Pagina contexto={`Visão organizacional · ${dados?.mesRotulo ?? ''}`} titulo="Indicadores" descricao="Cumprimento das trilhas, hora-homem e horas de treinamento da Cestacorp.">
      <Estado carregando={carregando} erro={erro}>
        {dados && (
          <>
            <Grade>
              <Kpi rotulo="Hora-homem de treinamento" valor={horas(dados.horaHomemAno)} rodape={`${horas(dados.horasPorColaborador)} por colaborador em ${dados.ano}`} />
              <Kpi rotulo="Trilha obrigatória cumprida" valor={`${dados.obrigatoriaPercentual}%`} progresso={dados.obrigatoriaPercentual} rodape={`${dados.colaboradores} colaboradores`} />
              <Kpi rotulo="Trilha do PDI cumprida" valor={`${dados.pdiPercentual}%`} tom="verde" progresso={dados.pdiPercentual} rodape={`${dados.pdisAtivos} PDIs ativos`} />
              <Kpi
                rotulo={`Horas em ${dados.mesRotulo.split(' ')[0]}`}
                valor={horas(dados.horasMes)}
                tom={dados.horasMes >= dados.metaMes ? 'verde' : 'ambar'}
                rodape={`Meta do mês: ${horas(dados.metaMes)}`}
              />
            </Grade>
            <Card titulo="Horas realizadas mês a mês" subtitulo={`Total do time em ${dados.ano} · meta de ${horas(dados.metaMensalTime)} por mês`}>
              <HorasMesAMes serie={dados.serie} meta={dados.metaMensalTime} mesAtual={mes} ateMes={mes} />
            </Card>
            <Duas>
              <CumprimentoPorColaborador />
              <Card titulo="% de cumprimento do PDI" subtitulo="Ações do PDI concluídas, por área">
                {dados.pdiPorArea.map((a) => <Comparativo key={a.area} rotulo={a.area} valor={a.percentual} />)}
                {dados.pdiPorArea.length === 0 && <small>Nenhum PDI ativo.</small>}
              </Card>
            </Duas>
          </>
        )}
      </Estado>
    </Pagina>
  );
}

/** Caso de uso (colaborador): meus indicadores comparados ao time. */
export function MeusIndicadoresPagina() {
  const { dados, erro, carregando } = useMeusIndicadores();
  return (
    <Pagina contexto={`Meus resultados · ${dados?.mesRotulo ?? ''}`} titulo="Meus indicadores" descricao="Seu cumprimento das trilhas e suas horas de treinamento, comparados ao time.">
      <Estado carregando={carregando} erro={erro}>
        {dados && (
          <>
            <Grade>
              <Kpi rotulo="Minhas horas no ano" valor={horas(dados.horasAno)} rodape={`Média do time: ${horas(dados.mediaTimeHorasAno)}`} />
              <Kpi rotulo="Minha trilha obrigatória" valor={`${dados.obrigatoriaPercentual}%`} progresso={dados.obrigatoriaPercentual} rodape={`Time: ${dados.obrigatoriaTime}%`} />
              <Kpi rotulo="Meu PDI" valor={`${dados.pdiPercentual}%`} tom="verde" progresso={dados.pdiPercentual} rodape={`Time: ${dados.pdiTime}%`} />
              <Kpi
                rotulo={`Minhas horas em ${dados.mesRotulo.split(' ')[0]}`}
                valor={horas(dados.horasMes)}
                tom={dados.horasMes >= dados.metaMes ? 'verde' : 'ambar'}
                rodape={`Meta do mês: ${horas(dados.metaMes)}`}
              />
            </Grade>
            <Duas>
              <MinhasHorasMesAMes />
              <Card titulo="Eu x média do time" subtitulo={`Comparativo de ${dados.mesRotulo.split(' ')[0]}`}>
                <Comparativo rotulo="Trilha obrigatória" valor={dados.obrigatoriaPercentual} referencia={dados.obrigatoriaTime} />
                <Comparativo rotulo="Trilha do PDI" valor={dados.pdiPercentual} referencia={dados.pdiTime} />
                <Comparativo rotulo="Horas no ano" valor={dados.horasAno} referencia={dados.mediaTimeHorasAno} sufixo="h" />
              </Card>
            </Duas>
          </>
        )}
      </Estado>
    </Pagina>
  );
}
