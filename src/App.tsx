import { Routes, Route } from "react-router";
import HomePage from "./pages/HomePage";
import PlayPage from "./pages/PlayPage";

/**
 * 主应用组件
 * 管理应用的路由结构
 */
function App() {
  return (
    <Routes>
      {/* 首页路由 */}
      <Route path="/" element={<HomePage />} />

      {/* 播放页路由 */}
      <Route path="/play/:mediaId" element={<PlayPage />} />
    </Routes>
  );
}

export default App;
