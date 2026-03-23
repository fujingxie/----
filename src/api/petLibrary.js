/**
 * 宠物资源命名规范说明：
 * 1. 宠物图片统一放在 /assets/pets/
 * 2. 宠物成长阶段图片命名为 /assets/pets/[id][level].png
 * 3. 例如白猫 1-7 级分别为 /assets/pets/baimao1.png 到 /assets/pets/baimao7.png
 * 4. 恐龙系列同样遵循 1-7 形态命名，例如 /assets/pets/bawanglong1.png 到 /assets/pets/bawanglong7.png
 */

const createPetEntry = (id, name, category = 'animal', options = {}) => ({
  id,
  slug: id,
  name,
  category,
  adoptable: options.adoptable ?? category !== 'dinosaur',
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
  createPetEntry('konglong', '经典恐龙', 'dinosaur'),
  createPetEntry('samoye', '萨摩耶'),
  createPetEntry('xiaohouzi', '小猴子'),
  createPetEntry('xiaoya', '小鸭子'),
  createPetEntry('yingwu', '鹦鹉'),
  createPetEntry('heimao', '黑猫'),
  createPetEntry('lang', '狼'),
  createPetEntry('sanhuamao', '三花猫'),
  createPetEntry('xiaohuanxiong', '小浣熊'),
  createPetEntry('xiaoyang', '小羊'),
  createPetEntry('yinjianceng', '银渐层'),
];

export const DINOSAUR_PET_LIBRARY = [
  createPetEntry('bawanglong', '霸王龙', 'dinosaur'),
  createPetEntry('sanjiaolong', '三角龙', 'dinosaur'),
  createPetEntry('jianlong', '剑龙', 'dinosaur'),
  createPetEntry('wanlong', '腕龙', 'dinosaur'),
  createPetEntry('jialong', '甲龙', 'dinosaur'),
  createPetEntry('jilong', '棘龙', 'dinosaur'),
  createPetEntry('xunmenglong', '迅猛龙', 'dinosaur'),
  createPetEntry('fuzhilong', '副栉龙', 'dinosaur'),
  createPetEntry('leilong', '雷龙', 'dinosaur'),
  createPetEntry('yilong', '翼龙', 'dinosaur'),
  createPetEntry('yongchuanlong', '永川龙', 'dinosaur'),
  createPetEntry('liandaolong', '镰刀龙', 'dinosaur'),
];

export const PET_LIBRARY = [...BASE_PET_LIBRARY, ...DINOSAUR_PET_LIBRARY];

export const ADOPTABLE_PET_LIBRARY = PET_LIBRARY.filter((pet) => pet.adoptable);

export const PET_IMAGE_FALLBACK = '/assets/pets/egg.png';

export const getPetMeta = (id) => PET_LIBRARY.find((pet) => pet.id === id) || null;

export const getPetNameById = (id) => getPetMeta(id)?.name || '探索者';

export const getPetsByCategory = (category) => PET_LIBRARY.filter((pet) => pet.category === category);

export const getDinosaurPets = () => getPetsByCategory('dinosaur');

/**
 * 根据宠物 ID 和等级获取动态图片路径
 */
export const getPetImagePath = (id, level) => {
  if (!id) return PET_IMAGE_FALLBACK;
  const lv = level || 1;
  return `/assets/pets/${id}${lv}.png`;
};
