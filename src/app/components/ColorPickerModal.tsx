import React, { useState } from 'react';
import { X, Palette, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';

interface ColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  classColors: Record<string, string>;
  onClassColorsChange: (colors: Record<string, string>) => void;
}

// Extended color palette
const COLOR_PALETTE = [
  // Blues
  '#3B82F6', '#2563EB', '#1D4ED8', '#60A5FA', '#93C5FD',
  // Greens
  '#10B981', '#059669', '#047857', '#34D399', '#6EE7B7',
  // Reds
  '#EF4444', '#DC2626', '#B91C1C', '#F87171', '#FCA5A5',
  // Purples
  '#8B5CF6', '#7C3AED', '#6D28D9', '#A78BFA', '#C4B5FD',
  // Oranges
  '#F59E0B', '#D97706', '#B45309', '#FBBF24', '#FCD34D',
  // Cyans
  '#06B6D4', '#0891B2', '#0E7490', '#22D3EE', '#67E8F9',
  // Pinks
  '#EC4899', '#DB2777', '#BE185D', '#F472B6', '#F9A8D4',
  // Indigos
  '#6366F1', '#4F46E5', '#4338CA', '#818CF8', '#A5B4FC',
  // Teals
  '#14B8A6', '#0D9488', '#0F766E', '#2DD4BF', '#5EEAD4',
  // Ambers
  '#F97316', '#EA580C', '#C2410C', '#FB923C', '#FDBA74',
  // Violets
  '#A855F7', '#9333EA', '#7E22CE', '#C084FC', '#D8B4FE',
  // Grays
  '#6B7280', '#4B5563', '#374151', '#9CA3AF', '#D1D5DB',
];

export function ColorPickerModal({
  isOpen,
  onClose,
  theme,
  classColors,
  onClassColorsChange,
}: ColorPickerModalProps) {
  const [selectedClass, setSelectedClass] = useState<string>(Object.keys(classColors)[0]);
  const [customColor, setCustomColor] = useState('#000000');

  if (!isOpen) return null;

  const handleColorSelect = (color: string) => {
    // Check if color is already used by another class
    const isColorUsed = Object.entries(classColors).some(
      ([key, value]) => key !== selectedClass && value === color
    );

    if (isColorUsed) {
      return;
    }

    onClassColorsChange({
      ...classColors,
      [selectedClass]: color,
    });
  };

  const handleCustomColorApply = () => {
    handleColorSelect(customColor);
  };

  const isColorUsed = (color: string) => {
    return Object.entries(classColors).some(
      ([key, value]) => key !== selectedClass && value === color
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className={`
            w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl
            ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`
            sticky top-0 z-10 flex items-center justify-between p-6 border-b
            ${theme === 'dark' 
              ? 'bg-zinc-900 border-zinc-800' 
              : 'bg-white border-gray-200'
            }
          `}>
            <div className="flex items-center gap-3">
              <Palette className={`w-6 h-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
              <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Цвета классов
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Class Selection */}
            <div>
              <Label className={`text-sm mb-3 block ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}`}>
                Выберите класс:
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(classColors).map(([className, color]) => (
                  <button
                    key={className}
                    onClick={() => setSelectedClass(className)}
                    className={`
                      px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium
                      flex items-center justify-between gap-2
                      ${selectedClass === className
                        ? theme === 'dark'
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-blue-500 bg-blue-50'
                        : theme === 'dark'
                          ? 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                          : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                      }
                      ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
                    `}
                  >
                    <span className="truncate">{className}</span>
                    <div
                      className="w-5 h-5 rounded border-2 border-white/30 flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Current Selection Info */}
            <div className={`
              p-4 rounded-lg border
              ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-200'}
            `}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
                    Текущий класс:
                  </p>
                  <p className={`text-lg font-semibold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {selectedClass}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-16 h-16 rounded-lg border-4 border-white/30 shadow-lg"
                    style={{ backgroundColor: classColors[selectedClass] }}
                  />
                  <div className={`text-sm font-mono ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}`}>
                    {classColors[selectedClass].toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            {/* Color Palette */}
            <div>
              <Label className={`text-sm mb-3 block ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}`}>
                Выберите цвет из палитры:
              </Label>
              <div className="grid grid-cols-10 gap-2">
                {COLOR_PALETTE.map((color) => {
                  const used = isColorUsed(color);
                  const selected = classColors[selectedClass] === color;

                  return (
                    <button
                      key={color}
                      className={`
                        w-full aspect-square rounded-lg border-2 transition-all relative
                        ${used
                          ? 'opacity-30 cursor-not-allowed border-transparent'
                          : selected
                            ? 'border-white scale-110 shadow-lg'
                            : 'border-transparent hover:scale-105 hover:border-white/30'
                        }
                      `}
                      style={{ backgroundColor: color }}
                      onClick={() => !used && handleColorSelect(color)}
                      disabled={used}
                      title={used ? 'Цвет уже используется' : color}
                    >
                      {selected && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white drop-shadow-lg" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Color Picker */}
            <div>
              <Label className={`text-sm mb-3 block ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}`}>
                Или выберите свой цвет:
              </Label>
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-3">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-20 h-12 rounded-lg border-2 cursor-pointer"
                    style={{
                      borderColor: theme === 'dark' ? '#3f3f46' : '#d1d5db',
                    }}
                  />
                  <input
                    type="text"
                    value={customColor}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                        setCustomColor(value);
                      }
                    }}
                    placeholder="#000000"
                    className={`
                      flex-1 px-4 py-3 rounded-lg border font-mono text-sm
                      ${theme === 'dark'
                        ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      }
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                    `}
                  />
                </div>
                <Button
                  onClick={handleCustomColorApply}
                  disabled={isColorUsed(customColor) || !/^#[0-9A-Fa-f]{6}$/.test(customColor)}
                  className="px-6"
                >
                  Применить
                </Button>
              </div>
              {isColorUsed(customColor) && /^#[0-9A-Fa-f]{6}$/.test(customColor) && (
                <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                  Этот цвет уже используется другим классом
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={`
            sticky bottom-0 p-6 border-t
            ${theme === 'dark' 
              ? 'bg-zinc-900 border-zinc-800' 
              : 'bg-white border-gray-200'
            }
          `}>
            <Button
              onClick={onClose}
              className="w-full"
              size="lg"
            >
              Готово
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
