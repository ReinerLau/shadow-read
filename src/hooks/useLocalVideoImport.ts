import { useState } from "react";
import { useNavigate } from "react-router";
import { message } from "antd";
import MediaDatabaseService from "../services/mediaDatabase";
import SessionStorageService from "../services/sessionStorage";
import { extractVideoMetadata } from "../services/videoData";

/**
 * 本地视频导入返回值接口
 */
interface UseLocalVideoImportReturn {
  /** 选中的文件 */
  selectedFile: File | null;
  /** 选中的文件句柄 */
  selectedHandle: FileSystemFileHandle | null;
  /** 文件哈希值 */
  fileHash: string | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 处理本地视频导入 */
  handleImportVideo: () => Promise<
    | {
        videoName: string;
        thumbnail: string;
        duration: string;
        container: string;
      }
    | false
  >;
  /** 重置本地视频导入状态 */
  resetLocalVideoState: () => void;
}

/**
 * 本地视频导入 Hook
 * 负责处理本地视频文件的选择、哈希计算、重复检查和元数据提取
 * 当找到已存在的视频时，直接导航到播放页
 * @returns 包含本地视频导入相关状态和方法的对象
 */
export function useLocalVideoImport(): UseLocalVideoImportReturn {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedHandle, setSelectedHandle] =
    useState<FileSystemFileHandle | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 处理文件选择后的逻辑 - 计算 hash 检查重复
   * @param file - 选中的文件
   * @returns 是否应该继续处理（false 表示视频已存在），以及提取的视频名称、缩略图和时长
   */
  const handleFileSelected = async (
    file: File
  ): Promise<
    | {
        videoName: string;
        thumbnail: string;
        duration: string;
        container: string;
      }
    | false
  > => {
    setIsLoading(true);

    try {
      // 第一步：计算文件哈希值
      const computedHash = await MediaDatabaseService.prepareFileForStorage(
        file
      );
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

      // 第三步：视频不存在，继续正常流程 - 设置选中的文件和视频名称
      setSelectedFile(file);
      const videoName = file.name.replace(/\.[^/.]+$/, ""); // 移除文件扩展名

      const container = file.type.split("/")[1];

      // 第四步：获取视频元数据（缩略图和时长）
      const metadata = await extractVideoMetadata(file);

      // 第五步：提取视频编码格式信息
      // const encodingFormat = await extractEncodingFormat(file);

      return {
        videoName,
        thumbnail: metadata.thumbnail,
        duration: metadata.duration,
        container: container,
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 处理视频文件导入 - 使用 File System Access API
   */
  const handleImportVideoWithFileSystemAPI = async (): Promise<
    | {
        videoName: string;
        thumbnail: string;
        duration: string;
        container: string;
      }
    | false
  > => {
    try {
      // 使用 File System Access API 打开文件选择器, 选择文件后得到文件句柄
      const [handle] = await window.showOpenFilePicker({
        // 只允许选择 mp4 视频文件
        types: [
          {
            accept: {
              // key 是 MIME 类型, value 是文件扩展名
              "video/*": [".mp4", ".webm", ".mkv", ".mov"],
            },
          },
        ],
      });

      // 设置选中的文件句柄
      setSelectedHandle(handle);
      const file = await handle.getFile();
      const result = await handleFileSelected(file);

      if (result) {
        return {
          videoName: result.videoName,
          thumbnail: result.thumbnail,
          duration: result.duration,
          container: result.container,
        };
      } else {
        return false;
      }
    } catch {
      return false;
    }
  };

  /**
   * 处理视频文件导入 - 使用 input 元素作为降级方案
   */
  const handleImportVideoWithInput = async (): Promise<
    | {
        videoName: string;
        thumbnail: string;
        duration: string;
        container: string;
      }
    | false
  > => {
    return new Promise((resolve) => {
      // 动态创建 input 元素
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".mp4,.webm,.mkv,.mov";

      // 处理文件选择
      input.onchange = async (event: Event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
          const result = await handleFileSelected(file);

          if (result) {
            resolve({
              videoName: result.videoName,
              thumbnail: result.thumbnail,
              duration: result.duration,
              container: result.container,
            });
          } else {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      };

      // 处理用户取消
      input.oncancel = () => {
        resolve(false);
      };

      // 触发文件选择
      input.click();
    });
  };

  /**
   * 处理视频文件导入
   */
  const handleImportVideo = async (): Promise<
    | {
        videoName: string;
        thumbnail: string;
        duration: string;
        container: string;
      }
    | false
  > => {
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
    setSelectedHandle(null);
    setSelectedFile(null);
    setFileHash(null);
  };

  return {
    selectedFile,
    selectedHandle,
    fileHash,
    isLoading,
    handleImportVideo,
    resetLocalVideoState,
  };
}
