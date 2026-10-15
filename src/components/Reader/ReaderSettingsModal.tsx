import React from 'react';
import {
  X,
  Sun,
  Moon,
  Coffee,
  Leaf,
  Sliders,
  BookOpen,
  Scroll,
  Network,
} from 'lucide-react';
import type { ReadingSettings, ThemeMode, FontFamily, MirrorSource } from '../../types';

interface ReaderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReadingSettings;
  onUpdateSettings: (updates: Partial<ReadingSettings>) => void;
}

export const ReaderSettingsModal: React.FC<ReaderSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const themes: { id: ThemeMode; label: string; icon: React.ReactNode; bg: string; text: string }[] = [
    { id: 'sepia', label: '羊皮纸', icon: <Coffee className="w-4 h-4" />, bg: 'bg-[#f7f1e3]', text: 'text-[#433827]' },
    { id: 'eye-care', label: '护眼绿', icon: <Leaf className="w-4 h-4" />, bg: 'bg-[#eaf4ea]', text: 'text-[#24422b]' },
    { id: 'light', label: '象牙白', icon: <Sun className="w-4 h-4" />, bg: 'bg-white', text: 'text-gray-900' },
    { id: 'dark', label: '极夜灰', icon: <Moon className="w-4 h-4" />, bg: 'bg-[#1a1b1e]', text: 'text-gray-200' },
  ];

  const fontFamilies: { id: FontFamily; label: string }[] = [
    { id: 'serif', label: '宋体 / 仿宋' },
    { id: 'sans', label: '黑体 / 无衬线' },
    { id: 'mono', label: '等宽字体' },
  ];

  const lineHeights = [
    { val: 1.5, label: '紧凑 1.5' },
    { val: 1.8, label: '标准 1.8' },
    { val: 2.2, label: '宽松 2.2' },
  ];

  const maxWidths = [
    { val: 720, label: '舒适 (720px)' },
    { val: 820, label: '标准 (820px)' },
    { val: 960, label: '宽屏 (960px)' },
  ];

  const mirrorSources: { id: MirrorSource; label: string; desc: string }[] = [
    { id: 'auto', label: '智能加速 (推荐)', desc: '自动选择最快可用节点' },
    { id: 'raw', label: 'GitHub Raw', desc: '官方原址直接拉取' },
    { id: 'gitmirror', label: 'GitMirror 镜像', desc: '针对国内网络环境优化' },
    { id: 'jsdelivr', label: 'jsDelivr 全球CDN', desc: '全球边缘缓存加速' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-amber-100 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-amber-600" />
          <h3 className="font-serif font-bold text-lg text-gray-900 dark:text-zinc-100">
            阅读排版偏好
          </h3>
        </div>

        {/* 1. Theme Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
            阅读配色
          </label>
          <div className="grid grid-cols-4 gap-2">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => onUpdateSettings({ theme: t.id })}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                  t.bg
                } ${t.text} ${
                  settings.theme === t.id
                    ? 'border-amber-600 shadow-md ring-2 ring-amber-500/20 scale-102 font-bold'
                    : 'border-gray-200 dark:border-zinc-700 hover:border-amber-300'
                }`}
              >
                {t.icon}
                <span className="text-[11px] mt-1.5">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Font Size */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300 flex justify-between">
            <span>字号大小</span>
            <span className="font-mono text-amber-600">{settings.fontSize} px</span>
          </label>
          <div className="flex items-center space-x-3 bg-gray-50 dark:bg-zinc-800/80 p-2 rounded-2xl border border-gray-200 dark:border-zinc-700">
            <button
              onClick={() => onUpdateSettings({ fontSize: Math.max(14, settings.fontSize - 1) })}
              className="flex-1 py-1.5 rounded-xl bg-white dark:bg-zinc-900 text-xs font-bold text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 transition-colors shadow-2xs"
            >
              A -
            </button>
            <div className="text-center font-mono text-xs w-16 text-gray-600 dark:text-zinc-300">
              {settings.fontSize}
            </div>
            <button
              onClick={() => onUpdateSettings({ fontSize: Math.min(28, settings.fontSize + 1) })}
              className="flex-1 py-1.5 rounded-xl bg-white dark:bg-zinc-900 text-xs font-bold text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 transition-colors shadow-2xs"
            >
              A +
            </button>
          </div>
        </div>

        {/* 3. Font Family */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
            字体风格
          </label>
          <div className="grid grid-cols-3 gap-2">
            {fontFamilies.map((f) => (
              <button
                key={f.id}
                onClick={() => onUpdateSettings({ fontFamily: f.id })}
                className={`py-2 px-3 text-xs rounded-xl border transition-all ${
                  settings.fontFamily === f.id
                    ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold'
                    : 'border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Reading Mode */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
            阅读翻页模式
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpdateSettings({ readingMode: 'paginated' })}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 text-xs rounded-xl border transition-all ${
                settings.readingMode === 'paginated'
                  ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold'
                  : 'border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>左右分页翻阅</span>
            </button>

            <button
              onClick={() => onUpdateSettings({ readingMode: 'scroll' })}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 text-xs rounded-xl border transition-all ${
                settings.readingMode === 'scroll'
                  ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold'
                  : 'border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Scroll className="w-4 h-4" />
              <span>纵向连续滚动</span>
            </button>
          </div>
        </div>

        {/* 5. Line Height & Width */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              行距间隙
            </label>
            <select
              value={settings.lineHeight}
              onChange={(e) => onUpdateSettings({ lineHeight: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-800 dark:text-zinc-200"
            >
              {lineHeights.map((l) => (
                <option key={l.val} value={l.val}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              版心宽度
            </label>
            <select
              value={settings.maxWidth}
              onChange={(e) => onUpdateSettings({ maxWidth: parseInt(e.target.value, 10) })}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-800 dark:text-zinc-200"
            >
              {maxWidths.map((w) => (
                <option key={w.val} value={w.val}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 6. Mirror Acceleration Source */}
        <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-zinc-800">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-gray-700 dark:text-zinc-300">
            <Network className="w-3.5 h-3.5 text-amber-600" />
            <span>网络与镜像加速源</span>
          </div>
          <select
            value={settings.mirrorSource}
            onChange={(e) => onUpdateSettings({ mirrorSource: e.target.value as MirrorSource })}
            className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-800 dark:text-zinc-200"
          >
            {mirrorSources.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} ({m.desc})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
