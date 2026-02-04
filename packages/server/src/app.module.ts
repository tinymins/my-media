import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { createContext } from "./trpc/context";
import { TrpcModule } from "./trpc/trpc.module";
import { AdminModule } from "./modules/admin";
import { AuthModule } from "./modules/auth";
import { HelloModule } from "./modules/hello";
import { TestRequirementModule } from "./modules/test-requirement";
import { TodoModule } from "./modules/todo";
import { UserModule } from "./modules/user";
import { WorkspaceModule } from "./modules/workspace";

// 媒体管理系统模块
import { PtSiteModule } from "./modules/pt-site";
import { MediaServerModule } from "./modules/media-server";
import { DownloadClientModule } from "./modules/download-client";
import { NotificationModule } from "./modules/notification";
import { MediaFolderModule } from "./modules/media-folder";
import { SearchModule } from "./modules/search";
import { SystemStatusModule } from "./modules/system-status";

@Module({
  imports: [
    TrpcModule.forRoot({
      createContext
    }),
    AdminModule,
    AuthModule,
    HelloModule,
    TestRequirementModule,
    TodoModule,
    UserModule,
    WorkspaceModule,
    // 媒体管理系统模块
    PtSiteModule,
    MediaServerModule,
    DownloadClientModule,
    NotificationModule,
    MediaFolderModule,
    SearchModule,
    SystemStatusModule
  ],
  controllers: [AppController]
})
export class AppModule {}
