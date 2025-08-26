import React from "react";

/**
 * 用法：包裹 CytoscapeComponent 及相关子树
 * - 可定制只捕获 cytoscape/react-cytoscapejs 相关错误
 * - 避免 notify 报错导致整个页面崩溃
 * - 错误时显示提示/静默/自定义内容
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }

  static getDerivedStateFromError(error) {
    // 针对 cytoscape/react-cytoscapejs 的 notify null 错误
    if (
      error &&
      error.message &&
      error.message.includes("Cannot read properties of null") &&
      error.message.includes("notify")
    ) {
      return { hasError: true, errorMsg: "网络图渲染已自动恢复" };
    }
    // 其它错误
    return { hasError: true, errorMsg: error.message || "未知渲染错误" };
  }

  componentDidCatch(error, errorInfo) {
    // 可在这里将错误日志上报给后端或 Sentry
    // console.error("Cytoscape error boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // 只针对 Cytoscape 的报错可以静默，也可以自定义替换内容
      return (
        <div style={{
          width: 600, height: 400, display: "flex",
          alignItems: "center", justifyContent: "center",
          color: "#e66", background: "#fff4f4", borderRadius: "10px"
        }}>
          {this.state.errorMsg}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
