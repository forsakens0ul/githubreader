import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => Array<{
    context: string;
    globalPage: number;
    chapterTitle: string;
  }>;
  onSelectResult: (globalPage: number) => void;
}

export const SearchDialog: React.FC<SearchDialogProps> = ({
  isOpen,
  onClose,
  onSearch,
  onSelectResult,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<
    Array<{ context: string; globalPage: number; chapterTitle: string }>
  >([]);

  if (!isOpen) return null;

  const handleInputChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim()) {
      setResults(onSearch(val));
    } else {
      setResults([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 max-w-2xl w-full bg-background border border-border rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold">全文与本章搜索</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="输入关键字搜索当前已载入的内容..."
            value={searchQuery}
            onChange={(e) => handleInputChange(e.target.value)}
            className="pl-9 text-sm"
            autoFocus
          />
        </div>

        {results.length > 0 ? (
          <ScrollArea className="max-h-72">
            <div className="space-y-2 pr-2">
              {results.map((result, idx) => (
                <Card
                  key={idx}
                  className="p-3 cursor-pointer hover:bg-muted/60 transition-colors border-border/80"
                  onClick={() => {
                    onSelectResult(result.globalPage);
                    onClose();
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                        {result.chapterTitle}
                      </p>
                      <p className="text-[11px] text-muted-foreground mb-1 font-mono">
                        第 {result.globalPage + 1} 页
                      </p>
                      <p className="text-xs leading-relaxed text-foreground/90 font-serif">
                        {result.context}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : searchQuery.trim() ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            未在当前已读取的内容中找到匹配结果
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-muted-foreground">
            输入词语回车即可在页面内容中快速定位段落
          </div>
        )}
      </div>
    </div>
  );
};
