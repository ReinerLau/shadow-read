import { useEffect, useState } from "react";
import MediaDatabaseService from "../services/mediaDatabase";
import type { Subtitle } from "../types";

/**
 * 媒体初始化返回值接口
 */
interface UseMediaInitReturn {
  /** 视频 URL */
  videoUrl: string | undefined;
  /** 字幕数据 */
  subtitle: Subtitle | null;
  /** 保存的字幕索引 */
  savedSubtitleIndex: number | null;
  /** 错误信息 */
  error: string | null;
}

/**
 * 媒体初始化 Hook
 * 负责根据 mediaId 先加载字幕数据，然后加载视频文件
 * @param mediaId - 视频 ID
 * @returns 视频 URL、字幕数据、保存的字幕索引和错误信息
 */
export function useMediaInit(mediaId: string | undefined): UseMediaInitReturn {
  const [videoUrl, setVideoUrl] = useState<string>();
  const [subtitle, setSubtitle] = useState<Subtitle | null>(null);
  const [savedSubtitleIndex, setSavedSubtitleIndex] = useState<number | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let url: string;

    const initializeMedia = async () => {
      // 第一步：加载字幕数据
      try {
        // 获取关联的字幕
        const subtitleData = await MediaDatabaseService.getSubtitleByVideoId(
          Number(mediaId)
        );
        if (subtitleData) {
          setSubtitle(subtitleData);

          // 如果有保存的字幕索引，保存起来等视频加载完成后跳转
          if (subtitleData.lastSubtitleIndex) {
            setSavedSubtitleIndex(subtitleData.lastSubtitleIndex);
          }
        } else {
          setError("未找到字幕文件");
        }
      } catch {
        setError("加载字幕失败");
      }

      // 第二步：不管字幕加载成功还是失败，都继续加载视频
      try {
        const media = await MediaDatabaseService.getVideoById(Number(mediaId));
        if (!media) {
          setError("视频文件不存在");
          return;
        }

        // 检查是否有 File System Access API 的文件句柄
        if (media.handle) {
          // 验证文件句柄是否仍然可用
          await media.handle.requestPermission({ mode: "read" });
          const file = await media.handle.getFile();
          url = URL.createObjectURL(file);
          setVideoUrl(url);
        } else if (media.blob) {
          // 降级方案：使用存储的 Blob 对象
          url = URL.createObjectURL(media.blob);
          setVideoUrl(url);
        } else {
          // 既没有文件句柄也没有 Blob，说明文件已丢失
          setError("视频文件已丢失，请重新导入该视频");
          return;
        }

        // 更新最后播放时间
        await MediaDatabaseService.updateVideoPlayedTime(media.id);
      } catch {
        setError("无法访问视频文件，可能已被删除或权限已更改");
      }
    };

    initializeMedia();

    // 清理 URL 对象
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [mediaId]);

  return { videoUrl, subtitle, savedSubtitleIndex, error };
}
