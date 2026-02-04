import { z } from "zod";
import {
  NotificationChannelSchema,
  CreateNotificationChannelInputSchema,
  UpdateNotificationChannelInputSchema
} from "@acme/types";
import { Router, Query, Mutation, UseMiddlewares } from "../../trpc/decorators";
import { requireUser, requireAdmin } from "../../trpc/middlewares";
import { notificationService, toNotificationChannelOutput } from "./notification.service";

@Router({ alias: "notification" })
export class NotificationRouter {
  // 获取所有通知渠道列表
  @Query({ output: z.array(NotificationChannelSchema) })
  @UseMiddlewares(requireUser)
  async list() {
    const channels = await notificationService.list();
    return channels.map(toNotificationChannelOutput);
  }

  // 获取单个通知渠道详情
  @Query({
    input: z.object({ id: z.string() }),
    output: NotificationChannelSchema.nullable()
  })
  @UseMiddlewares(requireUser)
  async getById(input: { id: string }) {
    const channel = await notificationService.getById(input.id);
    return channel ? toNotificationChannelOutput(channel) : null;
  }

  // 创建通知渠道（管理员）
  @Mutation({
    input: CreateNotificationChannelInputSchema,
    output: NotificationChannelSchema
  })
  @UseMiddlewares(requireAdmin)
  async create(input: z.infer<typeof CreateNotificationChannelInputSchema>) {
    const created = await notificationService.create(input);
    return toNotificationChannelOutput(created);
  }

  // 更新通知渠道（管理员）
  @Mutation({
    input: UpdateNotificationChannelInputSchema,
    output: NotificationChannelSchema
  })
  @UseMiddlewares(requireAdmin)
  async update(input: z.infer<typeof UpdateNotificationChannelInputSchema>) {
    const updated = await notificationService.update(input);
    return toNotificationChannelOutput(updated);
  }

  // 删除通知渠道（管理员）
  @Mutation({
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() })
  })
  @UseMiddlewares(requireAdmin)
  async delete(input: { id: string }) {
    return await notificationService.delete(input.id);
  }

  // 切换启用状态（管理员）
  @Mutation({
    input: z.object({ id: z.string() }),
    output: NotificationChannelSchema
  })
  @UseMiddlewares(requireAdmin)
  async toggleEnabled(input: { id: string }) {
    const updated = await notificationService.toggleEnabled(input.id);
    return toNotificationChannelOutput(updated);
  }

  // 发送测试通知（管理员）
  @Mutation({
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean(), message: z.string().optional() })
  })
  @UseMiddlewares(requireAdmin)
  async sendTest(input: { id: string }) {
    return await notificationService.sendTest(input.id);
  }
}
