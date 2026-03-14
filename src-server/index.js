const DEFAULT_LEVEL_THRESHOLDS = [10, 20, 30, 50, 70, 100];

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

const parseId = (value) => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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

const formatLogTime = (createdAt) => {
  const timestamp = new Date(createdAt);

  if (Number.isNaN(timestamp.getTime())) {
    return createdAt;
  }

  return timestamp.toLocaleTimeString('zh-CN', { hour12: false });
};

const normalizeLog = (row) => ({
  id: Number(row.id),
  action: row.action_type,
  detail: row.detail,
  time: formatLogTime(row.created_at),
  operator: row.operator || '系统',
});

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

async function getUserById(db, userId) {
  const user = await db
    .prepare('SELECT id, username, nickname, level, expire_at FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!user) {
    throw new Error('教师账号不存在，请重新登录');
  }

  return user;
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
      `SELECT l.id, l.action_type, l.detail, l.created_at, u.nickname AS operator
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

async function appendLog(db, { classId, userId, actionType, detail }) {
  await db
    .prepare('INSERT INTO logs (class_id, user_id, action_type, detail) VALUES (?, ?, ?, ?)')
    .bind(classId, userId, actionType, detail)
    .run();
}

async function getBootstrapPayload(db, userId, requestedClassId) {
  await ensureSystemRules(db);

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
  const body = await readBody(request);
  const username = String(body.username || 'demo_teacher').trim() || 'demo_teacher';
  const nickname = String(body.nickname || body.username || '谢先生').trim() || '谢先生';

  let user = await db
    .prepare('SELECT id, username, nickname, level, expire_at FROM users WHERE username = ?')
    .bind(username)
    .first();

  if (!user) {
    const inserted = await db
      .prepare(
        `INSERT INTO users (username, password_hash, nickname, level)
         VALUES (?, ?, ?, ?) RETURNING id, username, nickname, level, expire_at`,
      )
      .bind(username, 'demo-password', nickname, 'permanent')
      .first();

    user = inserted;
  } else if (body.mode === 'register' && nickname !== user.nickname) {
    user = await db
      .prepare(
        `UPDATE users
         SET nickname = ?
         WHERE id = ?
         RETURNING id, username, nickname, level, expire_at`,
      )
      .bind(nickname, user.id)
      .first();
  }

  const classes = await getClassesByUserId(db, user.id);

  return json({
    user: normalizeUser(user),
    currentClassId: classes[0]?.id || null,
  });
}

async function handleCreateClass(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const name = String(body.name || '').trim();

  if (!userId || !name) {
    return error('请输入有效的班级名称');
  }

  await getUserById(db, userId);

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

async function handleUpdateStudent(db, request, studentId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);
  const updates = body.updates && typeof body.updates === 'object' ? body.updates : {};

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

  const nextStudent = {
    name: String(updates.name ?? currentStudent.name),
    pet_status: String(updates.pet_status ?? currentStudent.pet_status ?? 'egg'),
    pet_name: updates.pet_name ?? currentStudent.pet_name,
    pet_type_id: updates.pet_type_id ?? currentStudent.pet_type_id,
    pet_level: Number(updates.pet_level ?? currentStudent.pet_level ?? 0),
    pet_points: Number(updates.pet_points ?? currentStudent.pet_points ?? 0),
    coins: Math.max(0, Number(updates.coins ?? currentStudent.coins ?? 0)),
    total_exp: Math.max(0, Number(updates.total_exp ?? currentStudent.total_exp ?? 0)),
    total_coins: Math.max(0, Number(updates.total_coins ?? currentStudent.total_coins ?? 0)),
  };

  await db
    .prepare(
      `UPDATE students
       SET name = ?, pet_status = ?, pet_name = ?, pet_type_id = ?, pet_level = ?, pet_points = ?, coins = ?, total_exp = ?, total_coins = ?
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
      studentId,
    )
    .run();

  if (body.actionType && body.detail) {
    await appendLog(db, {
      classId,
      userId,
      actionType: body.actionType,
      detail: body.detail,
    });
  }

  const refreshedStudent = await db
    .prepare(
      `SELECT id, class_id, name, pet_status, pet_name, pet_type_id, pet_level, pet_points, coins, total_exp, total_coins
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

      if (path === '/api/bootstrap' && request.method === 'GET') {
        const userId = parseId(url.searchParams.get('userId'));
        const classId = parseId(url.searchParams.get('classId'));

        if (!userId) {
          return error('缺少有效的教师身份');
        }

        return json(await getBootstrapPayload(db, userId, classId));
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

      const studentMatch = path.match(/^\/api\/students\/(\d+)$/);
      if (studentMatch && request.method === 'PATCH') {
        return await handleUpdateStudent(db, request, Number(studentMatch[1]));
      }

      const shopItemMatch = path.match(/^\/api\/classes\/(\d+)\/shop-items$/);
      if (shopItemMatch && request.method === 'POST') {
        return await handleCreateShopItem(db, request, Number(shopItemMatch[1]));
      }

      const redeemMatch = path.match(/^\/api\/shop-items\/(\d+)\/redeem$/);
      if (redeemMatch && request.method === 'POST') {
        return await handleRedeemShopItem(db, request, Number(redeemMatch[1]));
      }

      const rulesMatch = path.match(/^\/api\/classes\/(\d+)\/rules$/);
      if (rulesMatch && request.method === 'POST') {
        return await handleCreateRule(db, request, Number(rulesMatch[1]));
      }

      const deleteRuleMatch = path.match(/^\/api\/rules\/(\d+)$/);
      if (deleteRuleMatch && request.method === 'DELETE') {
        return await handleDeleteRule(db, request, Number(deleteRuleMatch[1]));
      }

      const thresholdMatch = path.match(/^\/api\/classes\/(\d+)\/settings\/thresholds$/);
      if (thresholdMatch && request.method === 'PUT') {
        return await handleUpdateThresholds(db, request, Number(thresholdMatch[1]));
      }

      return error('Not Found', 404);
    } catch (caughtError) {
      return error(caughtError.message || '服务器开小差了，请稍后重试', 500);
    }
  },
};
