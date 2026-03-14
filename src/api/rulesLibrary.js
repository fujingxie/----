export const RULES_LIBRARY = {
  positive: [
    { id: 'perfect_writing', name: '字迹工整', icon: '🖋️', exp: 2, coins: 5 },
    { id: 'correct_answer', name: '题目正确', icon: '✅', exp: 3, coins: 5 },
    { id: 'love_labor', name: '热爱劳动', icon: '🧹', exp: 5, coins: 10 },
    { id: 'help_others', name: '帮助同学', icon: '🤝', exp: 5, coins: 10 },
    { id: 'good_job', name: '认真完成', icon: '🌟', exp: 2, coins: 5 },
    { id: 'excel_homework', name: '作业优秀', icon: '🏆', exp: 10, coins: 20 },
  ],
  negative: [
    { id: 'no_homework', name: '未交作业', icon: '❌', exp: -5, coins: -10 },
    { id: 'noisy', name: '追跑打闹', icon: '🏃', exp: -2, coins: -5 },
    { id: 'incomplete', name: '作业未完成', icon: '⚠️', exp: -2, coins: -5 },
    { id: 'distracted', name: '上课走神', icon: '😴', exp: -2, coins: -5 },
  ]
};
