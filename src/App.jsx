import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  ChevronDown,
  Gamepad2,
  LogOut,
  Plus,
  Settings as SettingsIcon,
  ShoppingBag,
  Trophy,
  Users,
} from 'lucide-react';
import Login from './components/Login/Login';
import Modal from './components/Common/Modal';
import PetParadise from './components/PetParadise/PetParadise';
import MiniShop from './components/Shop/MiniShop';
import HallOfFame from './components/Rank/HallOfFame';
import Toolbox from './components/Toolbox/Toolbox';
import Settings from './components/Settings/Settings';
import {
  createClass,
  createRule,
  createShopItem,
  createStudent,
  deleteRule,
  fetchBootstrap,
  importStudents,
  loginUser,
  redeemShopItem,
  updateClass,
  updateStudent,
  updateThresholds,
} from './api/client';
import './App.css';

const DEFAULT_LEVEL_THRESHOLDS = [10, 20, 30, 50, 70, 100];

const tabs = [
  { id: 'pet', label: '宠物乐园', icon: <Gamepad2 size={20} /> },
  { id: 'shop', label: '小卖部', icon: <ShoppingBag size={20} /> },
  { id: 'rank', label: '光荣榜', icon: <Trophy size={20} /> },
  { id: 'toolbox', label: '百宝箱', icon: <Briefcase size={20} /> },
  { id: 'settings', label: '系统设置', icon: <SettingsIcon size={20} /> },
];

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('pet');
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [classNameInput, setClassNameInput] = useState('');
  const [classes, setClasses] = useState([]);
  const [currentClassId, setCurrentClassId] = useState(null);
  const [studentsByClassId, setStudentsByClassId] = useState({});
  const [shopItemsByClassId, setShopItemsByClassId] = useState({});
  const [rulesByClassId, setRulesByClassId] = useState({});
  const [logsByClassId, setLogsByClassId] = useState({});
  const [thresholdsByClassId, setThresholdsByClassId] = useState({});
  const [authErrorMessage, setAuthErrorMessage] = useState('');
  const [appErrorMessage, setAppErrorMessage] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoadingClassData, setIsLoadingClassData] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const currentClass = useMemo(
    () => classes.find((item) => item.id === currentClassId) || null,
    [classes, currentClassId],
  );

  const currentStudents = currentClassId ? studentsByClassId[currentClassId] || [] : [];
  const currentItems = currentClassId ? shopItemsByClassId[currentClassId] || [] : [];
  const currentRules = currentClassId ? rulesByClassId[currentClassId] || [] : [];
  const currentLogs = currentClassId ? logsByClassId[currentClassId] || [] : [];
  const currentThresholds = currentClassId
    ? thresholdsByClassId[currentClassId] || DEFAULT_LEVEL_THRESHOLDS
    : DEFAULT_LEVEL_THRESHOLDS;

  const syncClassBundle = (bundle) => {
    if (!bundle?.currentClassId) {
      return;
    }

    const classId = bundle.currentClassId;

    setStudentsByClassId((prev) => ({
      ...prev,
      [classId]: bundle.students || [],
    }));
    setShopItemsByClassId((prev) => ({
      ...prev,
      [classId]: bundle.shopItems || [],
    }));
    setRulesByClassId((prev) => ({
      ...prev,
      [classId]: bundle.rules || [],
    }));
    setLogsByClassId((prev) => ({
      ...prev,
      [classId]: bundle.logs || [],
    }));
    setThresholdsByClassId((prev) => ({
      ...prev,
      [classId]: bundle.levelThresholds || DEFAULT_LEVEL_THRESHOLDS,
    }));
  };

  const loadDashboard = async (userId, classId) => {
    setIsLoadingClassData(true);
    setAppErrorMessage('');

    try {
      const bundle = await fetchBootstrap({ userId, classId });
      setClasses(bundle.classes || []);
      setCurrentClassId(bundle.currentClassId || null);
      syncClassBundle(bundle);
    } catch (error) {
      setAppErrorMessage(error.message);
    } finally {
      setIsLoadingClassData(false);
    }
  };

  const updateCurrentStudent = (student) => {
    if (!currentClassId || !student) {
      return;
    }

    setStudentsByClassId((prev) => ({
      ...prev,
      [currentClassId]: (prev[currentClassId] || []).map((item) =>
        item.id === student.id ? student : item,
      ),
    }));
  };

  const handleLogin = async (credentials) => {
    setIsAuthenticating(true);
    setAuthErrorMessage('');

    try {
      const response = await loginUser(credentials);
      setUser(response.user);
      await loadDashboard(response.user.id, response.currentClassId);
    } catch (error) {
      setAuthErrorMessage(error.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setClasses([]);
    setCurrentClassId(null);
    setStudentsByClassId({});
    setShopItemsByClassId({});
    setRulesByClassId({});
    setLogsByClassId({});
    setThresholdsByClassId({});
    setClassDropdownOpen(false);
    setAuthErrorMessage('');
    setAppErrorMessage('');
  };

  const handleClassSwitch = async (classId) => {
    if (!user || classId === currentClassId) {
      setClassDropdownOpen(false);
      return;
    }

    setClassDropdownOpen(false);
    await loadDashboard(user.id, classId);
  };

  const handleCreateClass = async () => {
    const nextClassName = classNameInput.trim();

    if (!user || !nextClassName) {
      return;
    }

    if (user.level === 'temporary' && classes.length >= 1) {
      window.alert('临时账户只能创建一个班级，请升级账户享用无限特权');
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await createClass({ userId: user.id, name: nextClassName });
      setClasses(response.classes || []);
      setClassNameInput('');
      setIsCreateModalOpen(false);
      await loadDashboard(user.id, response.currentClassId || response.class?.id);
    } catch (error) {
      setAppErrorMessage(error.message);
    } finally {
      setIsMutating(false);
    }
  };

  const handleImportStudents = async (names) => {
    if (!user || !currentClassId) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await importStudents({
        userId: user.id,
        classId: currentClassId,
        names,
      });
      setStudentsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.students || [],
      }));
      setLogsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.logs || [],
      }));
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleCreateStudent = async (name) => {
    if (!user || !currentClassId || !name.trim()) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await createStudent({
        userId: user.id,
        classId: currentClassId,
        name: name.trim(),
      });
      setStudentsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.students || [],
      }));
      setLogsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.logs || [],
      }));
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdateStudent = async ({ student, actionType, detail }) => {
    if (!user || !currentClassId) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await updateStudent({
        userId: user.id,
        classId: currentClassId,
        studentId: student.id,
        updates: student,
        actionType,
        detail,
      });

      updateCurrentStudent(response.student);
      setLogsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.logs || [],
      }));
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleRenameClass = async (newName) => {
    if (!user || !currentClassId || !newName.trim()) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await updateClass({
        userId: user.id,
        classId: currentClassId,
        name: newName.trim(),
      });

      setClasses(response.classes || []);
      setLogsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.logs || [],
      }));
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleRemoveStudent = async (studentId, studentName) => {
    const targetStudent = currentStudents.find((item) => item.id === studentId);

    if (!targetStudent) {
      return;
    }

    await handleUpdateStudent({
      student: { ...targetStudent, archived: true },
      actionType: '学生管理',
      detail: `移除了学生 ${studentName}`,
    });

    setStudentsByClassId((prev) => ({
      ...prev,
      [currentClassId]: (prev[currentClassId] || []).filter((item) => item.id !== studentId),
    }));
  };

  const handleActivatePet = async (student) => {
    await handleUpdateStudent({
      student,
      actionType: '唤醒宠物',
      detail: `为 ${student.name} 唤醒了新宠物 ${student.pet_name}`,
    });
  };

  const handleGraduatePet = async (originalStudent, nextStudent) => {
    await handleUpdateStudent({
      student: nextStudent,
      actionType: '宠物毕业',
      detail: `${originalStudent.name} 的宠物 ${originalStudent.pet_name} 已满级毕业，并获得了一颗新的神秘蛋`,
    });
  };

  const handleInteractStudent = async (originalStudent, rule, updatedStudent) => {
    await handleUpdateStudent({
      student: updatedStudent,
      actionType: '课堂互动',
      detail: `为 ${originalStudent.name} 应用了规则 "${rule.name}" (EXP: ${rule.exp}, 金币: ${rule.coins})`,
    });
  };

  const handleAddShopItem = async (item) => {
    if (!user || !currentClassId) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await createShopItem({
        userId: user.id,
        classId: currentClassId,
        item,
      });
      setShopItemsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.shopItems || [],
      }));
      setLogsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.logs || [],
      }));
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleRedeemShopItem = async (item, studentIds) => {
    if (!user || !currentClassId) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await redeemShopItem({
        userId: user.id,
        classId: currentClassId,
        itemId: item.id,
        studentIds,
      });

      setStudentsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.students || [],
      }));
      setShopItemsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.shopItems || [],
      }));
      setLogsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.logs || [],
      }));

      window.alert(`成功为 ${studentIds.length} 名学生兑换了 ${item.name}`);
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleAddRule = async (rule) => {
    if (!user || !currentClassId) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await createRule({
        userId: user.id,
        classId: currentClassId,
        rule,
      });
      setRulesByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.rules || [],
      }));
      setLogsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.logs || [],
      }));
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!user || !currentClassId) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await deleteRule({
        userId: user.id,
        classId: currentClassId,
        ruleId,
      });
      setRulesByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.rules || [],
      }));
      setLogsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.logs || [],
      }));
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveThresholds = async (thresholds) => {
    if (!user || !currentClassId) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await updateThresholds({
        userId: user.id,
        classId: currentClassId,
        thresholds,
      });
      setThresholdsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.levelThresholds || DEFAULT_LEVEL_THRESHOLDS,
      }));
      setLogsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.logs || [],
      }));
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  if (!user) {
    return (
      <Login
        onLogin={handleLogin}
        isSubmitting={isAuthenticating}
        errorMessage={authErrorMessage}
      />
    );
  }

  return (
    <div className="app-container">
      <nav className="main-nav glass-card">
        <div className="nav-left">
          <div className="class-selector-panel">
            <button
              className="class-selector"
              onClick={() => {
                if (classes.length === 0) {
                  setIsCreateModalOpen(true);
                  return;
                }

                setClassDropdownOpen((prev) => !prev);
              }}
              type="button"
            >
              <div className="class-icon">
                {classes.length === 0 ? <Plus size={18} color="white" /> : <Users size={18} color="white" />}
              </div>
              <span className="class-name">{currentClass?.name || '我的班级'}</span>
              <ChevronDown size={16} className={`arrow ${classDropdownOpen ? 'open' : ''}`} />
            </button>

            {classDropdownOpen && classes.length > 0 && (
              <div className="class-dropdown glass-card">
                {classes.map((classItem) => (
                  <button
                    key={classItem.id}
                    className={`class-option ${classItem.id === currentClassId ? 'active' : ''}`}
                    onClick={() => handleClassSwitch(classItem.id)}
                    type="button"
                  >
                    <span>{classItem.name}</span>
                    {classItem.id === currentClassId && <span className="class-option-tag">当前</span>}
                  </button>
                ))}
                <button
                  className="class-option create"
                  onClick={() => {
                    setClassDropdownOpen(false);
                    setIsCreateModalOpen(true);
                  }}
                  type="button"
                >
                  <Plus size={16} />
                  <span>新建班级</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="nav-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="nav-right">
          <div className="status-chip">
            {isLoadingClassData ? '同步中...' : isMutating ? '保存中...' : currentClass ? '已连接云端' : '等待建班'}
          </div>
          <div className="user-profile">
            <span className="user-name">{user.nickname}</span>
            <span className="user-level">{user.level}</span>
            <button className="logout-btn" onClick={handleLogout} type="button">
              <LogOut size={16} />
            </button>
          </div>
          <button className="batch-action" type="button" onClick={() => setActiveTab('settings')}>
            <span className="batch-icon">⚙️</span>
            <span>总控台</span>
          </button>
        </div>
      </nav>

      {appErrorMessage && <div className="app-error-banner">{appErrorMessage}</div>}

      <main className="content-area">
        <section className="view-container" style={{ width: '100%' }}>
          {activeTab === 'pet' && (
            <PetParadise
              currentClass={currentClass}
              students={currentStudents}
              rules={currentRules}
              levelThresholds={currentThresholds}
              onImportStudents={handleImportStudents}
              onActivatePet={handleActivatePet}
              onGraduatePet={handleGraduatePet}
              onInteractStudent={handleInteractStudent}
            />
          )}

          {activeTab === 'shop' && (
            <MiniShop
              items={currentItems}
              students={currentStudents}
              onAddItem={handleAddShopItem}
              onRedeem={handleRedeemShopItem}
            />
          )}

          {activeTab === 'rank' && <HallOfFame students={currentStudents} />}

          {activeTab === 'toolbox' && <Toolbox user={user} students={currentStudents} />}

          {activeTab === 'settings' && (
            <Settings
              user={user}
              currentClass={currentClass}
              students={currentStudents}
              rules={currentRules}
              logs={currentLogs}
              levelThresholds={currentThresholds}
              onUpdateClass={handleRenameClass}
              onAddStudent={handleCreateStudent}
              onRemoveStudent={handleRemoveStudent}
              onAddRule={handleAddRule}
              onDeleteRule={handleDeleteRule}
              onSaveThresholds={handleSaveThresholds}
            />
          )}
        </section>
      </main>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="创建一个新班级"
      >
        <div className="create-class-form">
          <input
            type="text"
            placeholder="例如：三年级二班"
            className="glass-input"
            value={classNameInput}
            onChange={(event) => setClassNameInput(event.target.value)}
          />
          <div className="modal-footer">
            <button className="cancel-btn" onClick={() => setIsCreateModalOpen(false)} type="button">
              取消
            </button>
            <button className="confirm-btn" onClick={handleCreateClass} type="button" disabled={isMutating}>
              {isMutating ? '创建中...' : '确定建班'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default App;
