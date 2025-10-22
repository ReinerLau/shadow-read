import { Button } from "antd";

/**
 * 首页组件
 */
function HomePage() {
  return (
    <div className="h-dvh flex flex-col">
      {/* header */}
      <div className="p-2 flex justify-end">
        <Button
          type="primary"
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
