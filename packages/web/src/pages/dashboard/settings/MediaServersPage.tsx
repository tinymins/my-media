import { useState } from "react";
import { Button, Card, Form, Input, Modal, Select, Space, Switch, Table, Tag, Typography } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, StarOutlined, StarFilled } from "@ant-design/icons";
import { useMessage } from "../../../hooks";
import { trpc } from "../../../lib/trpc";
import type { MediaServer, MediaServerType } from "@acme/types";

const { Text, Link } = Typography;

const serverTypeLabels: Record<MediaServerType, string> = {
  plex: "Plex",
  emby: "Emby",
  jellyfin: "Jellyfin"
};

const serverTypeColors: Record<MediaServerType, string> = {
  plex: "orange",
  emby: "green",
  jellyfin: "purple"
};

export default function MediaServersPage() {
  const message = useMessage();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<MediaServer | null>(null);
  const utils = trpc.useUtils();

  // Queries
  const serversQuery = trpc.mediaServer.list.useQuery();

  // Mutations
  const createMutation = trpc.mediaServer.create.useMutation({
    onSuccess: () => {
      message.success("媒体服务器添加成功");
      setModalOpen(false);
      form.resetFields();
      utils.mediaServer.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || "添加失败");
    }
  });

  const updateMutation = trpc.mediaServer.update.useMutation({
    onSuccess: () => {
      message.success("媒体服务器更新成功");
      setModalOpen(false);
      setEditingServer(null);
      form.resetFields();
      utils.mediaServer.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || "更新失败");
    }
  });

  const deleteMutation = trpc.mediaServer.delete.useMutation({
    onSuccess: () => {
      message.success("媒体服务器已删除");
      utils.mediaServer.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || "删除失败");
    }
  });

  const toggleMutation = trpc.mediaServer.toggleEnabled.useMutation({
    onSuccess: () => {
      utils.mediaServer.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || "操作失败");
    }
  });

  const setPrimaryMutation = trpc.mediaServer.setPrimary.useMutation({
    onSuccess: () => {
      message.success("已设置为主要媒体服务器");
      utils.mediaServer.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || "操作失败");
    }
  });

  const handleOpenModal = (server?: MediaServer) => {
    if (server) {
      setEditingServer(server);
      form.setFieldsValue({
        name: server.name,
        type: server.type,
        url: server.url,
        externalUrl: server.externalUrl,
        token: server.token,
        apiKey: server.apiKey,
        isPrimary: server.isPrimary,
        autoRefresh: server.autoRefresh,
        isEnabled: server.isEnabled
      });
    } else {
      setEditingServer(null);
      form.resetFields();
      form.setFieldsValue({ type: "plex", isEnabled: true });
    }
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingServer) {
      await updateMutation.mutateAsync({ id: editingServer.id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const handleDelete = (server: MediaServer) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除媒体服务器 "${server.name}" 吗？`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => deleteMutation.mutateAsync({ id: server.id })
    });
  };

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: MediaServer) => (
        <Space>
          <Text strong>{name}</Text>
          {record.isPrimary && (
            <Tag color="gold" icon={<StarFilled />}>
              主要
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      render: (type: MediaServerType) => (
        <Tag color={serverTypeColors[type]}>{serverTypeLabels[type]}</Tag>
      )
    },
    {
      title: "访问地址",
      dataIndex: "url",
      key: "url",
      render: (url: string) => (
        <Link href={url} target="_blank">
          {url}
        </Link>
      )
    },
    {
      title: "状态",
      dataIndex: "isEnabled",
      key: "isEnabled",
      render: (enabled: boolean, record: MediaServer) => (
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
      render: (_: unknown, record: MediaServer) => (
        <Space>
          {!record.isPrimary && (
            <Button
              type="text"
              icon={<StarOutlined />}
              onClick={() => setPrimaryMutation.mutate({ id: record.id })}
              title="设为主要"
            />
          )}
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
        title="媒体服务器管理"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => serversQuery.refetch()}
              loading={serversQuery.isRefetching}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal()}
            >
              添加服务器
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={serversQuery.data ?? []}
          columns={columns}
          rowKey="id"
          loading={serversQuery.isLoading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingServer ? "编辑媒体服务器" : "添加媒体服务器"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingServer(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: "请输入名称" }]}
            extra="设定一个别名展示，方便识别"
          >
            <Input placeholder="如：plex" />
          </Form.Item>

          <Form.Item
            name="type"
            label="服务器类型"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="plex">Plex</Select.Option>
              <Select.Option value="emby">Emby</Select.Option>
              <Select.Option value="jellyfin">Jellyfin</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="url"
            label="访问地址"
            rules={[
              { required: true, message: "请输入访问地址" },
              { type: "url", message: "请输入有效的 URL" }
            ]}
            extra="媒体服务器的访问地址（建议内网），如：http://192.168.1.80:8081"
          >
            <Input placeholder="http://192.168.1.80:32400" />
          </Form.Item>

          <Form.Item
            name="externalUrl"
            label="外网访问地址"
            rules={[{ type: "url", message: "请输入有效的 URL" }]}
            extra="媒体服务器的外网可访问地址，用于推送通知、等高级功能使用"
          >
            <Input placeholder="https://plex.example.com" />
          </Form.Item>

          <Form.Item
            name="token"
            label="Token"
            extra="用于访问 Plex 接口的 Token"
          >
            <Input.Password placeholder="输入 Token" />
          </Form.Item>

          <Form.Item name="isPrimary" label="设为主要媒体服务器" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="autoRefresh" label="新增内容时自动通知媒体库刷新" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="isEnabled" label="启用状态" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
