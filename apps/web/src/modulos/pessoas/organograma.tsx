import { Organograma, NIVEL_ROTULO } from '@cestacorp/contracts';
import { useNavigate } from 'react-router-dom';
import { api } from '../../compartilhado/api';
import { useSessao } from '../../compartilhado/sessao';
import { Card, Estado, Pagina } from '../../compartilhado/ui';
import { useDados } from '../../compartilhado/use-dados';

/** Caso de uso: ver o organograma e a escada de cargos de cada área. */
export function OrganogramaPagina() {
  const { usuario } = useSessao();
  const navegar = useNavigate();
  const { dados, erro, carregando } = useDados(() => api.get('/organograma', Organograma));
  const gestor = usuario?.perfil === 'gestor';

  const abrirCargo = (cargoId: number) => {
    if (gestor) navegar(`/cargos?cargo=${cargoId}`);
    else if (cargoId === usuario?.cargoId) navegar('/meu-cargo');
  };

  return (
    <Pagina
      contexto={`Estrutura da Cestacorp · ${dados?.diretorias.reduce((n, d) => n + d.areas.length, 0) ?? '…'} áreas`}
      titulo="Organograma"
      descricao={gestor ? 'Clique em um cargo para ver a descrição, o salário e a trilha obrigatória.' : `Você está em ${usuario?.cargoNome}. Veja a escada de cargos da sua área.`}
    >
      <Estado carregando={carregando} erro={erro}>
        {dados?.diretorias.map((d) => (
          <Card key={d.id} titulo={d.nome} subtitulo={d.areas.map((a) => a.nome).join(', ')}>
            <div className="org-fluxo">
              <div className="org-conteudo">
                <div className="org-diretor">{d.diretor}</div>
                <div className="org-ligacao" />
                <div className="org-areas">
                  {d.areas.map((a) => (
                    <div key={a.id} className="org-area">
                      <span className="org-area-nome">{a.nome}</span>
                      {a.cargos.map((c, i) => (
                        <div key={c.id} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          {i > 0 && <div className="org-seta" />}
                          <div
                            className={`org-cargo ${c.coordenacao ? 'coordenacao' : ''} ${a.apoio ? 'apoio' : ''} ${c.id === usuario?.cargoId ? 'meu' : ''}`}
                            onClick={() => !a.apoio && abrirCargo(c.id)}
                            title={a.apoio ? 'Área de apoio / terceirizada' : NIVEL_ROTULO[c.nivel]}
                          >
                            {a.apoio ? a.nome : c.nome}
                            {c.ocupantes.length > 0 && (
                              <span className="ocupantes">
                                {c.id === usuario?.cargoId ? 'Você está aqui · ' : ''}
                                {c.ocupantes.map((o) => o.nome.split(' ')[0]).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
        <div className="legenda">
          <span>■ Coordenação</span>
          <span>□ Cargo da escada</span>
          <span>┅ Área de apoio / terceirizada</span>
          <span>↑ Caminho de evolução de carreira</span>
          <span style={{ color: 'var(--verde-texto)' }}>▢ Seu cargo</span>
        </div>
      </Estado>
    </Pagina>
  );
}
