import { useState } from "react";
import { Button, Card, Form, Input, Modal, Select, Space, Switch, Table, Tag, Typography } from "antd";
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, StarOutlined, StarFilled } from "@ant-design/icons";
import TorrentListModal from "../../../components/dashboard/TorrentListModal";
import { useMessage } from "../../../hooks";
import { trpc } from "../../../lib/trpc";
import type { DownloadClient, DownloadClientType } from "@acme/types";

const { Text, Link } = Typography;

const clientTypeLabels: Record<DownloadClientType, string> = {
  qbittorrent: "qBittorrent",
  transmission: "Transmission",
  aria2: "Aria2"
};

const clientTypeColors: Record<DownloadClientType, string> = {
  qbittorrent: "blue",
  transmission: "red",
  aria2: "cyan"
};

export default function DownloadClientsPage() {
  const message = useMessage();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<DownloadClient | null>(null);
  const [viewingClient, setViewingClient] = useState<DownloadClient | null>(null);
  const utils = trpc.useUtils();

  // Queries
  const clientsQuery = trpc.downloadClient.list.useQuery();

  // Mutations
  const createMutation = trpc.downloadClient.create.useMutation({
    onSuccess: () => {
      message.success("下载器添加成功");
      setModalOpen(false);
      form.resetFields();
      utils.downloadClient.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || "添加失败");
    }
  });

  const updateMutation = trpc.downloadClient.update.useMutation({
    onSuccess: () => {
      message.success("下载器更新成功");
      setModalOpen(false);
      setEditingClient(null);
      form.resetFields();
      utils.downloadClient.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || "更新失败");
    }
  });

  const deleteMutation = trpc.downloadClient.delete.useMutation({
    onSuccess: () => {
      message.success("下载器已删除");
      utils.downloadClient.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || "删除失败");
    }
  });

  const toggleMutation = trpc.downloadClient.toggleEnabled.useMutation({
    onSuccess: () => {
      utils.downloadClient.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || "操作失败");
    }
  });

  const setDefaultMutation = trpc.downloadClient.setDefault.useMutation({
    onSuccess: () => {
      message.success("已设置为默认下载器");
      utils.downloadClient.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || "操作失败");
    }
  });

  const handleOpenModal = (client?: DownloadClient) => {
    if (client) {
      setEditingClient(client);
      form.setFieldsValue({
        name: client.name,
        type: client.type,
        url: client.url,
        username: client.username,
        password: client.password,
        downloadPath: client.downloadPath,
        isDefault: client.isDefault,
        requireAuth: client.requireAuth,
        monitorEnabled: client.monitorEnabled,
        isEnabled: client.isEnabled
      });
    } else {
      setEditingClient(null);
      form.resetFields();
      form.setFieldsValue({ type: "qbittorrent", requireAuth: true, isEnabled: true });
    }
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingClient) {
      await updateMutation.mutateAsync({ id: editingClient.id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const handleDelete = (client: DownloadClient) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除下载器 "${client.name}" 吗？`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => deleteMutation.mutateAsync({ id: client.id })
    });
  };

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: DownloadClient) => (
        <Space>
          <Text strong>{name}</Text>
          {record.isDefault && (
            <Tag color="gold" icon={<StarFilled />}>
              默认
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      render: (type: DownloadClientType) => (
        <Tag color={clientTypeColors[type]}>{clientTypeLabels[type]}</Tag>
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
      render: (enabled: boolean, record: DownloadClient) => (
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
      render: (_: unknown, record: DownloadClient) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => setViewingClient(record)}
            title="查看种子"
          />
          {!record.isDefault && (
            <Button
              type="text"
              icon={<StarOutlined />}
              onClick={() => setDefaultMutation.mutate({ id: record.id })}
              title="设为默认"
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
        title="下载工具管理"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => clientsQuery.refetch()}
              loading={clientsQuery.isRefetching}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal()}
            >
              添加下载器
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={clientsQuery.data ?? []}
          columns={columns}
          rowKey="id"
          loading={clientsQuery.isLoading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingClient ? "编辑下载器" : "添加下载器"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingClient(null);
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
            extra="设定一个别名，方便记忆"
          >
            <Input placeholder="如：qBittorrent" />
          </Form.Item>

          <Form.Item
            name="type"
            label="下载器类型"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="qbittorrent">qBittorrent</Select.Option>
              <Select.Option value="transmission">Transmission</Select.Option>
              <Select.Option value="aria2">Aria2</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="url"
            label="访问地址"
            rules={[
              { required: true, message: "请输入访问地址" },
              { type: "url", message: "请输入有效的 URL" }
            ]}
            extra="网站服务的访问地址，带协议类型和端口号"
          >
            <Input placeholder="http://192.168.1.80:8080" />
          </Form.Item>

          <Form.Item name="username" label="登陆账号" extra="用于登陆的管理账号">
            <Input placeholder="admin" />
          </Form.Item>

          <Form.Item name="password" label="登陆密码" extra="用于登陆的密码">
            <Input.Password placeholder="输入密码" />
          </Form.Item>

          <Form.Item
            name="downloadPath"
            label="默认下载路径"
            extra="种子默认保存位置"
          >
            <Input placeholder="/downloads" />
          </Form.Item>

          <Form.Item name="isDefault" label="设为默认" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="requireAuth" label="需要登陆(没配置内网免登必须勾选)" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="monitorEnabled" label="监控手动提交到下载器指定目录的种子" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="isEnabled" label="启用状态" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 种子列表弹窗 */}
      {viewingClient && (
        <TorrentListModal
          open={!!viewingClient}
          onClose={() => setViewingClient(null)}
          client={viewingClient}
        />
      )}
    </div>
  );
}
