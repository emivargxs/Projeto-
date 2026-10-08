#!/usr/bin/env node
/**
 * Garante a regra do monolito modular: "módulos só se falam pela interface pública".
 * Um arquivo de modulos/<a>/ só pode importar outro módulo pelo index dele
 * (ex.: '../pessoas' ✔, '../pessoas/pessoas.api' ✘, '../../pessoas/casos-de-uso/x' ✘).
 * Vale para a API e para o front.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, relative, resolve, sep } from 'path';
import { fileURLToPath } from 'url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pastasDeModulos = ['apps/api/src/modulos', 'apps/web/src/modulos'].map((p) => join(raiz, p));

function arquivos(pasta) {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.(ts|tsx)$/.test(nome) ? [caminho] : [];
  });
}

const violacoes = [];
for (const base of pastasDeModulos) {
  let lista;
  try {
    lista = arquivos(base);
  } catch {
    continue;
  }
  for (const arquivo of lista) {
    const moduloAtual = relative(base, arquivo).split(sep)[0];
    const fonte = readFileSync(arquivo, 'utf8');
    for (const [, alvo] of fonte.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
      const destino = resolve(dirname(arquivo), alvo);
      const rel = relative(base, destino);
      if (rel.startsWith('..')) continue; // fora de modulos/ (compartilhado, etc.)
      const [moduloAlvo, ...resto] = rel.split(sep);
      if (moduloAlvo === moduloAtual) continue;
      if (resto.length === 0 || (resto.length === 1 && resto[0] === 'index')) continue;
      violacoes.push(`${relative(raiz, arquivo)} → '${alvo}' (use '${moduloAlvo}' pelo index)`);
    }
  }
}

if (violacoes.length) {
  console.error(`✘ ${violacoes.length} import(s) atravessando a fronteira de um módulo:\n  ${violacoes.join('\n  ')}`);
  process.exit(1);
}
console.log('✔ Fronteiras respeitadas: os módulos só se falam pela interface pública.');
