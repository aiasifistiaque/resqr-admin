'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2, ImageIcon } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import Pagination from '@/components/ui/Pagination';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/lib/api';
import ImagePicker from '@/components/ui/ImagePicker';
import type { Category } from '@/lib/types';

interface Toast { message: string; type: 'success' | 'error' }

const empty = { name: '', description: '', image: '', priority: 0, displayInMenu: true, isActive: true };

const PAGE_LIMIT = 20;

export default function CategoriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Category | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await getCategories(page, PAGE_LIMIT);
      setCats(data.doc || []);
      setTotalDocs(data.totalDocs || 0);
      setTotalPages(data.totalPages || 1);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(empty); setModal('create'); };
  const openEdit = (c: Category) => {
    setSelected(c);
    setForm({ name: c.name, description: c.description || '', image: c.image || '', priority: c.priority, displayInMenu: c.displayInMenu, isActive: c.isActive });
    setModal('edit');
  };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (modal === 'create') {
        await createCategory(form);
        setToast({ message: 'Category created', type: 'success' });
      } else if (selected) {
        await updateCategory(selected._id, form);
        setToast({ message: 'Category updated', type: 'success' });
      }
      closeModal();
      load();
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Failed to save', type: 'error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await deleteCategory(id);
      setToast({ message: 'Category deleted', type: 'success' });
      load();
    } catch { setToast({ message: 'Failed to delete', type: 'error' }); }
  };

  const toggleVisibility = async (c: Category, field: 'isActive' | 'displayInMenu') => {
    try {
      await updateCategory(c._id, { [field]: !c[field] });
      setCats((prev) => prev.map((x) => x._id === c._id ? { ...x, [field]: !c[field] } : x));
    } catch { setToast({ message: 'Failed to update', type: 'error' }); }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalDocs} total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={16} /> Add Category
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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Display in Menu</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Priority</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">No categories yet</td>
                </tr>
              ) : cats.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                        {c.image ? (
                          <Image src={c.image} alt={c.name} width={36} height={36} className="object-cover w-full h-full" />
                        ) : (
                          <ImageIcon size={16} className="text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{c.name}</p>
                        {c.description && <p className="text-xs text-gray-400 truncate max-w-xs">{c.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleVisibility(c, 'displayInMenu')}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${c.displayInMenu ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {c.displayInMenu ? 'Visible' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.priority}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleVisibility(c, 'isActive')}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${c.isActive ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(c._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
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
        <Modal title={modal === 'create' ? 'Add Category' : 'Edit Category'} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Main Course"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Optional description"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
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
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-2 pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.displayInMenu} onChange={(e) => setForm({ ...form, displayInMenu: e.target.checked })} className="rounded" />
                  <span className="text-sm text-gray-700">Display in menu</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Cancel</button>
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
