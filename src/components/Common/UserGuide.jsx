import React from 'react';
import './UserGuide.css';

/**
 * 系统使用说明（共享组件）
 * 在 Settings 页面和帮助弹框中都会用到，保证两处内容一致。
 *
 * variant:
 *  - 'page'  — 内嵌在 Settings 页面里（默认）
 *  - 'modal' — 在 Modal 弹框中展示
 */
const UserGuide = ({ variant = 'page', onOpenFeedback }) => {
  return (
    <div className={`user-guide user-guide-${variant}`}>
      <div className="guide-header">
        <h2>班级养宠 · 使用说明</h2>
        <p className="guide-subtitle">看完这份说明，10 分钟上手系统</p>
      </div>

      {/* ─── 核心概念 ─── */}
      <section className="guide-section guide-highlight">
        <h3>🔑 核心概念：两个经验值</h3>
        <p>这是最重要也是最多老师疑惑的地方，请仔细阅读。</p>

        <div className="guide-grid">
          <div className="guide-card">
            <div className="guide-card-tag">本宠经验</div>
            <div className="guide-card-title">当前宠物身上的经验</div>
            <ul>
              <li>扣分会 <strong>减少</strong></li>
              <li>宠物毕业后 <strong>归零</strong></li>
              <li>决定当前宠物的 <strong>等级（Lv1~Lv7）</strong></li>
              <li>对应学生卡片上的 ⭐ 图标</li>
            </ul>
          </div>

          <div className="guide-card">
            <div className="guide-card-tag lifetime">累积经验（战力值）</div>
            <div className="guide-card-title">学生一生的总经验</div>
            <ul>
              <li><strong>只增不减</strong>（扣分不会减少）</li>
              <li>宠物毕业 <strong>依然保留</strong></li>
              <li>决定 <strong>战力榜</strong> 排名</li>
              <li>对应学生卡片上的 🏆 图标</li>
            </ul>
          </div>
        </div>

        <div className="guide-callout">
          <strong>❓ 为什么扣分后战力榜不变？</strong>
          <p>
            因为战力榜按「累积经验」排名，这是学生一生的总成就，<strong>只增不减</strong>。
            扣分只影响「本宠经验」（当前宠物身上），不影响累积经验。
          </p>
          <p>
            这样设计是为了：① 防止学生因一次扣分被打回原点，失去动力；
            ② 宠物毕业后本宠经验归零，但累积经验保留，老师仍能看到学生历史努力。
          </p>
        </div>
      </section>

      {/* ─── 宠物成长流程 ─── */}
      <section className="guide-section">
        <h3>🐣 宠物成长流程</h3>
        <ol className="guide-steps">
          <li>
            <strong>领养宠物</strong>：学生初始是「神秘蛋」，老师在「宠物乐园」页面给学生领养宠物。
          </li>
          <li>
            <strong>加分喂养</strong>：按「分值规则」给学生打分，宠物获得经验值升级。
            本宠经验和累积经验 <strong>同时增加</strong>。
          </li>
          <li>
            <strong>达到满级</strong>：宠物升到 Lv7（默认需 100 经验，可在设置中调整）后，可以「毕业」。
          </li>
          <li>
            <strong>毕业重生</strong>：毕业后宠物进入「毕业图鉴」，学生获得新蛋继续养。
            本宠经验 <strong>归零</strong>，累积经验 <strong>保留</strong>。
          </li>
        </ol>
      </section>

      {/* ─── 两个榜单 ─── */}
      <section className="guide-section">
        <h3>🏆 两个榜单的区别</h3>
        <div className="guide-grid">
          <div className="guide-card">
            <div className="guide-card-tag">战力榜</div>
            <div className="guide-card-title">按累积经验排名</div>
            <p>反映学生一生的总实力，扣分不会让你跌落，毕业也不会清零。</p>
            <p className="guide-hint">适合：表彰长期努力的学生</p>
          </div>

          <div className="guide-card">
            <div className="guide-card-tag progress">进步榜</div>
            <div className="guide-card-title">按时间段获得经验排名</div>
            <p>只统计指定时间段（如本周、本月）内获得的经验，体现近期进步。</p>
            <p className="guide-hint">适合：鼓励近期表现突出的学生</p>
          </div>
        </div>
      </section>

      {/* ─── 学生分组 ─── */}
      <section className="guide-section">
        <h3>👥 学生分组</h3>
        <p>在「宠物乐园」页面右上角点击「管理分组」，可以把学生按需分配到不同组别。</p>
        <ul className="guide-list">
          <li>点击左侧「＋ 新建分组」创建分组名称（如"第一组""气氛组"）</li>
          <li>选中分组后，在右侧勾选要加入的学生；同一学生可以同时属于<strong>多个分组</strong></li>
          <li>点「保存」后，学生卡片下方会显示所属分组标签</li>
        </ul>
        <div className="guide-callout guide-callout-tip">
          <strong>💡 分组过滤</strong>
          <p>
            宠物乐园顶部筛选栏和批量互动弹窗都支持<strong>多选分组</strong>，
            同时选中多个分组会显示所有组的学生（并集），方便跨组批量操作。
          </p>
        </div>
      </section>

      {/* ─── 规则与加分 ─── */}
      <section className="guide-section">
        <h3>📋 分值规则</h3>
        <ul className="guide-list">
          <li>在「系统设置 → 分值规则」中配置奖惩规则（如「举手回答 +2」「迟到 -1」）</li>
          <li>规则分 <strong>加分（正向）</strong> 和 <strong>扣分（负向）</strong> 两类</li>
          <li>规则经验值可以是任何整数，对应加减多少经验</li>
          <li>每条规则还可设置金币奖励（学生可用来在商店兑换物品）</li>
          <li>支持从其他班级导入规则模板，不用每次都重新配置</li>
        </ul>
      </section>

      {/* ─── 宠物状态与衰减 ─── */}
      <section className="guide-section">
        <h3>💤 宠物状态（可选功能）</h3>
        <p>如果开启了宠物状态功能，久未加分的学生宠物会进入「饥饿 / 虚弱 / 休眠」状态：</p>
        <ul className="guide-list">
          <li><strong>饥饿</strong>：默认 2 天未加分，提醒老师关注</li>
          <li><strong>虚弱</strong>：默认 4 天未加分，每天掉 1 点本宠经验</li>
          <li><strong>休眠</strong>：默认 7 天未加分，每天掉 2 点本宠经验</li>
          <li>加分或使用「批量喂养」会立即恢复健康状态</li>
          <li>周末和节假日自动暂停衰减，可在「分值规则」中配置</li>
        </ul>
        <div className="guide-callout guide-callout-tip">
          <strong>💡 温馨提示</strong>
          <p>衰减只扣本宠经验，不扣累积经验。所以衰减不会影响战力榜排名。</p>
        </div>
      </section>

      {/* ─── 常见问题 ─── */}
      <section className="guide-section">
        <h3>❓ 常见问题</h3>

        <details className="guide-qa">
          <summary>扣分后为什么战力榜没变化？</summary>
          <p>战力榜按「累积经验」排名，累积经验只增不减。扣分只会让「本宠经验」减少，从而可能让当前宠物降级，但不影响战力榜。</p>
        </details>

        <details className="guide-qa">
          <summary>两个学生本宠经验相同，为什么战力榜位置不同？</summary>
          <p>因为战力榜看的是「累积经验」。比如学生 A 毕业过 3 次宠物，学生 B 从没毕业过，两人当前本宠经验都是 50，但 A 的累积经验远高于 B，所以 A 在战力榜靠前。</p>
        </details>

        <details className="guide-qa">
          <summary>宠物毕业后经验为什么归零？</summary>
          <p>只有「本宠经验」归零（因为是新宠物从头养），「累积经验」完整保留。毕业的宠物会进入学生的「毕业图鉴」，是学生的荣誉凭证。</p>
        </details>

        <details className="guide-qa">
          <summary>可以手动修改学生经验吗？</summary>
          <p>可以。管理员账号在「账户管理 → 学生管理」里可以直接修改任一学生的本宠经验和累积经验（用于数据校准或补录）。普通教师账号通过加减分规则间接修改。</p>
        </details>

        <details className="guide-qa">
          <summary>一键批量喂养是什么？</summary>
          <p>在「宠物乐园」页面右上角有「批量喂养」按钮，一键给全班所有学生加固定经验（常用于课堂整体表扬）。每天限一次，防止滥用。</p>
        </details>

        <details className="guide-qa">
          <summary>操作错了怎么撤销？</summary>
          <p>在「系统设置 → 操作日志」里可以看到所有加减分操作，点「撤销」按钮即可恢复。只支持撤销 7 天内的操作。</p>
        </details>

        <details className="guide-qa">
          <summary>忘记密码怎么办？</summary>
          <p>联系管理员账号在后台重置密码，或通过激活码渠道重新注册。</p>
        </details>
      </section>

      {/* ─── 反馈工单 ─── */}
      <section className="guide-section">
        <h3>📬 反馈工单</h3>
        <p>遇到问题或有建议？可以直接在系统内提交反馈，超管会逐条回复。</p>
        <ol className="guide-steps">
          <li>点击右上角 <strong>铃铛图标</strong> → 切换到「我的反馈」Tab</li>
          <li>点「＋ 提交反馈」，选择类型：<strong>Bug 报告 / 功能建议 / 使用问题</strong></li>
          <li>填写标题和描述；如需附图，直接在文本框内 <strong>粘贴截图</strong>（Cmd+V / Ctrl+V）</li>
          <li>提交后可在「我的反馈」列表查看处理进度</li>
          <li>超管回复后，铃铛会出现 <strong>红点提醒</strong>，点开即可查看对话</li>
        </ol>
        <div className="guide-callout guide-callout-tip">
          <strong>💡 已关闭的工单</strong>
          <p>状态为「已关闭」的工单，悬停后会出现 × 按钮，可以自行删除。</p>
        </div>
      </section>

      {/* ─── 页脚入口 ─── */}
      <section className="guide-section guide-footer">
        <h3>✍️ 立即提交反馈</h3>
        <p>如有任何问题或建议，欢迎随时告诉我们。</p>
        {onOpenFeedback ? (
          <button
            type="button"
            className="guide-feedback-btn"
            onClick={onOpenFeedback}
          >
            ✍️ 我要提交反馈
          </button>
        ) : (
          <p style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>
            在顶部铃铛 → 切到「我的反馈」Tab → 点「＋ 提交反馈」即可。
          </p>
        )}
      </section>
    </div>
  );
};

export default UserGuide;
