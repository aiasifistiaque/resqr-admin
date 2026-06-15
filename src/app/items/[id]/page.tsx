'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import AdminLayout from '@/components/AdminLayout';
import ItemForm from '@/components/ItemForm';
import { getItemById } from '@/lib/api';
import type { Item } from '@/lib/types';

export default function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getItemById(id)
      .then(({ data }) => setItem(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Edit Item</h1>
        <p className="text-sm text-gray-500 mt-0.5">{item?.name || '…'}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : item ? (
        <ItemForm item={item} />
      ) : (
        <p className="text-gray-500">Item not found.</p>
      )}
    </AdminLayout>
  );
}
