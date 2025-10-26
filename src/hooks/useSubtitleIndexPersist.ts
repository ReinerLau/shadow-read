import { useEffect, useRef } from "react";
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
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    // 如果是首次渲染，标记一下然后直接返回，不执行后续逻辑
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    /**
     * 保存字幕索引到数据库
     */
    const saveSubtitleIndex = () => {
      MediaDatabaseService.updateSubtitleIndex(
        Number(mediaId),
        currentSubtitleIndex
      );
    };

    saveSubtitleIndex();
  }, [mediaId, currentSubtitleIndex]);
};
