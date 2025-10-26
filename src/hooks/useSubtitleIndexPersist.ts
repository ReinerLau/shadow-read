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
  const subtitleIndexRef = useRef(currentSubtitleIndex);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    subtitleIndexRef.current = currentSubtitleIndex;
  }, [currentSubtitleIndex]);

  useEffect(() => {
    // 如果是首次渲染，标记一下然后直接返回，不执行后续逻辑
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    /**
     * 保存字幕索引到数据库
     */
    const saveSubtitleIndex = async () => {
      await MediaDatabaseService.updateSubtitleIndex(
        Number(mediaId),
        subtitleIndexRef.current
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
  }, [mediaId]);
};
