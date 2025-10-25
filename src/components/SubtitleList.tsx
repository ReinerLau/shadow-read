import { useEffect } from "react";
import { useLongPress } from "@uidotdev/usehooks";
import { Dialog } from "antd-mobile";
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
  /** 当前字幕索引 */
  currentIndex: number;
  /** 字幕点击回调 - 用于双击跳转到对应时间 */
  onSubtitleClick?: (startTime: number) => void;
}

/**
 * 字幕行组件
 */
const SubtitleRow = ({
  index,
  style,
  subtitle,
  currentIndex,
  onSubtitleClick,
}: RowComponentProps<{
  subtitle: Subtitle;
  currentIndex: number;
  onSubtitleClick?: (startTime: number) => void;
}>) => {
  const entry = subtitle.entries[index];
  const isCurrent = index === currentIndex;

  /**
   * 处理点击事件 - 跳转到字幕对应时间
   */
  const handleClick = () => {
    if (onSubtitleClick) {
      onSubtitleClick(entry.startTime);
    }
  };

  /**
   * 处理长按事件 - 打开 Dialog
   */
  const handleLongPress = () => {
    Dialog.show({
      title: "操作",
      closeOnAction: true,
      actions: [
        {
          key: "offset",
          text: "偏移",
        },
      ],
    });
  };

  /**
   * 使用 useLongPress hook 管理长按交互
   */
  const longPressAttrs = useLongPress(handleLongPress, {
    threshold: 500,
  });

  return (
    <div style={style}>
      {/* 字幕条目 */}
      <div
        className={`mb-2 shadow-sm rounded transition-colors duration-200 cursor-pointer select-none ${
          isCurrent ? "bg-blue-100 border-l-4 border-blue-500" : "bg-white"
        }`}
        onClick={handleClick}
        {...longPressAttrs}
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
function SubtitleList({
  subtitle,
  currentIndex,
  onSubtitleClick,
}: SubtitleListProps) {
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

    if (currentIndex !== -1) {
      listRef.current?.scrollToRow({
        index: currentIndex,
        align: "center",
        // behavior: "smooth",
      });
    }
  }, [currentIndex, subtitle, listRef]);

  return (
    <List
      listRef={listRef}
      rowCount={subtitle.entries.length}
      rowHeight={rowHeight}
      rowComponent={SubtitleRow}
      rowProps={{ subtitle, currentIndex, onSubtitleClick }}
    />
  );
}

export default SubtitleList;
