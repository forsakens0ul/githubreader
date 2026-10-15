import React from 'react';
import { ChevronRight, Download, Share, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBookStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  brightness: number;
  setBrightness: (b: number) => void;
  readingSpeed: number;
  setReadingSpeed: (s: number) => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  brightness,
  setBrightness,
  readingSpeed,
  setReadingSpeed,
}) => {
  const { settings, updateSettings } = useBookStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative z-10 w-80 max-w-[85vw] bg-background border-l border-border shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-200">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-base font-semibold">阅读设置</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <Tabs defaultValue="display" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="display">排版与主题</TabsTrigger>
              <TabsTrigger value="reading">阅读控制</TabsTrigger>
              <TabsTrigger value="advanced">更多扩展</TabsTrigger>
            </TabsList>

            {/* Display tab */}
            <TabsContent value="display" className="space-y-6 mt-5">
              {/* Font Size */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-semibold text-foreground">字号大小</label>
                  <span className="text-xs font-mono text-muted-foreground">{settings.fontSize}px</span>
                </div>
                <Slider
                  value={[settings.fontSize]}
                  onValueChange={([val]) => updateSettings({ fontSize: val })}
                  min={14}
                  max={32}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Font Family */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-2 block">字体样式</label>
                <Select
                  value={settings.fontFamily}
                  onValueChange={(val: any) => updateSettings({ fontFamily: val })}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crimson">宋体 / 明体 (Crimson)</SelectItem>
                    <SelectItem value="merriweather">衬线体 (Merriweather)</SelectItem>
                    <SelectItem value="source-serif">思源宋体 (Source Serif)</SelectItem>
                    <SelectItem value="inter">黑体 / 无衬线 (Inter / PingFang)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Line Height */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-semibold text-foreground">行间间距</label>
                  <span className="text-xs font-mono text-muted-foreground">{settings.lineHeight}x</span>
                </div>
                <Slider
                  value={[settings.lineHeight]}
                  onValueChange={([val]) => updateSettings({ lineHeight: val })}
                  min={1.3}
                  max={2.4}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Page Width */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-semibold text-foreground">页面最大宽度</label>
                  <span className="text-xs font-mono text-muted-foreground">{settings.pageWidth}px</span>
                </div>
                <Slider
                  value={[settings.pageWidth]}
                  onValueChange={([val]) => updateSettings({ pageWidth: val })}
                  min={500}
                  max={1100}
                  step={50}
                  className="w-full"
                />
              </div>

              {/* Theme Colors */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-2.5 block">阅读背景与主题</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'light', label: '纯白天色', bg: 'bg-white', text: 'text-black' },
                    { value: 'sepia', label: '羊皮复古', bg: 'bg-[#f7f1e5]', text: 'text-[#433422]' },
                    { value: 'paper', label: '柔和纸书', bg: 'bg-[#faf6f0]', text: 'text-[#2b2520]' },
                    { value: 'dark', label: '极夜深色', bg: 'bg-zinc-900', text: 'text-zinc-100' },
                  ].map((t) => (
                    <Button
                      key={t.value}
                      variant={settings.theme === t.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSettings({ theme: t.value as any })}
                      className={cn(
                        'justify-start gap-2 h-9 text-xs',
                        settings.theme === t.value && 'ring-2 ring-amber-600'
                      )}
                    >
                      <div className={cn('w-3.5 h-3.5 rounded-full border border-black/10', t.bg)} />
                      <span>{t.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Brightness */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-semibold text-foreground">屏幕滤光亮度</label>
                  <span className="text-xs font-mono text-muted-foreground">{brightness}%</span>
                </div>
                <Slider
                  value={[brightness]}
                  onValueChange={([val]) => {
                    setBrightness(val);
                    updateSettings({ brightness: val });
                  }}
                  min={30}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            </TabsContent>

            {/* Reading Tab */}
            <TabsContent value="reading" className="space-y-6 mt-5">
              {/* Page Transition */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-2 block">翻页动画动效</label>
                <Select
                  value={settings.pageTransition}
                  onValueChange={(val: any) => updateSettings({ pageTransition: val })}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slide">平滑滑动 (Slide)</SelectItem>
                    <SelectItem value="fade">柔和淡入 (Fade)</SelectItem>
                    <SelectItem value="flip">仿真翻转 (Flip)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Auto Reading Speed */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-semibold text-foreground">自动滚屏 / 语速 (WPM)</label>
                  <span className="text-xs font-mono text-muted-foreground">{readingSpeed} 字/分</span>
                </div>
                <Slider
                  value={[readingSpeed]}
                  onValueChange={([val]) => setReadingSpeed(val)}
                  min={100}
                  max={600}
                  step={25}
                  className="w-full"
                />
              </div>

              {/* Auto Save */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                <div>
                  <p className="text-xs font-semibold text-foreground">自动同步阅读进度</p>
                  <p className="text-[11px] text-muted-foreground">离开页面时自动记住章节与页码</p>
                </div>
                <Switch
                  checked={settings.autoSave}
                  onCheckedChange={(checked) => updateSettings({ autoSave: checked })}
                />
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-3 mt-5">
              <Button variant="outline" className="w-full justify-start text-xs h-10">
                <Download className="h-4 w-4 mr-2 text-muted-foreground" />
                导出高亮与标注笔记
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs h-10">
                <Share className="h-4 w-4 mr-2 text-muted-foreground" />
                分享本书链接
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs h-10">
                <Bookmark className="h-4 w-4 mr-2 text-muted-foreground" />
                管理我的书签
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
