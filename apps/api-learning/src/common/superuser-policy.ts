import { ForbiddenException } from "@nestjs/common";
import type { AppRole } from "@hackaithon/shared-types";

export function isSuperuser(role: AppRole): boolean {
    return role === "ADMIN";
}

export function assertSuperuser(role: AppRole): void {
    if (!isSuperuser(role)) {
        throw new ForbiddenException("Only ADMIN can execute this action.");
    }
}

export function canManageElearnings(role: AppRole): boolean {
    return role === "ADMIN" || role === "TRAINER";
}

export function assertCanManageElearnings(role: AppRole): void {
    if (!canManageElearnings(role)) {
        throw new ForbiddenException("Only ADMIN or TRAINER can execute this action.");
    }
}
