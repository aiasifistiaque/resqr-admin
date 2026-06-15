'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Upload, Link, ImageIcon, Check, Loader2 } from 'lucide-react';
import { uploadImage, getUploadedImages } from '@/lib/api';

type Tab = 'library' | 'upload' | 'url';

interface UploadedFile {
  _id: string;
  url: string;
  name: string;
  type: string;
}

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImagePicker({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50 transition-colors overflow-hidden flex items-center justify-center"
        >
          {value ? (
            <>
              <Image src={value} alt="preview" fill className="object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium transition-opacity">Change</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-indigo-500 transition-colors">
              <ImageIcon size={20} />
              <span className="text-xs font-medium">Add image</span>
            </div>
          )}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="mt-1 text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      {open && (
        <ImagePickerModal
          current={value}
          onSelect={(url) => { onChange(url); setOpen(false); }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ImagePickerModal({
  current,
  onSelect,
  onClose,
}: {
  current: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('library');
  const [selected, setSelected] = useState(current);
  const [library, setLibrary] = useState<UploadedFile[]>([]);
  const [libLoading, setLibLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    getUploadedImages()
      .then(({ data }) => setLibrary(data.doc.filter((f) => f.type?.startsWith('image'))))
      .catch(() => {})
      .finally(() => setLibLoading(false));
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const { data } = await uploadImage(file);
      onSelect(data.data.url);
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleInsert = () => {
    if (tab === 'url') {
      const url = urlInput.trim();
      if (url) onSelect(url);
    } else if (selected) {
      onSelect(selected);
    }
  };

  const canInsert = tab === 'url' ? urlInput.trim().length > 0 : !!selected;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'library', label: 'Library', icon: <ImageIcon size={14} /> },
    { id: 'upload', label: 'Upload', icon: <Upload size={14} /> },
    { id: 'url', label: 'Paste URL', icon: <Link size={14} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Insert Image</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {tab === 'library' && (
            <>
              {libLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-indigo-500" />
                </div>
              ) : library.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <ImageIcon size={32} className="mb-2" />
                  <p className="text-sm">No images uploaded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                  {library.map((file) => (
                    <button
                      key={file._id}
                      type="button"
                      onClick={() => setSelected(file.url)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selected === file.url
                          ? 'border-indigo-500 ring-2 ring-indigo-200'
                          : 'border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <Image
                        src={file.url}
                        alt={file.name}
                        fill
                        className="object-cover"
                        sizes="120px"
                      />
                      {selected === file.url && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                          <Check size={11} stroke="white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-3 text-indigo-600">
                  <Loader2 size={32} className="animate-spin" />
                  <p className="text-sm font-medium">Uploading…</p>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex flex-col items-center gap-3 w-full max-w-xs border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-xl py-10 transition-colors text-gray-400 hover:text-indigo-500"
                  >
                    <Upload size={28} />
                    <span className="text-sm font-medium">Click to choose a file</span>
                    <span className="text-xs text-gray-400">PNG, JPG, WEBP — max 10 MB</span>
                  </button>
                  {uploadError && (
                    <p className="text-sm text-red-500">{uploadError}</p>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'url' && (
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {urlInput.trim() && (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                  <Image src={urlInput.trim()} alt="preview" fill className="object-cover" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — not shown on upload tab (it auto-closes) */}
        {tab !== 'upload' && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInsert}
              disabled={!canInsert}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              Insert Image
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
