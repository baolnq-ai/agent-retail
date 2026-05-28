import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { loadEnvironment } from './config/environment.js';
import { JsonLogger } from './utils/json-logger.js';

const environment = loadEnvironment();
const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
  logger: new JsonLogger(),
});

app.enableCors({
  origin: environment.corsOrigins,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['content-type', 'idempotency-key', 'x-correlation-id'],
  credentials: true,
});

await app.listen(environment.apiPort, '0.0.0.0');
