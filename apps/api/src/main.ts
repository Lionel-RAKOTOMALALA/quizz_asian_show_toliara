import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Rejette toute propriété non déclarée dans les DTO et convertit les types.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Le mobile (Expo) et l'écran (Next.js) appellent l'API depuis d'autres origines.
  app.enableCors();

  // Déclenche onModuleDestroy (déconnexion Prisma) sur SIGINT/SIGTERM.
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3333;
  await app.listen(port);
  console.log(`API prête sur http://localhost:${port}`);
}
void bootstrap();
