import { Module } from "@nestjs/common";
import { MediaFolderRouter } from "./media-folder.router";
import { MediaFolderService } from "./media-folder.service";

@Module({
  providers: [MediaFolderService, MediaFolderRouter],
  exports: [MediaFolderService, MediaFolderRouter]
})
export class MediaFolderModule {}
