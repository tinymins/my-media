import { z } from "zod";

// 通知渠道类型
export const NotificationChannelTypeSchema = z.enum(["telegram", "bark", "webhook", "email"]);
export type NotificationChannelType = z.infer<typeof NotificationChannelTypeSchema>;

// 通知事件类型
export const NotificationEventSchema = z.enum([
  "movie_download_started",
  "movie_download_completed",
  "tv_download_started",
  "tv_download_completed",
  "movie_subscription_added",
  "tv_subscription_added",
  "site_error",
  "download_error",
  "media_organized"
]);

export type NotificationEvent = z.infer<typeof NotificationEventSchema>;

// Telegram 配置
export const TelegramConfigSchema = z.object({
  apiUrl: z.string().url().default("https://api.telegram.org"),
  token: z.string().min(1, "Token 不能为空"),
  userId: z.string().min(1, "User ID 不能为空"),
  proxy: z.string().optional() // HTTP/SOCKS5 代理
});

export type TelegramConfig = z.infer<typeof TelegramConfigSchema>;

// Bark 配置
export const BarkConfigSchema = z.object({
  serverUrl: z.string().url(),
  deviceKey: z.string().min(1, "Device Key 不能为空")
});

export type BarkConfig = z.infer<typeof BarkConfigSchema>;

// Webhook 配置
export const WebhookConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST"]).default("POST"),
  headers: z.record(z.string(), z.string()).optional(),
  bodyTemplate: z.string().optional() // Jinja2 模板
});

export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

// Email 配置
export const EmailConfigSchema = z.object({
  smtpHost: z.string(),
  smtpPort: z.number().default(587),
  useTls: z.boolean().default(true),
  username: z.string(),
  password: z.string(),
  fromAddress: z.string().email(),
  toAddress: z.string().email()
});

export type EmailConfig = z.infer<typeof EmailConfigSchema>;

// 通知渠道配置联合类型
export const NotificationConfigSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("telegram"), ...TelegramConfigSchema.shape }),
  z.object({ type: z.literal("bark"), ...BarkConfigSchema.shape }),
  z.object({ type: z.literal("webhook"), ...WebhookConfigSchema.shape }),
  z.object({ type: z.literal("email"), ...EmailConfigSchema.shape })
]);

export type NotificationConfig = z.infer<typeof NotificationConfigSchema>;

// 通知渠道
export const NotificationChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: NotificationChannelTypeSchema,
  config: z.any(), // 实际上是 NotificationConfig，但 jsonb 存储
  enabledEvents: z.array(NotificationEventSchema).nullable().optional(),
  isEnabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

// 创建通知渠道输入
export const CreateNotificationChannelInputSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  type: NotificationChannelTypeSchema,
  config: z.any(), // 根据 type 验证具体配置
  enabledEvents: z.array(NotificationEventSchema).optional(),
  isEnabled: z.boolean().default(true)
});

export type CreateNotificationChannelInput = z.infer<typeof CreateNotificationChannelInputSchema>;

// 更新通知渠道输入
export const UpdateNotificationChannelInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  config: z.any().optional(),
  enabledEvents: z.array(NotificationEventSchema).nullable().optional(),
  isEnabled: z.boolean().optional()
});

export type UpdateNotificationChannelInput = z.infer<typeof UpdateNotificationChannelInputSchema>;

// 测试通知输入
export const TestNotificationInputSchema = z.object({
  channelId: z.string()
});

export type TestNotificationInput = z.infer<typeof TestNotificationInputSchema>;
