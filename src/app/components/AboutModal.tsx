import React from 'react';
import {
  X, Eye, BarChart3, Layers, Palette, Monitor, Database,
  Info,
} from 'lucide-react';
import { VisionKitIcon } from './VisionKitIcon';
import type { Theme } from '../types';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  classColors: Record<string, string>;
}

const KITTI_CLASS_DESCRIPTIONS = [
  { name: 'Car',            desc: 'Легковые автомобили' },
  { name: 'Van',            desc: 'Фургоны и минивэны' },
  { name: 'Truck',          desc: 'Грузовики' },
  { name: 'Pedestrian',     desc: 'Пешеходы стоя' },
  { name: 'Person_sitting', desc: 'Пешеходы сидя' },
  { name: 'Cyclist',        desc: 'Велосипедисты' },
  { name: 'Tram',           desc: 'Трамваи' },
  { name: 'Misc',           desc: 'Прочие транспортные средства' },
  { name: 'DontCare',       desc: 'Зоны без аннотаций' },
];

const FEATURES = [
  { icon: Eye,      text: 'Загрузка и постраничный просмотр изображений датасета KITTI' },
  { icon: Layers,   text: 'Отображение ground truth аннотаций — сплошные цветные рамки' },
  { icon: Layers,   text: 'Отображение предсказаний нейронных сетей — пунктирные рамки' },
  { icon: BarChart3,text: 'Расчёт Precision, Recall, AP, IoU и mAP@0.5' },
  { icon: Palette,  text: 'Настраиваемое цветовое кодирование классов объектов' },
  { icon: Monitor,  text: 'Светлая и тёмная темы интерфейса с мгновенным переключением' },
  { icon: Database, text: 'Поддержка KITTI Ground Truth и YOLO Predictions' },
];

const WORKFLOW_STEPS = [
  { step: '01', title: 'Загрузить изображения',    desc: 'Выберите папку с изображениями датасета KITTI (.png / .jpg).' },
  { step: '02', title: 'Загрузить Ground Truth',   desc: 'Укажите папку с файлами аннотаций в формате KITTI (.txt). Каждый файл соответствует одному изображению.' },
  { step: '03', title: 'Загрузить предсказания',   desc: 'Укажите папку с файлами предсказаний нейронной сети в формате YOLO (.txt).' },
  { step: '04', title: 'Рассчитать метрики',        desc: 'Приложение автоматически вычислит TP, FP, FN, Precision, Recall, AP, IoU и mAP@0.5.' },
  { step: '05', title: 'Навигация',                 desc: 'Перелистывайте кадры кнопками «Влево» / «Вправо» или стрелками клавиатуры ← →.' },
];

const SHORTCUTS = [
  { keys: ['←'],        action: 'Предыдущее изображение' },
  { keys: ['→'],        action: 'Следующее изображение' },
];

const STACK = [
  ['Платформа',    'Python 3.9+'],
  ['UI фреймворк', 'PySide6 / QWebEngineView'],
  ['Датасет',      'KITTI Object Detection Benchmark'],
  ['Организация',  'Государственный научно-исследовательский институт авиационных систем (ГосНИИАС) + Колледж многоуровневого профессионального образования (КМПО) РАНХиГС'],
  ['Форматы',      'KITTI GT · YOLO Predictions · PNG · JPG'],
  ['Метрики',      'IoU ≥ 0.5, Precision, Recall, AP, mAP'],
];

export function AboutModal({ isOpen, onClose, theme, classColors }: AboutModalProps) {
  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const dim  = isDark ? 'text-zinc-500' : 'text-gray-400';
  const sub  = isDark ? 'text-zinc-300' : 'text-gray-600';
  const head = isDark ? 'text-white'    : 'text-gray-900';
  const card = isDark ? 'bg-zinc-800'   : 'bg-gray-50';
  const div  = isDark ? 'border-zinc-800' : 'border-gray-100';

  // Build KITTI classes with dynamic colors from settings
  const KITTI_CLASSES = KITTI_CLASS_DESCRIPTIONS.map(({ name, desc }) => ({
    name,
    desc,
    color: classColors[name] || '#6B7280',
  }));

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className={`text-xs uppercase tracking-widest mb-3 ${dim}`}>{children}</h3>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className={`relative w-full max-w-xl max-h-[88vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
          isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-gray-200'
        }`}
      >
        {/* ── Header ── */}
        <div className={`flex items-center justify-between px-6 py-5 border-b flex-shrink-0 ${div}`}>
          <div className="flex items-center gap-3">
            <VisionKitIcon size={34} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
            <div>
              <h2 className={`text-lg font-semibold ${head}`}>VisionKit</h2>
              <p className={`text-xs ${dim}`}>Версия 1.1.4 — прототип · 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`rounded-lg p-2 transition-colors ${
              isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                     : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-7">

          {/* Description */}
          <div>
            <SectionTitle>О приложении</SectionTitle>
            <p className={`text-sm leading-relaxed ${sub}`}>
              VisionKit — десктопное приложение для визуализации и количественной оценки
              результатов детекции объектов. Инструмент предназначен для исследователей
              и разработчиков в области компьютерного зрения, позволяя наглядно сравнивать
              аннотации ground truth с предсказаниями нейронных сетей на изображениях
              датасета KITTI.
            </p>
          </div>

          {/* Workflow */}
          <div>
            <SectionTitle>Порядок работы</SectionTitle>
            <div className="space-y-3">
              {WORKFLOW_STEPS.map(({ step, title, desc }) => (
                <div key={step} className="flex gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {step}
                  </div>
                  <div className="pt-1">
                    <p className={`text-sm font-medium leading-none mb-1 ${head}`}>{title}</p>
                    <p className={`text-xs leading-relaxed ${sub}`}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div>
            <SectionTitle>Функциональность</SectionTitle>
            <ul className="space-y-2">
              {FEATURES.map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                  <span className={`text-sm ${sub}`}>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Metrics */}
          <div>
            <SectionTitle>Метрики детекции</SectionTitle>
            <div className="grid grid-cols-1 gap-3">
              <div className={`rounded-lg p-3 ${card}`}>
                <div className={`text-sm font-semibold mb-1 ${head}`}>IoU — Intersection over Union</div>
                <p className={`text-xs leading-relaxed ${sub}`}>
                  Отношение площади пересечения предсказанной рамки и ground truth к площади их объединения.
                  Значение 1.0 соответствует идеальному совпадению. Стандартный порог для детекции — IoU ≥ 0.5
                  (PASCAL VOC).
                </p>
              </div>
              <div className={`rounded-lg p-3 ${card}`}>
                <div className={`text-sm font-semibold mb-1 ${head}`}>mAP — mean Average Precision</div>
                <p className={`text-xs leading-relaxed ${sub}`}>
                  Среднее значение Average Precision по всем классам объектов. AP для каждого класса
                  вычисляется как площадь под кривой precision-recall. mAP является основной
                  интегральной метрикой качества детектора.
                </p>
              </div>
            </div>
          </div>

          {/* KITTI Classes */}
          <div>
            <SectionTitle>Классы KITTI</SectionTitle>
            <div className="space-y-1.5">
              {KITTI_CLASSES.map(({ name, color, desc }) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className={`text-sm font-medium w-28 flex-shrink-0 ${head}`}>{name}</span>
                  <span className={`text-xs ${dim}`}>{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Keyboard shortcuts */}
          <div>
            <SectionTitle>Горячие клавиши</SectionTitle>
            <div className={`rounded-lg p-3 space-y-2 ${card}`}>
              {SHORTCUTS.map(({ keys, action }) => (
                <div key={action} className="flex items-center justify-between">
                  <span className={`text-sm ${sub}`}>{action}</span>
                  <div className="flex gap-1">
                    {keys.map(k => (
                      <kbd
                        key={k}
                        className={`px-2 py-0.5 rounded text-xs font-mono border ${
                          isDark ? 'bg-zinc-700 border-zinc-600 text-zinc-200'
                                 : 'bg-white border-gray-300 text-gray-700'
                        }`}
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stack & Dataset */}
          <div>
            <SectionTitle>Датасет и стек</SectionTitle>
            <div className={`rounded-lg divide-y text-sm ${card} ${isDark ? 'divide-zinc-700' : 'divide-gray-200'}`}>
              {STACK.map(([label, value]) => (
                <div key={label} className="flex gap-3 px-3 py-2.5">
                  <span className={`flex-shrink-0 w-28 ${dim}`}>{label}</span>
                  <span className={sub}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dataset note */}
          <div className={`rounded-lg p-3 flex gap-3 ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
            <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            <p className={`text-xs leading-relaxed ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
              Датасет KITTI собран в Карлсруэ (Германия) и содержит более 7 000 обучающих
              изображений с аннотациями для задач детекции, трекинга и оценки глубины
              в условиях городского дорожного движения.
            </p>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className={`px-6 py-4 border-t flex-shrink-0 ${div}`}>
          <p className={`text-xs text-center ${dim}`}>
            VisionKit · Инструмент визуализации детекции объектов · 2026
          </p>
        </div>
      </div>
    </div>
  );
}
