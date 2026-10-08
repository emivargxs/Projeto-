import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { carregarAmbiente } from './compartilhado/ambiente';
import { FiltroDeErros } from './compartilhado/filtro-de-erros';

async function iniciar() {
  carregarAmbiente();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new FiltroDeErros());
  app.enableCors({ origin: true });
  const porta = Number(process.env.PORT ?? 3333);
  await app.listen(porta);
  new Logger('API').log(`API rodando em http://localhost:${porta}/api`);
}

iniciar();
