import type { AuthUserView, UserSummary } from "@hackaithon/shared-types";

import type { UserRecord } from "../modules/users/user-record.js";

export function mapUserToAuthView(user: UserRecord): AuthUserView {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        teamName: user.teamName,
        role: user.role,
        approvalStatus: user.approvalStatus,
        birthDateIso: user.birthDateIso,
        canAccessLearning: user.approvalStatus === "APPROVED",
    };
}

export function mapUserToSummary(user: UserRecord): UserSummary {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        teamName: user.teamName,
        role: user.role,
        approvalStatus: user.approvalStatus,
        createdAtIso: user.createdAtIso,
    };
}
