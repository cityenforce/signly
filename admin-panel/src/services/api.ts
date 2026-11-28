const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

export const getAuthToken = (): string | null => {
  return localStorage.getItem('signly_admin_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('signly_admin_token', token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem('signly_admin_token');
  localStorage.removeItem('signly_admin_user');
};

const request = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearAuthToken();
    window.dispatchEvent(new Event('auth:unauthorized'));
  }

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.message || data.error || 'API Request failed';
    throw new Error(errorMsg);
  }

  return data as T;
};

export const Api = {
  // Authentication
  async login(username: string, password: string) {
    return request<{ success: boolean; token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },

  async setupAdmin(data: { username: string; password: string; email?: string; name?: string }) {
    return request<{ success: boolean; token: string; user: any }>('/auth/setup-admin', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getMe() {
    return request<{ success: boolean; user: any }>('/auth/me');
  },

  async forgotPassword(identifier: string) {
    return request<{ success: boolean; message: string; devResetCode?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    });
  },

  async resetPassword(identifier: string, token: string, newPassword: string) {
    return request<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ identifier, token, newPassword })
    });
  },

  // Reports
  async getReports(params: Record<string, any> = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) {
        qs.append(k, String(v));
      }
    });
    return request<{ success: boolean; count: number; total: number; data: any[] }>(
      `/reports${qs.toString() ? `?${qs.toString()}` : ''}`
    );
  },

  async getReport(ref: string) {
    return request<{ success: boolean; data: any }>(`/reports/${ref}`);
  },

  async createReport(report: any) {
    return request<{ success: boolean; data: any }>('/reports', {
      method: 'POST',
      body: JSON.stringify(report)
    });
  },

  async updateReport(ref: string, payload: any) {
    return request<{ success: boolean; data: any }>(`/reports/${ref}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteReport(ref: string) {
    return request<{ success: boolean; message: string }>(`/reports/${ref}`, {
      method: 'DELETE'
    });
  },

  async getDashboardStats() {
    return request<{
      success: boolean;
      stats: {
        totalReports: number;
        suburbsCovered: number;
        areasDefined: number;
        activeOfficers: number;
      };
      breakdowns: {
        bySuburb: { name: string; count: number }[];
        byOfficer: { name: string; count: number }[];
      };
    }>('/reports/dashboard/stats');
  },

  getExportCsvUrl(params: Record<string, any> = {}) {
    const qs = new URLSearchParams();
    const token = getAuthToken();
    if (token) qs.append('token', token);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) {
        qs.append(k, String(v));
      }
    });
    return `${API_BASE}/reports/export/csv?${qs.toString()}`;
  },

  async importReports(items: any[], officer?: { name: string; no: string }) {
    return request<{ success: boolean; message: string }>('/reports/batch/import', {
      method: 'POST',
      body: JSON.stringify({ items, officer })
    });
  },

  async seedDemoData() {
    return request<{ success: boolean; message: string }>('/reports/demo/seed', {
      method: 'POST'
    });
  },

  async removeDemoData() {
    return request<{ success: boolean; message: string }>('/reports/demo/remove', {
      method: 'DELETE'
    });
  },

  // Areas
  async getAreas() {
    return request<{ success: boolean; count: number; data: any[] }>('/areas');
  },

  async createArea(data: { code: string; name: string; suburbs: string[]; poly?: any }) {
    return request<{ success: boolean; data: any }>('/areas', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateArea(code: string, data: any) {
    return request<{ success: boolean; data: any }>(`/areas/${code}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteArea(code: string) {
    return request<{ success: boolean; message: string }>(`/areas/${code}`, {
      method: 'DELETE'
    });
  },

  async getAreaCoverage() {
    return request<{ success: boolean; data: any[] }>('/areas/stats/coverage');
  },

  // Clients
  async getClients() {
    return request<{ success: boolean; count: number; data: any[] }>('/clients');
  },

  async createClient(data: { name: string; suburbs: string[]; contactEmail?: string }) {
    return request<{ success: boolean; data: any }>('/clients', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateClient(id: string, data: any) {
    return request<{ success: boolean; data: any }>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteClient(id: string) {
    return request<{ success: boolean; message: string }>(`/clients/${id}`, {
      method: 'DELETE'
    });
  },

  // Users & Officers
  async getUsers(role?: string) {
    return request<{ success: boolean; count: number; data: any[] }>(
      `/users${role ? `?role=${role}` : ''}`
    );
  },

  async createUser(data: any) {
    return request<{ success: boolean; data: any }>('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateUser(id: string, data: any) {
    return request<{ success: boolean; data: any }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteUser(id: string) {
    return request<{ success: boolean; message: string }>(`/users/${id}`, {
      method: 'DELETE'
    });
  },

  // Suburbs Registry
  async getSuburbs() {
    return request<{
      success: boolean;
      count: number;
      suburbs: string[];
      data: Record<string, string[]>;
    }>('/suburbs');
  }
};

