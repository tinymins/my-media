import { eq, sql, ne, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "../../db/client";
import { users, systemSettings, sessions, workspaces, workspaceMembers, todos, testRequirements } from "../../db/schema";
import type { UserRole } from "@acme/types";

export class AdminService {
	async getStats() {
		const result = await db.execute(sql`select count(*)::int as count from users`);
		const count = Number(result.rows?.[0]?.count ?? 0);
		return { userCount: count };
	}

	/** 获取系统设置 */
	async getSystemSettings() {
		const [settings] = await db.select().from(systemSettings).limit(1);
		if (!settings) {
			const [created] = await db
				.insert(systemSettings)
				.values({ allowRegistration: true })
				.returning();
			return created;
		}
		return settings;
	}

	/** 更新系统设置 */
	async updateSystemSettings(updates: { allowRegistration?: boolean }) {
		const settings = await this.getSystemSettings();
		const [updated] = await db
			.update(systemSettings)
			.set({
				...updates,
				updatedAt: new Date()
			})
			.where(eq(systemSettings.id, settings.id))
			.returning();
		return updated;
	}

	/** 获取所有用户列表（超管功能） */
	async listUsers() {
		const allUsers = await db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				role: users.role,
				lastLoginAt: users.lastLoginAt,
				createdAt: users.createdAt
			})
			.from(users)
			.orderBy(desc(users.createdAt));

		return allUsers.map((u) => ({
			id: u.id,
			name: u.name,
			email: u.email,
			role: u.role as UserRole,
			lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
			createdAt: u.createdAt?.toISOString() ?? new Date().toISOString()
		}));
	}

	/** 更新用户角色（超管功能） */
	async updateUserRole(userId: string, role: UserRole, operatorId: string) {
		// 不能修改自己的角色
		if (userId === operatorId) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "不能修改自己的角色"
			});
		}

		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "用户不存在"
			});
		}

		const [updated] = await db
			.update(users)
			.set({ role })
			.where(eq(users.id, userId))
			.returning();

		return {
			id: updated.id,
			name: updated.name,
			email: updated.email,
			role: updated.role as UserRole,
			lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
			createdAt: updated.createdAt?.toISOString() ?? new Date().toISOString()
		};
	}

	/** 强制重置用户密码（超管功能） */
	async forceResetPassword(userId: string, newPassword: string, operatorId: string) {
		// 不能重置自己的密码（应该用个人设置）
		if (userId === operatorId) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "请通过个人设置修改自己的密码"
			});
		}

		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "用户不存在"
			});
		}

		await db
			.update(users)
			.set({ passwordHash: newPassword })
			.where(eq(users.id, userId));

		return { success: true };
	}

	/** 删除用户（超管功能） */
	async deleteUser(userId: string, operatorId: string) {
		// 不能删除自己
		if (userId === operatorId) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "不能删除自己的账号"
			});
		}

		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "用户不存在"
			});
		}

		// 不能删除其他超级管理员
		if (user.role === "superadmin") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "不能删除超级管理员"
			});
		}

		// 使用事务删除用户及关联数据
		await db.transaction(async (tx) => {
			// 1. 删除用户的 sessions
			await tx.delete(sessions).where(eq(sessions.userId, userId));

			// 2. 获取用户拥有的工作空间
			const ownedWorkspaces = await tx
				.select({ id: workspaces.id })
				.from(workspaces)
				.where(eq(workspaces.ownerId, userId));

			const ownedWorkspaceIds = ownedWorkspaces.map((w) => w.id);

			if (ownedWorkspaceIds.length > 0) {
				// 3. 删除这些工作空间下的 todos
				await tx.delete(todos).where(inArray(todos.workspaceId, ownedWorkspaceIds));

				// 4. 删除这些工作空间下的 test_requirements
				await tx.delete(testRequirements).where(inArray(testRequirements.workspaceId, ownedWorkspaceIds));

				// 5. 删除这些工作空间的成员关系
				await tx.delete(workspaceMembers).where(inArray(workspaceMembers.workspaceId, ownedWorkspaceIds));

				// 6. 删除这些工作空间
				await tx.delete(workspaces).where(inArray(workspaces.id, ownedWorkspaceIds));
			}

			// 7. 删除用户在其他工作空间的成员关系
			await tx.delete(workspaceMembers).where(eq(workspaceMembers.userId, userId));

			// 8. 清理用户创建的 todos 的 createdBy 引用
			await tx.update(todos).set({ createdBy: null }).where(eq(todos.createdBy, userId));

			// 9. 清理用户创建/负责的 test_requirements 的引用
			await tx.update(testRequirements).set({ createdBy: null }).where(eq(testRequirements.createdBy, userId));
			await tx.update(testRequirements).set({ assigneeId: null }).where(eq(testRequirements.assigneeId, userId));

			// 10. 最后删除用户
			await tx.delete(users).where(eq(users.id, userId));
		});

		return { success: true };
	}
}

export const adminService = new AdminService();
