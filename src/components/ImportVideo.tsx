import { Button, Modal, Input, Upload, message, Dropdown } from "antd";
import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import MediaDatabaseService from "../services/mediaDatabase";
import SessionStorageService from "../services/sessionStorage";
import SubtitleParserService from "../services/subtitleParser";
import { useLocalVideoImport } from "../hooks/useLocalVideoImport";
import { useYoutubeVideoImport } from "../hooks/useYoutubeVideoImport";
import type { SubtitleEntry } from "../types";
import type { MenuProps } from "antd";

/**
 * 视频导入模态框组件
 */
function ImportVideoModal() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [videoName, setVideoName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [subtitleEntries, setSubtitleEntries] = useState<SubtitleEntry[]>([]);
  const [isParsingSubtitle, setIsParsingSubtitle] = useState(false);
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | undefined>();

  // 隐藏的 input 元素 ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 本地视频导入 Hook
  const localVideoImport = useLocalVideoImport(fileInputRef);

  // YouTube 视频导入 Hook
  const youtubeVideoImport = useYoutubeVideoImport();

  /**
   * 处理本地视频导入
   */
  const handleImportLocalVideo = async () => {
    const result = await localVideoImport.handleImportVideo();

    // result 为 true 表示成功导入新视频，false/null 表示视频已存在或用户取消
    if (result) {
      // 从文件名中移除扩展名作为默认视频名称
      const videoNameDefault = localVideoImport.selectedFileRef.current
        ? localVideoImport.selectedFileRef.current.name.replace(/\.[^/.]+$/, "")
        : "";
      setVideoName(videoNameDefault);
      // 清空缩略图和时长，这些将在播放时从视频元素中提取
      setThumbnail(undefined);
      setIsModalOpen(true);
    }
  };

  /**
   * 处理字幕文件导入
   */
  const handleImportSubtitle = async (file: File) => {
    try {
      setIsParsingSubtitle(true);
      const entries = await SubtitleParserService.parseSrtFile(file);
      setSubtitleEntries(entries);
      message.success(`字幕导入成功，共 ${entries.length} 条`);
      return false; // 阻止默认的 Upload 行为
    } catch {
      message.error("字幕导入失败，请检查文件格式");
      return false;
    } finally {
      setIsParsingSubtitle(false);
    }
  };

  /**
   * 处理字幕文件删除
   */
  const handleRemoveSubtitle = () => {
    setSubtitleEntries([]);
    message.info("字幕已清空");
  };

  /**
   * 清空所有状态
   */
  const resetState = () => {
    setIsModalOpen(false);
    setVideoName("");
    setSubtitleEntries([]);
    setThumbnail(undefined);
    localVideoImport.resetLocalVideoState();
    youtubeVideoImport.resetYoutubeState();
  };

  /**
   * 处理播放视频并保存到数据库
   */
  const handlePlayVideo = async () => {
    // 字幕文件必选，如果没有字幕则不允许播放
    if (subtitleEntries.length === 0) {
      message.error("字幕文件必选，请先导入字幕");
      return;
    }

    setIsSaving(true);

    // 构建保存参数 - 根据视频类型选择不同的存储方式
    let videoParams;

    if (localVideoImport.selectedHandleRef.current) {
      // 支持 File System Access API，存储文件句柄
      // 缩略图和时长将在播放时从视频元素中提取
      videoParams = {
        name: videoName.trim(),
        handle: localVideoImport.selectedHandleRef.current,
        uniqueValue: localVideoImport.fileHash,
      };
    } else if (localVideoImport.selectedFileRef.current) {
      // 不支持 File System Access API，生成并存储 blobUrl
      // 缩略图和时长将在播放时从视频元素中提取
      const blobUrl = URL.createObjectURL(
        localVideoImport.selectedFileRef.current
      );
      videoParams = {
        name: videoName.trim(),
        uniqueValue: localVideoImport.fileHash,
        url: blobUrl,
      };
    } else {
      // YouTube 视频，存储视频标识信息
      videoParams = {
        name: videoName.trim(),
        uniqueValue: youtubeVideoImport.id,
        url: `https://www.youtube.com/embed/${youtubeVideoImport.id}`,
        thumbnail: thumbnail,
      };
    }

    // 保存视频到数据库
    const mediaId = await MediaDatabaseService.saveVideo(videoParams!);

    // 保存字幕到数据库
    await MediaDatabaseService.saveSubtitle({
      videoId: mediaId,
      entries: subtitleEntries,
      createdAt: Date.now(),
      lastSubtitleIndex: -1,
    });

    // 将视频 ID 添加到 sessionStorage
    SessionStorageService.addVideoId(mediaId);

    // 清空状态并跳转到播放页
    resetState();
    navigate(`/play/${mediaId}`);
    setIsSaving(false);
  };

  /**
   * 处理模态框取消
   */
  const handleModalCancel = () => {
    setIsModalOpen(false);
    setVideoName("");
    setSubtitleEntries([]);
    setThumbnail(undefined);
    localVideoImport.resetLocalVideoState();
  };

  /**
   * 处理 YouTube URL 导入
   */
  const handleYoutubeUrlImport = async () => {
    const result = await youtubeVideoImport.handleYoutubeUrlImport();

    if (result) {
      setVideoName(result.videoName);
      setThumbnail(result.thumbnail);

      setIsYoutubeModalOpen(false);
      youtubeVideoImport.setYoutubeUrl("");
      setIsModalOpen(true);
    }
  };

  /**
   * 处理 YouTube 模态框取消
   */
  const handleYoutubeModalCancel = () => {
    setIsYoutubeModalOpen(false);
    youtubeVideoImport.setYoutubeUrl("");
  };

  /**
   * 下拉菜单项配置
   */
  const menuItems: MenuProps["items"] = [
    {
      key: "local",
      label: "本地视频",
      icon: <div className="i-mdi-folder-open text-lg" />,
      onClick: () => handleImportLocalVideo(),
    },
    {
      key: "youtube",
      label: "Youtube 视频",
      icon: <div className="i-mdi-youtube text-lg" />,
      onClick: () => setIsYoutubeModalOpen(true),
    },
  ];

  return (
    <>
      {/* 导入视频下拉菜单 */}
      <Dropdown
        menu={{ items: menuItems }}
        trigger={["click"]}
        placement="bottomRight"
      >
        <Button
          type="default"
          shape="circle"
          icon={<div className="i-mdi-plus text-xl" />}
          loading={localVideoImport.isLoading}
        />
      </Dropdown>

      {/* YouTube 视频URL输入弹窗 */}
      <Modal
        title="导入 YouTube 视频"
        open={isYoutubeModalOpen}
        onCancel={handleYoutubeModalCancel}
        footer={
          <div className="flex justify-center gap-2">
            <Button onClick={handleYoutubeModalCancel}>取消</Button>
            <Button
              type="primary"
              onClick={handleYoutubeUrlImport}
              loading={youtubeVideoImport.isYoutubeLoading}
              disabled={!youtubeVideoImport.youtubeUrl.trim()}
            >
              确定
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-4">
          <Input
            placeholder="请输入 YouTube 视频URL"
            value={youtubeVideoImport.youtubeUrl}
            onChange={(e) => youtubeVideoImport.setYoutubeUrl(e.target.value)}
            allowClear
          />
          <div className="text-xs text-gray-500">
            支持URL格式：https://www.youtube.com/watch?v=...
          </div>
        </div>
      </Modal>

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
              disabled={!videoName.trim() || subtitleEntries.length === 0}
              loading={isSaving}
            >
              播放
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {/* 视频名称输入框 */}
          <Input
            placeholder="请输入视频名称"
            value={videoName}
            onChange={(e) => setVideoName(e.target.value)}
          />
          {/* 导入字幕 */}
          <Upload
            accept=".srt"
            maxCount={1}
            beforeUpload={handleImportSubtitle}
            onRemove={handleRemoveSubtitle}
            disabled={isParsingSubtitle}
          >
            <Button
              icon={<div className="i-mdi-file-document text-lg" />}
              loading={isParsingSubtitle}
            >
              {subtitleEntries.length > 0
                ? `已导入 ${subtitleEntries.length} 条字幕`
                : "导入字幕"}
            </Button>
          </Upload>
        </div>
      </Modal>

      {/* 隐藏的文件输入元素，作为 File System Access API 的降级方案 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp4,.mov,.mkv,.webm"
        style={{ display: "none" }}
      />
    </>
  );
}

export default ImportVideoModal;
