'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2, ImageIcon, X } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import { getCollections, createCollection, updateCollection, deleteCollection, getItems } from '@/lib/api';
import ImagePicker from '@/components/ui/ImagePicker';
import Pagination from '@/components/ui/Pagination';
import type { Collection, Item } from '@/lib/types';

interface ToastState { message: string; type: 'success' | 'error' }

const emptyForm = {
  name: '',
  description: '',
  image: '',
  priority: 0,
  isActive: true,
  displayInMenu: true,
  items: [] as string[],
};

const PAGE_LIMIT = 20;

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Collection | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [itemSearch, setItemSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const [colRes, itemRes] = await Promise.all([
        getCollections(page, PAGE_LIMIT),
        getItems(1, 100),
      ]);
      setCollections(colRes.data.doc || []);
      setTotalDocs(colRes.data.totalDocs || 0);
      setTotalPages(colRes.data.totalPages || 1);
      setAllItems(itemRes.data.doc || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm(emptyForm);
    setItemSearch('');
    setModal('create');
  };

  const openEdit = (col: Collection) => {
    setSelected(col);
    setForm({
      name: col.name,
      description: col.description || '',
      image: col.image || '',
      priority: col.priority,
      isActive: col.isActive,
      displayInMenu: col.displayInMenu,
      items: col.items || [],
    });
    setItemSearch('');
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setSelected(null); };

  const toggleItem = (id: string) => {
    setForm((f) => ({
      ...f,
      items: f.items.includes(id) ? f.items.filter((x) => x !== id) : [...f.items, id],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (modal === 'create') {
        await createCollection(form);
        setToast({ message: 'Collection created', type: 'success' });
      } else if (selected) {
        await updateCollection(selected._id, form);
        setToast({ message: 'Collection updated', type: 'success' });
      }
      closeModal();
      load();
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Failed to save', type: 'error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this collection?')) return;
    try {
      await deleteCollection(id);
      setToast({ message: 'Collection deleted', type: 'success' });
      load();
    } catch { setToast({ message: 'Failed to delete', type: 'error' }); }
  };

  const toggleVisibility = async (col: Collection, field: 'isActive' | 'displayInMenu') => {
    try {
      await updateCollection(col._id, { [field]: !col[field] });
      setCollections((prev) =>
        prev.map((x) => x._id === col._id ? { ...x, [field]: !col[field] } : x)
      );
    } catch { setToast({ message: 'Failed to update', type: 'error' }); }
  };

  const filteredItems = allItems.filter((i) =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const fieldCls = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Collections</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalDocs} total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={16} /> Add Collection
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Collection</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Items</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Priority</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">In Menu</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {collections.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">No collections yet</td>
                </tr>
              ) : collections.map((col) => (
                <tr key={col._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                        {col.image ? (
                          <Image src={col.image} alt={col.name} width={36} height={36} className="object-cover w-full h-full" />
                        ) : (
                          <ImageIcon size={16} className="text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{col.name}</p>
                        {col.description && (
                          <p className="text-xs text-gray-400 truncate max-w-xs">{col.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{col.items?.length ?? 0}</td>
                  <td className="px-4 py-3 text-gray-600">{col.priority}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleVisibility(col, 'displayInMenu')}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${col.displayInMenu ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {col.displayInMenu ? 'Visible' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleVisibility(col, 'isActive')}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${col.isActive ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                    >
                      {col.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(col)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(col._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} totalDocs={totalDocs} limit={PAGE_LIMIT} onPage={setPage} />
        </>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'Add Collection' : 'Edit Collection'} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Most Popular"
                className={fieldCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Short description shown on menu"
                className={`${fieldCls} resize-none`}
              />
            </div>

            <ImagePicker
              label="Image"
              value={form.image}
              onChange={(url) => setForm((f) => ({ ...f, image: url }))}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                  min={0}
                  className={fieldCls}
                />
              </div>
              <div className="space-y-2 pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.displayInMenu} onChange={(e) => setForm({ ...form, displayInMenu: e.target.checked })} className="rounded" />
                  <span className="text-sm text-gray-700">Show in menu</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>

            {/* Item multi-select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Items ({form.items.length} selected)
              </label>

              {/* Selected chips */}
              {form.items.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.items.map((id) => {
                    const it = allItems.find((x) => x._id === id);
                    if (!it) return null;
                    return (
                      <span key={id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium">
                        {it.name}
                        <button type="button" onClick={() => toggleItem(id)} className="hover:text-indigo-900">
                          <X size={11} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search items…"
                className={`${fieldCls} mb-2`}
              />

              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-50">
                {filteredItems.length === 0 ? (
                  <p className="text-sm text-gray-400 px-3 py-3 text-center">No items found</p>
                ) : filteredItems.map((it) => {
                  const sel = form.items.includes(it._id);
                  return (
                    <button
                      key={it._id}
                      type="button"
                      onClick={() => toggleItem(it._id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors text-sm ${sel ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${sel ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                        {sel && <svg viewBox="0 0 10 8" fill="none" width="8" height="8"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </div>
                      <span className={`flex-1 font-medium ${sel ? 'text-indigo-700' : 'text-gray-700'}`}>{it.name}</span>
                      {it.price > 0 && <span className="text-xs text-gray-400">৳{it.price}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </AdminLayout>
  );
}
