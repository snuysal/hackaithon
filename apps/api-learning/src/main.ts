import { config as loadEnvironment } from "dotenv";
import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { AppModule } from "./app.module.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectoryPath = dirname(currentFilePath);

loadEnvironment({
    path: resolve(currentDirectoryPath, "../../../packages/database/.env"),
});

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);
    app.enableCors({
        origin: true,
        credentials: false,
    });
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        })
    );

    await app.listen(3000);
}

void bootstrap();
