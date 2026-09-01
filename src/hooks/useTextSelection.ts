import { useCallback, useEffect, useRef, useState } from 'react';

export const useTextSelection = () => {
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionRange, setSelectionRange] = useState<Range | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleSelectionChange = useCallback(() => {
    // Debounce to prevent too frequent updates
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const text = selection.toString().trim();

        // Only consider selections that are within message content
        // Check if selection is within a message container
        const container = range.commonAncestorContainer;
        const messageContainer =
          container.nodeType === Node.TEXT_NODE
            ? container.parentElement?.closest('.prose, [class*="markdown"], [data-message-role]')
            : (container as Element)?.closest('.prose, [class*="markdown"], [data-message-role]');

        if (text && text.length > 0 && messageContainer) {
          // Only update if text actually changed
          setSelectedText((prevText) => (prevText !== text ? text : prevText));
          setSelectionRange(range);
        } else {
          setSelectedText('');
          setSelectionRange(null);
        }
      } else {
        setSelectedText('');
        setSelectionRange(null);
      }
    }, 100); // 100ms debounce
  }, []);

  useEffect(() => {
    // Use both selectionchange and mouseup to catch selections
    document.addEventListener('selectionchange', handleSelectionChange, { passive: true });
    document.addEventListener('mouseup', handleSelectionChange, { passive: true });

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleSelectionChange);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [handleSelectionChange]);

  const clearSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
    setSelectedText('');
    setSelectionRange(null);
  }, []);

  return {
    selectedText,
    selectionRange,
    hasSelection: selectedText.length > 0,
    clearSelection,
  };
};
