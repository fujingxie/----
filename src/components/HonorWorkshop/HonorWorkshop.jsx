import React, { useState } from 'react';
import CertWorkshop from './CertWorkshop';
import GradCertWorkshop from './GradCertWorkshop';
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

  if (activeSection === 'graduate-cert') {
    return (
      <div className="honor-workshop">
        <GradCertWorkshop
          students={students}
          currentClass={currentClass}
          user={user}
          activeSection={activeSection}
          onSwitchSection={setActiveSection}
        />
      </div>
    );
  }

  // 兜底（理论上不会到达这里）
  return (
    <div className="honor-workshop">
      <div className="honor-coming-soon">— 即将上线 —</div>
    </div>
  );
};

export default HonorWorkshop;
