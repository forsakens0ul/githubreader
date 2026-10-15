import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = window.location.origin + window.location.pathname;
  };

  private handleResetAll = () => {
    if (window.confirm('确定要清除本地缓存和所有数据吗？这将重置书架。')) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = window.location.origin + window.location.pathname;
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900/60 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-serif text-gray-900 dark:text-zinc-100">
                  页面加载遇到异常
                </h2>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  React 渲染组件时发生意外错误，详情如下：
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed select-all">
              {this.state.error?.toString() || '未知错误'}
              {this.state.errorInfo?.componentStack && (
                <div className="mt-2 text-slate-400 text-[11px]">
                  {this.state.errorInfo.componentStack}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>刷新重试</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>返回书架首页</span>
              </button>
              <button
                onClick={this.handleResetAll}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>重置本地数据</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
