import { useState } from "react";
import { Button, InputNumber } from "antd";
import { Popup } from "antd-mobile";

/**
 * 将毫秒转换为 HH:MM:SS.mmm 格式的时间字符串
 * @param milliseconds 毫秒数
 * @returns 格式化后的时间字符串
 */
const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const ms = milliseconds % 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
};

interface EditModePopupProps {
  /** 编辑模式是否显示 */
  editMode: boolean;
  /** 编辑的精确时间 */
  editedTime: {
    startTime: number;
    endTime: number;
  };
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 退出编辑模式的回调 */
  onExitEditMode: () => void;
  /** 保存时间偏移的回调 */
  onSaveTimeOffset: () => void;
  /** 处理时间偏移的回调 */
  onTimeOffset: (
    offset: number,
    isStartTime: boolean,
    isForward: boolean
  ) => void;
  /** 切换播放/暂停的回调 */
  onTogglePlayPause: () => void;
}

/**
 * 编辑模式 Popup 组件
 * 用于编辑字幕的开始和结束时间
 * 内部管理时间偏移步长状态
 */
export const EditModePopup = ({
  editMode,
  editedTime,
  isPlaying,
  onExitEditMode,
  onSaveTimeOffset,
  onTimeOffset,
  onTogglePlayPause,
}: EditModePopupProps) => {
  /** 时间偏移步长（毫秒），默认 100ms */
  const [offsetStep, setOffsetStep] = useState<number>(100);

  return (
    <Popup visible={editMode} closeOnMaskClick={false} position="bottom">
      <div className="p-4 space-y-2">
        <div className="flex gap-2">
          <Button className="flex-1" onClick={onExitEditMode}>
            取消
          </Button>
          <Button className="flex-1" type="primary" onClick={onSaveTimeOffset}>
            保存
          </Button>
        </div>
        {/* 步长设置 */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">偏移步长</div>
          <InputNumber
            step={1}
            value={offsetStep}
            onChange={(value) => setOffsetStep(value ?? 100)}
            className="w-full"
          />
        </div>
        {/* 精确时间显示 */}
        <div className="space-y-2">
          <div className=" p-4 bg-blue-50 rounded-lg flex items-center">
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">开始时间</div>
              <div className=" font-mono text-sm font-semibold text-blue-600">
                {formatTime(editedTime.startTime)}
              </div>
            </div>
            <div className="flex flex-col">
              {/* 向前偏移 */}
              <Button
                className="flex-1"
                type="text"
                onClick={() => onTimeOffset(offsetStep, true, true)}
                icon={<div className="i-mdi:menu-up text-3xl" />}
              />
              {/* 向后偏移 */}
              <Button
                className="flex-1"
                type="text"
                onClick={() => onTimeOffset(offsetStep, true, false)}
                icon={<div className="i-mdi:menu-down text-3xl" />}
              />
            </div>
          </div>
          <div className=" p-4 bg-blue-50 rounded-lg flex items-center">
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">结束时间</div>
              <div className=" font-mono text-sm font-semibold text-blue-600">
                {formatTime(editedTime.endTime)}
              </div>
            </div>
            <div className="flex flex-col">
              {/* 向前偏移 */}
              <Button
                className="flex-1"
                type="text"
                onClick={() => onTimeOffset(offsetStep, false, true)}
                icon={<div className="i-mdi:menu-up text-3xl" />}
              />
              {/* 向后偏移 */}
              <Button
                className="flex-1"
                type="text"
                onClick={() => onTimeOffset(offsetStep, false, false)}
                icon={<div className="i-mdi:menu-down text-3xl" />}
              />
            </div>
          </div>
        </div>
        <div className="flex">
          {/* 预览 */}
          <Button
            className="flex-1"
            type="text"
            onClick={onTogglePlayPause}
            icon={
              isPlaying ? (
                <div className="i-mdi-pause text-xl" />
              ) : (
                <div className="i-mdi-play text-xl" />
              )
            }
          />
        </div>
      </div>
    </Popup>
  );
};
