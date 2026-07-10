import { APP_ROLES, type AppRole, type SignupRequest } from "@hackaithon/shared-types";

const allowedRoles: readonly string[] = APP_ROLES;

export function canActAsSuperuser(role: AppRole): boolean {
    return role === "ADMIN";
}

export function normalizeSignupPayload(payload: SignupRequest): SignupRequest {
    return {
        ...payload,
        name: payload.name.trim(),
        email: payload.email.toLowerCase().trim(),
        teamName: payload.teamName.trim(),
    };
}

export function isAllowedRole(role: string): role is AppRole {
    return allowedRoles.includes(role);
}
