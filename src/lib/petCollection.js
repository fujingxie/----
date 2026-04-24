const nowIso = () => new Date().toISOString();

const createCollectionId = (studentId) => `${studentId || 'student'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildLegacyActiveEntry = (student) => ({
  id: createCollectionId(student?.id),
  pet_type_id: student?.pet_type_id || null,
  pet_name: student?.pet_name || '未命名伙伴',
  pet_level: Number(student?.pet_level || 1),
  adopted_at: student?.created_at || nowIso(),
  status: student?.pet_status === 'egg' ? 'active-egg' : 'active',
});

export const parsePetCollection = (value, student = null) => {
  let collection = [];

  if (Array.isArray(value)) {
    collection = value;
  } else if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        collection = parsed;
      }
    } catch {
      collection = [];
    }
  }

  const normalized = collection
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

  if (normalized.length > 0) {
    return normalized;
  }

  if (student?.pet_status === 'egg' || student?.pet_type_id) {
    return student?.pet_status === 'egg' && !student?.pet_type_id ? [] : [buildLegacyActiveEntry(student)];
  }

  return [];
};

export const getAdoptionCount = (student) => parsePetCollection(student?.pet_collection, student).length;

export const getMaxPetLevel = (thresholds = []) => thresholds.length + 1;

export const isStudentAtMaxLevel = (student, thresholds = []) => {
  if (!student || student.pet_status === 'egg') {
    return false;
  }

  return Number(student.pet_level || 0) >= getMaxPetLevel(thresholds);
};

const getCurrentSlotIndex = (collection) => {
  const activeIndex = collection.findIndex((entry) => entry.status === 'active' || entry.status === 'active-egg');

  return activeIndex >= 0 ? activeIndex : collection.length - 1;
};

export const activateStudentPet = (student, selectedPet, customPetName = '') => {
  const collection = parsePetCollection(student?.pet_collection, student);
  const nextCollection = [...collection];
  const currentIndex = getCurrentSlotIndex(nextCollection);
  const petName = customPetName.trim() || selectedPet.name;
  const activeEntry = {
    id: nextCollection[currentIndex]?.id || createCollectionId(student?.id),
    pet_type_id: selectedPet.id,
    pet_name: petName,
    pet_level: 1,
    adopted_at: nextCollection[currentIndex]?.adopted_at || nowIso(),
    completed_at: null,
    status: 'active',
  };

  if (currentIndex >= 0 && nextCollection[currentIndex]?.status === 'active-egg') {
    nextCollection[currentIndex] = activeEntry;
  } else {
    nextCollection.push(activeEntry);
  }

  return {
    ...student,
    pet_status: 'active',
    pet_type_id: selectedPet.id,
    pet_type_name: selectedPet.name,
    pet_name: petName,
    pet_level: 1,
    pet_points: 0,
    total_exp: 0,
    pet_collection: nextCollection,
  };
};

export const syncStudentCollectionProgress = (student) => {
  const collection = parsePetCollection(student?.pet_collection, student);
  if (collection.length === 0) {
    return collection;
  }

  const currentIndex = getCurrentSlotIndex(collection);
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

export const isStudentSleeping = (student) => student?.pet_status !== 'egg' && student?.pet_condition === 'sleeping';

// 补录一条已毕业宠物记录，并累加 lifetime_exp（不影响当前宠物状态）
export const addGraduatedEntry = (student, { petTypeId, petName, petDefaultName, exp }) => {
  const collection = parsePetCollection(student?.pet_collection, student);
  const completedAt = nowIso();
  const resolvedName = (petName || '').trim() || petDefaultName || petTypeId;

  const newEntry = {
    id: createCollectionId(student?.id),
    pet_type_id: petTypeId,
    pet_name: resolvedName,
    pet_level: 7,
    adopted_at: completedAt,
    completed_at: completedAt,
    status: 'graduated',
  };

  return {
    ...student,
    lifetime_exp: Number(student.lifetime_exp || 0) + Number(exp || 0),
    pet_collection: [...collection, newEntry],
  };
};

export const graduateToNewEgg = (student) => {
  const collection = parsePetCollection(student?.pet_collection, student);
  const nextCollection = [...collection];
  const currentIndex = getCurrentSlotIndex(nextCollection);
  const completedAt = nowIso();

  if (currentIndex >= 0) {
    // grad_exp：记录宠物毕业时的本宠经验，用于荣誉工坊冰箱贴等展示
    // 毕业后 total_exp 会归零，不存这个字段就丢失了
    const gradExp = Number(student?.total_exp || student?.pet_points || 0);
    nextCollection[currentIndex] = {
      ...nextCollection[currentIndex],
      pet_type_id: student?.pet_type_id || nextCollection[currentIndex].pet_type_id,
      pet_name: student?.pet_name || nextCollection[currentIndex].pet_name,
      pet_level: Number(student?.pet_level || nextCollection[currentIndex].pet_level || 0),
      grad_exp: gradExp,
      status: 'graduated',
      completed_at: completedAt,
    };
  }

  nextCollection.push({
    id: createCollectionId(student?.id),
    pet_type_id: null,
    pet_name: '神秘蛋',
    pet_level: 0,
    adopted_at: completedAt,
    completed_at: null,
    status: 'active-egg',
  });

  return {
    ...student,
    pet_status: 'egg',
    pet_type_id: null,
    pet_type_name: null,
    pet_name: null,
    pet_level: 0,
    pet_points: 0,
    total_exp: 0,
    pet_collection: nextCollection,
  };
};
