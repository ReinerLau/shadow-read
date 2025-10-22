import { Button, Modal, Input } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router";
import MediaDatabaseService from "../services/mediaDatabase";

/**
 * 首页组件
 */
function HomePage() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [videoName, setVideoName] = useState("");
  const [selectedHandle, setSelectedHandle] =
    useState<FileSystemFileHandle | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * 处理视频文件导入
   */
  const handleImportVideo = async () => {
    try {
      // 使用 File System Access API 打开文件选择器, 选择文件后得到文件句柄
      const [handle] = await window.showOpenFilePicker({
        // 只允许选择 mp4 视频文件
        types: [
          {
            accept: {
              // key 是 MIME 类型, value 是文件扩展名
              "video/*": [".mp4"],
            },
          },
        ],
      });

      // 设置选中的文件句柄和视频名称
      setSelectedHandle(handle);
      setVideoName(handle.name);
      setIsModalOpen(true);
    } catch {
      void 0;
    }
  };

  /**
   * 处理播放视频并保存到数据库
   */
  const handlePlayVideo = async () => {
    if (!videoName.trim() || !selectedHandle) {
      return;
    }

    try {
      setIsSaving(true);
      // 保存视频文件句柄到数据库
      const mediaId = await MediaDatabaseService.saveVideo({
        name: videoName.trim(),
        handle: selectedHandle as FileSystemFileHandle,
      });

      // 关闭模态框
      setIsModalOpen(false);
      setVideoName("");
      setSelectedHandle(null);

      // 跳转到播放页并播放视频
      navigate(`/play/${mediaId}`);
    } catch {
      // 其他错误将被静默处理
      void 0;
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 处理模态框取消
   */
  const handleModalCancel = () => {
    setIsModalOpen(false);
    setVideoName("");
    setSelectedHandle(null);
  };

  return (
    <div className="h-dvh flex flex-col">
      {/* header */}
      <div className="p-2 flex justify-between">
        {/* 搜索视频 */}
        <Button
          type="text"
          shape="circle"
          icon={<div className="i-mdi-magnify text-xl" />}
        />
        {/* 导入视频 */}
        <Button
          type="default"
          shape="circle"
          icon={<div className="i-mdi-plus text-xl" />}
          onClick={handleImportVideo}
        />
      </div>
      {/* 视频列表 */}
      <div className="flex-1"></div>

      {/* 视频名称输入模态框 */}
      <Modal
        title={"视频信息"}
        open={isModalOpen}
        onCancel={handleModalCancel}
        footer={() => (
          <div className="flex justify-center">
            <Button
              key="play"
              type="primary"
              onClick={handlePlayVideo}
              disabled={!videoName.trim()}
              loading={isSaving}
            >
              播放
            </Button>
          </div>
        )}
      >
        <Input
          placeholder="请输入视频名称"
          value={videoName}
          onChange={(e) => setVideoName(e.target.value)}
        />
      </Modal>
    </div>
  );
}

export default HomePage;
