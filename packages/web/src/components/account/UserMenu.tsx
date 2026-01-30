import { Avatar, Dropdown } from "antd";
import { UserOutlined, ControlOutlined, LogoutOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import type { User } from "@acme/types";
import type { Lang } from "../../lib/types";
import { getAvatarColor, getAvatarInitial } from "../../lib/avatar";

type UserMenuProps = {
  user: User;
  lang: Lang;
  onOpenSettings: () => void;
  onOpenSystemSettings?: () => void;
  onLogout: () => void;
};

export default function UserMenu({ user, lang, onOpenSettings, onOpenSystemSettings, onLogout }: UserMenuProps) {
  const displayName = user.name || user.email;
  const settings = user.settings ?? {};
  const avatarColor = getAvatarColor(displayName);
  const avatarInitial = getAvatarInitial(user.name, user.email);
  const isAdmin = user.role === "admin" || user.role === "superadmin";

  const items: MenuProps["items"] = [
    {
      key: "profile",
      disabled: true,
      label: (
        <div className="flex items-center gap-3 px-2 py-1">
          <Avatar
            size={40}
            src={settings.avatarUrl ?? undefined}
            style={{ backgroundColor: settings.avatarUrl ? undefined : avatarColor }}
          >
            {avatarInitial}
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {displayName}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{user.email}</span>
          </div>
        </div>
      )
    },
    { type: "divider" },
    {
      key: "settings",
      icon: <UserOutlined style={{ color: "#1677ff" }} />,
      label: lang === "zh" ? "账户设置" : "Account"
    },
    // 管理员才显示管理后台
    ...(isAdmin && onOpenSystemSettings
      ? [
          {
            key: "systemSettings",
            icon: <ControlOutlined style={{ color: "#722ed1" }} />,
            label: lang === "zh" ? "管理后台" : "Admin"
          } as const
        ]
      : []),
    {
      key: "logout",
      icon: <LogoutOutlined style={{ color: "#ff4d4f" }} />,
      label: lang === "zh" ? "退出" : "Sign out"
    }
  ];

  const handleClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "settings") {
      onOpenSettings();
    }
    if (key === "systemSettings" && onOpenSystemSettings) {
      onOpenSystemSettings();
    }
    if (key === "logout") {
      onLogout();
    }
  };

  return (
    <Dropdown menu={{ items, onClick: handleClick }} trigger={["hover"]} placement="bottomRight">
      <button
        type="button"
        className="flex items-center gap-2 rounded-full px-2 py-1 text-sm text-slate-700 dark:text-slate-200"
      >
        <Avatar
          size={28}
          src={settings.avatarUrl ?? undefined}
          style={{ backgroundColor: settings.avatarUrl ? undefined : avatarColor }}
        >
          {avatarInitial}
        </Avatar>
        <span className="max-w-[120px] truncate font-medium">{displayName}</span>
      </button>
    </Dropdown>
  );
}
