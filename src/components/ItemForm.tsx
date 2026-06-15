'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { getCategories, createItem, updateItem, uploadImage } from '@/lib/api';
import Toast from '@/components/ui/Toast';
import type { Category, Item } from '@/lib/types';

interface Props {
  item?: Item;
}

interface ToastState { message: string; type: 'success' | 'error' }

export default function ItemForm({ item }: Props) {
  const router = useRouter();
  const [cats, setCats] = useState<Category[]>([]);
  const [form, setForm] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price ?? 0,
    image: item?.image || '',
    status: item?.status || 'draft',
    categories: (item?.categories as string[]) || [],
    sizes: item?.sizes || [] as string[],
    colors: item?.colors || [] as string[],
    ingredients: item?.ingredients || [] as string[],
    priority: item?.priority ?? 0,
  });
  const [sizeInput, setSizeInput] = useState('');
  const [colorInput, setColorInput] = useState('');
  const [ingredientInput, setIngredientInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    getCategories().then(({ data }) => setCats(data.doc || [])).catch(() => {});
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await uploadImage(file);
      setForm((f) => ({ ...f, image: data.data.url }));
    } catch { setToast({ message: 'Image upload failed', type: 'error' }); }
    finally { setUploading(false); }
  };

  const toggleCategory = (id: string) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(id)
        ? f.categories.filter((c) => c !== id)
        : [...f.categories, id],
    }));
  };

  const addTag = (field: 'sizes' | 'colors' | 'ingredients', value: string) => {
    const v = value.trim();
    if (!v) return;
    setForm((f) => ({ ...f, [field]: [...f[field], v] }));
    if (field === 'sizes') setSizeInput('');
    else if (field === 'colors') setColorInput('');
    else setIngredientInput('');
  };

  const removeTag = (field: 'sizes' | 'colors' | 'ingredients', val: string) =>
    setForm((f) => ({ ...f, [field]: f[field].filter((x: string) => x !== val) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (item) {
        await updateItem(item._id, form);
        setToast({ message: 'Item updated', type: 'success' });
      } else {
        await createItem(form);
        setToast({ message: 'Item created', type: 'success' });
        setTimeout(() => router.push('/items'), 1000);
      }
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Failed to save', type: 'error' });
    } finally { setSaving(false); }
  };

  const field = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Basic Info</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Item name" required className={field} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe the dish…" className={`${field} resize-none`} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (৳)</label>
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} min={0} className={field} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Item['status'] })} className={field}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} min={0} placeholder="0 = highest" className={`${field} w-32`} />
          <p className="text-xs text-gray-400 mt-1">Lower number appears first in the menu</p>
        </div>
      </div>

      {/* Image */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Image</h2>
        {form.image && (
          <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-gray-200">
            <Image src={form.image} alt="preview" fill className="object-cover" />
          </div>
        )}
        <input type="file" accept="image/*" onChange={handleImageUpload}
          className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
        {uploading && <p className="text-xs text-indigo-600">Uploading…</p>}
      </div>

      {/* Categories */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">Categories</h2>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => {
            const sel = form.categories.includes(c._id);
            return (
              <button
                key={c._id}
                type="button"
                onClick={() => toggleCategory(c._id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  sel ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {c.name}
              </button>
            );
          })}
          {cats.length === 0 && <p className="text-sm text-gray-400">No categories available</p>}
        </div>
      </div>

      {/* Sizes & Colors */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Options</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sizes</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.sizes.map((s) => (
              <span key={s} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-sm text-gray-700">
                {s}
                <button type="button" onClick={() => removeTag('sizes', s)}><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={sizeInput} onChange={(e) => setSizeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('sizes', sizeInput))}
              placeholder="e.g. Small, Medium, Large" className={`${field} flex-1`} />
            <button type="button" onClick={() => addTag('sizes', sizeInput)}
              className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
              Add
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Colors / Options</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.colors.map((c) => (
              <span key={c} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-sm text-gray-700">
                {c}
                <button type="button" onClick={() => removeTag('colors', c)}><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={colorInput} onChange={(e) => setColorInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('colors', colorInput))}
              placeholder="e.g. Mild, Spicy" className={`${field} flex-1`} />
            <button type="button" onClick={() => addTag('colors', colorInput)}
              className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Ingredients */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">Ingredients</h2>
        <div className="flex flex-wrap gap-2 mb-2">
          {form.ingredients.map((ing) => (
            <span key={ing} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-sm text-gray-700">
              {ing}
              <button type="button" onClick={() => removeTag('ingredients', ing)}><X size={12} /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={ingredientInput} onChange={(e) => setIngredientInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('ingredients', ingredientInput))}
            placeholder="e.g. Beef Patty, Cheddar, Brioche Bun" className={`${field} flex-1`} />
          <button type="button" onClick={() => addTag('ingredients', ingredientInput)}
            className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
            Add
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => router.push('/items')}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
          ← Back to items
        </button>
        <button type="submit" disabled={saving || !form.name.trim()}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors">
          {saving ? 'Saving…' : item ? 'Save Changes' : 'Create Item'}
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </form>
  );
}
