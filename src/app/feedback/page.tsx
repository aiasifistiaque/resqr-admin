'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Trash2, Eye, Star, Sparkles, X } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import Pagination from '@/components/ui/Pagination';
import { getFeedbackList, deleteFeedback } from '@/lib/api';
import type { Feedback } from '@/lib/types';

interface ToastState { message: string; type: 'success' | 'error' }

const PAGE_LIMIT = 15;

// ── Helpers ───────────────────────────────────────────────────────────────────
function Stars({ value }: { value?: number }) {
  if (!value) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-xs leading-none ${i < value ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
      ))}
      <span className="text-xs font-semibold text-gray-500 ml-1">{value}.0</span>
    </span>
  );
}

function avg(items: Feedback[], key: keyof Feedback) {
  const vals = items.map((f) => f[key] as number).filter(Boolean);
  if (!vals.length) return null;
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(s: string) {
  return new Date(s).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function fmtFull(s: string) {
  return new Date(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Filter pill ───────────────────────────────────────────────────────────────
function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
        active
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
      }`}
    >
      {children}
    </button>
  );
}

// ── Summarize modal ───────────────────────────────────────────────────────────
function SummarizeModal({ feedbacks, onClose }: { feedbacks: Feedback[]; onClose: () => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    (async () => {
      try {
        const res = await fetch('/api/summarize-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedbacks }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) { setText('Failed to get summary.'); setLoading(false); return; }

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        let acc = '';

        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const chunk = line.slice(6);
            if (chunk === '[DONE]') break outer;
            acc += chunk;
            setText(acc);
          }
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') setText('Error getting summary.');
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, []);

  // Parse POSITIVES / NEGATIVES sections for styled output
  const posMatch = text.match(/POSITIVES:\n([\s\S]*?)(?=\nNEGATIVES:|$)/);
  const negMatch = text.match(/NEGATIVES:\n([\s\S]*?)$/);
  const posList = posMatch?.[1]?.split('\n').filter((l) => l.trim().startsWith('- ')).map((l) => l.trim().slice(2)) ?? [];
  const negList = negMatch?.[1]?.split('\n').filter((l) => l.trim().startsWith('- ')).map((l) => l.trim().slice(2)) ?? [];
  const parsed = posList.length > 0 || negList.length > 0;

  return (
    <Modal title={`AI Summary — ${feedbacks.length} responses`} onClose={onClose}>
      {loading && !text && (
        <div className="flex items-center gap-3 py-8 justify-center">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Analysing feedback…</p>
        </div>
      )}

      {(text && !parsed) && (
        <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{text}</pre>
      )}

      {parsed && (
        <div className="space-y-5">
          {posList.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-green-700 mb-2">✓ What customers love</p>
              <ul className="space-y-2">
                {posList.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-green-500 mt-0.5 shrink-0">●</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {negList.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-red-600 mb-2">✗ Areas to improve</p>
              <ul className="space-y-2">
                {negList.map((n, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-red-400 mt-0.5 shrink-0">●</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {loading && <p className="text-xs text-gray-400">Generating…</p>}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button onClick={onClose} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors">
          Close
        </button>
      </div>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FeedbackAdminPage() {
  const [list, setList] = useState<Feedback[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [sort, setSort] = useState('-createdAt');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [summarizeOpen, setSummarizeOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getFeedbackList(page, PAGE_LIMIT, sort);
      setList(data.doc || []);
      setTotalDocs(data.totalDocs || 0);
      setTotalPages(data.totalPages || 1);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, sort]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this feedback?')) return;
    try {
      await deleteFeedback(id);
      setToast({ message: 'Feedback deleted', type: 'success' });
      setList((p) => p.filter((f) => f._id !== id));
      setTotalDocs((n) => n - 1);
      if (selected?._id === id) setSelected(null);
    } catch {
      setToast({ message: 'Failed to delete', type: 'error' });
    }
  };

  const avgOverall = avg(list, 'ratingOverall');
  const avgFood = avg(list, 'ratingFood');
  const avgService = avg(list, 'ratingService');
  const avgAmbiance = avg(list, 'ratingAmbiance');
  const avgValue = avg(list, 'ratingValue');

  const FILTERS = [
    { label: 'Newest first', val: '-createdAt' },
    { label: 'Oldest first', val: 'createdAt' },
    { label: 'Highest rated', val: '-ratingOverall' },
    { label: 'Lowest rated', val: 'ratingOverall' },
    { label: 'Best food', val: '-ratingFood' },
    { label: 'Best service', val: '-ratingService' },
  ];

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Customer Feedback</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalDocs} total responses</p>
        </div>
        {list.length > 0 && (
          <button
            onClick={() => setSummarizeOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
          >
            <Sparkles size={15} />
            Summarise
          </button>
        )}
      </div>

      {/* Avg ratings bar */}
      {totalDocs > 0 && (
        <div className="grid grid-cols-5 gap-2 md:gap-3 mb-5">
          {[
            { label: 'Overall', val: avgOverall },
            { label: 'Food', val: avgFood },
            { label: 'Service', val: avgService },
            { label: 'Ambiance', val: avgAmbiance },
            { label: 'Value', val: avgValue },
          ].map(({ label, val }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 hidden sm:block">{label}</p>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 sm:hidden">{label.slice(0, 3)}</p>
              <p className="text-xl md:text-2xl font-black text-gray-900">{val ?? '—'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0">Filter</span>
        {FILTERS.map((f) => (
          <FilterPill
            key={f.val}
            active={sort === f.val}
            onClick={() => { setSort(f.val); setPage(1); }}
          >
            {f.label}
          </FilterPill>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Star size={32} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm">No feedback yet</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-225">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Customer</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Ref</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Overall</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Food</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Service</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Ambiance</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Value</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Comment</th>
                    <th className="px-4 py-3 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {list.map((fb) => (
                    <tr key={fb._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 whitespace-nowrap">
                          {fb.name || <span className="text-gray-300 font-normal italic text-xs">Anonymous</span>}
                        </p>
                        {fb.email && <p className="text-xs text-gray-400">{fb.email}</p>}
                        {fb.phone && <p className="text-xs text-gray-400">{fb.phone}</p>}
                        <div className="flex gap-1 mt-1">
                          {fb.wantsUpdatesPhone && <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-medium">SMS</span>}
                          {fb.wantsUpdatesEmail && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">Email</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                        {fb.orderRef || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm text-gray-700 font-medium">{fmtDate(fb.createdAt)}</p>
                        <p className="text-xs text-gray-400">{fmtTime(fb.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3"><Stars value={fb.ratingOverall} /></td>
                      <td className="px-4 py-3"><Stars value={fb.ratingFood} /></td>
                      <td className="px-4 py-3"><Stars value={fb.ratingService} /></td>
                      <td className="px-4 py-3"><Stars value={fb.ratingAmbiance} /></td>
                      <td className="px-4 py-3"><Stars value={fb.ratingValue} /></td>
                      <td className="px-4 py-3 max-w-50">
                        {fb.comment
                          ? <p className="text-sm text-gray-500 truncate">{fb.comment}</p>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => setSelected(fb)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors">
                            <Eye size={15} />
                          </button>
                          <button onClick={() => handleDelete(fb._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {list.map((fb) => (
              <div key={fb._id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {fb.name || <span className="text-gray-400 font-normal italic">Anonymous</span>}
                    </p>
                    {fb.email && <p className="text-xs text-gray-400">{fb.email}</p>}
                    {fb.phone && <p className="text-xs text-gray-400">{fb.phone}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500 font-medium">{fmtDate(fb.createdAt)}</p>
                    {fb.orderRef && <p className="text-xs text-gray-400 font-mono">#{fb.orderRef}</p>}
                  </div>
                </div>

                {/* Ratings grid */}
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 mb-3">
                  {[
                    { label: 'Overall', val: fb.ratingOverall },
                    { label: 'Food', val: fb.ratingFood },
                    { label: 'Service', val: fb.ratingService },
                    { label: 'Ambiance', val: fb.ratingAmbiance },
                    { label: 'Value', val: fb.ratingValue },
                  ].filter(({ val }) => val).map(({ label, val }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 w-16">{label}</span>
                      <Stars value={val} />
                    </div>
                  ))}
                </div>

                {fb.comment && (
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-3 line-clamp-2">
                    {fb.comment}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {fb.wantsUpdatesPhone && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">SMS</span>}
                    {fb.wantsUpdatesEmail && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">Email</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSelected(fb)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors">
                      <Eye size={15} />
                    </button>
                    <button onClick={() => handleDelete(fb._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} totalDocs={totalDocs} limit={PAGE_LIMIT} onPage={setPage} />
        </>
      )}

      {/* Detail modal */}
      {selected && (
        <Modal title="Feedback Details" onClose={() => setSelected(null)}>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Customer</p>
                <p className="font-semibold text-gray-900">{selected.name || 'Anonymous'}</p>
                {selected.email && <p className="text-sm text-gray-500">{selected.email}</p>}
                {selected.phone && <p className="text-sm text-gray-500">{selected.phone}</p>}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Order Ref</p>
                <p className="font-mono font-semibold text-gray-700">{selected.orderRef || '—'}</p>
                <p className="text-xs text-gray-400 mt-1">{fmtFull(selected.createdAt)}</p>
              </div>
            </div>

            {(selected.wantsUpdatesPhone || selected.wantsUpdatesEmail) && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Marketing Opt-in</p>
                <div className="flex gap-2">
                  {selected.wantsUpdatesPhone && <span className="text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">📱 SMS</span>}
                  {selected.wantsUpdatesEmail && <span className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">✉️ Email</span>}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Ratings</p>
              <div className="space-y-2">
                {([
                  { label: 'Overall', val: selected.ratingOverall },
                  { label: 'Food Quality', val: selected.ratingFood },
                  { label: 'Service', val: selected.ratingService },
                  { label: 'Ambiance', val: selected.ratingAmbiance },
                  { label: 'Value for Money', val: selected.ratingValue },
                ] as { label: string; val: number | undefined }[])
                  .filter(({ val }) => val)
                  .map(({ label, val }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 w-36">{label}</span>
                      <Stars value={val} />
                    </div>
                  ))}
              </div>
            </div>

            {selected.comment && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Comment</p>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3">{selected.comment}</p>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button
                onClick={() => handleDelete(selected._id)}
                className="px-3 py-2 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* AI Summarize modal */}
      {summarizeOpen && (
        <SummarizeModal feedbacks={list} onClose={() => setSummarizeOpen(false)} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </AdminLayout>
  );
}
