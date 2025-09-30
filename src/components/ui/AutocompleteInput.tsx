'use client';

import React, { useEffect, useRef, useState } from 'react';

interface AutocompleteInputProps {
  id: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  className?: string;
  'aria-label'?: string;
}

export default function AutocompleteInput({
  id,
  placeholder,
  value,
  onChange,
  suggestions,
  className = '',
  'aria-label': ariaLabel,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filtrar sugerencias basadas en el valor actual
  const filteredSuggestions =
    value.length > 0
      ? suggestions.filter(suggestion =>
          suggestion.toLowerCase().includes(value.toLowerCase())
        )
      : suggestions; // Mostrar todas las sugerencias si no hay valor

  // Mostrar/ocultar lista cuando hay sugerencias
  useEffect(() => {
    // Mostrar sugerencias si hay valor o si el campo está enfocado
    setIsOpen((value.length > 0 || isOpen) && filteredSuggestions.length > 0);
    setHighlightedIndex(-1);
  }, [value, filteredSuggestions.length, isOpen]);

  // Manejar selección de sugerencia
  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Manejar navegación con teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSuggestionClick(filteredSuggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Scroll a la sugerencia destacada
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [highlightedIndex]);

  return (
    <div className='relative'>
      <input
        ref={inputRef}
        id={id}
        type='text'
        className={`w-full px-4 py-2 h-10 border border-gray-300 rounded-lg placeholder-gray-400 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${className}`}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          // Mostrar todas las sugerencias al hacer clic en el campo
          if (suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        onBlur={() => {
          // Delay para permitir clicks en sugerencias
          setTimeout(() => setIsOpen(false), 150);
        }}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup='listbox'
        aria-controls={`${id}-listbox`}
        role='combobox'
        autoComplete='off'
      />

      {/* Lista de sugerencias */}
      {isOpen && filteredSuggestions.length > 0 && (
        <div
          ref={listRef}
          id={`${id}-listbox`}
          className='absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto'
          role='listbox'
        >
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={`px-4 py-2 cursor-pointer text-sm transition-colors ${
                index === highlightedIndex
                  ? 'bg-blue-100 text-blue-900'
                  : 'text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
              role='option'
              aria-selected={index === highlightedIndex}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
