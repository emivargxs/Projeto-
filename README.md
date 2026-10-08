# Cestacorp · Evolução de Treinamentos

Sistema do **Projeto Service Learning 2026/2 (PUCRS)** para a Cestacorp. Ele substitui as planilhas de
organograma, cargos e salários, trilha de conhecimentos, avaliação de desempenho e PDI.

O escopo é a dor **Evolução de Treinamentos**. A Gincana Solidária ficou de fora.

## Stack

| Camada | Tecnologia |
|---|---|
| Linguagem | TypeScript (front e API) |
| Front | React + Vite (`apps/web`) |
| API | NestJS (`apps/api`) |
| Banco | PostgreSQL (SQL explícito com `pg`) |
| Contratos | Zod (`packages/contracts`), usados pelo front e pela API |
| Monorepo | npm workspaces |

## Como rodar no VS Code

**Pré-requisitos:** Node.js 20 ou mais novo, e **Docker Desktop** (ou um PostgreSQL instalado na máquina).

1. Abra a pasta `cestacorp-treinamentos` no VS Code (*File → Open Folder*).
2. Abra o terminal (*Terminal → New Terminal*) e rode:

```bash
cp .env.example .env          # no Windows (PowerShell): copy .env.example .env
docker compose up -d          # sobe o PostgreSQL na porta 5432
npm install                   # instala tudo (front, API e contratos)
npm run db:setup              # cria as tabelas e carrega os dados de demonstração
npm run dev                   # sobe a API (porta 3333) e o front (porta 5173)
```

3. Abra **http://localhost:5173** no navegador.

Se usar um PostgreSQL próprio em vez do Docker, crie um banco vazio e ajuste o `DATABASE_URL` no `.env`.

### Usuários de exemplo

O login ainda é simplificado. No canto inferior esquerdo há o seletor **"Entrar como"**:

| Quem | Perfil | O que mostrar |
|---|---|---|
| Rafael Lima | Gestor | Trilhas da equipe, validar certificados, consenso da avaliação, indicadores, metas e pins |
| Maria Costa | Colaboradora | Minha trilha com aviso de atraso, pins, ranking, concluir curso, PDI |
| Lucas Santos | Colaborador | Autoavaliação aberta (etapa 1) |
| Beatriz Souza | Colaboradora | 1ª do ranking; avaliação aguardando o gestor |

Os dados são fictícios. O `.env` fixa a data de "hoje" em **15/10/2026** (`DATA_REFERENCIA`), para a
demonstração ficar igual ao protótipo. Apague essa linha para usar a data real.

Para voltar os dados ao estado inicial, rode `npm run db:seed`.

## Arquitetura: monolito modular

- **Módulos por domínio**, os mesmos na API (`apps/api/src/modulos`) e no front (`apps/web/src/modulos`):

| Módulo | Responsabilidade |
|---|---|
| `catalogo` | Cursos externos (Fundação Bradesco, Cefis, YouTube…) |
| `pessoas` | Colaboradores, organograma, cargos e salários, trilha obrigatória do cargo |
| `pdi` | Plano de desenvolvimento individual: o que fazer, responsável, prazo, acompanhamento |
| `trilhas` | Minha trilha, conclusão com certificado, validação, eficácia, metas de horas, aviso de atraso |
| `avaliacao` | Avaliação anual: autoavaliação → gestor → consenso; resultados esperados; objetivos de 5 anos |
| `indicadores` | Hora-homem, % de cumprimento das trilhas, horas mês a mês |
| `gamificacao` | Pins e ranking do time |

- **Vertical slices: 1 caso de uso = da tela ao banco.** Por exemplo, "concluir curso" passa por:
  - `apps/web/src/modulos/trilhas/concluir-curso.tsx` (tela)
  - `RegistrarConclusaoBody` em `packages/contracts/src/trilhas.ts` (contrato)
  - `apps/api/src/modulos/trilhas/trilhas.controller.ts` (rota)
  - `apps/api/src/modulos/trilhas/casos-de-uso/registrar-conclusao.ts` (regra e SQL)
- **Módulos só se falam pela interface pública.** Cada módulo tem um `index.ts` que exporta o que os
  outros podem usar (na API, a classe `*Api`). Um módulo nunca importa um arquivo interno de outro e
  nunca lê tabelas de outro módulo. Para conferir:

```bash
npm run lint:fronteiras
```

Dependências entre módulos da API (sem ciclos):

```
catalogo ← pessoas ← pdi ← trilhas ← indicadores
                                   ← gamificacao
avaliacao → pessoas, pdi
```

### Estrutura de pastas

```
packages/contracts/src/      contratos Zod (um arquivo por módulo)
apps/api/src/
  compartilhado/             banco, validação Zod, datas, filtro de erros
  db/migracoes/*.sql         estrutura do banco (blocos por módulo)
  db/popular.ts              dados de demonstração
  modulos/<modulo>/
    index.ts                 interface pública (Module + Api)
    <modulo>.api.ts          o que outros módulos podem chamar
    <modulo>.controller.ts   rotas HTTP
    casos-de-uso/*.ts        um arquivo por caso de uso, com o SQL dele
apps/web/src/
  compartilhado/             cliente da API, sessão, componentes visuais
  modulos/<modulo>/          telas do caso de uso + index.ts público
scripts/verificar-fronteiras.mjs
```

### Como adicionar um caso de uso

1. Crie ou ajuste o contrato em `packages/contracts/src/<modulo>.ts`.
2. Crie `apps/api/src/modulos/<modulo>/casos-de-uso/<caso>.ts`, registre-o no `providers` do `index.ts`
   do módulo e exponha a rota no controller.
3. Crie a tela em `apps/web/src/modulos/<modulo>/`, exporte-a no `index.ts` e registre a rota em `App.tsx`.
4. Rode `npm run typecheck` e `npm run lint:fronteiras`.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | API + front com recarregamento automático |
| `npm run db:setup` | Cria as tabelas e carrega os dados de demonstração |
| `npm run db:migrate` | Aplica migrações novas de `apps/api/src/db/migracoes` |
| `npm run db:seed` | Apaga e recarrega os dados de demonstração |
| `npm run typecheck` | Checa os tipos de tudo |
| `npm run build` | Gera o build de produção |
| `npm run lint:fronteiras` | Confere a regra "módulos só se falam pela interface pública" |

## Regras de negócio principais

- **Aviso de atraso:** horas esperadas até hoje = meta do mês do nível × dia de hoje ÷ dias do mês.
  Só contam as horas de cursos **validados** pelo gestor. A meta é editada em *Metas e pins*.
- **Prazo dos cursos obrigatórios:** conta a partir da entrada da pessoa no cargo (ou da inclusão do
  curso na trilha, se for depois).
- **Eficácia:** o gestor avalia 30 dias depois da data de realização do curso.
- **Curso do PDI:** quando o certificado é validado, a ação correspondente do PDI vai para 100%.
- **Pins:** os critérios ficam em `apps/api/src/modulos/gamificacao/regras.ts`. O ranking é ordenado
  por pins e, em caso de empate, por horas.
- **Avaliação anual:** o colaborador só vê a nota do gestor a partir da etapa de consenso.

## Limitações conhecidas (protótipo)

- **Login simplificado:** o front manda o cabeçalho `X-Usuario-Id`. Para produção, trocar por login
  (ex.: JWT) mantendo `UsuarioAtual` e `useSessao`.
- **Certificados no disco:** ficam em `apps/api/uploads/`. Para produção, usar um armazenamento de
  arquivos.
- **Sem tela de cadastro:** o cadastro de cursos e de colaboradores ficou fora do escopo. Esses dados
  vêm do `db:seed`.
- **Valores fictícios:** as faixas salariais do seed são inventadas.
