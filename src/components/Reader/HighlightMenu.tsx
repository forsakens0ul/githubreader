import React, { useState } from 'react';
import { Highlighter, MessageSquare, Copy, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface HighlightMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  selectedText: string;
  bookTitle: string;
  bookAuthor: string;
  currentPage: number;
  onAddHighlight: (color: 'yellow' | 'blue' | 'green' | 'red', style: 'highlight' | 'underline' | 'wave') => void;
  onSaveNote: (note: string) => void;
}

export const HighlightMenu: React.FC<HighlightMenuProps> = ({
  isOpen,
  onClose,
  position,
  selectedText,
  bookTitle,
  bookAuthor,
  currentPage,
  onAddHighlight,
  onSaveNote,
}) => {
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteText, setNoteText] = useState('');

  if (!isOpen) return null;

  const handleCopy = () => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
      toast.success('已复制所选文字到剪贴板');
      onClose();
    }
  };

  const handleShare = () => {
    if (selectedText) {
      const quote = `"${selectedText}" —— 《${bookTitle}》（${bookAuthor}，第 ${currentPage + 1} 页）`;
      if (navigator.share) {
        navigator.share({ title: bookTitle, text: quote }).catch(() => {});
      } else {
        navigator.clipboard.writeText(quote);
        toast.success('金句已复制到剪贴板');
      }
      onClose();
    }
  };

  const handleOpenNote = () => {
    setShowNoteDialog(true);
  };

  const handleConfirmNote = () => {
    onSaveNote(noteText);
    setShowNoteDialog(false);
    setNoteText('');
    onClose();
  };

  return (
    <>
      {/* Click outside overlay */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Floating Toolbar */}
      <div
        className="fixed z-50 bg-background border border-border rounded-xl shadow-xl p-1.5 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-100"
        style={{
          left: Math.max(10, Math.min(position.x - 100, window.innerWidth - 220)),
          top: Math.max(10, position.y - 70),
        }}
      >
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onAddHighlight('yellow', 'highlight')}
          className="bg-[#fff0d3] hover:bg-[#ffe9bc] dark:bg-amber-950 dark:hover:bg-amber-900 w-8 h-8 p-0"
          title="高亮标注"
        >
          <Highlighter className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleOpenNote}
          className="w-8 h-8 p-0"
          title="写批注"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="w-8 h-8 p-0"
          title="复制所选文字"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleShare}
          className="w-8 h-8 p-0"
          title="生成金句分享"
        >
          <Share className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">添加读书批注</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/60 rounded-xl border border-border/60">
              <p className="text-xs italic text-muted-foreground line-clamp-3">
                "{selectedText}"
              </p>
            </div>
            <Textarea
              placeholder="写下您的读书思考、批注或总结..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              className="text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNoteDialog(false)}
              >
                取消
              </Button>
              <Button size="sm" onClick={handleConfirmNote}>
                保存笔记
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
