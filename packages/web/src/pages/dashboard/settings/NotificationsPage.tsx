import { useState } from "react";
import { Button, Card, Checkbox, Form, Input, Modal, Select, Space, Switch, Table, Tag, Typography } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SendOutlined } from "@ant-design/icons";
import { useMessage } from "../../../hooks";
import { trpc } from "../../../lib/trpc";
import type { NotificationChannel, NotificationChannelType, NotificationEvent } from "@acme/types";

const { Text } = Typography;

const channelTypeLabels: Record<NotificationChannelType, string> = {
  telegram: "Telegram",
  bark: "Bark",
  webhook: "Webhook",
  email: "Email"
};

const channelTypeColors: Record<NotificationChannelType, string> = {
  telegram: "blue",
  bark: "orange",
  webhook: "purple",
  email: "green"
};

const eventLabels: Record<NotificationEvent, string> = {
  movie_download_started: "电影开始下载",
  movie_download_completed: "电影下载完成",
  tv_download_started: "剧集开始下载",
  tv_download_completed: "剧集下载完成",
  movie_subscription_added: "新增电影订阅",
  tv_subscription_added: "新增剧集订阅",
  site_error: "站点异常",
  download_error: "下载异常",
  media_organized: "媒体整理完成"
};

const allEvents = Object.keys(eventLabels) as NotificationEvent[];

export default function NotificationsPage() {
  const message = useMessage();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);
  const utils = trpc.useUtils();

  // Queries
  const channelsQuery = trpc.notification.list.useQuery();

  // Mutations
  const createMutation = trpc.notification.create.useMutation({
    onSuccess: () => {
      message.success("通知渠道添加成功");
      setModalOpen(false);
      form.resetFields();
      utils.notification.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || "添加失败");
    }
  });

  const updateMutation = trpc.notification.update.useMutation({
    onSuccess: () => {
      message.success("通知渠道更新成功");
      setModalOpen(false);
      setEditingChannel(null);
      form.resetFields();
      utils.notification.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || "更新失败");
    }
  });

  const deleteMutation = trpc.notification.delete.useMutation({
    onSuccess: () => {
      message.success("通知渠道已删除");
      utils.notification.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || "删除失败");
    }
  });

  const toggleMutation = trpc.notification.toggleEnabled.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || "操作失败");
    }
  });

  const testMutation = trpc.notification.sendTest.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        message.success(result.message || "测试消息发送成功");
      } else {
        message.error(result.message || "测试消息发送失败");
      }
    },
    onError: (error) => {
      message.error(error.message || "发送失败");
    }
  });

  const handleOpenModal = (channel?: NotificationChannel) => {
    if (channel) {
      setEditingChannel(channel);
      const config = channel.config as Record<string, unknown>;
      form.setFieldsValue({
        name: channel.name,
        type: channel.type,
        enabledEvents: channel.enabledEvents,
        isEnabled: channel.isEnabled,
        // Telegram
        telegramApiUrl: config.apiUrl,
        telegramToken: config.token,
        telegramUserId: config.userId,
        telegramProxy: config.proxy,
        // Bark
        barkServerUrl: config.serverUrl,
        barkDeviceKey: config.deviceKey,
        // Webhook
        webhookUrl: config.url,
        webhookMethod: config.method,
      });
    } else {
      setEditingChannel(null);
      form.resetFields();
      form.setFieldsValue({
        type: "telegram",
        isEnabled: true,
        enabledEvents: allEvents,
        telegramApiUrl: "https://api.telegram.org"
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const type = values.type as NotificationChannelType;

    // 根据类型构建配置
    let config: Record<string, unknown> = {};
    if (type === "telegram") {
      config = {
        apiUrl: values.telegramApiUrl || "https://api.telegram.org",
        token: values.telegramToken,
        userId: values.telegramUserId,
        proxy: values.telegramProxy
      };
    } else if (type === "bark") {
      config = {
        serverUrl: values.barkServerUrl,
        deviceKey: values.barkDeviceKey
      };
    } else if (type === "webhook") {
      config = {
        url: values.webhookUrl,
        method: values.webhookMethod || "POST"
      };
    }

    const payload = {
      name: values.name,
      type,
      config,
      enabledEvents: values.enabledEvents,
      isEnabled: values.isEnabled
    };

    if (editingChannel) {
      await updateMutation.mutateAsync({ id: editingChannel.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const handleDelete = (channel: NotificationChannel) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除通知渠道 "${channel.name}" 吗？`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => deleteMutation.mutateAsync({ id: channel.id })
    });
  };

  const columns = [
    {
      title: "渠道名称",
      dataIndex: "name",
      key: "name",
      render: (name: string) => <Text strong>{name}</Text>
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      render: (type: NotificationChannelType) => (
        <Tag color={channelTypeColors[type]}>{channelTypeLabels[type]}</Tag>
      )
    },
    {
      title: "启用事件",
      dataIndex: "enabledEvents",
      key: "enabledEvents",
      render: (events: NotificationEvent[] | null) => (
        <Space wrap>
          {(events ?? []).slice(0, 3).map((event) => (
            <Tag key={event}>{eventLabels[event]}</Tag>
          ))}
          {(events?.length ?? 0) > 3 && (
            <Tag>+{(events?.length ?? 0) - 3}</Tag>
          )}
        </Space>
      )
    },
    {
      title: "状态",
      dataIndex: "isEnabled",
      key: "isEnabled",
      render: (enabled: boolean, record: NotificationChannel) => (
        <Switch
          checked={enabled}
          onChange={() => toggleMutation.mutate({ id: record.id })}
          loading={toggleMutation.isPending}
        />
      )
    },
    {
      title: "操作",
      key: "actions",
      render: (_: unknown, record: NotificationChannel) => (
        <Space>
          <Button
            type="text"
            icon={<SendOutlined />}
            onClick={() => testMutation.mutate({ id: record.id })}
            loading={testMutation.isPending}
            title="发送测试消息"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Space>
      )
    }
  ];

  return (
    <div className="p-6">
      <Card
        title="通知渠道管理"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => channelsQuery.refetch()}
              loading={channelsQuery.isRefetching}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal()}
            >
              添加渠道
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={channelsQuery.data ?? []}
          columns={columns}
          rowKey="id"
          loading={channelsQuery.isLoading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingChannel ? "编辑通知渠道" : "添加通知渠道"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingChannel(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={700}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="渠道别名"
            rules={[{ required: true, message: "请输入名称" }]}
            extra="设置一个唯一的别名，方便被引用"
          >
            <Input placeholder="如：Telegram Emil" />
          </Form.Item>

          <Form.Item
            name="type"
            label="渠道类型"
            rules={[{ required: true }]}
          >
            <Select disabled={!!editingChannel}>
              <Select.Option value="telegram">Telegram</Select.Option>
              <Select.Option value="bark">Bark</Select.Option>
              <Select.Option value="webhook">Webhook</Select.Option>
              <Select.Option value="email">Email (暂不支持)</Select.Option>
            </Select>
          </Form.Item>

          {/* Telegram 配置 */}
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
            {({ getFieldValue }) =>
              getFieldValue("type") === "telegram" && (
                <>
                  <Form.Item
                    name="telegramApiUrl"
                    label="推送API地址"
                    extra="telegram的api服务地址，默认是官方，可以改为自建"
                  >
                    <Input placeholder="https://api.telegram.org" />
                  </Form.Item>
                  <Form.Item
                    name="telegramToken"
                    label="Token"
                    rules={[{ required: true, message: "请输入 Token" }]}
                    extra="访问接口的Token，BotFather获取到的"
                  >
                    <Input.Password placeholder="输入 Bot Token" />
                  </Form.Item>
                  <Form.Item
                    name="telegramUserId"
                    label="User ID"
                    rules={[{ required: true, message: "请输入 User ID" }]}
                    extra="getuserId /start 获取到的一个数字编号"
                  >
                    <Input placeholder="输入 User ID" />
                  </Form.Item>
                  <Form.Item
                    name="telegramProxy"
                    label="代理设置"
                    extra="留空则不使用代理。支持通过HTTP代理、SOCKS代理发送消息。示范: http://localhost:8030 或 socks5://user:pass@host:port"
                  >
                    <Input placeholder="http://localhost:8030" />
                  </Form.Item>
                </>
              )
            }
          </Form.Item>

          {/* Bark 配置 */}
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
            {({ getFieldValue }) =>
              getFieldValue("type") === "bark" && (
                <>
                  <Form.Item
                    name="barkServerUrl"
                    label="服务器地址"
                    rules={[
                      { required: true, message: "请输入服务器地址" },
                      { type: "url", message: "请输入有效的 URL" }
                    ]}
                  >
                    <Input placeholder="https://api.day.app" />
                  </Form.Item>
                  <Form.Item
                    name="barkDeviceKey"
                    label="Device Key"
                    rules={[{ required: true, message: "请输入 Device Key" }]}
                  >
                    <Input placeholder="输入 Device Key" />
                  </Form.Item>
                </>
              )
            }
          </Form.Item>

          {/* Webhook 配置 */}
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
            {({ getFieldValue }) =>
              getFieldValue("type") === "webhook" && (
                <>
                  <Form.Item
                    name="webhookUrl"
                    label="Webhook URL"
                    rules={[
                      { required: true, message: "请输入 Webhook URL" },
                      { type: "url", message: "请输入有效的 URL" }
                    ]}
                  >
                    <Input placeholder="https://example.com/webhook" />
                  </Form.Item>
                  <Form.Item name="webhookMethod" label="请求方法">
                    <Select defaultValue="POST">
                      <Select.Option value="GET">GET</Select.Option>
                      <Select.Option value="POST">POST</Select.Option>
                    </Select>
                  </Form.Item>
                </>
              )
            }
          </Form.Item>

          <Form.Item
            name="enabledEvents"
            label="启用的事件"
            extra="产生所选消息时，推送通知"
          >
            <Checkbox.Group
              options={allEvents.map((event) => ({
                label: eventLabels[event],
                value: event
              }))}
            />
          </Form.Item>

          <Form.Item name="isEnabled" label="启用这个通知" valuePropName="checked" extra="如果多个通道都启用，则同时推送">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
