import { useState, useEffect } from "react";
import { Button, Card, Form, Input, Alert, Space, Descriptions, Tag, Spin, Typography, message } from "antd";
import { SaveOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, QuestionCircleOutlined, EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";
import { trpc } from "../../../lib/trpc";

const { Text, Link, Paragraph } = Typography;

export default function TmdbPage() {
  const [form] = Form.useForm();
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 获取系统设置
  const settingsQuery = trpc.admin.getSystemSettings.useQuery();
  const updateSettingsMutation = trpc.admin.updateSystemSettings.useMutation();

  // 获取系统状态来检查 TMDB 连接
  const statusQuery = trpc.systemStatus.getAll.useQuery(undefined, {
    refetchInterval: false,
  });

  const tmdbStatus = statusQuery.data?.tmdb;

  // 设置表单初始值
  useEffect(() => {
    if (settingsQuery.data) {
      form.setFieldsValue({
        tmdbApiKey: settingsQuery.data.tmdbApiKey ?? ""
      });
    }
  }, [settingsQuery.data, form]);

  // 保存 API Key
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await updateSettingsMutation.mutateAsync({
        tmdbApiKey: values.tmdbApiKey || null
      });
      message.success("TMDB API Key 保存成功");
      // 刷新状态
      statusQuery.refetch();
      setTestResult(null);
    } catch (error) {
      message.error("保存失败");
    }
  };

  // 测试连接
  const handleTest = async () => {
    setTestResult(null);
    const result = await statusQuery.refetch();
    const tmdb = result.data?.tmdb;
    setTestResult({
      success: tmdb?.isConnected ?? false,
      message: tmdb?.isConnected
        ? "TMDB 连接成功！"
        : tmdb?.errorMessage || "连接失败"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
          TMDB 设置
        </h1>
        <p className="mt-1 text-slate-500">
          配置 The Movie Database (TMDB) API，用于搜索和获取影视元数据
        </p>
      </div>

      {/* 连接状态 */}
      <Card title="连接状态" size="small">
        {statusQuery.isLoading ? (
          <Spin />
        ) : (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="配置状态">
              {tmdbStatus?.isConfigured ? (
                <Tag color="success">已配置</Tag>
              ) : (
                <Tag color="warning">未配置</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="连接状态">
              {tmdbStatus?.isConnected ? (
                <Tag icon={<CheckCircleOutlined />} color="success">已连接</Tag>
              ) : (
                <Tag icon={<CloseCircleOutlined />} color="error">未连接</Tag>
              )}
            </Descriptions.Item>
            {tmdbStatus?.errorMessage && (
              <Descriptions.Item label="错误信息">
                <Text type="danger">{tmdbStatus.errorMessage}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
        {testResult && (
          <Alert
            type={testResult.success ? "success" : "error"}
            message={testResult.message}
            className="mt-4"
            showIcon
          />
        )}
      </Card>

      {/* API Key 配置 */}
      <Card title="API Key 配置" size="small">
        {settingsQuery.isLoading ? (
          <Spin />
        ) : (
          <Form form={form} layout="vertical" className="max-w-xl">
            <Form.Item
              name="tmdbApiKey"
              label="TMDB API Key"
              extra="从 TMDB 官网获取的 API Key (v3 auth)"
            >
              <Input.Password
                placeholder="请输入 TMDB API Key"
                visibilityToggle={{
                  visible: showApiKey,
                  onVisibleChange: setShowApiKey,
                }}
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                  loading={updateSettingsMutation.isPending}
                >
                  保存
                </Button>
                <Button
                  onClick={handleTest}
                  loading={statusQuery.isFetching}
                  icon={<ReloadOutlined />}
                >
                  测试连接
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Card>

      {/* 获取 API Key 说明 */}
      <Card title="如何获取 API Key" size="small">
        <Alert
          type="info"
          showIcon
          icon={<QuestionCircleOutlined />}
          message="获取步骤"
          description={
            <ol className="list-decimal list-inside space-y-2 mt-2">
              <li>
                访问 <Link href="https://www.themoviedb.org/signup" target="_blank">TMDB 官网</Link> 注册账号
              </li>
              <li>
                登录后进入 <Link href="https://www.themoviedb.org/settings/api" target="_blank">API 设置页面</Link>
              </li>
              <li>
                申请 API Key（选择 Developer 类型即可）
              </li>
              <li>
                复制 API Key (v3 auth) 粘贴到上方输入框并保存
              </li>
            </ol>
          }
        />
      </Card>

      {/* TMDB 功能说明 */}
      <Card title="功能说明" size="small">
        <div className="space-y-4">
          <div>
            <Text strong>🎬 影视搜索</Text>
            <Paragraph className="text-slate-500 mb-0">
              通过 TMDB 搜索电影和电视剧的详细信息，包括海报、简介、评分等
            </Paragraph>
          </div>
          <div>
            <Text strong>📊 元数据获取</Text>
            <Paragraph className="text-slate-500 mb-0">
              自动获取影视作品的完整元数据，用于媒体库的整理和展示
            </Paragraph>
          </div>
          <div>
            <Text strong>🔗 与 PT 站点联动</Text>
            <Paragraph className="text-slate-500 mb-0">
              结合 PT 站点搜索结果，提供更丰富的资源信息
            </Paragraph>
          </div>
        </div>
      </Card>

      {/* 帮助链接 */}
      <Card title="相关链接" size="small">
        <Space direction="vertical">
          <Link href="https://www.themoviedb.org/" target="_blank">
            TMDB 官网
          </Link>
          <Link href="https://www.themoviedb.org/signup" target="_blank">
            注册 TMDB 账号
          </Link>
          <Link href="https://www.themoviedb.org/settings/api" target="_blank">
            获取 API Key
          </Link>
          <Link href="https://developer.themoviedb.org/docs" target="_blank">
            API 文档
          </Link>
        </Space>
      </Card>
    </div>
  );
}
