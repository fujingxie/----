import React, { useState } from 'react';
import CertWorkshop from './CertWorkshop';
import StickerWorkshop from './StickerWorkshop';
import './HonorWorkshop.css';

const SECTIONS = [
  { id: 'sticker', label: '冰箱贴制作' },
  { id: 'honor-cert', label: '光荣榜证书制作' },
  { id: 'graduate-cert', label: '毕业证书制作' },
];

const HonorWorkshop = ({ students, currentClass, user }) => {
  const [activeSection, setActiveSection] = useState('sticker');

  // 冰箱贴 & 光荣榜证书均拥有自己的全宽左侧工具栏（V2 工坊聚焦布局），不需要外层 sidebar
  if (activeSection === 'sticker') {
    return (
      <div className="honor-workshop">
        <StickerWorkshop
          students={students}
          currentClass={currentClass}
          activeSection={activeSection}
          onSwitchSection={setActiveSection}
        />
      </div>
    );
  }

  if (activeSection === 'honor-cert') {
    return (
      <div className="honor-workshop">
        <CertWorkshop
          students={students}
          currentClass={currentClass}
          user={user}
          activeSection={activeSection}
          onSwitchSection={setActiveSection}
        />
      </div>
    );
  }

  // 其他模块（毕业证书等）保留外层导航 sidebar
  return (
    <div className="honor-workshop">
      <aside className="honor-sidebar">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`honor-nav-item ${activeSection === s.id ? 'active' : ''}`}
            onClick={() => setActiveSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </aside>

      <main className="honor-content">
        {activeSection === 'graduate-cert' && (
          <div className="honor-coming-soon">毕业证书制作 — 即将上线</div>
        )}
      </main>
    </div>
  );
};

export default HonorWorkshop;
