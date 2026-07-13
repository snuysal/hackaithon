import "reflect-metadata";

import { Module, ValidationPipe, type Type } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { AddressInfo } from "node:net";

type ProviderLike = {
	provide: unknown;
	useValue: object;
};

type HttpTestAppOptions = {
	controllers: Type<unknown>[];
	providers: ProviderLike[];
};

export async function createHttpTestApp({ controllers, providers }: HttpTestAppOptions): Promise<HttpTestApp> {
	@Module({
		controllers,
		providers: providers as never,
	})
	class TestHttpModule {}

	const app = await NestFactory.create(TestHttpModule, { logger: false });
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		})
	);

	await app.listen(0, "127.0.0.1");

	const address = app.getHttpServer().address() as AddressInfo;

	return {
		baseUrl: `http://127.0.0.1:${address.port}`,
		close: async () => app.close(),
	};
}

export async function readJson(response: Response): Promise<unknown> {
	return response.json().catch(() => ({}));
}

export function messageText(payload: unknown): string {
	if (!isRecord(payload) || payload.message === undefined) {
		return "";
	}

	if (Array.isArray(payload.message)) {
		return payload.message.join(", ");
	}

	return typeof payload.message === "string" ? payload.message : JSON.stringify(payload.message);
}

type HttpTestApp = {
	baseUrl: string;
	close: () => Promise<void>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
