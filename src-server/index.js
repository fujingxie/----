const DEFAULT_LEVEL_THRESHOLDS = [10, 20, 30, 50, 70, 100];
const ACTIVATION_CODE_SEEDS = [
  { code: 'CLASS-VIP1-2026', level: 'vip1', expiresInDays: 30 },
  { code: 'CLASS-VIP2-2026', level: 'vip2', expiresInDays: 90 },
  { code: 'CLASS-PERM-2026', level: 'permanent', expiresInDays: null },
];

const SYSTEM_RULES = [
  { name: '字迹工整', icon: '✍️', exp: 2, coins: 5, type: 'positive' },
  { name: '热爱劳动', icon: '🧹', exp: 3, coins: 10, type: 'positive' },
  { name: '追跑打闹', icon: '🚫', exp: -2, coins: -5, type: 'negative' },
  { name: '未交作业', icon: '📝', exp: -5, coins: -10, type: 'negative' },
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,PATCH,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const error = (message, status = 400) => json({ error: message }, status);

const textEncoder = new TextEncoder();

const isExpired = (value) => {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value);

  return !Number.isNaN(timestamp.getTime()) && timestamp.getTime() < Date.now();
};

const parseId = (value) => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parsePetCollection = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeClass = (row) => ({
  id: Number(row.id),
  name: row.name,
  created_at: row.created_at,
});

const normalizeStudent = (row) => ({
  id: Number(row.id),
  class_id: Number(row.class_id),
  name: row.name,
  pet_status: row.pet_status,
  pet_name: row.pet_name,
  pet_type_id: row.pet_type_id,
  pet_level: Number(row.pet_level || 0),
  pet_points: Number(row.pet_points || 0),
  coins: Number(row.coins || 0),
  total_exp: Number(row.total_exp || 0),
  total_coins: Number(row.total_coins || 0),
  reward_count: Number(row.reward_count || 0),
  pet_collection: parsePetCollection(row.pet_collection),
});

const normalizeShopItem = (row) => ({
  id: Number(row.id),
  class_id: Number(row.class_id),
  name: row.name,
  icon: row.icon,
  price: Number(row.price || 0),
  stock: Number(row.stock || 0),
});

const normalizeRule = (row) => ({
  id: Number(row.id),
  name: row.name,
  icon: row.icon,
  exp: Number(row.exp || 0),
  coins: Number(row.coins || 0),
  type: row.type,
  isSystem: row.class_id === null,
});

const normalizeActivationCode = (row) => ({
  id: Number(row.id),
  code: row.code,
  level: row.level,
  expires_in_days: row.expires_in_days === null ? null : Number(row.expires_in_days),
  used_by_user_id: row.used_by_user_id === null ? null : Number(row.used_by_user_id),
  used_at: row.used_at,
});

const formatLogTime = (createdAt) => {
  const timestamp = new Date(createdAt);

  if (Number.isNaN(timestamp.getTime())) {
    return createdAt;
  }

  return timestamp.toLocaleTimeString('zh-CN', { hour12: false });
};

const parseLogMeta = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeLog = (row) => {
  const meta = parseLogMeta(row.meta);

  return {
    id: Number(row.id),
    action: row.action_type,
    detail: row.detail,
    time: formatLogTime(row.created_at),
    created_at: row.created_at,
    operator: row.operator || '系统',
    canUndo: Boolean(meta?.undoable && !meta?.undone),
    meta,
  };
};

const normalizeUser = (row) => ({
  id: Number(row.id),
  username: row.username,
  nickname: row.nickname,
  level: row.level,
  expire_at: row.expire_at,
});

async function readBody(request) {
  if (!request.body) {
    return {};
  }

  try {
    return await request.json();
  } catch {
    return {};
  }
}

function getDb(env) {
  if (!env.DB) {
    throw new Error('未检测到 D1 数据库绑定，请先配置 wrangler.toml 中的 DB');
  }

  return env.DB;
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPassword(password) {
  return sha256(`class-pets::${password}`);
}

async function verifyPassword(password, passwordHash) {
  if (!passwordHash) {
    return false;
  }

  if (passwordHash === password) {
    return true;
  }

  const hashed = await hashPassword(password);
  return hashed === passwordHash;
}

function computeExpireAt(expiresInDays) {
  if (!Number.isFinite(expiresInDays) || expiresInDays <= 0) {
    return null;
  }

  return new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
}

function validateUsername(value) {
  return /^[a-zA-Z0-9_-]{3,24}$/.test(value);
}

function validatePassword(value) {
  return typeof value === 'string' && value.length >= 6;
}

async function ensureSystemRules(db) {
  const countRow = await db.prepare('SELECT COUNT(*) AS count FROM rules WHERE class_id IS NULL').first();

  if (Number(countRow?.count || 0) > 0) {
    return;
  }

  const statements = SYSTEM_RULES.map((rule) =>
    db
      .prepare('INSERT INTO rules (class_id, name, icon, exp, coins, type) VALUES (NULL, ?, ?, ?, ?, ?)')
      .bind(rule.name, rule.icon, rule.exp, rule.coins, rule.type),
  );

  await db.batch(statements);
}

async function ensureActivationCodes(db) {
  const statements = ACTIVATION_CODE_SEEDS.map((seed) =>
    db
      .prepare('INSERT OR IGNORE INTO activation_codes (code, level, expires_in_days) VALUES (?, ?, ?)')
      .bind(seed.code, seed.level, seed.expiresInDays),
  );

  await db.batch(statements);
}

async function ensureClassSettings(db, classId) {
  const existing = await db.prepare('SELECT class_id FROM class_settings WHERE class_id = ?').bind(classId).first();

  if (existing) {
    return;
  }

  await db
    .prepare('INSERT INTO class_settings (class_id, level_thresholds) VALUES (?, ?)')
    .bind(classId, JSON.stringify(DEFAULT_LEVEL_THRESHOLDS))
    .run();
}

async function refreshMembershipIfNeeded(db, user) {
  if (!user) {
    return null;
  }

  if ((user.level === 'vip1' || user.level === 'vip2') && isExpired(user.expire_at)) {
    const refreshed = await db
      .prepare(
        `UPDATE users
         SET level = 'temporary', expire_at = NULL
         WHERE id = ?
         RETURNING id, username, nickname, level, expire_at`,
      )
      .bind(user.id)
      .first();

    return refreshed;
  }

  return user;
}

async function getUserById(db, userId) {
  const rawUser = await db
    .prepare('SELECT id, username, nickname, level, expire_at FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!rawUser) {
    throw new Error('教师账号不存在，请重新登录');
  }

  return refreshMembershipIfNeeded(db, rawUser);
}

async function getUserWithPassword(db, username) {
  const rawUser = await db
    .prepare(
      'SELECT id, username, password_hash, nickname, level, expire_at FROM users WHERE username = ?',
    )
    .bind(username)
    .first();

  if (!rawUser) {
    return null;
  }

  const refreshed = await refreshMembershipIfNeeded(db, rawUser);

  if (refreshed.password_hash) {
    return refreshed;
  }

  return {
    ...refreshed,
    password_hash: rawUser.password_hash,
  };
}

async function getClassesByUserId(db, userId) {
  const result = await db
    .prepare('SELECT id, name, created_at FROM classes WHERE user_id = ? ORDER BY created_at ASC, id ASC')
    .bind(userId)
    .all();

  return (result.results || []).map(normalizeClass);
}

async function assertClassOwnership(db, userId, classId) {
  const classRow = await db
    .prepare('SELECT id, user_id, name, created_at FROM classes WHERE id = ? AND user_id = ?')
    .bind(classId, userId)
    .first();

  if (!classRow) {
    throw new Error('未找到对应班级，或当前账号无权访问');
  }

  return classRow;
}

async function assertStudentOwnership(db, userId, studentId) {
  const student = await db
    .prepare(
      `SELECT s.*
       FROM students s
       JOIN classes c ON c.id = s.class_id
       WHERE s.id = ? AND c.user_id = ?`,
    )
    .bind(studentId, userId)
    .first();

  if (!student) {
    throw new Error('未找到对应学生，或当前账号无权访问');
  }

  return student;
}

async function getStudentsByClassId(db, classId) {
  const result = await db
    .prepare(
      `SELECT id, class_id, name, pet_status, pet_name, pet_type_id, pet_level, pet_points, coins, total_exp, total_coins
       , reward_count, pet_collection
       FROM students
       WHERE class_id = ?
       ORDER BY created_at ASC, id ASC`,
    )
    .bind(classId)
    .all();

  return (result.results || []).map(normalizeStudent);
}

async function getShopItemsByClassId(db, classId) {
  const result = await db
    .prepare(
      `SELECT id, class_id, name, icon, price, stock
       FROM shop_items
       WHERE class_id = ?
       ORDER BY created_at DESC, id DESC`,
    )
    .bind(classId)
    .all();

  return (result.results || []).map(normalizeShopItem);
}

async function getRulesByClassId(db, classId) {
  const result = await db
    .prepare(
      `SELECT id, class_id, name, icon, exp, coins, type
       FROM rules
       WHERE class_id IS NULL OR class_id = ?
       ORDER BY CASE WHEN class_id IS NULL THEN 0 ELSE 1 END ASC, created_at ASC, id ASC`,
    )
    .bind(classId)
    .all();

  return (result.results || []).map(normalizeRule);
}

async function getLogsByClassId(db, classId) {
  const result = await db
    .prepare(
      `SELECT l.id, l.action_type, l.detail, l.meta, l.created_at, u.nickname AS operator
       FROM logs l
       LEFT JOIN users u ON u.id = l.user_id
       WHERE l.class_id = ?
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT 50`,
    )
    .bind(classId)
    .all();

  return (result.results || []).map(normalizeLog);
}

async function getThresholdsByClassId(db, classId) {
  await ensureClassSettings(db, classId);

  const settings = await db
    .prepare('SELECT level_thresholds FROM class_settings WHERE class_id = ?')
    .bind(classId)
    .first();

  if (!settings?.level_thresholds) {
    return DEFAULT_LEVEL_THRESHOLDS;
  }

  try {
    const parsed = JSON.parse(settings.level_thresholds);

    if (Array.isArray(parsed) && parsed.length === DEFAULT_LEVEL_THRESHOLDS.length) {
      return parsed.map((value) => Number(value));
    }
  } catch {
    return DEFAULT_LEVEL_THRESHOLDS;
  }

  return DEFAULT_LEVEL_THRESHOLDS;
}

async function appendLog(db, { classId, userId, actionType, detail, meta = null }) {
  await db
    .prepare('INSERT INTO logs (class_id, user_id, action_type, detail, meta) VALUES (?, ?, ?, ?, ?)')
    .bind(classId, userId, actionType, detail, meta ? JSON.stringify(meta) : null)
    .run();
}

async function getRawLogById(db, classId, logId) {
  return db
    .prepare('SELECT id, class_id, user_id, action_type, detail, meta, created_at FROM logs WHERE id = ? AND class_id = ?')
    .bind(logId, classId)
    .first();
}

async function getLatestUndoableLog(db, classId) {
  const result = await db
    .prepare(
      `SELECT id, class_id, user_id, action_type, detail, meta, created_at
       FROM logs
       WHERE class_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 50`,
    )
    .bind(classId)
    .all();

  const rows = result.results || [];

  return (
    rows.find((row) => {
      const meta = parseLogMeta(row.meta);
      return Boolean(meta?.undoable && !meta?.undone);
    }) || null
  );
}

async function getBootstrapPayload(db, userId, requestedClassId) {
  await ensureSystemRules(db);
  await ensureActivationCodes(db);

  const user = normalizeUser(await getUserById(db, userId));
  const classes = await getClassesByUserId(db, userId);
  const resolvedClassId =
    classes.find((item) => item.id === requestedClassId)?.id || classes[0]?.id || null;

  if (!resolvedClassId) {
    return {
      user,
      classes,
      currentClassId: null,
      students: [],
      shopItems: [],
      rules: [],
      logs: [],
      levelThresholds: DEFAULT_LEVEL_THRESHOLDS,
    };
  }

  return {
    user,
    classes,
    currentClassId: resolvedClassId,
    students: await getStudentsByClassId(db, resolvedClassId),
    shopItems: await getShopItemsByClassId(db, resolvedClassId),
    rules: await getRulesByClassId(db, resolvedClassId),
    logs: await getLogsByClassId(db, resolvedClassId),
    levelThresholds: await getThresholdsByClassId(db, resolvedClassId),
  };
}

async function handleLogin(db, request) {
  await ensureActivationCodes(db);

  const body = await readBody(request);
  const mode = body.mode === 'register' ? 'register' : 'login';
  const username = String(body.username || '').trim();
  const password = String(body.password || '');

  if (!validateUsername(username)) {
    return error('账号需为 3-24 位字母、数字、下划线或中划线');
  }

  if (!validatePassword(password)) {
    return error('密码至少需要 6 位');
  }

  if (mode === 'register') {
    const nickname = String(body.nickname || '').trim();
    const activationCodeValue = String(body.activationCode || '').trim().toUpperCase();

    if (!nickname) {
      return error('请输入展示昵称');
    }

    if (!activationCodeValue) {
      return error('请输入有效的激活码');
    }

    const existingUser = await db
      .prepare('SELECT id FROM users WHERE username = ?')
      .bind(username)
      .first();

    if (existingUser) {
      return error('该账号已存在，请更换用户名');
    }

    const activationCode = await db
      .prepare(
        `SELECT id, code, level, expires_in_days, used_by_user_id, used_at
         FROM activation_codes
         WHERE code = ?`,
      )
      .bind(activationCodeValue)
      .first();

    if (!activationCode) {
      return error('激活码不存在，请联系管理员确认');
    }

    if (activationCode.used_by_user_id) {
      return error('该激活码已被使用');
    }

    const passwordHash = await hashPassword(password);
    const expireAt = computeExpireAt(
      activationCode.expires_in_days === null ? null : Number(activationCode.expires_in_days),
    );

    const createdUser = await db
      .prepare(
        `INSERT INTO users (username, password_hash, nickname, level, expire_at)
         VALUES (?, ?, ?, ?, ?)
         RETURNING id, username, nickname, level, expire_at`,
      )
      .bind(username, passwordHash, nickname, activationCode.level, expireAt)
      .first();

    await db
      .prepare(
        `UPDATE activation_codes
         SET used_by_user_id = ?, used_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(createdUser.id, activationCode.id)
      .run();

    return json({
      user: normalizeUser(createdUser),
      currentClassId: null,
    });
  }

  const user = await getUserWithPassword(db, username);

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return error('账号或密码错误', 401);
  }

  // 兼容早期演示数据，将明文密码平滑升级为哈希。
  if (user.password_hash === password) {
    await db
      .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(await hashPassword(password), user.id)
      .run();
  }

  const classes = await getClassesByUserId(db, user.id);

  return json({
    user: normalizeUser(user),
    currentClassId: classes[0]?.id || null,
  });
}

async function handleUpdatePassword(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const currentPassword = String(body.currentPassword || '');
  const nextPassword = String(body.nextPassword || '');

  if (!userId) {
    return error('缺少有效的教师身份');
  }

  if (!validatePassword(currentPassword) || !validatePassword(nextPassword)) {
    return error('密码至少需要 6 位');
  }

  if (currentPassword === nextPassword) {
    return error('新密码不能与当前密码相同');
  }

  const user = await db
    .prepare('SELECT id, password_hash FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!user) {
    return error('教师账号不存在，请重新登录', 404);
  }

  const verified = await verifyPassword(currentPassword, user.password_hash);

  if (!verified) {
    return error('当前密码不正确', 401);
  }

  await db
    .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .bind(await hashPassword(nextPassword), userId)
    .run();

  return json({ success: true });
}

async function handleCreateClass(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const name = String(body.name || '').trim();

  if (!userId || !name) {
    return error('请输入有效的班级名称');
  }

  const user = await getUserById(db, userId);
  const classes = await getClassesByUserId(db, userId);

  if (user.level === 'temporary' && classes.length >= 1) {
    return error('临时账户只能创建一个班级，请升级账户享用无限特权', 403);
  }

  const createdClass = await db
    .prepare(
      `INSERT INTO classes (user_id, name)
       VALUES (?, ?)
       RETURNING id, name, created_at`,
    )
    .bind(userId, name)
    .first();

  await ensureClassSettings(db, createdClass.id);
  await appendLog(db, {
    classId: createdClass.id,
    userId,
    actionType: '班级设置',
    detail: `创建了班级 ${name}`,
  });

  return json({
    class: normalizeClass(createdClass),
    classes: await getClassesByUserId(db, userId),
    currentClassId: Number(createdClass.id),
  });
}

async function handleRenameClass(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const name = String(body.name || '').trim();

  if (!userId || !name) {
    return error('班级名称不能为空');
  }

  await assertClassOwnership(db, userId, classId);

  await db.prepare('UPDATE classes SET name = ? WHERE id = ?').bind(name, classId).run();
  await appendLog(db, {
    classId,
    userId,
    actionType: '班级设置',
    detail: `班级名称更新为 ${name}`,
  });

  return json({
    classes: await getClassesByUserId(db, userId),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleImportStudents(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const names = Array.isArray(body.names) ? body.names : [];

  if (!userId) {
    return error('缺少有效的教师身份');
  }

  await assertClassOwnership(db, userId, classId);

  const cleanedNames = Array.from(
    new Set(names.map((name) => String(name || '').trim()).filter(Boolean)),
  );

  if (cleanedNames.length === 0) {
    return error('请至少输入一名学生姓名');
  }

  const statements = cleanedNames.map((name) =>
    db
      .prepare(
        `INSERT INTO students (class_id, name, pet_status, pet_level, pet_points, coins, total_exp, total_coins)
         VALUES (?, ?, 'egg', 0, 0, 0, 0, 0)`,
      )
      .bind(classId, name),
  );

  await db.batch(statements);
  await appendLog(db, {
    classId,
    userId,
    actionType: '学生管理',
    detail: `批量导入了 ${cleanedNames.length} 名学生`,
  });

  return json({
    students: await getStudentsByClassId(db, classId),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleCreateStudent(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const name = String(body.name || '').trim();

  if (!userId || !name) {
    return error('请输入学生姓名');
  }

  await assertClassOwnership(db, userId, classId);

  await db
    .prepare(
      `INSERT INTO students (class_id, name, pet_status, pet_level, pet_points, coins, total_exp, total_coins)
       VALUES (?, ?, 'egg', 0, 0, 0, 0, 0)`,
    )
    .bind(classId, name)
    .run();

  await appendLog(db, {
    classId,
    userId,
    actionType: '学生管理',
    detail: `新增了学生 ${name}`,
  });

  return json({
    students: await getStudentsByClassId(db, classId),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleBatchDeleteStudents(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const studentIds = Array.isArray(body.studentIds)
    ? Array.from(new Set(body.studentIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)))
    : [];

  if (!userId) {
    return error('缺少有效的教师身份');
  }

  if (studentIds.length === 0) {
    return error('请至少选择一名学生');
  }

  await assertClassOwnership(db, userId, classId);

  const placeholders = studentIds.map(() => '?').join(', ');
  const result = await db
    .prepare(`SELECT id, name FROM students WHERE class_id = ? AND id IN (${placeholders})`)
    .bind(classId, ...studentIds)
    .all();

  const targetStudents = result.results || [];

  if (targetStudents.length !== studentIds.length) {
    return error('部分学生不存在或已被移除');
  }

  await db
    .prepare(`DELETE FROM students WHERE class_id = ? AND id IN (${placeholders})`)
    .bind(classId, ...studentIds)
    .run();

  const summaryNames = targetStudents.slice(0, 6).map((student) => student.name).join('、');
  const suffix = targetStudents.length > 6 ? ' 等学生' : '';
  await appendLog(db, {
    classId,
    userId,
    actionType: '学生管理',
    detail: `批量移除了 ${targetStudents.length} 名学生：${summaryNames}${suffix}`,
  });

  return json({
    students: await getStudentsByClassId(db, classId),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleUpdateStudent(db, request, studentId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);
  const updates = body.updates && typeof body.updates === 'object' ? body.updates : {};
  const undoMeta = body.undoMeta && typeof body.undoMeta === 'object' ? body.undoMeta : null;

  if (!userId || !classId) {
    return error('缺少有效的班级上下文');
  }

  const currentStudent = await assertStudentOwnership(db, userId, studentId);

  if (Number(currentStudent.class_id) !== classId) {
    return error('学生与当前班级不匹配');
  }

  if (updates.archived) {
    await db.prepare('DELETE FROM students WHERE id = ?').bind(studentId).run();

    if (body.actionType && body.detail) {
      await appendLog(db, {
        classId,
        userId,
        actionType: body.actionType,
        detail: body.detail,
      });
    }

    return json({
      student: null,
      logs: await getLogsByClassId(db, classId),
    });
  }

  const nextName = String(updates.name ?? currentStudent.name).trim();

  if (!nextName) {
    return error('学生姓名不能为空');
  }

  const nextStudent = {
    name: nextName,
    pet_status: String(updates.pet_status ?? currentStudent.pet_status ?? 'egg'),
    pet_name: updates.pet_name ?? currentStudent.pet_name,
    pet_type_id: updates.pet_type_id ?? currentStudent.pet_type_id,
    pet_level: Math.max(0, Number(updates.pet_level ?? currentStudent.pet_level ?? 0)),
    pet_points: Math.max(0, Number(updates.pet_points ?? currentStudent.pet_points ?? 0)),
    coins: Math.max(0, Number(updates.coins ?? currentStudent.coins ?? 0)),
    total_exp: Math.max(0, Number(updates.total_exp ?? currentStudent.total_exp ?? 0)),
    total_coins: Math.max(0, Number(updates.total_coins ?? currentStudent.total_coins ?? 0)),
    reward_count: Math.max(0, Number(updates.reward_count ?? currentStudent.reward_count ?? 0)),
    pet_collection: parsePetCollection(updates.pet_collection ?? currentStudent.pet_collection ?? '[]'),
  };

  await db
    .prepare(
      `UPDATE students
       SET name = ?, pet_status = ?, pet_name = ?, pet_type_id = ?, pet_level = ?, pet_points = ?, coins = ?, total_exp = ?, total_coins = ?, reward_count = ?, pet_collection = ?
       WHERE id = ?`,
    )
    .bind(
      nextStudent.name,
      nextStudent.pet_status,
      nextStudent.pet_name,
      nextStudent.pet_type_id,
      nextStudent.pet_level,
      nextStudent.pet_points,
      nextStudent.coins,
      nextStudent.total_exp,
      nextStudent.total_coins,
      nextStudent.reward_count,
      JSON.stringify(nextStudent.pet_collection),
      studentId,
    )
    .run();

  if (body.actionType && body.detail) {
    await appendLog(db, {
      classId,
      userId,
      actionType: body.actionType,
      detail: body.detail,
      meta: undoMeta,
    });
  }

  const refreshedStudent = await db
    .prepare(
      `SELECT id, class_id, name, pet_status, pet_name, pet_type_id, pet_level, pet_points, coins, total_exp, total_coins
       , reward_count, pet_collection
       FROM students
       WHERE id = ?`,
    )
    .bind(studentId)
    .first();

  return json({
    student: normalizeStudent(refreshedStudent),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleCreateShopItem(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const item = body.item && typeof body.item === 'object' ? body.item : {};
  const name = String(item.name || '').trim();
  const icon = String(item.icon || '🎁').trim() || '🎁';
  const price = Number(item.price || 0);
  const stock = Math.max(0, Number(item.stock || 0));

  if (!userId || !name || price <= 0) {
    return error('请填写有效的商品名称与价格');
  }

  await assertClassOwnership(db, userId, classId);

  await db
    .prepare('INSERT INTO shop_items (class_id, name, icon, price, stock) VALUES (?, ?, ?, ?, ?)')
    .bind(classId, name, icon, price, stock || 99)
    .run();

  await appendLog(db, {
    classId,
    userId,
    actionType: '商品管理',
    detail: `新增商品 ${name}，库存 ${stock || 99}`,
  });

  return json({
    shopItems: await getShopItemsByClassId(db, classId),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleUpdateShopItem(db, request, itemId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);
  const item = body.item && typeof body.item === 'object' ? body.item : {};
  const name = String(item.name || '').trim();
  const icon = String(item.icon || '🎁').trim() || '🎁';
  const price = Number(item.price || 0);
  const stock = Math.max(0, Number(item.stock || 0));

  if (!userId || !classId || !name || price <= 0) {
    return error('请填写有效的商品名称与价格');
  }

  await assertClassOwnership(db, userId, classId);

  const existing = await db
    .prepare('SELECT id, class_id, name FROM shop_items WHERE id = ? AND class_id = ?')
    .bind(itemId, classId)
    .first();

  if (!existing) {
    return error('商品不存在或已下架');
  }

  await db
    .prepare('UPDATE shop_items SET name = ?, icon = ?, price = ?, stock = ? WHERE id = ?')
    .bind(name, icon, price, stock, itemId)
    .run();

  await appendLog(db, {
    classId,
    userId,
    actionType: '商品管理',
    detail: `更新了商品 ${name}，价格 ${price}，库存 ${stock}`,
  });

  return json({
    shopItems: await getShopItemsByClassId(db, classId),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleDeleteShopItem(db, request, itemId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);

  if (!userId || !classId) {
    return error('缺少有效的商品上下文');
  }

  await assertClassOwnership(db, userId, classId);

  const item = await db
    .prepare('SELECT id, class_id, name FROM shop_items WHERE id = ? AND class_id = ?')
    .bind(itemId, classId)
    .first();

  if (!item) {
    return error('商品不存在或已下架');
  }

  await db.prepare('DELETE FROM shop_items WHERE id = ?').bind(itemId).run();
  await appendLog(db, {
    classId,
    userId,
    actionType: '商品管理',
    detail: `下架了商品 ${item.name}`,
  });

  return json({
    shopItems: await getShopItemsByClassId(db, classId),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleRedeemShopItem(db, request, itemId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);
  const studentIds = Array.isArray(body.studentIds)
    ? Array.from(new Set(body.studentIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)))
    : [];

  if (!userId || !classId) {
    return error('缺少有效的兑换上下文');
  }

  if (studentIds.length === 0) {
    return error('请至少选择一名学生');
  }

  await assertClassOwnership(db, userId, classId);

  const item = await db
    .prepare('SELECT id, class_id, name, icon, price, stock FROM shop_items WHERE id = ? AND class_id = ?')
    .bind(itemId, classId)
    .first();

  if (!item) {
    return error('商品不存在或已下架');
  }

  if (studentIds.length > Number(item.stock || 0)) {
    return error('所选学生数量超过了当前库存');
  }

  const placeholders = studentIds.map(() => '?').join(', ');
  const selectedStudents = await db
    .prepare(
      `SELECT id, class_id, name, pet_status, pet_name, pet_type_id, pet_level, pet_points, coins, total_exp, total_coins
       , reward_count, pet_collection
       FROM students
       WHERE class_id = ? AND id IN (${placeholders})`,
    )
    .bind(classId, ...studentIds)
    .all();

  const students = (selectedStudents.results || []).map(normalizeStudent);

  if (students.length !== studentIds.length) {
    return error('部分学生不存在，兑换未执行');
  }

  const unaffordableStudent = students.find((student) => (student.coins || 0) < Number(item.price || 0));

  if (unaffordableStudent) {
    return error(`学生 ${unaffordableStudent.name} 的金币不足，兑换已取消`);
  }

  const statements = students.map((student) =>
    db
      .prepare('UPDATE students SET coins = ? WHERE id = ?')
      .bind(student.coins - Number(item.price || 0), student.id),
  );

  statements.push(
    db
      .prepare('UPDATE shop_items SET stock = ? WHERE id = ?')
      .bind(Number(item.stock || 0) - studentIds.length, itemId),
  );

  await db.batch(statements);
  await appendLog(db, {
    classId,
    userId,
    actionType: '商品兑换',
    detail: `为 ${students.map((student) => student.name).join('、')} 兑换了 ${item.name}`,
    meta: {
      undoable: true,
      kind: 'shop-redeem',
      item: {
        id: Number(item.id),
        name: item.name,
        stockBefore: Number(item.stock || 0),
        stockAfter: Number(item.stock || 0) - studentIds.length,
      },
      studentsBefore: students.map((student) => ({
        id: student.id,
        name: student.name,
        coins: student.coins || 0,
      })),
      studentsAfter: students.map((student) => ({
        id: student.id,
        coins: (student.coins || 0) - Number(item.price || 0),
      })),
    },
  });

  return json({
    students: await getStudentsByClassId(db, classId),
    shopItems: await getShopItemsByClassId(db, classId),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleCreateRule(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const rule = body.rule && typeof body.rule === 'object' ? body.rule : {};
  const name = String(rule.name || '').trim();
  const icon = String(rule.icon || '⭐').trim() || '⭐';
  const exp = Number(rule.exp || 0);
  const coins = Number(rule.coins || 0);
  const type = rule.type === 'negative' ? 'negative' : 'positive';

  if (!userId || !name) {
    return error('请输入规则名称');
  }

  await assertClassOwnership(db, userId, classId);

  await db
    .prepare('INSERT INTO rules (class_id, name, icon, exp, coins, type) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(classId, name, icon, exp, coins, type)
    .run();

  await appendLog(db, {
    classId,
    userId,
    actionType: '规则修改',
    detail: `新增规则 ${name}`,
  });

  return json({
    rules: await getRulesByClassId(db, classId),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleUpdateRule(db, request, ruleId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);
  const rule = body.rule && typeof body.rule === 'object' ? body.rule : {};
  const name = String(rule.name || '').trim();
  const icon = String(rule.icon || '⭐').trim() || '⭐';
  const exp = Number(rule.exp || 0);
  const coins = Number(rule.coins || 0);
  const type = rule.type === 'negative' ? 'negative' : 'positive';

  if (!userId || !classId || !name) {
    return error('请输入规则名称');
  }

  await assertClassOwnership(db, userId, classId);

  const existing = await db
    .prepare('SELECT id, class_id, name FROM rules WHERE id = ? AND class_id = ?')
    .bind(ruleId, classId)
    .first();

  if (!existing) {
    return error('系统预设规则不可编辑，或目标规则不存在');
  }

  await db
    .prepare('UPDATE rules SET name = ?, icon = ?, exp = ?, coins = ?, type = ? WHERE id = ?')
    .bind(name, icon, exp, coins, type, ruleId)
    .run();

  await appendLog(db, {
    classId,
    userId,
    actionType: '规则修改',
    detail: `更新规则 ${name}`,
  });

  return json({
    rules: await getRulesByClassId(db, classId),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleDeleteRule(db, request, ruleId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);

  if (!userId || !classId) {
    return error('缺少有效的规则上下文');
  }

  await assertClassOwnership(db, userId, classId);

  const rule = await db
    .prepare('SELECT id, class_id, name FROM rules WHERE id = ? AND class_id = ?')
    .bind(ruleId, classId)
    .first();

  if (!rule) {
    return error('系统预设规则不可删除，或目标规则不存在');
  }

  await db.prepare('DELETE FROM rules WHERE id = ?').bind(ruleId).run();
  await appendLog(db, {
    classId,
    userId,
    actionType: '规则修改',
    detail: `删除规则 ${rule.name}`,
  });

  return json({
    rules: await getRulesByClassId(db, classId),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleUpdateThresholds(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const thresholds = Array.isArray(body.thresholds) ? body.thresholds.map((value) => Number(value)) : [];

  if (!userId || thresholds.length !== DEFAULT_LEVEL_THRESHOLDS.length) {
    return error('等级阈值格式不正确');
  }

  const isAscending = thresholds.every((value, index) => {
    if (!Number.isFinite(value) || value <= 0) {
      return false;
    }

    if (index === 0) {
      return true;
    }

    return value > thresholds[index - 1];
  });

  if (!isAscending) {
    return error('等级阈值需要保持递增，且必须大于 0');
  }

  await assertClassOwnership(db, userId, classId);
  await ensureClassSettings(db, classId);

  await db
    .prepare(
      `INSERT INTO class_settings (class_id, level_thresholds, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(class_id) DO UPDATE SET level_thresholds = excluded.level_thresholds, updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(classId, JSON.stringify(thresholds))
    .run();

  await appendLog(db, {
    classId,
    userId,
    actionType: '规则修改',
    detail: `更新了等级阈值：${thresholds.join(' / ')}`,
  });

  return json({
    levelThresholds: await getThresholdsByClassId(db, classId),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleResetClassProgress(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);

  if (!userId) {
    return error('缺少有效的教师身份');
  }

  await assertClassOwnership(db, userId, classId);

  const result = await db
    .prepare(
      `SELECT id, class_id, name, pet_status, pet_name, pet_type_id, pet_level, pet_points, coins, total_exp, total_coins
       , reward_count, pet_collection
       FROM students
       WHERE class_id = ?`,
    )
    .bind(classId)
    .all();

  const students = (result.results || []).map(normalizeStudent);

  if (students.length === 0) {
    return error('当前班级还没有学生，无法执行重置');
  }

  const statements = students.map((student) =>
    db
      .prepare(
        `UPDATE students
         SET pet_status = 'egg',
             pet_name = NULL,
             pet_type_id = NULL,
             pet_level = 0,
             pet_points = 0,
             coins = 0,
             total_exp = 0,
             reward_count = 0,
             pet_collection = '[]'
         WHERE id = ?`,
      )
      .bind(student.id),
  );

  await db.batch(statements);
  await appendLog(db, {
    classId,
    userId,
    actionType: '班级重置',
    detail: `执行了全班新学期重置，保留 ${students.length} 名学生名册并清空当前宠物进度`,
  });

  return json({
    students: await getStudentsByClassId(db, classId),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleArchiveClassStudents(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);

  if (!userId) {
    return error('缺少有效的教师身份');
  }

  await assertClassOwnership(db, userId, classId);

  const countRow = await db
    .prepare('SELECT COUNT(*) AS count FROM students WHERE class_id = ?')
    .bind(classId)
    .first();

  const studentCount = Number(countRow?.count || 0);

  if (studentCount === 0) {
    return error('当前班级没有可归档的学生');
  }

  await db.prepare('DELETE FROM students WHERE class_id = ?').bind(classId).run();
  await appendLog(db, {
    classId,
    userId,
    actionType: '毕业归档',
    detail: `一键归档并移除了当前班级的 ${studentCount} 名学生`,
  });

  return json({
    students: [],
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleUndoLog(db, request, logId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);

  if (!userId || !classId) {
    return error('缺少有效的撤销上下文');
  }

  await assertClassOwnership(db, userId, classId);

  const targetLog = await getRawLogById(db, classId, logId);

  if (!targetLog) {
    return error('未找到对应日志');
  }

  const meta = parseLogMeta(targetLog.meta);

  if (!meta?.undoable || meta?.undone) {
    return error('该操作当前不可撤销');
  }

  const latestUndoableLog = await getLatestUndoableLog(db, classId);

  if (!latestUndoableLog || Number(latestUndoableLog.id) !== logId) {
    return error('仅支持撤销最近一次可回滚操作');
  }

  if (meta.kind === 'student-update') {
    const snapshot = meta.before;

    if (!snapshot?.id) {
      return error('缺少学生回滚快照');
    }

    await db
      .prepare(
        `UPDATE students
         SET name = ?, pet_status = ?, pet_name = ?, pet_type_id = ?, pet_level = ?, pet_points = ?, coins = ?, total_exp = ?, total_coins = ?, reward_count = ?, pet_collection = ?
         WHERE id = ? AND class_id = ?`,
      )
      .bind(
        snapshot.name,
        snapshot.pet_status,
        snapshot.pet_name,
        snapshot.pet_type_id,
        snapshot.pet_level,
        snapshot.pet_points,
        snapshot.coins,
        snapshot.total_exp,
        snapshot.total_coins,
        snapshot.reward_count,
        JSON.stringify(snapshot.pet_collection || []),
        snapshot.id,
        classId,
      )
      .run();
  } else if (meta.kind === 'shop-redeem') {
    const studentStatements = (meta.studentsBefore || []).map((student) =>
      db.prepare('UPDATE students SET coins = ? WHERE id = ? AND class_id = ?').bind(student.coins, student.id, classId),
    );

    if (studentStatements.length === 0 || !meta.item?.id) {
      return error('缺少商品兑换回滚快照');
    }

    studentStatements.push(
      db.prepare('UPDATE shop_items SET stock = ? WHERE id = ? AND class_id = ?').bind(meta.item.stockBefore, meta.item.id, classId),
    );

    await db.batch(studentStatements);
  } else {
    return error('当前仅支持撤销互动和商品兑换操作');
  }

  const nextMeta = {
    ...meta,
    undone: true,
    undone_at: new Date().toISOString(),
  };

  await db
    .prepare('UPDATE logs SET meta = ? WHERE id = ?')
    .bind(JSON.stringify(nextMeta), logId)
    .run();

  await appendLog(db, {
    classId,
    userId,
    actionType: '操作撤销',
    detail: `撤销了「${targetLog.action_type}」：${targetLog.detail}`,
  });

  return json({
    students: await getStudentsByClassId(db, classId),
    shopItems: await getShopItemsByClassId(db, classId),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleListActivationCodes(db, request) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));

  if (!userId) {
    return error('缺少有效的教师身份');
  }

  const user = await getUserById(db, userId);

  if (user.level !== 'permanent') {
    return error('仅永久账号可查看激活码库存', 403);
  }

  await ensureActivationCodes(db);

  const result = await db
    .prepare(
      `SELECT id, code, level, expires_in_days, used_by_user_id, used_at
       FROM activation_codes
       ORDER BY created_at ASC, id ASC`,
    )
    .all();

  return json({
    activationCodes: (result.results || []).map(normalizeActivationCode),
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const db = getDb(env);
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/auth/login' && request.method === 'POST') {
        return await handleLogin(db, request);
      }

      if (path === '/api/auth/password' && request.method === 'PUT') {
        return await handleUpdatePassword(db, request);
      }

      if (path === '/api/bootstrap' && request.method === 'GET') {
        const userId = parseId(url.searchParams.get('userId'));
        const classId = parseId(url.searchParams.get('classId'));

        if (!userId) {
          return error('缺少有效的教师身份');
        }

        return json(await getBootstrapPayload(db, userId, classId));
      }

      if (path === '/api/activation-codes' && request.method === 'GET') {
        return await handleListActivationCodes(db, request);
      }

      if (path === '/api/classes' && request.method === 'POST') {
        return await handleCreateClass(db, request);
      }

      const classMatch = path.match(/^\/api\/classes\/(\d+)$/);
      if (classMatch && request.method === 'PATCH') {
        return await handleRenameClass(db, request, Number(classMatch[1]));
      }

      const importStudentsMatch = path.match(/^\/api\/classes\/(\d+)\/students\/import$/);
      if (importStudentsMatch && request.method === 'POST') {
        return await handleImportStudents(db, request, Number(importStudentsMatch[1]));
      }

      const createStudentMatch = path.match(/^\/api\/classes\/(\d+)\/students$/);
      if (createStudentMatch && request.method === 'POST') {
        return await handleCreateStudent(db, request, Number(createStudentMatch[1]));
      }

      const batchDeleteStudentsMatch = path.match(/^\/api\/classes\/(\d+)\/students\/batch-delete$/);
      if (batchDeleteStudentsMatch && request.method === 'POST') {
        return await handleBatchDeleteStudents(db, request, Number(batchDeleteStudentsMatch[1]));
      }

      const studentMatch = path.match(/^\/api\/students\/(\d+)$/);
      if (studentMatch && request.method === 'PATCH') {
        return await handleUpdateStudent(db, request, Number(studentMatch[1]));
      }

      const shopItemsMatch = path.match(/^\/api\/classes\/(\d+)\/shop-items$/);
      if (shopItemsMatch && request.method === 'POST') {
        return await handleCreateShopItem(db, request, Number(shopItemsMatch[1]));
      }

      const shopItemMatch = path.match(/^\/api\/shop-items\/(\d+)$/);
      if (shopItemMatch && request.method === 'PATCH') {
        return await handleUpdateShopItem(db, request, Number(shopItemMatch[1]));
      }

      if (shopItemMatch && request.method === 'DELETE') {
        return await handleDeleteShopItem(db, request, Number(shopItemMatch[1]));
      }

      const redeemMatch = path.match(/^\/api\/shop-items\/(\d+)\/redeem$/);
      if (redeemMatch && request.method === 'POST') {
        return await handleRedeemShopItem(db, request, Number(redeemMatch[1]));
      }

      const rulesMatch = path.match(/^\/api\/classes\/(\d+)\/rules$/);
      if (rulesMatch && request.method === 'POST') {
        return await handleCreateRule(db, request, Number(rulesMatch[1]));
      }

      const ruleMatch = path.match(/^\/api\/rules\/(\d+)$/);
      if (ruleMatch && request.method === 'PATCH') {
        return await handleUpdateRule(db, request, Number(ruleMatch[1]));
      }

      if (ruleMatch && request.method === 'DELETE') {
        return await handleDeleteRule(db, request, Number(ruleMatch[1]));
      }

      const thresholdMatch = path.match(/^\/api\/classes\/(\d+)\/settings\/thresholds$/);
      if (thresholdMatch && request.method === 'PUT') {
        return await handleUpdateThresholds(db, request, Number(thresholdMatch[1]));
      }

      const resetProgressMatch = path.match(/^\/api\/classes\/(\d+)\/reset-progress$/);
      if (resetProgressMatch && request.method === 'POST') {
        return await handleResetClassProgress(db, request, Number(resetProgressMatch[1]));
      }

      const archiveStudentsMatch = path.match(/^\/api\/classes\/(\d+)\/archive-students$/);
      if (archiveStudentsMatch && request.method === 'POST') {
        return await handleArchiveClassStudents(db, request, Number(archiveStudentsMatch[1]));
      }

      const undoLogMatch = path.match(/^\/api\/logs\/(\d+)\/undo$/);
      if (undoLogMatch && request.method === 'POST') {
        return await handleUndoLog(db, request, Number(undoLogMatch[1]));
      }

      return error('Not Found', 404);
    } catch (caughtError) {
      return error(caughtError.message || '服务器开小差了，请稍后重试', 500);
    }
  },
};
