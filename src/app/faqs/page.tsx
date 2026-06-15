'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import { getFaqs, createFaq, updateFaq, deleteFaq, getItems } from '@/lib/api';
import Pagination from '@/components/ui/Pagination';
import type { Faq, Item } from '@/lib/types';

interface ToastState { message: string; type: 'success' | 'error' }

const empty = { item: '', question: '', answer: '', order: 0, isActive: true };

const PAGE_LIMIT = 20;

export default function FaqsPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [filterItem, setFilterItem] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Faq | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const loadItems = useCallback(async () => {
    try {
      const { data } = await getItems(1, 200);
      setItems(data.doc || []);
    } catch { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getFaqs(filterItem || undefined, page, PAGE_LIMIT);
      setFaqs(data.doc || []);
      setTotalDocs(data.totalDocs || 0);
      setTotalPages(data.totalPages || 1);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filterItem, page]);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ ...empty, item: filterItem }); setModal('create'); };
  const openEdit = (faq: Faq) => {
    setSelected(faq);
    const itemId = typeof faq.item === 'string' ? faq.item : (faq.item as Item)._id;
    setForm({ item: itemId, question: faq.question, answer: faq.answer, order: faq.order, isActive: faq.isActive });
    setModal('edit');
  };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async () => {
    if (!form.item || !form.question.trim() || !form.answer.trim()) return;
    setSaving(true);
    try {
      if (modal === 'create') {
        await createFaq(form);
        setToast({ message: 'FAQ created', type: 'success' });
      } else if (selected) {
        await updateFaq(selected._id, form);
        setToast({ message: 'FAQ updated', type: 'success' });
      }
      closeModal();
      load();
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Failed to save', type: 'error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this FAQ?')) return;
    try {
      await deleteFaq(id);
      setToast({ message: 'FAQ deleted', type: 'success' });
      load();
    } catch { setToast({ message: 'Failed to delete', type: 'error' }); }
  };

  const getItemName = (faq: Faq) =>
    typeof faq.item === 'string'
      ? items.find((i) => i._id === faq.item)?.name || faq.item
      : (faq.item as Item).name;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">FAQs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalDocs} entries</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={16} /> Add FAQ
        </button>
      </div>

      {/* Filter by item */}
      <div className="mb-4 max-w-xs">
        <select
          value={filterItem}
          onChange={(e) => { setFilterItem(e.target.value); setPage(1); setLoading(true); }}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All items</option>
          {items.map((i) => (
            <option key={i._id} value={i._id}>{i.name}</option>
          ))}
        </select>
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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Item</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Question</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Answer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Order</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {faqs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">No FAQs yet</td>
                </tr>
              ) : faqs.map((faq) => (
                <tr key={faq._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{getItemName(faq)}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs">
                    <p className="truncate">{faq.question}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs">
                    <p className="truncate">{faq.answer}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{faq.order}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${faq.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {faq.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(faq)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(faq._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} totalDocs={totalDocs} limit={PAGE_LIMIT} onPage={(p) => { setPage(p); }} />
        </>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'Add FAQ' : 'Edit FAQ'} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
              <select
                value={form.item}
                onChange={(e) => setForm({ ...form, item: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select an item…</option>
                {items.map((i) => (
                  <option key={i._id} value={i._id}>{i.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
              <input
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="e.g. Is this dish spicy?"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Answer *</label>
              <textarea
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                rows={3}
                placeholder="Provide a clear answer…"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="pt-6">
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
                disabled={saving || !form.item || !form.question.trim() || !form.answer.trim()}
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
