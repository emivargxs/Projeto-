import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { Client } from 'pg';
import { urlDoBanco } from '../compartilhado/ambiente';

/**
 * Dados de demonstração baseados no protótipo do Figma e na apresentação da Cestacorp.
 * Apaga tudo e recria. Nomes de colaboradores e faixas salariais são fictícios.
 */

type NivelEscada = 'coordenador' | 'analista_senior' | 'analista_pleno' | 'analista_junior' | 'assistente' | 'auxiliar' | 'estagiario';

const ESCADA_COMPLETA: NivelEscada[] = ['coordenador', 'analista_senior', 'analista_pleno', 'analista_junior', 'assistente', 'auxiliar', 'estagiario'];
const ESCADA_CURTA: NivelEscada[] = ['analista_junior', 'assistente', 'auxiliar', 'estagiario'];

const ORDEM: Record<NivelEscada, number> = {
  estagiario: 1, auxiliar: 2, assistente: 3, analista_junior: 4, analista_pleno: 5, analista_senior: 6, coordenador: 7,
};

const SALARIO: Record<NivelEscada, [number, number]> = {
  estagiario: [1400, 1800], auxiliar: [1900, 2400], assistente: [2500, 3200], analista_junior: [3300, 4300],
  analista_pleno: [4500, 6000], analista_senior: [6200, 8000], coordenador: [8500, 11000],
};

interface AreaSeed {
  nome: string;
  sufixo?: string; // como o cargo é nomeado: "Analista Fiscal Pleno", "Analista de DP Pleno"
  escada?: NivelEscada[];
  apoio?: boolean;
  cargoUnico?: string;
}

const DIRETORIAS: { nome: string; diretor: string; areas: AreaSeed[] }[] = [
  {
    nome: 'Diretoria de Operações',
    diretor: 'Diretor de Operações',
    areas: [
      { nome: 'Perícia', apoio: true },
      { nome: 'Financeiro', apoio: true },
      { nome: 'Fiscal', sufixo: 'Fiscal', escada: ESCADA_COMPLETA },
      { nome: 'Departamento Pessoal', sufixo: 'de DP', escada: ESCADA_COMPLETA },
      { nome: 'Contábil', sufixo: 'Contábil', escada: ESCADA_COMPLETA },
    ],
  },
  {
    nome: 'Diretoria de Negócios e Relacionamento',
    diretor: 'Diretor de Negócios e Relacionamento',
    areas: [
      { nome: 'Controles Internos', sufixo: 'de Controles Internos', escada: ESCADA_COMPLETA },
      { nome: 'Societário', apoio: true },
      { nome: 'Sucesso do Cliente', cargoUnico: 'Analista de Sucesso do Cliente' },
      { nome: 'Atendimento', sufixo: 'de Atendimento', escada: ESCADA_CURTA },
      { nome: 'Administrativo', sufixo: 'Administrativo', escada: ESCADA_CURTA },
      { nome: 'Comercial', sufixo: 'Comercial', escada: ESCADA_COMPLETA },
      { nome: 'Marketing', apoio: true },
    ],
  },
];

function nomeDoCargo(nivel: NivelEscada, sufixo: string): string {
  switch (nivel) {
    case 'coordenador': return `Coordenador ${sufixo}`;
    case 'analista_senior': return `Analista ${sufixo} Sênior`;
    case 'analista_pleno': return `Analista ${sufixo} Pleno`;
    case 'analista_junior': return `Analista ${sufixo} Júnior`;
    case 'assistente': return `Assistente ${sufixo}`;
    case 'auxiliar': return `Auxiliar ${sufixo}`;
    case 'estagiario': return `Estagiário ${sufixo}`;
  }
}

function descricaoGenerica(area: string, nivel: NivelEscada) {
  const lidera = nivel === 'coordenador' || nivel === 'analista_senior';
  return {
    responsabilidades: [
      `Executar as rotinas da área ${area} no ERP com qualidade e dentro do prazo.`,
      `Organizar e arquivar os documentos digitais e físicos da área ${area}.`,
      `Atender clientes internos e externos sobre assuntos da área ${area}.`,
      ...(lidera ? [`Orientar e revisar o trabalho dos níveis anteriores da área ${area}.`] : []),
      'Cumprir a trilha de conhecimentos do cargo.',
    ],
    conhecimentos: [`Rotinas da área ${area}`, 'Uso do ERP e das ferramentas Google'],
    habilidades: ['Organização das entregas do mês', 'Conferência e atenção a detalhes'],
    atitudes: ['Cumprimento de prazos', 'Comunicação com clientes e equipe'],
    indicadores: ['Entregas no prazo', 'Retrabalhos por mês', 'Trilha obrigatória concluída'],
  };
}

const DESCRICAO_ANALISTA_FISCAL_PLENO = {
  responsabilidades: [
    'Apurar impostos do Simples Nacional e Lucro Presumido.',
    'Entregar obrigações acessórias dentro do prazo.',
    'Conferir lançamentos fiscais no ERP.',
    'Orientar assistentes e auxiliares do setor.',
    'Cumprir a trilha de conhecimentos do cargo.',
  ],
  conhecimentos: ['Legislação do Simples Nacional e Lucro Presumido', 'Rotinas fiscais no ERP'],
  habilidades: ['Apuração e conferência de impostos', 'Organização do fechamento mensal'],
  atitudes: ['Cumprimento de prazos', 'Comunicação com clientes e equipe'],
  indicadores: ['Obrigações entregues no prazo', 'Retrabalhos por mês', 'Trilha obrigatória concluída', 'Clientes na carteira'],
};

// Cursos: os da planilha "Trilha de Conhecimentos" da cliente + alguns por área
const CURSOS: [string, string, string, string, number, number, string][] = [
  ['Excel Básico', 'Excel Básico', 'Fundação Bradesco', 'online', 12, 0, 'https://www.ev.org.br/cursos/microsoft-excel-2016-basico'],
  ['Word na Prática', 'Word Básico', 'Fundação Bradesco', 'online', 4, 0, 'https://www.ev.org.br/cursos/word-na-pratica'],
  ['Comunicação Verbal e Não Verbal', 'Ortografia e gramática', 'Cefis', 'online', 8, 0, 'https://cefis.com.br/curso/comunicacao-verbal-e-nao-verbal/4024'],
  ['Atendimento de excelência e experiência do cliente', 'Excelência no atendimento ao cliente', 'Cefis', 'online', 10, 0, 'https://cefis.com.br/curso/atendimento-de-excelencia-e-experiencia-do-cliente/2281'],
  ['Treinamentos no canal Digisac', 'HUBLX', 'Digisac', 'video', 3, 0, 'https://www.youtube.com/@DigiSacPlataformaMulticanal'],
  ['Manuais Digisac', 'HUBLX', 'Digisac', 'leitura', 2, 0, 'https://digisac.gitbook.io/manual-digisac-2-0'],
  ['Como usar o Google Drive', 'Google Drive', 'YouTube', 'video', 1, 0, 'https://www.youtube.com/watch?v=ksm_0Jo1Cg8'],
  ['Google Forms: o que é e para que serve', 'Google Forms', 'YouTube', 'video', 1, 0, 'https://www.youtube.com/watch?v=vMWvyfpOfTs'],
  ['Como usar o Google Agenda passo a passo', 'Google Agenda', 'YouTube', 'video', 1, 0, 'https://www.youtube.com/watch?v=IF_9ktE-VIQ'],
  ['5 truques do Google Meet', 'Google Meet', 'YouTube', 'video', 1, 0, 'https://www.youtube.com/watch?v=wTUAGJ6vcq4'],
  ['Inteligência Artificial: fundamentos e aplicações práticas', 'ChatGPT', 'Cefis', 'online', 6, 0, 'https://cefis.com.br/curso/inteligencia-artificial-fundamentos-e-aplicacoes-praticas/4406'],
  ['LGPD e proteção de dados', 'Segurança da informação', 'Cefis', 'online', 2, 0, 'https://cefis.com.br'],
  ['Planejamento tributário', 'Visão estratégica', 'Cefis', 'online', 20, 390, 'https://cefis.com.br'],
  ['Apuração do Simples Nacional', 'Simples Nacional', 'Cefis', 'online', 4, 0, 'https://cefis.com.br'],
  ['Excel Avançado', 'Excel Avançado', 'Fundação Bradesco', 'online', 16, 0, 'https://www.ev.org.br'],
  ['Rotinas de Departamento Pessoal e eSocial', 'eSocial', 'Cefis', 'online', 8, 0, 'https://cefis.com.br'],
  ['Fechamento contábil', 'Contabilidade societária', 'Cefis', 'online', 10, 0, 'https://cefis.com.br'],
  ['Técnicas de negociação', 'Negociação', 'Sebrae', 'online', 6, 0, 'https://sebrae.com.br'],
  ['Gestão do tempo', 'Produtividade', 'Fundação Bradesco', 'online', 5, 0, 'https://www.ev.org.br'],
  ['Liderança de equipes', 'Liderança', 'Sebrae', 'online', 8, 0, 'https://sebrae.com.br'],
  ['Controles internos e compliance', 'Controles internos', 'Cefis', 'online', 8, 0, 'https://cefis.com.br'],
  ['Matemática financeira', 'Finanças', 'Fundação Bradesco', 'online', 10, 0, 'https://www.ev.org.br'],
];

const TRANSVERSAIS = ['Word na Prática', 'Comunicação Verbal e Não Verbal', 'Como usar o Google Agenda passo a passo', 'Inteligência Artificial: fundamentos e aplicações práticas', 'LGPD e proteção de dados'];
const POR_AREA: Record<string, string[]> = {
  Fiscal: ['Excel Básico', 'Apuração do Simples Nacional', 'Como usar o Google Drive'],
  'Departamento Pessoal': ['Rotinas de Departamento Pessoal e eSocial', 'Excel Básico'],
  Contábil: ['Excel Básico', 'Fechamento contábil'],
  'Controles Internos': ['Controles internos e compliance', 'Excel Básico'],
  'Sucesso do Cliente': ['Atendimento de excelência e experiência do cliente'],
  Atendimento: ['Atendimento de excelência e experiência do cliente', 'Treinamentos no canal Digisac', 'Manuais Digisac'],
  Administrativo: ['Excel Básico', 'Matemática financeira'],
  Comercial: ['Técnicas de negociação', 'Atendimento de excelência e experiência do cliente'],
};

// [nome, iniciais, cargo, perfil, início no cargo]
const PESSOAS: [string, string, string, 'gestor' | 'colaborador', string][] = [
  ['Rafael Lima', 'RL', 'Coordenador Fiscal', 'gestor', '2023-03-01'],
  ['Larissa Melo', 'LM', 'Coordenador de Controles Internos', 'gestor', '2023-06-01'],
  ['Maria Costa', 'MC', 'Analista Fiscal Pleno', 'colaborador', '2025-03-01'],
  ['Beatriz Souza', 'BS', 'Analista Fiscal Sênior', 'colaborador', '2024-02-01'],
  ['Lucas Santos', 'LS', 'Assistente Fiscal', 'colaborador', '2026-08-12'],
  ['João Pereira', 'JP', 'Estagiário Contábil', 'colaborador', '2026-08-11'],
  ['Ana Lopes', 'AL', 'Analista Contábil Pleno', 'colaborador', '2025-01-10'],
  ['Camila Alves', 'CA', 'Auxiliar de DP', 'colaborador', '2026-09-01'],
  ['Juliana Dias', 'JD', 'Analista de DP Pleno', 'colaborador', '2024-05-01'],
  ['Pedro Martins', 'PM', 'Analista de Controles Internos Júnior', 'colaborador', '2025-06-01'],
  ['Bianca Rocha', 'BR', 'Assistente de Atendimento', 'colaborador', '2026-07-15'],
  ['Fernanda Reis', 'FR', 'Analista Comercial Júnior', 'colaborador', '2025-09-01'],
  ['Gabriel Nunes', 'GN', 'Assistente Administrativo', 'colaborador', '2025-11-01'],
];

const RESUMOS = [
  'Revisei os conceitos do curso e já apliquei na rotina: organizei meus controles e reduzi o tempo de conferência.',
  'O curso trouxe exemplos práticos que vou usar no atendimento aos clientes e na organização das minhas entregas.',
  'Aprendi atalhos e boas práticas que deixam o trabalho mais rápido e com menos retrabalho no fechamento do mês.',
];

/** Gerador pseudoaleatório determinístico, para o seed sair sempre igual. */
function aleatorio(semente: number) {
  let s = semente;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

async function popular() {
  const db = new Client({ connectionString: urlDoBanco() });
  await db.connect();
  const q = async <T = Record<string, unknown>>(sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows as T[];

  await q('BEGIN');
  await q(`TRUNCATE avaliacao_resultado, avaliacao_criterio, avaliacao, pdi_acao, pdi, conclusao, inscricao, meta_horas,
                    cargo_curso, colaborador, cargo, area, diretoria, curso RESTART IDENTITY CASCADE`);

  // ---- Catálogo
  const cursoId = new Map<string, number>();
  for (const [nome, competencia, entidade, modalidade, carga, investimento, link] of CURSOS) {
    const [c] = await q<{ id: number }>(
      'INSERT INTO curso (nome, competencia, entidade, modalidade, carga_horas, investimento, link) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [nome, competencia, entidade, modalidade, carga, investimento, link],
    );
    cursoId.set(nome, c.id);
  }
  const carga = new Map(CURSOS.map((c) => [cursoId.get(c[0])!, c[4]]));

  // ---- Organograma, cargos e trilhas obrigatórias
  const cargoId = new Map<string, number>();
  const cargoArea = new Map<number, string>();
  for (const [di, d] of DIRETORIAS.entries()) {
    const [dir] = await q<{ id: number }>('INSERT INTO diretoria (nome, diretor, ordem) VALUES ($1,$2,$3) RETURNING id', [d.nome, d.diretor, di]);
    for (const [ai, a] of d.areas.entries()) {
      const [area] = await q<{ id: number }>('INSERT INTO area (diretoria_id, nome, apoio, ordem) VALUES ($1,$2,$3,$4) RETURNING id', [dir.id, a.nome, !!a.apoio, ai]);
      if (a.apoio) {
        await q(`INSERT INTO cargo (area_id, nome, nivel, ordem) VALUES ($1,$2,'apoio',0)`, [area.id, a.nome]);
        continue;
      }
      if (a.cargoUnico) {
        const [c] = await q<{ id: number }>(
          `INSERT INTO cargo (area_id, nome, nivel, ordem, descricao, formacao, experiencia, salario_min, salario_max)
           VALUES ($1,$2,'analista_junior',4,$3,'Ensino superior em andamento','1 ano em atendimento',$4,$5) RETURNING id`,
          [area.id, a.cargoUnico, descricaoGenerica(a.nome, 'analista_junior'), ...SALARIO.analista_junior],
        );
        cargoId.set(a.cargoUnico, c.id);
        cargoArea.set(c.id, a.nome);
        continue;
      }
      let acima: number | null = null;
      for (const nivel of a.escada!) {
        const nome = nomeDoCargo(nivel, a.sufixo!);
        const descricao = nome === 'Analista Fiscal Pleno' ? DESCRICAO_ANALISTA_FISCAL_PLENO : descricaoGenerica(a.nome, nivel);
        const formacao = nivel === 'estagiario' ? 'Ensino superior em andamento' : nome === 'Analista Fiscal Pleno' ? 'Ciências Contábeis (cursando ou completo)' : 'Ensino superior na área';
        const experiencia = nome === 'Analista Fiscal Pleno' ? '2 anos em rotinas fiscais' : nivel === 'estagiario' ? 'Não exigida' : `${Math.max(0, ORDEM[nivel] - 2)} anos na área`;
        const [c]: { id: number }[] = await q<{ id: number }>(
          `INSERT INTO cargo (area_id, nome, nivel, ordem, coordenacao, descricao, formacao, experiencia, proximo_cargo_id, salario_min, salario_max)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
          [area.id, nome, nivel, ORDEM[nivel], nivel === 'coordenador', descricao, formacao, experiencia, acima, ...SALARIO[nivel]],
        );
        cargoId.set(nome, c.id);
        cargoArea.set(c.id, a.nome);
        acima = c.id;
      }
    }
  }
  for (const [id, area] of cargoArea) {
    for (const nome of [...TRANSVERSAIS, ...(POR_AREA[area] ?? [])]) {
      await q('INSERT INTO cargo_curso (cargo_id, curso_id, prazo_dias, vinculado_em) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [
        id, cursoId.get(nome), nome.startsWith('Como usar') || nome.includes('LGPD') ? 30 : 90, '2026-01-05',
      ]);
    }
  }

  // ---- Metas de horas por nível
  for (const [nivel, horas] of Object.entries({ estagiario: 3, auxiliar: 4, assistente: 4, analista_junior: 5, analista_pleno: 5, analista_senior: 5, coordenador: 6 })) {
    await q('INSERT INTO meta_horas (nivel, horas_mes) VALUES ($1,$2)', [nivel, horas]);
  }

  // ---- Pessoas
  const pessoaId = new Map<string, number>();
  for (const [nome, iniciais, cargo, perfil, inicio] of PESSOAS) {
    const gestor = perfil === 'gestor' ? null : cargoArea.get(cargoId.get(cargo)!) === 'Controles Internos' ? pessoaId.get('Larissa Melo') : pessoaId.get('Rafael Lima');
    const [p] = await q<{ id: number }>(
      'INSERT INTO colaborador (nome, iniciais, perfil, cargo_id, gestor_id, inicio_no_cargo) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [nome, iniciais, perfil, cargoId.get(cargo), gestor ?? null, inicio],
    );
    pessoaId.set(nome, p.id);
  }

  // ---- PDIs (ciclo 2026)
  const pdis: Record<string, [string, string, string, string, number, string | null][]> = {
    'Maria Costa': [
      ['Concluir Excel Avançado', 'Curso Fundação Bradesco · 2h por semana', 'Maria Costa', '2026-10-30', 50, 'Excel Avançado'],
      ['Entregar fechamento de setembro', 'Fechamento completo com revisão do coordenador', 'Maria Costa', '2026-09-30', 100, null],
      ['Treinar 2 assistentes', 'Acompanhar as rotinas do setor por 2 semanas', 'Maria Costa', '2026-11-30', 50, null],
      ['Realizar 5 encontros de mentoria', 'Encontros quinzenais com registro', 'Maria / João', '2026-12-15', 80, null],
      ['Fazer o curso de Planejamento tributário', 'Base para assumir clientes do Lucro Real', 'Maria Costa', '2026-11-30', 0, 'Planejamento tributário'],
    ],
    'Beatriz Souza': [
      ['Fazer o curso Liderança de equipes', 'Preparação para a coordenação', 'Beatriz Souza', '2026-06-30', 100, 'Liderança de equipes'],
      ['Conduzir a reunião mensal do setor', 'Com pauta e ata enviadas ao coordenador', 'Beatriz Souza', '2026-12-10', 75, null],
    ],
    'Ana Lopes': [
      ['Fazer o curso Gestão do tempo', 'Organizar a agenda do fechamento', 'Ana Lopes', '2026-09-15', 0, 'Gestão do tempo'],
      ['Assumir 3 clientes do Lucro Presumido', 'Com revisão do coordenador no 1º mês', 'Ana Lopes', '2026-12-01', 30, null],
    ],
    'Juliana Dias': [
      ['Fazer o curso Excel Avançado', 'Automatizar a planilha de férias', 'Juliana Dias', '2026-11-15', 0, 'Excel Avançado'],
      ['Mapear o processo de admissão', 'Fluxo documentado no Drive', 'Juliana Dias', '2026-08-30', 100, null],
    ],
  };
  for (const [nome, acoes] of Object.entries(pdis)) {
    const [p] = await q<{ id: number }>(`INSERT INTO pdi (colaborador_id, ciclo, inicio, fim) VALUES ($1,'2026','2026-01-01','2026-12-31') RETURNING id`, [pessoaId.get(nome)]);
    for (const [oQue, como, resp, prazo, prog, curso] of acoes) {
      await q('INSERT INTO pdi_acao (pdi_id, o_que_fazer, como_fazer, responsavel, prazo, progresso, curso_id) VALUES ($1,$2,$3,$4,$5,$6,$7)', [
        p.id, oQue, como, resp, prazo, prog, curso ? cursoId.get(curso) : null,
      ]);
    }
  }

  // ---- Histórico de treinamentos (conclusões validadas de jan a set + algumas em outubro)
  const reservados: Record<string, string[]> = {
    'Maria Costa': ['Excel Básico', 'Excel Avançado', 'Planejamento tributário', 'Apuração do Simples Nacional'],
    'Lucas Santos': ['Word na Prática', 'Excel Básico', 'Apuração do Simples Nacional'],
    'João Pereira': [...TRANSVERSAIS, ...POR_AREA['Contábil']],
    'Camila Alves': ['Rotinas de Departamento Pessoal e eSocial', 'Excel Básico', 'Word na Prática', 'Comunicação Verbal e Não Verbal'],
    'Ana Lopes': ['Gestão do tempo'],
    'Juliana Dias': ['Excel Avançado'],
  };
  const quantos: Record<string, number> = {
    'Maria Costa': 11, 'Beatriz Souza': 14, 'Lucas Santos': 3, 'João Pereira': 0, 'Ana Lopes': 9, 'Camila Alves': 2,
    'Juliana Dias': 10, 'Pedro Martins': 7, 'Bianca Rocha': 5, 'Fernanda Reis': 6, 'Gabriel Nunes': 5,
  };
  const outubro: Record<string, number> = { 'Maria Costa': 2, 'Beatriz Souza': 4, 'Lucas Santos': 3, 'Ana Lopes': 1, 'Juliana Dias': 2, 'Pedro Martins': 1 };
  const curtos = ['Como usar o Google Drive', 'Google Forms: o que é e para que serve', 'Como usar o Google Agenda passo a passo', '5 truques do Google Meet'];

  const gestorId = pessoaId.get('Rafael Lima')!;
  const rnd = aleatorio(42);
  const inserirConclusao = async (pessoa: string, curso: string, data: string, origem: string, status: 'concluido' | 'enviado', extra: Record<string, unknown> = {}) => {
    const cid = cursoId.get(curso)!;
    const [insc] = await q<{ id: number }>(
      'INSERT INTO inscricao (colaborador_id, curso_id, origem, status, iniciada_em) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [pessoaId.get(pessoa), cid, origem, status, data],
    );
    await q(
      `INSERT INTO conclusao (inscricao_id, data_realizacao, codigo_certificado, carga_horas, investimento, resumo, nota_conteudo, nota_didatica,
                              nota_aplicabilidade, certificado_nome, certificado_arquivo, status, enviado_em, validado_em, validado_por, eficacia)
       VALUES ($1,$2,$3,$4,0,$5,$6,$7,$8,$9,'exemplo-certificado.pdf',$10,$11,$12,$13,$14)`,
      [
        insc.id, data, `CERT-2026-${10000 + insc.id * 37}`, carga.get(cid), RESUMOS[insc.id % RESUMOS.length],
        4 + Math.round(rnd()), 3 + Math.round(rnd() * 2), 4 + Math.round(rnd()), `certificado_${curso.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30)}.pdf`,
        status, extra.enviadoEm ?? data, status === 'concluido' ? (extra.validadoEm ?? data) : null, status === 'concluido' ? gestorId : null,
        extra.eficacia ?? (status === 'concluido' && data < '2026-09-01' ? ['aplicou_plenamente', 'aplicou_parcialmente', 'superou'][insc.id % 3] : null),
      ],
    );
  };

  for (const [nome, , cargo, perfil, inicio] of PESSOAS) {
    if (perfil === 'gestor') continue;
    const area = cargoArea.get(cargoId.get(cargo)!)!;
    const proibidos = new Set([...(reservados[nome] ?? []), ...curtos]);
    const gerais = ['Gestão do tempo', 'Matemática financeira', 'Liderança de equipes', 'Excel Avançado'];
    const ordem = [...TRANSVERSAIS, ...(POR_AREA[area] ?? []), ...gerais].filter((c, i, arr) => arr.indexOf(c) === i && !proibidos.has(c));
    const escolhidos = ordem.slice(0, quantos[nome] ?? 0);
    const mesInicio = Math.max(1, Number(inicio.slice(0, 4)) < 2026 ? 1 : Number(inicio.slice(5, 7)));
    for (const [i, curso] of escolhidos.entries() as IterableIterator<[number, string]>) {
      const mes = mesInicio + (i % Math.max(1, 10 - mesInicio));
      if (mes > 9) continue;
      const dia = 3 + Math.floor(rnd() * 24);
      const doPdi = (pdis[nome] ?? []).some((acao) => acao[5] === curso);
      await inserirConclusao(nome, curso, `2026-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`, doPdi ? 'pdi' : 'obrigatorio', 'concluido');
    }
    // horas de outubro com cursos curtos (1h cada)
    for (let i = 0; i < (outubro[nome] ?? 0); i++) {
      await inserirConclusao(nome, curtos[i], `2026-10-0${1 + i}`, 'obrigatorio', 'concluido');
    }
  }

  // Situações para a demonstração das telas
  await inserirConclusao('Maria Costa', 'Excel Básico', '2026-10-05', 'obrigatorio', 'enviado', { enviadoEm: '2026-10-06' });
  await inserirConclusao('Lucas Santos', 'Word na Prática', '2026-10-02', 'obrigatorio', 'enviado', { enviadoEm: '2026-10-03' });
  await inserirConclusao('Maria Costa', 'Apuração do Simples Nacional', '2026-09-05', 'obrigatorio', 'concluido', { validadoEm: '2026-09-08', eficacia: null });
  await inserirConclusao('Juliana Dias', 'Excel Avançado', '2026-08-20', 'pdi', 'concluido', { validadoEm: '2026-08-22', eficacia: null });
  await q(`UPDATE pdi_acao SET progresso = 100 WHERE curso_id = $1 AND pdi_id = (SELECT id FROM pdi WHERE colaborador_id = $2)`, [cursoId.get('Excel Avançado'), pessoaId.get('Juliana Dias')]);
  await q(`INSERT INTO inscricao (colaborador_id, curso_id, origem, status, iniciada_em) VALUES ($1,$2,'pdi','em_andamento','2026-09-20')`, [pessoaId.get('Maria Costa'), cursoId.get('Excel Avançado')]);

  // ---- Avaliações anuais (ciclo 2026)
  const avaliar = async (pessoa: string, etapa: string, criterios: [string, string, string | null, string | null, string | null][], resultados: [string, string, string, boolean][], objetivos = '', comentario = '') => {
    const [a] = await q<{ id: number }>('INSERT INTO avaliacao (colaborador_id, ciclo, etapa, objetivos_5_anos, comentario_resultados) VALUES ($1,$2,$3,$4,$5) RETURNING id', [
      pessoaId.get(pessoa), '2026', etapa, objetivos, comentario,
    ]);
    for (const [i, [grupo, texto, auto, gestor, consenso]] of criterios.entries()) {
      await q('INSERT INTO avaliacao_criterio (avaliacao_id, grupo, texto, ordem, auto, gestor, consenso) VALUES ($1,$2,$3,$4,$5,$6,$7)', [a.id, grupo, texto, i, auto, gestor, consenso]);
    }
    for (const [i, [indicador, meta, realizado, atingido]] of resultados.entries()) {
      await q('INSERT INTO avaliacao_resultado (avaliacao_id, indicador, meta, realizado, atingido, ordem) VALUES ($1,$2,$3,$4,$5,$6)', [a.id, indicador, meta, realizado, atingido, i]);
    }
  };
  await avaliar(
    'Maria Costa',
    'consenso',
    [
      ['conhecimentos', 'Legislação do Simples Nacional e Lucro Presumido', 'atende_plenamente', 'atende_plenamente', 'atende_plenamente'],
      ['conhecimentos', 'Rotinas fiscais no ERP', 'supera', 'atende_plenamente', 'atende_plenamente'],
      ['habilidades', 'Apuração e conferência de impostos', 'atende_plenamente', 'atende_plenamente', 'atende_plenamente'],
      ['habilidades', 'Organização do fechamento mensal', 'atende_plenamente', 'atende_parcialmente', null],
      ['atitudes', 'Cumprimento de prazos', 'supera', 'supera', 'supera'],
      ['atitudes', 'Comunicação com clientes e equipe', 'atende_plenamente', 'supera', null],
    ],
    [
      ['Obrigações entregues no prazo', '100%', '98%', false],
      ['Retrabalhos por mês', 'até 2', '1', true],
      ['Trilha obrigatória concluída', '100%', '88%', false],
      ['Clientes na carteira', '20', '22', true],
    ],
    'Quero chegar a Coordenadora Fiscal, concluir uma pós em planejamento tributário e assumir a carteira de clientes do Lucro Real.',
    'Duas entregas atrasaram em março por falta de documentos dos clientes.',
  );
  const generica = (auto: string | null, gestor: string | null): [string, string, string | null, string | null, string | null][] => [
    ['conhecimentos', 'Rotinas da área', auto, gestor, null],
    ['conhecimentos', 'Uso do ERP e das ferramentas Google', auto, gestor, null],
    ['habilidades', 'Organização das entregas do mês', auto, gestor, null],
    ['habilidades', 'Conferência e atenção a detalhes', auto, gestor, null],
    ['atitudes', 'Cumprimento de prazos', auto, gestor, null],
    ['atitudes', 'Comunicação com clientes e equipe', auto, gestor, null],
  ];
  const resultadosGenericos: [string, string, string, boolean][] = [
    ['Entregas no prazo', '', '', false], ['Retrabalhos por mês', '', '', false], ['Trilha obrigatória concluída', '', '', false],
  ];
  await avaliar('Lucas Santos', 'autoavaliacao', generica(null, null), resultadosGenericos);
  await avaliar('Beatriz Souza', 'avaliacao_gestor', generica('atende_plenamente', null), resultadosGenericos, 'Assumir a coordenação fiscal em até 3 anos.');

  await q('COMMIT');

  // Certificado de exemplo para as conclusões do seed
  const pastaUploads = resolve(process.cwd(), 'uploads');
  mkdirSync(pastaUploads, { recursive: true });
  writeFileSync(resolve(pastaUploads, 'exemplo-certificado.pdf'), PDF_DE_EXEMPLO);

  const [{ n }] = await q<{ n: number }>('SELECT count(*)::int AS n FROM conclusao');
  console.log(`Banco populado: ${PESSOAS.length} pessoas, ${CURSOS.length} cursos, ${cargoId.size} cargos, ${n} conclusões.`);
  await db.end();
}

const PDF_DE_EXEMPLO = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 300]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 88>>stream
BT /F1 22 Tf 60 200 Td (Certificado de conclusao) Tj 0 -40 Td /F1 12 Tf (Arquivo de exemplo) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF
`;

popular().catch((erro) => {
  console.error('Falha ao popular o banco:', erro);
  process.exit(1);
});
