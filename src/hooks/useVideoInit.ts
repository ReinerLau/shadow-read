import { useEffect, useState } from "react";
import MediaDatabaseService from "../services/mediaDatabase";

/**
 * 视频初始化返回值接口
 */
interface UseVideoInitReturn {
  /** 视频 URL */
  videoUrl: string | undefined;
  /** 错误信息 */
  error: string | null;
}

/**
 * 视频初始化 Hook
 * 负责根据 mediaId 加载视频文件并创建 URL
 * @param mediaId - 视频 ID
 * @returns 视频 URL 和错误信息
 */
export function useVideoInit(mediaId: string | undefined): UseVideoInitReturn {
  const [videoUrl, setVideoUrl] = useState<string>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let url: string;
    const initializeVideo = async () => {
      try {
        if (!mediaId) {
          setError("未找到视频ID");
          return;
        }

        // 根据 mediaId 获取视频文件
        const media = await MediaDatabaseService.getVideoById(Number(mediaId));

        if (!media) {
          setError("视频文件不存在");
          return;
        }

        // 验证文件句柄是否仍然可用
        try {
          await media.handle.requestPermission({ mode: "read" });
          const file = await media.handle.getFile();
          url = URL.createObjectURL(file);
          setVideoUrl(url);

          // 更新最后播放时间
          await MediaDatabaseService.updateVideoPlayedTime(media.id);
        } catch {
          setError("无法访问视频文件，可能已被删除或权限已更改");
        }
      } catch {
        setError("加载视频失败");
      }
    };

    initializeVideo();

    // 清理 URL 对象
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [mediaId]);

  return { videoUrl, error };
}
