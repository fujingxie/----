/**
 * 宠物资源命名规范说明：
 * 1. 宠物头像图标: /assets/pets/[id]_icon.png
 * 2. 宠物成长阶段图片: /assets/pets/[id]_lv[level].png (例如: white_cat_lv1.png)
 */

export const PET_LIBRARY = [
  { id: 'white_cat', name: '白猫', icon: '/assets/pets/white_cat_icon.png' },
  { id: 'hippo', name: '河马', icon: '/assets/pets/hippo_icon.png' },
  { id: 'blue_cat', name: '蓝猫', icon: '/assets/pets/blue_cat_icon.png' },
  { id: 'otter', name: '水獭', icon: '/assets/pets/otter_icon.png' },
  { id: 'fox', name: '小狐狸', icon: '/assets/pets/fox_icon.png' },
  { id: 'pig', name: '小猪', icon: '/assets/pets/pig_icon.png' },
  { id: 'ragdoll', name: '布偶', icon: '/assets/pets/ragdoll_icon.png' },
  { id: 'garfield_cat', name: '加菲猫', icon: '/assets/pets/garfield_cat_icon.png' },
  { id: 'tiger', name: '老虎', icon: '/assets/pets/tiger_icon.png' },
  { id: 'swan', name: '天鹅', icon: '/assets/pets/swan_icon.png' },
  { id: 'chick', name: '小鸡', icon: '/assets/pets/chick_icon.png' },
  { id: 'panda', name: '熊猫', icon: '/assets/pets/panda_icon.png' },
  { id: 'hamster', name: '仓鼠', icon: '/assets/pets/hamster_icon.png' },
  { id: 'golden_shaded_cat', name: '金渐层', icon: '/assets/pets/golden_shaded_cat_icon.png' },
  { id: 'chinchilla', name: '龙猫', icon: '/assets/pets/chinchilla_icon.png' },
  { id: 'turtle', name: '乌龟', icon: '/assets/pets/turtle_icon.png' },
  { id: 'deer', name: '小鹿', icon: '/assets/pets/deer_icon.png' },
  { id: 'arctic_fox', name: '雪狐', icon: '/assets/pets/arctic_fox_icon.png' },
  { id: 'shiba_inu', name: '柴犬', icon: '/assets/pets/shiba_inu_icon.png' },
  { id: 'golden_retriever', name: '金毛', icon: '/assets/pets/golden_retriever_icon.png' },
  { id: 'cow_cat', name: '奶牛猫', icon: '/assets/pets/cow_cat_icon.png' },
  { id: 'white_rabbit', name: '小白兔', icon: '/assets/pets/white_rabbit_icon.png' },
  { id: 'pony', name: '小马', icon: '/assets/pets/pony_icon.png' },
  { id: 'schnauzer', name: '雪纳瑞', icon: '/assets/pets/schnauzer_icon.png' },
  { id: 'crocodile', name: '鳄鱼', icon: '/assets/pets/crocodile_icon.png' },
  { id: 'corgi', name: '柯基', icon: '/assets/pets/corgi_icon.png' },
  { id: 'penguin', name: '企鹅', icon: '/assets/pets/penguin_icon.png' },
  { id: 'bichon', name: '小比熊', icon: '/assets/pets/bichon_icon.png' },
  { id: 'calf', name: '小牛', icon: '/assets/pets/calf_icon.png' },
  { id: 'alpaca', name: '羊驼', icon: '/assets/pets/alpaca_icon.png' },
  { id: 'husky', name: '哈士奇', icon: '/assets/pets/husky_icon.png' },
  { id: 'dinosaur', name: '恐龙', icon: '/assets/pets/dinosaur_icon.png' },
  { id: 'samoyed', name: '萨摩耶', icon: '/assets/pets/samoyed_icon.png' },
  { id: 'monkey', name: '小猴子', icon: '/assets/pets/monkey_icon.png' },
  { id: 'duckling', name: '小鸭子', icon: '/assets/pets/duckling_icon.png' },
  { id: 'parrot', name: '鹦鹉', icon: '/assets/pets/parrot_icon.png' },
  { id: 'black_cat', name: '黑猫', icon: '/assets/pets/black_cat_icon.png' },
  { id: 'wolf', name: '狼', icon: '/assets/pets/wolf_icon.png' },
  { id: 'calico_cat', name: '三花猫', icon: '/assets/pets/calico_cat_icon.png' },
  { id: 'raccoon', name: '小浣熊', icon: '/assets/pets/raccoon_icon.png' },
  { id: 'lamb', name: '小羊', icon: '/assets/pets/lamb_icon.png' },
  { id: 'silver_shaded_cat', name: '银渐层', icon: '/assets/pets/silver_shaded_cat_icon.png' },
];

/**
 * 根据宠物 ID 和等级获取动态图片路径
 */
export const getPetImagePath = (id, level) => {
  if (!id) return '/assets/pets/egg.png';
  // 等级为 0 时显示蛋的状态或初始形态
  const lv = level || 1;
  return `/assets/pets/${id}_lv${lv}.png`;
};
