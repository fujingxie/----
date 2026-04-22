/**
 * 宠物资源命名规范说明：
 * 1. 宠物图片统一放在 /assets/pets/
 * 2. 宠物成长阶段图片命名为 /assets/pets/[id][level].png
 * 3. 例如白猫 1-7 级分别为 /assets/pets/baimao1.png 到 /assets/pets/baimao7.png
 */

const createPetEntry = (id, name, category = 'animal', options = {}) => ({
  id,
  slug: id,
  name,
  category,
  adoptable: options.adoptable ?? true,
  icon: `/assets/pets/${id}1.png`,
});

const BASE_PET_LIBRARY = [
  createPetEntry('baimao', '白猫'),
  createPetEntry('hema', '河马'),
  createPetEntry('lanmao', '蓝猫'),
  createPetEntry('shuita', '水獭'),
  createPetEntry('xiaohuli', '小狐狸'),
  createPetEntry('xiaozhu', '小猪'),
  createPetEntry('buou', '布偶'),
  createPetEntry('jiafeimao', '加菲猫'),
  createPetEntry('laohu', '老虎'),
  createPetEntry('tiane', '天鹅'),
  createPetEntry('xiaoji', '小鸡'),
  createPetEntry('xiongmao', '熊猫'),
  createPetEntry('cangshu', '仓鼠'),
  createPetEntry('jinjianceng', '金渐层'),
  createPetEntry('longmao', '龙猫'),
  createPetEntry('wugui', '乌龟'),
  createPetEntry('xiaolu', '小鹿'),
  createPetEntry('xuehu', '雪狐'),
  createPetEntry('chaiquan', '柴犬'),
  createPetEntry('jinmao', '金毛'),
  createPetEntry('nainiumao', '奶牛猫'),
  createPetEntry('xiaobaitu', '小白兔'),
  createPetEntry('xiaoma', '小马'),
  createPetEntry('xuenarui', '雪纳瑞'),
  createPetEntry('eyu', '鳄鱼'),
  createPetEntry('keji', '柯基'),
  createPetEntry('qie', '企鹅'),
  createPetEntry('xiaobixiong', '小比熊'),
  createPetEntry('xiaoniu', '小牛'),
  createPetEntry('yangtuo', '羊驼'),
  createPetEntry('hashiqi', '哈士奇'),
  createPetEntry('samoye', '萨摩耶'),
  createPetEntry('xiaohouzi', '小猴子'),
  createPetEntry('xiaoya', '小鸭子'),
  createPetEntry('yingwu', '鹦鹉'),
  createPetEntry('heimao', '黑猫'),
  createPetEntry('lang', '狼'),
  createPetEntry('konglong', '恐龙'),
  createPetEntry('sanhuamao', '三花猫'),
  createPetEntry('xiaohuanxiong', '小浣熊'),
  createPetEntry('xiaoyang', '小羊'),
  createPetEntry('yinjianceng', '银渐层'),
];

export const PET_LIBRARY = [...BASE_PET_LIBRARY];

export const ADOPTABLE_PET_LIBRARY = PET_LIBRARY.filter((pet) => pet.adoptable);

export const PET_IMAGE_FALLBACK = '/assets/pets/egg.png';

let customPetsCache = [];

export const setCustomPetsCache = (pets) => {
  customPetsCache = Array.isArray(pets) ? pets : [];
};

export const getCustomPetsCache = () => customPetsCache;

export const buildCustomPetEntry = (dbPet) => ({
  id: `custom:${dbPet.id}`,
  slug: `custom:${dbPet.id}`,
  name: dbPet.name,
  category: dbPet.category,
  adoptable: true,
  icon: dbPet.image_lv1 ? `/api/pets/images/${dbPet.image_lv1}` : PET_IMAGE_FALLBACK,
  _dbPet: dbPet,
});

export const getFullPetLibrary = () => [
  ...ADOPTABLE_PET_LIBRARY,
  ...customPetsCache.map(buildCustomPetEntry),
];

export const getPetMeta = (id) => getFullPetLibrary().find((pet) => pet.id === id) || null;

export const getPetNameById = (id) => getPetMeta(id)?.name || '探索者';

export const getPetsByCategory = (category) =>
  getFullPetLibrary().filter((pet) => pet.category === category);

/**
 * 根据宠物 ID 和等级获取动态图片路径
 */
export const getPetImagePath = (id, level) => {
  if (!id) return PET_IMAGE_FALLBACK;
  const lv = Math.min(Math.max(Number(level) || 1, 1), 7);

  if (String(id).startsWith('custom:')) {
    const customId = Number(String(id).replace('custom:', ''));
    const pet = customPetsCache.find((item) => item.id === customId);
    if (!pet) {
      return PET_IMAGE_FALLBACK;
    }
    const key = pet[`image_lv${lv}`];
    return key ? `/api/pets/images/${key}` : PET_IMAGE_FALLBACK;
  }

  return `/assets/pets/${id}${lv}.png`;
};
