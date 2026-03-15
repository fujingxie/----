/**
 * 宠物资源命名规范说明：
 * 1. 宠物头像图标: /assets/pets/[id]_icon.png
 * 2. 宠物成长阶段图片: /assets/pets/[id]_lv[level].png (例如: white_cat_lv1.png)
 */

export const PET_LIBRARY = [
  { id: 'baimao', slug: 'baimao', name: '白猫', icon: '/assets/pets/baimao1.png' },
  { id: 'hema', slug: 'hema', name: '河马', icon: '/assets/pets/hema1.png' },
  { id: 'lanmao', slug: 'lanmao', name: '蓝猫', icon: '/assets/pets/lanmao1.png' },
  { id: 'shuita', slug: 'shuita', name: '水獭', icon: '/assets/pets/shuita1.png' },
  { id: 'xiaohuli', slug: 'xiaohuli', name: '小狐狸', icon: '/assets/pets/xiaohuli1.png' },
  { id: 'xiaozhu', slug: 'xiaozhu', name: '小猪', icon: '/assets/pets/xiaozhu1.png' },
  { id: 'buou', slug: 'buou', name: '布偶', icon: '/assets/pets/buou1.png' },
  { id: 'jiafeimao', slug: 'jiafeimao', name: '加菲猫', icon: '/assets/pets/jiafeimao1.png' },
  { id: 'laohu', slug: 'laohu', name: '老虎', icon: '/assets/pets/laohu1.png' },
  { id: 'tiane', slug: 'tiane', name: '天鹅', icon: '/assets/pets/tiane1.png' },
  { id: 'xiaoji', slug: 'xiaoji', name: '小鸡', icon: '/assets/pets/xiaoji1.png' },
  { id: 'xiongmao', slug: 'xiongmao', name: '熊猫', icon: '/assets/pets/xiongmao1.png' },
  { id: 'cangshu', slug: 'cangshu', name: '仓鼠', icon: '/assets/pets/cangshu1.png' },
  { id: 'jinjianceng', slug: 'jinjianceng', name: '金渐层', icon: '/assets/pets/jinjianceng1.png' },
  { id: 'longmao', slug: 'longmao', name: '龙猫', icon: '/assets/pets/longmao1.png' },
  { id: 'wugui', slug: 'wugui', name: '乌龟', icon: '/assets/pets/wugui1.png' },
  { id: 'xiaolu', slug: 'xiaolu', name: '小鹿', icon: '/assets/pets/xiaolu1.png' },
  { id: 'xuehu', slug: 'xuehu', name: '雪狐', icon: '/assets/pets/xuehu1.png' },
  { id: 'chaiquan', slug: 'chaiquan', name: '柴犬', icon: '/assets/pets/chaiquan1.png' },
  { id: 'jinmao', slug: 'jinmao', name: '金毛', icon: '/assets/pets/jinmao1.png' },
  { id: 'nainiumao', slug: 'nainiumao', name: '奶牛猫', icon: '/assets/pets/nainiumao1.png' },
  { id: 'xiaobaitu', slug: 'xiaobaitu', name: '小白兔', icon: '/assets/pets/xiaobaitu1.png' },
  { id: 'xiaoma', slug: 'xiaoma', name: '小马', icon: '/assets/pets/xiaoma1.png' },
  { id: 'xuenarui', slug: 'xuenarui', name: '雪纳瑞', icon: '/assets/pets/xuenarui1.png' },
  { id: 'eyu', slug: 'eyu', name: '鳄鱼', icon: '/assets/pets/eyu1.png' },
  { id: 'keji', slug: 'keji', name: '柯基', icon: '/assets/pets/keji1.png' },
  { id: 'qie', slug: 'qie', name: '企鹅', icon: '/assets/pets/qie1.png' },
  { id: 'xiaobixiong', slug: 'xiaobixiong', name: '小比熊', icon: '/assets/pets/xiaobixiong1.png' },
  { id: 'xiaoniu', slug: 'xiaoniu', name: '小牛', icon: '/assets/pets/xiaoniu1.png' },
  { id: 'yangtuo', slug: 'yangtuo', name: '羊驼', icon: '/assets/pets/yangtuo1.png' },
  { id: 'hashiqi', slug: 'hashiqi', name: '哈士奇', icon: '/assets/pets/hashiqi1.png' },
  { id: 'konglong', slug: 'konglong', name: '恐龙', icon: '/assets/pets/konglong1.png' },
  { id: 'samoye', slug: 'samoye', name: '萨摩耶', icon: '/assets/pets/samoye1.png' },
  { id: 'xiaohouzi', slug: 'xiaohouzi', name: '小猴子', icon: '/assets/pets/xiaohouzi1.png' },
  { id: 'xiaoya', slug: 'xiaoya', name: '小鸭子', icon: '/assets/pets/xiaoya1.png' },
  { id: 'yingwu', slug: 'yingwu', name: '鹦鹉', icon: '/assets/pets/yingwu1.png' },
  { id: 'heimao', slug: 'heimao', name: '黑猫', icon: '/assets/pets/heimao1.png' },
  { id: 'lang', slug: 'lang', name: '狼', icon: '/assets/pets/lang1.png' },
  { id: 'sanhuamao', slug: 'sanhuamao', name: '三花猫', icon: '/assets/pets/sanhuamao1.png' },
  { id: 'xiaohuanxiong', slug: 'xiaohuanxiong', name: '小浣熊', icon: '/assets/pets/xiaohuanxiong1.png' },
  { id: 'xiaoyang', slug: 'xiaoyang', name: '小羊', icon: '/assets/pets/xiaoyang1.png' },
  { id: 'yinjianceng', slug: 'yinjianceng', name: '银渐层', icon: '/assets/pets/yinjianceng1.png' },
];

export const PET_IMAGE_FALLBACK = '/assets/pets/egg.png';

export const getPetMeta = (id) => PET_LIBRARY.find((pet) => pet.id === id) || null;

export const getPetNameById = (id) => getPetMeta(id)?.name || '探索者';

/**
 * 根据宠物 ID 和等级获取动态图片路径
 */
export const getPetImagePath = (id, level) => {
  if (!id) return PET_IMAGE_FALLBACK;
  // 等级为 0 时显示蛋的状态或初始形态
  const lv = level || 1;
  return `/assets/pets/${id}${lv}.png`;
};
