import { useState, useEffect } from 'react';
import type { BookMetadata } from './types';
import { BookshelfView } from './components/Bookshelf/BookshelfView';
import { CoreaderBridge } from './components/Reader/CoreaderBridge';
import { db } from './db';
import { Toaster } from 'sonner';

export function App() {
  const [activeBook, setActiveBook] = useState<BookMetadata | null>(null);

  // Check URL params on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get('book');
    if (bookId) {
      db.books.get(bookId).then((b) => {
        if (b) {
          setActiveBook(b);
        }
      });
    }
  }, []);

  const handleOpenBook = (book: BookMetadata) => {
    setActiveBook(book);
    const url = new URL(window.location.href);
    url.searchParams.set('book', book.id);
    window.history.pushState({}, '', url.toString());
  };

  const handleBackToShelf = () => {
    setActiveBook(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('book');
    window.history.pushState({}, '', url.toString());
  };

  return (
    <div className="w-full min-h-screen">
      <Toaster position="top-center" richColors />
      {activeBook ? (
        <CoreaderBridge book={activeBook} onBackToShelf={handleBackToShelf} />
      ) : (
        <BookshelfView onOpenBook={handleOpenBook} />
      )}
    </div>
  );
}

export default App;
