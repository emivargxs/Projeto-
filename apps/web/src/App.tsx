import { Navigate, Route, Routes } from 'react-router-dom';
import { useSessao } from './compartilhado/sessao';
import { Layout } from './layout';
import { AutoavaliacaoPagina, AvaliacaoDoColaboradorPagina, AvaliacoesPagina } from './modulos/avaliacao';
import { IndicadoresPagina, MeusIndicadoresPagina } from './modulos/indicadores';
import { PdiPagina } from './modulos/pdi';
import { CargosPagina, MeuCargoPagina, OrganogramaPagina } from './modulos/pessoas';
import { ConcluirCursoPagina, ConclusaoPagina, MetasEPinsPagina, MinhaTrilhaPagina, TrilhasDaEquipePagina } from './modulos/trilhas';

export function App() {
  const { usuario } = useSessao();
  const gestor = usuario?.perfil === 'gestor';
  const inicio = gestor ? '/trilhas' : '/minha-trilha';

  return (
    <Layout>
      {usuario && (
        <Routes>
          <Route path="/organograma" element={<OrganogramaPagina />} />
          <Route path="/conclusoes/:id" element={<ConclusaoPagina />} />
          {gestor ? (
            <>
              <Route path="/cargos" element={<CargosPagina />} />
              <Route path="/trilhas" element={<TrilhasDaEquipePagina />} />
              <Route path="/avaliacoes" element={<AvaliacoesPagina />} />
              <Route path="/avaliacoes/:id" element={<AvaliacaoDoColaboradorPagina />} />
              <Route path="/pdi" element={<PdiPagina />} />
              <Route path="/indicadores" element={<IndicadoresPagina />} />
              <Route path="/metas-e-pins" element={<MetasEPinsPagina />} />
            </>
          ) : (
            <>
              <Route path="/meu-cargo" element={<MeuCargoPagina />} />
              <Route path="/minha-trilha" element={<MinhaTrilhaPagina />} />
              <Route path="/minha-trilha/cursos/:cursoId/concluir" element={<ConcluirCursoPagina />} />
              <Route path="/autoavaliacao" element={<AutoavaliacaoPagina />} />
              <Route path="/meu-pdi" element={<PdiPagina />} />
              <Route path="/meus-indicadores" element={<MeusIndicadoresPagina />} />
            </>
          )}
          <Route path="*" element={<Navigate to={inicio} replace />} />
        </Routes>
      )}
    </Layout>
  );
}
