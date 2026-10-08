import { Global, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { urlDoBanco } from './ambiente';

export interface Executor {
  consultar<T>(sql: string, parametros?: unknown[]): Promise<T[]>;
  primeiro<T>(sql: string, parametros?: unknown[]): Promise<T | null>;
}

function executorDe(alvo: Pool | PoolClient): Executor {
  return {
    async consultar<T>(sql: string, parametros: unknown[] = []) {
      return (await alvo.query(sql, parametros)).rows as T[];
    },
    async primeiro<T>(sql: string, parametros: unknown[] = []) {
      return ((await alvo.query(sql, parametros)).rows[0] as T) ?? null;
    },
  };
}

/**
 * Acesso ao PostgreSQL com SQL explícito. Cada caso de uso escreve as próprias consultas
 * e só toca as tabelas do seu módulo.
 */
@Injectable()
export class Banco implements Executor, OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: urlDoBanco() });
  private readonly executor = executorDe(this.pool);

  consultar<T>(sql: string, parametros: unknown[] = []) {
    return this.executor.consultar<T>(sql, parametros);
  }

  primeiro<T>(sql: string, parametros: unknown[] = []) {
    return this.executor.primeiro<T>(sql, parametros);
  }

  async transacao<T>(trabalho: (tx: Executor) => Promise<T>): Promise<T> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');
      const resultado = await trabalho(executorDe(cliente));
      await cliente.query('COMMIT');
      return resultado;
    } catch (erro) {
      await cliente.query('ROLLBACK');
      throw erro;
    } finally {
      cliente.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}

@Global()
@Module({ providers: [Banco], exports: [Banco] })
export class BancoModule {}
