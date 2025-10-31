import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { message } from "antd";
import MediaDatabaseService from "../services/mediaDatabase";
import SessionStorageService from "../services/sessionStorage";

/**
 * 本地视频导入返回值接口
 */
interface UseLocalVideoImportReturn {
  /** 选中的文件 ref */
  selectedFileRef: React.RefObject<File | null>;
  /** 选中的文件句柄 ref */
  selectedHandleRef: React.RefObject<FileSystemFileHandle | null>;
  /** 文件哈希值 */
  fileHash: string | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 处理本地视频导入 */
  handleImportVideo: () => Promise<boolean>;
  /** 重置本地视频导入状态 */
  resetLocalVideoState: () => void;
}

/**
 * 本地视频导入 Hook
 * 负责处理本地视频文件的选择、哈希计算和重复检查
 * 元数据（缩略图和时长）的提取已迁移至 PlayPage，在视频加载时提取
 * @param inputRef - 隐藏的 input 元素的 ref
 * @returns 包含本地视频导入相关状态和方法的对象
 */
export function useLocalVideoImport(
  inputRef?: React.RefObject<HTMLInputElement | null>
): UseLocalVideoImportReturn {
  const navigate = useNavigate();
  const selectedFileRef = useRef<File | null>(null);
  const selectedHandleRef = useRef<FileSystemFileHandle | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 处理文件选择后的逻辑 - 计算 hash 检查重复
   * @param file - 选中的文件
   * @returns 是否应该继续处理（false 表示视频已存在）
   */
  const handleFileSelected = async (file: File): Promise<boolean> => {
    // 第一步：计算文件哈希值
    const computedHash = await MediaDatabaseService.prepareFileForStorage(file);
    setFileHash(computedHash);

    // 第二步：检查数据库中是否已存在该 hash 的视频
    const existingVideo = await MediaDatabaseService.getVideoByUniqueValue(
      computedHash
    );

    if (existingVideo) {
      // 视频已存在
      message.info("视频已存在，直接播放");
      SessionStorageService.addVideoId(existingVideo.id);

      // 检查是否支持 File System Access API
      if ("showOpenFilePicker" in window) {
        // 支持 File System Access API，直接跳转播放
        navigate(`/play/${existingVideo.id}`);
        return false;
      } else {
        // 不支持 File System Access API，需要更新 blobUrl
        const blobUrl = URL.createObjectURL(file);
        await MediaDatabaseService.updateVideoBlobUrl(
          existingVideo.id,
          blobUrl
        );
        navigate(`/play/${existingVideo.id}`);
        return false;
      }
    }

    // 第三步：视频不存在，继续正常流程 - 设置选中的文件
    selectedFileRef.current = file;
    return true;
  };

  /**
   * 处理视频文件导入 - 使用 File System Access API
   */
  const handleImportVideoWithFileSystemAPI = async (): Promise<boolean> => {
    try {
      // 使用 File System Access API 打开文件选择器, 选择文件后得到文件句柄
      const [handle] = await window.showOpenFilePicker({
        // 只允许选择 mp4 视频文件
        types: [
          {
            accept: {
              // key 是 MIME 类型, value 是文件扩展名
              "video/*": [".mp4", ".mov", ".mkv", ".webm"],
            },
          },
        ],
      });

      // 设置选中的文件句柄
      selectedHandleRef.current = handle;
      const file = await handle.getFile();
      return await handleFileSelected(file);
    } catch {
      return false;
    }
  };

  /**
   * 处理视频文件导入 - 使用隐藏的 input 元素作为降级方案
   */
  const handleImportVideoWithInput = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!inputRef?.current) {
        resolve(false);
        return;
      }

      const input = inputRef.current;

      // 定义一次性的事件处理函数
      const handleFileChange = async (event: Event) => {
        try {
          const target = event.target as HTMLInputElement;
          const file = target.files?.[0];
          if (file) {
            const result = await handleFileSelected(file);
            resolve(result);
          } else {
            resolve(false);
          }
        } catch {
          resolve(false);
        } finally {
          inputRef.current!.value = "";
        }
      };

      const handleFileCancel = () => {
        inputRef.current!.value = "";
        resolve(false);
      };

      // 监听 change 事件，处理完成后移除监听
      input.addEventListener("change", handleFileChange, { once: true });
      input.addEventListener("cancel", handleFileCancel, { once: true });

      // 触发文件选择
      input.click();
    });
  };

  /**
   * 处理视频文件导入
   */
  const handleImportVideo = async (): Promise<boolean> => {
    setIsLoading(true);

    try {
      // 检查浏览器是否支持 File System Access API
      if ("showOpenFilePicker" in window) {
        return await handleImportVideoWithFileSystemAPI();
      } else {
        // 降级方案：使用 input 元素
        return await handleImportVideoWithInput();
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 重置本地视频导入状态
   */
  const resetLocalVideoState = () => {
    selectedHandleRef.current = null;
    selectedFileRef.current = null;
    setFileHash(null);
  };

  return {
    selectedFileRef,
    selectedHandleRef,
    fileHash,
    isLoading,
    handleImportVideo,
    resetLocalVideoState,
  };
}
