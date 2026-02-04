import { Module } from "@nestjs/common";
import { NotificationRouter } from "./notification.router";
import { NotificationService } from "./notification.service";

@Module({
  providers: [NotificationService, NotificationRouter],
  exports: [NotificationService, NotificationRouter]
})
export class NotificationModule {}
