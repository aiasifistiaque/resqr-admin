'use client';

import AdminLayout from '@/components/AdminLayout';
import ItemForm from '@/components/ItemForm';

export default function NewItemPage() {
  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Add Item</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create a new menu item</p>
      </div>
      <ItemForm />
    </AdminLayout>
  );
}
