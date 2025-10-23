import { useEffect } from "react";
import {
  List,
  useDynamicRowHeight,
  useListRef,
  type RowComponentProps,
} from "react-window";
import type { Subtitle } from "../types";

/**
 * 字幕列表组件属性
 */
interface SubtitleListProps {
  /** 字幕数据 */
  subtitle: Subtitle;
  /** 当前播放时间（毫秒） */
  currentTime: number;
}

/**
 * 字幕行组件
 */
const SubtitleRow = ({
  index,
  style,
  subtitle,
}: RowComponentProps<{
  subtitle: Subtitle;
}>) => {
  const entry = subtitle.entries[index];

  return (
    <div style={style}>
      <div className="bg-white mb-2 shadow-sm rounded">
        <div className="text-sm break-words whitespace-pre-wrap p-4">
          {entry.text}
        </div>
      </div>
    </div>
  );
};

/**
 * 字幕列表组件 - 使用虚拟滚动显示字幕
 * 采用 react-window v2 的 List 和 useDynamicRowHeight 实现动态行高度
 */
function SubtitleList({ subtitle, currentTime }: SubtitleListProps) {
  const listRef = useListRef(null);

  /**
   * 使用 useDynamicRowHeight hook 管理动态行高
   */
  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 80,
  });

  /**
   * 滚动到当前字幕
   */
  useEffect(() => {
    if (!subtitle || !listRef.current) return;

    const currentIndex = subtitle.entries.findIndex(
      (entry) => currentTime >= entry.startTime && currentTime < entry.endTime
    );

    if (currentIndex !== -1) {
      listRef.current.scrollToRow({ index: currentIndex, align: "center" });
    }
  }, [currentTime, subtitle, listRef]);

  return (
    <List
      listRef={listRef}
      rowCount={subtitle.entries.length}
      rowHeight={rowHeight}
      rowComponent={SubtitleRow}
      rowProps={{ subtitle }}
    />
  );
}

export default SubtitleList;
