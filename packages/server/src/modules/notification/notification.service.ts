import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "../../db/client";
import { notificationChannels } from "../../db/schema";
import type {
  CreateNotificationChannelInput,
  UpdateNotificationChannelInput,
  NotificationChannelType,
  NotificationEvent
} from "@acme/types";

// 转换数据库实体为 API 输出
export const toNotificationChannelOutput = (channel: typeof notificationChannels.$inferSelect) => ({
  id: channel.id,
  name: channel.name,
  type: channel.type as NotificationChannelType,
  config: channel.config,
  enabledEvents: (channel.enabledEvents as NotificationEvent[] | null) ?? null,
  isEnabled: channel.isEnabled,
  createdAt: channel.createdAt!.toISOString(),
  updatedAt: channel.updatedAt!.toISOString()
});

export class NotificationService {
  // 获取所有通知渠道
  async list() {
    const channels = await db
      .select()
      .from(notificationChannels)
      .orderBy(notificationChannels.createdAt);
    return channels;
  }

  // 获取启用的通知渠道
  async listEnabled() {
    const channels = await db
      .select()
      .from(notificationChannels)
      .where(eq(notificationChannels.isEnabled, true))
      .orderBy(notificationChannels.createdAt);
    return channels;
  }

  // 根据 ID 获取单个渠道
  async getById(id: string) {
    const [channel] = await db
      .select()
      .from(notificationChannels)
      .where(eq(notificationChannels.id, id))
      .limit(1);
    return channel ?? null;
  }

  // 创建通知渠道
  async create(input: CreateNotificationChannelInput) {
    const [created] = await db
      .insert(notificationChannels)
      .values({
        name: input.name,
        type: input.type,
        config: input.config,
        enabledEvents: input.enabledEvents,
        isEnabled: input.isEnabled
      })
      .returning();

    return created;
  }

  // 更新通知渠道
  async update(input: UpdateNotificationChannelInput) {
    const existing = await this.getById(input.id);
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "通知渠道不存在"
      });
    }

    const [updated] = await db
      .update(notificationChannels)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.config !== undefined && { config: input.config }),
        ...(input.enabledEvents !== undefined && { enabledEvents: input.enabledEvents }),
        ...(input.isEnabled !== undefined && { isEnabled: input.isEnabled }),
        updatedAt: new Date()
      })
      .where(eq(notificationChannels.id, input.id))
      .returning();

    return updated;
  }

  // 删除通知渠道
  async delete(id: string) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "通知渠道不存在"
      });
    }

    await db.delete(notificationChannels).where(eq(notificationChannels.id, id));
    return { success: true };
  }

  // 切换启用状态
  async toggleEnabled(id: string) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "通知渠道不存在"
      });
    }

    const [updated] = await db
      .update(notificationChannels)
      .set({
        isEnabled: !existing.isEnabled,
        updatedAt: new Date()
      })
      .where(eq(notificationChannels.id, id))
      .returning();

    return updated;
  }

  // 发送测试通知
  async sendTest(id: string): Promise<{ success: boolean; message?: string }> {
    const channel = await this.getById(id);
    if (!channel) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "通知渠道不存在"
      });
    }

    const config = channel.config as Record<string, unknown>;

    try {
      switch (channel.type) {
        case "telegram":
          return await this.sendTelegramTest(config);
        case "bark":
          return await this.sendBarkTest(config);
        case "webhook":
          return await this.sendWebhookTest(config);
        case "email":
          return await this.sendEmailTest(config);
        default:
          return { success: false, message: "不支持的通知类型" };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "发送失败";
      return { success: false, message };
    }
  }

  // 发送 Telegram 测试通知
  private async sendTelegramTest(config: Record<string, unknown>): Promise<{ success: boolean; message?: string }> {
    const { apiUrl, token, userId, proxy } = config as {
      apiUrl?: string;
      token: string;
      userId: string;
      proxy?: string;
    };

    const baseUrl = apiUrl || "https://api.telegram.org";
    const url = `${baseUrl}/bot${token}/sendMessage`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: userId,
        text: "🎬 茗伊媒体管理 - 测试消息\n\n通知配置成功！",
        parse_mode: "HTML"
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Telegram API 错误: ${(errorData as { description?: string }).description || response.statusText}`);
    }

    return { success: true, message: "Telegram 测试消息发送成功" };
  }

  // 发送 Bark 测试通知
  private async sendBarkTest(config: Record<string, unknown>): Promise<{ success: boolean; message?: string }> {
    const { serverUrl, deviceKey } = config as {
      serverUrl: string;
      deviceKey: string;
    };

    const url = `${serverUrl}/${deviceKey}/茗伊媒体管理/通知配置成功！`;

    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      throw new Error(`Bark API 错误: ${response.statusText}`);
    }

    return { success: true, message: "Bark 测试消息发送成功" };
  }

  // 发送 Webhook 测试通知
  private async sendWebhookTest(config: Record<string, unknown>): Promise<{ success: boolean; message?: string }> {
    const { url, method, headers } = config as {
      url: string;
      method?: string;
      headers?: Record<string, string>;
    };

    const response = await fetch(url, {
      method: method || "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: JSON.stringify({
        event: "test",
        title: "茗伊媒体管理 - 测试消息",
        message: "通知配置成功！",
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Webhook 请求失败: ${response.statusText}`);
    }

    return { success: true, message: "Webhook 测试消息发送成功" };
  }

  // 发送 Email 测试通知
  private async sendEmailTest(_config: Record<string, unknown>): Promise<{ success: boolean; message?: string }> {
    // TODO: 实现 SMTP 邮件发送
    return { success: false, message: "邮件通知功能暂未实现" };
  }

  // 发送通知（供其他模块调用）
  async sendNotification(event: NotificationEvent, data: {
    title: string;
    message: string;
    posterUrl?: string;
    detailsUrl?: string;
  }) {
    const channels = await this.listEnabled();

    for (const channel of channels) {
      const enabledEvents = channel.enabledEvents as NotificationEvent[] | null;
      if (!enabledEvents?.includes(event)) {
        continue;
      }

      // 异步发送，不阻塞
      this.sendToChannel(channel, data).catch(error => {
        console.error(`Failed to send notification to channel ${channel.name}:`, error);
      });
    }
  }

  private async sendToChannel(
    channel: typeof notificationChannels.$inferSelect,
    data: { title: string; message: string; posterUrl?: string; detailsUrl?: string }
  ) {
    const config = channel.config as Record<string, unknown>;

    switch (channel.type) {
      case "telegram": {
        const { apiUrl, token, userId } = config as { apiUrl?: string; token: string; userId: string };
        const baseUrl = apiUrl || "https://api.telegram.org";
        const url = `${baseUrl}/bot${token}/sendMessage`;
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: userId,
            text: `🎬 ${data.title}\n\n${data.message}`,
            parse_mode: "HTML"
          })
        });
        break;
      }
      case "bark": {
        const { serverUrl, deviceKey } = config as { serverUrl: string; deviceKey: string };
        const url = `${serverUrl}/${deviceKey}/${encodeURIComponent(data.title)}/${encodeURIComponent(data.message)}`;
        await fetch(url);
        break;
      }
      case "webhook": {
        const { url, method, headers } = config as {
          url: string;
          method?: string;
          headers?: Record<string, string>;
        };
        await fetch(url, {
          method: method || "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ ...data, timestamp: new Date().toISOString() })
        });
        break;
      }
    }
  }
}

export const notificationService = new NotificationService();
