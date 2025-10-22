/**
 * 获取视频第一帧缩略图
 * @param file - 视频文件对象
 * @returns Promise<string> 返回缩略图的Data URL
 */
export async function extractVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");

    let resolved = false;

    video.onloadedmetadata = () => {
      // 设置画布尺寸与视频相同
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // 跳转到第一帧（设置为 0.1 秒以确保能获取到内容）
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      if (resolved) return;

      // 获取视频的第一帧
      const ctx = canvas.getContext("2d");

      ctx!.drawImage(video, 0, 0);

      // 将画布转换为Data URL
      const thumbnailDataUrl = canvas.toDataURL("image/jpeg");
      resolved = true;
      resolve(thumbnailDataUrl);
    };

    // 创建文件的临时URL并加载视频
    const url = URL.createObjectURL(file);
    video.src = url;
    video.preload = "auto";

    // 清理临时URL
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  });
}
