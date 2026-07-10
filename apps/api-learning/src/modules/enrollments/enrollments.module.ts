import { Module } from "@nestjs/common";

import { UsersModule } from "../users/users.module.js";
import { EnrollmentsController } from "./enrollments.controller.js";
import { EnrollmentsService } from "./enrollments.service.js";

@Module({
    imports: [UsersModule],
    controllers: [EnrollmentsController],
    providers: [EnrollmentsService],
    exports: [EnrollmentsService],
})
export class EnrollmentsModule { }
