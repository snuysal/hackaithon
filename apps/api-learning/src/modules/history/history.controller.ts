import type { GamificationSummaryView, HistoryDetailView, HistorySummaryItem } from "@hackaithon/shared-types";
import { Controller, Get, Param, Query } from "@nestjs/common";

import { parseActorRole } from "../../common/role-parser.js";
import { parseRequiredUserId } from "../../common/user-id-parser.js";
import { HistoryService } from "./history.service.js";

@Controller("me/history")
export class HistoryController {
    public constructor(private readonly historyService: HistoryService) { }

    @Get()
    public listMyHistory(
        @Query("actorRole") actorRoleParam: unknown,
        @Query("actorUserId") actorUserIdParam: unknown
    ): Promise<HistorySummaryItem[]> {
        const actorRole = parseActorRole(actorRoleParam);
        const actorUserId = parseRequiredUserId(actorUserIdParam);

        return this.historyService.listMyHistory(actorRole, actorUserId);
    }

    @Get("gamification/summary")
    public getMyGamificationSummary(
        @Query("actorRole") actorRoleParam: unknown,
        @Query("actorUserId") actorUserIdParam: unknown
    ): Promise<GamificationSummaryView> {
        const actorRole = parseActorRole(actorRoleParam);
        const actorUserId = parseRequiredUserId(actorUserIdParam);

        return this.historyService.getMyGamificationSummary(actorRole, actorUserId);
    }

    @Get(":enrollmentId")
    public getHistoryDetail(
        @Param("enrollmentId") enrollmentId: string,
        @Query("actorRole") actorRoleParam: unknown,
        @Query("actorUserId") actorUserIdParam: unknown
    ): Promise<HistoryDetailView> {
        const actorRole = parseActorRole(actorRoleParam);
        const actorUserId = parseRequiredUserId(actorUserIdParam);

        return this.historyService.getHistoryDetail(enrollmentId, actorRole, actorUserId);
    }
}
