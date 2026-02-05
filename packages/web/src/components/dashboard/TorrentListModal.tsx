import { useState, useMemo } from "react";
import {
  Modal,
  Table,
  Space,
  Button,
  Tag,
  Input,
  Select,
  Progress,
  Tooltip,
  Typography,
  Popconfirm,
  Statistic,
  Card,
  Row,
  Col
} from "antd";
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  CloudDownloadOutlined,
  CloudUploadOutlined,
  HddOutlined
} from "@ant-design/icons";
import type { DownloadClient, TorrentInfo, TorrentState } from "@acme/types";
import { trpc } from "../../lib/trpc";
import { useMessage } from "../../hooks";

const { Text } = Typography;

interface TorrentListModalProps {
  open: boolean;
  onClose: () => void;
  client: DownloadClient;
}

// 状态映射
const stateLabels: Record<TorrentState, string> = {
  downloading: "下载中",
  seeding: "做种中",
  pausedDL: "暂停下载",
  pausedUP: "暂停做种",
  stalledDL: "等待下载",
  stalledUP: "等待做种",
  checkingDL: "校验中",
  checkingUP: "校验中",
  queuedDL: "排队下载",
  queuedUP: "排队做种",
  error: "错误",
  missingFiles: "文件丢失",
  uploading: "上传中",
  completed: "已完成",
  unknown: "未知"
};

const stateColors: Record<TorrentState, string> = {
  downloading: "processing",
  seeding: "success",
  pausedDL: "warning",
  pausedUP: "warning",
  stalledDL: "default",
  stalledUP: "default",
  checkingDL: "processing",
  checkingUP: "processing",
  queuedDL: "default",
  queuedUP: "default",
  error: "error",
  missingFiles: "error",
  uploading: "processing",
  completed: "success",
  unknown: "default"
};

// 格式化文件大小
const formatSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
};

// 格式化速度
const formatSpeed = (bytesPerSecond: number): string => {
  return `${formatSize(bytesPerSecond)}/s`;
};

// 格式化时间
const formatEta = (seconds?: number): string => {
  if (!seconds || seconds < 0 || seconds > 8640000) return "∞";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

// 格式化日期
const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString("zh-CN");
};

export default function TorrentListModal({ open, onClose, client }: TorrentListModalProps) {
  const message = useMessage();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");

  const utils = trpc.useUtils();

  // 获取种子列表
  const torrentsQuery = trpc.downloadClient.getTorrents.useQuery(
    { id: client.id },
    { enabled: open, refetchInterval: 3000 }
  );

  // 获取传输信息
  const transferQuery = trpc.downloadClient.getTransferInfo.useQuery(
    { id: client.id },
    { enabled: open, refetchInterval: 3000 }
  );

  // 暂停操作
  const pauseMutation = trpc.downloadClient.pauseTorrents.useMutation({
    onSuccess: () => {
      message.success("已暂停选中的种子");
      utils.downloadClient.getTorrents.invalidate({ id: client.id });
      setSelectedRowKeys([]);
    },
    onError: (err) => message.error(err.message || "操作失败")
  });

  // 恢复操作
  const resumeMutation = trpc.downloadClient.resumeTorrents.useMutation({
    onSuccess: () => {
      message.success("已恢复选中的种子");
      utils.downloadClient.getTorrents.invalidate({ id: client.id });
      setSelectedRowKeys([]);
    },
    onError: (err) => message.error(err.message || "操作失败")
  });

  // 删除操作
  const deleteMutation = trpc.downloadClient.deleteTorrents.useMutation({
    onSuccess: () => {
      message.success("已删除选中的种子");
      utils.downloadClient.getTorrents.invalidate({ id: client.id });
      setSelectedRowKeys([]);
    },
    onError: (err) => message.error(err.message || "操作失败")
  });

  // 过滤后的数据
  const filteredData = useMemo(() => {
    let data = torrentsQuery.data ?? [];

    // 按搜索文本过滤
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      data = data.filter(
        (t) =>
          t.name.toLowerCase().includes(lowerSearch) ||
          t.category?.toLowerCase().includes(lowerSearch) ||
          t.savePath.toLowerCase().includes(lowerSearch)
      );
    }

    // 按状态过滤
    if (stateFilter !== "all") {
      data = data.filter((t) => t.state === stateFilter);
    }

    return data;
  }, [torrentsQuery.data, searchText, stateFilter]);

  // 计算统计信息
  const stats = useMemo(() => {
    const torrents = torrentsQuery.data ?? [];
    return {
      total: torrents.length,
      downloading: torrents.filter((t) => t.state === "downloading").length,
      seeding: torrents.filter((t) => ["seeding", "uploading"].includes(t.state)).length,
      paused: torrents.filter((t) => ["pausedDL", "pausedUP"].includes(t.state)).length
    };
  }, [torrentsQuery.data]);

  const handlePause = (hashes: string[]) => {
    if (hashes.length === 0) return;
    pauseMutation.mutate({ id: client.id, hashes });
  };

  const handleResume = (hashes: string[]) => {
    if (hashes.length === 0) return;
    resumeMutation.mutate({ id: client.id, hashes });
  };

  const handleDelete = (hashes: string[], deleteFiles = false) => {
    if (hashes.length === 0) return;
    deleteMutation.mutate({ id: client.id, hashes, deleteFiles });
  };

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      width: "35%",
      render: (name: string, record: TorrentInfo) => (
        <Tooltip title={`保存路径: ${record.savePath}`}>
          <Text ellipsis style={{ maxWidth: "100%" }}>
            {name}
          </Text>
        </Tooltip>
      )
    },
    {
      title: "大小",
      dataIndex: "size",
      key: "size",
      width: 100,
      sorter: (a: TorrentInfo, b: TorrentInfo) => a.size - b.size,
      render: (size: number) => formatSize(size)
    },
    {
      title: "进度",
      dataIndex: "progress",
      key: "progress",
      width: 120,
      sorter: (a: TorrentInfo, b: TorrentInfo) => a.progress - b.progress,
      render: (progress: number) => (
        <Progress
          percent={Math.round(progress * 100)}
          size="small"
          status={progress >= 1 ? "success" : "active"}
          format={(p) => `${p}%`}
        />
      )
    },
    {
      title: "状态",
      dataIndex: "state",
      key: "state",
      width: 100,
      render: (state: TorrentState) => (
        <Tag color={stateColors[state]}>{stateLabels[state]}</Tag>
      )
    },
    {
      title: "下载速度",
      dataIndex: "downloadSpeed",
      key: "downloadSpeed",
      width: 110,
      sorter: (a: TorrentInfo, b: TorrentInfo) => a.downloadSpeed - b.downloadSpeed,
      render: (speed: number) => (
        <Text type={speed > 0 ? "success" : "secondary"}>{formatSpeed(speed)}</Text>
      )
    },
    {
      title: "上传速度",
      dataIndex: "uploadSpeed",
      key: "uploadSpeed",
      width: 110,
      sorter: (a: TorrentInfo, b: TorrentInfo) => a.uploadSpeed - b.uploadSpeed,
      render: (speed: number) => (
        <Text type={speed > 0 ? "warning" : "secondary"}>{formatSpeed(speed)}</Text>
      )
    },
    {
      title: "分享率",
      dataIndex: "ratio",
      key: "ratio",
      width: 80,
      sorter: (a: TorrentInfo, b: TorrentInfo) => a.ratio - b.ratio,
      render: (ratio: number) => (
        <Text type={ratio >= 1 ? "success" : "secondary"}>{ratio.toFixed(2)}</Text>
      )
    },
    {
      title: "ETA",
      dataIndex: "eta",
      key: "eta",
      width: 80,
      render: (eta?: number) => formatEta(eta)
    },
    {
      title: "添加时间",
      dataIndex: "addedOn",
      key: "addedOn",
      width: 150,
      sorter: (a: TorrentInfo, b: TorrentInfo) => a.addedOn - b.addedOn,
      render: (timestamp: number) => formatDate(timestamp)
    },
    {
      title: "操作",
      key: "actions",
      width: 120,
      fixed: "right" as const,
      render: (_: unknown, record: TorrentInfo) => {
        const isPaused = ["pausedDL", "pausedUP"].includes(record.state);
        return (
          <Space size="small">
            {isPaused ? (
              <Tooltip title="恢复">
                <Button
                  type="text"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleResume([record.hash])}
                  loading={resumeMutation.isPending}
                />
              </Tooltip>
            ) : (
              <Tooltip title="暂停">
                <Button
                  type="text"
                  size="small"
                  icon={<PauseCircleOutlined />}
                  onClick={() => handlePause([record.hash])}
                  loading={pauseMutation.isPending}
                />
              </Tooltip>
            )}
            <Popconfirm
              title="删除种子"
              description="是否同时删除文件？"
              onConfirm={() => handleDelete([record.hash], true)}
              onCancel={() => handleDelete([record.hash], false)}
              okText="删除文件"
              cancelText="仅删除种子"
            >
              <Tooltip title="删除">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as string[])
  };

  return (
    <Modal
      title={
        <Space>
          <span>{client.name} - 种子管理</span>
          <Tag color="blue">{client.type}</Tag>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width="100%"
      style={{ top: 0, maxWidth: "100vw", margin: 0, padding: 0 }}
      styles={{
        body: { height: "calc(100vh - 110px)", overflow: "auto", padding: "16px" }
      }}
      footer={null}
      destroyOnClose
    >
      {/* 顶部统计信息 */}
      <Row gutter={16} className="mb-4">
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="总种子数"
              value={stats.total}
              suffix={`(筛选: ${filteredData.length})`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="全局下载"
              value={formatSpeed(transferQuery.data?.dlSpeed ?? 0)}
              prefix={<CloudDownloadOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="全局上传"
              value={formatSpeed(transferQuery.data?.upSpeed ?? 0)}
              prefix={<CloudUploadOutlined style={{ color: "#faad14" }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="可用空间"
              value={formatSize(transferQuery.data?.freeSpace ?? 0)}
              prefix={<HddOutlined style={{ color: "#1890ff" }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* 工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <Space wrap>
          <Input
            placeholder="搜索种子名称..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            value={stateFilter}
            onChange={setStateFilter}
            style={{ width: 140 }}
            options={[
              { label: "全部状态", value: "all" },
              { label: "下载中", value: "downloading" },
              { label: "做种中", value: "seeding" },
              { label: "已暂停", value: "pausedDL" },
              { label: "已完成", value: "completed" },
              { label: "错误", value: "error" }
            ]}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => torrentsQuery.refetch()}
            loading={torrentsQuery.isRefetching}
          >
            刷新
          </Button>
        </Space>

        {selectedRowKeys.length > 0 && (
          <Space>
            <Text type="secondary">已选 {selectedRowKeys.length} 项</Text>
            <Button
              icon={<PlayCircleOutlined />}
              onClick={() => handleResume(selectedRowKeys)}
              loading={resumeMutation.isPending}
            >
              批量恢复
            </Button>
            <Button
              icon={<PauseCircleOutlined />}
              onClick={() => handlePause(selectedRowKeys)}
              loading={pauseMutation.isPending}
            >
              批量暂停
            </Button>
            <Popconfirm
              title="批量删除"
              description={`确定删除选中的 ${selectedRowKeys.length} 个种子吗？`}
              onConfirm={() => handleDelete(selectedRowKeys, false)}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>
                批量删除
              </Button>
            </Popconfirm>
          </Space>
        )}
      </div>

      {/* 种子列表 */}
      <Table
        dataSource={filteredData}
        columns={columns}
        rowKey="hash"
        rowSelection={rowSelection}
        loading={torrentsQuery.isLoading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} 条`,
          defaultPageSize: 20,
          pageSizeOptions: ["10", "20", "50", "100"]
        }}
        scroll={{ x: 1300 }}
        size="small"
      />
    </Modal>
  );
}
