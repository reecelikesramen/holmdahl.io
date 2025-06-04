import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from './ui/button';
import SearchDialog from './SearchDialog';

export default function SearchButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 text-sm bg-transparent hover:bg-accent/40 hover:brightness-105 dark:hover:brightness-110 cursor-pointer transition-all duration-300 ease-out text-(--secondary-color)] hover:text-(--secondary-color)"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <SearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
} 