import { Button } from "antd";
import { useNavigate } from "react-router";
import MediaDatabaseService from "../services/mediaDatabase";

/**
 * 首页组件
 */
function HomePage() {
  const navigate = useNavigate();

  /**
   * 处理视频文件导入
   */
  const handleImportVideo = async () => {
    try {
      // 使用 File System Access API 打开文件选择器, 选择文件后得到文件句柄
      const [handle] = await window.showOpenFilePicker({
        // 只允许选择 mp4 视频文件
        types: [
          {
            accept: {
              // key 是 MIME 类型, value 是文件扩展名
              "video/*": [".mp4"],
            },
          },
        ],
      });

      // 保存视频文件句柄到数据库
      const mediaId = await MediaDatabaseService.saveVideo({
        name: handle.name,
        handle: handle as FileSystemFileHandle,
      });

      // 跳转到播放页并播放视频
      navigate(`/play/${mediaId}`);
    } catch (error) {
      // 用户取消选择时不抛出错误
      if (error instanceof DOMException && error.name === "AbortError") {
        // 用户取消文件选择
        return;
      }
      // 其他错误将被静默处理
    }
  };

  return (
    <div className="h-dvh flex flex-col">
      {/* header */}
      <div className="p-2 flex justify-between">
        {/* 搜索视频 */}
        <Button
          type="text"
          shape="circle"
          icon={<div className="i-mdi-magnify text-xl" />}
        />
        {/* 导入视频 */}
        <Button
          type="default"
          shape="circle"
          icon={<div className="i-mdi-plus text-xl" />}
          onClick={handleImportVideo}
        />
      </div>
      {/* 视频列表 */}
      <div className="flex-1"></div>
    </div>
  );
}

export default HomePage;
