export {
  UserSchema,
  UserSettingsSchema,
  UserSettingsPatchSchema,
  UserRoleSchema,
  SystemSettingsSchema,
  AdminUserSchema,
  UpdateUserRoleInputSchema,
  ForceResetPasswordInputSchema,
  CreateUserInputSchema,
  InvitationCodeSchema
} from "./user";
export type {
  User,
  UserSettings,
  UserRole,
  SystemSettings,
  AdminUser,
  UpdateUserRoleInput,
  ForceResetPasswordInput,
  CreateUserInput,
  InvitationCode
} from "./user";

export {
  WorkspaceSchema,
  CreateWorkspaceInputSchema,
  UpdateWorkspaceInputSchema,
  DeleteWorkspaceInputSchema
} from "./workspace";
export type {
  Workspace,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  DeleteWorkspaceInput
} from "./workspace";

export {
  TestRequirementPrioritySchema,
  TestRequirementStatusSchema,
  TestRequirementTypeSchema,
  TestRequirementSchema,
  CreateTestRequirementInputSchema,
  UpdateTestRequirementInputSchema,
  DeleteTestRequirementInputSchema,
  TestRequirementListQuerySchema
} from "./test-requirement";
export type {
  TestRequirementPriority,
  TestRequirementStatus,
  TestRequirementType,
  TestRequirement,
  CreateTestRequirementInput,
  UpdateTestRequirementInput,
  DeleteTestRequirementInput,
  TestRequirementListQuery
} from "./test-requirement";

// ==================== 媒体管理系统类型 ====================

// PT 站点
export {
  PtSiteAuthTypeSchema,
  PtSiteSchema,
  CreatePtSiteInputSchema,
  UpdatePtSiteInputSchema,
  PtTorrentSchema,
  PtUserInfoSchema,
  PtSiteStatusSchema
} from "./pt-site";
export type {
  PtSiteAuthType,
  PtSite,
  CreatePtSiteInput,
  UpdatePtSiteInput,
  PtTorrent,
  PtUserInfo,
  PtSiteStatus
} from "./pt-site";

// 媒体服务器
export {
  MediaServerTypeSchema,
  MediaServerSchema,
  CreateMediaServerInputSchema,
  UpdateMediaServerInputSchema,
  MediaLibrarySchema,
  MediaItemSchema,
  MediaServerStatusSchema
} from "./media-server";
export type {
  MediaServerType,
  MediaServer,
  CreateMediaServerInput,
  UpdateMediaServerInput,
  MediaLibrary,
  MediaItem,
  MediaServerStatus
} from "./media-server";

// 下载客户端
export {
  DownloadClientTypeSchema,
  DownloadClientSchema,
  CreateDownloadClientInputSchema,
  UpdateDownloadClientInputSchema,
  TorrentStateSchema,
  TorrentInfoSchema,
  AddTorrentInputSchema,
  DownloadClientStatusSchema
} from "./download-client";
export type {
  DownloadClientType,
  DownloadClient,
  CreateDownloadClientInput,
  UpdateDownloadClientInput,
  TorrentState,
  TorrentInfo,
  AddTorrentInput,
  DownloadClientStatus
} from "./download-client";

// 通知渠道
export {
  NotificationChannelTypeSchema,
  NotificationEventSchema,
  TelegramConfigSchema,
  BarkConfigSchema,
  WebhookConfigSchema,
  EmailConfigSchema,
  NotificationConfigSchema,
  NotificationChannelSchema,
  CreateNotificationChannelInputSchema,
  UpdateNotificationChannelInputSchema,
  TestNotificationInputSchema
} from "./notification";
export type {
  NotificationChannelType,
  NotificationEvent,
  TelegramConfig,
  BarkConfig,
  WebhookConfig,
  EmailConfig,
  NotificationConfig,
  NotificationChannel,
  CreateNotificationChannelInput,
  UpdateNotificationChannelInput,
  TestNotificationInput
} from "./notification";

// 媒体文件夹
export {
  ContentTypeSchema,
  LinkModeSchema,
  MediaFolderSchema,
  CreateMediaFolderInputSchema,
  UpdateMediaFolderInputSchema,
  ScrapingSettingsSchema,
  UpdateScrapingSettingsInputSchema,
  OrganizingSettingsSchema,
  UpdateOrganizingSettingsInputSchema
} from "./media-folder";
export type {
  ContentType,
  LinkMode,
  MediaFolder,
  CreateMediaFolderInput,
  UpdateMediaFolderInput,
  ScrapingSettings,
  UpdateScrapingSettingsInput,
  OrganizingSettings,
  UpdateOrganizingSettingsInput
} from "./media-folder";

// 下载记录
export {
  DownloadRecordStatusSchema,
  DownloadRecordSchema,
  CreateDownloadRecordInputSchema,
  UpdateDownloadRecordInputSchema,
  DownloadRecordQuerySchema
} from "./download-record";
export type {
  DownloadRecordStatus,
  DownloadRecord,
  CreateDownloadRecordInput,
  UpdateDownloadRecordInput,
  DownloadRecordQuery
} from "./download-record";

// 搜索
export {
  TmdbMediaSchema,
  TmdbMediaDetailSchema,
  SearchInputSchema,
  PtSearchInputSchema,
  SearchResultSchema,
  QuickDownloadInputSchema
} from "./search";
export type {
  TmdbMedia,
  TmdbMediaDetail,
  SearchInput,
  PtSearchInput,
  SearchResult,
  QuickDownloadInput
} from "./search";

// 系统状态
export {
  PtSiteConnectionStatusSchema,
  TmdbStatusSchema,
  SystemStatusSchema
} from "./system-status";
export type {
  PtSiteConnectionStatus,
  TmdbStatus,
  SystemStatus
} from "./system-status";
