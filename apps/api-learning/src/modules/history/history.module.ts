import { Module } from "@nestjs/common";

import { UsersModule } from "../users/users.module.js";
import { HistoryController } from "./history.controller.js";
import { HistoryService } from "./history.service.js";

@Module({
    imports: [UsersModule],
    controllers: [HistoryController],
    providers: [HistoryService],
    exports: [HistoryService],
})
export class HistoryModule { }
