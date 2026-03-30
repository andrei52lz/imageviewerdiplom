import React, { useState } from 'react';
import { Settings, Moon, Sun, X, LogOut, Palette } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { ColorPickerModal } from './ColorPickerModal';

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  classColors: Record<string, string>;
  onClassColorsChange: (colors: Record<string, string>) => void;
  onExitToWelcome: () => void;
}

export function SettingsSidebar({ 
  isOpen, 
  onClose, 
  theme, 
  onThemeChange,
  classColors,
  onClassColorsChange,
  onExitToWelcome 
}: SettingsSidebarProps) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 right-0 h-full w-80 z-50 shadow-xl overflow-y-auto
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        ${theme === 'dark' 
          ? 'bg-zinc-900 border-l border-zinc-800' 
          : 'bg-white border-l border-gray-200'
        }
      `}>
        {/* Header */}
        <div className={`
          flex items-center justify-between p-6 border-b sticky top-0 z-10
          ${theme === 'dark' 
            ? 'bg-zinc-900 border-zinc-800' 
            : 'bg-white border-gray-200'
          }
        `}>
          <div className="flex items-center gap-2">
            <Settings className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
            <h2 className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Настройки
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Appearance Section */}
          <div>
            <h3 className={`text-sm mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Внешний вид
            </h3>
            
            <div className="space-y-4">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className={`w-4 h-4 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`} />
                  ) : (
                    <Sun className={`w-4 h-4 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`} />
                  )}
                  <Label 
                    htmlFor="theme-toggle"
                    className={theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}
                  >
                    {theme === 'dark' ? 'Темная тема' : 'Светлая тема'}
                  </Label>
                </div>
                <Switch
                  id="theme-toggle"
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => onThemeChange(checked ? 'dark' : 'light')}
                />
              </div>
            </div>
          </div>

          <Separator className={theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-200'} />

          {/* Class Colors Button */}
          <div>
            <h3 className={`text-sm mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Настройка классов
            </h3>
            
            <Button
              onClick={() => setColorPickerOpen(true)}
              variant={theme === 'dark' ? 'outline' : 'outline'}
              className="w-full flex items-center justify-center gap-2"
            >
              <Palette className="w-4 h-4" />
              Цвета классов
            </Button>

            {/* Preview of current colors */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {Object.entries(classColors).slice(0, 9).map(([className, color]) => (
                <div
                  key={className}
                  className="flex flex-col items-center gap-1"
                  title={className}
                >
                  <div
                    className="w-8 h-8 rounded border-2 border-white/20"
                    style={{ backgroundColor: color }}
                  />
                  <span className={`text-xs truncate w-full text-center ${
                    theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'
                  }`}>
                    {className.length > 8 ? className.substring(0, 6) + '...' : className}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator className={theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-200'} />

          {/* Exit Button */}
          <Button
            variant={theme === 'dark' ? 'outline' : 'outline'}
            className="w-full flex items-center justify-center gap-2"
            onClick={onExitToWelcome}
          >
            <LogOut className="w-4 h-4" />
            Выход
          </Button>
        </div>
      </div>

      {/* Color Picker Modal */}
      <ColorPickerModal
        isOpen={colorPickerOpen}
        onClose={() => setColorPickerOpen(false)}
        theme={theme}
        classColors={classColors}
        onClassColorsChange={onClassColorsChange}
      />
    </>
  );
}