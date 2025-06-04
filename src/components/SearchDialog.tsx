import { useState, useEffect, useCallback } from 'react';
import { Search, FileText } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';

interface SearchResult {
  title: string;
  url: string;
  content: string;
  summary?: string;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchIndex, setSearchIndex] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Load search index
  useEffect(() => {
    const loadSearchIndex = async () => {
      try {
        const response = await fetch('/search-index.json');
        if (response.ok) {
          const data = await response.json();
          setSearchIndex(data);
        }
      } catch (error) {
        console.error('Failed to load search index:', error);
      }
    };

    loadSearchIndex();
  }, []);

  // Perform search
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim() || !searchIndex.length) {
      setResults([]);
      return;
    }

    const query_lower = searchQuery.toLowerCase();
    const searchResults = searchIndex
      .filter(item => {
        return (
          item.title.toLowerCase().includes(query_lower) ||
          item.content.toLowerCase().includes(query_lower) ||
          (item.summary && item.summary.toLowerCase().includes(query_lower))
        );
      })
      .slice(0, 10); // Limit to 10 results

    setResults(searchResults);
  }, [searchIndex]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Handle result selection
  const handleSelect = (url: string) => {
    window.location.href = url;
    onOpenChange(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  return (
    <CommandDialog 
      open={open} 
      onOpenChange={onOpenChange}
      className="search-dialog-positioned"
    >
      <CommandInput
        placeholder="Search posts and pages..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {searchIndex.length === 0 ? 'Loading search index...' : 'No results found.'}
        </CommandEmpty>
        {results.length > 0 && (
          <CommandGroup heading="Results">
            {results.map((result, index) => (
              <CommandItem
                key={`${result.url}-${index}`}
                value={result.url}
                onSelect={() => handleSelect(result.url)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                <div className="flex flex-col">
                  <span className="font-medium">{result.title}</span>
                  {result.summary && (
                    <span className="text-sm text-muted-foreground line-clamp-1">
                      {result.summary}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
} 