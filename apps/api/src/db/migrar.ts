import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import { urlDoBanco } from '../compartilhado/ambiente';

/** Aplica, em ordem, os arquivos .sql de src/db/migracoes que ainda não rodaram. */
async function migrar() {
  const pasta = join(__dirname, '../../src/db/migracoes');
  const cliente = new Client({ connectionString: urlDoBanco() });
  await cliente.connect();
  await cliente.query('CREATE TABLE IF NOT EXISTS _migracao (nome TEXT PRIMARY KEY, aplicada_em TIMESTAMPTZ DEFAULT now())');
  const aplicadas = new Set((await cliente.query('SELECT nome FROM _migracao')).rows.map((r) => r.nome as string));
  const arquivos = readdirSync(pasta).filter((f) => f.endsWith('.sql')).sort();
  for (const arquivo of arquivos) {
    if (aplicadas.has(arquivo)) continue;
    await cliente.query('BEGIN');
    try {
      await cliente.query(readFileSync(join(pasta, arquivo), 'utf8'));
      await cliente.query('INSERT INTO _migracao (nome) VALUES ($1)', [arquivo]);
      await cliente.query('COMMIT');
      console.log(`✔ ${arquivo}`);
    } catch (erro) {
      await cliente.query('ROLLBACK');
      throw erro;
    }
  }
  console.log('Banco atualizado.');
  await cliente.end();
}

migrar().catch((erro) => {
  console.error('Falha na migração:', erro.message);
  process.exit(1);
});
