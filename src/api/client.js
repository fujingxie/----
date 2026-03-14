const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error || '请求失败，请稍后重试');
  }

  return data;
}

export const loginUser = (payload) =>
  request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const fetchBootstrap = ({ userId, classId }) => {
  const params = new URLSearchParams({ userId: String(userId) });

  if (classId) {
    params.set('classId', String(classId));
  }

  return request(`/bootstrap?${params.toString()}`);
};

export const createClass = ({ userId, name }) =>
  request('/classes', {
    method: 'POST',
    body: JSON.stringify({ userId, name }),
  });

export const updateClass = ({ userId, classId, name }) =>
  request(`/classes/${classId}`, {
    method: 'PATCH',
    body: JSON.stringify({ userId, name }),
  });

export const importStudents = ({ userId, classId, names }) =>
  request(`/classes/${classId}/students/import`, {
    method: 'POST',
    body: JSON.stringify({ userId, names }),
  });

export const createStudent = ({ userId, classId, name }) =>
  request(`/classes/${classId}/students`, {
    method: 'POST',
    body: JSON.stringify({ userId, name }),
  });

export const updateStudent = ({ userId, classId, studentId, updates, actionType, detail }) =>
  request(`/students/${studentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ userId, classId, updates, actionType, detail }),
  });

export const createShopItem = ({ userId, classId, item }) =>
  request(`/classes/${classId}/shop-items`, {
    method: 'POST',
    body: JSON.stringify({ userId, item }),
  });

export const redeemShopItem = ({ userId, classId, itemId, studentIds }) =>
  request(`/shop-items/${itemId}/redeem`, {
    method: 'POST',
    body: JSON.stringify({ userId, classId, studentIds }),
  });

export const createRule = ({ userId, classId, rule }) =>
  request(`/classes/${classId}/rules`, {
    method: 'POST',
    body: JSON.stringify({ userId, rule }),
  });

export const deleteRule = ({ userId, classId, ruleId }) =>
  request(`/rules/${ruleId}`, {
    method: 'DELETE',
    body: JSON.stringify({ userId, classId }),
  });

export const updateThresholds = ({ userId, classId, thresholds }) =>
  request(`/classes/${classId}/settings/thresholds`, {
    method: 'PUT',
    body: JSON.stringify({ userId, thresholds }),
  });
