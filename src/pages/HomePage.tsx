import { Button } from "antd";

/**
 * 首页组件
 */
function HomePage() {
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
        />
      </div>
      {/* 视频列表 */}
      <div className="flex-1"></div>
    </div>
  );
}

export default HomePage;
