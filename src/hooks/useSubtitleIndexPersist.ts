import { useEffect } from "react";
import { MediaDatabaseService } from "../services/mediaDatabase";

/**
 * 持久化字幕索引
 * 在页面卸载或组件卸载时保存当前字幕索引到字幕数据中
 * @param mediaId - 媒体ID
 * @param currentSubtitleIndex - 当前字幕索引
 */
export const useSubtitleIndexPersist = (
  mediaId: string | undefined,
  currentSubtitleIndex: number
) => {
  useEffect(() => {
    /**
     * 保存字幕索引到数据库
     */
    const saveSubtitleIndex = async () => {
      if (mediaId && currentSubtitleIndex >= 0) {
        await MediaDatabaseService.updateSubtitleIndex(
          Number(mediaId),
          currentSubtitleIndex
        );
      }
    };

    /**
     * 处理页面卸载事件
     */
    const handleBeforeUnload = () => {
      if (mediaId && currentSubtitleIndex >= 0) {
        // 使用 sendBeacon 或同步方式保存，但由于 IndexedDB 是异步的，
        // 我们在组件卸载时保存
        saveSubtitleIndex();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // 组件卸载时保存
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      saveSubtitleIndex();
    };
  }, [mediaId, currentSubtitleIndex]);
};
