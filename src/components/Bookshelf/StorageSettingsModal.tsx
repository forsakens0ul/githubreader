import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  FolderSync,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Folder,
  Loader2,
} from 'lucide-react';
import {
  isFileSystemAccessSupported,
  getSavedDirectoryName,
  pickLocalDirectory,
  syncBooksToDirectory,
  exportBackupJson,
  importBackupJson,
  getStorageEstimate,
} from '../../services/localFileSystem';
import { db } from '../../db';
import { toast } from 'sonner';

interface StorageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export const StorageSettingsModal: React.FC<StorageSettingsModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const [usedSpace, setUsedSpace] = useState('计算中...');
  const [totalSpace, setTotalSpace] = useState<string | undefined>();
  const [localDirName, setLocalDirName] = useState<string | null>(null);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      getStorageEstimate().then((est) => {
        setUsedSpace(est.usedMb);
        setTotalSpace(est.totalMb);
      });
      setLocalDirName(getSavedDirectoryName());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePickDirectory = async () => {
    try {
      const handle = await pickLocalDirectory();
      if (handle) {
        setDirHandle(handle);
        setLocalDirName(handle.name);
        toast.success(`已成功关联本地文件夹: ${handle.name}`);
      }
    } catch (err: any) {
      toast.error(err.message || '选择文件夹失败');
    }
  };

  const handleSyncToLocal = async () => {
    let handle = dirHandle;
    if (!handle) {
      try {
        handle = await pickLocalDirectory();
        if (handle) {
          setDirHandle(handle);
          setLocalDirName(handle.name);
        } else {
          return;
        }
      } catch (err: any) {
        toast.error(err.message || '请先选择本地目录');
        return;
      }
    }

    setIsSyncing(true);
    setSyncStatus('正在准备同步本地物理文件...');
    try {
      const res = await syncBooksToDirectory(handle, (msg) => setSyncStatus(msg));
      toast.success(`同步完成！已将 ${res.savedBooks} 本书、${res.savedFiles} 个章节文件导出至本地文件夹`);
    } catch (err: any) {
      toast.error(`同步失败: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setSyncStatus(null);
    }
  };

  const handleExportJson = async () => {
    try {
      await exportBackupJson();
      toast.success('已导出书架与阅读进度备份文件 (.json)');
    } catch (err: any) {
      toast.error(`导出失败: ${err.message}`);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await importBackupJson(file);
      toast.success(`已成功恢复 ${res.booksCount} 本图书及 ${res.filesCount} 个已缓存章节！`);
      onDataChanged();
      onClose();
    } catch (err: any) {
      toast.error(`导入备份失败: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearCache = async () => {
    if (window.confirm('确定要清除所有已下载的章节离线缓存吗？（书架和阅读进度将保留，下次阅读需重新从 GitHub 下载）')) {
      await db.cachedFiles.clear();
      const est = await getStorageEstimate();
      setUsedSpace(est.usedMb);
      toast.success('已清空离线缓存');
    }
  };

  const supportsFs = isFileSystemAccessSupported();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-amber-100 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-gray-900 dark:text-zinc-100">
                本地存储与文件管理
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                管理浏览器离线缓存与物理磁盘目录
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Storage Explanation */}
        <div className="p-3.5 bg-amber-50/60 dark:bg-zinc-800/50 border border-amber-200/50 dark:border-zinc-700 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-800 dark:text-zinc-200">当前存储机制</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-mono text-[11px] font-medium flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>浏览器安全沙箱 (IndexedDB)</span>
            </span>
          </div>
          <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed">
            默认情况下，GitHub 文本书籍下载后保存在浏览器的私有数据库中。离线可读，读取飞快，绝不上传任何服务器。
          </p>
          <div className="pt-1 flex items-center justify-between text-xs font-mono text-gray-500 dark:text-zinc-400 border-t border-amber-200/30 dark:border-zinc-700">
            <span>当前已占用存储空间：</span>
            <span className="font-bold text-amber-700 dark:text-amber-400">{usedSpace} {totalSpace ? `/ 可用 ${totalSpace}` : ''}</span>
          </div>
        </div>

        {/* Section 2: Physical Local Directory Sync */}
        <div className="space-y-2.5">
          <div className="flex items-center space-x-2">
            <FolderSync className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-wide">
              绑定电脑本地物理文件夹 (File System Access)
            </h4>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-gray-800 dark:text-zinc-200 flex items-center space-x-1">
                  <Folder className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    {localDirName ? `已关联目录: ${localDirName}` : '尚未设置本地同步目录'}
                  </span>
                </p>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                  可将书籍与已缓存的 TXT/Markdown 文件直接以真实文件形式存入您电脑上的自定义文件夹中。
                </p>
              </div>
            </div>

            {supportsFs ? (
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handlePickDirectory}
                  disabled={isSyncing}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-600 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200 transition-colors"
                >
                  {localDirName ? '更换本地目录' : '选择本地存储文件夹...'}
                </button>
                <button
                  onClick={handleSyncToLocal}
                  disabled={isSyncing}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white transition-colors shadow-xs flex items-center space-x-1.5"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>正在导出真实文件...</span>
                    </>
                  ) : (
                    <>
                      <FolderSync className="w-3.5 h-3.5" />
                      <span>一键同步书籍至此目录</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-zinc-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>您的浏览器不支持文件系统写入 API（推荐使用 Chrome 或 Edge 体验物理目录同步）。</span>
              </div>
            )}

            {syncStatus && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-mono animate-pulse">
                {syncStatus}
              </p>
            )}
          </div>
        </div>

        {/* Section 3: Universal Backup & Restore */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-wide">
            通用数据备份与迁移
          </h4>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleExportJson}
              className="p-3 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left space-y-1"
            >
              <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-800 dark:text-zinc-200">
                <Download className="w-3.5 h-3.5 text-amber-600" />
                <span>导出备份 (.json)</span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-zinc-400">
                保存全部书籍清单、阅读进度与已缓存内容为单个文件
              </p>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left space-y-1"
            >
              <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-800 dark:text-zinc-200">
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>导入恢复备份</span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-zinc-400">
                从之前的备份文件一键还原书架与历史记录
              </p>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <button
            onClick={handleClearCache}
            className="inline-flex items-center space-x-1 text-xs text-rose-600 dark:text-rose-400 hover:underline"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>清空离线缓存</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
