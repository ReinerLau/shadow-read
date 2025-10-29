import { useState } from "react";
import { useNavigate } from "react-router";
import { message } from "antd";
import MediaDatabaseService from "../services/mediaDatabase";
import SessionStorageService from "../services/sessionStorage";

/**
 * YouTube 视频导入返回值接口
 */
interface UseYoutubeVideoImportReturn {
  /** YouTube URL */
  youtubeUrl: string;
  /** 设置 YouTube URL */
  setYoutubeUrl: (url: string) => void;
  /** 是否正在加载 */
  isYoutubeLoading: boolean;
  /** 从 YouTube URL 中提取视频 ID */
  extractYoutubeVideoId: (url: string) => string | null;
  /** 获取 YouTube 视频元数据 */
  extractYoutubeMetadata: (
    videoId: string
  ) => Promise<{ thumbnail: string; duration: string }>;
  /** 处理 YouTube URL 导入 */
  handleYoutubeUrlImport: () => Promise<
    | {
        videoName: string;
        thumbnail: string;
        duration: string;
      }
    | false
  >;
  /** 重置 YouTube 导入状态 */
  resetYoutubeState: () => void;
  /** YouTube 视频 ID */
  id: string | null;
}

/**
 * YouTube 视频导入 Hook
 * 负责处理 YouTube 视频的 URL 解析、重复检查和元数据提取
 * 当找到已存在的视频时，直接导航到播放页
 * @returns 包含 YouTube 视频导入相关状态和方法的对象
 */
export function useYoutubeVideoImport(): UseYoutubeVideoImportReturn {
  const navigate = useNavigate();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isYoutubeLoading, setIsYoutubeLoading] = useState(false);
  const [id, setId] = useState<string | null>(null);

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
  const handleYoutubeUrlImport = async (): Promise<
    | {
        videoName: string;
        thumbnail: string;
        duration: string;
      }
    | false
  > => {
    const videoId = extractYoutubeVideoId(youtubeUrl);
    setId(videoId);

    if (!videoId) {
      message.error("YouTube 视频URL格式不正确，请重试");
      return false;
    }

    setIsYoutubeLoading(true);

    try {
      // 使用 videoId 作为唯一标识符检查数据库中是否已存在该视频
      const existingVideo = await MediaDatabaseService.getVideoByUniqueValue(
        videoId
      );

      if (existingVideo) {
        message.info("视频已存在，直接播放");
        SessionStorageService.addVideoId(existingVideo.id);

        navigate(`/play/${existingVideo.id}`);

        return false;
      }

      // 获取 YouTube 视频元数据
      const metadata = await extractYoutubeMetadata(videoId);

      const videoName = `YouTube - ${videoId}`;

      return {
        videoName,
        thumbnail: metadata.thumbnail,
        duration: metadata.duration,
      };
    } finally {
      setIsYoutubeLoading(false);
    }
  };

  /**
   * 重置 YouTube 导入状态
   */
  const resetYoutubeState = () => {
    setYoutubeUrl("");
  };

  return {
    youtubeUrl,
    id,
    setYoutubeUrl,
    isYoutubeLoading,
    extractYoutubeVideoId,
    extractYoutubeMetadata,
    handleYoutubeUrlImport,
    resetYoutubeState,
  };
}
