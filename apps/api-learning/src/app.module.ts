import { Module } from "@nestjs/common";

import { AuthModule } from "./modules/auth/auth.module.js";
import { DatabaseModule } from "./modules/database/database.module.js";
import { ElearningsModule } from "./modules/elearnings/elearnings.module.js";
import { EnrollmentsModule } from "./modules/enrollments/enrollments.module.js";
import { HistoryModule } from "./modules/history/history.module.js";
import { UsersModule } from "./modules/users/users.module.js";

@Module({
    imports: [DatabaseModule, AuthModule, UsersModule, ElearningsModule, EnrollmentsModule, HistoryModule],
})
export class AppModule { }
