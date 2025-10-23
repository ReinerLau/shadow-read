import { Button, Modal, Input, Spin } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router";
import MediaDatabaseService from "../services/mediaDatabase";
import { extractVideoMetadata } from "../services/videoData";

/**
 * 视频导入模态框组件
 */
function ImportVideoModal() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [videoName, setVideoName] = useState("");
  const [selectedHandle, setSelectedHandle] =
    useState<FileSystemFileHandle | null>(null);
  const [thumbnail, setThumbnail] = useState<string | undefined>();
  const [duration, setDuration] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(false);

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

      // 获取视频元数据（缩略图和时长）
      try {
        setIsLoadingThumbnail(true);
        const file = await handle.getFile();
        const metadata = await extractVideoMetadata(file);
        setThumbnail(metadata.thumbnail);
        setDuration(metadata.duration);
      } catch {
        // 视频元数据提取失败时静默处理
        setThumbnail(undefined);
        setDuration(undefined);
      } finally {
        setIsLoadingThumbnail(false);
      }
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
        thumbnail,
        duration,
      });

      // 关闭模态框
      setIsModalOpen(false);
      setVideoName("");
      setSelectedHandle(null);
      setThumbnail(undefined);
      setDuration(undefined);

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
    setThumbnail(undefined);
    setDuration(undefined);
  };

  return (
    <>
      {/* 导入视频按钮 */}
      <Button
        type="default"
        shape="circle"
        icon={<div className="i-mdi-plus text-xl" />}
        onClick={handleImportVideo}
      />

      {/* 视频名称输入模态框 */}
      <Modal
        title={"导入视频"}
        open={isModalOpen}
        onCancel={handleModalCancel}
        footer={
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
        }
      >
        <div className="flex flex-col gap-4">
          {/* 视频缩略图 */}
          {isLoadingThumbnail ? (
            <div className="mb-4 flex justify-center py-8">
              <Spin />
            </div>
          ) : (
            thumbnail && (
              <div className="relative">
                <img
                  src={thumbnail}
                  alt="视频缩略图"
                  className="w-full h-auto rounded"
                ></img>
                {/* 视频时长 */}
                <div className="absolute bottom-1 right-1 bg-black bg-opacity-30 text-white text-sm px-2 py-1 rounded">
                  {duration}
                </div>
              </div>
            )
          )}
          {/* 视频名称输入框 */}
          <Input
            placeholder="请输入视频名称"
            value={videoName}
            onChange={(e) => setVideoName(e.target.value)}
          />
          {/* 导入字幕 */}
        </div>
      </Modal>
    </>
  );
}

export default ImportVideoModal;
