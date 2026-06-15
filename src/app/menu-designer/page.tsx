'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, ExternalLink, Save, Loader2, LayoutGrid, List } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import ImagePicker from '@/components/ui/ImagePicker';
import Toast from '@/components/ui/Toast';
import { getMenuDesign, saveMenuDesign, type MenuDesignData, type MenuSection } from '@/lib/api';

// ─── Default design ───────────────────────────────────────────────────────────
const defaultDesign: MenuDesignData = {
  restaurantName: '',
  tagline: '',
  logo: '',
  bannerImage: '',
  primaryColor: '#E8323A',
  backgroundColor: '#F7F7F7',
  surfaceColor: '#FFFFFF',
  textColor: '#0F0F0F',
  textMutedColor: '#888888',
  fontFamily: 'inter',
  headerStyle: 'minimal',
  showSearch: true,
  showCategoryTabs: true,
  sections: [
    { id: 'featured', type: 'featured', label: 'Featured', visible: true, layout: 'grid' },
    { id: 'categories', type: 'categories', label: 'By Category', visible: true, layout: 'grid' },
    { id: 'collections', type: 'collections', label: 'Collections', visible: true, layout: 'grid' },
    { id: 'all-items', type: 'all-items', label: 'All Items', visible: false, layout: 'grid' },
  ],
  footerText: '',
};

const FONT_OPTIONS = [
  { value: 'inter', label: 'Inter', preview: 'Modern & Clean' },
  { value: 'playfair', label: 'Playfair Display', preview: 'Elegant & Serif' },
  { value: 'poppins', label: 'Poppins', preview: 'Friendly & Round' },
  { value: 'raleway', label: 'Raleway', preview: 'Thin & Stylish' },
  { value: 'lato', label: 'Lato', preview: 'Humanist & Warm' },
];

// ─── Sortable section row ─────────────────────────────────────────────────────
function SortableSection({
  section,
  onToggle,
  onLayoutChange,
}: {
  section: MenuSection;
  onToggle: (id: string) => void;
  onLayoutChange: (id: string, layout: 'grid' | 'list') => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        section.visible ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical size={18} />
      </button>

      {/* Section info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${section.visible ? 'text-gray-800' : 'text-gray-400'}`}>
          {section.label}
        </p>
        <p className="text-xs text-gray-400 capitalize">{section.type.replace('-', ' ')}</p>
      </div>

      {/* Layout toggle */}
      <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => onLayoutChange(section.id, 'grid')}
          className={`p-1.5 transition-colors ${
            section.layout === 'grid' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'
          }`}
          title="Grid layout"
        >
          <LayoutGrid size={13} />
        </button>
        <button
          type="button"
          onClick={() => onLayoutChange(section.id, 'list')}
          className={`p-1.5 transition-colors ${
            section.layout === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'
          }`}
          title="List layout"
        >
          <List size={13} />
        </button>
      </div>

      {/* Visibility toggle */}
      <button
        type="button"
        onClick={() => onToggle(section.id)}
        className={`p-1.5 rounded-lg transition-colors ${
          section.visible
            ? 'text-indigo-600 hover:bg-indigo-50'
            : 'text-gray-300 hover:bg-gray-100'
        }`}
        title={section.visible ? 'Hide section' : 'Show section'}
      >
        {section.visible ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
    </div>
  );
}

// ─── Color field ──────────────────────────────────────────────────────────────
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-gray-700 flex-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 px-2 py-1 text-xs border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </div>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{children}</p>
  );
}

const fieldCls =
  'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

// ─── Main page ─────────────────────────────────────────────────────────────────
type TabId = 'branding' | 'colors' | 'layout' | 'sections';

export default function MenuDesignerPage() {
  const [design, setDesign] = useState<MenuDesignData>(defaultDesign);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabId>('branding');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    getMenuDesign()
      .then(({ data }) => {
        if (data.data && Object.keys(data.data).length > 0) {
          setDesign({ ...defaultDesign, ...data.data });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = useCallback(<K extends keyof MenuDesignData>(key: K, value: MenuDesignData[K]) => {
    setDesign((d) => ({ ...d, [key]: value }));
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDesign((d) => {
      const oldIdx = d.sections.findIndex((s) => s.id === active.id);
      const newIdx = d.sections.findIndex((s) => s.id === over.id);
      return { ...d, sections: arrayMove(d.sections, oldIdx, newIdx) };
    });
  };

  const toggleSection = (id: string) => {
    setDesign((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)),
    }));
  };

  const changeSectionLayout = (id: string, layout: 'grid' | 'list') => {
    setDesign((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === id ? { ...s, layout } : s)),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMenuDesign(design);
      setToast({ message: 'Menu design saved', type: 'success' });
    } catch {
      setToast({ message: 'Failed to save', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'branding', label: 'Branding' },
    { id: 'colors', label: 'Colors' },
    { id: 'layout', label: 'Layout' },
    { id: 'sections', label: 'Sections' },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-24">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Menu Designer</h1>
          <p className="text-sm text-gray-500 mt-0.5">Customize your digital menu's look and feel</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`${process.env.NEXT_PUBLIC_FRONTEND_URL || ''}/newmenu`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ExternalLink size={14} /> Preview
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Settings panel ───────────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-0">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Branding tab ─────────────────────────────────────────── */}
          {tab === 'branding' && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Restaurant Name
                  </label>
                  <input
                    value={design.restaurantName}
                    onChange={(e) => set('restaurantName', e.target.value)}
                    placeholder="e.g. Mint Café"
                    className={fieldCls}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
                  <input
                    value={design.tagline}
                    onChange={(e) => set('tagline', e.target.value)}
                    placeholder="e.g. Fresh flavors, every day"
                    className={fieldCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <ImagePicker
                  label="Logo"
                  value={design.logo}
                  onChange={(url) => set('logo', url)}
                />
                <ImagePicker
                  label="Banner / Hero Image"
                  value={design.bannerImage}
                  onChange={(url) => set('bannerImage', url)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
                <input
                  value={design.footerText}
                  onChange={(e) => set('footerText', e.target.value)}
                  placeholder="e.g. © 2025 Mint Café. All rights reserved."
                  className={fieldCls}
                />
              </div>
            </div>
          )}

          {/* ── Colors tab ───────────────────────────────────────────── */}
          {tab === 'colors' && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
              <div className="space-y-4">
                <SectionLabel>Palette</SectionLabel>
                <ColorField label="Primary / Accent" value={design.primaryColor} onChange={(v) => set('primaryColor', v)} />
                <ColorField label="Page Background" value={design.backgroundColor} onChange={(v) => set('backgroundColor', v)} />
                <ColorField label="Card / Surface" value={design.surfaceColor} onChange={(v) => set('surfaceColor', v)} />
                <ColorField label="Heading Text" value={design.textColor} onChange={(v) => set('textColor', v)} />
                <ColorField label="Muted Text" value={design.textMutedColor} onChange={(v) => set('textMutedColor', v)} />
              </div>

              <div>
                <SectionLabel>Typography</SectionLabel>
                <div className="grid grid-cols-1 gap-2">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => set('fontFamily', f.value as MenuDesignData['fontFamily'])}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                        design.fontFamily === f.value
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <span className="text-sm font-medium text-gray-800">{f.label}</span>
                      <span className="text-xs text-gray-400">{f.preview}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Layout tab ───────────────────────────────────────────── */}
          {tab === 'layout' && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
              <div>
                <SectionLabel>Header Style</SectionLabel>
                <div className="grid grid-cols-3 gap-3">
                  {(['minimal', 'hero', 'centered'] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => set('headerStyle', style)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                        design.headerStyle === style
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <HeaderStylePreview style={style} color={design.primaryColor} />
                      <span className="text-xs font-medium text-gray-700 capitalize">{style}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel>Features</SectionLabel>
                <div className="space-y-3">
                  {(
                    [
                      { key: 'showSearch', label: 'Show search bar' },
                      { key: 'showCategoryTabs', label: 'Show category tab strip' },
                    ] as const
                  ).map(({ key, label }) => (
                    <label key={key} className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-gray-700">{label}</span>
                      <div
                        onClick={() => set(key, !design[key])}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          design[key] ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            design[key] ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Sections tab ─────────────────────────────────────────── */}
          {tab === 'sections' && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <p className="text-sm text-gray-500 mb-4">
                Drag to reorder sections. Toggle visibility and choose grid or list layout for each.
              </p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={design.sections.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {design.sections.map((section) => (
                      <SortableSection
                        key={section.id}
                        section={section}
                        onToggle={toggleSection}
                        onLayoutChange={changeSectionLayout}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>

        {/* ── Live preview panel ───────────────────────────────────────────── */}
        <div className="hidden xl:block">
          <div className="sticky top-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Preview
            </p>
            <div
              className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm"
              style={{ background: design.backgroundColor }}
            >
              <MenuPreview design={design} />
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </AdminLayout>
  );
}

// ─── Header style preview icons ───────────────────────────────────────────────
function HeaderStylePreview({ style, color }: { style: string; color: string }) {
  if (style === 'minimal') {
    return (
      <div className="w-full h-10 bg-white rounded border border-gray-100 flex items-center px-2 gap-1.5">
        <div className="w-4 h-4 rounded" style={{ background: color }} />
        <div className="flex-1 h-1.5 bg-gray-100 rounded" />
      </div>
    );
  }
  if (style === 'hero') {
    return (
      <div className="w-full h-10 rounded overflow-hidden" style={{ background: color }}>
        <div className="flex flex-col items-center justify-center h-full gap-0.5">
          <div className="w-6 h-1 bg-white/70 rounded" />
          <div className="w-4 h-0.5 bg-white/40 rounded" />
        </div>
      </div>
    );
  }
  return (
    <div className="w-full h-10 bg-white rounded border border-gray-100 flex flex-col items-center justify-center gap-0.5">
      <div className="w-4 h-4 rounded-full" style={{ background: color }} />
      <div className="w-8 h-1 bg-gray-100 rounded" />
    </div>
  );
}

// ─── Mini preview of the new menu ─────────────────────────────────────────────
function MenuPreview({ design }: { design: MenuDesignData }) {
  const { primaryColor, backgroundColor, surfaceColor, textColor, textMutedColor, headerStyle } = design;

  return (
    <div style={{ background: backgroundColor, minHeight: '480px', fontFamily: 'inherit' }}>
      {/* Header */}
      {headerStyle === 'hero' ? (
        <div
          className="relative flex flex-col items-center justify-center py-8 px-4 text-center"
          style={{ background: primaryColor }}
        >
          {design.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={design.logo} alt="logo" className="w-10 h-10 object-contain rounded-lg mb-2" />
          )}
          <p className="text-white font-bold text-sm leading-tight">
            {design.restaurantName || 'Restaurant Name'}
          </p>
          {design.tagline && <p className="text-white/70 text-xs mt-0.5">{design.tagline}</p>}
        </div>
      ) : headerStyle === 'centered' ? (
        <div className="flex flex-col items-center py-4 px-4" style={{ background: surfaceColor }}>
          {design.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={design.logo} alt="logo" className="w-8 h-8 object-contain rounded mb-1" />
          )}
          <p className="font-bold text-xs" style={{ color: textColor }}>
            {design.restaurantName || 'Restaurant Name'}
          </p>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ background: surfaceColor, borderColor: '#EBEBEB' }}
        >
          {design.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={design.logo} alt="logo" className="w-6 h-6 object-contain rounded" />
          )}
          <span className="font-bold text-xs" style={{ color: textColor }}>
            {design.restaurantName || 'Restaurant Name'}
          </span>
        </div>
      )}

      {/* Search bar preview */}
      {design.showSearch && (
        <div className="px-3 pt-3">
          <div
            className="rounded-lg px-3 py-1.5 text-xs"
            style={{ background: surfaceColor, color: textMutedColor, border: '1px solid #E8E8E8' }}
          >
            Search menu…
          </div>
        </div>
      )}

      {/* Category tabs preview */}
      {design.showCategoryTabs && (
        <div className="flex gap-2 px-3 pt-2 overflow-hidden">
          {['All', 'Burgers', 'Drinks'].map((c, i) => (
            <div
              key={c}
              className="text-xs px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0"
              style={
                i === 0
                  ? { background: primaryColor, color: '#fff' }
                  : { background: surfaceColor, color: textMutedColor }
              }
            >
              {c}
            </div>
          ))}
        </div>
      )}

      {/* Sections preview */}
      <div className="px-3 pt-3 space-y-3">
        {design.sections
          .filter((s) => s.visible)
          .slice(0, 3)
          .map((s) => (
            <div key={s.id}>
              <p className="text-xs font-semibold mb-1.5" style={{ color: textColor }}>
                {s.label}
              </p>
              {s.layout === 'grid' ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {[1, 2].map((n) => (
                    <div
                      key={n}
                      className="rounded-lg overflow-hidden"
                      style={{ background: surfaceColor, border: '1px solid #EBEBEB' }}
                    >
                      <div className="h-10 bg-gray-100" />
                      <div className="p-1.5">
                        <div className="h-2 w-3/4 rounded bg-gray-100 mb-1" />
                        <div className="h-1.5 w-1/2 rounded" style={{ background: primaryColor + '33' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {[1, 2].map((n) => (
                    <div
                      key={n}
                      className="flex items-center gap-2 rounded-lg p-2"
                      style={{ background: surfaceColor, border: '1px solid #EBEBEB' }}
                    >
                      <div className="w-8 h-8 rounded bg-gray-100 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="h-2 w-2/3 rounded bg-gray-100 mb-1" />
                        <div className="h-1.5 w-1/3 rounded" style={{ background: primaryColor + '33' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Footer */}
      {design.footerText && (
        <p className="text-center text-xs px-4 py-3 mt-2" style={{ color: textMutedColor }}>
          {design.footerText}
        </p>
      )}
    </div>
  );
}
