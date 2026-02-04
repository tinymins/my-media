import { useState, useEffect } from "react";
import { Button, Card, Form, Input, Modal, Select, Space, Switch, Table, Tag, Typography, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from "@ant-design/icons";
import { useMessage } from "../../../hooks";
import { trpc } from "../../../lib/trpc";
import type { PtSite, PtSiteStatus } from "@acme/types";

const { Text } = Typography;

export default function PtSitesPage() {
  const message = useMessage();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<PtSite | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, PtSiteStatus>>({});
  const [loadingStatus, setLoadingStatus] = useState(false);
  const utils = trpc.useUtils();

  // Queries
  const sitesQuery = trpc.ptSite.list.useQuery();
  const availableSitesQuery = trpc.ptSite.getAvailableSites.useQuery();
  const statusQuery = trpc.ptSite.listWithStatus.useQuery(undefined, {
    enabled: false, // 手动触发
  });

  // 加载站点状态
  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const result = await statusQuery.refetch();
      if (result.data) {
        const map: Record<string, PtSiteStatus> = {};
        for (const status of result.data) {
          map[status.id] = status;
        }
        setStatusMap(map);
      }
    } finally {
      setLoadingStatus(false);
    }
  };

  // 首次加载时获取状态
  useEffect(() => {
    if (sitesQuery.data && sitesQuery.data.length > 0) {
      loadStatus();
    }
  }, [sitesQuery.data?.length]);

  // Mutations
  const createMutation = trpc.ptSite.create.useMutation({
    onSuccess: () => {
      message.success("站点添加成功");
      setModalOpen(false);
      form.resetFields();
      utils.ptSite.list.invalidate();
      loadStatus();
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
      loadStatus();
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
      loadStatus();
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
    // 清理空字符串，转为 null
    const cleanedValues = {
      ...values,
      domain: values.domain || null,
      cookies: values.cookies || null,
      apiKey: values.apiKey || null
    };
    if (editingSite) {
      await updateMutation.mutateAsync({ id: editingSite.id, ...cleanedValues });
    } else {
      await createMutation.mutateAsync(cleanedValues);
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
      title: "站点",
      dataIndex: "name",
      key: "name",
      width: 180,
      render: (name: string, record: PtSite) => {
        const status = statusMap[record.id];
        return (
          <Space direction="vertical" size={0}>
            <a href={record.domain} target="_blank" rel="noopener noreferrer">
              <Text strong>{name}</Text>
            </a>
            {status?.userInfo?.username && (
              <Text type="secondary" className="text-xs">{status.userInfo.username}</Text>
            )}
          </Space>
        );
      }
    },
    {
      title: "分享率",
      key: "shareRatio",
      width: 100,
      align: "center" as const,
      render: (_: unknown, record: PtSite) => {
        const status = statusMap[record.id];
        if (!status?.userInfo?.shareRatio) return <Text type="secondary">-</Text>;
        const ratio = parseFloat(status.userInfo.shareRatio);
        return (
          <Text type={ratio >= 1 ? "success" : ratio >= 0.5 ? "warning" : "danger"}>
            {status.userInfo.shareRatio}
          </Text>
        );
      }
    },
    {
      title: "上传量",
      key: "uploaded",
      width: 100,
      align: "right" as const,
      render: (_: unknown, record: PtSite) => {
        const status = statusMap[record.id];
        return status?.userInfo?.uploaded || <Text type="secondary">-</Text>;
      }
    },
    {
      title: "下载量",
      key: "downloaded",
      width: 100,
      align: "right" as const,
      render: (_: unknown, record: PtSite) => {
        const status = statusMap[record.id];
        return status?.userInfo?.downloaded || <Text type="secondary">-</Text>;
      }
    },
    {
      title: "状态",
      key: "status",
      width: 80,
      align: "center" as const,
      render: (_: unknown, record: PtSite) => {
        if (!record.isEnabled) {
          return <Tag>已禁用</Tag>;
        }
        const status = statusMap[record.id];
        if (loadingStatus && !status) {
          return <SyncOutlined spin />;
        }
        if (status?.isLoggedIn) {
          return <Tag icon={<CheckCircleOutlined />} color="success">可用</Tag>;
        }
        return (
          <Tooltip title={status?.errorMessage || "未连接"}>
            <Tag icon={<CloseCircleOutlined />} color="error">异常</Tag>
          </Tooltip>
        );
      }
    },
    {
      title: "做种",
      key: "seeding",
      width: 60,
      align: "center" as const,
      render: (_: unknown, record: PtSite) => {
        const status = statusMap[record.id];
        return status?.userInfo?.seeding ?? <Text type="secondary">-</Text>;
      }
    },
    {
      title: "操作",
      key: "actions",
      width: 100,
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
        title="全部站点"
        extra={
          <Space>
            <Button
              icon={<SyncOutlined spin={loadingStatus} />}
              onClick={loadStatus}
              loading={loadingStatus}
            >
              刷新状态
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
            name="siteId"
            label="选择站点"
            rules={[{ required: true, message: "请选择站点" }]}
            extra="从配置目录加载的可用站点（站点标识需与配置文件 id 一致）"
          >
            <Select
              placeholder="请选择站点"
              onChange={(value) => {
                const site = availableSitesQuery.data?.find(s => s.id === value);
                if (site) {
                  form.setFieldsValue({
                    name: site.name,
                    domain: site.domain,
                    authType: site.allowAuthType[0] || "cookies"
                  });
                }
              }}
            >
              {availableSitesQuery.data?.map(site => (
                <Select.Option key={site.id} value={site.id}>
                  {site.name} ({site.id})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="显示名称"
            rules={[{ required: true, message: "请输入站点名称" }]}
          >
            <Input placeholder="如：馒头" />
          </Form.Item>

          <Form.Item
            name="domain"
            label="站点域名"
            extra="可自动从配置文件读取"
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

          <Form.Item name="isEnabled" label="启用状态" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
