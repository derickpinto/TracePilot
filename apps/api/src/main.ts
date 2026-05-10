import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log', 'debug'],
    });

    app.useWebSocketAdapter(new IoAdapter(app));

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: false,
            transform: true,
        }),
    );

    app.enableCors({
        origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000'],
        methods: ['GET', 'OPTIONS'],
        credentials: false,
    });

    app.setGlobalPrefix('api');

    const port = parseInt(process.env.PORT ?? '4000', 10);
    await app.listen(port);
    logger.log(`API gateway running on http://localhost:${port}/api`);
    logger.log(`WebSocket server listening on port ${port}`);
}

bootstrap().catch((err) => {
    console.error('Fatal bootstrap error:', err);
    process.exit(1);
});
