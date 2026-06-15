import axios from 'axios';

const TOKEN_KEY = 'MINT_CAFE_TOKEN_TWO';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export const api = axios.create({ baseURL: `${API_URL}/api` });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = token;
  return config;
});

// Auth
export const login = (email: string, password: string) =>
  api.post<{ token: string }>('/auth/login', { email, password });

// Categories
export const getCategories = (page = 1, limit = 20) =>
  api.get('/categories', { params: { page, limit } });

export const createCategory = (data: object) => api.post('/categories', data);
export const updateCategory = (id: string, data: object) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id: string) => api.delete(`/categories/${id}`);

// Items
export const getItems = (page = 1, limit = 20, search?: string) =>
  api.get('/items', { params: { page, limit, ...(search ? { search } : {}) } });

export const getItemById = (id: string) => api.get(`/items/${id}`);
export const createItem = (data: object) => api.post('/items', data);
export const updateItem = (id: string, data: object) => api.put(`/items/${id}`, data);
export const deleteItem = (id: string) => api.delete(`/items/${id}`);

// FAQs
export const getFaqs = (itemId?: string, page = 1, limit = 20) =>
  api.get('/faqs', { params: { page, limit, ...(itemId ? { item: itemId } : {}) } });

export const createFaq = (data: object) => api.post('/faqs', data);
export const updateFaq = (id: string, data: object) => api.put(`/faqs/${id}`, data);
export const deleteFaq = (id: string) => api.delete(`/faqs/${id}`);

// Collections
export const getCollections = (page = 1, limit = 20) =>
  api.get('/collections', { params: { page, limit } });

// Feedback
export const getFeedbackList = (page = 1, limit = 20, sort = '-createdAt') =>
  api.get('/feedback', { params: { page, limit, sort } });

export const deleteFeedback = (id: string) => api.delete(`/feedback/${id}`);

export const createCollection = (data: object) => api.post('/collections', data);
export const updateCollection = (id: string, data: object) => api.put(`/collections/${id}`, data);
export const deleteCollection = (id: string) => api.delete(`/collections/${id}`);

// Upload
export const uploadImage = (file: globalThis.File) => {
  const form = new FormData();
  form.append('image', file);
  return api.post<{ data: { url: string } }>('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getUploadedImages = () =>
  api.get<{ doc: { _id: string; url: string; name: string; type: string }[] }>('/upload');

// Menu Design
export interface MenuSection {
  id: string;
  type: string;
  label: string;
  visible: boolean;
  layout: 'grid' | 'list';
}

export interface MenuDesignData {
  restaurantName: string;
  tagline: string;
  logo: string;
  bannerImage: string;
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  textMutedColor: string;
  fontFamily: 'inter' | 'playfair' | 'poppins' | 'raleway' | 'lato';
  headerStyle: 'minimal' | 'hero' | 'centered';
  showSearch: boolean;
  showCategoryTabs: boolean;
  sections: MenuSection[];
  footerText: string;
}

export const getMenuDesign = () =>
  api.get<{ data: MenuDesignData }>('/menu-design');

export const saveMenuDesign = (data: Partial<MenuDesignData>) =>
  api.put<{ data: MenuDesignData }>('/menu-design', data);
