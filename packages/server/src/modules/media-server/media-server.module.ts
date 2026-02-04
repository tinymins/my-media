import { Module } from "@nestjs/common";
import { MediaServerRouter } from "./media-server.router";
import { MediaServerService } from "./media-server.service";

@Module({
  providers: [MediaServerService, MediaServerRouter],
  exports: [MediaServerService, MediaServerRouter]
})
export class MediaServerModule {}
