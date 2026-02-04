import { useState } from "react";
import { Button, Card, Form, Input, Modal, Select, Space, Switch, Table, Tag, Typography } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useMessage } from "../../../hooks";
import { trpc } from "../../../lib/trpc";
import type { PtSite } from "@acme/types";

const { Text } = Typography;

export default function PtSitesPage() {
  const message = useMessage();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<PtSite | null>(null);
  const utils = trpc.useUtils();

  // Queries
  const sitesQuery = trpc.ptSite.list.useQuery();

  // Mutations
  const createMutation = trpc.ptSite.create.useMutation({
    onSuccess: () => {
      message.success("站点添加成功");
      setModalOpen(false);
      form.resetFields();
      utils.ptSite.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || "添加失败");
    }
  });

  const updateMutation = trpc.ptSite.update.useMutation({
    onSuccess: () => {
      message.success("站点更新成功");
      setModalOpen(false);
      setEditingSite(null);
      form.resetFields();
      utils.ptSite.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || "更新失败");
    }
  });

  const deleteMutation = trpc.ptSite.delete.useMutation({
    onSuccess: () => {
      message.success("站点已删除");
      utils.ptSite.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || "删除失败");
    }
  });

  const toggleMutation = trpc.ptSite.toggleEnabled.useMutation({
    onSuccess: () => {
      utils.ptSite.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || "操作失败");
    }
  });

  const handleOpenModal = (site?: PtSite) => {
    if (site) {
      setEditingSite(site);
      form.setFieldsValue({
        name: site.name,
        siteId: site.siteId,
        domain: site.domain,
        authType: site.authType,
        cookies: site.cookies,
        apiKey: site.apiKey,
        configUrl: site.configUrl,
        isEnabled: site.isEnabled
      });
    } else {
      setEditingSite(null);
      form.resetFields();
      form.setFieldsValue({ authType: "cookies", isEnabled: true });
    }
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingSite) {
      await updateMutation.mutateAsync({ id: editingSite.id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const handleDelete = (site: PtSite) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除站点 "${site.name}" 吗？`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => deleteMutation.mutateAsync({ id: site.id })
    });
  };

  const columns = [
    {
      title: "站点名称",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: PtSite) => (
        <Space>
          <Text strong>{name}</Text>
          <Text type="secondary">({record.siteId})</Text>
        </Space>
      )
    },
    {
      title: "域名",
      dataIndex: "domain",
      key: "domain",
      render: (domain: string) => (
        <a href={domain} target="_blank" rel="noopener noreferrer">
          {domain}
        </a>
      )
    },
    {
      title: "认证方式",
      dataIndex: "authType",
      key: "authType",
      render: (authType: string) => (
        <Tag color={authType === "cookies" ? "blue" : "green"}>
          {authType === "cookies" ? "Cookies" : "API Key"}
        </Tag>
      )
    },
    {
      title: "状态",
      dataIndex: "isEnabled",
      key: "isEnabled",
      render: (enabled: boolean, record: PtSite) => (
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
      render: (_: unknown, record: PtSite) => (
        <Space>
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
        title="PT/BT 站点管理"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => sitesQuery.refetch()}
              loading={sitesQuery.isRefetching}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal()}
            >
              添加站点
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={sitesQuery.data ?? []}
          columns={columns}
          rowKey="id"
          loading={sitesQuery.isLoading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingSite ? "编辑站点" : "添加站点"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingSite(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="站点名称"
            rules={[{ required: true, message: "请输入站点名称" }]}
          >
            <Input placeholder="如：馒头" />
          </Form.Item>

          <Form.Item
            name="siteId"
            label="站点标识"
            rules={[{ required: true, message: "请输入站点标识" }]}
            extra="唯一标识符，用于识别站点配置文件"
          >
            <Input placeholder="如：mteam" disabled={!!editingSite} />
          </Form.Item>

          <Form.Item
            name="domain"
            label="站点域名"
            rules={[
              { required: true, message: "请输入站点域名" },
              { type: "url", message: "请输入有效的 URL" }
            ]}
          >
            <Input placeholder="如：https://api.m-team.cc/" />
          </Form.Item>

          <Form.Item
            name="authType"
            label="认证方式"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="cookies">Cookies</Select.Option>
              <Select.Option value="api_key">API Key</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.authType !== curr.authType}
          >
            {({ getFieldValue }) =>
              getFieldValue("authType") === "cookies" ? (
                <Form.Item
                  name="cookies"
                  label="Cookies"
                  extra="从浏览器复制完整的 Cookie 字符串"
                >
                  <Input.TextArea rows={3} placeholder="name=value; name2=value2; ..." />
                </Form.Item>
              ) : (
                <Form.Item
                  name="apiKey"
                  label="API Key"
                  extra="站点提供的 API 密钥"
                >
                  <Input.Password placeholder="输入 API Key" />
                </Form.Item>
              )
            }
          </Form.Item>

          <Form.Item
            name="configUrl"
            label="配置文件 URL"
            extra="远程配置文件地址，用于自动更新站点解析规则"
          >
            <Input placeholder="https://example.com/config/mteam.yml" />
          </Form.Item>

          <Form.Item name="isEnabled" label="启用状态" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
