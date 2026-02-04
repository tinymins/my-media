import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  settings: jsonb("settings"),
  role: text("role").notNull().default("user"), // superadmin, admin, user
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
});

// 系统设置表（单行配置）
export const systemSettings = pgTable("system_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  allowRegistration: boolean("allow_registration").notNull().default(true),
  tmdbApiKey: text("tmdb_api_key"), // TMDB API Key
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: uuid("owner_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const workspaceMembers = pgTable("workspace_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const todos = pgTable("todos", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  title: text("title").notNull(),
  category: text("category").notNull().default("默认"),
  completed: boolean("completed").notNull().default(false),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// 邀请码表
export const invitationCodes = pgTable("invitation_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(), // 邀请码
  createdBy: uuid("created_by").references(() => users.id).notNull(), // 创建者（超管）
  usedBy: uuid("used_by").references(() => users.id), // 使用者
  usedAt: timestamp("used_at", { withTimezone: true }), // 使用时间
  expiresAt: timestamp("expires_at", { withTimezone: true }), // 过期时间（可选）
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// 测试需求表
export const testRequirements = pgTable("test_requirements", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  code: text("code").notNull(), // 需求编号，如 TR-0001
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"), // Markdown 内容
  type: text("type").notNull().default("functional"), // 需求类型
  status: text("status").notNull().default("draft"), // 状态
  priority: text("priority").notNull().default("medium"), // 优先级
  parentId: uuid("parent_id").references((): any => testRequirements.id), // 父需求
  tags: jsonb("tags").$type<string[]>(), // 标签数组
  assigneeId: uuid("assignee_id").references(() => users.id), // 负责人
  createdBy: uuid("created_by").references(() => users.id), // 创建者
  dueDate: timestamp("due_date", { withTimezone: true }), // 截止日期
  estimatedHours: text("estimated_hours"), // 预估工时（存为文本以支持小数）
  actualHours: text("actual_hours"), // 实际工时
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// ==================== 媒体管理系统表 ====================

// PT/BT 站点配置表
export const ptSites = pgTable("pt_sites", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // 站点名称，如 "馒头"
  siteId: text("site_id").notNull(), // 站点标识，如 "mteam"
  domain: text("domain").notNull(), // 站点域名
  authType: text("auth_type").notNull().default("cookies"), // 认证方式: cookies, api_key
  cookies: text("cookies"), // Cookie 认证信息（加密存储）
  apiKey: text("api_key"), // API Key 认证信息（加密存储）
  configYaml: text("config_yaml"), // 站点解析配置 YAML（可选，用于自定义解析规则）
  configUrl: text("config_url"), // 远程配置 URL（用于更新解析规则）
  isEnabled: boolean("is_enabled").notNull().default(true),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }), // 最后检查登录状态时间
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// 媒体服务器配置表（Plex、Emby、Jellyfin 等）
export const mediaServers = pgTable("media_servers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // 别名，如 "plex"
  type: text("type").notNull(), // 类型: plex, emby, jellyfin
  url: text("url").notNull(), // 访问地址（内网）
  externalUrl: text("external_url"), // 外网访问地址
  token: text("token"), // 访问令牌（加密存储）
  apiKey: text("api_key"), // API Key（某些服务使用）
  isPrimary: boolean("is_primary").notNull().default(false), // 是否为主要媒体服务器
  autoRefresh: boolean("auto_refresh").notNull().default(false), // 新增内容时自动刷新
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// 下载客户端配置表（qBittorrent、Transmission 等）
export const downloadClients = pgTable("download_clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // 别名，如 "qBittorrent"
  type: text("type").notNull(), // 类型: qbittorrent, transmission, aria2
  url: text("url").notNull(), // 访问地址
  username: text("username"), // 登录账号
  password: text("password"), // 登录密码（加密存储）
  downloadPath: text("download_path"), // 默认下载路径
  isDefault: boolean("is_default").notNull().default(false), // 是否为默认下载器
  requireAuth: boolean("require_auth").notNull().default(true), // 是否需要登录
  monitorEnabled: boolean("monitor_enabled").notNull().default(false), // 监控手动提交到下载器的种子
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// 通知渠道配置表（Telegram、Bark、Webhook 等）
export const notificationChannels = pgTable("notification_channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // 渠道别名
  type: text("type").notNull(), // 类型: telegram, bark, webhook, email
  config: jsonb("config").notNull(), // 渠道配置（不同类型有不同配置）
  enabledEvents: jsonb("enabled_events").$type<string[]>(), // 启用的事件类型
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// 媒体文件夹配置表
export const mediaFolders = pgTable("media_folders", {
  id: uuid("id").defaultRandom().primaryKey(),
  contentType: text("content_type").notNull(), // 内容类型: movie, tv, anime, music
  downloadPath: text("download_path").notNull(), // 下载保存路径
  containerPath: text("container_path"), // 容器内路径（Docker 映射）
  targetPath: text("target_path").notNull(), // 整理目标路径
  linkMode: text("link_mode").notNull().default("hardlink"), // 链接模式: hardlink, softlink, copy, move
  autoCategory: boolean("auto_category").notNull().default(false), // 是否按区域自动分类
  sortOrder: text("sort_order").notNull().default("0"), // 排序顺序
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// 下载记录表
export const downloadRecords = pgTable("download_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  torrentName: text("torrent_name").notNull(), // 种子名称
  torrentHash: text("torrent_hash"), // 种子 hash
  contentType: text("content_type").notNull(), // 内容类型: movie, tv
  mediaTitle: text("media_title"), // 识别出的媒体名称
  mediaYear: text("media_year"), // 年份
  tmdbId: text("tmdb_id"), // TMDB ID
  imdbId: text("imdb_id"), // IMDB ID
  season: text("season"), // 季数（剧集）
  episode: text("episode"), // 集数（剧集）
  quality: text("quality"), // 画质: 2160p, 1080p, 720p
  source: text("source"), // 来源: WEB-DL, Blu-ray, HDTV
  codec: text("codec"), // 编码: H.265, H.264
  releaseGroup: text("release_group"), // 压制组
  ptSiteId: uuid("pt_site_id").references(() => ptSites.id), // 来源站点
  downloadClientId: uuid("download_client_id").references(() => downloadClients.id), // 下载器
  downloadPath: text("download_path"), // 保存路径
  targetPath: text("target_path"), // 整理后路径
  fileSize: text("file_size"), // 文件大小
  status: text("status").notNull().default("downloading"), // 状态: downloading, seeding, completed, failed
  progress: text("progress"), // 下载进度
  uploadedSize: text("uploaded_size"), // 已上传大小
  downloadedSize: text("downloaded_size"), // 已下载大小
  ratio: text("ratio"), // 分享率
  seedingTime: text("seeding_time"), // 做种时间
  isRecognized: boolean("is_recognized").notNull().default(false), // 是否已识别
  createdBy: uuid("created_by").references(() => users.id), // 创建者
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// 刮削设置表
export const scrapingSettings = pgTable("scraping_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  generateNfo: boolean("generate_nfo").notNull().default(true), // 生成 NFO 文件
  downloadImages: boolean("download_images").notNull().default(true), // 下载图片
  useChineseInfo: boolean("use_chinese_info").notNull().default(false), // 使用中文演员信息
  movieImageSources: jsonb("movie_image_sources").$type<string[]>(), // 电影图片来源优先级
  tvImageSources: jsonb("tv_image_sources").$type<string[]>(), // 剧集图片来源优先级
  imageLanguagePriority: jsonb("image_language_priority").$type<string[]>(), // 图片语言优先级
  useHdPoster: boolean("use_hd_poster").notNull().default(true), // 使用高清封面图
  useHdBackdrop: boolean("use_hd_backdrop").notNull().default(false), // 使用高清剧照横图
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// 整理设置表
export const organizingSettings = pgTable("organizing_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  defaultLinkMode: text("default_link_mode").notNull().default("hardlink"), // 默认链接模式
  movieFileFormat: text("movie_file_format").notNull().default("{{name}} ({{year}}){% if version %} - {{version}}{% endif %}"),
  movieFolderFormat: text("movie_folder_format").notNull().default("{{name}} ({{year}})"),
  tvFileFormat: text("tv_file_format").notNull().default("{{name}} S{{season}}E{{ep_start}}{% if ep_end %}-E{{ep_end}}{% endif %}{% if version %} - {{version}}{% endif %}"),
  tvFolderFormat: text("tv_folder_format").notNull().default("{{name}} ({{year}})"),
  flattenDisc: boolean("flatten_disc").notNull().default(false), // 原盘作为独立文件夹整理
  fixEmbyDisc: boolean("fix_emby_disc").notNull().default(false), // 修复 Emby 原盘播放 BUG
  enableRecognition: boolean("enable_recognition").notNull().default(true), // 启用识别分析
  strictYearMatch: boolean("strict_year_match").notNull().default(false), // 多结果时精确匹配年份
  unknownToFolder: boolean("unknown_to_folder").notNull().default(true), // 未识别归类到 unknown 目录
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});
