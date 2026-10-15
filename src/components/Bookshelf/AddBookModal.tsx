import React, { useState } from 'react';
import { X, Sparkles, Key, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { parseGitHubUrl, fetchRepoMetadata, fetchRepoFileTree } from '../../services/github';
import { buildBookStructure } from '../../services/parser';
import { db } from '../../db';
import type { BookMetadata } from '../../types';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookAdded: (book: BookMetadata) => void;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({ isOpen, onClose, onBookAdded }) => {
  const [urlInput, setUrlInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenField, setShowTokenField] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = async (targetUrl?: string) => {
    const input = targetUrl || urlInput;
    if (!input.trim()) {
      setErrorMsg('请输入 GitHub 仓库地址');
      return;
    }

    setErrorMsg(null);
    try {
      setLoadingStep('正在解析仓库链接...');
      const ref = parseGitHubUrl(input);

      setLoadingStep(`正在获取 ${ref.owner}/${ref.repo} 仓库元数据...`);
      const meta = await fetchRepoMetadata(ref.owner, ref.repo, tokenInput || undefined);

      const branch = ref.branch || meta.defaultBranch || 'main';
      setLoadingStep(`正在读取分支 [${branch}] 文件目录树...`);
      const tree = await fetchRepoFileTree(ref.owner, ref.repo, branch, tokenInput || undefined);

      if (tree.length === 0) {
        throw new Error('未在仓库中找到任何文件，请确认仓库不为空');
      }

      setLoadingStep('正在解析并编排书籍章节...');
      const book = buildBookStructure(
        ref.owner,
        ref.repo,
        branch,
        tree,
        ref.subPath,
        { title: meta.title, description: meta.description }
      );

      if (book.totalChapters === 0) {
        throw new Error('未在仓库中检测到支持的 TXT 或 Markdown 文本文件');
      }

      setLoadingStep('正在保存到本地书架...');
      await db.books.put(book);

      setLoadingStep(null);
      onBookAdded(book);
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setLoadingStep(null);
      setErrorMsg((err as Error).message || '导入失败，请稍后重试');
    }
  };

  const handleQuickDemo = () => {
    setUrlInput('https://github.com/forsakens0ul/githubreader');
    handleImport('https://github.com/forsakens0ul/githubreader');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-amber-100 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={!!loadingStep}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-4">
          <div>
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <Sparkles className="w-3.5 h-3.5" />
              <span>导入 GitHub 仓库</span>
            </span>
            <h2 className="text-xl font-bold font-serif text-gray-900 dark:text-zinc-100 mt-2">
              添加公开文本仓库为电子书
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              自动识别 Markdown 与 TXT 文件、章节序号及目录结构，即刻转化为沉浸式电子书。
            </p>
          </div>

          {/* Quick preset button */}
          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                推荐体验书目：《GitHub Reader 官方手册》
              </p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400">
                forsakens0ul/githubreader · 极速体验 Markdown 与 TXT 智能解析排版
              </p>
            </div>
            <button
              onClick={handleQuickDemo}
              disabled={!!loadingStep}
              className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white transition-colors shadow-xs"
            >
              一键导入
            </button>
          </div>

          {/* URL Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              GitHub 仓库 URL 或路径
            </label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="例如: https://github.com/owner/repo 或 owner/repo"
              disabled={!!loadingStep}
              className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 font-mono"
            />
          </div>

          {/* Collapsible Token input */}
          <div>
            <button
              type="button"
              onClick={() => setShowTokenField(!showTokenField)}
              className="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center space-x-1"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{showTokenField ? '收起 GitHub Token' : '配置 GitHub Token (可选，解决 60次/时 速率限制)'}</span>
            </button>
            {showTokenField && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-zinc-800/60 rounded-xl border border-gray-200 dark:border-zinc-700 space-y-1">
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx (仅保存在本地浏览器)"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-zinc-100 font-mono"
                />
                <p className="text-[11px] text-gray-400">
                  仅当遇到 GitHub 匿名访问速率受限时需填入，纯前端处理绝不上传。
                </p>
              </div>
            )}
          </div>

          {/* Loading status */}
          {loadingStep && (
            <div className="p-3 bg-amber-50 dark:bg-zinc-800 rounded-xl flex items-center space-x-3 text-xs text-amber-900 dark:text-amber-300">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
              <span>{loadingStep}</span>
            </div>
          )}

          {/* Error message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start space-x-2 text-xs text-rose-800 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2.5">
            <button
              onClick={onClose}
              disabled={!!loadingStep}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => handleImport()}
              disabled={!!loadingStep || !urlInput.trim()}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white transition-colors shadow-xs"
            >
              <span>{loadingStep ? '正在导入...' : '开始导入'}</span>
              {!loadingStep && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
