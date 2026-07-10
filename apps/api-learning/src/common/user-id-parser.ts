import { BadRequestException } from "@nestjs/common";

export function parseRequiredUserId(value: unknown): string {
    if (typeof value !== "string") {
        throw new BadRequestException("actorUserId must be a non-empty string.");
    }

    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
        throw new BadRequestException("actorUserId must be a non-empty string.");
    }

    return normalizedValue;
}
