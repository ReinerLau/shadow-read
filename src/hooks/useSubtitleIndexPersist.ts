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
      await MediaDatabaseService.updateSubtitleIndex(
        Number(mediaId),
        currentSubtitleIndex
      );
    };

    /**
     * 处理页面卸载事件
     */
    const handleBeforeUnload = () => {
      saveSubtitleIndex();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // 组件卸载时保存
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      saveSubtitleIndex();
    };
  }, [mediaId, currentSubtitleIndex]);
};
