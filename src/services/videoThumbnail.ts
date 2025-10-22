/**
 * 获取视频第一帧缩略图
 * @param file - 视频文件对象
 * @returns Promise<string> 返回缩略图的Data URL
 */
export async function extractVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    // 画布
    const canvas = document.createElement("canvas");
    // 创建文件的临时URL并加载视频
    const url = URL.createObjectURL(file);

    // 等待视频第一帧数据加载完成, 视频的尺寸
    video.onloadeddata = () => {
      // 设置画布尺寸与视频相同
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // 获取绘图工具
      const ctx = canvas.getContext("2d");

      // 绘制视频第一帧到画布上
      ctx!.drawImage(video, 0, 0);

      // 释放临时URL
      URL.revokeObjectURL(url);

      // 将画布转换为Data URL
      const thumbnailDataUrl = canvas.toDataURL("image/jpeg");

      resolve(thumbnailDataUrl);
    };

    video.src = url;
    video.preload = "auto";
  });
}
