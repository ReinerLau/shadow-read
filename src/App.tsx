import { Routes, Route } from "react-router";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
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

      {/* 对局页面路由 - 编辑模式 */}
      <Route path="/edit-game/:gameId" element={<GamePage />} />

      {/* 对局页面路由 - 正常模式和新增模式 */}
      <Route path="/game/:gameId" element={<GamePage />} />
    </Routes>
  );
}

export default App;
