const DEFAULT_LEVEL_THRESHOLDS = [10, 20, 30, 50, 70, 100];
const DEFAULT_PET_CONDITION_CONFIG = {
  enabled: true,
  skip_weekends: true,
  pause_start_date: null,
  pause_end_date: null,
  hungry_days: 2,
  weak_days: 4,
  sleeping_days: 7,
  hungry_decay: 0,
  weak_decay: 1,
  sleeping_decay: 2,
};
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const STUDENT_SELECT_FIELDS = `id, class_id, name, pet_status, pet_condition, last_fed_at, last_decay_at, pet_condition_locked_at, pet_name, pet_type_id, pet_level, pet_points, coins, total_exp, lifetime_exp, total_coins, reward_count, pet_collection, created_at, group_name`;
const FREE_REGISTER_LEVEL_EXPIRES_IN_DAYS = {
  temporary: null,
  vip1: null,
  vip2: null,
};
const REGISTER_RATE_LIMIT = {
  shortWindowMinutes: 10,
  shortLimit: 3,
  longWindowHours: 24,
  longLimit: 10,
};
const ACTIVATION_CODE_SEEDS = [
  { code: 'CLASS-VIP1-2026', level: 'vip1', expiresInDays: 30 },
  { code: 'CLASS-VIP2-2026', level: 'vip2', expiresInDays: 90 },
  { code: 'CLASS-PERM-2026', level: 'permanent', expiresInDays: null },
];
const DEFAULT_TOOLBOX_ACCESS = {
  random: 'temporary',
  timer: 'temporary',
  smart_seating: 'vip2',
  read_forest: 'vip2',
  mic_power: 'vip2',
  angry_tiger: 'vip2',
  reading_challenge: 'vip2',
  quiet_study: 'vip2',
};

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

const errorWithHeaders = (message, status = 400, extraHeaders = {}) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });

const error = (message, status = 400) => errorWithHeaders(message, status);

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

const nowIso = () => new Date().toISOString();

const getTodayKeyCN = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const parseDateOnlyToUtcMs = (value, endOfDay = false) => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const shanghaiOffsetMs = 8 * 60 * 60 * 1000;
  return Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  ) - shanghaiOffsetMs;
};

const createCollectionId = (studentId) =>
  `${studentId || 'student'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const parseServerPetCollection = (value, student = null) => {
  const collection = parsePetCollection(value);

  if (collection.length > 0) {
    return collection
      .filter(Boolean)
      .map((entry) => ({
        id: entry.id || createCollectionId(student?.id),
        pet_type_id: entry.pet_type_id || null,
        pet_name: entry.pet_name || (entry.pet_type_id ? '未命名伙伴' : '神秘蛋'),
        pet_level: Number(entry.pet_level || 0),
        adopted_at: entry.adopted_at || nowIso(),
        completed_at: entry.completed_at || null,
        status: entry.status || 'graduated',
      }));
  }

  if (student?.pet_status === 'egg' || student?.pet_type_id) {
    return student?.pet_status === 'egg' && !student?.pet_type_id
      ? []
      : [
          {
            id: createCollectionId(student?.id),
            pet_type_id: student?.pet_type_id || null,
            pet_name: student?.pet_name || '未命名伙伴',
            pet_level: Number(student?.pet_level || 1),
            adopted_at: student?.created_at || nowIso(),
            completed_at: null,
            status: student?.pet_status === 'egg' ? 'active-egg' : 'active',
          },
        ];
  }

  return [];
};

const syncStudentCollectionProgress = (student) => {
  const collection = parseServerPetCollection(student?.pet_collection, student);
  if (collection.length === 0) {
    return collection;
  }

  const currentIndex = collection.findIndex((entry) => entry.status === 'active' || entry.status === 'active-egg');
  if (currentIndex < 0) {
    return collection;
  }

  const currentEntry = collection[currentIndex];
  collection[currentIndex] = {
    ...currentEntry,
    pet_type_id: student?.pet_type_id || currentEntry.pet_type_id || null,
    pet_name: student?.pet_name || currentEntry.pet_name,
    pet_level: Number(student?.pet_level || currentEntry.pet_level || 0),
    status: student?.pet_status === 'egg' ? 'active-egg' : 'active',
  };

  return collection;
};

const resolvePetLevel = (totalExp, thresholds = DEFAULT_LEVEL_THRESHOLDS) => {
  let nextLevel = 1;

  thresholds.forEach((threshold, index) => {
    if (Number(totalExp || 0) >= Number(threshold || 0)) {
      nextLevel = index + 2;
    }
  });

  return nextLevel;
};

const isDayPaused = (dayIndex, config) => {
  const dayStartMs = dayIndex * DAY_IN_MS;
  const weekday = new Date(dayStartMs).getUTCDay();

  if (config.skip_weekends && (weekday === 0 || weekday === 6)) {
    return true;
  }

  const pauseStartMs = parseDateOnlyToUtcMs(config.pause_start_date, false);
  const pauseEndMs = parseDateOnlyToUtcMs(config.pause_end_date, true);

  if (pauseStartMs !== null && pauseEndMs !== null) {
    return dayStartMs >= pauseStartMs && dayStartMs <= pauseEndMs;
  }

  return false;
};

const countEffectiveDaysBetween = (startMs, endMs, config) => {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }

  const startDayIndex = Math.floor(startMs / DAY_IN_MS);
  const endDayIndex = Math.floor(endMs / DAY_IN_MS);
  let effectiveDays = 0;

  for (let dayIndex = startDayIndex + 1; dayIndex <= endDayIndex; dayIndex += 1) {
    if (!isDayPaused(dayIndex, config)) {
      effectiveDays += 1;
    }
  }

  return effectiveDays;
};

const getEffectiveDaysSinceLastFed = (lastFedAt, config) => {
  if (!config?.enabled) {
    return 0;
  }

  if (!lastFedAt) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = new Date(lastFedAt).getTime();
  if (Number.isNaN(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return countEffectiveDaysBetween(timestamp, Date.now(), config);
};

const derivePetCondition = (student) => {
  if (!student || student.pet_status === 'egg') {
    return 'healthy';
  }

  const config = normalizePetConditionConfig(student.pet_condition_config);
  if (!config.enabled) {
    return 'healthy';
  }

  const daysSinceLastFed = getEffectiveDaysSinceLastFed(student.last_fed_at, config);

  if (daysSinceLastFed >= config.sleeping_days) {
    return 'sleeping';
  }

  if (daysSinceLastFed >= config.weak_days) {
    return 'weak';
  }

  if (daysSinceLastFed >= config.hungry_days) {
    return 'hungry';
  }

  return 'healthy';
};

const getDailyDecayForDay = (dayIndex, config) => {
  if (dayIndex >= config.sleeping_days) {
    return Number(config.sleeping_decay || 0);
  }

  if (dayIndex >= config.weak_days) {
    return Number(config.weak_decay || 0);
  }

  if (dayIndex >= config.hungry_days) {
    return Number(config.hungry_decay || 0);
  }

  return 0;
};

const degradeStudentToEgg = (student) => {
  const collection = parseServerPetCollection(student?.pet_collection, student);
  const currentIndex = collection.findIndex((entry) => entry.status === 'active' || entry.status === 'active-egg');
  const completedAt = nowIso();
  const nextCollection = [...collection];

  if (currentIndex >= 0) {
    nextCollection[currentIndex] = {
      ...nextCollection[currentIndex],
      pet_type_id: student?.pet_type_id || nextCollection[currentIndex].pet_type_id || null,
      pet_name: student?.pet_name || nextCollection[currentIndex].pet_name || '未命名伙伴',
      pet_level: 0,
      status: 'active-egg',
      completed_at: null,
      adopted_at: nextCollection[currentIndex].adopted_at || completedAt,
    };
  } else {
    nextCollection.push({
      id: createCollectionId(student?.id),
      pet_type_id: null,
      pet_name: '神秘蛋',
      pet_level: 0,
      adopted_at: completedAt,
      completed_at: null,
      status: 'active-egg',
    });
  }

  return {
    ...student,
    pet_status: 'egg',
    pet_condition: 'healthy',
    last_fed_at: null,
    last_decay_at: null,
    pet_condition_locked_at: null,
    pet_name: null,
    pet_type_id: null,
    pet_level: 0,
    pet_points: 0,
    total_exp: 0,
    pet_collection: nextCollection,
  };
};

const applyPetDecayToRow = (student, levelThresholds, config) => {
  if (!config.enabled) {
    const nextCondition = student?.pet_status === 'egg' ? 'healthy' : 'healthy';
    const changed =
      (student?.pet_condition || 'healthy') !== nextCondition
      || (student?.pet_condition_locked_at || null) !== null;
    return {
      student: {
        ...student,
        pet_condition: nextCondition,
        pet_condition_locked_at: null,
      },
      changed,
      decayedExp: 0,
      revertedToEgg: false,
      nextCondition,
    };
  }

  if (!student || student.pet_status === 'egg' || !student.last_fed_at) {
    return {
      student,
      changed: false,
      decayedExp: 0,
      revertedToEgg: false,
      nextCondition: derivePetCondition(student),
    };
  }

  const lastFedAtMs = new Date(student.last_fed_at).getTime();
  if (Number.isNaN(lastFedAtMs)) {
    return {
      student,
      changed: false,
      decayedExp: 0,
      revertedToEgg: false,
      nextCondition: derivePetCondition(student),
    };
  }

  const decayBaseMs = student.last_decay_at ? new Date(student.last_decay_at).getTime() : lastFedAtMs;
  const safeDecayBaseMs = Number.isNaN(decayBaseMs) ? lastFedAtMs : decayBaseMs;
  const currentDayIndex = getEffectiveDaysSinceLastFed(student.last_fed_at, config);
  const lastSettledDayIndex = Math.max(0, countEffectiveDaysBetween(lastFedAtMs, safeDecayBaseMs, config));

  let totalDecay = 0;
  for (let dayIndex = lastSettledDayIndex + 1; dayIndex <= currentDayIndex; dayIndex += 1) {
    totalDecay += getDailyDecayForDay(dayIndex, config);
  }

  let nextStudent = {
    ...student,
    last_decay_at: currentDayIndex > lastSettledDayIndex ? nowIso() : student.last_decay_at || student.last_fed_at,
  };
  let revertedToEgg = false;

  if (totalDecay > 0) {
    const nextTotalExp = Math.max(0, Number(student.total_exp || 0) - totalDecay);
    nextStudent = {
      ...nextStudent,
      total_exp: nextTotalExp,
      pet_points: nextTotalExp,
      pet_level: nextTotalExp > 0 ? resolvePetLevel(nextTotalExp, levelThresholds) : 0,
    };

    if (nextTotalExp <= 0) {
      nextStudent = degradeStudentToEgg(nextStudent);
      revertedToEgg = true;
    } else {
      nextStudent.pet_collection = syncStudentCollectionProgress(nextStudent);
    }
  }

  const nextCondition = derivePetCondition(nextStudent);
  nextStudent.pet_condition = nextStudent.pet_status === 'egg' ? 'healthy' : nextCondition;
  nextStudent.pet_condition_locked_at =
    nextStudent.pet_status === 'egg'
      ? null
      : nextCondition === 'sleeping'
        ? nextStudent.pet_condition_locked_at || nowIso()
        : null;

  const changed =
    totalDecay > 0
    || (student.pet_condition || 'healthy') !== nextStudent.pet_condition
    || (student.pet_condition_locked_at || null) !== (nextStudent.pet_condition_locked_at || null)
    || (student.last_decay_at || null) !== (nextStudent.last_decay_at || null)
    || student.pet_status !== nextStudent.pet_status;

  return {
    student: nextStudent,
    changed,
    decayedExp: totalDecay,
    revertedToEgg,
    nextCondition: nextStudent.pet_condition,
  };
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
  pet_condition: derivePetCondition(row),
  last_fed_at: row.last_fed_at || null,
  last_decay_at: row.last_decay_at || null,
  pet_condition_locked_at: row.pet_condition_locked_at || null,
  pet_name: row.pet_name,
  pet_type_id: row.pet_type_id,
  pet_level: Number(row.pet_level || 0),
  pet_points: Number(row.pet_points || 0),
  coins: Number(row.coins || 0),
  total_exp: Number(row.total_exp || 0),
  lifetime_exp: Number(row.lifetime_exp || 0),
  total_coins: Number(row.total_coins || 0),
  reward_count: Number(row.reward_count || 0),
  pet_collection: parsePetCollection(row.pet_collection),
  group_name: (() => {
    const raw = row.group_name;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [raw];
    }
  })(),
});

const normalizePetConditionConfig = (value) => {
  let parsed = value;

  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = null;
    }
  }

  const enabled = parsed?.enabled === undefined
    ? DEFAULT_PET_CONDITION_CONFIG.enabled
    : parsed?.enabled === true || parsed?.enabled === 'true' || parsed?.enabled === 1 || parsed?.enabled === '1';
  const skipWeekends = parsed?.skip_weekends === undefined
    ? DEFAULT_PET_CONDITION_CONFIG.skip_weekends
    : parsed?.skip_weekends === true
      || parsed?.skip_weekends === 'true'
      || parsed?.skip_weekends === 1
      || parsed?.skip_weekends === '1';
  const pauseStartDate = typeof parsed?.pause_start_date === 'string' && parsed.pause_start_date.trim()
    ? parsed.pause_start_date.trim()
    : null;
  const pauseEndDate = typeof parsed?.pause_end_date === 'string' && parsed.pause_end_date.trim()
    ? parsed.pause_end_date.trim()
    : null;
  const hungryDays = Math.max(1, Number(parsed?.hungry_days || DEFAULT_PET_CONDITION_CONFIG.hungry_days));
  const weakDays = Math.max(hungryDays + 1, Number(parsed?.weak_days || DEFAULT_PET_CONDITION_CONFIG.weak_days));
  const sleepingDays = Math.max(weakDays + 1, Number(parsed?.sleeping_days || DEFAULT_PET_CONDITION_CONFIG.sleeping_days));
  const hungryDecay = Math.max(0, Number(parsed?.hungry_decay ?? DEFAULT_PET_CONDITION_CONFIG.hungry_decay));
  const weakDecay = Math.max(0, Number(parsed?.weak_decay ?? DEFAULT_PET_CONDITION_CONFIG.weak_decay));
  const sleepingDecay = Math.max(0, Number(parsed?.sleeping_decay ?? DEFAULT_PET_CONDITION_CONFIG.sleeping_decay));

  return {
    enabled,
    skip_weekends: skipWeekends,
    pause_start_date: pauseStartDate,
    pause_end_date: pauseEndDate,
    hungry_days: hungryDays,
    weak_days: weakDays,
    sleeping_days: sleepingDays,
    hungry_decay: hungryDecay,
    weak_decay: weakDecay,
    sleeping_decay: sleepingDecay,
  };
};

const normalizeShopItem = (row) => ({
  id: Number(row.id),
  class_id: Number(row.class_id),
  name: row.name,
  icon: row.icon,
  item_type: row.item_type || 'gift',
  exp_value: Number(row.exp_value || 0),
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
  sort_order: Number(row.sort_order || 0),
  isSystem: row.class_id === null,
});

const normalizeActivationCode = (row) => ({
  id: Number(row.id),
  code: row.code,
  level: row.level,
  expires_in_days: row.expires_in_days === null ? null : Number(row.expires_in_days),
  max_uses: Number(row.max_uses || 1),
  used_count: Number(row.used_count || 0),
  status: row.status || 'active',
  used_by_user_id: row.used_by_user_id === null ? null : Number(row.used_by_user_id),
  used_at: row.used_at,
  used_by_nickname: row.used_by_nickname || null,
  created_by_user_id: row.created_by_user_id === null ? null : Number(row.created_by_user_id),
  created_by_nickname: row.created_by_nickname || null,
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
  const operator = row.operator || '系统';
  const actionType = row.action_type;

  return {
    id: Number(row.id),
    action: actionType,
    actionType,
    detail: row.detail,
    time: formatLogTime(row.created_at),
    created_at: row.created_at,
    operator,
    user_nickname: operator,
    canUndo: Boolean(meta?.undoable && !meta?.undone),
    meta,
  };
};

const normalizeStudentLog = (row) => ({
  id: Number(row.id),
  action: row.action,
  ruleName: row.rule_name,
  ruleIcon: row.rule_icon,
  expDelta: Number(row.exp_delta || 0),
  coinsDelta: Number(row.coins_delta || 0),
  expAfter: Number(row.exp_after || 0),
  coinsAfter: Number(row.coins_after || 0),
  levelAfter: Number(row.level_after || 0),
  createdAt: row.created_at,
});

const normalizeUser = (row) => ({
  id: Number(row.id),
  username: row.username,
  nickname: row.nickname,
  level: row.level,
  expire_at: row.expire_at,
  role: row.role || 'teacher',
  status: row.status || 'active',
  register_source: row.register_source || 'activation_code',
  source_note: row.source_note || null,
  register_channel: row.register_channel || null,
  register_ip: row.register_ip || null,
  register_user_agent: row.register_user_agent || null,
  same_ip_count: Number(row.same_ip_count || 0),
});

const normalizeRegistrationChannel = (row) => ({
  id: Number(row.id),
  code: row.code,
  name: row.name,
  enabled: Boolean(row.enabled),
  require_activation: Boolean(row.require_activation),
  default_level: sanitizeFreeRegisterLevel(row.default_level),
  end_at: row.end_at || null,
  note: row.note || '',
  updated_by_user_id: row.updated_by_user_id === null ? null : Number(row.updated_by_user_id),
  created_at: row.created_at || null,
  updated_at: row.updated_at || null,
});

const normalizeSystemFlag = (row) => {
  if (!row) {
    return {
      key: 'free_register',
      enabled: false,
      mode: 'permanent',
      end_at: null,
      value: { default_level: 'temporary' },
      updated_by_user_id: null,
      updated_at: null,
    };
  }

  let value = {};

  if (typeof row?.value_json === 'string' && row.value_json.trim()) {
    try {
      value = JSON.parse(row.value_json) || {};
    } catch {
      value = {};
    }
  }

  return {
    key: row.key,
    enabled: Boolean(row.enabled),
    mode: row.mode || 'permanent',
    end_at: row.end_at || null,
    value,
    updated_by_user_id: row.updated_by_user_id === null ? null : Number(row.updated_by_user_id),
    updated_at: row.updated_at || null,
  };
};

const normalizeAdminLog = (row) => ({
  id: Number(row.id),
  action: row.action_type,
  detail: row.detail,
  created_at: row.created_at,
  operator: row.operator || '系统',
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

async function ensureUserRuleTemplates(db, userId) {
  if (!userId) {
    return;
  }

  const countRow = await db
    .prepare('SELECT COUNT(*) AS count FROM rules WHERE class_id IS NULL AND owner_user_id = ?')
    .bind(userId)
    .first();

  if (Number(countRow?.count || 0) > 0) {
    return;
  }

  const statements = SYSTEM_RULES.map((rule, index) =>
    db
      .prepare('INSERT INTO rules (class_id, owner_user_id, sort_order, name, icon, exp, coins, type) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)')
      .bind(userId, index + 1, rule.name, rule.icon, rule.exp, rule.coins, rule.type),
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

async function ensureSystemFlags(db) {
  await db
    .prepare(
      `INSERT OR IGNORE INTO system_flags (key, enabled, mode, end_at, value_json)
       VALUES ('free_register', 0, 'permanent', NULL, ?)`,
    )
    .bind(JSON.stringify({ default_level: 'temporary' }))
    .run();

  await db
    .prepare(
      `INSERT OR IGNORE INTO system_flags (key, enabled, mode, end_at, value_json)
       VALUES ('toolbox_access', 1, 'permanent', NULL, ?)`,
    )
    .bind(JSON.stringify(DEFAULT_TOOLBOX_ACCESS))
    .run();
}

async function ensureClassSettings(db, classId) {
  const existing = await db.prepare('SELECT class_id FROM class_settings WHERE class_id = ?').bind(classId).first();

  if (existing) {
    return;
  }

  await db
    .prepare('INSERT INTO class_settings (class_id, level_thresholds, pet_condition_config, smart_seating_config) VALUES (?, ?, ?, NULL)')
    .bind(classId, JSON.stringify(DEFAULT_LEVEL_THRESHOLDS), JSON.stringify(DEFAULT_PET_CONDITION_CONFIG))
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
         RETURNING id, username, nickname, level, expire_at, role, status, register_source, source_note, register_channel, register_ip, register_user_agent`,
      )
      .bind(user.id)
      .first();

    return refreshed;
  }

  return user;
}

async function getUserById(db, userId) {
  const rawUser = await db
    .prepare(
      `SELECT id, username, nickname, level, expire_at, role, status, register_source, source_note, register_ip, register_user_agent
       , register_channel
       FROM users
       WHERE id = ?`,
    )
    .bind(userId)
    .first();

  if (!rawUser) {
    throw new Error('教师账号不存在，请重新登录');
  }

  if (rawUser.status === 'disabled') {
    throw new Error('该账号已被停用，请联系管理员');
  }

  return refreshMembershipIfNeeded(db, rawUser);
}

async function getUserWithPassword(db, username) {
  const rawUser = await db
    .prepare(
      `SELECT id, username, password_hash, nickname, level, expire_at, role, status, register_source, source_note, register_ip, register_user_agent
       , register_channel
       FROM users
       WHERE username = ?`,
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

async function assertSuperAdmin(db, userId) {
  const user = await getUserById(db, userId);

  if (user.role !== 'super_admin') {
    throw new Error('仅超管账号可访问该后台');
  }

  return user;
}

function sanitizeCodeStatus(value) {
  return ['active', 'revoked', 'used'].includes(value) ? value : 'active';
}

function sanitizeFreeRegisterMode(value) {
  return value === 'until' ? 'until' : 'permanent';
}

function sanitizeFreeRegisterLevel(value) {
  return ['temporary', 'vip1', 'vip2'].includes(value) ? value : 'temporary';
}

function sanitizeChannelCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32);
}

function sanitizeToolboxLevel(value) {
  return ['temporary', 'vip1', 'vip2', 'permanent'].includes(value) ? value : 'temporary';
}

function resolveFreeRegisterState(flag) {
  const normalized = flag || {
    key: 'free_register',
    enabled: false,
    mode: 'permanent',
    end_at: null,
    value: { default_level: 'temporary' },
    updated_by_user_id: null,
    updated_at: null,
  };
  const mode = sanitizeFreeRegisterMode(normalized.mode);
  const endAt = normalized.end_at || null;
  const defaultLevel = sanitizeFreeRegisterLevel(normalized.value?.default_level);
  const endTimestamp = endAt ? new Date(endAt).getTime() : NaN;
  const windowOpen = mode !== 'until' || (Number.isFinite(endTimestamp) && endTimestamp > Date.now());

  return {
    ...normalized,
    mode,
    end_at: endAt,
    value: {
      ...normalized.value,
      default_level: defaultLevel,
    },
    is_active: Boolean(normalized.enabled) && windowOpen,
  };
}

async function getFreeRegisterFlag(db) {
  await ensureSystemFlags(db);

  const row = await db
    .prepare(
      `SELECT key, enabled, mode, end_at, value_json, updated_by_user_id, updated_at
       FROM system_flags
       WHERE key = 'free_register'`,
    )
    .first();

  return resolveFreeRegisterState(normalizeSystemFlag(row));
}

async function getToolboxAccessFlag(db) {
  await ensureSystemFlags(db);

  const row = await db
    .prepare(
      `SELECT key, enabled, mode, end_at, value_json, updated_by_user_id, updated_at
       FROM system_flags
       WHERE key = 'toolbox_access'`,
    )
    .first();

  const normalized = normalizeSystemFlag(row);
  const value = { ...DEFAULT_TOOLBOX_ACCESS };
  const rawValue = normalized?.value || {};

  Object.keys(DEFAULT_TOOLBOX_ACCESS).forEach((toolId) => {
    value[toolId] = sanitizeToolboxLevel(rawValue[toolId]);
  });

  return {
    key: 'toolbox_access',
    value,
    updated_by_user_id: normalized.updated_by_user_id,
    updated_at: normalized.updated_at,
  };
}

function resolveRegistrationChannelState(channel) {
  if (!channel) {
    return null;
  }

  const endAt = channel.end_at || null;
  const endTimestamp = endAt ? new Date(endAt).getTime() : NaN;
  const windowOpen = !endAt || (Number.isFinite(endTimestamp) && endTimestamp > Date.now());

  return {
    ...channel,
    is_active: Boolean(channel.enabled) && windowOpen,
  };
}

async function getRegistrationChannelByCode(db, code) {
  const normalizedCode = sanitizeChannelCode(code);
  if (!normalizedCode) {
    return null;
  }

  const row = await db
    .prepare(
      `SELECT id, code, name, enabled, require_activation, default_level, end_at, note, updated_by_user_id, created_at, updated_at
       FROM registration_channels
       WHERE code = ?`,
    )
    .bind(normalizedCode)
    .first();

  return resolveRegistrationChannelState(row ? normalizeRegistrationChannel(row) : null);
}

async function listRegistrationChannels(db) {
  const result = await db
    .prepare(
      `SELECT id, code, name, enabled, require_activation, default_level, end_at, note, updated_by_user_id, created_at, updated_at
       FROM registration_channels
       ORDER BY created_at DESC, id DESC`,
    )
    .all();

  return (result.results || []).map((row) => resolveRegistrationChannelState(normalizeRegistrationChannel(row)));
}

function generateActivationCode(prefix = 'CLASS') {
  const cleanedPrefix = String(prefix || 'CLASS').replace(/[^A-Z0-9-]/g, '').slice(0, 12) || 'CLASS';
  const seed = Math.random().toString(36).slice(2, 8).toUpperCase();
  const stamp = Date.now().toString(36).slice(-4).toUpperCase();
  return `${cleanedPrefix}-${seed}-${stamp}`;
}

function getClientIp(request) {
  const cfIp = request.headers.get('CF-Connecting-IP')?.trim();
  if (cfIp) {
    return cfIp;
  }

  const xff = request.headers.get('X-Forwarded-For') || '';
  const firstIp = xff.split(',')[0]?.trim();
  if (firstIp) {
    return firstIp;
  }

  return 'unknown';
}

function getUserAgent(request) {
  return request.headers.get('User-Agent') || '';
}

function parseDbTimestamp(value) {
  if (!value) {
    return NaN;
  }

  const normalized = String(value).includes('T')
    ? String(value)
    : String(value).replace(' ', 'T');
  const timestamp = new Date(normalized.endsWith('Z') ? normalized : `${normalized}Z`);
  return timestamp.getTime();
}

function formatUtcMsToDbTimestamp(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const date = new Date(value);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function formatRetryHint(retryAfterSeconds) {
  if (!Number.isFinite(retryAfterSeconds) || retryAfterSeconds <= 0) {
    return '稍后再试';
  }

  if (retryAfterSeconds < 60) {
    return `${retryAfterSeconds} 秒后再试`;
  }

  return `${Math.ceil(retryAfterSeconds / 60)} 分钟后再试`;
}

async function getRegistrationAttemptsCount(db, ip, intervalSql) {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM registration_attempts
       WHERE ip = ?
         AND result IN ('failed', 'success')
         AND created_at >= datetime('now', ?)`,
    )
    .bind(ip, intervalSql)
    .first();

  return Number(row?.count || 0);
}

async function getRegisterRetryAfterSeconds(db, ip, limit, windowSeconds) {
  const result = await db
    .prepare(
      `SELECT created_at
       FROM registration_attempts
       WHERE ip = ?
         AND result IN ('failed', 'success')
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
    )
    .bind(ip, limit)
    .all();

  const rows = result.results || [];
  const pivot = rows[rows.length - 1];
  if (!pivot?.created_at) {
    return windowSeconds;
  }

  const pivotTimestamp = parseDbTimestamp(pivot.created_at);
  if (!Number.isFinite(pivotTimestamp)) {
    return windowSeconds;
  }

  const retryAt = pivotTimestamp + windowSeconds * 1000;
  return Math.max(1, Math.ceil((retryAt - Date.now()) / 1000));
}

async function checkRegisterRateLimit(db, ip) {
  const shortCount = await getRegistrationAttemptsCount(db, ip, `-${REGISTER_RATE_LIMIT.shortWindowMinutes} minutes`);
  if (shortCount >= REGISTER_RATE_LIMIT.shortLimit) {
    const retryAfterSeconds = await getRegisterRetryAfterSeconds(
      db,
      ip,
      REGISTER_RATE_LIMIT.shortLimit,
      REGISTER_RATE_LIMIT.shortWindowMinutes * 60,
    );
    return {
      blocked: true,
      reason: `short_window_${REGISTER_RATE_LIMIT.shortWindowMinutes}m`,
      retryAfterSeconds,
    };
  }

  const longCount = await getRegistrationAttemptsCount(db, ip, `-${REGISTER_RATE_LIMIT.longWindowHours} hours`);
  if (longCount >= REGISTER_RATE_LIMIT.longLimit) {
    const retryAfterSeconds = await getRegisterRetryAfterSeconds(
      db,
      ip,
      REGISTER_RATE_LIMIT.longLimit,
      REGISTER_RATE_LIMIT.longWindowHours * 60 * 60,
    );
    return {
      blocked: true,
      reason: `long_window_${REGISTER_RATE_LIMIT.longWindowHours}h`,
      retryAfterSeconds,
    };
  }

  return { blocked: false, reason: '', retryAfterSeconds: 0 };
}

async function appendRegistrationAttempt(db, { ip, username, result, reason = '', userAgent = '' }) {
  await db
    .prepare(
      `INSERT INTO registration_attempts (ip, username, mode, result, reason, user_agent)
       VALUES (?, ?, 'register', ?, ?, ?)`,
    )
    .bind(ip, username || null, result, reason || null, userAgent || null)
    .run();
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
      `SELECT s.*, cs.pet_condition_config
       FROM students s
       JOIN classes c ON c.id = s.class_id
       LEFT JOIN class_settings cs ON cs.class_id = s.class_id
       WHERE s.id = ? AND c.user_id = ?`,
    )
    .bind(studentId, userId)
    .first();

  if (!student) {
    throw new Error('未找到对应学生，或当前账号无权访问');
  }

  return student;
}

async function reconcileStudentConditions(db, classId, userId = null) {
  const levelThresholds = await getThresholdsByClassId(db, classId);
  const result = await db
    .prepare(
      `SELECT students.id AS id,
              students.class_id AS class_id,
              students.name AS name,
              students.pet_status AS pet_status,
              students.pet_condition AS pet_condition,
              students.last_fed_at AS last_fed_at,
              students.last_decay_at AS last_decay_at,
              students.pet_condition_locked_at AS pet_condition_locked_at,
              students.pet_name AS pet_name,
              students.pet_type_id AS pet_type_id,
              students.pet_level AS pet_level,
              students.pet_points AS pet_points,
              students.coins AS coins,
              students.total_exp AS total_exp,
              students.lifetime_exp AS lifetime_exp,
              students.total_coins AS total_coins,
              students.reward_count AS reward_count,
              students.pet_collection AS pet_collection,
              students.created_at AS created_at,
              students.group_name AS group_name,
              cs.pet_condition_config
       FROM students
       LEFT JOIN class_settings cs ON cs.class_id = students.class_id
       WHERE students.class_id = ?
       ORDER BY students.created_at ASC, students.id ASC`,
    )
    .bind(classId)
    .all();

  const rows = result.results || [];
  const updates = [];

  for (const row of rows) {
    const config = normalizePetConditionConfig(row.pet_condition_config);
    const currentCondition = row.pet_condition || 'healthy';
    const currentStatus = row.pet_status;
    const decayResult = applyPetDecayToRow(row, levelThresholds, config);
    const nextStudent = decayResult.student;

    if (decayResult.changed) {
      updates.push(
        db
          .prepare(
            `UPDATE students
             SET pet_status = ?, pet_condition = ?, last_fed_at = ?, last_decay_at = ?, pet_condition_locked_at = ?,
                 pet_name = ?, pet_type_id = ?, pet_level = ?, pet_points = ?, total_exp = ?, pet_collection = ?
             WHERE id = ?`,
          )
          .bind(
            nextStudent.pet_status,
            nextStudent.pet_condition,
            nextStudent.last_fed_at,
            nextStudent.last_decay_at,
            nextStudent.pet_condition_locked_at,
            nextStudent.pet_name,
            nextStudent.pet_type_id,
            nextStudent.pet_level,
            nextStudent.pet_points,
            nextStudent.total_exp,
            // 确保写回的是数组而非字符串，防止 pet_collection 被双重 JSON 序列化
            // totalDecay=0 时 nextStudent.pet_collection 仍是 DB 原始字符串，直接 stringify 会双重编码
            JSON.stringify(parsePetCollection(nextStudent.pet_collection)),
            row.id,
          ),
      );
      Object.assign(row, nextStudent);

      if (userId && currentCondition !== 'sleeping' && decayResult.nextCondition === 'sleeping' && currentStatus !== 'egg') {
        await appendLog(db, {
          classId,
          userId,
          actionType: '宠物休眠',
          detail: `${row.name} 的宠物因超过 ${config.sleeping_days} 天未照料，进入了休眠状态`,
        });
      }

      if (userId && decayResult.decayedExp > 0) {
        await appendLog(db, {
          classId,
          userId,
          actionType: '宠物衰减',
          detail: decayResult.revertedToEgg
            ? `${row.name} 的宠物因长期未照料，经验衰减 ${decayResult.decayedExp} 点并退化成了神秘蛋`
            : `${row.name} 的宠物因长期未照料，经验衰减 ${decayResult.decayedExp} 点`,
        });
      }
    }
  }

  if (updates.length > 0) {
    await db.batch(updates);
  }

  return rows;
}

async function getStudentsByClassId(db, classId, userId = null) {
  const rows = await reconcileStudentConditions(db, classId, userId);
  return rows.map(normalizeStudent);
}

async function getShopItemsByClassId(db, classId) {
  const result = await db
    .prepare(
      `SELECT id, class_id, name, icon, item_type, exp_value, price, stock
       FROM shop_items
       WHERE class_id = ?
       ORDER BY created_at DESC, id DESC`,
    )
    .bind(classId)
    .all();

  return (result.results || []).map(normalizeShopItem);
}

async function getRulesByClassId(db, classId, userId) {
  const result = await db
    .prepare(
      `SELECT id, class_id, owner_user_id, sort_order, name, icon, exp, coins, type
       FROM rules
       WHERE ((class_id = ? AND (owner_user_id = ? OR owner_user_id IS NULL))
          OR (class_id IS NULL AND owner_user_id = ?))
       ORDER BY type ASC, sort_order ASC, id ASC`,
    )
    .bind(classId, userId, userId)
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

async function getPetConditionConfigByClassId(db, classId) {
  await ensureClassSettings(db, classId);

  const settings = await db
    .prepare('SELECT pet_condition_config FROM class_settings WHERE class_id = ?')
    .bind(classId)
    .first();

  return normalizePetConditionConfig(settings?.pet_condition_config);
}

async function getSmartSeatingConfigByClassId(db, classId) {
  await ensureClassSettings(db, classId);

  const settings = await db
    .prepare('SELECT smart_seating_config FROM class_settings WHERE class_id = ?')
    .bind(classId)
    .first();

  if (!settings?.smart_seating_config) {
    return null;
  }

  try {
    const parsed = JSON.parse(settings.smart_seating_config);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

async function getLastBulkFedAt(db, classId) {
  await ensureClassSettings(db, classId);

  const settings = await db
    .prepare('SELECT last_bulk_fed_at FROM class_settings WHERE class_id = ?')
    .bind(classId)
    .first();

  return settings?.last_bulk_fed_at || null;
}

async function appendLog(db, { classId, userId, actionType, detail, meta = null }) {
  await db
    .prepare('INSERT INTO logs (class_id, user_id, action_type, detail, meta) VALUES (?, ?, ?, ?, ?)')
    .bind(classId, userId, actionType, detail, meta ? JSON.stringify(meta) : null)
    .run();
}

async function appendStudentLog(db, { classId, studentId, action, ruleName, ruleIcon, expDelta, coinsDelta, expAfter, coinsAfter, levelAfter }) {
  await db
    .prepare(
      `INSERT INTO student_logs
       (class_id, student_id, action, rule_name, rule_icon, exp_delta, coins_delta, exp_after, coins_after, level_after)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(classId, studentId, action, ruleName, ruleIcon, expDelta, coinsDelta, expAfter, coinsAfter, levelAfter)
    .run();
}

async function getStudentLogsByStudentId(db, classId, studentId, limit = 50, offset = 0) {
  const result = await db
    .prepare(
      `SELECT id, action, rule_name, rule_icon, exp_delta, coins_delta, exp_after, coins_after, level_after, created_at
       FROM student_logs
       WHERE class_id = ? AND student_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`
    )
    .bind(classId, studentId, limit, offset)
    .all();

  const countResult = await db
    .prepare('SELECT COUNT(*) as total FROM student_logs WHERE class_id = ? AND student_id = ?')
    .bind(classId, studentId)
    .first();

  return {
    logs: (result.results || []).map(normalizeStudentLog),
    total: Number(countResult?.total || 0)
  };
}

async function appendAdminLog(db, { userId, actionType, detail }) {
  await db
    .prepare('INSERT INTO admin_logs (user_id, action_type, detail) VALUES (?, ?, ?)')
    .bind(userId, actionType, detail)
    .run();
}

async function getAdminLogs(db) {
  const result = await db
    .prepare(
      `SELECT l.id, l.action_type, l.detail, l.created_at, u.nickname AS operator
       FROM admin_logs l
       LEFT JOIN users u ON u.id = l.user_id
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT 60`,
    )
    .all();

  return (result.results || []).map(normalizeAdminLog);
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
  await ensureActivationCodes(db);
  await ensureSystemFlags(db);

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
      petConditionConfig: DEFAULT_PET_CONDITION_CONFIG,
      toolboxAccess: (await getToolboxAccessFlag(db)).value,
    };
  }

  return {
    user,
    classes,
    currentClassId: resolvedClassId,
    students: await getStudentsByClassId(db, resolvedClassId, userId),
    shopItems: await getShopItemsByClassId(db, resolvedClassId),
    rules: await getRulesByClassId(db, resolvedClassId, userId),
    logs: await getLogsByClassId(db, resolvedClassId),
    levelThresholds: await getThresholdsByClassId(db, resolvedClassId),
    petConditionConfig: await getPetConditionConfigByClassId(db, resolvedClassId),
    smartSeatingConfig: await getSmartSeatingConfigByClassId(db, resolvedClassId),
    toolboxAccess: (await getToolboxAccessFlag(db)).value,
    lastBulkFedAt: await getLastBulkFedAt(db, resolvedClassId),
  };
}

async function handleLogin(db, request) {
  await ensureActivationCodes(db);
  await ensureSystemFlags(db);

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
    const channelCode = sanitizeChannelCode(body.channelCode);
    const freeRegisterFlag = await getFreeRegisterFlag(db);
    const registrationChannel = channelCode ? await getRegistrationChannelByCode(db, channelCode) : null;
    const registerIp = getClientIp(request);
    const userAgent = getUserAgent(request);
    const denyRegister = async (message, status = 400, reason = 'validation_failed', retryAfterSeconds = 0) => {
      if (status !== 429) {
        await appendRegistrationAttempt(db, {
          ip: registerIp,
          username,
          result: 'failed',
          reason,
          userAgent,
        });
      }

      if (status === 429 && retryAfterSeconds > 0) {
        return errorWithHeaders(message, status, {
          'Retry-After': String(retryAfterSeconds),
        });
      }

      return error(message, status);
    };

    const limitState = await checkRegisterRateLimit(db, registerIp);
    if (limitState.blocked) {
      return await denyRegister(
        `注册过于频繁，请${formatRetryHint(limitState.retryAfterSeconds)}`,
        429,
        limitState.reason,
        limitState.retryAfterSeconds,
      );
    }

    if (!nickname) {
      return await denyRegister('请输入展示昵称', 400, 'empty_nickname');
    }

    const existingUser = await db
      .prepare('SELECT id FROM users WHERE username = ?')
      .bind(username)
      .first();

    if (existingUser) {
      return await denyRegister('该账号已存在，请更换用户名', 400, 'duplicate_username');
    }

    const canUseChannelRegister = Boolean(registrationChannel?.is_active && !registrationChannel.require_activation);
    const shouldForceActivationByChannel = Boolean(registrationChannel?.is_active && registrationChannel.require_activation);

    if (canUseChannelRegister) {
      const passwordHash = await hashPassword(password);
      const expireAt = computeExpireAt(FREE_REGISTER_LEVEL_EXPIRES_IN_DAYS[registrationChannel.default_level]);
      const createdUser = await db
        .prepare(
          `INSERT INTO users (username, password_hash, nickname, level, expire_at, role, register_source, source_note, register_channel, register_ip, register_user_agent)
           VALUES (?, ?, ?, ?, ?, 'teacher', 'channel_register', ?, ?, ?, ?)
           RETURNING id, username, nickname, level, expire_at, role, status, register_source, source_note, register_channel, register_ip, register_user_agent`,
        )
        .bind(
          username,
          passwordHash,
          nickname,
          registrationChannel.default_level,
          expireAt,
          `渠道免激活注册：${registrationChannel.name}${registrationChannel.end_at ? `，截止 ${registrationChannel.end_at}` : ''}`,
          registrationChannel.code,
          registerIp,
          userAgent,
        )
        .first();

      await appendRegistrationAttempt(db, {
        ip: registerIp,
        username,
        result: 'success',
        reason: `channel_register:${registrationChannel.code}`,
        userAgent,
      });

      await appendAdminLog(db, {
        userId: createdUser.id,
        actionType: '账号管理',
        detail: `账号 ${createdUser.username} 通过渠道 ${registrationChannel.code} 免激活注册创建，默认等级 ${createdUser.level}，注册IP ${registerIp}`,
      });
      await ensureUserRuleTemplates(db, createdUser.id);

      return json({
        user: normalizeUser(createdUser),
        currentClassId: null,
      });
    }

    if (!shouldForceActivationByChannel && freeRegisterFlag.is_active) {
      const passwordHash = await hashPassword(password);
      const expireAt = computeExpireAt(FREE_REGISTER_LEVEL_EXPIRES_IN_DAYS[freeRegisterFlag.value.default_level]);
      const createdUser = await db
        .prepare(
          `INSERT INTO users (username, password_hash, nickname, level, expire_at, role, register_source, source_note, register_channel, register_ip, register_user_agent)
           VALUES (?, ?, ?, ?, ?, 'teacher', 'free_register', ?, NULL, ?, ?)
           RETURNING id, username, nickname, level, expire_at, role, status, register_source, source_note, register_channel, register_ip, register_user_agent`,
        )
        .bind(
          username,
          passwordHash,
          nickname,
          freeRegisterFlag.value.default_level,
          expireAt,
          `免激活注册${freeRegisterFlag.mode === 'until' && freeRegisterFlag.end_at ? `，有效期截止 ${freeRegisterFlag.end_at}` : ''}`,
          registerIp,
          userAgent,
        )
        .first();

      await appendRegistrationAttempt(db, {
        ip: registerIp,
        username,
        result: 'success',
        reason: 'free_register',
        userAgent,
      });

      await appendAdminLog(db, {
        userId: createdUser.id,
        actionType: '账号管理',
        detail: `账号 ${createdUser.username} 通过免激活注册创建，默认等级 ${createdUser.level}，注册IP ${registerIp}`,
      });
      await ensureUserRuleTemplates(db, createdUser.id);

      return json({
        user: normalizeUser(createdUser),
        currentClassId: null,
      });
    }

    if (!activationCodeValue) {
      return await denyRegister('请输入有效的激活码', 400, 'empty_activation_code');
    }

    const activationCode = await db
      .prepare(
        `SELECT id, code, level, expires_in_days, used_by_user_id, used_at, max_uses, used_count, status
         FROM activation_codes
         WHERE code = ?`,
      )
      .bind(activationCodeValue)
      .first();

    if (!activationCode) {
      return await denyRegister('激活码不存在，请联系管理员确认', 400, 'activation_code_not_found');
    }

    if (activationCode.status === 'revoked') {
      return await denyRegister('该激活码已作废', 400, 'activation_code_revoked');
    }

    if (Number(activationCode.used_count || 0) >= Number(activationCode.max_uses || 1)) {
      return await denyRegister('该激活码已被使用完毕', 400, 'activation_code_exhausted');
    }

    const passwordHash = await hashPassword(password);
    const expireAt = computeExpireAt(
      activationCode.expires_in_days === null ? null : Number(activationCode.expires_in_days),
    );

    const createdUser = await db
      .prepare(
        `INSERT INTO users (username, password_hash, nickname, level, expire_at, role, register_source, source_note, register_channel, register_ip, register_user_agent)
         VALUES (?, ?, ?, ?, ?, ?, 'activation_code', ?, ?, ?, ?)
         RETURNING id, username, nickname, level, expire_at, role, status, register_source, source_note, register_channel, register_ip, register_user_agent`,
      )
      .bind(
        username,
        passwordHash,
        nickname,
        activationCode.level,
        expireAt,
        activationCode.level === 'permanent' ? 'super_admin' : 'teacher',
        activationCode.code,
        registrationChannel?.is_active ? registrationChannel.code : null,
        registerIp,
        userAgent,
      )
      .first();

    await appendRegistrationAttempt(db, {
      ip: registerIp,
      username,
      result: 'success',
      reason: 'activation_code',
      userAgent,
    });

    await db
      .prepare(
        `UPDATE activation_codes
         SET used_by_user_id = ?,
             used_at = CURRENT_TIMESTAMP,
             used_count = used_count + 1,
             status = CASE
               WHEN used_count + 1 >= max_uses THEN 'used'
               ELSE status
             END
         WHERE id = ?`,
      )
      .bind(createdUser.id, activationCode.id)
      .run();
    await ensureUserRuleTemplates(db, createdUser.id);

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
        `INSERT INTO students (class_id, name, pet_status, pet_condition, last_fed_at, pet_condition_locked_at, pet_level, pet_points, coins, total_exp, total_coins)
         VALUES (?, ?, 'egg', 'healthy', NULL, NULL, 0, 0, 0, 0, 0)`,
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
    students: await getStudentsByClassId(db, classId, userId),
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
      `INSERT INTO students (class_id, name, pet_status, pet_condition, last_fed_at, pet_condition_locked_at, pet_level, pet_points, coins, total_exp, total_coins)
       VALUES (?, ?, 'egg', 'healthy', NULL, NULL, 0, 0, 0, 0, 0)`,
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
    students: await getStudentsByClassId(db, classId, userId),
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
    .prepare(`DELETE FROM student_logs WHERE student_id IN (${placeholders})`)
    .bind(...studentIds)
    .run();

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
    students: await getStudentsByClassId(db, classId, userId),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleSetStudentGroups(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);
  const assignments = Array.isArray(body.assignments) ? body.assignments : null;

  if (!userId || !classId || !assignments) {
    return error('参数不完整', 400);
  }

  await assertClassOwnership(db, userId, classId);

  const normalizedAssignments = assignments
    .map((assignment) => {
      const studentId = parseId(assignment?.studentId);
      if (!studentId) {
        return null;
      }

      const rawNames = Array.isArray(assignment?.groupNames) ? assignment.groupNames : [];
      const groupNames = [...new Set(
        rawNames
          .map((name) => String(name).trim())
          .filter(Boolean)
          .map((name) => name.slice(0, 20)),
      )];

      return {
        studentId,
        groupNames,
      };
    })
    .filter(Boolean);

  if (normalizedAssignments.length > 0) {
    await db.batch(
      normalizedAssignments.map(({ studentId, groupNames }) =>
        db
          .prepare('UPDATE students SET group_name = ? WHERE id = ? AND class_id = ?')
          .bind(groupNames.length > 0 ? JSON.stringify(groupNames) : null, studentId, classId),
      ),
    );
  }

  await appendLog(db, {
    classId,
    userId,
    actionType: '学生管理',
    detail: `更新了 ${normalizedAssignments.length} 名学生的分组`,
  });

  return json({
    updated: normalizedAssignments.length,
    students: await getStudentsByClassId(db, classId, userId),
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
  const currentCondition = derivePetCondition(currentStudent);

  if (Number(currentStudent.class_id) !== classId) {
    return error('学生与当前班级不匹配');
  }

  if (updates.archived) {
    await db.prepare('DELETE FROM student_logs WHERE student_id = ?').bind(studentId).run();
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

  const nextTotalExp = Math.max(0, Number(updates.total_exp ?? currentStudent.total_exp ?? 0));
  const prevTotalExp = Number(currentStudent.total_exp || 0);
  const prevLifetimeExp = Number(currentStudent.lifetime_exp || 0);
  // 若前端明确传入 lifetime_exp（如补录场景），直接取较大值；否则按 total_exp 增量累加
  // 优先用 total_exp 增量来累加 lifetime_exp（覆盖正常互动场景）
  // 仅当前端明确传入更高的 lifetime_exp 时才采纳（补录场景）
  const deltaLifetimeExp = nextTotalExp > prevTotalExp
    ? prevLifetimeExp + (nextTotalExp - prevTotalExp)
    : prevLifetimeExp;
  const nextLifetimeExp = updates.lifetime_exp !== undefined
    ? Math.max(deltaLifetimeExp, Number(updates.lifetime_exp || 0))
    : deltaLifetimeExp;

  const nextStudent = {
    name: nextName,
    pet_status: String(updates.pet_status ?? currentStudent.pet_status ?? 'egg'),
    pet_condition: String(updates.pet_condition ?? currentCondition),
    last_fed_at: updates.last_fed_at ?? currentStudent.last_fed_at ?? null,
    last_decay_at: updates.last_decay_at ?? currentStudent.last_decay_at ?? currentStudent.last_fed_at ?? null,
    pet_condition_locked_at: updates.pet_condition_locked_at ?? currentStudent.pet_condition_locked_at ?? null,
    pet_name: updates.pet_name ?? currentStudent.pet_name,
    pet_type_id: updates.pet_type_id ?? currentStudent.pet_type_id,
    pet_level: Math.max(0, Number(updates.pet_level ?? currentStudent.pet_level ?? 0)),
    pet_points: Math.max(0, Number(updates.pet_points ?? currentStudent.pet_points ?? 0)),
    coins: Math.max(0, Number(updates.coins ?? currentStudent.coins ?? 0)),
    total_exp: nextTotalExp,
    lifetime_exp: nextLifetimeExp,
    total_coins: Math.max(0, Number(updates.total_coins ?? currentStudent.total_coins ?? 0)),
    reward_count: Math.max(0, Number(updates.reward_count ?? currentStudent.reward_count ?? 0)),
    pet_collection: parsePetCollection(updates.pet_collection ?? currentStudent.pet_collection ?? '[]'),
  };

  if (currentStudent.pet_status === 'egg' && nextStudent.pet_status !== 'egg' && !nextStudent.last_fed_at) {
    nextStudent.last_fed_at = nowIso();
    nextStudent.last_decay_at = nextStudent.last_fed_at;
  }

  if (nextStudent.pet_status === 'egg') {
    nextStudent.pet_condition = 'healthy';
    nextStudent.last_fed_at = null;
    nextStudent.last_decay_at = null;
    nextStudent.pet_condition_locked_at = null;
  } else {
    nextStudent.pet_condition = derivePetCondition(nextStudent);
    nextStudent.pet_condition_locked_at =
      nextStudent.pet_condition === 'sleeping'
        ? nextStudent.pet_condition_locked_at || nowIso()
        : null;
  }

  await db
    .prepare(
      `UPDATE students
       SET name = ?, pet_status = ?, pet_condition = ?, last_fed_at = ?, last_decay_at = ?, pet_condition_locked_at = ?, pet_name = ?, pet_type_id = ?, pet_level = ?, pet_points = ?, coins = ?, total_exp = ?, lifetime_exp = ?, total_coins = ?, reward_count = ?, pet_collection = ?
       WHERE id = ?`,
    )
    .bind(
      nextStudent.name,
      nextStudent.pet_status,
      nextStudent.pet_condition,
      nextStudent.last_fed_at,
      nextStudent.last_decay_at,
      nextStudent.pet_condition_locked_at,
      nextStudent.pet_name,
      nextStudent.pet_type_id,
      nextStudent.pet_level,
      nextStudent.pet_points,
      nextStudent.coins,
      nextStudent.total_exp,
      nextStudent.lifetime_exp,
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

  if (body.studentLog) {
    await appendStudentLog(db, body.studentLog);
  }

  const refreshedStudent = await db
    .prepare(`SELECT ${STUDENT_SELECT_FIELDS} FROM students WHERE id = ?`)
    .bind(studentId)
    .first();

  return json({
    student: normalizeStudent(refreshedStudent),
    logs: await getLogsByClassId(db, classId),
  });
}

async function applyFeedToStudents(db, classId, userId, studentIds, selectedRule = null, options = { isDailyBulkFeed: false }) {
  if (studentIds.length === 0) {
    return [];
  }

  const placeholders = studentIds.map(() => '?').join(', ');
  const result = await db
    .prepare(`SELECT ${STUDENT_SELECT_FIELDS} FROM students WHERE class_id = ? AND id IN (${placeholders})`)
    .bind(classId, ...studentIds)
    .all();

  const rows = result.results || [];

  if (rows.length !== studentIds.length) {
    throw new Error('部分学生不存在或已被移除');
  }

  const thresholds = await getThresholdsByClassId(db, classId);
  const feedAt = nowIso();
  const statements = [];
  const pendingLogs = [];
  const pendingStudentLogs = [];
  
  const interactionRule = {
    name: String(selectedRule?.name || (options.isDailyBulkFeed ? '批量喂养' : '课堂互动')),
    icon: String(selectedRule?.icon || (options.isDailyBulkFeed ? '🍗' : '✨')),
    exp: Number(selectedRule?.exp ?? 1),
    coins: Number(selectedRule?.coins || 0),
    type: selectedRule?.type === 'negative' ? 'negative' : 'positive',
  };

  const logActionType = options.isDailyBulkFeed ? 'bulk_feed' 
    : (studentIds.length > 1 ? 'bulk_interact' : 'interact');

  for (const row of rows) {
    if (row.pet_status === 'egg') {
      throw new Error(`${row.name} 还没有唤醒宠物，暂时无法参与批量互动`);
    }

    const beforeCondition = derivePetCondition(row);
    const nextTotalExp = Math.max(0, Number(row.total_exp || 0) + interactionRule.exp);
    const nextLifetimeExp = Number(row.lifetime_exp || 0) + Math.max(0, interactionRule.exp);
    const nextPetPoints = Math.max(0, Number(row.pet_points || 0) + interactionRule.exp);
    const nextCoins = Math.max(0, Number(row.coins || 0) + interactionRule.coins);
    const nextTotalCoins = Math.max(0, Number(row.total_coins || 0) + interactionRule.coins);
    const nextRewardCount = Math.max(
      0,
      Number(row.reward_count || 0) + (interactionRule.type === 'positive' ? 1 : 0),
    );
    const nextLevel = resolvePetLevel(nextTotalExp, thresholds);
    const nextLastFedAt = interactionRule.type === 'positive' ? feedAt : row.last_fed_at || null;
    const nextLastDecayAt = interactionRule.type === 'positive'
      ? feedAt
      : row.last_decay_at ?? row.last_fed_at ?? null;
    const nextCondition = interactionRule.type === 'positive'
      ? 'healthy'
      : row.pet_condition || beforeCondition || 'healthy';
    const nextLockedAt = interactionRule.type === 'positive'
      ? null
      : row.pet_condition_locked_at || null;
    const nextStudent = {
      ...row,
      coins: nextCoins,
      total_exp: nextTotalExp,
      lifetime_exp: nextLifetimeExp,
      total_coins: nextTotalCoins,
      pet_points: nextPetPoints,
      reward_count: nextRewardCount,
      pet_level: nextLevel,
      last_fed_at: nextLastFedAt,
      last_decay_at: nextLastDecayAt,
      pet_condition: nextCondition,
      pet_condition_locked_at: nextLockedAt,
    };
    const nextCollection = syncStudentCollectionProgress(nextStudent);

    statements.push(
      db
        .prepare(
          `UPDATE students
           SET pet_condition = ?,
               last_fed_at = ?,
               last_decay_at = ?,
               pet_condition_locked_at = ?,
               pet_level = ?,
               pet_points = ?,
               coins = ?,
               total_exp = ?,
               lifetime_exp = ?,
               total_coins = ?,
               reward_count = ?,
               pet_collection = ?
           WHERE id = ? AND class_id = ?`,
        )
        .bind(
          nextCondition,
          nextLastFedAt,
          nextLastDecayAt,
          nextLockedAt,
          nextLevel,
          nextPetPoints,
          nextCoins,
          nextTotalExp,
          nextLifetimeExp,
          nextTotalCoins,
          nextRewardCount,
          JSON.stringify(nextCollection),
          row.id,
          classId,
        ),
    );

    if (interactionRule.type === 'positive' && beforeCondition === 'sleeping') {
      pendingLogs.push({
        classId,
        userId,
        actionType: '宠物唤醒',
        detail: `老师喂养了 ${row.name} 的宠物，它从休眠中醒来了`,
      });
    }

    pendingLogs.push({
      classId,
      userId,
      actionType: '课堂互动',
      detail: `老师为 ${row.name} 的宠物应用了${options.isDailyBulkFeed ? '批量喂养' : '批量互动规则'}「${interactionRule.name}」(EXP: ${interactionRule.exp >= 0 ? `+${interactionRule.exp}` : interactionRule.exp}, 金币: ${interactionRule.coins >= 0 ? `+${interactionRule.coins}` : interactionRule.coins})`,
    });
    
    pendingStudentLogs.push({
      classId,
      studentId: row.id,
      action: logActionType,
      ruleName: interactionRule.name,
      ruleIcon: interactionRule.icon,
      expDelta: interactionRule.exp,
      coinsDelta: interactionRule.coins,
      expAfter: nextTotalExp,
      coinsAfter: nextCoins,
      levelAfter: nextLevel,
    });
  }

  await db.batch(statements);

  for (const entry of pendingLogs) {
    await appendLog(db, entry);
  }
  
  for (const entry of pendingStudentLogs) {
    await appendStudentLog(db, entry);
  }

  return getStudentsByClassId(db, classId, userId);
}

async function handleGetStudentLogs(db, request, classId, studentId) {
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 30));
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);

  const { logs, total } = await getStudentLogsByStudentId(db, classId, studentId, limit, offset);

  return json({
    logs,
    total,
    hasMore: offset + logs.length < total
  });
}

async function handleGetProgressRanking(db, request, classId) {
  const url = new URL(request.url);
  const limit = Math.min(20, Math.max(1, Number(url.searchParams.get('limit')) || 10));
  const start = url.searchParams.get('start') || '';
  const end = url.searchParams.get('end') || '';

  const startTimestamp = parseDateOnlyToUtcMs(start, false);
  const endTimestamp = parseDateOnlyToUtcMs(end, true);

  const statements = [
    'SELECT student_id,',
    '       SUM(exp_delta) AS total_exp_delta,',
    '       SUM(CASE WHEN exp_delta > 0 THEN exp_delta ELSE 0 END) AS gained_exp,',
    '       SUM(CASE WHEN exp_delta < 0 THEN -exp_delta ELSE 0 END) AS lost_exp,',
    '       COUNT(*) AS event_count',
    '  FROM student_logs',
    ' WHERE class_id = ?',
  ];
  const bindings = [classId];

  if (startTimestamp !== null) {
    statements.push('   AND created_at >= ?');
    bindings.push(formatUtcMsToDbTimestamp(startTimestamp));
  }

  if (endTimestamp !== null) {
    statements.push('   AND created_at <= ?');
    bindings.push(formatUtcMsToDbTimestamp(endTimestamp));
  }

  statements.push(
    ' GROUP BY student_id',
    ' ORDER BY total_exp_delta DESC, gained_exp DESC, event_count DESC, student_id ASC',
    ' LIMIT ?',
  );
  bindings.push(limit);

  const result = await db.prepare(statements.join('\n')).bind(...bindings).all();

  return json({
    rankings: (result.results || []).map((row) => ({
      studentId: Number(row.student_id),
      totalExpDelta: Number(row.total_exp_delta || 0),
      gainedExp: Number(row.gained_exp || 0),
      lostExp: Number(row.lost_exp || 0),
      eventCount: Number(row.event_count || 0),
    })),
  });
}

async function handleFeedStudent(db, request, studentId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);

  if (!userId || !classId) {
    return error('缺少有效的班级上下文');
  }

  const currentStudent = await assertStudentOwnership(db, userId, studentId);

  if (Number(currentStudent.class_id) !== classId) {
    return error('学生与当前班级不匹配');
  }

  await applyFeedToStudents(db, classId, userId, [studentId]);

  const refreshedStudent = await db
    .prepare(`SELECT ${STUDENT_SELECT_FIELDS} FROM students WHERE id = ?`)
    .bind(studentId)
    .first();

  return json({
    student: normalizeStudent(refreshedStudent),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleFeedStudentsBatch(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const studentIds = Array.isArray(body.studentIds)
    ? Array.from(new Set(body.studentIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)))
    : [];
  const rule = body.rule && typeof body.rule === 'object' ? body.rule : null;
  const isDailyBulkFeed = Boolean(body.dailyBulkFeed);

  if (!userId) {
    return error('缺少有效的教师身份');
  }

  if (studentIds.length === 0) {
    return error('请至少选择一名学生');
  }

  await assertClassOwnership(db, userId, classId);

  if (isDailyBulkFeed) {
    const todayKey = getTodayKeyCN();
    const lastBulkFedAt = await getLastBulkFedAt(db, classId);

    if (lastBulkFedAt) {
      const lastFedDateKey = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(lastBulkFedAt));

      if (lastFedDateKey === todayKey) {
        return error('今天已经使用过批量喂养，每天只能使用一次');
      }
    }
  }

  const students = await applyFeedToStudents(db, classId, userId, studentIds, rule, { isDailyBulkFeed });

  if (isDailyBulkFeed) {
    await ensureClassSettings(db, classId);
    await db
      .prepare('UPDATE class_settings SET last_bulk_fed_at = ? WHERE class_id = ?')
      .bind(nowIso(), classId)
      .run();
  }

  const lastBulkFedAt = await getLastBulkFedAt(db, classId);

  return json({
    students,
    logs: await getLogsByClassId(db, classId),
    lastBulkFedAt,
  });
}

async function handleCreateShopItem(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const item = body.item && typeof body.item === 'object' ? body.item : {};
  const name = String(item.name || '').trim();
  const icon = String(item.icon || '🎁').trim() || '🎁';
  const itemType = item.item_type === 'exp_pack' ? 'exp_pack' : 'gift';
  const expValue = Math.max(0, Number(item.exp_value || 0));
  const price = Number(item.price || 0);
  const stock = Math.max(0, Number(item.stock || 0));

  if (!userId || !name || price <= 0) {
    return error('请填写有效的商品名称与价格');
  }

  if (itemType === 'exp_pack' && expValue <= 0) {
    return error('经验包必须设置大于 0 的经验值');
  }

  await assertClassOwnership(db, userId, classId);

  await db
    .prepare('INSERT INTO shop_items (class_id, name, icon, item_type, exp_value, price, stock) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(classId, name, icon, itemType, itemType === 'exp_pack' ? expValue : 0, price, stock || 99)
    .run();

  await appendLog(db, {
    classId,
    userId,
    actionType: '商品管理',
    detail: itemType === 'exp_pack'
      ? `新增经验包 ${name}（+${expValue} EXP），库存 ${stock || 99}`
      : `新增商品 ${name}，库存 ${stock || 99}`,
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
  const itemType = item.item_type === 'exp_pack' ? 'exp_pack' : 'gift';
  const expValue = Math.max(0, Number(item.exp_value || 0));
  const price = Number(item.price || 0);
  const stock = Math.max(0, Number(item.stock || 0));

  if (!userId || !classId || !name || price <= 0) {
    return error('请填写有效的商品名称与价格');
  }

  if (itemType === 'exp_pack' && expValue <= 0) {
    return error('经验包必须设置大于 0 的经验值');
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
    .prepare('UPDATE shop_items SET name = ?, icon = ?, item_type = ?, exp_value = ?, price = ?, stock = ? WHERE id = ?')
    .bind(name, icon, itemType, itemType === 'exp_pack' ? expValue : 0, price, stock, itemId)
    .run();

  await appendLog(db, {
    classId,
    userId,
    actionType: '商品管理',
    detail: itemType === 'exp_pack'
      ? `更新了经验包 ${name}（+${expValue} EXP），价格 ${price}，库存 ${stock}`
      : `更新了商品 ${name}，价格 ${price}，库存 ${stock}`,
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
    .prepare('SELECT id, class_id, name, icon, item_type, exp_value, price, stock FROM shop_items WHERE id = ? AND class_id = ?')
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
    .prepare(`SELECT ${STUDENT_SELECT_FIELDS} FROM students WHERE class_id = ? AND id IN (${placeholders})`)
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

  if (item.item_type === 'exp_pack') {
    const ineligibleStudent = students.find((student) => student.pet_status === 'egg');

    if (ineligibleStudent) {
      return error(`学生 ${ineligibleStudent.name} 还没有唤醒宠物，暂时不能使用经验包`);
    }
  }

  const thresholds = await getThresholdsByClassId(db, classId);
  const rewardExp = Math.max(0, Number(item.exp_value || 0));
  const now = nowIso();
  const statements = students.map((student) => {
    if (item.item_type === 'exp_pack') {
      const nextTotalExp = Math.max(0, Number(student.total_exp || 0) + rewardExp);
      const nextLifetimeExp = Number(student.lifetime_exp || 0) + rewardExp;
      const nextPetPoints = Math.max(0, Number(student.pet_points || 0) + rewardExp);
      const nextLevel = resolvePetLevel(nextTotalExp, thresholds);
      const updatedStudent = {
        ...student,
        coins: (student.coins || 0) - Number(item.price || 0),
        total_exp: nextTotalExp,
        lifetime_exp: nextLifetimeExp,
        pet_points: nextPetPoints,
        pet_level: nextLevel,
        last_fed_at: now,
        last_decay_at: now,
        pet_condition: 'healthy',
        pet_condition_locked_at: null,
      };
      const nextCollection = syncStudentCollectionProgress(updatedStudent);

      return db
        .prepare(
          `UPDATE students
           SET coins = ?, total_exp = ?, lifetime_exp = ?, pet_points = ?, pet_level = ?, last_fed_at = ?, last_decay_at = ?, pet_condition = 'healthy', pet_condition_locked_at = NULL, pet_collection = ?
           WHERE id = ?`,
        )
        .bind(
          updatedStudent.coins,
          nextTotalExp,
          nextLifetimeExp,
          nextPetPoints,
          nextLevel,
          now,
          now,
          JSON.stringify(nextCollection),
          student.id,
        );
    }

    return db
      .prepare('UPDATE students SET coins = ? WHERE id = ?')
      .bind((student.coins || 0) - Number(item.price || 0), student.id);
  });

  statements.push(
    db
      .prepare('UPDATE shop_items SET stock = ? WHERE id = ?')
      .bind(Number(item.stock || 0) - studentIds.length, itemId),
  );

  await db.batch(statements);
  
  const pendingStudentLogs = students.map((student) => {
    const nextTotalExp = item.item_type === 'exp_pack' ? (student.total_exp || 0) + rewardExp : (student.total_exp || 0);
    const nextCoins = (student.coins || 0) - Number(item.price || 0);
    const nextLevel = item.item_type === 'exp_pack' ? resolvePetLevel(nextTotalExp, thresholds) : (student.pet_level || 0);

    return {
      classId,
      studentId: student.id,
      action: 'redeem',
      ruleName: `兑换「${item.name}」`,
      ruleIcon: item.icon || '🎁',
      expDelta: item.item_type === 'exp_pack' ? rewardExp : 0,
      coinsDelta: -Number(item.price || 0),
      expAfter: nextTotalExp,
      coinsAfter: nextCoins,
      levelAfter: nextLevel,
    };
  });

  for (const entry of pendingStudentLogs) {
    await appendStudentLog(db, entry);
  }
  await appendLog(db, {
    classId,
    userId,
    actionType: '商品兑换',
    detail: item.item_type === 'exp_pack'
      ? `为 ${students.map((student) => student.name).join('、')} 兑换了经验包 ${item.name}（每人 +${rewardExp} EXP）`
      : `为 ${students.map((student) => student.name).join('、')} 兑换了 ${item.name}`,
    meta: {
      undoable: true,
      kind: 'shop-redeem',
      item: {
        id: Number(item.id),
        name: item.name,
        item_type: item.item_type || 'gift',
        exp_value: rewardExp,
        stockBefore: Number(item.stock || 0),
        stockAfter: Number(item.stock || 0) - studentIds.length,
      },
      studentsBefore: students.map((student) => ({
        id: student.id,
        name: student.name,
        coins: student.coins || 0,
        total_exp: student.total_exp || 0,
        pet_points: student.pet_points || 0,
        pet_level: student.pet_level || 0,
        last_fed_at: student.last_fed_at || null,
        last_decay_at: student.last_decay_at || null,
        pet_condition: student.pet_condition || 'healthy',
        pet_condition_locked_at: student.pet_condition_locked_at || null,
        pet_collection: student.pet_collection || [],
      })),
      studentsAfter: students.map((student) => ({
        id: student.id,
        coins: (student.coins || 0) - Number(item.price || 0),
        total_exp: item.item_type === 'exp_pack' ? (student.total_exp || 0) + rewardExp : (student.total_exp || 0),
        pet_points: item.item_type === 'exp_pack' ? (student.pet_points || 0) + rewardExp : (student.pet_points || 0),
      })),
    },
  });

  return json({
    students: await getStudentsByClassId(db, classId, userId),
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

  const maxOrderRow = await db
    .prepare(
      `SELECT COALESCE(MAX(sort_order), 0) AS max_order
       FROM rules
       WHERE type = ?
         AND ((class_id = ? AND (owner_user_id = ? OR owner_user_id IS NULL))
           OR (class_id IS NULL AND owner_user_id = ?))`,
    )
    .bind(type, classId, userId, userId)
    .first();
  const nextSortOrder = Number(maxOrderRow?.max_order || 0) + 1;

  await db
    .prepare('INSERT INTO rules (class_id, owner_user_id, sort_order, name, icon, exp, coins, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(classId, userId, nextSortOrder, name, icon, exp, coins, type)
    .run();

  await appendLog(db, {
    classId,
    userId,
    actionType: '规则修改',
    detail: `新增规则 ${name}`,
  });

  return json({
    rules: await getRulesByClassId(db, classId, userId),
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
    .prepare(
      `SELECT id, class_id, owner_user_id, name
       FROM rules
       WHERE id = ?
         AND ((class_id = ? AND (owner_user_id = ? OR owner_user_id IS NULL))
           OR (class_id IS NULL AND owner_user_id = ?))`,
    )
    .bind(ruleId, classId, userId, userId)
    .first();

  if (!existing) {
    return error('目标规则不存在');
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
    rules: await getRulesByClassId(db, classId, userId),
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
    .prepare(
      `SELECT id, class_id, owner_user_id, name
       FROM rules
       WHERE id = ?
         AND ((class_id = ? AND (owner_user_id = ? OR owner_user_id IS NULL))
           OR (class_id IS NULL AND owner_user_id = ?))`,
    )
    .bind(ruleId, classId, userId, userId)
    .first();

  if (!rule) {
    return error('目标规则不存在');
  }

  await db.prepare('DELETE FROM rules WHERE id = ?').bind(ruleId).run();
  await appendLog(db, {
    classId,
    userId,
    actionType: '规则修改',
    detail: `删除规则 ${rule.name}`,
  });

  return json({
    rules: await getRulesByClassId(db, classId, userId),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleMoveRule(db, request, ruleId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);
  const direction = body.direction === 'down' ? 'down' : 'up';

  if (!userId || !classId) {
    return error('缺少有效的规则上下文');
  }

  await assertClassOwnership(db, userId, classId);

  const currentRule = await db
    .prepare(
      `SELECT id, class_id, owner_user_id, sort_order, name, type
       FROM rules
       WHERE id = ?
         AND ((class_id = ? AND (owner_user_id = ? OR owner_user_id IS NULL))
           OR (class_id IS NULL AND owner_user_id = ?))`,
    )
    .bind(ruleId, classId, userId, userId)
    .first();

  if (!currentRule) {
    return error('目标规则不存在');
  }

  const currentSortOrder = Number(currentRule.sort_order || 0);
  const neighbor = await db
    .prepare(
      `SELECT id, sort_order, name
       FROM rules
       WHERE type = ? AND id != ?
         AND ((class_id = ? AND (owner_user_id = ? OR owner_user_id IS NULL))
           OR (class_id IS NULL AND owner_user_id = ?))
         AND sort_order ${direction === 'up' ? '<' : '>'} ?
       ORDER BY sort_order ${direction === 'up' ? 'DESC' : 'ASC'}, id ${direction === 'up' ? 'DESC' : 'ASC'}
       LIMIT 1`,
    )
    .bind(currentRule.type, ruleId, classId, userId, userId, currentSortOrder)
    .first();

  if (!neighbor) {
    return json({
      rules: await getRulesByClassId(db, classId, userId),
      logs: await getLogsByClassId(db, classId),
    });
  }

  await db.batch([
    db.prepare('UPDATE rules SET sort_order = ? WHERE id = ?').bind(Number(neighbor.sort_order || 0), currentRule.id),
    db.prepare('UPDATE rules SET sort_order = ? WHERE id = ?').bind(currentSortOrder, neighbor.id),
  ]);

  await appendLog(db, {
    classId,
    userId,
    actionType: '规则修改',
    detail: `调整规则顺序：${currentRule.name}${direction === 'up' ? ' 上移' : ' 下移'}`,
  });

  return json({
    rules: await getRulesByClassId(db, classId, userId),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleImportRules(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const sourceClassId = parseId(body.sourceClassId);
  const mode = body.mode === 'replace' ? 'replace' : 'append';

  if (!userId || !sourceClassId || !classId) {
    return error('缺少有效的规则导入上下文');
  }

  if (sourceClassId === classId) {
    return error('不能从当前班级导入自身规则');
  }

  await assertClassOwnership(db, userId, classId);
  const sourceClass = await assertClassOwnership(db, userId, sourceClassId);

  const sourceRulesResult = await db
    .prepare(
      `SELECT id, name, icon, exp, coins, type, sort_order
       FROM rules
       WHERE class_id = ?
         AND (owner_user_id = ? OR owner_user_id IS NULL)
       ORDER BY type ASC, sort_order ASC, id ASC`,
    )
    .bind(sourceClassId, userId)
    .all();

  const sourceRules = sourceRulesResult.results || [];

  if (sourceRules.length === 0) {
    return error('来源班级还没有可导入的自定义规则');
  }

  const statements = [];

  if (mode === 'replace') {
    statements.push(
      db.prepare('DELETE FROM rules WHERE class_id = ? AND (owner_user_id = ? OR owner_user_id IS NULL)').bind(classId, userId),
    );
  }

  const targetRulesResult = await db
    .prepare(
      `SELECT type, COALESCE(MAX(sort_order), 0) AS max_order
       FROM rules
       WHERE class_id = ?
         AND (owner_user_id = ? OR owner_user_id IS NULL)
       GROUP BY type`,
    )
    .bind(classId, userId)
    .all();

  const orderMap = Object.fromEntries(
    (targetRulesResult.results || []).map((row) => [row.type || 'positive', Number(row.max_order || 0)]),
  );

  if (mode === 'replace') {
    orderMap.positive = 0;
    orderMap.negative = 0;
  }

  sourceRules.forEach((rule) => {
    const type = rule.type === 'negative' ? 'negative' : 'positive';
    orderMap[type] = Number(orderMap[type] || 0) + 1;
    statements.push(
      db
        .prepare('INSERT INTO rules (class_id, owner_user_id, sort_order, name, icon, exp, coins, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(classId, userId, orderMap[type], rule.name, rule.icon || '⭐', Number(rule.exp || 0), Number(rule.coins || 0), type),
    );
  });

  await db.batch(statements);

  await appendLog(db, {
    classId,
    userId,
    actionType: '规则修改',
    detail: `${mode === 'replace' ? '覆盖导入' : '追加导入'}了班级 ${sourceClass.name} 的 ${sourceRules.length} 条规则`,
  });

  return json({
    rules: await getRulesByClassId(db, classId, userId),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleUpdateThresholds(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const thresholds = Array.isArray(body.thresholds) ? body.thresholds.map((value) => Number(value)) : [];
  const petConditionConfig = normalizePetConditionConfig(body.petConditionConfig);

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
      `INSERT INTO class_settings (class_id, level_thresholds, pet_condition_config, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(class_id) DO UPDATE SET
         level_thresholds = excluded.level_thresholds,
         pet_condition_config = excluded.pet_condition_config,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(classId, JSON.stringify(thresholds), JSON.stringify(petConditionConfig))
    .run();

  await appendLog(db, {
    classId,
    userId,
    actionType: '规则修改',
    detail:
      `更新了等级阈值：${thresholds.join(' / ')}；宠物衰减：${petConditionConfig.enabled ? '开启' : '关闭'}；` +
      `状态阈值：${petConditionConfig.hungry_days}/${petConditionConfig.weak_days}/${petConditionConfig.sleeping_days} 天；` +
      `日衰减：${petConditionConfig.hungry_decay}/${petConditionConfig.weak_decay}/${petConditionConfig.sleeping_decay} EXP；` +
      `跳过周末：${petConditionConfig.skip_weekends ? '是' : '否'}；` +
      `假期保护：${petConditionConfig.pause_start_date && petConditionConfig.pause_end_date ? `${petConditionConfig.pause_start_date} ~ ${petConditionConfig.pause_end_date}` : '未设置'}`,
  });

  return json({
    levelThresholds: await getThresholdsByClassId(db, classId),
    petConditionConfig: await getPetConditionConfigByClassId(db, classId),
    logs: await getLogsByClassId(db, classId),
  });
}

async function handleUpdateSmartSeatingConfig(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const config = body.config;

  if (!userId || !config || typeof config !== 'object') {
    return error('排座方案格式不正确');
  }

  const layoutStr = String(config.layoutStr || '').trim() || '2-4-2';
  const rows = Math.max(1, Math.min(30, Number(config.rows) || 1));
  const viewMode = config.viewMode === 'teacher' ? 'teacher' : 'student';
  const lockedIndices = Array.isArray(config.lockedIndices)
    ? [...new Set(config.lockedIndices.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 0))]
    : [];
  const seatMap = Array.isArray(config.seatMap)
    ? config.seatMap.slice(0, 240).map((seat, index) => {
        if (!seat || typeof seat !== 'object') {
          return null;
        }

        const name = String(seat.name || '').trim();
        if (!name) {
          return null;
        }

        return {
          id: seat.id || `saved-seat-${index}`,
          name,
          gender: seat.gender === '女' ? '女' : '男',
          height: Number.isFinite(Number(seat.height)) ? Number(seat.height) : 0,
          vision: String(seat.vision || ''),
          score: Number.isFinite(Number(seat.score)) ? Number(seat.score) : 0,
        };
      })
    : [];

  await assertClassOwnership(db, userId, classId);
  await ensureClassSettings(db, classId);

  const payload = {
    layoutStr,
    rows,
    viewMode,
    lockedIndices,
    seatMap,
    saved_at: new Date().toISOString(),
  };

  await db
    .prepare(
      `INSERT INTO class_settings (class_id, level_thresholds, pet_condition_config, smart_seating_config, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(class_id) DO UPDATE SET smart_seating_config = excluded.smart_seating_config, updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(classId, JSON.stringify(DEFAULT_LEVEL_THRESHOLDS), JSON.stringify(DEFAULT_PET_CONDITION_CONFIG), JSON.stringify(payload))
    .run();

  await appendLog(db, {
    classId,
    userId,
    actionType: '百宝箱',
    detail: `保存了智能排座方案（${rows} 行，${seatMap.filter(Boolean).length} 名学生）`,
  });

  return json({
    smartSeatingConfig: await getSmartSeatingConfigByClassId(db, classId),
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
    .prepare(`SELECT ${STUDENT_SELECT_FIELDS} FROM students WHERE class_id = ?`)
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
             pet_condition = 'healthy',
             last_fed_at = NULL,
             last_decay_at = NULL,
             pet_condition_locked_at = NULL,
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
    students: await getStudentsByClassId(db, classId, userId),
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

  await db.prepare('DELETE FROM student_logs WHERE class_id = ?').bind(classId).run();
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
         SET name = ?, pet_status = ?, pet_condition = ?, last_fed_at = ?, last_decay_at = ?, pet_condition_locked_at = ?, pet_name = ?, pet_type_id = ?, pet_level = ?, pet_points = ?, coins = ?, total_exp = ?, total_coins = ?, reward_count = ?, pet_collection = ?
         WHERE id = ? AND class_id = ?`,
      )
      .bind(
        snapshot.name,
        snapshot.pet_status,
        snapshot.pet_condition || 'healthy',
        snapshot.last_fed_at || null,
        snapshot.last_decay_at || null,
        snapshot.pet_condition_locked_at || null,
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
    const studentStatements = (meta.studentsBefore || []).map((student) => {
      if (meta.item?.item_type === 'exp_pack') {
        return db
          .prepare(
            `UPDATE students
             SET coins = ?, total_exp = ?, pet_points = ?, pet_level = ?, last_fed_at = ?, last_decay_at = ?, pet_condition = ?, pet_condition_locked_at = ?, pet_collection = ?
             WHERE id = ? AND class_id = ?`,
          )
          .bind(
            student.coins,
            student.total_exp || 0,
            student.pet_points || 0,
            student.pet_level || 0,
            student.last_fed_at || null,
            student.last_decay_at || null,
            student.pet_condition || 'healthy',
            student.pet_condition_locked_at || null,
            JSON.stringify(student.pet_collection || []),
            student.id,
            classId,
          );
      }

      return db.prepare('UPDATE students SET coins = ? WHERE id = ? AND class_id = ?').bind(student.coins, student.id, classId);
    });

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
    students: await getStudentsByClassId(db, classId, userId),
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

  await assertSuperAdmin(db, userId);

  await ensureActivationCodes(db);

  const result = await db
    .prepare(
      `SELECT ac.id, ac.code, ac.level, ac.expires_in_days, ac.max_uses, ac.used_count, ac.status,
              ac.used_by_user_id, ac.used_at, ac.created_by_user_id,
              used_user.nickname AS used_by_nickname,
              created_user.nickname AS created_by_nickname
       FROM activation_codes ac
       LEFT JOIN users used_user ON used_user.id = ac.used_by_user_id
       LEFT JOIN users created_user ON created_user.id = ac.created_by_user_id
       ORDER BY ac.created_at DESC, ac.id DESC`,
    )
    .all();

  return json({
    activationCodes: (result.results || []).map(normalizeActivationCode),
  });
}

async function handleAdminGetUserClasses(db, request, targetUserId) {
  const url = new URL(request.url);
  const adminId = parseId(url.searchParams.get('adminId'));
  if (!adminId) return error('缺少有效的超管身份');
  await assertSuperAdmin(db, adminId);

  const result = await db
    .prepare(`
      SELECT c.id, c.name, c.created_at,
             COUNT(s.id) AS student_count
      FROM classes c
      LEFT JOIN students s ON s.class_id = c.id
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `)
    .bind(targetUserId)
    .all();

  return json({ classes: result.results || [] });
}

async function handleAdminGetClassStudents(db, request, classId) {
  const url = new URL(request.url);
  const adminId = parseId(url.searchParams.get('adminId'));
  if (!adminId) return error('缺少有效的超管身份');
  await assertSuperAdmin(db, adminId);

  const result = await db
    .prepare(`SELECT ${STUDENT_SELECT_FIELDS} FROM students WHERE class_id = ? ORDER BY name ASC`)
    .bind(classId)
    .all();

  const students = (result.results || []).map((row) => {
    const normalized = normalizeStudent(row);
    const graduated_count = normalized.pet_collection.filter((e) => e.status === 'graduated').length;
    return { ...normalized, graduated_count };
  });

  return json({ students });
}

async function handleAdminGetClassSettings(db, request, classId) {
  const url = new URL(request.url);
  const adminId = parseId(url.searchParams.get('adminId'));
  if (!adminId) return error('缺少有效的超管身份');
  await assertSuperAdmin(db, adminId);

  const thresholds = await getThresholdsByClassId(db, classId);
  return json({ level_thresholds: thresholds });
}

async function handleAdminGetStudentLogs(db, request, studentId) {
  const url = new URL(request.url);
  const adminId = parseId(url.searchParams.get('adminId'));
  if (!adminId) return error('缺少有效的超管身份');
  await assertSuperAdmin(db, adminId);

  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 30));
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);

  const student = await db
    .prepare('SELECT id, class_id FROM students WHERE id = ?')
    .bind(studentId)
    .first();
  if (!student) return error('学生不存在');

  const { logs, total } = await getStudentLogsByStudentId(db, student.class_id, studentId, limit, offset);
  return json({ logs, total, hasMore: offset + logs.length < total });
}

async function handleAdminUpdateStudent(db, request, studentId) {
  const body = await readBody(request);
  const adminId = parseId(body.adminId);
  if (!adminId) return error('缺少有效的超管身份');
  const admin = await assertSuperAdmin(db, adminId);

  const student = await db
    .prepare(`SELECT ${STUDENT_SELECT_FIELDS} FROM students WHERE id = ?`)
    .bind(studentId)
    .first();

  if (!student) return error('学生不存在');

  const prevTotalExp = Number(student.total_exp || 0);
  const prevLifetimeExp = Number(student.lifetime_exp || 0);
  const nextTotalExp = Math.max(0, Number(body.total_exp ?? prevTotalExp));
  const nextLifetimeExp = Math.max(nextTotalExp, Math.max(0, Number(body.lifetime_exp ?? prevLifetimeExp)));

  const thresholds = await getThresholdsByClassId(db, student.class_id);
  const nextLevel = resolvePetLevel(nextTotalExp, thresholds);
  const nextPetPoints = nextTotalExp;

  await db
    .prepare(`UPDATE students SET total_exp = ?, lifetime_exp = ?, pet_level = ?, pet_points = ? WHERE id = ?`)
    .bind(nextTotalExp, nextLifetimeExp, nextLevel, nextPetPoints, studentId)
    .run();

  await appendAdminLog(db, {
    userId: adminId,
    actionType: '学生管理',
    detail: `超管 ${admin.nickname || admin.username} 修改学生「${student.name}」经验：本宠经验 ${prevTotalExp} → ${nextTotalExp}，累积经验 ${prevLifetimeExp} → ${nextLifetimeExp}`,
  });

  const updated = await db
    .prepare(`SELECT ${STUDENT_SELECT_FIELDS} FROM students WHERE id = ?`)
    .bind(studentId)
    .first();

  const normalized = normalizeStudent(updated);
  return json({
    student: {
      ...normalized,
      graduated_count: normalized.pet_collection.filter((e) => e.status === 'graduated').length,
    },
  });
}

// ─── 通知系统 ───────────────────────────────────────────────────────────────

async function handleGetNotifications(db, request) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));
  if (!userId) return error('缺少有效的教师身份');

  const rows = await db
    .prepare(
      `SELECT n.id, n.type, n.title, n.content, n.image_url, n.html_content, n.created_at,
              CASE WHEN nr.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_read
       FROM notifications n
       LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
       WHERE n.status = 'active'
       ORDER BY n.created_at DESC
       LIMIT 100`,
    )
    .bind(userId)
    .all();

  const notifications = (rows.results || []).map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    content: r.content,
    image_url: r.image_url,
    html_content: r.html_content,
    is_read: !!r.is_read,
    created_at: r.created_at,
  }));

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return json({ notifications, unread_count: unreadCount });
}

async function handleMarkNotificationRead(db, request, notificationId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  if (!userId) return error('缺少有效的教师身份');

  await db
    .prepare('INSERT OR IGNORE INTO notification_reads (user_id, notification_id) VALUES (?, ?)')
    .bind(userId, notificationId)
    .run();

  return json({ success: true });
}

async function handleMarkAllNotificationsRead(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  if (!userId) return error('缺少有效的教师身份');

  await db
    .prepare(
      `INSERT OR IGNORE INTO notification_reads (user_id, notification_id)
       SELECT ?, n.id FROM notifications n
       WHERE n.status = 'active'
         AND n.id NOT IN (SELECT notification_id FROM notification_reads WHERE user_id = ?)`,
    )
    .bind(userId, userId)
    .run();

  return json({ success: true });
}

async function handleAdminCreateNotification(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  if (!userId) return error('缺少有效的超管身份');
  const admin = await assertSuperAdmin(db, userId);

  const type = ['text', 'image', 'html'].includes(body.type) ? body.type : 'text';
  const title = (body.title || '').trim();
  if (!title) return error('通知标题不能为空');

  const content = (body.content || '').trim() || null;
  const imageUrl = type === 'image' ? (body.image_url || '').trim() || null : null;
  const htmlContent = type === 'html' ? (body.html_content || '').trim() || null : null;

  const result = await db
    .prepare(
      `INSERT INTO notifications (type, title, content, image_url, html_content, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(type, title, content, imageUrl, htmlContent, userId)
    .run();

  await appendAdminLog(db, {
    userId,
    actionType: '通知管理',
    detail: `超管 ${admin.nickname || admin.username} 发布通知「${title}」（类型：${type}）`,
  });

  const notification = await db
    .prepare('SELECT * FROM notifications WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first();

  return json({ notification });
}

async function handleAdminGetNotifications(db, request) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));
  if (!userId) return error('缺少有效的超管身份');
  await assertSuperAdmin(db, userId);

  const rows = await db
    .prepare(
      `SELECT n.*,
              u.nickname AS creator_name,
              (SELECT COUNT(*) FROM notification_reads nr WHERE nr.notification_id = n.id) AS read_count
       FROM notifications n
       LEFT JOIN users u ON u.id = n.created_by_user_id
       ORDER BY n.created_at DESC
       LIMIT 200`,
    )
    .all();

  const totalUsers = await db
    .prepare("SELECT COUNT(*) AS cnt FROM users WHERE role != 'super_admin' AND status = 'active'")
    .first();

  const notifications = (rows.results || []).map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    content: r.content,
    image_url: r.image_url,
    html_content: r.html_content,
    status: r.status,
    created_by_user_id: r.created_by_user_id,
    creator_name: r.creator_name || '系统',
    read_count: r.read_count || 0,
    created_at: r.created_at,
  }));

  return json({ notifications, total_users: totalUsers?.cnt || 0 });
}

async function handleAdminUpdateNotification(db, request, notificationId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  if (!userId) return error('缺少有效的超管身份');
  const admin = await assertSuperAdmin(db, userId);

  const notification = await db
    .prepare('SELECT id, title, status FROM notifications WHERE id = ?')
    .bind(notificationId)
    .first();
  if (!notification) return error('通知不存在');

  const newStatus = body.status === 'archived' ? 'archived' : body.status === 'active' ? 'active' : null;
  if (!newStatus) return error('无效的状态值');

  await db
    .prepare('UPDATE notifications SET status = ? WHERE id = ?')
    .bind(newStatus, notificationId)
    .run();

  await appendAdminLog(db, {
    userId,
    actionType: '通知管理',
    detail: `超管 ${admin.nickname || admin.username} ${newStatus === 'archived' ? '归档' : '恢复'}通知「${notification.title}」`,
  });

  return json({ success: true, status: newStatus });
}

async function handleAdminDeleteNotification(db, request, notificationId) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));
  if (!userId) return error('缺少有效的超管身份');
  const admin = await assertSuperAdmin(db, userId);

  const notification = await db
    .prepare('SELECT id, title FROM notifications WHERE id = ?')
    .bind(notificationId)
    .first();
  if (!notification) return error('通知不存在', 404);

  await db
    .prepare('DELETE FROM notification_reads WHERE notification_id = ?')
    .bind(notificationId)
    .run();
  await db
    .prepare('DELETE FROM notifications WHERE id = ?')
    .bind(notificationId)
    .run();

  await appendAdminLog(db, {
    userId,
    actionType: '通知管理',
    detail: `超管 ${admin.nickname || admin.username} 删除通知「${notification.title}」`,
  });

  return json({ success: true });
}

// ─── 反馈工单系统 ──────────────────────────────────────────────────────────

const FEEDBACK_CATEGORIES = ['bug', 'feature', 'question'];
const FEEDBACK_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const FEEDBACK_IMAGE_MAX_LEN = 800000; // ~500KB base64 字符上限
const FEEDBACK_CONTENT_MAX_LEN = 5000;

function validateFeedbackContent(content, imageData) {
  const text = (content || '').trim();
  const image = (imageData || '').trim();
  if (!text && !image) {
    return { ok: false, message: '内容和图片至少需要填一项' };
  }
  if (text.length > FEEDBACK_CONTENT_MAX_LEN) {
    return { ok: false, message: `正文最多 ${FEEDBACK_CONTENT_MAX_LEN} 字` };
  }
  if (image && image.length > FEEDBACK_IMAGE_MAX_LEN) {
    return { ok: false, message: '图片过大，请压缩后重试' };
  }
  if (image && !image.startsWith('data:image/')) {
    return { ok: false, message: '图片格式无效' };
  }
  return { ok: true, text: text || null, image: image || null };
}

async function handleListMyFeedback(db, request) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));
  if (!userId) return error('缺少有效的教师身份');

  const rows = await db
    .prepare(
      `SELECT t.id, t.category, t.title, t.status,
              t.user_has_unread_reply, t.admin_has_unread_reply,
              t.created_at, t.updated_at,
              (SELECT COUNT(*) FROM feedback_messages m WHERE m.ticket_id = t.id) AS message_count,
              (SELECT m2.content FROM feedback_messages m2 WHERE m2.ticket_id = t.id
                 ORDER BY m2.created_at DESC LIMIT 1) AS last_message_preview
       FROM feedback_tickets t
       WHERE t.user_id = ?
       ORDER BY t.updated_at DESC
       LIMIT 200`,
    )
    .bind(userId)
    .all();

  const tickets = (rows.results || []).map((r) => ({
    id: r.id,
    category: r.category,
    title: r.title,
    status: r.status,
    user_has_unread_reply: !!r.user_has_unread_reply,
    message_count: r.message_count || 0,
    last_message_preview: (r.last_message_preview || '').slice(0, 80),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  const unreadCount = tickets.filter((t) => t.user_has_unread_reply).length;
  return json({ tickets, unread_count: unreadCount });
}

async function handleGetMyFeedbackDetail(db, request, ticketId) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));
  if (!userId) return error('缺少有效的教师身份');

  const ticket = await db
    .prepare('SELECT * FROM feedback_tickets WHERE id = ?')
    .bind(ticketId)
    .first();
  if (!ticket) return error('反馈不存在', 404);
  if (ticket.user_id !== userId) return error('无权查看该反馈', 403);

  const messageRows = await db
    .prepare(
      `SELECT m.id, m.sender_user_id, m.sender_role, m.content, m.image_data, m.created_at,
              u.nickname AS sender_name, u.username AS sender_username
       FROM feedback_messages m
       LEFT JOIN users u ON u.id = m.sender_user_id
       WHERE m.ticket_id = ?
       ORDER BY m.created_at ASC`,
    )
    .bind(ticketId)
    .all();

  // 查看后清零教师的未读标记
  if (ticket.user_has_unread_reply) {
    await db
      .prepare('UPDATE feedback_tickets SET user_has_unread_reply = 0 WHERE id = ?')
      .bind(ticketId)
      .run();
  }

  return json({
    ticket: {
      id: ticket.id,
      user_id: ticket.user_id,
      category: ticket.category,
      title: ticket.title,
      status: ticket.status,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
    },
    messages: (messageRows.results || []).map((m) => ({
      id: m.id,
      sender_role: m.sender_role,
      sender_name: m.sender_name || m.sender_username || (m.sender_role === 'admin' ? '官方' : '我'),
      content: m.content,
      image_data: m.image_data,
      created_at: m.created_at,
    })),
  });
}

async function handleUserDeleteFeedback(db, request, ticketId) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));
  if (!userId) return error('缺少有效的教师身份');

  const ticket = await db
    .prepare('SELECT id, user_id, status FROM feedback_tickets WHERE id = ?')
    .bind(ticketId)
    .first();
  if (!ticket) return error('工单不存在', 404);
  if (ticket.user_id !== userId) return error('工单不存在或无权限', 403);
  // 前端只对 closed 工单显示删除按钮，后端同步校验防止绕过
  if (ticket.status !== 'closed') return error('仅已关闭的工单可以删除', 400);

  await db
    .prepare('DELETE FROM feedback_tickets WHERE id = ?')
    .bind(ticketId)
    .run();

  return json({ success: true });
}

async function handleCreateFeedback(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  if (!userId) return error('缺少有效的教师身份');

  const category = FEEDBACK_CATEGORIES.includes(body.category) ? body.category : 'question';
  const title = (body.title || '').trim();
  if (!title) return error('标题不能为空');
  if (title.length > 120) return error('标题过长，请控制在 120 字以内');

  const validated = validateFeedbackContent(body.content, body.image_data);
  if (!validated.ok) return error(validated.message);

  // 校验用户存在
  const userRow = await db
    .prepare('SELECT id, status FROM users WHERE id = ?')
    .bind(userId)
    .first();
  if (!userRow || userRow.status !== 'active') return error('账号状态异常', 403);

  const inserted = await db
    .prepare(
      `INSERT INTO feedback_tickets (user_id, category, title, status, admin_has_unread_reply)
       VALUES (?, ?, ?, 'open', 1)`,
    )
    .bind(userId, category, title)
    .run();

  const ticketId = inserted.meta.last_row_id;

  await db
    .prepare(
      `INSERT INTO feedback_messages (ticket_id, sender_user_id, sender_role, content, image_data)
       VALUES (?, ?, 'user', ?, ?)`,
    )
    .bind(ticketId, userId, validated.text, validated.image)
    .run();

  const ticket = await db
    .prepare('SELECT * FROM feedback_tickets WHERE id = ?')
    .bind(ticketId)
    .first();

  return json({ ticket });
}

async function handleReplyFeedbackByUser(db, request, ticketId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  if (!userId) return error('缺少有效的教师身份');

  const ticket = await db
    .prepare('SELECT id, user_id, status FROM feedback_tickets WHERE id = ?')
    .bind(ticketId)
    .first();
  if (!ticket) return error('反馈不存在', 404);
  if (ticket.user_id !== userId) return error('无权操作该反馈', 403);
  if (ticket.status === 'closed') return error('该反馈已关闭，无法追加消息');

  const validated = validateFeedbackContent(body.content, body.image_data);
  if (!validated.ok) return error(validated.message);

  await db
    .prepare(
      `INSERT INTO feedback_messages (ticket_id, sender_user_id, sender_role, content, image_data)
       VALUES (?, ?, 'user', ?, ?)`,
    )
    .bind(ticketId, userId, validated.text, validated.image)
    .run();

  await db
    .prepare(
      `UPDATE feedback_tickets
       SET admin_has_unread_reply = 1,
           updated_at = CURRENT_TIMESTAMP,
           status = CASE WHEN status = 'resolved' THEN 'in_progress' ELSE status END
       WHERE id = ?`,
    )
    .bind(ticketId)
    .run();

  return json({ success: true });
}

async function handleAdminListFeedback(db, request) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));
  if (!userId) return error('缺少有效的超管身份');
  await assertSuperAdmin(db, userId);

  const status = url.searchParams.get('status');
  const category = url.searchParams.get('category');
  const filters = [];
  const binds = [];
  if (status && FEEDBACK_STATUSES.includes(status)) {
    filters.push('t.status = ?');
    binds.push(status);
  }
  if (category && FEEDBACK_CATEGORIES.includes(category)) {
    filters.push('t.category = ?');
    binds.push(category);
  }
  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const rows = await db
    .prepare(
      `SELECT t.id, t.user_id, t.category, t.title, t.status,
              t.user_has_unread_reply, t.admin_has_unread_reply,
              t.created_at, t.updated_at,
              u.nickname AS user_nickname, u.username AS user_username,
              (SELECT COUNT(*) FROM feedback_messages m WHERE m.ticket_id = t.id) AS message_count
       FROM feedback_tickets t
       LEFT JOIN users u ON u.id = t.user_id
       ${whereClause}
       ORDER BY t.updated_at DESC
       LIMIT 500`,
    )
    .bind(...binds)
    .all();

  const unreadRow = await db
    .prepare('SELECT COUNT(*) AS cnt FROM feedback_tickets WHERE admin_has_unread_reply = 1')
    .first();

  const tickets = (rows.results || []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    user_name: r.user_nickname || r.user_username || '（已注销）',
    category: r.category,
    title: r.title,
    status: r.status,
    admin_has_unread_reply: !!r.admin_has_unread_reply,
    message_count: r.message_count || 0,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  return json({ tickets, unread_count: unreadRow?.cnt || 0 });
}

async function handleAdminGetFeedbackDetail(db, request, ticketId) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));
  if (!userId) return error('缺少有效的超管身份');
  await assertSuperAdmin(db, userId);

  const ticket = await db
    .prepare(
      `SELECT t.*, u.nickname AS user_nickname, u.username AS user_username
       FROM feedback_tickets t
       LEFT JOIN users u ON u.id = t.user_id
       WHERE t.id = ?`,
    )
    .bind(ticketId)
    .first();
  if (!ticket) return error('反馈不存在', 404);

  const messageRows = await db
    .prepare(
      `SELECT m.id, m.sender_user_id, m.sender_role, m.content, m.image_data, m.created_at,
              u.nickname AS sender_name, u.username AS sender_username
       FROM feedback_messages m
       LEFT JOIN users u ON u.id = m.sender_user_id
       WHERE m.ticket_id = ?
       ORDER BY m.created_at ASC`,
    )
    .bind(ticketId)
    .all();

  if (ticket.admin_has_unread_reply) {
    await db
      .prepare('UPDATE feedback_tickets SET admin_has_unread_reply = 0 WHERE id = ?')
      .bind(ticketId)
      .run();
  }

  return json({
    ticket: {
      id: ticket.id,
      user_id: ticket.user_id,
      user_name: ticket.user_nickname || ticket.user_username || '（已注销）',
      category: ticket.category,
      title: ticket.title,
      status: ticket.status,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
    },
    messages: (messageRows.results || []).map((m) => ({
      id: m.id,
      sender_role: m.sender_role,
      sender_name: m.sender_name || m.sender_username || (m.sender_role === 'admin' ? '官方' : '教师'),
      content: m.content,
      image_data: m.image_data,
      created_at: m.created_at,
    })),
  });
}

async function handleAdminReplyFeedback(db, request, ticketId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  if (!userId) return error('缺少有效的超管身份');
  const admin = await assertSuperAdmin(db, userId);

  const ticket = await db
    .prepare('SELECT id, title, status FROM feedback_tickets WHERE id = ?')
    .bind(ticketId)
    .first();
  if (!ticket) return error('反馈不存在', 404);
  if (ticket.status === 'closed') return error('该反馈已关闭，请先恢复状态');

  const validated = validateFeedbackContent(body.content, body.image_data);
  if (!validated.ok) return error(validated.message);

  await db
    .prepare(
      `INSERT INTO feedback_messages (ticket_id, sender_user_id, sender_role, content, image_data)
       VALUES (?, ?, 'admin', ?, ?)`,
    )
    .bind(ticketId, userId, validated.text, validated.image)
    .run();

  await db
    .prepare(
      `UPDATE feedback_tickets
       SET user_has_unread_reply = 1,
           updated_at = CURRENT_TIMESTAMP,
           status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END
       WHERE id = ?`,
    )
    .bind(ticketId)
    .run();

  await appendAdminLog(db, {
    userId,
    actionType: '反馈回复',
    detail: `超管 ${admin.nickname || admin.username} 回复反馈「${ticket.title}」（#${ticketId}）`,
  });

  return json({ success: true });
}

async function handleAdminUpdateFeedbackStatus(db, request, ticketId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  if (!userId) return error('缺少有效的超管身份');
  const admin = await assertSuperAdmin(db, userId);

  if (!FEEDBACK_STATUSES.includes(body.status)) return error('无效的状态值');

  const ticket = await db
    .prepare('SELECT id, title, status FROM feedback_tickets WHERE id = ?')
    .bind(ticketId)
    .first();
  if (!ticket) return error('反馈不存在', 404);

  await db
    .prepare('UPDATE feedback_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(body.status, ticketId)
    .run();

  await appendAdminLog(db, {
    userId,
    actionType: '反馈状态变更',
    detail: `超管 ${admin.nickname || admin.username} 将反馈「${ticket.title}」(#${ticketId}) 状态从 ${ticket.status} 变更为 ${body.status}`,
  });

  return json({ success: true, status: body.status });
}

async function handleAdminDeleteFeedback(db, request, ticketId) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));
  if (!userId) return error('缺少有效的超管身份');
  const admin = await assertSuperAdmin(db, userId);

  const ticket = await db
    .prepare('SELECT id, title FROM feedback_tickets WHERE id = ?')
    .bind(ticketId)
    .first();
  if (!ticket) return error('工单不存在', 404);

  await db
    .prepare('DELETE FROM feedback_tickets WHERE id = ?')
    .bind(ticketId)
    .run();

  await appendAdminLog(db, {
    userId,
    actionType: '反馈工单管理',
    detail: `超管 ${admin.nickname || admin.username} 删除反馈工单「${ticket.title}」(#${ticketId})`,
  });

  return json({ success: true });
}

async function handleUploadPetImage(db, request, env) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));

  if (!userId) {
    return error('缺少有效的超管身份');
  }

  await assertSuperAdmin(db, userId);

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || typeof file === 'string') {
    return error('缺少文件', 400);
  }

  if (!String(file.type || '').startsWith('image/')) {
    return error('只支持图片文件', 400);
  }

  if (Number(file.size || 0) > 2 * 1024 * 1024) {
    return error('图片不能超过 2MB', 400);
  }

  if (!env.PET_IMAGES) {
    return error('未配置宠物图片存储', 500);
  }

  const rawExt = String(file.name || '').includes('.') ? String(file.name).split('.').pop() : 'png';
  const ext = String(rawExt || 'png')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10) || 'png';
  const key = `pets/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  await env.PET_IMAGES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'image/png' },
  });

  return json({ key });
}

async function handleGetPetImage(request, env, key) {
  if (!env.PET_IMAGES) {
    return error('未配置宠物图片存储', 500);
  }

  const normalizedKey = decodeURIComponent(String(key || ''));
  const object = await env.PET_IMAGES.get(normalizedKey);

  if (!object) {
    return error('图片不存在', 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('cache-control', 'public, max-age=31536000');
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(object.body, { headers });
}

async function handleGetPublicCustomPets(db) {
  const result = await db
    .prepare('SELECT * FROM custom_pets ORDER BY category ASC, name ASC, id ASC')
    .all();

  return json({
    pets: result.results || [],
  });
}

async function handleCreateCustomPet(db, request) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));

  if (!userId) {
    return error('缺少有效的超管身份');
  }

  await assertSuperAdmin(db, userId);

  const body = await readBody(request);
  const name = String(body.name || '').trim();
  const category = String(body.category || '');
  const imageKeys = [1, 2, 3, 4, 5, 6, 7].map((level) => String(body[`imageLv${level}`] || '').trim());

  if (!name) {
    return error('宠物名称不能为空', 400);
  }

  if (!['animal', 'plant', 'dinosaur', 'robot'].includes(category)) {
    return error('无效的分类', 400);
  }

  if (imageKeys.some((item) => !item)) {
    return error('请上传全部 7 个等级的图片', 400);
  }

  const result = await db
    .prepare(
      `INSERT INTO custom_pets
       (name, category, image_lv1, image_lv2, image_lv3, image_lv4, image_lv5, image_lv6, image_lv7)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(name, category, ...imageKeys)
    .run();

  await appendAdminLog(db, {
    userId,
    actionType: '新增自定义宠物',
    detail: `宠物名称: ${name}, 分类: ${category}`,
  });

  return json({
    success: true,
    id: result.meta?.last_row_id || null,
  });
}

async function handleListCustomPets(db, request) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));

  if (!userId) {
    return error('缺少有效的超管身份');
  }

  await assertSuperAdmin(db, userId);

  const result = await db.prepare('SELECT * FROM custom_pets ORDER BY created_at DESC, id DESC').all();

  return json({
    pets: result.results || [],
  });
}

async function handleDeleteCustomPet(db, request, env, petId) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));

  if (!userId) {
    return error('缺少有效的超管身份');
  }

  await assertSuperAdmin(db, userId);

  const pet = await db.prepare('SELECT * FROM custom_pets WHERE id = ?').bind(petId).first();

  if (!pet) {
    return error('宠物不存在', 404);
  }

  if (!env.PET_IMAGES) {
    return error('未配置宠物图片存储', 500);
  }

  const keys = [pet.image_lv1, pet.image_lv2, pet.image_lv3, pet.image_lv4, pet.image_lv5, pet.image_lv6, pet.image_lv7]
    .filter(Boolean);

  await Promise.all(keys.map((key) => env.PET_IMAGES.delete(key)));

  await db.prepare('DELETE FROM custom_pets WHERE id = ?').bind(petId).run();

  await appendAdminLog(db, {
    userId,
    actionType: '删除自定义宠物',
    detail: `宠物 ID: ${petId}, 名称: ${pet.name}`,
  });

  return json({ success: true });
}

// ─── 超管账户管理 ────────────────────────────────────────────────────────────

async function handleListAdminUsers(db, request) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));

  if (!userId) {
    return error('缺少有效的教师身份');
  }

  await assertSuperAdmin(db, userId);

  const result = await db
    .prepare(
       `SELECT u.id, u.username, u.nickname, u.level, u.expire_at, u.role, u.created_at
              , u.status
              , u.register_source, u.source_note, u.register_channel, u.register_ip, u.register_user_agent
              , (
                SELECT COUNT(*)
                FROM users same_ip_users
                WHERE same_ip_users.register_ip = u.register_ip
                  AND u.register_ip IS NOT NULL
                  AND TRIM(u.register_ip) != ''
              ) AS same_ip_count
       FROM users u
       ORDER BY u.created_at DESC, u.id DESC`,
    )
    .all();

  return json({
    users: (result.results || []).map((row) => ({
      ...normalizeUser(row),
      created_at: row.created_at,
    })),
  });
}

async function handleListAdminLogs(db, request) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));

  if (!userId) {
    return error('缺少有效的教师身份');
  }

  await assertSuperAdmin(db, userId);

  return json({
    logs: await getAdminLogs(db),
  });
}

async function handleGetPublicFreeRegisterFlag(db) {
  const flag = await getFreeRegisterFlag(db);

  return json({
    freeRegister: {
      enabled: flag.enabled,
      is_active: flag.is_active,
      mode: flag.mode,
      end_at: flag.end_at,
      default_level: flag.value.default_level,
      updated_at: flag.updated_at,
    },
  });
}

async function handleGetPublicRegistrationChannel(db, request) {
  const url = new URL(request.url);
  const code = sanitizeChannelCode(url.searchParams.get('code'));

  if (!code) {
    return json({ channel: null });
  }

  const channel = await getRegistrationChannelByCode(db, code);

  if (!channel) {
    return json({ channel: null });
  }

  return json({
    channel: {
      code: channel.code,
      name: channel.name,
      is_active: channel.is_active,
      require_activation: channel.require_activation,
      default_level: channel.default_level,
      end_at: channel.end_at,
      note: channel.note,
    },
  });
}

async function handleListRegistrationChannels(db, request) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));

  if (!userId) {
    return error('缺少有效的教师身份');
  }

  await assertSuperAdmin(db, userId);

  return json({
    channels: await listRegistrationChannels(db),
  });
}

async function handleCreateRegistrationChannel(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);

  if (!userId) {
    return error('缺少有效的超管身份');
  }

  await assertSuperAdmin(db, userId);

  const code = sanitizeChannelCode(body.code);
  const name = String(body.name || '').trim();
  const enabled = body.enabled === undefined ? true : Boolean(body.enabled);
  const requireActivation = body.require_activation === undefined ? true : Boolean(body.require_activation);
  const defaultLevel = sanitizeFreeRegisterLevel(body.default_level);
  const note = String(body.note || '').trim();
  const endAt = body.end_at ? String(body.end_at).trim() : null;

  if (!code || !name) {
    return error('请填写渠道名称和渠道标识');
  }

  if (endAt) {
    const timestamp = new Date(endAt).getTime();
    if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
      return error('渠道截止时间需要晚于当前时间');
    }
  }

  const exists = await db.prepare('SELECT id FROM registration_channels WHERE code = ?').bind(code).first();
  if (exists) {
    return error('渠道标识已存在，请更换');
  }

  await db
    .prepare(
      `INSERT INTO registration_channels (code, name, enabled, require_activation, default_level, end_at, note, updated_by_user_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    )
    .bind(code, name, enabled ? 1 : 0, requireActivation ? 1 : 0, defaultLevel, endAt, note || null, userId)
    .run();

  await appendAdminLog(db, {
    userId,
    actionType: '系统配置',
    detail: `新增注册渠道：${code}（${name}），${requireActivation ? '需要激活码' : '免激活'}，默认等级 ${defaultLevel}`,
  });

  return json({
    channels: await listRegistrationChannels(db),
  });
}

async function handleUpdateRegistrationChannel(db, request, channelId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);

  if (!userId) {
    return error('缺少有效的超管身份');
  }

  await assertSuperAdmin(db, userId);

  const existing = await db
    .prepare(
      `SELECT id, code, name, enabled, require_activation, default_level, end_at, note
       FROM registration_channels
       WHERE id = ?`,
    )
    .bind(channelId)
    .first();

  if (!existing) {
    return error('目标渠道不存在', 404);
  }

  const nextCode = sanitizeChannelCode(body.code ?? existing.code);
  const nextName = String(body.name ?? existing.name).trim();
  const nextEnabled = body.enabled === undefined ? Boolean(existing.enabled) : Boolean(body.enabled);
  const nextRequireActivation =
    body.require_activation === undefined ? Boolean(existing.require_activation) : Boolean(body.require_activation);
  const nextDefaultLevel = sanitizeFreeRegisterLevel(body.default_level ?? existing.default_level);
  const nextNote = String(body.note ?? existing.note ?? '').trim();
  const nextEndAt =
    body.end_at === '' ? null : body.end_at === undefined ? existing.end_at : String(body.end_at).trim();

  if (!nextCode || !nextName) {
    return error('请填写渠道名称和渠道标识');
  }

  if (nextEndAt) {
    const timestamp = new Date(nextEndAt).getTime();
    if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
      return error('渠道截止时间需要晚于当前时间');
    }
  }

  const duplicate = await db
    .prepare('SELECT id FROM registration_channels WHERE code = ? AND id != ?')
    .bind(nextCode, channelId)
    .first();

  if (duplicate) {
    return error('渠道标识已存在，请更换');
  }

  await db
    .prepare(
      `UPDATE registration_channels
       SET code = ?, name = ?, enabled = ?, require_activation = ?, default_level = ?, end_at = ?, note = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(
      nextCode,
      nextName,
      nextEnabled ? 1 : 0,
      nextRequireActivation ? 1 : 0,
      nextDefaultLevel,
      nextEndAt,
      nextNote || null,
      userId,
      channelId,
    )
    .run();

  await appendAdminLog(db, {
    userId,
    actionType: '系统配置',
    detail: `更新注册渠道：${existing.code} -> ${nextCode}，${nextRequireActivation ? '需要激活码' : '免激活'}，默认等级 ${nextDefaultLevel}`,
  });

  return json({
    channels: await listRegistrationChannels(db),
  });
}

async function handleUpdateFreeRegisterFlag(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);

  if (!userId) {
    return error('缺少有效的超管身份');
  }

  await assertSuperAdmin(db, userId);

  const enabled = Boolean(body.enabled);
  const mode = sanitizeFreeRegisterMode(body.mode);
  const defaultLevel = sanitizeFreeRegisterLevel(body.default_level);
  const rawEndAt = body.end_at ? String(body.end_at).trim() : '';
  const endAt = mode === 'until' ? rawEndAt : null;

  if (mode === 'until') {
    const timestamp = new Date(endAt).getTime();

    if (!endAt || !Number.isFinite(timestamp) || timestamp <= Date.now()) {
      return error('请设置一个晚于当前时间的截止时间');
    }
  }

  await ensureSystemFlags(db);

  await db
    .prepare(
      `UPDATE system_flags
       SET enabled = ?, mode = ?, end_at = ?, value_json = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE key = 'free_register'`,
    )
    .bind(
      enabled ? 1 : 0,
      mode,
      endAt,
      JSON.stringify({ default_level: defaultLevel }),
      userId,
    )
    .run();

  await appendAdminLog(db, {
    userId,
    actionType: '系统配置',
    detail: `更新免激活注册：${enabled ? '开启' : '关闭'}，${mode === 'until' ? '截止时间模式' : '永久生效'}，默认等级 ${defaultLevel}${endAt ? `，截止 ${endAt}` : ''}`,
  });

  const flag = await getFreeRegisterFlag(db);

  return json({
    freeRegister: {
      enabled: flag.enabled,
      is_active: flag.is_active,
      mode: flag.mode,
      end_at: flag.end_at,
      default_level: flag.value.default_level,
      updated_at: flag.updated_at,
      updated_by_user_id: flag.updated_by_user_id,
    },
  });
}

async function handleUpdateToolboxAccessFlag(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const rawConfig = body.config;

  if (!userId) {
    return error('缺少有效的超管身份');
  }

  if (!rawConfig || typeof rawConfig !== 'object') {
    return error('百宝箱权限配置格式不正确');
  }

  await assertSuperAdmin(db, userId);
  await ensureSystemFlags(db);

  const nextConfig = { ...DEFAULT_TOOLBOX_ACCESS };
  Object.keys(DEFAULT_TOOLBOX_ACCESS).forEach((toolId) => {
    nextConfig[toolId] = sanitizeToolboxLevel(rawConfig[toolId]);
  });

  await db
    .prepare(
      `UPDATE system_flags
       SET enabled = 1, mode = 'permanent', end_at = NULL, value_json = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE key = 'toolbox_access'`,
    )
    .bind(JSON.stringify(nextConfig), userId)
    .run();

  await appendAdminLog(db, {
    userId,
    actionType: '系统配置',
    detail: `更新百宝箱权限：${Object.entries(nextConfig)
      .map(([toolId, level]) => `${toolId}=${level}`)
      .join('，')}`,
  });

  const flag = await getToolboxAccessFlag(db);

  return json({
    toolboxAccess: flag.value,
    updated_at: flag.updated_at,
    updated_by_user_id: flag.updated_by_user_id,
  });
}

async function handleUpdateAdminUser(db, request, targetUserId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const updates = body.updates && typeof body.updates === 'object' ? body.updates : {};

  if (!userId) {
    return error('缺少有效的教师身份');
  }

  await assertSuperAdmin(db, userId);

  const targetUser = await db
    .prepare(
      `SELECT id, username, nickname, level, expire_at, role, status, register_source, source_note
       FROM users
       WHERE id = ?`,
    )
    .bind(targetUserId)
    .first();

  if (!targetUser) {
    return error('目标账号不存在', 404);
  }

  const nextNickname = String(updates.nickname ?? targetUser.nickname).trim();
  const nextLevel = ['temporary', 'vip1', 'vip2', 'permanent'].includes(updates.level)
    ? updates.level
    : targetUser.level;
  const nextRole = ['teacher', 'super_admin'].includes(updates.role)
    ? updates.role
    : targetUser.role;
  const nextStatus = ['active', 'disabled'].includes(updates.status)
    ? updates.status
    : targetUser.status;
  const nextExpireAt = updates.expire_at === '' ? null : updates.expire_at ?? targetUser.expire_at;

  if (!nextNickname) {
    return error('昵称不能为空');
  }

  await db
    .prepare('UPDATE users SET nickname = ?, level = ?, expire_at = ?, role = ?, status = ? WHERE id = ?')
    .bind(nextNickname, nextLevel, nextExpireAt, nextRole, nextStatus, targetUserId)
    .run();

  await appendAdminLog(db, {
    userId,
    actionType: '账号管理',
    detail: `更新账号 ${targetUser.username}：等级 ${targetUser.level} -> ${nextLevel}，角色 ${targetUser.role} -> ${nextRole}，状态 ${targetUser.status} -> ${nextStatus}`,
  });

  return json({ success: true });
}

async function handleBatchUpdateAdminUsers(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const userIds = Array.isArray(body.userIds)
    ? Array.from(new Set(body.userIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)))
    : [];
  const updates = body.updates && typeof body.updates === 'object' ? body.updates : {};

  if (!userId) {
    return error('缺少有效的教师身份');
  }

  if (userIds.length === 0) {
    return error('请至少选择一个账号');
  }

  await assertSuperAdmin(db, userId);

  const placeholders = userIds.map(() => '?').join(', ');
  const result = await db
    .prepare(
      `SELECT id, username, nickname, level, expire_at, role, status, register_source, source_note
       FROM users
       WHERE id IN (${placeholders})`,
    )
    .bind(...userIds)
    .all();

  const targetUsers = result.results || [];
  if (targetUsers.length !== userIds.length) {
    return error('部分账号不存在');
  }

  const statements = [];
  const changedFields = [];

  for (const targetUser of targetUsers) {
    const nextLevel = ['temporary', 'vip1', 'vip2', 'permanent'].includes(updates.level)
      ? updates.level
      : targetUser.level;
    const nextRole = ['teacher', 'super_admin'].includes(updates.role)
      ? updates.role
      : targetUser.role;
    const nextStatus = ['active', 'disabled'].includes(updates.status)
      ? updates.status
      : targetUser.status;
    const nextExpireAt = updates.expire_at === '' ? null : updates.expire_at ?? targetUser.expire_at;

    statements.push(
      db
        .prepare('UPDATE users SET nickname = ?, level = ?, expire_at = ?, role = ?, status = ? WHERE id = ?')
        .bind(targetUser.nickname, nextLevel, nextExpireAt, nextRole, nextStatus, targetUser.id),
    );
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'level')) {
    changedFields.push(`等级 -> ${updates.level}`);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'role')) {
    changedFields.push(`角色 -> ${updates.role}`);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
    changedFields.push(`状态 -> ${updates.status}`);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'expire_at')) {
    changedFields.push(`有效期 -> ${updates.expire_at || '长期有效'}`);
  }

  await db.batch(statements);

  await appendAdminLog(db, {
    userId,
    actionType: '账号管理',
    detail: `批量更新 ${targetUsers.length} 个账号（${targetUsers.slice(0, 8).map((item) => item.username).join('、')}${targetUsers.length > 8 ? ' 等' : ''}）：${changedFields.join('，') || '基础信息调整'}`,
  });

  return json({ success: true });
}

async function handleResetAdminUserPassword(db, request, targetUserId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const nextPassword = String(body.nextPassword || '');

  if (!userId) {
    return error('缺少有效的教师身份');
  }

  if (!validatePassword(nextPassword)) {
    return error('新密码至少需要 6 位');
  }

  await assertSuperAdmin(db, userId);

  const targetUser = await db
    .prepare('SELECT id FROM users WHERE id = ?')
    .bind(targetUserId)
    .first();

  if (!targetUser) {
    return error('目标账号不存在', 404);
  }

  await db
    .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .bind(await hashPassword(nextPassword), targetUserId)
    .run();

  await appendAdminLog(db, {
    userId,
    actionType: '账号管理',
    detail: `重置了账号 #${targetUserId} 的登录密码`,
  });

  return json({ success: true });
}

async function handleCreateActivationCode(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);

  if (!userId) {
    return error('缺少有效的教师身份');
  }

  await assertSuperAdmin(db, userId);

  const rawCode = String(body.code || '').trim().toUpperCase();
  const prefix = String(body.prefix || 'CLASS').trim().toUpperCase();
  const code = rawCode || generateActivationCode(prefix);
  const level = ['vip1', 'vip2', 'permanent'].includes(body.level) ? body.level : 'vip1';
  const expiresInDays =
    body.expires_in_days === '' || body.expires_in_days === null || body.expires_in_days === undefined
      ? null
      : Math.max(1, Number(body.expires_in_days || 0));
  const maxUses = Math.max(1, Number(body.max_uses || 1));

  if (!/^[A-Z0-9-]{6,40}$/.test(code)) {
    return error('激活码需为 6-40 位大写字母、数字或中划线');
  }

  const existing = await db
    .prepare('SELECT id FROM activation_codes WHERE code = ?')
    .bind(code)
    .first();

  if (existing) {
    return error('激活码已存在，请更换后再试');
  }

  await db
    .prepare(
      `INSERT INTO activation_codes
       (code, level, expires_in_days, max_uses, used_count, status, created_by_user_id)
       VALUES (?, ?, ?, ?, 0, 'active', ?)`,
    )
    .bind(code, level, expiresInDays, maxUses, userId)
    .run();

  await appendAdminLog(db, {
    userId,
    actionType: '激活码管理',
    detail: `创建激活码 ${code}，等级 ${level}，可用 ${maxUses} 次`,
  });

  return json({ success: true });
}

async function handleBatchCreateActivationCodes(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);

  if (!userId) {
    return error('缺少有效的教师身份');
  }

  await assertSuperAdmin(db, userId);

  const prefix = String(body.prefix || 'CLASS').trim().toUpperCase();
  const level = ['vip1', 'vip2', 'permanent'].includes(body.level) ? body.level : 'vip1';
  const expiresInDays =
    body.expires_in_days === '' || body.expires_in_days === null || body.expires_in_days === undefined
      ? null
      : Math.max(1, Number(body.expires_in_days || 0));
  const maxUses = Math.max(1, Number(body.max_uses || 1));
  const count = Math.max(1, Math.min(100, Number(body.count || 1)));

  const statements = [];
  const createdCodes = [];

  for (let index = 0; index < count; index += 1) {
    let code = generateActivationCode(prefix);

    // Ensure uniqueness for the current batch.
    while (createdCodes.includes(code)) {
      code = generateActivationCode(prefix);
    }

    createdCodes.push(code);
    statements.push(
      db
        .prepare(
          `INSERT INTO activation_codes
           (code, level, expires_in_days, max_uses, used_count, status, created_by_user_id)
           VALUES (?, ?, ?, ?, 0, 'active', ?)`,
        )
        .bind(code, level, expiresInDays, maxUses, userId),
    );
  }

  await db.batch(statements);

  await appendAdminLog(db, {
    userId,
    actionType: '激活码管理',
    detail: `批量生成了 ${createdCodes.length} 个 ${level} 激活码，前缀 ${prefix || 'CLASS'}`,
  });

  return json({
    success: true,
    createdCodes,
  });
}

async function handleUpdateActivationCode(db, request, codeId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const updates = body.updates && typeof body.updates === 'object' ? body.updates : {};

  if (!userId) {
    return error('缺少有效的教师身份');
  }

  await assertSuperAdmin(db, userId);

  const existing = await db
    .prepare(
      `SELECT id, code, level, expires_in_days, max_uses, used_count, status
       FROM activation_codes
       WHERE id = ?`,
    )
    .bind(codeId)
    .first();

  if (!existing) {
    return error('激活码不存在', 404);
  }

  const nextLevel = ['vip1', 'vip2', 'permanent'].includes(updates.level) ? updates.level : existing.level;
  const nextStatus = sanitizeCodeStatus(updates.status ?? existing.status);
  const nextExpiresInDays =
    updates.expires_in_days === ''
      ? null
      : updates.expires_in_days ?? existing.expires_in_days;
  const nextMaxUses = Math.max(
    Number(existing.used_count || 0),
    Math.max(1, Number(updates.max_uses ?? existing.max_uses ?? 1)),
  );

  await db
    .prepare(
      `UPDATE activation_codes
       SET level = ?, expires_in_days = ?, max_uses = ?, status = ?
       WHERE id = ?`,
    )
    .bind(nextLevel, nextExpiresInDays, nextMaxUses, nextStatus, codeId)
    .run();

  await appendAdminLog(db, {
    userId,
    actionType: '激活码管理',
    detail: `更新激活码 ${existing.code}：等级 ${existing.level} -> ${nextLevel}，状态 ${existing.status} -> ${nextStatus}`,
  });

  return json({ success: true });
}

async function handleBatchUpdateActivationCodes(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const codeIds = Array.isArray(body.codeIds)
    ? Array.from(new Set(body.codeIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)))
    : [];
  const updates = body.updates && typeof body.updates === 'object' ? body.updates : {};

  if (!userId) {
    return error('缺少有效的教师身份');
  }

  if (codeIds.length === 0) {
    return error('请至少选择一个激活码');
  }

  await assertSuperAdmin(db, userId);

  const placeholders = codeIds.map(() => '?').join(', ');
  const result = await db
    .prepare(
      `SELECT id, code, level, expires_in_days, max_uses, used_count, status
       FROM activation_codes
       WHERE id IN (${placeholders})`,
    )
    .bind(...codeIds)
    .all();

  const targetCodes = result.results || [];
  if (targetCodes.length !== codeIds.length) {
    return error('部分激活码不存在');
  }

  const statements = [];
  for (const existing of targetCodes) {
    const nextLevel = ['vip1', 'vip2', 'permanent'].includes(updates.level) ? updates.level : existing.level;
    const nextStatus = sanitizeCodeStatus(updates.status ?? existing.status);
    const nextExpiresInDays =
      updates.expires_in_days === ''
        ? null
        : updates.expires_in_days ?? existing.expires_in_days;
    const nextMaxUses = Math.max(
      Number(existing.used_count || 0),
      Math.max(1, Number(updates.max_uses ?? existing.max_uses ?? 1)),
    );

    statements.push(
      db
        .prepare(
          `UPDATE activation_codes
           SET level = ?, expires_in_days = ?, max_uses = ?, status = ?
           WHERE id = ?`,
        )
        .bind(nextLevel, nextExpiresInDays, nextMaxUses, nextStatus, existing.id),
    );
  }

  const changedFields = [];
  if (Object.prototype.hasOwnProperty.call(updates, 'level')) {
    changedFields.push(`等级 -> ${updates.level}`);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
    changedFields.push(`状态 -> ${updates.status}`);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'expires_in_days')) {
    changedFields.push(`有效天数 -> ${updates.expires_in_days || '长期有效'}`);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'max_uses')) {
    changedFields.push(`可用次数 -> ${updates.max_uses}`);
  }

  await db.batch(statements);

  await appendAdminLog(db, {
    userId,
    actionType: '激活码管理',
    detail: `批量更新 ${targetCodes.length} 个激活码（${targetCodes.slice(0, 8).map((item) => item.code).join('、')}${targetCodes.length > 8 ? ' 等' : ''}）：${changedFields.join('，') || '规则调整'}`,
  });

  return json({ success: true });
}

async function handleBatchDeleteActivationCodes(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const codeIds = Array.isArray(body.codeIds)
    ? Array.from(new Set(body.codeIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)))
    : [];

  if (!userId) return error('缺少有效的教师身份');
  if (codeIds.length === 0) return error('请至少选择一个激活码');

  await assertSuperAdmin(db, userId);

  const placeholders = codeIds.map(() => '?').join(', ');
  const result = await db
    .prepare(`SELECT id, code, used_count FROM activation_codes WHERE id IN (${placeholders})`)
    .bind(...codeIds)
    .all();

  const targetCodes = result.results || [];
  if (targetCodes.length !== codeIds.length) return error('部分激活码不存在');

  // 已使用的激活码不允许删除
  const usedCodes = targetCodes.filter((c) => Number(c.used_count || 0) > 0);
  if (usedCodes.length > 0) {
    return error(
      `包含 ${usedCodes.length} 个已使用的激活码（${usedCodes.slice(0, 3).map((c) => c.code).join('、')}${usedCodes.length > 3 ? ' 等' : ''}），不可删除`,
    );
  }

  await db
    .prepare(`DELETE FROM activation_codes WHERE id IN (${placeholders})`)
    .bind(...codeIds)
    .run();

  await appendAdminLog(db, {
    userId,
    actionType: '激活码管理',
    detail: `批量删除了 ${targetCodes.length} 个未使用激活码：${targetCodes.slice(0, 8).map((c) => c.code).join('、')}${targetCodes.length > 8 ? ' 等' : ''}`,
  });

  return json({ success: true });
}

async function handleBatchRevokeActivationCodes(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const codeIds = Array.isArray(body.codeIds)
    ? Array.from(new Set(body.codeIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)))
    : [];

  if (!userId) {
    return error('缺少有效的教师身份');
  }

  if (codeIds.length === 0) {
    return error('请至少选择一个激活码');
  }

  await assertSuperAdmin(db, userId);

  const placeholders = codeIds.map(() => '?').join(', ');
  const result = await db
    .prepare(
      `SELECT id, code, status
       FROM activation_codes
       WHERE id IN (${placeholders})`,
    )
    .bind(...codeIds)
    .all();

  const targetCodes = result.results || [];

  if (targetCodes.length !== codeIds.length) {
    return error('部分激活码不存在');
  }

  await db
    .prepare(`UPDATE activation_codes SET status = 'revoked' WHERE id IN (${placeholders})`)
    .bind(...codeIds)
    .run();

  await appendAdminLog(db, {
    userId,
    actionType: '激活码管理',
    detail: `批量作废了 ${targetCodes.length} 个激活码：${targetCodes.slice(0, 8).map((item) => item.code).join('、')}${targetCodes.length > 8 ? ' 等' : ''}`,
  });

  return json({ success: true });
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

      if (path === '/api/public/system-flags/free-register' && request.method === 'GET') {
        return await handleGetPublicFreeRegisterFlag(db);
      }

      if (path === '/api/public/register-channel' && request.method === 'GET') {
        return await handleGetPublicRegistrationChannel(db, request);
      }

      // ─── 通知路由 ──────────────────────────────────────
      if (path === '/api/notifications' && request.method === 'GET') {
        return await handleGetNotifications(db, request);
      }

      const notifReadMatch = path.match(/^\/api\/notifications\/(\d+)\/read$/);
      if (notifReadMatch && request.method === 'POST') {
        return await handleMarkNotificationRead(db, request, Number(notifReadMatch[1]));
      }

      if (path === '/api/notifications/read-all' && request.method === 'POST') {
        return await handleMarkAllNotificationsRead(db, request);
      }

      if (path === '/api/admin/notifications' && request.method === 'POST') {
        return await handleAdminCreateNotification(db, request);
      }

      if (path === '/api/admin/notifications' && request.method === 'GET') {
        return await handleAdminGetNotifications(db, request);
      }

      const adminNotifMatch = path.match(/^\/api\/admin\/notifications\/(\d+)$/);
      if (adminNotifMatch && request.method === 'DELETE') {
        return await handleAdminDeleteNotification(db, request, Number(adminNotifMatch[1]));
      }
      if (adminNotifMatch && request.method === 'PATCH') {
        return await handleAdminUpdateNotification(db, request, Number(adminNotifMatch[1]));
      }

      // ─── 反馈工单路由 ──────────────────────────────────
      if (path === '/api/feedback' && request.method === 'GET') {
        return await handleListMyFeedback(db, request);
      }

      if (path === '/api/feedback' && request.method === 'POST') {
        return await handleCreateFeedback(db, request);
      }

      const feedbackMsgMatch = path.match(/^\/api\/feedback\/(\d+)\/messages$/);
      if (feedbackMsgMatch && request.method === 'POST') {
        return await handleReplyFeedbackByUser(db, request, Number(feedbackMsgMatch[1]));
      }

      const feedbackDetailMatch = path.match(/^\/api\/feedback\/(\d+)$/);
      if (feedbackDetailMatch && request.method === 'DELETE') {
        return await handleUserDeleteFeedback(db, request, Number(feedbackDetailMatch[1]));
      }
      if (feedbackDetailMatch && request.method === 'GET') {
        return await handleGetMyFeedbackDetail(db, request, Number(feedbackDetailMatch[1]));
      }

      if (path === '/api/admin/feedback' && request.method === 'GET') {
        return await handleAdminListFeedback(db, request);
      }

      const adminFbReplyMatch = path.match(/^\/api\/admin\/feedback\/(\d+)\/reply$/);
      if (adminFbReplyMatch && request.method === 'POST') {
        return await handleAdminReplyFeedback(db, request, Number(adminFbReplyMatch[1]));
      }

      const adminFbDetailMatch = path.match(/^\/api\/admin\/feedback\/(\d+)$/);
      if (adminFbDetailMatch && request.method === 'DELETE') {
        return await handleAdminDeleteFeedback(db, request, Number(adminFbDetailMatch[1]));
      }
      if (adminFbDetailMatch && request.method === 'GET') {
        return await handleAdminGetFeedbackDetail(db, request, Number(adminFbDetailMatch[1]));
      }
      if (adminFbDetailMatch && request.method === 'PATCH') {
        return await handleAdminUpdateFeedbackStatus(db, request, Number(adminFbDetailMatch[1]));
      }

      const petImageMatch = path.match(/^\/api\/pets\/images\/(.+)$/);
      if (petImageMatch && request.method === 'GET') {
        return await handleGetPetImage(request, env, petImageMatch[1]);
      }

      if (path === '/api/pets/custom' && request.method === 'GET') {
        return await handleGetPublicCustomPets(db);
      }

      if (path === '/api/admin/pets/upload' && request.method === 'POST') {
        return await handleUploadPetImage(db, request, env);
      }

      const adminPetsDetailMatch = path.match(/^\/api\/admin\/pets\/(\d+)$/);
      if (adminPetsDetailMatch && request.method === 'DELETE') {
        return await handleDeleteCustomPet(db, request, env, Number(adminPetsDetailMatch[1]));
      }

      if (path === '/api/admin/pets' && request.method === 'GET') {
        return await handleListCustomPets(db, request);
      }

      if (path === '/api/admin/pets' && request.method === 'POST') {
        return await handleCreateCustomPet(db, request);
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

      if (path === '/api/admin/users' && request.method === 'GET') {
        return await handleListAdminUsers(db, request);
      }

      if (path === '/api/admin/users/batch-update' && request.method === 'POST') {
        return await handleBatchUpdateAdminUsers(db, request);
      }

      if (path === '/api/admin/logs' && request.method === 'GET') {
        return await handleListAdminLogs(db, request);
      }

      if (path === '/api/admin/register-channels' && request.method === 'GET') {
        return await handleListRegistrationChannels(db, request);
      }

      if (path === '/api/admin/register-channels' && request.method === 'POST') {
        return await handleCreateRegistrationChannel(db, request);
      }

      if (path === '/api/admin/system-flags/free-register' && request.method === 'PUT') {
        return await handleUpdateFreeRegisterFlag(db, request);
      }

      if (path === '/api/admin/system-flags/toolbox-access' && request.method === 'PUT') {
        return await handleUpdateToolboxAccessFlag(db, request);
      }

      const adminUserMatch = path.match(/^\/api\/admin\/users\/(\d+)$/);
      if (adminUserMatch && request.method === 'PATCH') {
        return await handleUpdateAdminUser(db, request, Number(adminUserMatch[1]));
      }

      const adminUserClassesMatch = path.match(/^\/api\/admin\/users\/(\d+)\/classes$/);
      if (adminUserClassesMatch && request.method === 'GET') {
        return await handleAdminGetUserClasses(db, request, Number(adminUserClassesMatch[1]));
      }

      const adminClassStudentsMatch = path.match(/^\/api\/admin\/classes\/(\d+)\/students$/);
      if (adminClassStudentsMatch && request.method === 'GET') {
        return await handleAdminGetClassStudents(db, request, Number(adminClassStudentsMatch[1]));
      }

      const adminClassSettingsMatch = path.match(/^\/api\/admin\/classes\/(\d+)\/settings$/);
      if (adminClassSettingsMatch && request.method === 'GET') {
        return await handleAdminGetClassSettings(db, request, Number(adminClassSettingsMatch[1]));
      }

      const adminStudentMatch = path.match(/^\/api\/admin\/students\/(\d+)$/);
      if (adminStudentMatch && request.method === 'PATCH') {
        return await handleAdminUpdateStudent(db, request, Number(adminStudentMatch[1]));
      }

      const adminStudentLogsMatch = path.match(/^\/api\/admin\/students\/(\d+)\/logs$/);
      if (adminStudentLogsMatch && request.method === 'GET') {
        return await handleAdminGetStudentLogs(db, request, Number(adminStudentLogsMatch[1]));
      }

      const adminRegisterChannelMatch = path.match(/^\/api\/admin\/register-channels\/(\d+)$/);
      if (adminRegisterChannelMatch && request.method === 'PATCH') {
        return await handleUpdateRegistrationChannel(db, request, Number(adminRegisterChannelMatch[1]));
      }

      const adminPasswordMatch = path.match(/^\/api\/admin\/users\/(\d+)\/reset-password$/);
      if (adminPasswordMatch && request.method === 'POST') {
        return await handleResetAdminUserPassword(db, request, Number(adminPasswordMatch[1]));
      }

      if (path === '/api/admin/codes' && request.method === 'GET') {
        return await handleListActivationCodes(db, request);
      }

      if (path === '/api/admin/codes' && request.method === 'POST') {
        return await handleCreateActivationCode(db, request);
      }

      if (path === '/api/admin/codes/batch-delete' && request.method === 'POST') {
        return await handleBatchDeleteActivationCodes(db, request);
      }

      if (path === '/api/admin/codes/batch-revoke' && request.method === 'POST') {
        return await handleBatchRevokeActivationCodes(db, request);
      }

      if (path === '/api/admin/codes/batch-update' && request.method === 'POST') {
        return await handleBatchUpdateActivationCodes(db, request);
      }

      if (path === '/api/admin/codes/batch' && request.method === 'POST') {
        return await handleBatchCreateActivationCodes(db, request);
      }

      const adminCodeMatch = path.match(/^\/api\/admin\/codes\/(\d+)$/);
      if (adminCodeMatch && request.method === 'PATCH') {
        return await handleUpdateActivationCode(db, request, Number(adminCodeMatch[1]));
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

      if (path === '/api/students/groups' && request.method === 'PATCH') {
        return await handleSetStudentGroups(db, request);
      }

      const progressRankingMatch = path.match(/^\/api\/classes\/(\d+)\/progress-ranking$/);
      if (progressRankingMatch && request.method === 'GET') {
        return await handleGetProgressRanking(db, request, Number(progressRankingMatch[1]));
      }

      const batchFeedStudentsMatch = path.match(/^\/api\/classes\/(\d+)\/students\/feed$/);
      if (batchFeedStudentsMatch && request.method === 'POST') {
        return await handleFeedStudentsBatch(db, request, Number(batchFeedStudentsMatch[1]));
      }

      const studentMatch = path.match(/^\/api\/students\/(\d+)$/);
      if (studentMatch && request.method === 'PATCH') {
        return await handleUpdateStudent(db, request, Number(studentMatch[1]));
      }

      const studentFeedMatch = path.match(/^\/api\/students\/(\d+)\/feed$/);
      if (studentFeedMatch && request.method === 'POST') {
        return await handleFeedStudent(db, request, Number(studentFeedMatch[1]));
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

      const importRulesMatch = path.match(/^\/api\/classes\/(\d+)\/rules\/import$/);
      if (importRulesMatch && request.method === 'POST') {
        return await handleImportRules(db, request, Number(importRulesMatch[1]));
      }

      const ruleMatch = path.match(/^\/api\/rules\/(\d+)$/);
      if (ruleMatch && request.method === 'PATCH') {
        return await handleUpdateRule(db, request, Number(ruleMatch[1]));
      }

      if (ruleMatch && request.method === 'DELETE') {
        return await handleDeleteRule(db, request, Number(ruleMatch[1]));
      }

      const moveRuleMatch = path.match(/^\/api\/rules\/(\d+)\/move$/);
      if (moveRuleMatch && request.method === 'POST') {
        return await handleMoveRule(db, request, Number(moveRuleMatch[1]));
      }

      const thresholdMatch = path.match(/^\/api\/classes\/(\d+)\/settings\/thresholds$/);
      if (thresholdMatch && request.method === 'PUT') {
        return await handleUpdateThresholds(db, request, Number(thresholdMatch[1]));
      }

      const smartSeatingMatch = path.match(/^\/api\/classes\/(\d+)\/settings\/smart-seating$/);
      if (smartSeatingMatch && request.method === 'PUT') {
        return await handleUpdateSmartSeatingConfig(db, request, Number(smartSeatingMatch[1]));
      }

      const studentLogsMatch = path.match(/^\/api\/classes\/(\d+)\/students\/(\d+)\/logs$/);
      if (studentLogsMatch && request.method === 'GET') {
        return await handleGetStudentLogs(db, request, Number(studentLogsMatch[1]), Number(studentLogsMatch[2]));
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
