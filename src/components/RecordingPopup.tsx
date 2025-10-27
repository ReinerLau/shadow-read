import { useState, useRef, useEffect } from "react";
import { Button } from "antd";
import { Popup, ProgressCircle } from "antd-mobile";

interface RecordingPopupProps {
  /** 录音模式是否显示 */
  recordingMode: boolean;
  /** 退出录音模式的回调 */
  onExitRecordingMode: () => void;
  /** 切换播放/暂停的回调 */
  onTogglePlayPause?: () => void;
}

/**
 * 录音弹窗组件
 * 用于录音当前字幕对应的音频
 */
export const RecordingPopup = ({
  recordingMode,
  onExitRecordingMode,
  onTogglePlayPause,
}: RecordingPopupProps) => {
  /** 是否正在录音 */
  const [isRecording, setIsRecording] = useState<boolean>(false);
  /** 录音时长（秒） */
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  /** 录音预览的音频 URL */
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  /** 录音计时器 */
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** MediaRecorder 实例 */
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  /** 录音音频块数组 */
  const audioChunksRef = useRef<Blob[]>([]);
  /** 已录音的 Blob */
  const recordedAudioRef = useRef<Blob | null>(null);
  /** 录音预览音频元素 */
  const audioRef = useRef<HTMLAudioElement>(null);
  /** 最大录音时长（秒） */
  const MAX_RECORDING_DURATION = 10;

  /**
   * 监听 isRecording 状态，管理定时器
   */
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      // 启动录音计时器，每100ms更新一次
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prevDuration) => {
          const newDuration = prevDuration + 0.1;

          // 当达到最大时长时，自动停止录音
          if (newDuration >= MAX_RECORDING_DURATION) {
            if (mediaRecorderRef.current) {
              mediaRecorderRef.current.stop();
            }
            setIsRecording(false);

            if (recordingTimerRef.current) {
              clearInterval(recordingTimerRef.current);
              recordingTimerRef.current = null;
            }
          }

          return newDuration;
        });
      }, 100);
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, [isRecording]);

  /**
   * 组件卸载时清理 URL 资源
   */
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  /**
   * 开始录音
   */
  const handleStartRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });
      recordedAudioRef.current = audioBlob;
      // 生成音频 URL 并更新状态，触发视图更新
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    };

    mediaRecorder.start();

    setIsRecording(true);
  };

  /**
   * 停止录音
   */
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  /**
   * 退出录音模式
   */
  const handleExitRecordingMode = () => {
    if (isRecording) {
      handleStopRecording();
    }
    // 重置状态
    recordedAudioRef.current = null;
    audioChunksRef.current = [];
    setRecordingDuration(0);
    // 清理 URL 资源
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    onExitRecordingMode();
  };

  /**
   * 处理预览播放/暂停
   */
  const handleTogglePreviewPlayPause = () => {
    if (!audioRef.current || !recordedAudioRef.current) return;

    if (audioRef.current.paused) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  };

  /**
   * 处理视频播放/暂停
   */
  const handleToggleVideoPlayPause = () => {
    if (onTogglePlayPause) {
      onTogglePlayPause();
    }
  };

  /**
   * 计算进度百分比（0-100）
   */
  const progressPercent = Math.min(
    Math.round((recordingDuration / MAX_RECORDING_DURATION) * 100),
    100
  );

  return (
    <Popup
      visible={recordingMode}
      position="bottom"
      closeOnMaskClick={true}
      onClose={handleExitRecordingMode}
    >
      <div className="p-4 h-24 flex gap-2">
        {/* 视频播放预览 */}
        <Button
          className="flex-1 h-full"
          type="text"
          onClick={handleToggleVideoPlayPause}
          title="视频预览"
          icon={<div className="i-mdi-headphones text-xl" />}
        />

        {/* 录音状态 */}
        <Button
          className="flex-1 h-full"
          type="text"
          onClick={isRecording ? handleStopRecording : handleStartRecording}
        >
          <ProgressCircle percent={isRecording ? progressPercent : 0}>
            <div className="flex items-center justify-center">
              <div className="i-mdi-microphone text-xl" />
            </div>
          </ProgressCircle>
        </Button>

        {/* 预览播放 - 录音预览 */}
        <Button
          className="flex-1 h-full"
          type="text"
          onClick={handleTogglePreviewPlayPause}
          disabled={!audioUrl}
          title="录音预览"
          icon={<div className="i-mdi-loudspeaker text-xl" />}
        />
      </div>
      {/* 隐藏的音频元素用于预览 */}
      <audio ref={audioRef} src={audioUrl || undefined} />
    </Popup>
  );
};
