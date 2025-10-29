import { useState } from "react";
import { useNavigate } from "react-router";
import { message } from "antd";
import MediaDatabaseService from "../services/mediaDatabase";
import SessionStorageService from "../services/sessionStorage";

/**
 * YouTube oEmbed API 响应接口
 */
interface YoutubeOembedResponse {
  /** 缩略图 URL */
  thumbnail_url: string;
  /** 视频标题 */
  title: string;
  /** 其他字段 */
  [key: string]: unknown;
}

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
    videoUrl: string
  ) => Promise<{ thumbnail: string; title: string }>;
  /** 处理 YouTube URL 导入 */
  handleYoutubeUrlImport: () => Promise<
    | {
        videoName: string;
        thumbnail: string;
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
 * 使用 YouTube oEmbed API 获取视频元数据
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
   * 获取 YouTube 视频元数据（缩略图）
   * 使用 YouTube oEmbed API 获取视频信息
   * @param videoUrl - YouTube 视频完整 URL
   * @returns 包含缩略图的元数据
   */
  const extractYoutubeMetadata = async (
    videoUrl: string
  ): Promise<{ thumbnail: string; title: string }> => {
    try {
      // 构造 oEmbed API URL，支持 CORS
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        videoUrl
      )}&format=json`;

      const response = await fetch(oembedUrl);

      if (!response.ok) {
        throw new Error(`oEmbed API 请求失败: ${response.status}`);
      }

      const data = (await response.json()) as YoutubeOembedResponse;

      // 从 oEmbed 响应中提取缩略图
      const thumbnail = data.thumbnail_url;

      if (!thumbnail) {
        throw new Error("无法获取视频缩略图");
      }

      return { thumbnail, title: data.title };
    } catch {
      message.error("获取视频信息失败，请检查URL并重试");
      throw new Error("获取 YouTube 视频元数据失败");
    }
  };

  /**
   * 处理 YouTube URL 导入
   */
  const handleYoutubeUrlImport = async (): Promise<
    | {
        videoName: string;
        thumbnail: string;
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
      const metadata = await extractYoutubeMetadata(youtubeUrl);

      const videoName = metadata.title;

      return {
        videoName,
        thumbnail: metadata.thumbnail,
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
