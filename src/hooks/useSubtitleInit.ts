import { useEffect, useState } from "react";
import MediaDatabaseService from "../services/mediaDatabase";
import type { Subtitle } from "../types";

/**
 * 字幕初始化返回值接口
 */
interface UseSubtitleInitReturn {
  /** 字幕数据 */
  subtitle: Subtitle | null;
  /** 保存的字幕索引 */
  savedSubtitleIndex: number | null;
  /** 错误信息 */
  error: string | null;
}

/**
 * 字幕初始化 Hook
 * 负责根据 mediaId 加载字幕数据和保存的字幕索引
 * @param mediaId - 视频 ID
 * @returns 字幕数据、保存的字幕索引和错误信息
 */
export function useSubtitleInit(
  mediaId: string | undefined
): UseSubtitleInitReturn {
  const [subtitle, setSubtitle] = useState<Subtitle | null>(null);
  const [savedSubtitleIndex, setSavedSubtitleIndex] = useState<number | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSubtitle = async () => {
      try {
        if (!mediaId) {
          return;
        }

        // 获取视频信息以获取保存的字幕索引
        const media = await MediaDatabaseService.getVideoById(Number(mediaId));
        if (!media) {
          return;
        }

        // 获取关联的字幕
        const subtitleData = await MediaDatabaseService.getSubtitleByVideoId(
          Number(mediaId)
        );
        if (subtitleData) {
          setSubtitle(subtitleData);

          // 如果有保存的字幕索引，保存起来等视频加载完成后跳转
          if (
            media.lastSubtitleIndex !== undefined &&
            media.lastSubtitleIndex >= 0 &&
            media.lastSubtitleIndex < subtitleData.entries.length
          ) {
            setSavedSubtitleIndex(media.lastSubtitleIndex);
          }
        } else {
          setError("未找到字幕文件");
        }
      } catch {
        setError("加载字幕失败");
      }
    };

    loadSubtitle();
  }, [mediaId]);

  return { subtitle, savedSubtitleIndex, error };
}
