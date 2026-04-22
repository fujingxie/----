import React, { useState } from 'react';
import StickerWorkshop from './StickerWorkshop';
import './HonorWorkshop.css';

const SECTIONS = [
  { id: 'sticker', label: '冰箱贴制作' },
  { id: 'honor-cert', label: '光荣榜证书制作' },
  { id: 'graduate-cert', label: '毕业证书制作' },
];

const HonorWorkshop = ({ students, currentClass }) => {
  const [activeSection, setActiveSection] = useState('sticker');

  return (
    <div className="honor-workshop">
      {/* 左侧功能导航 */}
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

      {/* 右侧内容区 */}
      <main className="honor-content">
        {activeSection === 'sticker' && (
          <StickerWorkshop students={students} currentClass={currentClass} />
        )}
        {activeSection === 'honor-cert' && (
          <div className="honor-coming-soon">光荣榜证书制作 — 即将上线</div>
        )}
        {activeSection === 'graduate-cert' && (
          <div className="honor-coming-soon">毕业证书制作 — 即将上线</div>
        )}
      </main>
    </div>
  );
};

export default HonorWorkshop;
