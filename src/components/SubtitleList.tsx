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
  currentIndex,
}: RowComponentProps<{
  subtitle: Subtitle;
  currentIndex: number;
}>) => {
  const entry = subtitle.entries[index];
  const isCurrent = index === currentIndex;

  return (
    <div style={style}>
      <div
        className={`mb-2 shadow-sm rounded transition-colors duration-200 ${
          isCurrent ? "bg-blue-100 border-l-4 border-blue-500" : "bg-white"
        }`}
      >
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
   * 计算当前字幕索引
   */
  const currentIndex = subtitle.entries.findIndex(
    (entry) => currentTime >= entry.startTime && currentTime < entry.endTime
  );

  /**
   * 滚动到当前字幕
   */
  useEffect(() => {
    if (!subtitle || !listRef.current) return;

    if (currentIndex !== -1) {
      listRef.current.scrollToRow({
        index: currentIndex,
        align: "center",
        behavior: "smooth",
      });
    }
  }, [currentIndex, subtitle, listRef]);

  return (
    <List
      listRef={listRef}
      rowCount={subtitle.entries.length}
      rowHeight={rowHeight}
      rowComponent={SubtitleRow}
      rowProps={{ subtitle, currentIndex }}
    />
  );
}

export default SubtitleList;
