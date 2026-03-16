import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { notify } from './lib/notify';
import {
  createClass,
  createRule,
  createShopItem,
  archiveClassStudents,
  deleteStudentsBatch,
  deleteShopItem,
  deleteRule,
  fetchBootstrap,
  importStudents,
  loginUser,
  resetClassProgress,
  redeemShopItem,
  undoLog,
  updatePassword,
  updateRule,
  updateShopItem,
  updateClass,
  updateStudent,
  updateThresholds,
} from './api/client';
import './App.css';

const DEFAULT_LEVEL_THRESHOLDS = [10, 20, 30, 50, 70, 100];
const STORAGE_KEYS = {
  user: 'classPets.user',
  currentClassId: 'classPets.currentClassId',
};

const readStoredUser = () => {
  try {
    const rawUser = window.localStorage.getItem(STORAGE_KEYS.user);
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
};

const readStoredClassId = () => {
  try {
    const rawClassId = window.localStorage.getItem(STORAGE_KEYS.currentClassId);
    return rawClassId ? Number(rawClassId) : null;
  } catch {
    return null;
  }
};

const tabs = [
  { id: 'pet', label: '宠物乐园', icon: <Gamepad2 size={20} /> },
  { id: 'shop', label: '小卖部', icon: <ShoppingBag size={20} /> },
  { id: 'rank', label: '光荣榜', icon: <Trophy size={20} /> },
  { id: 'toolbox', label: '百宝箱', icon: <Briefcase size={20} /> },
  { id: 'settings', label: '系统设置', icon: <SettingsIcon size={20} /> },
];

function App() {
  const [user, setUser] = useState(() => readStoredUser());
  const [activeTab, setActiveTab] = useState('pet');
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [classNameInput, setClassNameInput] = useState('');
  const [classes, setClasses] = useState([]);
  const [currentClassId, setCurrentClassId] = useState(() => readStoredClassId());
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
  const [isRestoringSession, setIsRestoringSession] = useState(() => Boolean(readStoredUser()));
  const [toast, setToast] = useState(null);

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

  const persistSession = useCallback((nextUser, nextClassId = null) => {
    if (!nextUser) {
      window.localStorage.removeItem(STORAGE_KEYS.user);
      window.localStorage.removeItem(STORAGE_KEYS.currentClassId);
      return;
    }

    window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));

    if (nextClassId) {
      window.localStorage.setItem(STORAGE_KEYS.currentClassId, String(nextClassId));
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.currentClassId);
    }
  }, []);

  const loadDashboard = useCallback(async (userId, classId) => {
    setIsLoadingClassData(true);
    setAppErrorMessage('');

    try {
      const bundle = await fetchBootstrap({ userId, classId });
      if (bundle.user) {
        setUser(bundle.user);
      }
      setClasses(bundle.classes || []);
      setCurrentClassId(bundle.currentClassId || null);
      syncClassBundle(bundle);
      persistSession(bundle.user || readStoredUser(), bundle.currentClassId || null);
      return bundle;
    } catch (error) {
      if (error.message?.includes('重新登录') || error.message?.includes('教师账号不存在')) {
        persistSession(null);
        setUser(null);
      }
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsLoadingClassData(false);
    }
  }, [persistSession]);

  useEffect(() => {
    const restoreSession = async () => {
      const savedUser = readStoredUser();
      const savedClassId = readStoredClassId();

      if (!savedUser?.id) {
        setIsRestoringSession(false);
        return;
      }

      try {
        setUser(savedUser);
        await loadDashboard(savedUser.id, savedClassId);
      } catch {
        persistSession(null);
        setUser(null);
        setCurrentClassId(null);
      } finally {
        setIsRestoringSession(false);
      }
    };

    restoreSession();
  }, [loadDashboard, persistSession]);

  useEffect(() => {
    let timer = null;

    const handleNotify = (event) => {
      const detail = event.detail || {};
      setToast({
        id: Date.now(),
        message: detail.message || '',
        type: detail.type || 'success',
      });

      window.clearTimeout(timer);
      timer = window.setTimeout(() => setToast(null), 2600);
    };

    window.addEventListener('app-notify', handleNotify);

    return () => {
      window.removeEventListener('app-notify', handleNotify);
      window.clearTimeout(timer);
    };
  }, []);

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
      persistSession(response.user, response.currentClassId || null);
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
    persistSession(null);
  };

  useEffect(() => {
    if (isCreateModalOpen) {
      setClassDropdownOpen(false);
    }
  }, [isCreateModalOpen]);

  const handleUpdatePassword = async ({ currentPassword, nextPassword }) => {
    if (!user) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      await updatePassword({
        userId: user.id,
        currentPassword,
        nextPassword,
      });
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleClassSwitch = async (classId) => {
    if (!user || classId === currentClassId) {
      setClassDropdownOpen(false);
      return;
    }

    setClassDropdownOpen(false);
    window.localStorage.setItem(STORAGE_KEYS.currentClassId, String(classId));
    await loadDashboard(user.id, classId);
  };

  const handleCreateClass = async () => {
    const nextClassName = classNameInput.trim();

    if (!user || !nextClassName) {
      return;
    }

    if (user.level === 'temporary' && classes.length >= 1) {
      notify('临时账户只能创建一个班级，请升级账户享用无限特权', 'warning');
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await createClass({ userId: user.id, name: nextClassName });
      setClasses(response.classes || []);
      setClassNameInput('');
      setIsCreateModalOpen(false);
      if (response.currentClassId || response.class?.id) {
        window.localStorage.setItem(
          STORAGE_KEYS.currentClassId,
          String(response.currentClassId || response.class?.id),
        );
      }
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

  const handleUpdateStudent = async ({ student, actionType, detail, undoMeta = null }) => {
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
        undoMeta,
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

  const handleBatchRemoveStudents = async (studentIds) => {
    if (!user || !currentClassId || studentIds.length === 0) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await deleteStudentsBatch({
        userId: user.id,
        classId: currentClassId,
        studentIds,
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
      undoMeta: {
        undoable: true,
        kind: 'student-update',
        before: {
          id: originalStudent.id,
          name: originalStudent.name,
          pet_status: originalStudent.pet_status,
          pet_name: originalStudent.pet_name,
          pet_type_id: originalStudent.pet_type_id,
          pet_level: originalStudent.pet_level,
          pet_points: originalStudent.pet_points,
          coins: originalStudent.coins,
          total_exp: originalStudent.total_exp,
          total_coins: originalStudent.total_coins,
          reward_count: originalStudent.reward_count,
          pet_collection: originalStudent.pet_collection || [],
        },
      },
    });
  };

  const handleUndoLog = async (logId) => {
    if (!user || !currentClassId || !logId) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await undoLog({
        userId: user.id,
        classId: currentClassId,
        logId,
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
      notify('已撤销最近一次操作');
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
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

  const handleUpdateShopItem = async (item) => {
    if (!user || !currentClassId) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await updateShopItem({
        userId: user.id,
        classId: currentClassId,
        itemId: item.id,
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

  const handleDeleteShopItem = async (item) => {
    if (!user || !currentClassId) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await deleteShopItem({
        userId: user.id,
        classId: currentClassId,
        itemId: item.id,
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

      notify(`已为 ${studentIds.length} 名学生兑换 ${item.name}`);
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

  const handleUpdateRule = async (rule) => {
    if (!user || !currentClassId) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await updateRule({
        userId: user.id,
        classId: currentClassId,
        ruleId: rule.id,
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

  const handleResetClassProgress = async () => {
    if (!user || !currentClassId) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await resetClassProgress({
        userId: user.id,
        classId: currentClassId,
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

  const handleArchiveClassStudents = async () => {
    if (!user || !currentClassId) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await archiveClassStudents({
        userId: user.id,
        classId: currentClassId,
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

  const handleExportClassData = () => {
    if (!currentClass) {
      return;
    }

    const exportedAt = new Date().toISOString();
    const redemptionLogs = currentLogs.filter((log) => log.actionType === '商品兑换');
    const payload = {
      exportedAt,
      class: currentClass,
      students: currentStudents.map((student) => ({
        id: student.id,
        name: student.name,
        coins: student.coins || 0,
        total_exp: student.total_exp || 0,
        total_coins: student.total_coins || 0,
        pet_status: student.pet_status,
        pet_name: student.pet_name,
        pet_type_id: student.pet_type_id,
        pet_level: student.pet_level || 0,
        pet_points: student.pet_points || 0,
        reward_count: student.reward_count || 0,
        pet_collection: student.pet_collection || [],
      })),
      rules: currentRules,
      levelThresholds: currentThresholds,
      shopItems: currentItems,
      redemptionLogs,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const safeClassName = (currentClass.name || 'class').replace(/[^\w\u4e00-\u9fa5-]+/g, '-');

    anchor.href = url;
    anchor.download = `${safeClassName}-export-${exportedAt.slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    notify(`已导出 ${currentClass.name} 的班级数据`);
  };

  if (isRestoringSession) {
    return (
      <div className="login-page">
        <div className="login-card glass-card">
          <p className="login-hint">正在恢复登录状态...</p>
        </div>
      </div>
    );
  }

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
        </div>
      </nav>

      {appErrorMessage && <div className="app-error-banner">{appErrorMessage}</div>}
      {toast && <div className={`app-toast ${toast.type}`}>{toast.message}</div>}

      <main className="content-area">
        <section className="view-container" style={{ width: '100%' }}>
          {activeTab === 'pet' && (
            <PetParadise
              currentClass={currentClass}
              students={currentStudents}
              rules={currentRules}
              logs={currentLogs}
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
              logs={currentLogs}
              onAddItem={handleAddShopItem}
              onUpdateItem={handleUpdateShopItem}
              onDeleteItem={handleDeleteShopItem}
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
              onImportStudents={handleImportStudents}
              onRemoveStudent={handleRemoveStudent}
              onBatchRemoveStudents={handleBatchRemoveStudents}
              onAddRule={handleAddRule}
              onUpdateRule={handleUpdateRule}
              onDeleteRule={handleDeleteRule}
              onSaveThresholds={handleSaveThresholds}
              onUpdateStudent={(student, actionType, detail) =>
                handleUpdateStudent({ student, actionType, detail })
              }
              onUpdatePassword={handleUpdatePassword}
              onResetClassProgress={handleResetClassProgress}
              onArchiveClassStudents={handleArchiveClassStudents}
              onUndoLog={handleUndoLog}
              onExportClassData={handleExportClassData}
              isMutating={isMutating}
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
