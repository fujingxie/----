const DAY_IN_MS = 24 * 60 * 60 * 1000;

const parseDateOnlyToUtcMs = (value, endOfDay = false) => {
  if (typeof value !== 'string' || !value.trim()) {
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
    endOfDay ? 999 : 0,
  );
};

const isDayPaused = (dayIndex, petConditionConfig) => {
  const dayStartMs = dayIndex * DAY_IN_MS;
  const weekday = new Date(dayStartMs).getUTCDay();

  if (petConditionConfig?.skip_weekends && (weekday === 0 || weekday === 6)) {
    return true;
  }

  const pauseStartMs = parseDateOnlyToUtcMs(petConditionConfig?.pause_start_date, false);
  const pauseEndMs = parseDateOnlyToUtcMs(petConditionConfig?.pause_end_date, true);

  if (pauseStartMs !== null && pauseEndMs !== null) {
    return dayStartMs >= pauseStartMs && dayStartMs <= pauseEndMs;
  }

  return false;
};

const countEffectiveDaysBetween = (startMs, endMs, petConditionConfig) => {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }

  const startDayIndex = Math.floor(startMs / DAY_IN_MS);
  const endDayIndex = Math.floor(endMs / DAY_IN_MS);
  let effectiveDays = 0;

  for (let dayIndex = startDayIndex + 1; dayIndex <= endDayIndex; dayIndex += 1) {
    if (!isDayPaused(dayIndex, petConditionConfig)) {
      effectiveDays += 1;
    }
  }

  return effectiveDays;
};

export const PET_CONDITION_LABELS = {
  healthy: '健康',
  hungry: '饥饿',
  weak: '虚弱',
  sleeping: '休眠',
};

export const getPetConditionLabel = (condition) => PET_CONDITION_LABELS[condition] || PET_CONDITION_LABELS.healthy;

export const formatLastFedLabel = (lastFedAt) => {
  if (!lastFedAt) {
    return '还没有喂养记录';
  }

  const timestamp = new Date(lastFedAt).getTime();
  if (Number.isNaN(timestamp)) {
    return '喂养时间待同步';
  }

  const days = Math.floor((Date.now() - timestamp) / DAY_IN_MS);

  if (days <= 0) {
    return '今天刚喂养';
  }

  return `${days} 天前喂养`;
};

export const getPetSafetyHint = (student, petConditionConfig = null) => {
  if (!student || student.pet_status === 'egg') {
    return '等待唤醒宠物';
  }

  if (petConditionConfig?.enabled === false) {
    return '当前已关闭长期未喂养衰减';
  }

  if (student.pet_condition === 'sleeping') {
    return '已经进入休眠，下一次积极课堂互动会唤醒它';
  }

  const timestamp = student.last_fed_at ? new Date(student.last_fed_at).getTime() : NaN;
  if (Number.isNaN(timestamp)) {
    return '喂养时间还在同步中';
  }

  const diffDays = countEffectiveDaysBetween(timestamp, Date.now(), petConditionConfig);
  const hungryDays = Math.max(1, Number(petConditionConfig?.hungry_days || 2));
  const weakDays = Math.max(hungryDays + 1, Number(petConditionConfig?.weak_days || 4));

  if (student.pet_condition === 'weak') {
    return `超过 ${weakDays} 天未喂养，建议立刻处理`;
  }

  if (student.pet_condition === 'hungry') {
    return '已经进入饥饿期，今天最好补喂一次';
  }

  const safeDays = Math.max(0, hungryDays - diffDays);
  return safeDays > 0 ? `距离饥饿还有 ${safeDays} 天` : '今天记得照顾它一下';
};
