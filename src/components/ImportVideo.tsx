import { Button, Modal, Input, Upload, message, Dropdown } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router";
import MediaDatabaseService from "../services/mediaDatabase";
import SessionStorageService from "../services/sessionStorage";
import SubtitleParserService from "../services/subtitleParser";
import { extractVideoMetadata } from "../services/videoData";
import type { SubtitleEntry } from "../types";
import type { MenuProps } from "antd";

/**
 * 视频导入模态框组件
 */
function ImportVideoModal() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [videoName, setVideoName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedHandle, setSelectedHandle] =
    useState<FileSystemFileHandle | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | undefined>();
  const [duration, setDuration] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subtitleEntries, setSubtitleEntries] = useState<SubtitleEntry[]>([]);
  const [isParsingSubtitle, setIsParsingSubtitle] = useState(false);
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isYoutubeLoading, setIsYoutubeLoading] = useState(false);

  /**
   * 处理文件选择后的逻辑 - 计算 hash 检查重复
   */
  const handleFileSelected = async (file: File) => {
    setIsLoading(true);

    // 第一步：计算文件哈希值
    const computedHash = await MediaDatabaseService.prepareFileForStorage(file);
    setFileHash(computedHash);

    // 第二步：检查数据库中是否已存在该 hash 的视频
    const existingVideo = await MediaDatabaseService.getVideoByFileHash(
      computedHash
    );

    if (existingVideo) {
      // 视频已存在
      // 检查是否支持 File System Access API
      if ("showOpenFilePicker" in window) {
        // 支持 File System Access API，直接跳转播放
        message.info("视频已存在，直接播放");
        SessionStorageService.addVideoId(existingVideo.id);
        navigate(`/play/${existingVideo.id}`);
        setIsLoading(false);
        return;
      } else {
        // 不支持 File System Access API，需要更新 blobUrl
        const blobUrl = URL.createObjectURL(file);
        await MediaDatabaseService.updateVideoBlobUrl(
          existingVideo.id,
          blobUrl
        );
        message.info("视频已存在，直接播放");
        SessionStorageService.addVideoId(existingVideo.id);
        navigate(`/play/${existingVideo.id}`);
        setIsLoading(false);
        return;
      }
    }

    // 第三步：视频不存在，继续正常流程 - 设置选中的文件和视频名称
    setSelectedFile(file);
    setVideoName(file.name.replace(/\.[^/.]+$/, "")); // 移除文件扩展名
    setIsModalOpen(true);

    // 第四步：获取视频元数据（缩略图和时长）
    const metadata = await extractVideoMetadata(file);
    setThumbnail(metadata.thumbnail);
    setDuration(metadata.duration);
    setIsLoading(false);
  };

  /**
   * 从 YouTube URL 中提取视频 ID
   * @param url - YouTube 视频URL
   * @returns 视频 ID 或 null
   */
  const extractYoutubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  /**
   * 为 YouTube 视频生成唯一的哈希值
   * @param videoId - YouTube 视频 ID
   * @returns 哈希值
   */
  const generateYoutubeHash = async (videoId: string): Promise<string> => {
    const data = new TextEncoder().encode(`youtube:${videoId}`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  /**
   * 获取 YouTube 视频元数据（缩略图和时长）
   * @param videoId - YouTube 视频 ID
   * @returns 包含缩略图和时长的元数据
   */
  const extractYoutubeMetadata = async (
    videoId: string
  ): Promise<{ thumbnail: string; duration: string }> => {
    // 使用高质量缩略图 URL
    const thumbnail = `https://i1.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    // YouTube 不提供公开的时长获取 API（需要 API key），这里返回默认值
    // 实际应用中可以使用 youtube-dl、yt-dlp 或 YouTube Data API v3
    const duration = "00:00:00";

    return { thumbnail, duration };
  };

  /**
   * 处理 YouTube URL 导入
   */
  const handleYoutubeUrlImport = async () => {
    const videoId = extractYoutubeVideoId(youtubeUrl);

    if (!videoId) {
      message.error("YouTube 视频URL格式不正确，请重试");
      return;
    }

    setIsYoutubeLoading(true);

    try {
      // 生成唯一的哈希值
      const youtubeHash = await generateYoutubeHash(videoId);

      // 检查数据库中是否已存在该视频
      const existingVideo = await MediaDatabaseService.getVideoByFileHash(
        youtubeHash
      );

      if (existingVideo) {
        message.info("视频已存在，直接播放");
        SessionStorageService.addVideoId(existingVideo.id);
        navigate(`/play/${existingVideo.id}`);
        setIsYoutubeLoading(false);
        setIsYoutubeModalOpen(false);
        setYoutubeUrl("");
        return;
      }

      // 获取 YouTube 视频元数据
      const metadata = await extractYoutubeMetadata(videoId);

      // 设置为模态框数据
      setSelectedFile(null);
      setSelectedHandle(null);
      setFileHash(youtubeHash);
      setVideoName(`YouTube - ${videoId}`);
      setThumbnail(metadata.thumbnail);
      setDuration(metadata.duration);

      // 关闭 YouTube URL 输入框
      setIsYoutubeModalOpen(false);
      setYoutubeUrl("");

      // 打开视频编辑模态框
      setIsModalOpen(true);
    } catch {
      message.error("YouTube 视频导入失败，请检查URL");
    } finally {
      setIsYoutubeLoading(false);
    }
  };

  /**
   * 处理视频文件导入 - 使用 File System Access API
   */
  const handleImportVideoWithFileSystemAPI = async () => {
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

    // 设置选中的文件句柄
    setSelectedHandle(handle);
    const file = await handle.getFile();
    await handleFileSelected(file);
  };

  /**
   * 处理视频文件导入 - 使用 input 元素作为降级方案
   */
  const handleImportVideoWithInput = () => {
    // 动态创建 input 元素
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/mp4,.mp4";

    // 处理文件选择
    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        await handleFileSelected(file);
      }
    };

    // 触发文件选择
    input.click();
  };

  /**
   * 处理视频文件导入
   */
  const handleImportVideo = () => {
    // 检查浏览器是否支持 File System Access API
    if ("showOpenFilePicker" in window) {
      handleImportVideoWithFileSystemAPI();
    } else {
      // 降级方案：使用 input 元素
      handleImportVideoWithInput();
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
    setSelectedHandle(null);
    setSelectedFile(null);
    setFileHash(null);
    setThumbnail(undefined);
    setDuration(undefined);
    setSubtitleEntries([]);
  };

  /**
   * 处理播放视频并保存到数据库
   */
  const handlePlayVideo = async () => {
    if (
      !videoName.trim() ||
      (!selectedHandle && !selectedFile && fileHash === null)
    ) {
      return;
    }

    // 字幕文件必选，如果没有字幕则不允许播放
    if (subtitleEntries.length === 0) {
      message.error("字幕文件必选，请先导入字幕");
      return;
    }

    setIsSaving(true);

    // 构建保存参数 - 根据是否有文件句柄选择不同的存储方式
    let videoParams;

    if (selectedHandle) {
      // 支持 File System Access API，存储文件句柄
      videoParams = {
        name: videoName.trim(),
        handle: selectedHandle,
        fileHash: fileHash || undefined,
        blob: null,
        blobUrl: null,
        thumbnail,
        duration,
      };
    } else if (selectedFile) {
      // 不支持 File System Access API，生成并存储 blobUrl
      const blobUrl = URL.createObjectURL(selectedFile);
      videoParams = {
        name: videoName.trim(),
        handle: null,
        fileHash: fileHash || undefined,
        blob: null,
        blobUrl,
        thumbnail,
        duration,
      };
    } else {
      // YouTube 视频，存储视频标识信息
      videoParams = {
        name: videoName.trim(),
        handle: null,
        fileHash: fileHash || undefined,
        blob: null,
        blobUrl: `https://www.youtube.com/embed/${fileHash?.substring(0, 11)}`,
        thumbnail,
        duration,
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
    setSelectedHandle(null);
    setSelectedFile(null);
    setFileHash(null);
    setThumbnail(undefined);
    setDuration(undefined);
    setSubtitleEntries([]);
  };

  /**
   * 处理 YouTube 模态框取消
   */
  const handleYoutubeModalCancel = () => {
    setIsYoutubeModalOpen(false);
    setYoutubeUrl("");
  };

  /**
   * 下拉菜单项配置
   */
  const menuItems: MenuProps["items"] = [
    {
      key: "local",
      label: "本地视频",
      icon: <div className="i-mdi-folder-open text-lg" />,
      onClick: handleImportVideo,
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
          loading={isLoading}
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
              loading={isYoutubeLoading}
              disabled={!youtubeUrl.trim()}
            >
              确定
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-4">
          <Input
            placeholder="请输入 YouTube 视频URL"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            allowClear
          />
          <div className="text-xs text-gray-500">
            支持以下URL格式：
            <br />• https://www.youtube.com/watch?v=...
            <br />• https://youtu.be/...
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
          {/* 视频缩略图 */}
          {thumbnail && (
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              <img
                src={thumbnail}
                alt="视频缩略图"
                className="w-full h-full max-w-full max-h-full object-contain rounded"
              ></img>
              {/* 视频时长 */}
              <div className="absolute bottom-1 right-1 bg-black bg-opacity-30 text-white text-sm px-2 py-1 rounded">
                {duration}
              </div>
            </div>
          )}
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
    </>
  );
}

export default ImportVideoModal;
