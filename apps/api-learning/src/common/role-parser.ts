import { BadRequestException } from "@nestjs/common";
import type { AppRole } from "@hackaithon/shared-types";

export function parseActorRole(value: unknown): AppRole {
    if (value === "ADMIN") {
        return "ADMIN";
    }

    if (value === "TRAINER") {
        return "TRAINER";
    }

    if (value === "PARTICIPANT") {
        return "PARTICIPANT";
    }

    throw new BadRequestException("actorRole must be one of: ADMIN, TRAINER, PARTICIPANT.");
}
