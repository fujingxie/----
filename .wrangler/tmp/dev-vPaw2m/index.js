var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-gbEmOf/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src-server/index.js
var DEFAULT_LEVEL_THRESHOLDS = [10, 20, 30, 50, 70, 100];
var DEFAULT_PET_CONDITION_CONFIG = {
  enabled: true,
  skip_weekends: true,
  pause_start_date: null,
  pause_end_date: null,
  hungry_days: 2,
  weak_days: 4,
  sleeping_days: 7,
  hungry_decay: 0,
  weak_decay: 1,
  sleeping_decay: 2
};
var DAY_IN_MS = 24 * 60 * 60 * 1e3;
var STUDENT_SELECT_FIELDS = `id, class_id, name, pet_status, pet_condition, last_fed_at, last_decay_at, pet_condition_locked_at, pet_name, pet_type_id, pet_level, pet_points, coins, total_exp, total_coins, reward_count, pet_collection, created_at`;
var FREE_REGISTER_LEVEL_EXPIRES_IN_DAYS = {
  temporary: null,
  vip1: null,
  vip2: null
};
var REGISTER_RATE_LIMIT = {
  shortWindowMinutes: 10,
  shortLimit: 3,
  longWindowHours: 24,
  longLimit: 10
};
var ACTIVATION_CODE_SEEDS = [
  { code: "CLASS-VIP1-2026", level: "vip1", expiresInDays: 30 },
  { code: "CLASS-VIP2-2026", level: "vip2", expiresInDays: 90 },
  { code: "CLASS-PERM-2026", level: "permanent", expiresInDays: null }
];
var DEFAULT_TOOLBOX_ACCESS = {
  random: "temporary",
  timer: "temporary",
  smart_seating: "vip2",
  read_forest: "vip2",
  mic_power: "vip2",
  reading_challenge: "vip2",
  quiet_study: "vip2"
};
var SYSTEM_RULES = [
  { name: "\u5B57\u8FF9\u5DE5\u6574", icon: "\u270D\uFE0F", exp: 2, coins: 5, type: "positive" },
  { name: "\u70ED\u7231\u52B3\u52A8", icon: "\u{1F9F9}", exp: 3, coins: 10, type: "positive" },
  { name: "\u8FFD\u8DD1\u6253\u95F9", icon: "\u{1F6AB}", exp: -2, coins: -5, type: "negative" },
  { name: "\u672A\u4EA4\u4F5C\u4E1A", icon: "\u{1F4DD}", exp: -5, coins: -10, type: "negative" }
];
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,PATCH,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};
var json = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    ...corsHeaders,
    "Content-Type": "application/json"
  }
}), "json");
var errorWithHeaders = /* @__PURE__ */ __name((message, status = 400, extraHeaders = {}) => new Response(JSON.stringify({ error: message }), {
  status,
  headers: {
    ...corsHeaders,
    "Content-Type": "application/json",
    ...extraHeaders
  }
}), "errorWithHeaders");
var error = /* @__PURE__ */ __name((message, status = 400) => errorWithHeaders(message, status), "error");
var textEncoder = new TextEncoder();
var isExpired = /* @__PURE__ */ __name((value) => {
  if (!value) {
    return false;
  }
  const timestamp = new Date(value);
  return !Number.isNaN(timestamp.getTime()) && timestamp.getTime() < Date.now();
}, "isExpired");
var parseId = /* @__PURE__ */ __name((value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}, "parseId");
var parsePetCollection = /* @__PURE__ */ __name((value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}, "parsePetCollection");
var nowIso = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString(), "nowIso");
var parseDateOnlyToUtcMs = /* @__PURE__ */ __name((value, endOfDay = false) => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  return Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  );
}, "parseDateOnlyToUtcMs");
var createCollectionId = /* @__PURE__ */ __name((studentId) => `${studentId || "student"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, "createCollectionId");
var parseServerPetCollection = /* @__PURE__ */ __name((value, student = null) => {
  const collection = parsePetCollection(value);
  if (collection.length > 0) {
    return collection.filter(Boolean).map((entry) => ({
      id: entry.id || createCollectionId(student?.id),
      pet_type_id: entry.pet_type_id || null,
      pet_name: entry.pet_name || (entry.pet_type_id ? "\u672A\u547D\u540D\u4F19\u4F34" : "\u795E\u79D8\u86CB"),
      pet_level: Number(entry.pet_level || 0),
      adopted_at: entry.adopted_at || nowIso(),
      completed_at: entry.completed_at || null,
      status: entry.status || "graduated"
    }));
  }
  if (student?.pet_status === "egg" || student?.pet_type_id) {
    return student?.pet_status === "egg" && !student?.pet_type_id ? [] : [
      {
        id: createCollectionId(student?.id),
        pet_type_id: student?.pet_type_id || null,
        pet_name: student?.pet_name || "\u672A\u547D\u540D\u4F19\u4F34",
        pet_level: Number(student?.pet_level || 1),
        adopted_at: student?.created_at || nowIso(),
        completed_at: null,
        status: student?.pet_status === "egg" ? "active-egg" : "active"
      }
    ];
  }
  return [];
}, "parseServerPetCollection");
var syncStudentCollectionProgress = /* @__PURE__ */ __name((student) => {
  const collection = parseServerPetCollection(student?.pet_collection, student);
  if (collection.length === 0) {
    return collection;
  }
  const currentIndex = collection.findIndex((entry) => entry.status === "active" || entry.status === "active-egg");
  if (currentIndex < 0) {
    return collection;
  }
  const currentEntry = collection[currentIndex];
  collection[currentIndex] = {
    ...currentEntry,
    pet_type_id: student?.pet_type_id || currentEntry.pet_type_id || null,
    pet_name: student?.pet_name || currentEntry.pet_name,
    pet_level: Number(student?.pet_level || currentEntry.pet_level || 0),
    status: student?.pet_status === "egg" ? "active-egg" : "active"
  };
  return collection;
}, "syncStudentCollectionProgress");
var resolvePetLevel = /* @__PURE__ */ __name((totalExp, thresholds = DEFAULT_LEVEL_THRESHOLDS) => {
  let nextLevel = 1;
  thresholds.forEach((threshold, index) => {
    if (Number(totalExp || 0) >= Number(threshold || 0)) {
      nextLevel = index + 2;
    }
  });
  return nextLevel;
}, "resolvePetLevel");
var isDayPaused = /* @__PURE__ */ __name((dayIndex, config) => {
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
}, "isDayPaused");
var countEffectiveDaysBetween = /* @__PURE__ */ __name((startMs, endMs, config) => {
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
}, "countEffectiveDaysBetween");
var getEffectiveDaysSinceLastFed = /* @__PURE__ */ __name((lastFedAt, config) => {
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
}, "getEffectiveDaysSinceLastFed");
var derivePetCondition = /* @__PURE__ */ __name((student) => {
  if (!student || student.pet_status === "egg") {
    return "healthy";
  }
  const config = normalizePetConditionConfig(student.pet_condition_config);
  if (!config.enabled) {
    return "healthy";
  }
  const daysSinceLastFed = getEffectiveDaysSinceLastFed(student.last_fed_at, config);
  if (daysSinceLastFed >= config.sleeping_days) {
    return "sleeping";
  }
  if (daysSinceLastFed >= config.weak_days) {
    return "weak";
  }
  if (daysSinceLastFed >= config.hungry_days) {
    return "hungry";
  }
  return "healthy";
}, "derivePetCondition");
var getDailyDecayForDay = /* @__PURE__ */ __name((dayIndex, config) => {
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
}, "getDailyDecayForDay");
var degradeStudentToEgg = /* @__PURE__ */ __name((student) => {
  const collection = parseServerPetCollection(student?.pet_collection, student);
  const currentIndex = collection.findIndex((entry) => entry.status === "active" || entry.status === "active-egg");
  const completedAt = nowIso();
  const nextCollection = [...collection];
  if (currentIndex >= 0) {
    nextCollection[currentIndex] = {
      ...nextCollection[currentIndex],
      pet_type_id: student?.pet_type_id || nextCollection[currentIndex].pet_type_id || null,
      pet_name: student?.pet_name || nextCollection[currentIndex].pet_name || "\u672A\u547D\u540D\u4F19\u4F34",
      pet_level: 0,
      status: "active-egg",
      completed_at: null,
      adopted_at: nextCollection[currentIndex].adopted_at || completedAt
    };
  } else {
    nextCollection.push({
      id: createCollectionId(student?.id),
      pet_type_id: null,
      pet_name: "\u795E\u79D8\u86CB",
      pet_level: 0,
      adopted_at: completedAt,
      completed_at: null,
      status: "active-egg"
    });
  }
  return {
    ...student,
    pet_status: "egg",
    pet_condition: "healthy",
    last_fed_at: null,
    last_decay_at: null,
    pet_condition_locked_at: null,
    pet_name: null,
    pet_type_id: null,
    pet_level: 0,
    pet_points: 0,
    total_exp: 0,
    pet_collection: nextCollection
  };
}, "degradeStudentToEgg");
var applyPetDecayToRow = /* @__PURE__ */ __name((student, levelThresholds, config) => {
  if (!config.enabled) {
    const nextCondition2 = student?.pet_status === "egg" ? "healthy" : "healthy";
    const changed2 = (student?.pet_condition || "healthy") !== nextCondition2 || (student?.pet_condition_locked_at || null) !== null;
    return {
      student: {
        ...student,
        pet_condition: nextCondition2,
        pet_condition_locked_at: null
      },
      changed: changed2,
      decayedExp: 0,
      revertedToEgg: false,
      nextCondition: nextCondition2
    };
  }
  if (!student || student.pet_status === "egg" || !student.last_fed_at) {
    return {
      student,
      changed: false,
      decayedExp: 0,
      revertedToEgg: false,
      nextCondition: derivePetCondition(student)
    };
  }
  const lastFedAtMs = new Date(student.last_fed_at).getTime();
  if (Number.isNaN(lastFedAtMs)) {
    return {
      student,
      changed: false,
      decayedExp: 0,
      revertedToEgg: false,
      nextCondition: derivePetCondition(student)
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
    last_decay_at: currentDayIndex > lastSettledDayIndex ? nowIso() : student.last_decay_at || student.last_fed_at
  };
  let revertedToEgg = false;
  if (totalDecay > 0) {
    const nextTotalExp = Math.max(0, Number(student.total_exp || 0) - totalDecay);
    nextStudent = {
      ...nextStudent,
      total_exp: nextTotalExp,
      pet_points: nextTotalExp,
      pet_level: nextTotalExp > 0 ? resolvePetLevel(nextTotalExp, levelThresholds) : 0
    };
    if (nextTotalExp <= 0) {
      nextStudent = degradeStudentToEgg(nextStudent);
      revertedToEgg = true;
    } else {
      nextStudent.pet_collection = syncStudentCollectionProgress(nextStudent);
    }
  }
  const nextCondition = derivePetCondition(nextStudent);
  nextStudent.pet_condition = nextStudent.pet_status === "egg" ? "healthy" : nextCondition;
  nextStudent.pet_condition_locked_at = nextStudent.pet_status === "egg" ? null : nextCondition === "sleeping" ? nextStudent.pet_condition_locked_at || nowIso() : null;
  const changed = totalDecay > 0 || (student.pet_condition || "healthy") !== nextStudent.pet_condition || (student.pet_condition_locked_at || null) !== (nextStudent.pet_condition_locked_at || null) || (student.last_decay_at || null) !== (nextStudent.last_decay_at || null) || student.pet_status !== nextStudent.pet_status;
  return {
    student: nextStudent,
    changed,
    decayedExp: totalDecay,
    revertedToEgg,
    nextCondition: nextStudent.pet_condition
  };
}, "applyPetDecayToRow");
var normalizeClass = /* @__PURE__ */ __name((row) => ({
  id: Number(row.id),
  name: row.name,
  created_at: row.created_at
}), "normalizeClass");
var normalizeStudent = /* @__PURE__ */ __name((row) => ({
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
  total_coins: Number(row.total_coins || 0),
  reward_count: Number(row.reward_count || 0),
  pet_collection: parsePetCollection(row.pet_collection)
}), "normalizeStudent");
var normalizePetConditionConfig = /* @__PURE__ */ __name((value) => {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = null;
    }
  }
  const enabled = parsed?.enabled === void 0 ? DEFAULT_PET_CONDITION_CONFIG.enabled : parsed?.enabled === true || parsed?.enabled === "true" || parsed?.enabled === 1 || parsed?.enabled === "1";
  const skipWeekends = parsed?.skip_weekends === void 0 ? DEFAULT_PET_CONDITION_CONFIG.skip_weekends : parsed?.skip_weekends === true || parsed?.skip_weekends === "true" || parsed?.skip_weekends === 1 || parsed?.skip_weekends === "1";
  const pauseStartDate = typeof parsed?.pause_start_date === "string" && parsed.pause_start_date.trim() ? parsed.pause_start_date.trim() : null;
  const pauseEndDate = typeof parsed?.pause_end_date === "string" && parsed.pause_end_date.trim() ? parsed.pause_end_date.trim() : null;
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
    sleeping_decay: sleepingDecay
  };
}, "normalizePetConditionConfig");
var normalizeShopItem = /* @__PURE__ */ __name((row) => ({
  id: Number(row.id),
  class_id: Number(row.class_id),
  name: row.name,
  icon: row.icon,
  item_type: row.item_type || "gift",
  exp_value: Number(row.exp_value || 0),
  price: Number(row.price || 0),
  stock: Number(row.stock || 0)
}), "normalizeShopItem");
var normalizeRule = /* @__PURE__ */ __name((row) => ({
  id: Number(row.id),
  name: row.name,
  icon: row.icon,
  exp: Number(row.exp || 0),
  coins: Number(row.coins || 0),
  type: row.type,
  sort_order: Number(row.sort_order || 0),
  isSystem: row.class_id === null
}), "normalizeRule");
var normalizeActivationCode = /* @__PURE__ */ __name((row) => ({
  id: Number(row.id),
  code: row.code,
  level: row.level,
  expires_in_days: row.expires_in_days === null ? null : Number(row.expires_in_days),
  max_uses: Number(row.max_uses || 1),
  used_count: Number(row.used_count || 0),
  status: row.status || "active",
  used_by_user_id: row.used_by_user_id === null ? null : Number(row.used_by_user_id),
  used_at: row.used_at,
  used_by_nickname: row.used_by_nickname || null,
  created_by_user_id: row.created_by_user_id === null ? null : Number(row.created_by_user_id),
  created_by_nickname: row.created_by_nickname || null
}), "normalizeActivationCode");
var formatLogTime = /* @__PURE__ */ __name((createdAt) => {
  const timestamp = new Date(createdAt);
  if (Number.isNaN(timestamp.getTime())) {
    return createdAt;
  }
  return timestamp.toLocaleTimeString("zh-CN", { hour12: false });
}, "formatLogTime");
var parseLogMeta = /* @__PURE__ */ __name((value) => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}, "parseLogMeta");
var normalizeLog = /* @__PURE__ */ __name((row) => {
  const meta = parseLogMeta(row.meta);
  const operator = row.operator || "\u7CFB\u7EDF";
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
    meta
  };
}, "normalizeLog");
var normalizeUser = /* @__PURE__ */ __name((row) => ({
  id: Number(row.id),
  username: row.username,
  nickname: row.nickname,
  level: row.level,
  expire_at: row.expire_at,
  role: row.role || "teacher",
  status: row.status || "active",
  register_source: row.register_source || "activation_code",
  source_note: row.source_note || null,
  register_channel: row.register_channel || null,
  register_ip: row.register_ip || null,
  register_user_agent: row.register_user_agent || null,
  same_ip_count: Number(row.same_ip_count || 0)
}), "normalizeUser");
var normalizeRegistrationChannel = /* @__PURE__ */ __name((row) => ({
  id: Number(row.id),
  code: row.code,
  name: row.name,
  enabled: Boolean(row.enabled),
  require_activation: Boolean(row.require_activation),
  default_level: sanitizeFreeRegisterLevel(row.default_level),
  end_at: row.end_at || null,
  note: row.note || "",
  updated_by_user_id: row.updated_by_user_id === null ? null : Number(row.updated_by_user_id),
  created_at: row.created_at || null,
  updated_at: row.updated_at || null
}), "normalizeRegistrationChannel");
var normalizeSystemFlag = /* @__PURE__ */ __name((row) => {
  if (!row) {
    return {
      key: "free_register",
      enabled: false,
      mode: "permanent",
      end_at: null,
      value: { default_level: "temporary" },
      updated_by_user_id: null,
      updated_at: null
    };
  }
  let value = {};
  if (typeof row?.value_json === "string" && row.value_json.trim()) {
    try {
      value = JSON.parse(row.value_json) || {};
    } catch {
      value = {};
    }
  }
  return {
    key: row.key,
    enabled: Boolean(row.enabled),
    mode: row.mode || "permanent",
    end_at: row.end_at || null,
    value,
    updated_by_user_id: row.updated_by_user_id === null ? null : Number(row.updated_by_user_id),
    updated_at: row.updated_at || null
  };
}, "normalizeSystemFlag");
var normalizeAdminLog = /* @__PURE__ */ __name((row) => ({
  id: Number(row.id),
  action: row.action_type,
  detail: row.detail,
  created_at: row.created_at,
  operator: row.operator || "\u7CFB\u7EDF"
}), "normalizeAdminLog");
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
__name(readBody, "readBody");
function getDb(env) {
  if (!env.DB) {
    throw new Error("\u672A\u68C0\u6D4B\u5230 D1 \u6570\u636E\u5E93\u7ED1\u5B9A\uFF0C\u8BF7\u5148\u914D\u7F6E wrangler.toml \u4E2D\u7684 DB");
  }
  return env.DB;
}
__name(getDb, "getDb");
async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(sha256, "sha256");
async function hashPassword(password) {
  return sha256(`class-pets::${password}`);
}
__name(hashPassword, "hashPassword");
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
__name(verifyPassword, "verifyPassword");
function computeExpireAt(expiresInDays) {
  if (!Number.isFinite(expiresInDays) || expiresInDays <= 0) {
    return null;
  }
  return new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1e3).toISOString();
}
__name(computeExpireAt, "computeExpireAt");
function validateUsername(value) {
  return /^[a-zA-Z0-9_-]{3,24}$/.test(value);
}
__name(validateUsername, "validateUsername");
function validatePassword(value) {
  return typeof value === "string" && value.length >= 6;
}
__name(validatePassword, "validatePassword");
async function ensureUserRuleTemplates(db, userId) {
  if (!userId) {
    return;
  }
  const countRow = await db.prepare("SELECT COUNT(*) AS count FROM rules WHERE class_id IS NULL AND owner_user_id = ?").bind(userId).first();
  if (Number(countRow?.count || 0) > 0) {
    return;
  }
  const statements = SYSTEM_RULES.map(
    (rule, index) => db.prepare("INSERT INTO rules (class_id, owner_user_id, sort_order, name, icon, exp, coins, type) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)").bind(userId, index + 1, rule.name, rule.icon, rule.exp, rule.coins, rule.type)
  );
  await db.batch(statements);
}
__name(ensureUserRuleTemplates, "ensureUserRuleTemplates");
async function ensureActivationCodes(db) {
  const statements = ACTIVATION_CODE_SEEDS.map(
    (seed) => db.prepare("INSERT OR IGNORE INTO activation_codes (code, level, expires_in_days) VALUES (?, ?, ?)").bind(seed.code, seed.level, seed.expiresInDays)
  );
  await db.batch(statements);
}
__name(ensureActivationCodes, "ensureActivationCodes");
async function ensureSystemFlags(db) {
  await db.prepare(
    `INSERT OR IGNORE INTO system_flags (key, enabled, mode, end_at, value_json)
       VALUES ('free_register', 0, 'permanent', NULL, ?)`
  ).bind(JSON.stringify({ default_level: "temporary" })).run();
  await db.prepare(
    `INSERT OR IGNORE INTO system_flags (key, enabled, mode, end_at, value_json)
       VALUES ('toolbox_access', 1, 'permanent', NULL, ?)`
  ).bind(JSON.stringify(DEFAULT_TOOLBOX_ACCESS)).run();
}
__name(ensureSystemFlags, "ensureSystemFlags");
async function ensureClassSettings(db, classId) {
  const existing = await db.prepare("SELECT class_id FROM class_settings WHERE class_id = ?").bind(classId).first();
  if (existing) {
    return;
  }
  await db.prepare("INSERT INTO class_settings (class_id, level_thresholds, pet_condition_config, smart_seating_config) VALUES (?, ?, ?, NULL)").bind(classId, JSON.stringify(DEFAULT_LEVEL_THRESHOLDS), JSON.stringify(DEFAULT_PET_CONDITION_CONFIG)).run();
}
__name(ensureClassSettings, "ensureClassSettings");
async function refreshMembershipIfNeeded(db, user) {
  if (!user) {
    return null;
  }
  if ((user.level === "vip1" || user.level === "vip2") && isExpired(user.expire_at)) {
    const refreshed = await db.prepare(
      `UPDATE users
         SET level = 'temporary', expire_at = NULL
         WHERE id = ?
         RETURNING id, username, nickname, level, expire_at, role, status, register_source, source_note, register_channel, register_ip, register_user_agent`
    ).bind(user.id).first();
    return refreshed;
  }
  return user;
}
__name(refreshMembershipIfNeeded, "refreshMembershipIfNeeded");
async function getUserById(db, userId) {
  const rawUser = await db.prepare(
    `SELECT id, username, nickname, level, expire_at, role, status, register_source, source_note, register_ip, register_user_agent
       , register_channel
       FROM users
       WHERE id = ?`
  ).bind(userId).first();
  if (!rawUser) {
    throw new Error("\u6559\u5E08\u8D26\u53F7\u4E0D\u5B58\u5728\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55");
  }
  if (rawUser.status === "disabled") {
    throw new Error("\u8BE5\u8D26\u53F7\u5DF2\u88AB\u505C\u7528\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458");
  }
  return refreshMembershipIfNeeded(db, rawUser);
}
__name(getUserById, "getUserById");
async function getUserWithPassword(db, username) {
  const rawUser = await db.prepare(
    `SELECT id, username, password_hash, nickname, level, expire_at, role, status, register_source, source_note, register_ip, register_user_agent
       , register_channel
       FROM users
       WHERE username = ?`
  ).bind(username).first();
  if (!rawUser) {
    return null;
  }
  const refreshed = await refreshMembershipIfNeeded(db, rawUser);
  if (refreshed.password_hash) {
    return refreshed;
  }
  return {
    ...refreshed,
    password_hash: rawUser.password_hash
  };
}
__name(getUserWithPassword, "getUserWithPassword");
async function assertSuperAdmin(db, userId) {
  const user = await getUserById(db, userId);
  if (user.role !== "super_admin") {
    throw new Error("\u4EC5\u8D85\u7BA1\u8D26\u53F7\u53EF\u8BBF\u95EE\u8BE5\u540E\u53F0");
  }
  return user;
}
__name(assertSuperAdmin, "assertSuperAdmin");
function sanitizeCodeStatus(value) {
  return ["active", "revoked", "used"].includes(value) ? value : "active";
}
__name(sanitizeCodeStatus, "sanitizeCodeStatus");
function sanitizeFreeRegisterMode(value) {
  return value === "until" ? "until" : "permanent";
}
__name(sanitizeFreeRegisterMode, "sanitizeFreeRegisterMode");
function sanitizeFreeRegisterLevel(value) {
  return ["temporary", "vip1", "vip2"].includes(value) ? value : "temporary";
}
__name(sanitizeFreeRegisterLevel, "sanitizeFreeRegisterLevel");
function sanitizeChannelCode(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
}
__name(sanitizeChannelCode, "sanitizeChannelCode");
function sanitizeToolboxLevel(value) {
  return ["temporary", "vip1", "vip2", "permanent"].includes(value) ? value : "temporary";
}
__name(sanitizeToolboxLevel, "sanitizeToolboxLevel");
function resolveFreeRegisterState(flag) {
  const normalized = flag || {
    key: "free_register",
    enabled: false,
    mode: "permanent",
    end_at: null,
    value: { default_level: "temporary" },
    updated_by_user_id: null,
    updated_at: null
  };
  const mode = sanitizeFreeRegisterMode(normalized.mode);
  const endAt = normalized.end_at || null;
  const defaultLevel = sanitizeFreeRegisterLevel(normalized.value?.default_level);
  const endTimestamp = endAt ? new Date(endAt).getTime() : NaN;
  const windowOpen = mode !== "until" || Number.isFinite(endTimestamp) && endTimestamp > Date.now();
  return {
    ...normalized,
    mode,
    end_at: endAt,
    value: {
      ...normalized.value,
      default_level: defaultLevel
    },
    is_active: Boolean(normalized.enabled) && windowOpen
  };
}
__name(resolveFreeRegisterState, "resolveFreeRegisterState");
async function getFreeRegisterFlag(db) {
  await ensureSystemFlags(db);
  const row = await db.prepare(
    `SELECT key, enabled, mode, end_at, value_json, updated_by_user_id, updated_at
       FROM system_flags
       WHERE key = 'free_register'`
  ).first();
  return resolveFreeRegisterState(normalizeSystemFlag(row));
}
__name(getFreeRegisterFlag, "getFreeRegisterFlag");
async function getToolboxAccessFlag(db) {
  await ensureSystemFlags(db);
  const row = await db.prepare(
    `SELECT key, enabled, mode, end_at, value_json, updated_by_user_id, updated_at
       FROM system_flags
       WHERE key = 'toolbox_access'`
  ).first();
  const normalized = normalizeSystemFlag(row);
  const value = { ...DEFAULT_TOOLBOX_ACCESS };
  const rawValue = normalized?.value || {};
  Object.keys(DEFAULT_TOOLBOX_ACCESS).forEach((toolId) => {
    value[toolId] = sanitizeToolboxLevel(rawValue[toolId]);
  });
  return {
    key: "toolbox_access",
    value,
    updated_by_user_id: normalized.updated_by_user_id,
    updated_at: normalized.updated_at
  };
}
__name(getToolboxAccessFlag, "getToolboxAccessFlag");
function resolveRegistrationChannelState(channel) {
  if (!channel) {
    return null;
  }
  const endAt = channel.end_at || null;
  const endTimestamp = endAt ? new Date(endAt).getTime() : NaN;
  const windowOpen = !endAt || Number.isFinite(endTimestamp) && endTimestamp > Date.now();
  return {
    ...channel,
    is_active: Boolean(channel.enabled) && windowOpen
  };
}
__name(resolveRegistrationChannelState, "resolveRegistrationChannelState");
async function getRegistrationChannelByCode(db, code) {
  const normalizedCode = sanitizeChannelCode(code);
  if (!normalizedCode) {
    return null;
  }
  const row = await db.prepare(
    `SELECT id, code, name, enabled, require_activation, default_level, end_at, note, updated_by_user_id, created_at, updated_at
       FROM registration_channels
       WHERE code = ?`
  ).bind(normalizedCode).first();
  return resolveRegistrationChannelState(row ? normalizeRegistrationChannel(row) : null);
}
__name(getRegistrationChannelByCode, "getRegistrationChannelByCode");
async function listRegistrationChannels(db) {
  const result = await db.prepare(
    `SELECT id, code, name, enabled, require_activation, default_level, end_at, note, updated_by_user_id, created_at, updated_at
       FROM registration_channels
       ORDER BY created_at DESC, id DESC`
  ).all();
  return (result.results || []).map((row) => resolveRegistrationChannelState(normalizeRegistrationChannel(row)));
}
__name(listRegistrationChannels, "listRegistrationChannels");
function generateActivationCode(prefix = "CLASS") {
  const cleanedPrefix = String(prefix || "CLASS").replace(/[^A-Z0-9-]/g, "").slice(0, 12) || "CLASS";
  const seed = Math.random().toString(36).slice(2, 8).toUpperCase();
  const stamp = Date.now().toString(36).slice(-4).toUpperCase();
  return `${cleanedPrefix}-${seed}-${stamp}`;
}
__name(generateActivationCode, "generateActivationCode");
function getClientIp(request) {
  const cfIp = request.headers.get("CF-Connecting-IP")?.trim();
  if (cfIp) {
    return cfIp;
  }
  const xff = request.headers.get("X-Forwarded-For") || "";
  const firstIp = xff.split(",")[0]?.trim();
  if (firstIp) {
    return firstIp;
  }
  return "unknown";
}
__name(getClientIp, "getClientIp");
function getUserAgent(request) {
  return request.headers.get("User-Agent") || "";
}
__name(getUserAgent, "getUserAgent");
function parseDbTimestamp(value) {
  if (!value) {
    return NaN;
  }
  const normalized = String(value).includes("T") ? String(value) : String(value).replace(" ", "T");
  const timestamp = new Date(normalized.endsWith("Z") ? normalized : `${normalized}Z`);
  return timestamp.getTime();
}
__name(parseDbTimestamp, "parseDbTimestamp");
function formatRetryHint(retryAfterSeconds) {
  if (!Number.isFinite(retryAfterSeconds) || retryAfterSeconds <= 0) {
    return "\u7A0D\u540E\u518D\u8BD5";
  }
  if (retryAfterSeconds < 60) {
    return `${retryAfterSeconds} \u79D2\u540E\u518D\u8BD5`;
  }
  return `${Math.ceil(retryAfterSeconds / 60)} \u5206\u949F\u540E\u518D\u8BD5`;
}
__name(formatRetryHint, "formatRetryHint");
async function getRegistrationAttemptsCount(db, ip, intervalSql) {
  const row = await db.prepare(
    `SELECT COUNT(*) AS count
       FROM registration_attempts
       WHERE ip = ?
         AND result IN ('failed', 'success')
         AND created_at >= datetime('now', ?)`
  ).bind(ip, intervalSql).first();
  return Number(row?.count || 0);
}
__name(getRegistrationAttemptsCount, "getRegistrationAttemptsCount");
async function getRegisterRetryAfterSeconds(db, ip, limit, windowSeconds) {
  const result = await db.prepare(
    `SELECT created_at
       FROM registration_attempts
       WHERE ip = ?
         AND result IN ('failed', 'success')
       ORDER BY created_at DESC, id DESC
       LIMIT ?`
  ).bind(ip, limit).all();
  const rows = result.results || [];
  const pivot = rows[rows.length - 1];
  if (!pivot?.created_at) {
    return windowSeconds;
  }
  const pivotTimestamp = parseDbTimestamp(pivot.created_at);
  if (!Number.isFinite(pivotTimestamp)) {
    return windowSeconds;
  }
  const retryAt = pivotTimestamp + windowSeconds * 1e3;
  return Math.max(1, Math.ceil((retryAt - Date.now()) / 1e3));
}
__name(getRegisterRetryAfterSeconds, "getRegisterRetryAfterSeconds");
async function checkRegisterRateLimit(db, ip) {
  const shortCount = await getRegistrationAttemptsCount(db, ip, `-${REGISTER_RATE_LIMIT.shortWindowMinutes} minutes`);
  if (shortCount >= REGISTER_RATE_LIMIT.shortLimit) {
    const retryAfterSeconds = await getRegisterRetryAfterSeconds(
      db,
      ip,
      REGISTER_RATE_LIMIT.shortLimit,
      REGISTER_RATE_LIMIT.shortWindowMinutes * 60
    );
    return {
      blocked: true,
      reason: `short_window_${REGISTER_RATE_LIMIT.shortWindowMinutes}m`,
      retryAfterSeconds
    };
  }
  const longCount = await getRegistrationAttemptsCount(db, ip, `-${REGISTER_RATE_LIMIT.longWindowHours} hours`);
  if (longCount >= REGISTER_RATE_LIMIT.longLimit) {
    const retryAfterSeconds = await getRegisterRetryAfterSeconds(
      db,
      ip,
      REGISTER_RATE_LIMIT.longLimit,
      REGISTER_RATE_LIMIT.longWindowHours * 60 * 60
    );
    return {
      blocked: true,
      reason: `long_window_${REGISTER_RATE_LIMIT.longWindowHours}h`,
      retryAfterSeconds
    };
  }
  return { blocked: false, reason: "", retryAfterSeconds: 0 };
}
__name(checkRegisterRateLimit, "checkRegisterRateLimit");
async function appendRegistrationAttempt(db, { ip, username, result, reason = "", userAgent = "" }) {
  await db.prepare(
    `INSERT INTO registration_attempts (ip, username, mode, result, reason, user_agent)
       VALUES (?, ?, 'register', ?, ?, ?)`
  ).bind(ip, username || null, result, reason || null, userAgent || null).run();
}
__name(appendRegistrationAttempt, "appendRegistrationAttempt");
async function getClassesByUserId(db, userId) {
  const result = await db.prepare("SELECT id, name, created_at FROM classes WHERE user_id = ? ORDER BY created_at ASC, id ASC").bind(userId).all();
  return (result.results || []).map(normalizeClass);
}
__name(getClassesByUserId, "getClassesByUserId");
async function assertClassOwnership(db, userId, classId) {
  const classRow = await db.prepare("SELECT id, user_id, name, created_at FROM classes WHERE id = ? AND user_id = ?").bind(classId, userId).first();
  if (!classRow) {
    throw new Error("\u672A\u627E\u5230\u5BF9\u5E94\u73ED\u7EA7\uFF0C\u6216\u5F53\u524D\u8D26\u53F7\u65E0\u6743\u8BBF\u95EE");
  }
  return classRow;
}
__name(assertClassOwnership, "assertClassOwnership");
async function assertStudentOwnership(db, userId, studentId) {
  const student = await db.prepare(
    `SELECT s.*, cs.pet_condition_config
       FROM students s
       JOIN classes c ON c.id = s.class_id
       LEFT JOIN class_settings cs ON cs.class_id = s.class_id
       WHERE s.id = ? AND c.user_id = ?`
  ).bind(studentId, userId).first();
  if (!student) {
    throw new Error("\u672A\u627E\u5230\u5BF9\u5E94\u5B66\u751F\uFF0C\u6216\u5F53\u524D\u8D26\u53F7\u65E0\u6743\u8BBF\u95EE");
  }
  return student;
}
__name(assertStudentOwnership, "assertStudentOwnership");
async function reconcileStudentConditions(db, classId, userId = null) {
  const levelThresholds = await getThresholdsByClassId(db, classId);
  const result = await db.prepare(
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
              students.total_coins AS total_coins,
              students.reward_count AS reward_count,
              students.pet_collection AS pet_collection,
              students.created_at AS created_at,
              cs.pet_condition_config
       FROM students
       LEFT JOIN class_settings cs ON cs.class_id = students.class_id
       WHERE students.class_id = ?
       ORDER BY students.created_at ASC, students.id ASC`
  ).bind(classId).all();
  const rows = result.results || [];
  const updates = [];
  for (const row of rows) {
    const config = normalizePetConditionConfig(row.pet_condition_config);
    const currentCondition = row.pet_condition || "healthy";
    const currentStatus = row.pet_status;
    const decayResult = applyPetDecayToRow(row, levelThresholds, config);
    const nextStudent = decayResult.student;
    if (decayResult.changed) {
      updates.push(
        db.prepare(
          `UPDATE students
             SET pet_status = ?, pet_condition = ?, last_fed_at = ?, last_decay_at = ?, pet_condition_locked_at = ?,
                 pet_name = ?, pet_type_id = ?, pet_level = ?, pet_points = ?, total_exp = ?, pet_collection = ?
             WHERE id = ?`
        ).bind(
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
          JSON.stringify(nextStudent.pet_collection || []),
          row.id
        )
      );
      Object.assign(row, nextStudent);
      if (userId && currentCondition !== "sleeping" && decayResult.nextCondition === "sleeping" && currentStatus !== "egg") {
        await appendLog(db, {
          classId,
          userId,
          actionType: "\u5BA0\u7269\u4F11\u7720",
          detail: `${row.name} \u7684\u5BA0\u7269\u56E0\u8D85\u8FC7 ${config.sleeping_days} \u5929\u672A\u7167\u6599\uFF0C\u8FDB\u5165\u4E86\u4F11\u7720\u72B6\u6001`
        });
      }
      if (userId && decayResult.decayedExp > 0) {
        await appendLog(db, {
          classId,
          userId,
          actionType: "\u5BA0\u7269\u8870\u51CF",
          detail: decayResult.revertedToEgg ? `${row.name} \u7684\u5BA0\u7269\u56E0\u957F\u671F\u672A\u7167\u6599\uFF0C\u7ECF\u9A8C\u8870\u51CF ${decayResult.decayedExp} \u70B9\u5E76\u9000\u5316\u6210\u4E86\u795E\u79D8\u86CB` : `${row.name} \u7684\u5BA0\u7269\u56E0\u957F\u671F\u672A\u7167\u6599\uFF0C\u7ECF\u9A8C\u8870\u51CF ${decayResult.decayedExp} \u70B9`
        });
      }
    }
  }
  if (updates.length > 0) {
    await db.batch(updates);
  }
  return rows;
}
__name(reconcileStudentConditions, "reconcileStudentConditions");
async function getStudentsByClassId(db, classId, userId = null) {
  const rows = await reconcileStudentConditions(db, classId, userId);
  return rows.map(normalizeStudent);
}
__name(getStudentsByClassId, "getStudentsByClassId");
async function getShopItemsByClassId(db, classId) {
  const result = await db.prepare(
    `SELECT id, class_id, name, icon, item_type, exp_value, price, stock
       FROM shop_items
       WHERE class_id = ?
       ORDER BY created_at DESC, id DESC`
  ).bind(classId).all();
  return (result.results || []).map(normalizeShopItem);
}
__name(getShopItemsByClassId, "getShopItemsByClassId");
async function getRulesByClassId(db, classId, userId) {
  const result = await db.prepare(
    `SELECT id, class_id, owner_user_id, sort_order, name, icon, exp, coins, type
       FROM rules
       WHERE ((class_id = ? AND (owner_user_id = ? OR owner_user_id IS NULL))
          OR (class_id IS NULL AND owner_user_id = ?))
       ORDER BY type ASC, sort_order ASC, id ASC`
  ).bind(classId, userId, userId).all();
  return (result.results || []).map(normalizeRule);
}
__name(getRulesByClassId, "getRulesByClassId");
async function getLogsByClassId(db, classId) {
  const result = await db.prepare(
    `SELECT l.id, l.action_type, l.detail, l.meta, l.created_at, u.nickname AS operator
       FROM logs l
       LEFT JOIN users u ON u.id = l.user_id
       WHERE l.class_id = ?
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT 50`
  ).bind(classId).all();
  return (result.results || []).map(normalizeLog);
}
__name(getLogsByClassId, "getLogsByClassId");
async function getThresholdsByClassId(db, classId) {
  await ensureClassSettings(db, classId);
  const settings = await db.prepare("SELECT level_thresholds FROM class_settings WHERE class_id = ?").bind(classId).first();
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
__name(getThresholdsByClassId, "getThresholdsByClassId");
async function getPetConditionConfigByClassId(db, classId) {
  await ensureClassSettings(db, classId);
  const settings = await db.prepare("SELECT pet_condition_config FROM class_settings WHERE class_id = ?").bind(classId).first();
  return normalizePetConditionConfig(settings?.pet_condition_config);
}
__name(getPetConditionConfigByClassId, "getPetConditionConfigByClassId");
async function getSmartSeatingConfigByClassId(db, classId) {
  await ensureClassSettings(db, classId);
  const settings = await db.prepare("SELECT smart_seating_config FROM class_settings WHERE class_id = ?").bind(classId).first();
  if (!settings?.smart_seating_config) {
    return null;
  }
  try {
    const parsed = JSON.parse(settings.smart_seating_config);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
__name(getSmartSeatingConfigByClassId, "getSmartSeatingConfigByClassId");
async function appendLog(db, { classId, userId, actionType, detail, meta = null }) {
  await db.prepare("INSERT INTO logs (class_id, user_id, action_type, detail, meta) VALUES (?, ?, ?, ?, ?)").bind(classId, userId, actionType, detail, meta ? JSON.stringify(meta) : null).run();
}
__name(appendLog, "appendLog");
async function appendAdminLog(db, { userId, actionType, detail }) {
  await db.prepare("INSERT INTO admin_logs (user_id, action_type, detail) VALUES (?, ?, ?)").bind(userId, actionType, detail).run();
}
__name(appendAdminLog, "appendAdminLog");
async function getAdminLogs(db) {
  const result = await db.prepare(
    `SELECT l.id, l.action_type, l.detail, l.created_at, u.nickname AS operator
       FROM admin_logs l
       LEFT JOIN users u ON u.id = l.user_id
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT 60`
  ).all();
  return (result.results || []).map(normalizeAdminLog);
}
__name(getAdminLogs, "getAdminLogs");
async function getRawLogById(db, classId, logId) {
  return db.prepare("SELECT id, class_id, user_id, action_type, detail, meta, created_at FROM logs WHERE id = ? AND class_id = ?").bind(logId, classId).first();
}
__name(getRawLogById, "getRawLogById");
async function getLatestUndoableLog(db, classId) {
  const result = await db.prepare(
    `SELECT id, class_id, user_id, action_type, detail, meta, created_at
       FROM logs
       WHERE class_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 50`
  ).bind(classId).all();
  const rows = result.results || [];
  return rows.find((row) => {
    const meta = parseLogMeta(row.meta);
    return Boolean(meta?.undoable && !meta?.undone);
  }) || null;
}
__name(getLatestUndoableLog, "getLatestUndoableLog");
async function getBootstrapPayload(db, userId, requestedClassId) {
  await ensureActivationCodes(db);
  await ensureSystemFlags(db);
  await ensureUserRuleTemplates(db, userId);
  const user = normalizeUser(await getUserById(db, userId));
  const classes = await getClassesByUserId(db, userId);
  const resolvedClassId = classes.find((item) => item.id === requestedClassId)?.id || classes[0]?.id || null;
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
      toolboxAccess: (await getToolboxAccessFlag(db)).value
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
    toolboxAccess: (await getToolboxAccessFlag(db)).value
  };
}
__name(getBootstrapPayload, "getBootstrapPayload");
async function handleLogin(db, request) {
  await ensureActivationCodes(db);
  await ensureSystemFlags(db);
  const body = await readBody(request);
  const mode = body.mode === "register" ? "register" : "login";
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!validateUsername(username)) {
    return error("\u8D26\u53F7\u9700\u4E3A 3-24 \u4F4D\u5B57\u6BCD\u3001\u6570\u5B57\u3001\u4E0B\u5212\u7EBF\u6216\u4E2D\u5212\u7EBF");
  }
  if (!validatePassword(password)) {
    return error("\u5BC6\u7801\u81F3\u5C11\u9700\u8981 6 \u4F4D");
  }
  if (mode === "register") {
    const nickname = String(body.nickname || "").trim();
    const activationCodeValue = String(body.activationCode || "").trim().toUpperCase();
    const channelCode = sanitizeChannelCode(body.channelCode);
    const freeRegisterFlag = await getFreeRegisterFlag(db);
    const registrationChannel = channelCode ? await getRegistrationChannelByCode(db, channelCode) : null;
    const registerIp = getClientIp(request);
    const userAgent = getUserAgent(request);
    const denyRegister = /* @__PURE__ */ __name(async (message, status = 400, reason = "validation_failed", retryAfterSeconds = 0) => {
      if (status !== 429) {
        await appendRegistrationAttempt(db, {
          ip: registerIp,
          username,
          result: "failed",
          reason,
          userAgent
        });
      }
      if (status === 429 && retryAfterSeconds > 0) {
        return errorWithHeaders(message, status, {
          "Retry-After": String(retryAfterSeconds)
        });
      }
      return error(message, status);
    }, "denyRegister");
    const limitState = await checkRegisterRateLimit(db, registerIp);
    if (limitState.blocked) {
      return await denyRegister(
        `\u6CE8\u518C\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7${formatRetryHint(limitState.retryAfterSeconds)}`,
        429,
        limitState.reason,
        limitState.retryAfterSeconds
      );
    }
    if (!nickname) {
      return await denyRegister("\u8BF7\u8F93\u5165\u5C55\u793A\u6635\u79F0", 400, "empty_nickname");
    }
    const existingUser = await db.prepare("SELECT id FROM users WHERE username = ?").bind(username).first();
    if (existingUser) {
      return await denyRegister("\u8BE5\u8D26\u53F7\u5DF2\u5B58\u5728\uFF0C\u8BF7\u66F4\u6362\u7528\u6237\u540D", 400, "duplicate_username");
    }
    const canUseChannelRegister = Boolean(registrationChannel?.is_active && !registrationChannel.require_activation);
    const shouldForceActivationByChannel = Boolean(registrationChannel?.is_active && registrationChannel.require_activation);
    if (canUseChannelRegister) {
      const passwordHash2 = await hashPassword(password);
      const expireAt2 = computeExpireAt(FREE_REGISTER_LEVEL_EXPIRES_IN_DAYS[registrationChannel.default_level]);
      const createdUser2 = await db.prepare(
        `INSERT INTO users (username, password_hash, nickname, level, expire_at, role, register_source, source_note, register_channel, register_ip, register_user_agent)
           VALUES (?, ?, ?, ?, ?, 'teacher', 'channel_register', ?, ?, ?, ?)
           RETURNING id, username, nickname, level, expire_at, role, status, register_source, source_note, register_channel, register_ip, register_user_agent`
      ).bind(
        username,
        passwordHash2,
        nickname,
        registrationChannel.default_level,
        expireAt2,
        `\u6E20\u9053\u514D\u6FC0\u6D3B\u6CE8\u518C\uFF1A${registrationChannel.name}${registrationChannel.end_at ? `\uFF0C\u622A\u6B62 ${registrationChannel.end_at}` : ""}`,
        registrationChannel.code,
        registerIp,
        userAgent
      ).first();
      await appendRegistrationAttempt(db, {
        ip: registerIp,
        username,
        result: "success",
        reason: `channel_register:${registrationChannel.code}`,
        userAgent
      });
      await appendAdminLog(db, {
        userId: createdUser2.id,
        actionType: "\u8D26\u53F7\u7BA1\u7406",
        detail: `\u8D26\u53F7 ${createdUser2.username} \u901A\u8FC7\u6E20\u9053 ${registrationChannel.code} \u514D\u6FC0\u6D3B\u6CE8\u518C\u521B\u5EFA\uFF0C\u9ED8\u8BA4\u7B49\u7EA7 ${createdUser2.level}\uFF0C\u6CE8\u518CIP ${registerIp}`
      });
      await ensureUserRuleTemplates(db, createdUser2.id);
      return json({
        user: normalizeUser(createdUser2),
        currentClassId: null
      });
    }
    if (!shouldForceActivationByChannel && freeRegisterFlag.is_active) {
      const passwordHash2 = await hashPassword(password);
      const expireAt2 = computeExpireAt(FREE_REGISTER_LEVEL_EXPIRES_IN_DAYS[freeRegisterFlag.value.default_level]);
      const createdUser2 = await db.prepare(
        `INSERT INTO users (username, password_hash, nickname, level, expire_at, role, register_source, source_note, register_channel, register_ip, register_user_agent)
           VALUES (?, ?, ?, ?, ?, 'teacher', 'free_register', ?, NULL, ?, ?)
           RETURNING id, username, nickname, level, expire_at, role, status, register_source, source_note, register_channel, register_ip, register_user_agent`
      ).bind(
        username,
        passwordHash2,
        nickname,
        freeRegisterFlag.value.default_level,
        expireAt2,
        `\u514D\u6FC0\u6D3B\u6CE8\u518C${freeRegisterFlag.mode === "until" && freeRegisterFlag.end_at ? `\uFF0C\u6709\u6548\u671F\u622A\u6B62 ${freeRegisterFlag.end_at}` : ""}`,
        registerIp,
        userAgent
      ).first();
      await appendRegistrationAttempt(db, {
        ip: registerIp,
        username,
        result: "success",
        reason: "free_register",
        userAgent
      });
      await appendAdminLog(db, {
        userId: createdUser2.id,
        actionType: "\u8D26\u53F7\u7BA1\u7406",
        detail: `\u8D26\u53F7 ${createdUser2.username} \u901A\u8FC7\u514D\u6FC0\u6D3B\u6CE8\u518C\u521B\u5EFA\uFF0C\u9ED8\u8BA4\u7B49\u7EA7 ${createdUser2.level}\uFF0C\u6CE8\u518CIP ${registerIp}`
      });
      await ensureUserRuleTemplates(db, createdUser2.id);
      return json({
        user: normalizeUser(createdUser2),
        currentClassId: null
      });
    }
    if (!activationCodeValue) {
      return await denyRegister("\u8BF7\u8F93\u5165\u6709\u6548\u7684\u6FC0\u6D3B\u7801", 400, "empty_activation_code");
    }
    const activationCode = await db.prepare(
      `SELECT id, code, level, expires_in_days, used_by_user_id, used_at, max_uses, used_count, status
         FROM activation_codes
         WHERE code = ?`
    ).bind(activationCodeValue).first();
    if (!activationCode) {
      return await denyRegister("\u6FC0\u6D3B\u7801\u4E0D\u5B58\u5728\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458\u786E\u8BA4", 400, "activation_code_not_found");
    }
    if (activationCode.status === "revoked") {
      return await denyRegister("\u8BE5\u6FC0\u6D3B\u7801\u5DF2\u4F5C\u5E9F", 400, "activation_code_revoked");
    }
    if (Number(activationCode.used_count || 0) >= Number(activationCode.max_uses || 1)) {
      return await denyRegister("\u8BE5\u6FC0\u6D3B\u7801\u5DF2\u88AB\u4F7F\u7528\u5B8C\u6BD5", 400, "activation_code_exhausted");
    }
    const passwordHash = await hashPassword(password);
    const expireAt = computeExpireAt(
      activationCode.expires_in_days === null ? null : Number(activationCode.expires_in_days)
    );
    const createdUser = await db.prepare(
      `INSERT INTO users (username, password_hash, nickname, level, expire_at, role, register_source, source_note, register_channel, register_ip, register_user_agent)
         VALUES (?, ?, ?, ?, ?, ?, 'activation_code', ?, ?, ?, ?)
         RETURNING id, username, nickname, level, expire_at, role, status, register_source, source_note, register_channel, register_ip, register_user_agent`
    ).bind(
      username,
      passwordHash,
      nickname,
      activationCode.level,
      expireAt,
      activationCode.level === "permanent" ? "super_admin" : "teacher",
      activationCode.code,
      registrationChannel?.is_active ? registrationChannel.code : null,
      registerIp,
      userAgent
    ).first();
    await appendRegistrationAttempt(db, {
      ip: registerIp,
      username,
      result: "success",
      reason: "activation_code",
      userAgent
    });
    await db.prepare(
      `UPDATE activation_codes
         SET used_by_user_id = ?,
             used_at = CURRENT_TIMESTAMP,
             used_count = used_count + 1,
             status = CASE
               WHEN used_count + 1 >= max_uses THEN 'used'
               ELSE status
             END
         WHERE id = ?`
    ).bind(createdUser.id, activationCode.id).run();
    await ensureUserRuleTemplates(db, createdUser.id);
    return json({
      user: normalizeUser(createdUser),
      currentClassId: null
    });
  }
  const user = await getUserWithPassword(db, username);
  if (!user || !await verifyPassword(password, user.password_hash)) {
    return error("\u8D26\u53F7\u6216\u5BC6\u7801\u9519\u8BEF", 401);
  }
  if (user.password_hash === password) {
    await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(await hashPassword(password), user.id).run();
  }
  await ensureUserRuleTemplates(db, user.id);
  const classes = await getClassesByUserId(db, user.id);
  return json({
    user: normalizeUser(user),
    currentClassId: classes[0]?.id || null
  });
}
__name(handleLogin, "handleLogin");
async function handleUpdatePassword(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const currentPassword = String(body.currentPassword || "");
  const nextPassword = String(body.nextPassword || "");
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u6559\u5E08\u8EAB\u4EFD");
  }
  if (!validatePassword(currentPassword) || !validatePassword(nextPassword)) {
    return error("\u5BC6\u7801\u81F3\u5C11\u9700\u8981 6 \u4F4D");
  }
  if (currentPassword === nextPassword) {
    return error("\u65B0\u5BC6\u7801\u4E0D\u80FD\u4E0E\u5F53\u524D\u5BC6\u7801\u76F8\u540C");
  }
  const user = await db.prepare("SELECT id, password_hash FROM users WHERE id = ?").bind(userId).first();
  if (!user) {
    return error("\u6559\u5E08\u8D26\u53F7\u4E0D\u5B58\u5728\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55", 404);
  }
  const verified = await verifyPassword(currentPassword, user.password_hash);
  if (!verified) {
    return error("\u5F53\u524D\u5BC6\u7801\u4E0D\u6B63\u786E", 401);
  }
  await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(await hashPassword(nextPassword), userId).run();
  return json({ success: true });
}
__name(handleUpdatePassword, "handleUpdatePassword");
async function handleCreateClass(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const name = String(body.name || "").trim();
  if (!userId || !name) {
    return error("\u8BF7\u8F93\u5165\u6709\u6548\u7684\u73ED\u7EA7\u540D\u79F0");
  }
  const user = await getUserById(db, userId);
  const classes = await getClassesByUserId(db, userId);
  if (user.level === "temporary" && classes.length >= 1) {
    return error("\u4E34\u65F6\u8D26\u6237\u53EA\u80FD\u521B\u5EFA\u4E00\u4E2A\u73ED\u7EA7\uFF0C\u8BF7\u5347\u7EA7\u8D26\u6237\u4EAB\u7528\u65E0\u9650\u7279\u6743", 403);
  }
  const createdClass = await db.prepare(
    `INSERT INTO classes (user_id, name)
       VALUES (?, ?)
       RETURNING id, name, created_at`
  ).bind(userId, name).first();
  await ensureClassSettings(db, createdClass.id);
  await appendLog(db, {
    classId: createdClass.id,
    userId,
    actionType: "\u73ED\u7EA7\u8BBE\u7F6E",
    detail: `\u521B\u5EFA\u4E86\u73ED\u7EA7 ${name}`
  });
  return json({
    class: normalizeClass(createdClass),
    classes: await getClassesByUserId(db, userId),
    currentClassId: Number(createdClass.id)
  });
}
__name(handleCreateClass, "handleCreateClass");
async function handleRenameClass(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const name = String(body.name || "").trim();
  if (!userId || !name) {
    return error("\u73ED\u7EA7\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
  }
  await assertClassOwnership(db, userId, classId);
  await db.prepare("UPDATE classes SET name = ? WHERE id = ?").bind(name, classId).run();
  await appendLog(db, {
    classId,
    userId,
    actionType: "\u73ED\u7EA7\u8BBE\u7F6E",
    detail: `\u73ED\u7EA7\u540D\u79F0\u66F4\u65B0\u4E3A ${name}`
  });
  return json({
    classes: await getClassesByUserId(db, userId),
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleRenameClass, "handleRenameClass");
async function handleImportStudents(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const names = Array.isArray(body.names) ? body.names : [];
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u6559\u5E08\u8EAB\u4EFD");
  }
  await assertClassOwnership(db, userId, classId);
  const cleanedNames = Array.from(
    new Set(names.map((name) => String(name || "").trim()).filter(Boolean))
  );
  if (cleanedNames.length === 0) {
    return error("\u8BF7\u81F3\u5C11\u8F93\u5165\u4E00\u540D\u5B66\u751F\u59D3\u540D");
  }
  const statements = cleanedNames.map(
    (name) => db.prepare(
      `INSERT INTO students (class_id, name, pet_status, pet_condition, last_fed_at, pet_condition_locked_at, pet_level, pet_points, coins, total_exp, total_coins)
         VALUES (?, ?, 'egg', 'healthy', NULL, NULL, 0, 0, 0, 0, 0)`
    ).bind(classId, name)
  );
  await db.batch(statements);
  await appendLog(db, {
    classId,
    userId,
    actionType: "\u5B66\u751F\u7BA1\u7406",
    detail: `\u6279\u91CF\u5BFC\u5165\u4E86 ${cleanedNames.length} \u540D\u5B66\u751F`
  });
  return json({
    students: await getStudentsByClassId(db, classId, userId),
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleImportStudents, "handleImportStudents");
async function handleCreateStudent(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const name = String(body.name || "").trim();
  if (!userId || !name) {
    return error("\u8BF7\u8F93\u5165\u5B66\u751F\u59D3\u540D");
  }
  await assertClassOwnership(db, userId, classId);
  await db.prepare(
    `INSERT INTO students (class_id, name, pet_status, pet_condition, last_fed_at, pet_condition_locked_at, pet_level, pet_points, coins, total_exp, total_coins)
       VALUES (?, ?, 'egg', 'healthy', NULL, NULL, 0, 0, 0, 0, 0)`
  ).bind(classId, name).run();
  await appendLog(db, {
    classId,
    userId,
    actionType: "\u5B66\u751F\u7BA1\u7406",
    detail: `\u65B0\u589E\u4E86\u5B66\u751F ${name}`
  });
  return json({
    students: await getStudentsByClassId(db, classId, userId),
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleCreateStudent, "handleCreateStudent");
async function handleBatchDeleteStudents(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const studentIds = Array.isArray(body.studentIds) ? Array.from(new Set(body.studentIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))) : [];
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u6559\u5E08\u8EAB\u4EFD");
  }
  if (studentIds.length === 0) {
    return error("\u8BF7\u81F3\u5C11\u9009\u62E9\u4E00\u540D\u5B66\u751F");
  }
  await assertClassOwnership(db, userId, classId);
  const placeholders = studentIds.map(() => "?").join(", ");
  const result = await db.prepare(`SELECT id, name FROM students WHERE class_id = ? AND id IN (${placeholders})`).bind(classId, ...studentIds).all();
  const targetStudents = result.results || [];
  if (targetStudents.length !== studentIds.length) {
    return error("\u90E8\u5206\u5B66\u751F\u4E0D\u5B58\u5728\u6216\u5DF2\u88AB\u79FB\u9664");
  }
  await db.prepare(`DELETE FROM students WHERE class_id = ? AND id IN (${placeholders})`).bind(classId, ...studentIds).run();
  const summaryNames = targetStudents.slice(0, 6).map((student) => student.name).join("\u3001");
  const suffix = targetStudents.length > 6 ? " \u7B49\u5B66\u751F" : "";
  await appendLog(db, {
    classId,
    userId,
    actionType: "\u5B66\u751F\u7BA1\u7406",
    detail: `\u6279\u91CF\u79FB\u9664\u4E86 ${targetStudents.length} \u540D\u5B66\u751F\uFF1A${summaryNames}${suffix}`
  });
  return json({
    students: await getStudentsByClassId(db, classId, userId),
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleBatchDeleteStudents, "handleBatchDeleteStudents");
async function handleUpdateStudent(db, request, studentId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);
  const updates = body.updates && typeof body.updates === "object" ? body.updates : {};
  const undoMeta = body.undoMeta && typeof body.undoMeta === "object" ? body.undoMeta : null;
  if (!userId || !classId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u73ED\u7EA7\u4E0A\u4E0B\u6587");
  }
  const currentStudent = await assertStudentOwnership(db, userId, studentId);
  const currentCondition = derivePetCondition(currentStudent);
  if (Number(currentStudent.class_id) !== classId) {
    return error("\u5B66\u751F\u4E0E\u5F53\u524D\u73ED\u7EA7\u4E0D\u5339\u914D");
  }
  if (updates.archived) {
    await db.prepare("DELETE FROM students WHERE id = ?").bind(studentId).run();
    if (body.actionType && body.detail) {
      await appendLog(db, {
        classId,
        userId,
        actionType: body.actionType,
        detail: body.detail
      });
    }
    return json({
      student: null,
      logs: await getLogsByClassId(db, classId)
    });
  }
  const nextName = String(updates.name ?? currentStudent.name).trim();
  if (!nextName) {
    return error("\u5B66\u751F\u59D3\u540D\u4E0D\u80FD\u4E3A\u7A7A");
  }
  const nextStudent = {
    name: nextName,
    pet_status: String(updates.pet_status ?? currentStudent.pet_status ?? "egg"),
    pet_condition: String(updates.pet_condition ?? currentCondition),
    last_fed_at: updates.last_fed_at ?? currentStudent.last_fed_at ?? null,
    last_decay_at: updates.last_decay_at ?? currentStudent.last_decay_at ?? currentStudent.last_fed_at ?? null,
    pet_condition_locked_at: updates.pet_condition_locked_at ?? currentStudent.pet_condition_locked_at ?? null,
    pet_name: updates.pet_name ?? currentStudent.pet_name,
    pet_type_id: updates.pet_type_id ?? currentStudent.pet_type_id,
    pet_level: Math.max(0, Number(updates.pet_level ?? currentStudent.pet_level ?? 0)),
    pet_points: Math.max(0, Number(updates.pet_points ?? currentStudent.pet_points ?? 0)),
    coins: Math.max(0, Number(updates.coins ?? currentStudent.coins ?? 0)),
    total_exp: Math.max(0, Number(updates.total_exp ?? currentStudent.total_exp ?? 0)),
    total_coins: Math.max(0, Number(updates.total_coins ?? currentStudent.total_coins ?? 0)),
    reward_count: Math.max(0, Number(updates.reward_count ?? currentStudent.reward_count ?? 0)),
    pet_collection: parsePetCollection(updates.pet_collection ?? currentStudent.pet_collection ?? "[]")
  };
  if (currentStudent.pet_status === "egg" && nextStudent.pet_status !== "egg" && !nextStudent.last_fed_at) {
    nextStudent.last_fed_at = nowIso();
    nextStudent.last_decay_at = nextStudent.last_fed_at;
  }
  if (nextStudent.pet_status === "egg") {
    nextStudent.pet_condition = "healthy";
    nextStudent.last_fed_at = null;
    nextStudent.last_decay_at = null;
    nextStudent.pet_condition_locked_at = null;
  } else {
    nextStudent.pet_condition = derivePetCondition(nextStudent);
    nextStudent.pet_condition_locked_at = nextStudent.pet_condition === "sleeping" ? nextStudent.pet_condition_locked_at || nowIso() : null;
  }
  await db.prepare(
    `UPDATE students
       SET name = ?, pet_status = ?, pet_condition = ?, last_fed_at = ?, last_decay_at = ?, pet_condition_locked_at = ?, pet_name = ?, pet_type_id = ?, pet_level = ?, pet_points = ?, coins = ?, total_exp = ?, total_coins = ?, reward_count = ?, pet_collection = ?
       WHERE id = ?`
  ).bind(
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
    nextStudent.total_coins,
    nextStudent.reward_count,
    JSON.stringify(nextStudent.pet_collection),
    studentId
  ).run();
  if (body.actionType && body.detail) {
    await appendLog(db, {
      classId,
      userId,
      actionType: body.actionType,
      detail: body.detail,
      meta: undoMeta
    });
  }
  const refreshedStudent = await db.prepare(`SELECT ${STUDENT_SELECT_FIELDS} FROM students WHERE id = ?`).bind(studentId).first();
  return json({
    student: normalizeStudent(refreshedStudent),
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleUpdateStudent, "handleUpdateStudent");
async function applyFeedToStudents(db, classId, userId, studentIds, selectedRule = null) {
  if (studentIds.length === 0) {
    return [];
  }
  const placeholders = studentIds.map(() => "?").join(", ");
  const result = await db.prepare(`SELECT ${STUDENT_SELECT_FIELDS} FROM students WHERE class_id = ? AND id IN (${placeholders})`).bind(classId, ...studentIds).all();
  const rows = result.results || [];
  if (rows.length !== studentIds.length) {
    throw new Error("\u90E8\u5206\u5B66\u751F\u4E0D\u5B58\u5728\u6216\u5DF2\u88AB\u79FB\u9664");
  }
  const thresholds = await getThresholdsByClassId(db, classId);
  const feedAt = nowIso();
  const statements = [];
  const pendingLogs = [];
  const interactionRule = {
    name: String(selectedRule?.name || "\u6279\u91CF\u4E92\u52A8"),
    exp: Number(selectedRule?.exp ?? 1),
    coins: Number(selectedRule?.coins || 0),
    type: selectedRule?.type === "negative" ? "negative" : "positive"
  };
  for (const row of rows) {
    if (row.pet_status === "egg") {
      throw new Error(`${row.name} \u8FD8\u6CA1\u6709\u5524\u9192\u5BA0\u7269\uFF0C\u6682\u65F6\u65E0\u6CD5\u53C2\u4E0E\u6279\u91CF\u4E92\u52A8`);
    }
    const beforeCondition = derivePetCondition(row);
    const nextTotalExp = Math.max(0, Number(row.total_exp || 0) + interactionRule.exp);
    const nextPetPoints = Math.max(0, Number(row.pet_points || 0) + interactionRule.exp);
    const nextCoins = Math.max(0, Number(row.coins || 0) + interactionRule.coins);
    const nextTotalCoins = Math.max(0, Number(row.total_coins || 0) + interactionRule.coins);
    const nextRewardCount = Math.max(
      0,
      Number(row.reward_count || 0) + (interactionRule.type === "positive" ? 1 : 0)
    );
    const nextLevel = resolvePetLevel(nextTotalExp, thresholds);
    const nextLastFedAt = interactionRule.type === "positive" ? feedAt : row.last_fed_at || null;
    const nextLastDecayAt = interactionRule.type === "positive" ? feedAt : row.last_decay_at ?? row.last_fed_at ?? null;
    const nextCondition = interactionRule.type === "positive" ? "healthy" : row.pet_condition || beforeCondition || "healthy";
    const nextLockedAt = interactionRule.type === "positive" ? null : row.pet_condition_locked_at || null;
    const nextStudent = {
      ...row,
      coins: nextCoins,
      total_exp: nextTotalExp,
      total_coins: nextTotalCoins,
      pet_points: nextPetPoints,
      reward_count: nextRewardCount,
      pet_level: nextLevel,
      last_fed_at: nextLastFedAt,
      last_decay_at: nextLastDecayAt,
      pet_condition: nextCondition,
      pet_condition_locked_at: nextLockedAt
    };
    const nextCollection = syncStudentCollectionProgress(nextStudent);
    statements.push(
      db.prepare(
        `UPDATE students
           SET pet_condition = ?,
               last_fed_at = ?,
               last_decay_at = ?,
               pet_condition_locked_at = ?,
               pet_level = ?,
               pet_points = ?,
               coins = ?,
               total_exp = ?,
               total_coins = ?,
               reward_count = ?,
               pet_collection = ?
           WHERE id = ? AND class_id = ?`
      ).bind(
        nextCondition,
        nextLastFedAt,
        nextLastDecayAt,
        nextLockedAt,
        nextLevel,
        nextPetPoints,
        nextCoins,
        nextTotalExp,
        nextTotalCoins,
        nextRewardCount,
        JSON.stringify(nextCollection),
        row.id,
        classId
      )
    );
    if (interactionRule.type === "positive" && beforeCondition === "sleeping") {
      pendingLogs.push({
        classId,
        userId,
        actionType: "\u5BA0\u7269\u5524\u9192",
        detail: `\u8001\u5E08\u5582\u517B\u4E86 ${row.name} \u7684\u5BA0\u7269\uFF0C\u5B83\u4ECE\u4F11\u7720\u4E2D\u9192\u6765\u4E86`
      });
    }
    pendingLogs.push({
      classId,
      userId,
      actionType: "\u8BFE\u5802\u4E92\u52A8",
      detail: `\u8001\u5E08\u4E3A ${row.name} \u7684\u5BA0\u7269\u5E94\u7528\u4E86\u6279\u91CF\u4E92\u52A8\u89C4\u5219\u300C${interactionRule.name}\u300D(EXP: ${interactionRule.exp >= 0 ? `+${interactionRule.exp}` : interactionRule.exp}, \u91D1\u5E01: ${interactionRule.coins >= 0 ? `+${interactionRule.coins}` : interactionRule.coins})`
    });
  }
  await db.batch(statements);
  for (const entry of pendingLogs) {
    await appendLog(db, entry);
  }
  return getStudentsByClassId(db, classId, userId);
}
__name(applyFeedToStudents, "applyFeedToStudents");
async function handleFeedStudent(db, request, studentId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);
  if (!userId || !classId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u73ED\u7EA7\u4E0A\u4E0B\u6587");
  }
  const currentStudent = await assertStudentOwnership(db, userId, studentId);
  if (Number(currentStudent.class_id) !== classId) {
    return error("\u5B66\u751F\u4E0E\u5F53\u524D\u73ED\u7EA7\u4E0D\u5339\u914D");
  }
  await applyFeedToStudents(db, classId, userId, [studentId]);
  const refreshedStudent = await db.prepare(`SELECT ${STUDENT_SELECT_FIELDS} FROM students WHERE id = ?`).bind(studentId).first();
  return json({
    student: normalizeStudent(refreshedStudent),
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleFeedStudent, "handleFeedStudent");
async function handleFeedStudentsBatch(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const studentIds = Array.isArray(body.studentIds) ? Array.from(new Set(body.studentIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))) : [];
  const rule = body.rule && typeof body.rule === "object" ? body.rule : null;
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u6559\u5E08\u8EAB\u4EFD");
  }
  if (studentIds.length === 0) {
    return error("\u8BF7\u81F3\u5C11\u9009\u62E9\u4E00\u540D\u5B66\u751F");
  }
  await assertClassOwnership(db, userId, classId);
  const students = await applyFeedToStudents(db, classId, userId, studentIds, rule);
  return json({
    students,
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleFeedStudentsBatch, "handleFeedStudentsBatch");
async function handleCreateShopItem(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const item = body.item && typeof body.item === "object" ? body.item : {};
  const name = String(item.name || "").trim();
  const icon = String(item.icon || "\u{1F381}").trim() || "\u{1F381}";
  const itemType = item.item_type === "exp_pack" ? "exp_pack" : "gift";
  const expValue = Math.max(0, Number(item.exp_value || 0));
  const price = Number(item.price || 0);
  const stock = Math.max(0, Number(item.stock || 0));
  if (!userId || !name || price <= 0) {
    return error("\u8BF7\u586B\u5199\u6709\u6548\u7684\u5546\u54C1\u540D\u79F0\u4E0E\u4EF7\u683C");
  }
  if (itemType === "exp_pack" && expValue <= 0) {
    return error("\u7ECF\u9A8C\u5305\u5FC5\u987B\u8BBE\u7F6E\u5927\u4E8E 0 \u7684\u7ECF\u9A8C\u503C");
  }
  await assertClassOwnership(db, userId, classId);
  await db.prepare("INSERT INTO shop_items (class_id, name, icon, item_type, exp_value, price, stock) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(classId, name, icon, itemType, itemType === "exp_pack" ? expValue : 0, price, stock || 99).run();
  await appendLog(db, {
    classId,
    userId,
    actionType: "\u5546\u54C1\u7BA1\u7406",
    detail: itemType === "exp_pack" ? `\u65B0\u589E\u7ECF\u9A8C\u5305 ${name}\uFF08+${expValue} EXP\uFF09\uFF0C\u5E93\u5B58 ${stock || 99}` : `\u65B0\u589E\u5546\u54C1 ${name}\uFF0C\u5E93\u5B58 ${stock || 99}`
  });
  return json({
    shopItems: await getShopItemsByClassId(db, classId),
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleCreateShopItem, "handleCreateShopItem");
async function handleUpdateShopItem(db, request, itemId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);
  const item = body.item && typeof body.item === "object" ? body.item : {};
  const name = String(item.name || "").trim();
  const icon = String(item.icon || "\u{1F381}").trim() || "\u{1F381}";
  const itemType = item.item_type === "exp_pack" ? "exp_pack" : "gift";
  const expValue = Math.max(0, Number(item.exp_value || 0));
  const price = Number(item.price || 0);
  const stock = Math.max(0, Number(item.stock || 0));
  if (!userId || !classId || !name || price <= 0) {
    return error("\u8BF7\u586B\u5199\u6709\u6548\u7684\u5546\u54C1\u540D\u79F0\u4E0E\u4EF7\u683C");
  }
  if (itemType === "exp_pack" && expValue <= 0) {
    return error("\u7ECF\u9A8C\u5305\u5FC5\u987B\u8BBE\u7F6E\u5927\u4E8E 0 \u7684\u7ECF\u9A8C\u503C");
  }
  await assertClassOwnership(db, userId, classId);
  const existing = await db.prepare("SELECT id, class_id, name FROM shop_items WHERE id = ? AND class_id = ?").bind(itemId, classId).first();
  if (!existing) {
    return error("\u5546\u54C1\u4E0D\u5B58\u5728\u6216\u5DF2\u4E0B\u67B6");
  }
  await db.prepare("UPDATE shop_items SET name = ?, icon = ?, item_type = ?, exp_value = ?, price = ?, stock = ? WHERE id = ?").bind(name, icon, itemType, itemType === "exp_pack" ? expValue : 0, price, stock, itemId).run();
  await appendLog(db, {
    classId,
    userId,
    actionType: "\u5546\u54C1\u7BA1\u7406",
    detail: itemType === "exp_pack" ? `\u66F4\u65B0\u4E86\u7ECF\u9A8C\u5305 ${name}\uFF08+${expValue} EXP\uFF09\uFF0C\u4EF7\u683C ${price}\uFF0C\u5E93\u5B58 ${stock}` : `\u66F4\u65B0\u4E86\u5546\u54C1 ${name}\uFF0C\u4EF7\u683C ${price}\uFF0C\u5E93\u5B58 ${stock}`
  });
  return json({
    shopItems: await getShopItemsByClassId(db, classId),
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleUpdateShopItem, "handleUpdateShopItem");
async function handleDeleteShopItem(db, request, itemId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);
  if (!userId || !classId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u5546\u54C1\u4E0A\u4E0B\u6587");
  }
  await assertClassOwnership(db, userId, classId);
  const item = await db.prepare("SELECT id, class_id, name FROM shop_items WHERE id = ? AND class_id = ?").bind(itemId, classId).first();
  if (!item) {
    return error("\u5546\u54C1\u4E0D\u5B58\u5728\u6216\u5DF2\u4E0B\u67B6");
  }
  await db.prepare("DELETE FROM shop_items WHERE id = ?").bind(itemId).run();
  await appendLog(db, {
    classId,
    userId,
    actionType: "\u5546\u54C1\u7BA1\u7406",
    detail: `\u4E0B\u67B6\u4E86\u5546\u54C1 ${item.name}`
  });
  return json({
    shopItems: await getShopItemsByClassId(db, classId),
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleDeleteShopItem, "handleDeleteShopItem");
async function handleRedeemShopItem(db, request, itemId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);
  const studentIds = Array.isArray(body.studentIds) ? Array.from(new Set(body.studentIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))) : [];
  if (!userId || !classId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u5151\u6362\u4E0A\u4E0B\u6587");
  }
  if (studentIds.length === 0) {
    return error("\u8BF7\u81F3\u5C11\u9009\u62E9\u4E00\u540D\u5B66\u751F");
  }
  await assertClassOwnership(db, userId, classId);
  const item = await db.prepare("SELECT id, class_id, name, icon, item_type, exp_value, price, stock FROM shop_items WHERE id = ? AND class_id = ?").bind(itemId, classId).first();
  if (!item) {
    return error("\u5546\u54C1\u4E0D\u5B58\u5728\u6216\u5DF2\u4E0B\u67B6");
  }
  if (studentIds.length > Number(item.stock || 0)) {
    return error("\u6240\u9009\u5B66\u751F\u6570\u91CF\u8D85\u8FC7\u4E86\u5F53\u524D\u5E93\u5B58");
  }
  const placeholders = studentIds.map(() => "?").join(", ");
  const selectedStudents = await db.prepare(`SELECT ${STUDENT_SELECT_FIELDS} FROM students WHERE class_id = ? AND id IN (${placeholders})`).bind(classId, ...studentIds).all();
  const students = (selectedStudents.results || []).map(normalizeStudent);
  if (students.length !== studentIds.length) {
    return error("\u90E8\u5206\u5B66\u751F\u4E0D\u5B58\u5728\uFF0C\u5151\u6362\u672A\u6267\u884C");
  }
  const unaffordableStudent = students.find((student) => (student.coins || 0) < Number(item.price || 0));
  if (unaffordableStudent) {
    return error(`\u5B66\u751F ${unaffordableStudent.name} \u7684\u91D1\u5E01\u4E0D\u8DB3\uFF0C\u5151\u6362\u5DF2\u53D6\u6D88`);
  }
  if (item.item_type === "exp_pack") {
    const ineligibleStudent = students.find((student) => student.pet_status === "egg");
    if (ineligibleStudent) {
      return error(`\u5B66\u751F ${ineligibleStudent.name} \u8FD8\u6CA1\u6709\u5524\u9192\u5BA0\u7269\uFF0C\u6682\u65F6\u4E0D\u80FD\u4F7F\u7528\u7ECF\u9A8C\u5305`);
    }
  }
  const thresholds = await getThresholdsByClassId(db, classId);
  const rewardExp = Math.max(0, Number(item.exp_value || 0));
  const now = nowIso();
  const statements = students.map((student) => {
    if (item.item_type === "exp_pack") {
      const nextTotalExp = Math.max(0, Number(student.total_exp || 0) + rewardExp);
      const nextPetPoints = Math.max(0, Number(student.pet_points || 0) + rewardExp);
      const nextLevel = resolvePetLevel(nextTotalExp, thresholds);
      const updatedStudent = {
        ...student,
        coins: (student.coins || 0) - Number(item.price || 0),
        total_exp: nextTotalExp,
        pet_points: nextPetPoints,
        pet_level: nextLevel,
        last_fed_at: now,
        last_decay_at: now,
        pet_condition: "healthy",
        pet_condition_locked_at: null
      };
      const nextCollection = syncStudentCollectionProgress(updatedStudent);
      return db.prepare(
        `UPDATE students
           SET coins = ?, total_exp = ?, pet_points = ?, pet_level = ?, last_fed_at = ?, last_decay_at = ?, pet_condition = 'healthy', pet_condition_locked_at = NULL, pet_collection = ?
           WHERE id = ?`
      ).bind(
        updatedStudent.coins,
        nextTotalExp,
        nextPetPoints,
        nextLevel,
        now,
        now,
        JSON.stringify(nextCollection),
        student.id
      );
    }
    return db.prepare("UPDATE students SET coins = ? WHERE id = ?").bind((student.coins || 0) - Number(item.price || 0), student.id);
  });
  statements.push(
    db.prepare("UPDATE shop_items SET stock = ? WHERE id = ?").bind(Number(item.stock || 0) - studentIds.length, itemId)
  );
  await db.batch(statements);
  await appendLog(db, {
    classId,
    userId,
    actionType: "\u5546\u54C1\u5151\u6362",
    detail: item.item_type === "exp_pack" ? `\u4E3A ${students.map((student) => student.name).join("\u3001")} \u5151\u6362\u4E86\u7ECF\u9A8C\u5305 ${item.name}\uFF08\u6BCF\u4EBA +${rewardExp} EXP\uFF09` : `\u4E3A ${students.map((student) => student.name).join("\u3001")} \u5151\u6362\u4E86 ${item.name}`,
    meta: {
      undoable: true,
      kind: "shop-redeem",
      item: {
        id: Number(item.id),
        name: item.name,
        item_type: item.item_type || "gift",
        exp_value: rewardExp,
        stockBefore: Number(item.stock || 0),
        stockAfter: Number(item.stock || 0) - studentIds.length
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
        pet_condition: student.pet_condition || "healthy",
        pet_condition_locked_at: student.pet_condition_locked_at || null,
        pet_collection: student.pet_collection || []
      })),
      studentsAfter: students.map((student) => ({
        id: student.id,
        coins: (student.coins || 0) - Number(item.price || 0),
        total_exp: item.item_type === "exp_pack" ? (student.total_exp || 0) + rewardExp : student.total_exp || 0,
        pet_points: item.item_type === "exp_pack" ? (student.pet_points || 0) + rewardExp : student.pet_points || 0
      }))
    }
  });
  return json({
    students: await getStudentsByClassId(db, classId, userId),
    shopItems: await getShopItemsByClassId(db, classId),
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleRedeemShopItem, "handleRedeemShopItem");
async function handleCreateRule(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const rule = body.rule && typeof body.rule === "object" ? body.rule : {};
  const name = String(rule.name || "").trim();
  const icon = String(rule.icon || "\u2B50").trim() || "\u2B50";
  const exp = Number(rule.exp || 0);
  const coins = Number(rule.coins || 0);
  const type = rule.type === "negative" ? "negative" : "positive";
  if (!userId || !name) {
    return error("\u8BF7\u8F93\u5165\u89C4\u5219\u540D\u79F0");
  }
  await assertClassOwnership(db, userId, classId);
  const maxOrderRow = await db.prepare(
    `SELECT COALESCE(MAX(sort_order), 0) AS max_order
       FROM rules
       WHERE type = ?
         AND ((class_id = ? AND (owner_user_id = ? OR owner_user_id IS NULL))
           OR (class_id IS NULL AND owner_user_id = ?))`
  ).bind(type, classId, userId, userId).first();
  const nextSortOrder = Number(maxOrderRow?.max_order || 0) + 1;
  await db.prepare("INSERT INTO rules (class_id, owner_user_id, sort_order, name, icon, exp, coins, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(classId, userId, nextSortOrder, name, icon, exp, coins, type).run();
  await appendLog(db, {
    classId,
    userId,
    actionType: "\u89C4\u5219\u4FEE\u6539",
    detail: `\u65B0\u589E\u89C4\u5219 ${name}`
  });
  return json({
    rules: await getRulesByClassId(db, classId, userId),
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleCreateRule, "handleCreateRule");
async function handleUpdateRule(db, request, ruleId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);
  const rule = body.rule && typeof body.rule === "object" ? body.rule : {};
  const name = String(rule.name || "").trim();
  const icon = String(rule.icon || "\u2B50").trim() || "\u2B50";
  const exp = Number(rule.exp || 0);
  const coins = Number(rule.coins || 0);
  const type = rule.type === "negative" ? "negative" : "positive";
  if (!userId || !classId || !name) {
    return error("\u8BF7\u8F93\u5165\u89C4\u5219\u540D\u79F0");
  }
  await assertClassOwnership(db, userId, classId);
  const existing = await db.prepare(
    `SELECT id, class_id, owner_user_id, name
       FROM rules
       WHERE id = ?
         AND ((class_id = ? AND (owner_user_id = ? OR owner_user_id IS NULL))
           OR (class_id IS NULL AND owner_user_id = ?))`
  ).bind(ruleId, classId, userId, userId).first();
  if (!existing) {
    return error("\u76EE\u6807\u89C4\u5219\u4E0D\u5B58\u5728");
  }
  await db.prepare("UPDATE rules SET name = ?, icon = ?, exp = ?, coins = ?, type = ? WHERE id = ?").bind(name, icon, exp, coins, type, ruleId).run();
  await appendLog(db, {
    classId,
    userId,
    actionType: "\u89C4\u5219\u4FEE\u6539",
    detail: `\u66F4\u65B0\u89C4\u5219 ${name}`
  });
  return json({
    rules: await getRulesByClassId(db, classId, userId),
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleUpdateRule, "handleUpdateRule");
async function handleDeleteRule(db, request, ruleId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);
  if (!userId || !classId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u89C4\u5219\u4E0A\u4E0B\u6587");
  }
  await assertClassOwnership(db, userId, classId);
  const rule = await db.prepare(
    `SELECT id, class_id, owner_user_id, name
       FROM rules
       WHERE id = ?
         AND ((class_id = ? AND (owner_user_id = ? OR owner_user_id IS NULL))
           OR (class_id IS NULL AND owner_user_id = ?))`
  ).bind(ruleId, classId, userId, userId).first();
  if (!rule) {
    return error("\u76EE\u6807\u89C4\u5219\u4E0D\u5B58\u5728");
  }
  await db.prepare("DELETE FROM rules WHERE id = ?").bind(ruleId).run();
  await appendLog(db, {
    classId,
    userId,
    actionType: "\u89C4\u5219\u4FEE\u6539",
    detail: `\u5220\u9664\u89C4\u5219 ${rule.name}`
  });
  return json({
    rules: await getRulesByClassId(db, classId, userId),
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleDeleteRule, "handleDeleteRule");
async function handleMoveRule(db, request, ruleId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);
  const direction = body.direction === "down" ? "down" : "up";
  if (!userId || !classId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u89C4\u5219\u4E0A\u4E0B\u6587");
  }
  await assertClassOwnership(db, userId, classId);
  const currentRule = await db.prepare(
    `SELECT id, class_id, owner_user_id, sort_order, name, type
       FROM rules
       WHERE id = ?
         AND ((class_id = ? AND (owner_user_id = ? OR owner_user_id IS NULL))
           OR (class_id IS NULL AND owner_user_id = ?))`
  ).bind(ruleId, classId, userId, userId).first();
  if (!currentRule) {
    return error("\u76EE\u6807\u89C4\u5219\u4E0D\u5B58\u5728");
  }
  const currentSortOrder = Number(currentRule.sort_order || 0);
  const neighbor = await db.prepare(
    `SELECT id, sort_order, name
       FROM rules
       WHERE type = ? AND id != ?
         AND ((class_id = ? AND (owner_user_id = ? OR owner_user_id IS NULL))
           OR (class_id IS NULL AND owner_user_id = ?))
         AND sort_order ${direction === "up" ? "<" : ">"} ?
       ORDER BY sort_order ${direction === "up" ? "DESC" : "ASC"}, id ${direction === "up" ? "DESC" : "ASC"}
       LIMIT 1`
  ).bind(currentRule.type, ruleId, classId, userId, userId, currentSortOrder).first();
  if (!neighbor) {
    return json({
      rules: await getRulesByClassId(db, classId, userId),
      logs: await getLogsByClassId(db, classId)
    });
  }
  await db.batch([
    db.prepare("UPDATE rules SET sort_order = ? WHERE id = ?").bind(Number(neighbor.sort_order || 0), currentRule.id),
    db.prepare("UPDATE rules SET sort_order = ? WHERE id = ?").bind(currentSortOrder, neighbor.id)
  ]);
  await appendLog(db, {
    classId,
    userId,
    actionType: "\u89C4\u5219\u4FEE\u6539",
    detail: `\u8C03\u6574\u89C4\u5219\u987A\u5E8F\uFF1A${currentRule.name}${direction === "up" ? " \u4E0A\u79FB" : " \u4E0B\u79FB"}`
  });
  return json({
    rules: await getRulesByClassId(db, classId, userId),
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleMoveRule, "handleMoveRule");
async function handleImportRules(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const sourceClassId = parseId(body.sourceClassId);
  const mode = body.mode === "replace" ? "replace" : "append";
  if (!userId || !sourceClassId || !classId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u89C4\u5219\u5BFC\u5165\u4E0A\u4E0B\u6587");
  }
  if (sourceClassId === classId) {
    return error("\u4E0D\u80FD\u4ECE\u5F53\u524D\u73ED\u7EA7\u5BFC\u5165\u81EA\u8EAB\u89C4\u5219");
  }
  await assertClassOwnership(db, userId, classId);
  const sourceClass = await assertClassOwnership(db, userId, sourceClassId);
  const sourceRulesResult = await db.prepare(
    `SELECT id, name, icon, exp, coins, type, sort_order
       FROM rules
       WHERE class_id = ?
         AND (owner_user_id = ? OR owner_user_id IS NULL)
       ORDER BY type ASC, sort_order ASC, id ASC`
  ).bind(sourceClassId, userId).all();
  const sourceRules = sourceRulesResult.results || [];
  if (sourceRules.length === 0) {
    return error("\u6765\u6E90\u73ED\u7EA7\u8FD8\u6CA1\u6709\u53EF\u5BFC\u5165\u7684\u81EA\u5B9A\u4E49\u89C4\u5219");
  }
  const statements = [];
  if (mode === "replace") {
    statements.push(
      db.prepare("DELETE FROM rules WHERE class_id = ? AND (owner_user_id = ? OR owner_user_id IS NULL)").bind(classId, userId)
    );
  }
  const targetRulesResult = await db.prepare(
    `SELECT type, COALESCE(MAX(sort_order), 0) AS max_order
       FROM rules
       WHERE class_id = ?
         AND (owner_user_id = ? OR owner_user_id IS NULL)
       GROUP BY type`
  ).bind(classId, userId).all();
  const orderMap = Object.fromEntries(
    (targetRulesResult.results || []).map((row) => [row.type || "positive", Number(row.max_order || 0)])
  );
  if (mode === "replace") {
    orderMap.positive = 0;
    orderMap.negative = 0;
  }
  sourceRules.forEach((rule) => {
    const type = rule.type === "negative" ? "negative" : "positive";
    orderMap[type] = Number(orderMap[type] || 0) + 1;
    statements.push(
      db.prepare("INSERT INTO rules (class_id, owner_user_id, sort_order, name, icon, exp, coins, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(classId, userId, orderMap[type], rule.name, rule.icon || "\u2B50", Number(rule.exp || 0), Number(rule.coins || 0), type)
    );
  });
  await db.batch(statements);
  await appendLog(db, {
    classId,
    userId,
    actionType: "\u89C4\u5219\u4FEE\u6539",
    detail: `${mode === "replace" ? "\u8986\u76D6\u5BFC\u5165" : "\u8FFD\u52A0\u5BFC\u5165"}\u4E86\u73ED\u7EA7 ${sourceClass.name} \u7684 ${sourceRules.length} \u6761\u89C4\u5219`
  });
  return json({
    rules: await getRulesByClassId(db, classId, userId),
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleImportRules, "handleImportRules");
async function handleUpdateThresholds(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const thresholds = Array.isArray(body.thresholds) ? body.thresholds.map((value) => Number(value)) : [];
  const petConditionConfig = normalizePetConditionConfig(body.petConditionConfig);
  if (!userId || thresholds.length !== DEFAULT_LEVEL_THRESHOLDS.length) {
    return error("\u7B49\u7EA7\u9608\u503C\u683C\u5F0F\u4E0D\u6B63\u786E");
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
    return error("\u7B49\u7EA7\u9608\u503C\u9700\u8981\u4FDD\u6301\u9012\u589E\uFF0C\u4E14\u5FC5\u987B\u5927\u4E8E 0");
  }
  await assertClassOwnership(db, userId, classId);
  await ensureClassSettings(db, classId);
  await db.prepare(
    `INSERT INTO class_settings (class_id, level_thresholds, pet_condition_config, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(class_id) DO UPDATE SET
         level_thresholds = excluded.level_thresholds,
         pet_condition_config = excluded.pet_condition_config,
         updated_at = CURRENT_TIMESTAMP`
  ).bind(classId, JSON.stringify(thresholds), JSON.stringify(petConditionConfig)).run();
  await appendLog(db, {
    classId,
    userId,
    actionType: "\u89C4\u5219\u4FEE\u6539",
    detail: `\u66F4\u65B0\u4E86\u7B49\u7EA7\u9608\u503C\uFF1A${thresholds.join(" / ")}\uFF1B\u5BA0\u7269\u8870\u51CF\uFF1A${petConditionConfig.enabled ? "\u5F00\u542F" : "\u5173\u95ED"}\uFF1B\u72B6\u6001\u9608\u503C\uFF1A${petConditionConfig.hungry_days}/${petConditionConfig.weak_days}/${petConditionConfig.sleeping_days} \u5929\uFF1B\u65E5\u8870\u51CF\uFF1A${petConditionConfig.hungry_decay}/${petConditionConfig.weak_decay}/${petConditionConfig.sleeping_decay} EXP\uFF1B\u8DF3\u8FC7\u5468\u672B\uFF1A${petConditionConfig.skip_weekends ? "\u662F" : "\u5426"}\uFF1B\u5047\u671F\u4FDD\u62A4\uFF1A${petConditionConfig.pause_start_date && petConditionConfig.pause_end_date ? `${petConditionConfig.pause_start_date} ~ ${petConditionConfig.pause_end_date}` : "\u672A\u8BBE\u7F6E"}`
  });
  return json({
    levelThresholds: await getThresholdsByClassId(db, classId),
    petConditionConfig: await getPetConditionConfigByClassId(db, classId),
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleUpdateThresholds, "handleUpdateThresholds");
async function handleUpdateSmartSeatingConfig(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const config = body.config;
  if (!userId || !config || typeof config !== "object") {
    return error("\u6392\u5EA7\u65B9\u6848\u683C\u5F0F\u4E0D\u6B63\u786E");
  }
  const layoutStr = String(config.layoutStr || "").trim() || "2-4-2";
  const rows = Math.max(1, Math.min(30, Number(config.rows) || 1));
  const viewMode = config.viewMode === "teacher" ? "teacher" : "student";
  const lockedIndices = Array.isArray(config.lockedIndices) ? [...new Set(config.lockedIndices.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 0))] : [];
  const seatMap = Array.isArray(config.seatMap) ? config.seatMap.slice(0, 240).map((seat, index) => {
    if (!seat || typeof seat !== "object") {
      return null;
    }
    const name = String(seat.name || "").trim();
    if (!name) {
      return null;
    }
    return {
      id: seat.id || `saved-seat-${index}`,
      name,
      gender: seat.gender === "\u5973" ? "\u5973" : "\u7537",
      height: Number.isFinite(Number(seat.height)) ? Number(seat.height) : 0,
      vision: String(seat.vision || ""),
      score: Number.isFinite(Number(seat.score)) ? Number(seat.score) : 0
    };
  }) : [];
  await assertClassOwnership(db, userId, classId);
  await ensureClassSettings(db, classId);
  const payload = {
    layoutStr,
    rows,
    viewMode,
    lockedIndices,
    seatMap,
    saved_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  await db.prepare(
    `INSERT INTO class_settings (class_id, level_thresholds, pet_condition_config, smart_seating_config, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(class_id) DO UPDATE SET smart_seating_config = excluded.smart_seating_config, updated_at = CURRENT_TIMESTAMP`
  ).bind(classId, JSON.stringify(DEFAULT_LEVEL_THRESHOLDS), JSON.stringify(DEFAULT_PET_CONDITION_CONFIG), JSON.stringify(payload)).run();
  await appendLog(db, {
    classId,
    userId,
    actionType: "\u767E\u5B9D\u7BB1",
    detail: `\u4FDD\u5B58\u4E86\u667A\u80FD\u6392\u5EA7\u65B9\u6848\uFF08${rows} \u884C\uFF0C${seatMap.filter(Boolean).length} \u540D\u5B66\u751F\uFF09`
  });
  return json({
    smartSeatingConfig: await getSmartSeatingConfigByClassId(db, classId),
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleUpdateSmartSeatingConfig, "handleUpdateSmartSeatingConfig");
async function handleResetClassProgress(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u6559\u5E08\u8EAB\u4EFD");
  }
  await assertClassOwnership(db, userId, classId);
  const result = await db.prepare(`SELECT ${STUDENT_SELECT_FIELDS} FROM students WHERE class_id = ?`).bind(classId).all();
  const students = (result.results || []).map(normalizeStudent);
  if (students.length === 0) {
    return error("\u5F53\u524D\u73ED\u7EA7\u8FD8\u6CA1\u6709\u5B66\u751F\uFF0C\u65E0\u6CD5\u6267\u884C\u91CD\u7F6E");
  }
  const statements = students.map(
    (student) => db.prepare(
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
         WHERE id = ?`
    ).bind(student.id)
  );
  await db.batch(statements);
  await appendLog(db, {
    classId,
    userId,
    actionType: "\u73ED\u7EA7\u91CD\u7F6E",
    detail: `\u6267\u884C\u4E86\u5168\u73ED\u65B0\u5B66\u671F\u91CD\u7F6E\uFF0C\u4FDD\u7559 ${students.length} \u540D\u5B66\u751F\u540D\u518C\u5E76\u6E05\u7A7A\u5F53\u524D\u5BA0\u7269\u8FDB\u5EA6`
  });
  return json({
    students: await getStudentsByClassId(db, classId, userId),
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleResetClassProgress, "handleResetClassProgress");
async function handleArchiveClassStudents(db, request, classId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u6559\u5E08\u8EAB\u4EFD");
  }
  await assertClassOwnership(db, userId, classId);
  const countRow = await db.prepare("SELECT COUNT(*) AS count FROM students WHERE class_id = ?").bind(classId).first();
  const studentCount = Number(countRow?.count || 0);
  if (studentCount === 0) {
    return error("\u5F53\u524D\u73ED\u7EA7\u6CA1\u6709\u53EF\u5F52\u6863\u7684\u5B66\u751F");
  }
  await db.prepare("DELETE FROM students WHERE class_id = ?").bind(classId).run();
  await appendLog(db, {
    classId,
    userId,
    actionType: "\u6BD5\u4E1A\u5F52\u6863",
    detail: `\u4E00\u952E\u5F52\u6863\u5E76\u79FB\u9664\u4E86\u5F53\u524D\u73ED\u7EA7\u7684 ${studentCount} \u540D\u5B66\u751F`
  });
  return json({
    students: [],
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleArchiveClassStudents, "handleArchiveClassStudents");
async function handleUndoLog(db, request, logId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const classId = parseId(body.classId);
  if (!userId || !classId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u64A4\u9500\u4E0A\u4E0B\u6587");
  }
  await assertClassOwnership(db, userId, classId);
  const targetLog = await getRawLogById(db, classId, logId);
  if (!targetLog) {
    return error("\u672A\u627E\u5230\u5BF9\u5E94\u65E5\u5FD7");
  }
  const meta = parseLogMeta(targetLog.meta);
  if (!meta?.undoable || meta?.undone) {
    return error("\u8BE5\u64CD\u4F5C\u5F53\u524D\u4E0D\u53EF\u64A4\u9500");
  }
  const latestUndoableLog = await getLatestUndoableLog(db, classId);
  if (!latestUndoableLog || Number(latestUndoableLog.id) !== logId) {
    return error("\u4EC5\u652F\u6301\u64A4\u9500\u6700\u8FD1\u4E00\u6B21\u53EF\u56DE\u6EDA\u64CD\u4F5C");
  }
  if (meta.kind === "student-update") {
    const snapshot = meta.before;
    if (!snapshot?.id) {
      return error("\u7F3A\u5C11\u5B66\u751F\u56DE\u6EDA\u5FEB\u7167");
    }
    await db.prepare(
      `UPDATE students
         SET name = ?, pet_status = ?, pet_condition = ?, last_fed_at = ?, last_decay_at = ?, pet_condition_locked_at = ?, pet_name = ?, pet_type_id = ?, pet_level = ?, pet_points = ?, coins = ?, total_exp = ?, total_coins = ?, reward_count = ?, pet_collection = ?
         WHERE id = ? AND class_id = ?`
    ).bind(
      snapshot.name,
      snapshot.pet_status,
      snapshot.pet_condition || "healthy",
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
      classId
    ).run();
  } else if (meta.kind === "shop-redeem") {
    const studentStatements = (meta.studentsBefore || []).map((student) => {
      if (meta.item?.item_type === "exp_pack") {
        return db.prepare(
          `UPDATE students
             SET coins = ?, total_exp = ?, pet_points = ?, pet_level = ?, last_fed_at = ?, last_decay_at = ?, pet_condition = ?, pet_condition_locked_at = ?, pet_collection = ?
             WHERE id = ? AND class_id = ?`
        ).bind(
          student.coins,
          student.total_exp || 0,
          student.pet_points || 0,
          student.pet_level || 0,
          student.last_fed_at || null,
          student.last_decay_at || null,
          student.pet_condition || "healthy",
          student.pet_condition_locked_at || null,
          JSON.stringify(student.pet_collection || []),
          student.id,
          classId
        );
      }
      return db.prepare("UPDATE students SET coins = ? WHERE id = ? AND class_id = ?").bind(student.coins, student.id, classId);
    });
    if (studentStatements.length === 0 || !meta.item?.id) {
      return error("\u7F3A\u5C11\u5546\u54C1\u5151\u6362\u56DE\u6EDA\u5FEB\u7167");
    }
    studentStatements.push(
      db.prepare("UPDATE shop_items SET stock = ? WHERE id = ? AND class_id = ?").bind(meta.item.stockBefore, meta.item.id, classId)
    );
    await db.batch(studentStatements);
  } else {
    return error("\u5F53\u524D\u4EC5\u652F\u6301\u64A4\u9500\u4E92\u52A8\u548C\u5546\u54C1\u5151\u6362\u64CD\u4F5C");
  }
  const nextMeta = {
    ...meta,
    undone: true,
    undone_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  await db.prepare("UPDATE logs SET meta = ? WHERE id = ?").bind(JSON.stringify(nextMeta), logId).run();
  await appendLog(db, {
    classId,
    userId,
    actionType: "\u64CD\u4F5C\u64A4\u9500",
    detail: `\u64A4\u9500\u4E86\u300C${targetLog.action_type}\u300D\uFF1A${targetLog.detail}`
  });
  return json({
    students: await getStudentsByClassId(db, classId, userId),
    shopItems: await getShopItemsByClassId(db, classId),
    logs: await getLogsByClassId(db, classId)
  });
}
__name(handleUndoLog, "handleUndoLog");
async function handleListActivationCodes(db, request) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get("userId"));
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u6559\u5E08\u8EAB\u4EFD");
  }
  await assertSuperAdmin(db, userId);
  await ensureActivationCodes(db);
  const result = await db.prepare(
    `SELECT ac.id, ac.code, ac.level, ac.expires_in_days, ac.max_uses, ac.used_count, ac.status,
              ac.used_by_user_id, ac.used_at, ac.created_by_user_id,
              used_user.nickname AS used_by_nickname,
              created_user.nickname AS created_by_nickname
       FROM activation_codes ac
       LEFT JOIN users used_user ON used_user.id = ac.used_by_user_id
       LEFT JOIN users created_user ON created_user.id = ac.created_by_user_id
       ORDER BY ac.created_at DESC, ac.id DESC`
  ).all();
  return json({
    activationCodes: (result.results || []).map(normalizeActivationCode)
  });
}
__name(handleListActivationCodes, "handleListActivationCodes");
async function handleListAdminUsers(db, request) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get("userId"));
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u6559\u5E08\u8EAB\u4EFD");
  }
  await assertSuperAdmin(db, userId);
  const result = await db.prepare(
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
       ORDER BY u.created_at DESC, u.id DESC`
  ).all();
  return json({
    users: (result.results || []).map((row) => ({
      ...normalizeUser(row),
      created_at: row.created_at
    }))
  });
}
__name(handleListAdminUsers, "handleListAdminUsers");
async function handleListAdminLogs(db, request) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get("userId"));
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u6559\u5E08\u8EAB\u4EFD");
  }
  await assertSuperAdmin(db, userId);
  return json({
    logs: await getAdminLogs(db)
  });
}
__name(handleListAdminLogs, "handleListAdminLogs");
async function handleGetPublicFreeRegisterFlag(db) {
  const flag = await getFreeRegisterFlag(db);
  return json({
    freeRegister: {
      enabled: flag.enabled,
      is_active: flag.is_active,
      mode: flag.mode,
      end_at: flag.end_at,
      default_level: flag.value.default_level,
      updated_at: flag.updated_at
    }
  });
}
__name(handleGetPublicFreeRegisterFlag, "handleGetPublicFreeRegisterFlag");
async function handleGetPublicRegistrationChannel(db, request) {
  const url = new URL(request.url);
  const code = sanitizeChannelCode(url.searchParams.get("code"));
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
      note: channel.note
    }
  });
}
__name(handleGetPublicRegistrationChannel, "handleGetPublicRegistrationChannel");
async function handleListRegistrationChannels(db, request) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get("userId"));
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u6559\u5E08\u8EAB\u4EFD");
  }
  await assertSuperAdmin(db, userId);
  return json({
    channels: await listRegistrationChannels(db)
  });
}
__name(handleListRegistrationChannels, "handleListRegistrationChannels");
async function handleCreateRegistrationChannel(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u8D85\u7BA1\u8EAB\u4EFD");
  }
  await assertSuperAdmin(db, userId);
  const code = sanitizeChannelCode(body.code);
  const name = String(body.name || "").trim();
  const enabled = body.enabled === void 0 ? true : Boolean(body.enabled);
  const requireActivation = body.require_activation === void 0 ? true : Boolean(body.require_activation);
  const defaultLevel = sanitizeFreeRegisterLevel(body.default_level);
  const note = String(body.note || "").trim();
  const endAt = body.end_at ? String(body.end_at).trim() : null;
  if (!code || !name) {
    return error("\u8BF7\u586B\u5199\u6E20\u9053\u540D\u79F0\u548C\u6E20\u9053\u6807\u8BC6");
  }
  if (endAt) {
    const timestamp = new Date(endAt).getTime();
    if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
      return error("\u6E20\u9053\u622A\u6B62\u65F6\u95F4\u9700\u8981\u665A\u4E8E\u5F53\u524D\u65F6\u95F4");
    }
  }
  const exists = await db.prepare("SELECT id FROM registration_channels WHERE code = ?").bind(code).first();
  if (exists) {
    return error("\u6E20\u9053\u6807\u8BC6\u5DF2\u5B58\u5728\uFF0C\u8BF7\u66F4\u6362");
  }
  await db.prepare(
    `INSERT INTO registration_channels (code, name, enabled, require_activation, default_level, end_at, note, updated_by_user_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(code, name, enabled ? 1 : 0, requireActivation ? 1 : 0, defaultLevel, endAt, note || null, userId).run();
  await appendAdminLog(db, {
    userId,
    actionType: "\u7CFB\u7EDF\u914D\u7F6E",
    detail: `\u65B0\u589E\u6CE8\u518C\u6E20\u9053\uFF1A${code}\uFF08${name}\uFF09\uFF0C${requireActivation ? "\u9700\u8981\u6FC0\u6D3B\u7801" : "\u514D\u6FC0\u6D3B"}\uFF0C\u9ED8\u8BA4\u7B49\u7EA7 ${defaultLevel}`
  });
  return json({
    channels: await listRegistrationChannels(db)
  });
}
__name(handleCreateRegistrationChannel, "handleCreateRegistrationChannel");
async function handleUpdateRegistrationChannel(db, request, channelId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u8D85\u7BA1\u8EAB\u4EFD");
  }
  await assertSuperAdmin(db, userId);
  const existing = await db.prepare(
    `SELECT id, code, name, enabled, require_activation, default_level, end_at, note
       FROM registration_channels
       WHERE id = ?`
  ).bind(channelId).first();
  if (!existing) {
    return error("\u76EE\u6807\u6E20\u9053\u4E0D\u5B58\u5728", 404);
  }
  const nextCode = sanitizeChannelCode(body.code ?? existing.code);
  const nextName = String(body.name ?? existing.name).trim();
  const nextEnabled = body.enabled === void 0 ? Boolean(existing.enabled) : Boolean(body.enabled);
  const nextRequireActivation = body.require_activation === void 0 ? Boolean(existing.require_activation) : Boolean(body.require_activation);
  const nextDefaultLevel = sanitizeFreeRegisterLevel(body.default_level ?? existing.default_level);
  const nextNote = String(body.note ?? existing.note ?? "").trim();
  const nextEndAt = body.end_at === "" ? null : body.end_at === void 0 ? existing.end_at : String(body.end_at).trim();
  if (!nextCode || !nextName) {
    return error("\u8BF7\u586B\u5199\u6E20\u9053\u540D\u79F0\u548C\u6E20\u9053\u6807\u8BC6");
  }
  if (nextEndAt) {
    const timestamp = new Date(nextEndAt).getTime();
    if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
      return error("\u6E20\u9053\u622A\u6B62\u65F6\u95F4\u9700\u8981\u665A\u4E8E\u5F53\u524D\u65F6\u95F4");
    }
  }
  const duplicate = await db.prepare("SELECT id FROM registration_channels WHERE code = ? AND id != ?").bind(nextCode, channelId).first();
  if (duplicate) {
    return error("\u6E20\u9053\u6807\u8BC6\u5DF2\u5B58\u5728\uFF0C\u8BF7\u66F4\u6362");
  }
  await db.prepare(
    `UPDATE registration_channels
       SET code = ?, name = ?, enabled = ?, require_activation = ?, default_level = ?, end_at = ?, note = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
  ).bind(
    nextCode,
    nextName,
    nextEnabled ? 1 : 0,
    nextRequireActivation ? 1 : 0,
    nextDefaultLevel,
    nextEndAt,
    nextNote || null,
    userId,
    channelId
  ).run();
  await appendAdminLog(db, {
    userId,
    actionType: "\u7CFB\u7EDF\u914D\u7F6E",
    detail: `\u66F4\u65B0\u6CE8\u518C\u6E20\u9053\uFF1A${existing.code} -> ${nextCode}\uFF0C${nextRequireActivation ? "\u9700\u8981\u6FC0\u6D3B\u7801" : "\u514D\u6FC0\u6D3B"}\uFF0C\u9ED8\u8BA4\u7B49\u7EA7 ${nextDefaultLevel}`
  });
  return json({
    channels: await listRegistrationChannels(db)
  });
}
__name(handleUpdateRegistrationChannel, "handleUpdateRegistrationChannel");
async function handleUpdateFreeRegisterFlag(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u8D85\u7BA1\u8EAB\u4EFD");
  }
  await assertSuperAdmin(db, userId);
  const enabled = Boolean(body.enabled);
  const mode = sanitizeFreeRegisterMode(body.mode);
  const defaultLevel = sanitizeFreeRegisterLevel(body.default_level);
  const rawEndAt = body.end_at ? String(body.end_at).trim() : "";
  const endAt = mode === "until" ? rawEndAt : null;
  if (mode === "until") {
    const timestamp = new Date(endAt).getTime();
    if (!endAt || !Number.isFinite(timestamp) || timestamp <= Date.now()) {
      return error("\u8BF7\u8BBE\u7F6E\u4E00\u4E2A\u665A\u4E8E\u5F53\u524D\u65F6\u95F4\u7684\u622A\u6B62\u65F6\u95F4");
    }
  }
  await ensureSystemFlags(db);
  await db.prepare(
    `UPDATE system_flags
       SET enabled = ?, mode = ?, end_at = ?, value_json = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE key = 'free_register'`
  ).bind(
    enabled ? 1 : 0,
    mode,
    endAt,
    JSON.stringify({ default_level: defaultLevel }),
    userId
  ).run();
  await appendAdminLog(db, {
    userId,
    actionType: "\u7CFB\u7EDF\u914D\u7F6E",
    detail: `\u66F4\u65B0\u514D\u6FC0\u6D3B\u6CE8\u518C\uFF1A${enabled ? "\u5F00\u542F" : "\u5173\u95ED"}\uFF0C${mode === "until" ? "\u622A\u6B62\u65F6\u95F4\u6A21\u5F0F" : "\u6C38\u4E45\u751F\u6548"}\uFF0C\u9ED8\u8BA4\u7B49\u7EA7 ${defaultLevel}${endAt ? `\uFF0C\u622A\u6B62 ${endAt}` : ""}`
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
      updated_by_user_id: flag.updated_by_user_id
    }
  });
}
__name(handleUpdateFreeRegisterFlag, "handleUpdateFreeRegisterFlag");
async function handleUpdateToolboxAccessFlag(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const rawConfig = body.config;
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u8D85\u7BA1\u8EAB\u4EFD");
  }
  if (!rawConfig || typeof rawConfig !== "object") {
    return error("\u767E\u5B9D\u7BB1\u6743\u9650\u914D\u7F6E\u683C\u5F0F\u4E0D\u6B63\u786E");
  }
  await assertSuperAdmin(db, userId);
  await ensureSystemFlags(db);
  const nextConfig = { ...DEFAULT_TOOLBOX_ACCESS };
  Object.keys(DEFAULT_TOOLBOX_ACCESS).forEach((toolId) => {
    nextConfig[toolId] = sanitizeToolboxLevel(rawConfig[toolId]);
  });
  await db.prepare(
    `UPDATE system_flags
       SET enabled = 1, mode = 'permanent', end_at = NULL, value_json = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE key = 'toolbox_access'`
  ).bind(JSON.stringify(nextConfig), userId).run();
  await appendAdminLog(db, {
    userId,
    actionType: "\u7CFB\u7EDF\u914D\u7F6E",
    detail: `\u66F4\u65B0\u767E\u5B9D\u7BB1\u6743\u9650\uFF1A${Object.entries(nextConfig).map(([toolId, level]) => `${toolId}=${level}`).join("\uFF0C")}`
  });
  const flag = await getToolboxAccessFlag(db);
  return json({
    toolboxAccess: flag.value,
    updated_at: flag.updated_at,
    updated_by_user_id: flag.updated_by_user_id
  });
}
__name(handleUpdateToolboxAccessFlag, "handleUpdateToolboxAccessFlag");
async function handleUpdateAdminUser(db, request, targetUserId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const updates = body.updates && typeof body.updates === "object" ? body.updates : {};
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u6559\u5E08\u8EAB\u4EFD");
  }
  await assertSuperAdmin(db, userId);
  const targetUser = await db.prepare(
    `SELECT id, username, nickname, level, expire_at, role, status, register_source, source_note
       FROM users
       WHERE id = ?`
  ).bind(targetUserId).first();
  if (!targetUser) {
    return error("\u76EE\u6807\u8D26\u53F7\u4E0D\u5B58\u5728", 404);
  }
  const nextNickname = String(updates.nickname ?? targetUser.nickname).trim();
  const nextLevel = ["temporary", "vip1", "vip2", "permanent"].includes(updates.level) ? updates.level : targetUser.level;
  const nextRole = ["teacher", "super_admin"].includes(updates.role) ? updates.role : targetUser.role;
  const nextStatus = ["active", "disabled"].includes(updates.status) ? updates.status : targetUser.status;
  const nextExpireAt = updates.expire_at === "" ? null : updates.expire_at ?? targetUser.expire_at;
  if (!nextNickname) {
    return error("\u6635\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
  }
  await db.prepare("UPDATE users SET nickname = ?, level = ?, expire_at = ?, role = ?, status = ? WHERE id = ?").bind(nextNickname, nextLevel, nextExpireAt, nextRole, nextStatus, targetUserId).run();
  await appendAdminLog(db, {
    userId,
    actionType: "\u8D26\u53F7\u7BA1\u7406",
    detail: `\u66F4\u65B0\u8D26\u53F7 ${targetUser.username}\uFF1A\u7B49\u7EA7 ${targetUser.level} -> ${nextLevel}\uFF0C\u89D2\u8272 ${targetUser.role} -> ${nextRole}\uFF0C\u72B6\u6001 ${targetUser.status} -> ${nextStatus}`
  });
  return json({ success: true });
}
__name(handleUpdateAdminUser, "handleUpdateAdminUser");
async function handleBatchUpdateAdminUsers(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const userIds = Array.isArray(body.userIds) ? Array.from(new Set(body.userIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))) : [];
  const updates = body.updates && typeof body.updates === "object" ? body.updates : {};
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u6559\u5E08\u8EAB\u4EFD");
  }
  if (userIds.length === 0) {
    return error("\u8BF7\u81F3\u5C11\u9009\u62E9\u4E00\u4E2A\u8D26\u53F7");
  }
  await assertSuperAdmin(db, userId);
  const placeholders = userIds.map(() => "?").join(", ");
  const result = await db.prepare(
    `SELECT id, username, nickname, level, expire_at, role, status, register_source, source_note
       FROM users
       WHERE id IN (${placeholders})`
  ).bind(...userIds).all();
  const targetUsers = result.results || [];
  if (targetUsers.length !== userIds.length) {
    return error("\u90E8\u5206\u8D26\u53F7\u4E0D\u5B58\u5728");
  }
  const statements = [];
  const changedFields = [];
  for (const targetUser of targetUsers) {
    const nextLevel = ["temporary", "vip1", "vip2", "permanent"].includes(updates.level) ? updates.level : targetUser.level;
    const nextRole = ["teacher", "super_admin"].includes(updates.role) ? updates.role : targetUser.role;
    const nextStatus = ["active", "disabled"].includes(updates.status) ? updates.status : targetUser.status;
    const nextExpireAt = updates.expire_at === "" ? null : updates.expire_at ?? targetUser.expire_at;
    statements.push(
      db.prepare("UPDATE users SET nickname = ?, level = ?, expire_at = ?, role = ?, status = ? WHERE id = ?").bind(targetUser.nickname, nextLevel, nextExpireAt, nextRole, nextStatus, targetUser.id)
    );
  }
  if (Object.prototype.hasOwnProperty.call(updates, "level")) {
    changedFields.push(`\u7B49\u7EA7 -> ${updates.level}`);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "role")) {
    changedFields.push(`\u89D2\u8272 -> ${updates.role}`);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "status")) {
    changedFields.push(`\u72B6\u6001 -> ${updates.status}`);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "expire_at")) {
    changedFields.push(`\u6709\u6548\u671F -> ${updates.expire_at || "\u957F\u671F\u6709\u6548"}`);
  }
  await db.batch(statements);
  await appendAdminLog(db, {
    userId,
    actionType: "\u8D26\u53F7\u7BA1\u7406",
    detail: `\u6279\u91CF\u66F4\u65B0 ${targetUsers.length} \u4E2A\u8D26\u53F7\uFF08${targetUsers.slice(0, 8).map((item) => item.username).join("\u3001")}${targetUsers.length > 8 ? " \u7B49" : ""}\uFF09\uFF1A${changedFields.join("\uFF0C") || "\u57FA\u7840\u4FE1\u606F\u8C03\u6574"}`
  });
  return json({ success: true });
}
__name(handleBatchUpdateAdminUsers, "handleBatchUpdateAdminUsers");
async function handleResetAdminUserPassword(db, request, targetUserId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const nextPassword = String(body.nextPassword || "");
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u6559\u5E08\u8EAB\u4EFD");
  }
  if (!validatePassword(nextPassword)) {
    return error("\u65B0\u5BC6\u7801\u81F3\u5C11\u9700\u8981 6 \u4F4D");
  }
  await assertSuperAdmin(db, userId);
  const targetUser = await db.prepare("SELECT id FROM users WHERE id = ?").bind(targetUserId).first();
  if (!targetUser) {
    return error("\u76EE\u6807\u8D26\u53F7\u4E0D\u5B58\u5728", 404);
  }
  await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(await hashPassword(nextPassword), targetUserId).run();
  await appendAdminLog(db, {
    userId,
    actionType: "\u8D26\u53F7\u7BA1\u7406",
    detail: `\u91CD\u7F6E\u4E86\u8D26\u53F7 #${targetUserId} \u7684\u767B\u5F55\u5BC6\u7801`
  });
  return json({ success: true });
}
__name(handleResetAdminUserPassword, "handleResetAdminUserPassword");
async function handleCreateActivationCode(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u6559\u5E08\u8EAB\u4EFD");
  }
  await assertSuperAdmin(db, userId);
  const rawCode = String(body.code || "").trim().toUpperCase();
  const prefix = String(body.prefix || "CLASS").trim().toUpperCase();
  const code = rawCode || generateActivationCode(prefix);
  const level = ["vip1", "vip2", "permanent"].includes(body.level) ? body.level : "vip1";
  const expiresInDays = body.expires_in_days === "" || body.expires_in_days === null || body.expires_in_days === void 0 ? null : Math.max(1, Number(body.expires_in_days || 0));
  const maxUses = Math.max(1, Number(body.max_uses || 1));
  if (!/^[A-Z0-9-]{6,40}$/.test(code)) {
    return error("\u6FC0\u6D3B\u7801\u9700\u4E3A 6-40 \u4F4D\u5927\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u6216\u4E2D\u5212\u7EBF");
  }
  const existing = await db.prepare("SELECT id FROM activation_codes WHERE code = ?").bind(code).first();
  if (existing) {
    return error("\u6FC0\u6D3B\u7801\u5DF2\u5B58\u5728\uFF0C\u8BF7\u66F4\u6362\u540E\u518D\u8BD5");
  }
  await db.prepare(
    `INSERT INTO activation_codes
       (code, level, expires_in_days, max_uses, used_count, status, created_by_user_id)
       VALUES (?, ?, ?, ?, 0, 'active', ?)`
  ).bind(code, level, expiresInDays, maxUses, userId).run();
  await appendAdminLog(db, {
    userId,
    actionType: "\u6FC0\u6D3B\u7801\u7BA1\u7406",
    detail: `\u521B\u5EFA\u6FC0\u6D3B\u7801 ${code}\uFF0C\u7B49\u7EA7 ${level}\uFF0C\u53EF\u7528 ${maxUses} \u6B21`
  });
  return json({ success: true });
}
__name(handleCreateActivationCode, "handleCreateActivationCode");
async function handleBatchCreateActivationCodes(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u6559\u5E08\u8EAB\u4EFD");
  }
  await assertSuperAdmin(db, userId);
  const prefix = String(body.prefix || "CLASS").trim().toUpperCase();
  const level = ["vip1", "vip2", "permanent"].includes(body.level) ? body.level : "vip1";
  const expiresInDays = body.expires_in_days === "" || body.expires_in_days === null || body.expires_in_days === void 0 ? null : Math.max(1, Number(body.expires_in_days || 0));
  const maxUses = Math.max(1, Number(body.max_uses || 1));
  const count = Math.max(1, Math.min(100, Number(body.count || 1)));
  const statements = [];
  const createdCodes = [];
  for (let index = 0; index < count; index += 1) {
    let code = generateActivationCode(prefix);
    while (createdCodes.includes(code)) {
      code = generateActivationCode(prefix);
    }
    createdCodes.push(code);
    statements.push(
      db.prepare(
        `INSERT INTO activation_codes
           (code, level, expires_in_days, max_uses, used_count, status, created_by_user_id)
           VALUES (?, ?, ?, ?, 0, 'active', ?)`
      ).bind(code, level, expiresInDays, maxUses, userId)
    );
  }
  await db.batch(statements);
  await appendAdminLog(db, {
    userId,
    actionType: "\u6FC0\u6D3B\u7801\u7BA1\u7406",
    detail: `\u6279\u91CF\u751F\u6210\u4E86 ${createdCodes.length} \u4E2A ${level} \u6FC0\u6D3B\u7801\uFF0C\u524D\u7F00 ${prefix || "CLASS"}`
  });
  return json({
    success: true,
    createdCodes
  });
}
__name(handleBatchCreateActivationCodes, "handleBatchCreateActivationCodes");
async function handleUpdateActivationCode(db, request, codeId) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const updates = body.updates && typeof body.updates === "object" ? body.updates : {};
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u6559\u5E08\u8EAB\u4EFD");
  }
  await assertSuperAdmin(db, userId);
  const existing = await db.prepare(
    `SELECT id, code, level, expires_in_days, max_uses, used_count, status
       FROM activation_codes
       WHERE id = ?`
  ).bind(codeId).first();
  if (!existing) {
    return error("\u6FC0\u6D3B\u7801\u4E0D\u5B58\u5728", 404);
  }
  const nextLevel = ["vip1", "vip2", "permanent"].includes(updates.level) ? updates.level : existing.level;
  const nextStatus = sanitizeCodeStatus(updates.status ?? existing.status);
  const nextExpiresInDays = updates.expires_in_days === "" ? null : updates.expires_in_days ?? existing.expires_in_days;
  const nextMaxUses = Math.max(
    Number(existing.used_count || 0),
    Math.max(1, Number(updates.max_uses ?? existing.max_uses ?? 1))
  );
  await db.prepare(
    `UPDATE activation_codes
       SET level = ?, expires_in_days = ?, max_uses = ?, status = ?
       WHERE id = ?`
  ).bind(nextLevel, nextExpiresInDays, nextMaxUses, nextStatus, codeId).run();
  await appendAdminLog(db, {
    userId,
    actionType: "\u6FC0\u6D3B\u7801\u7BA1\u7406",
    detail: `\u66F4\u65B0\u6FC0\u6D3B\u7801 ${existing.code}\uFF1A\u7B49\u7EA7 ${existing.level} -> ${nextLevel}\uFF0C\u72B6\u6001 ${existing.status} -> ${nextStatus}`
  });
  return json({ success: true });
}
__name(handleUpdateActivationCode, "handleUpdateActivationCode");
async function handleBatchUpdateActivationCodes(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const codeIds = Array.isArray(body.codeIds) ? Array.from(new Set(body.codeIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))) : [];
  const updates = body.updates && typeof body.updates === "object" ? body.updates : {};
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u6559\u5E08\u8EAB\u4EFD");
  }
  if (codeIds.length === 0) {
    return error("\u8BF7\u81F3\u5C11\u9009\u62E9\u4E00\u4E2A\u6FC0\u6D3B\u7801");
  }
  await assertSuperAdmin(db, userId);
  const placeholders = codeIds.map(() => "?").join(", ");
  const result = await db.prepare(
    `SELECT id, code, level, expires_in_days, max_uses, used_count, status
       FROM activation_codes
       WHERE id IN (${placeholders})`
  ).bind(...codeIds).all();
  const targetCodes = result.results || [];
  if (targetCodes.length !== codeIds.length) {
    return error("\u90E8\u5206\u6FC0\u6D3B\u7801\u4E0D\u5B58\u5728");
  }
  const statements = [];
  for (const existing of targetCodes) {
    const nextLevel = ["vip1", "vip2", "permanent"].includes(updates.level) ? updates.level : existing.level;
    const nextStatus = sanitizeCodeStatus(updates.status ?? existing.status);
    const nextExpiresInDays = updates.expires_in_days === "" ? null : updates.expires_in_days ?? existing.expires_in_days;
    const nextMaxUses = Math.max(
      Number(existing.used_count || 0),
      Math.max(1, Number(updates.max_uses ?? existing.max_uses ?? 1))
    );
    statements.push(
      db.prepare(
        `UPDATE activation_codes
           SET level = ?, expires_in_days = ?, max_uses = ?, status = ?
           WHERE id = ?`
      ).bind(nextLevel, nextExpiresInDays, nextMaxUses, nextStatus, existing.id)
    );
  }
  const changedFields = [];
  if (Object.prototype.hasOwnProperty.call(updates, "level")) {
    changedFields.push(`\u7B49\u7EA7 -> ${updates.level}`);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "status")) {
    changedFields.push(`\u72B6\u6001 -> ${updates.status}`);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "expires_in_days")) {
    changedFields.push(`\u6709\u6548\u5929\u6570 -> ${updates.expires_in_days || "\u957F\u671F\u6709\u6548"}`);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "max_uses")) {
    changedFields.push(`\u53EF\u7528\u6B21\u6570 -> ${updates.max_uses}`);
  }
  await db.batch(statements);
  await appendAdminLog(db, {
    userId,
    actionType: "\u6FC0\u6D3B\u7801\u7BA1\u7406",
    detail: `\u6279\u91CF\u66F4\u65B0 ${targetCodes.length} \u4E2A\u6FC0\u6D3B\u7801\uFF08${targetCodes.slice(0, 8).map((item) => item.code).join("\u3001")}${targetCodes.length > 8 ? " \u7B49" : ""}\uFF09\uFF1A${changedFields.join("\uFF0C") || "\u89C4\u5219\u8C03\u6574"}`
  });
  return json({ success: true });
}
__name(handleBatchUpdateActivationCodes, "handleBatchUpdateActivationCodes");
async function handleBatchRevokeActivationCodes(db, request) {
  const body = await readBody(request);
  const userId = parseId(body.userId);
  const codeIds = Array.isArray(body.codeIds) ? Array.from(new Set(body.codeIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))) : [];
  if (!userId) {
    return error("\u7F3A\u5C11\u6709\u6548\u7684\u6559\u5E08\u8EAB\u4EFD");
  }
  if (codeIds.length === 0) {
    return error("\u8BF7\u81F3\u5C11\u9009\u62E9\u4E00\u4E2A\u6FC0\u6D3B\u7801");
  }
  await assertSuperAdmin(db, userId);
  const placeholders = codeIds.map(() => "?").join(", ");
  const result = await db.prepare(
    `SELECT id, code, status
       FROM activation_codes
       WHERE id IN (${placeholders})`
  ).bind(...codeIds).all();
  const targetCodes = result.results || [];
  if (targetCodes.length !== codeIds.length) {
    return error("\u90E8\u5206\u6FC0\u6D3B\u7801\u4E0D\u5B58\u5728");
  }
  await db.prepare(`UPDATE activation_codes SET status = 'revoked' WHERE id IN (${placeholders})`).bind(...codeIds).run();
  await appendAdminLog(db, {
    userId,
    actionType: "\u6FC0\u6D3B\u7801\u7BA1\u7406",
    detail: `\u6279\u91CF\u4F5C\u5E9F\u4E86 ${targetCodes.length} \u4E2A\u6FC0\u6D3B\u7801\uFF1A${targetCodes.slice(0, 8).map((item) => item.code).join("\u3001")}${targetCodes.length > 8 ? " \u7B49" : ""}`
  });
  return json({ success: true });
}
__name(handleBatchRevokeActivationCodes, "handleBatchRevokeActivationCodes");
var src_server_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    const db = getDb(env);
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === "/api/auth/login" && request.method === "POST") {
        return await handleLogin(db, request);
      }
      if (path === "/api/auth/password" && request.method === "PUT") {
        return await handleUpdatePassword(db, request);
      }
      if (path === "/api/public/system-flags/free-register" && request.method === "GET") {
        return await handleGetPublicFreeRegisterFlag(db);
      }
      if (path === "/api/public/register-channel" && request.method === "GET") {
        return await handleGetPublicRegistrationChannel(db, request);
      }
      if (path === "/api/bootstrap" && request.method === "GET") {
        const userId = parseId(url.searchParams.get("userId"));
        const classId = parseId(url.searchParams.get("classId"));
        if (!userId) {
          return error("\u7F3A\u5C11\u6709\u6548\u7684\u6559\u5E08\u8EAB\u4EFD");
        }
        return json(await getBootstrapPayload(db, userId, classId));
      }
      if (path === "/api/activation-codes" && request.method === "GET") {
        return await handleListActivationCodes(db, request);
      }
      if (path === "/api/admin/users" && request.method === "GET") {
        return await handleListAdminUsers(db, request);
      }
      if (path === "/api/admin/users/batch-update" && request.method === "POST") {
        return await handleBatchUpdateAdminUsers(db, request);
      }
      if (path === "/api/admin/logs" && request.method === "GET") {
        return await handleListAdminLogs(db, request);
      }
      if (path === "/api/admin/register-channels" && request.method === "GET") {
        return await handleListRegistrationChannels(db, request);
      }
      if (path === "/api/admin/register-channels" && request.method === "POST") {
        return await handleCreateRegistrationChannel(db, request);
      }
      if (path === "/api/admin/system-flags/free-register" && request.method === "PUT") {
        return await handleUpdateFreeRegisterFlag(db, request);
      }
      if (path === "/api/admin/system-flags/toolbox-access" && request.method === "PUT") {
        return await handleUpdateToolboxAccessFlag(db, request);
      }
      const adminUserMatch = path.match(/^\/api\/admin\/users\/(\d+)$/);
      if (adminUserMatch && request.method === "PATCH") {
        return await handleUpdateAdminUser(db, request, Number(adminUserMatch[1]));
      }
      const adminRegisterChannelMatch = path.match(/^\/api\/admin\/register-channels\/(\d+)$/);
      if (adminRegisterChannelMatch && request.method === "PATCH") {
        return await handleUpdateRegistrationChannel(db, request, Number(adminRegisterChannelMatch[1]));
      }
      const adminPasswordMatch = path.match(/^\/api\/admin\/users\/(\d+)\/reset-password$/);
      if (adminPasswordMatch && request.method === "POST") {
        return await handleResetAdminUserPassword(db, request, Number(adminPasswordMatch[1]));
      }
      if (path === "/api/admin/codes" && request.method === "GET") {
        return await handleListActivationCodes(db, request);
      }
      if (path === "/api/admin/codes" && request.method === "POST") {
        return await handleCreateActivationCode(db, request);
      }
      if (path === "/api/admin/codes/batch-revoke" && request.method === "POST") {
        return await handleBatchRevokeActivationCodes(db, request);
      }
      if (path === "/api/admin/codes/batch-update" && request.method === "POST") {
        return await handleBatchUpdateActivationCodes(db, request);
      }
      if (path === "/api/admin/codes/batch" && request.method === "POST") {
        return await handleBatchCreateActivationCodes(db, request);
      }
      const adminCodeMatch = path.match(/^\/api\/admin\/codes\/(\d+)$/);
      if (adminCodeMatch && request.method === "PATCH") {
        return await handleUpdateActivationCode(db, request, Number(adminCodeMatch[1]));
      }
      if (path === "/api/classes" && request.method === "POST") {
        return await handleCreateClass(db, request);
      }
      const classMatch = path.match(/^\/api\/classes\/(\d+)$/);
      if (classMatch && request.method === "PATCH") {
        return await handleRenameClass(db, request, Number(classMatch[1]));
      }
      const importStudentsMatch = path.match(/^\/api\/classes\/(\d+)\/students\/import$/);
      if (importStudentsMatch && request.method === "POST") {
        return await handleImportStudents(db, request, Number(importStudentsMatch[1]));
      }
      const createStudentMatch = path.match(/^\/api\/classes\/(\d+)\/students$/);
      if (createStudentMatch && request.method === "POST") {
        return await handleCreateStudent(db, request, Number(createStudentMatch[1]));
      }
      const batchDeleteStudentsMatch = path.match(/^\/api\/classes\/(\d+)\/students\/batch-delete$/);
      if (batchDeleteStudentsMatch && request.method === "POST") {
        return await handleBatchDeleteStudents(db, request, Number(batchDeleteStudentsMatch[1]));
      }
      const batchFeedStudentsMatch = path.match(/^\/api\/classes\/(\d+)\/students\/feed$/);
      if (batchFeedStudentsMatch && request.method === "POST") {
        return await handleFeedStudentsBatch(db, request, Number(batchFeedStudentsMatch[1]));
      }
      const studentMatch = path.match(/^\/api\/students\/(\d+)$/);
      if (studentMatch && request.method === "PATCH") {
        return await handleUpdateStudent(db, request, Number(studentMatch[1]));
      }
      const studentFeedMatch = path.match(/^\/api\/students\/(\d+)\/feed$/);
      if (studentFeedMatch && request.method === "POST") {
        return await handleFeedStudent(db, request, Number(studentFeedMatch[1]));
      }
      const shopItemsMatch = path.match(/^\/api\/classes\/(\d+)\/shop-items$/);
      if (shopItemsMatch && request.method === "POST") {
        return await handleCreateShopItem(db, request, Number(shopItemsMatch[1]));
      }
      const shopItemMatch = path.match(/^\/api\/shop-items\/(\d+)$/);
      if (shopItemMatch && request.method === "PATCH") {
        return await handleUpdateShopItem(db, request, Number(shopItemMatch[1]));
      }
      if (shopItemMatch && request.method === "DELETE") {
        return await handleDeleteShopItem(db, request, Number(shopItemMatch[1]));
      }
      const redeemMatch = path.match(/^\/api\/shop-items\/(\d+)\/redeem$/);
      if (redeemMatch && request.method === "POST") {
        return await handleRedeemShopItem(db, request, Number(redeemMatch[1]));
      }
      const rulesMatch = path.match(/^\/api\/classes\/(\d+)\/rules$/);
      if (rulesMatch && request.method === "POST") {
        return await handleCreateRule(db, request, Number(rulesMatch[1]));
      }
      const importRulesMatch = path.match(/^\/api\/classes\/(\d+)\/rules\/import$/);
      if (importRulesMatch && request.method === "POST") {
        return await handleImportRules(db, request, Number(importRulesMatch[1]));
      }
      const ruleMatch = path.match(/^\/api\/rules\/(\d+)$/);
      if (ruleMatch && request.method === "PATCH") {
        return await handleUpdateRule(db, request, Number(ruleMatch[1]));
      }
      if (ruleMatch && request.method === "DELETE") {
        return await handleDeleteRule(db, request, Number(ruleMatch[1]));
      }
      const moveRuleMatch = path.match(/^\/api\/rules\/(\d+)\/move$/);
      if (moveRuleMatch && request.method === "POST") {
        return await handleMoveRule(db, request, Number(moveRuleMatch[1]));
      }
      const thresholdMatch = path.match(/^\/api\/classes\/(\d+)\/settings\/thresholds$/);
      if (thresholdMatch && request.method === "PUT") {
        return await handleUpdateThresholds(db, request, Number(thresholdMatch[1]));
      }
      const smartSeatingMatch = path.match(/^\/api\/classes\/(\d+)\/settings\/smart-seating$/);
      if (smartSeatingMatch && request.method === "PUT") {
        return await handleUpdateSmartSeatingConfig(db, request, Number(smartSeatingMatch[1]));
      }
      const resetProgressMatch = path.match(/^\/api\/classes\/(\d+)\/reset-progress$/);
      if (resetProgressMatch && request.method === "POST") {
        return await handleResetClassProgress(db, request, Number(resetProgressMatch[1]));
      }
      const archiveStudentsMatch = path.match(/^\/api\/classes\/(\d+)\/archive-students$/);
      if (archiveStudentsMatch && request.method === "POST") {
        return await handleArchiveClassStudents(db, request, Number(archiveStudentsMatch[1]));
      }
      const undoLogMatch = path.match(/^\/api\/logs\/(\d+)\/undo$/);
      if (undoLogMatch && request.method === "POST") {
        return await handleUndoLog(db, request, Number(undoLogMatch[1]));
      }
      return error("Not Found", 404);
    } catch (caughtError) {
      return error(caughtError.message || "\u670D\u52A1\u5668\u5F00\u5C0F\u5DEE\u4E86\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5", 500);
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error2 = reduceError(e);
    return Response.json(error2, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-gbEmOf/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_server_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-gbEmOf/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
