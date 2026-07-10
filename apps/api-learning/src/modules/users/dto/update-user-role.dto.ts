import { APP_ROLES, type AppRole, type UpdateUserRoleRequest } from "@hackaithon/shared-types";
import { IsIn } from "class-validator";

export class UpdateUserRoleDto implements UpdateUserRoleRequest {
    @IsIn(APP_ROLES)
    newRole!: AppRole;
}
