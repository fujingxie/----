const DAY_IN_MS = 24 * 60 * 60 * 1000;

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

export const getPetSafetyHint = (student) => {
  if (!student || student.pet_status === 'egg') {
    return '等待唤醒宠物';
  }

  if (student.pet_condition === 'sleeping') {
    return '已经进入休眠，下一次积极课堂互动会唤醒它';
  }

  const timestamp = student.last_fed_at ? new Date(student.last_fed_at).getTime() : NaN;
  if (Number.isNaN(timestamp)) {
    return '喂养时间还在同步中';
  }

  const diffDays = Math.floor((Date.now() - timestamp) / DAY_IN_MS);

  if (student.pet_condition === 'weak') {
    return '超过 4 天未喂养，建议立刻处理';
  }

  if (student.pet_condition === 'hungry') {
    return '已经进入饥饿期，今天最好补喂一次';
  }

  const safeDays = Math.max(0, 2 - diffDays);
  return safeDays > 0 ? `距离饥饿还有 ${safeDays} 天` : '今天记得照顾它一下';
};
