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

export const fetchFreeRegisterConfig = () =>
  request('/public/system-flags/free-register');

export const fetchPublicRegisterChannel = ({ code }) =>
  request(`/public/register-channel?${new URLSearchParams({ code: String(code || '') }).toString()}`);

export const updatePassword = ({ userId, currentPassword, nextPassword }) =>
  request('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ userId, currentPassword, nextPassword }),
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

export const deleteStudentsBatch = ({ userId, classId, studentIds }) =>
  request(`/classes/${classId}/students/batch-delete`, {
    method: 'POST',
    body: JSON.stringify({ userId, studentIds }),
  });

export const updateStudent = ({ userId, classId, studentId, updates, actionType, detail, undoMeta, studentLog }) =>
  request(`/students/${studentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ userId, classId, updates, actionType, detail, undoMeta, studentLog }),
  });

export const feedStudent = ({ userId, classId, studentId }) =>
  request(`/students/${studentId}/feed`, {
    method: 'POST',
    body: JSON.stringify({ userId, classId }),
  });

export const feedStudentsBatch = ({ userId, classId, studentIds, rule = null, dailyBulkFeed = false }) =>
  request(`/classes/${classId}/students/feed`, {
    method: 'POST',
    body: JSON.stringify({ userId, studentIds, rule, dailyBulkFeed }),
  });

export const fetchStudentLogs = ({ classId, studentId, limit = 30, offset = 0 }) =>
  request(`/classes/${classId}/students/${studentId}/logs?limit=${limit}&offset=${offset}`, {
    method: 'GET',
  });

export const fetchProgressRanking = ({ classId, start, end, limit = 10 }) => {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  if (start) {
    params.set('start', start);
  }

  if (end) {
    params.set('end', end);
  }

  return request(`/classes/${classId}/progress-ranking?${params.toString()}`, {
    method: 'GET',
  });
};

export const createShopItem = ({ userId, classId, item }) =>
  request(`/classes/${classId}/shop-items`, {
    method: 'POST',
    body: JSON.stringify({ userId, item }),
  });

export const updateShopItem = ({ userId, classId, itemId, item }) =>
  request(`/shop-items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ userId, classId, item }),
  });

export const deleteShopItem = ({ userId, classId, itemId }) =>
  request(`/shop-items/${itemId}`, {
    method: 'DELETE',
    body: JSON.stringify({ userId, classId }),
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

export const updateRule = ({ userId, classId, ruleId, rule }) =>
  request(`/rules/${ruleId}`, {
    method: 'PATCH',
    body: JSON.stringify({ userId, classId, rule }),
  });

export const deleteRule = ({ userId, classId, ruleId }) =>
  request(`/rules/${ruleId}`, {
    method: 'DELETE',
    body: JSON.stringify({ userId, classId }),
  });

export const moveRule = ({ userId, classId, ruleId, direction }) =>
  request(`/rules/${ruleId}/move`, {
    method: 'POST',
    body: JSON.stringify({ userId, classId, direction }),
  });

export const importRules = ({ userId, classId, sourceClassId, mode }) =>
  request(`/classes/${classId}/rules/import`, {
    method: 'POST',
    body: JSON.stringify({ userId, sourceClassId, mode }),
  });

export const updateThresholds = ({ userId, classId, thresholds, petConditionConfig }) =>
  request(`/classes/${classId}/settings/thresholds`, {
    method: 'PUT',
    body: JSON.stringify({ userId, thresholds, petConditionConfig }),
  });

export const updateSmartSeatingConfig = ({ userId, classId, config }) =>
  request(`/classes/${classId}/settings/smart-seating`, {
    method: 'PUT',
    body: JSON.stringify({ userId, config }),
  });

export const resetClassProgress = ({ userId, classId }) =>
  request(`/classes/${classId}/reset-progress`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });

export const archiveClassStudents = ({ userId, classId }) =>
  request(`/classes/${classId}/archive-students`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });

export const undoLog = ({ userId, classId, logId }) =>
  request(`/logs/${logId}/undo`, {
    method: 'POST',
    body: JSON.stringify({ userId, classId }),
  });

export const fetchAdminUsers = ({ userId }) =>
  request(`/admin/users?${new URLSearchParams({ userId: String(userId) }).toString()}`);

export const fetchAdminLogs = ({ userId }) =>
  request(`/admin/logs?${new URLSearchParams({ userId: String(userId) }).toString()}`);

export const fetchAdminRegisterChannels = ({ userId }) =>
  request(`/admin/register-channels?${new URLSearchParams({ userId: String(userId) }).toString()}`);

export const updateFreeRegisterConfig = ({ userId, enabled, mode, end_at, default_level }) =>
  request('/admin/system-flags/free-register', {
    method: 'PUT',
    body: JSON.stringify({ userId, enabled, mode, end_at, default_level }),
  });

export const updateToolboxAccessConfig = ({ userId, config }) =>
  request('/admin/system-flags/toolbox-access', {
    method: 'PUT',
    body: JSON.stringify({ userId, config }),
  });

export const createAdminRegisterChannel = ({ userId, channel }) =>
  request('/admin/register-channels', {
    method: 'POST',
    body: JSON.stringify({ userId, ...channel }),
  });

export const updateAdminRegisterChannel = ({ userId, channelId, channel }) =>
  request(`/admin/register-channels/${channelId}`, {
    method: 'PATCH',
    body: JSON.stringify({ userId, ...channel }),
  });

export const updateAdminUser = ({ userId, targetUserId, updates }) =>
  request(`/admin/users/${targetUserId}`, {
    method: 'PATCH',
    body: JSON.stringify({ userId, updates }),
  });

export const updateAdminUsersBatch = ({ userId, userIds, updates }) =>
  request('/admin/users/batch-update', {
    method: 'POST',
    body: JSON.stringify({ userId, userIds, updates }),
  });

export const resetAdminUserPassword = ({ userId, targetUserId, nextPassword }) =>
  request(`/admin/users/${targetUserId}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ userId, nextPassword }),
  });

export const fetchAdminCodes = ({ userId }) =>
  request(`/admin/codes?${new URLSearchParams({ userId: String(userId) }).toString()}`);

export const createAdminCode = ({ userId, code, prefix, level, expires_in_days, max_uses }) =>
  request('/admin/codes', {
    method: 'POST',
    body: JSON.stringify({ userId, code, prefix, level, expires_in_days, max_uses }),
  });

export const createAdminCodesBatch = ({ userId, prefix, level, expires_in_days, max_uses, count }) =>
  request('/admin/codes/batch', {
    method: 'POST',
    body: JSON.stringify({ userId, prefix, level, expires_in_days, max_uses, count }),
  });

export const revokeAdminCodesBatch = ({ userId, codeIds }) =>
  request('/admin/codes/batch-revoke', {
    method: 'POST',
    body: JSON.stringify({ userId, codeIds }),
  });

export const updateAdminCodesBatch = ({ userId, codeIds, updates }) =>
  request('/admin/codes/batch-update', {
    method: 'POST',
    body: JSON.stringify({ userId, codeIds, updates }),
  });

export const updateAdminCode = ({ userId, codeId, updates }) =>
  request(`/admin/codes/${codeId}`, {
    method: 'PATCH',
    body: JSON.stringify({ userId, updates }),
  });
