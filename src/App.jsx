import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Briefcase,
  ChevronDown,
  Gamepad2,
  HelpCircle,
  LogOut,
  Plus,
  Settings as SettingsIcon,
  Shield,
  ShoppingBag,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import UserGuide from './components/Common/UserGuide';
import Login from './components/Login/Login';
import Modal from './components/Common/Modal';
import PetParadise from './components/PetParadise/PetParadise';
import MiniShop from './components/Shop/MiniShop';
import HallOfFame from './components/Rank/HallOfFame';
import Toolbox from './components/Toolbox/Toolbox';
import Settings from './components/Settings/Settings';
import AdminConsole from './components/Admin/AdminConsole';
import { notify } from './lib/notify';
import { setSoundPreferences } from './lib/sounds';
import { setVoiceEnabled } from './lib/voice';
import {
  createAdminCodesBatch,
  createAdminRegisterChannel,
  createAdminCode,
  createClass,
  createRule,
  feedStudentsBatch,
  createShopItem,
  archiveClassStudents,
  deleteStudentsBatch,
  deleteShopItem,
  deleteRule,
  moveRule,
  importRules,
  fetchAdminCodes,
  fetchAdminLogs,
  fetchAdminRegisterChannels,
  fetchAdminUsers,
  fetchBootstrap,
  fetchFreeRegisterConfig,
  importStudents,
  loginUser,
  resetClassProgress,
  redeemShopItem,
  resetAdminUserPassword,
  revokeAdminCodesBatch,
  undoLog,
  updatePassword,
  updateFreeRegisterConfig,
  updateAdminCodesBatch,
  updateAdminCode,
  updateAdminUsersBatch,
  updateAdminUser,
  updateAdminRegisterChannel,
  updateRule,
  updateShopItem,
  updateSmartSeatingConfig,
  updateToolboxAccessConfig,
  updateClass,
  updateStudent,
  updateThresholds,
  fetchNotifications,
  fetchPublicCustomPets,
  markNotificationRead,
  markAllNotificationsRead,
  fetchMyFeedback,
  fetchFeedbackDetail,
  replyFeedback,
  deleteMyFeedback,
} from './api/client';
import { setCustomPetsCache } from './api/petLibrary';
import FeedbackList from './components/Feedback/FeedbackList';
import FeedbackForm from './components/Feedback/FeedbackForm';
import FeedbackDetail from './components/Feedback/FeedbackDetail';
import './App.css';

const DEFAULT_LEVEL_THRESHOLDS = [10, 20, 30, 50, 70, 100];
const DEFAULT_PET_CONDITION_CONFIG = {
  enabled: true,
  skip_weekends: true,
  pause_start_date: null,
  pause_end_date: null,
  hungry_days: 2,
  weak_days: 4,
  sleeping_days: 7,
  hungry_decay: 0,
  weak_decay: 1,
  sleeping_decay: 2,
};
const STORAGE_KEYS = {
  user: 'classPets.user',
  currentClassId: 'classPets.currentClassId',
  theme: 'classPets.theme',
  density: 'classPets.density',
  soundEnabled: 'classPets.soundEnabled',
  soundVolume: 'classPets.soundVolume',
  voiceEnabled: 'classPets.voiceEnabled',
};

const THEME_OPTIONS = [
  { id: 'fresh', name: '清新课堂' },
  { id: 'cream', name: '奶油活力' },
  { id: 'night', name: '夜空专注' },
  { id: 'forest', name: '森林成长' },
];

const DENSITY_OPTIONS = [
  { id: 'cozy', name: '舒展' },
  { id: 'compact', name: '紧凑' },
];

const MEMBERSHIP_LABELS = {
  temporary: '临时体验',
  vip1: '会员一级',
  vip2: '会员二级',
  permanent: '永久会员',
};
const DEFAULT_TOOLBOX_ACCESS = {
  random: 'temporary',
  timer: 'temporary',
  smart_seating: 'vip2',
  read_forest: 'vip2',
  mic_power: 'vip2',
  angry_tiger: 'vip2',
  reading_challenge: 'vip2',
  quiet_study: 'vip2',
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

const readStoredTheme = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.theme) || 'fresh';
  } catch {
    return 'fresh';
  }
};

const readStoredDensity = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.density) || 'cozy';
  } catch {
    return 'cozy';
  }
};

const readStoredSoundEnabled = () => {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEYS.soundEnabled);
    return rawValue === null ? true : rawValue === 'true';
  } catch {
    return true;
  }
};

const readStoredSoundVolume = () => {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEYS.soundVolume);
    const parsed = rawValue === null ? 0.8 : Number(rawValue);
    return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.8;
  } catch {
    return 0.8;
  }
};

const readStoredVoiceEnabled = () => {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEYS.voiceEnabled);
    return rawValue === null ? false : rawValue === 'true';
  } catch {
    return false;
  }
};

const tabs = [
  { id: 'pet', label: '宠物乐园', icon: <Gamepad2 size={20} /> },
  { id: 'shop', label: '小卖部', icon: <ShoppingBag size={20} /> },
  { id: 'rank', label: '光荣榜', icon: <Trophy size={20} /> },
  { id: 'toolbox', label: '百宝箱', icon: <Briefcase size={20} /> },
  { id: 'settings', label: '系统设置', icon: <SettingsIcon size={20} /> },
];
const ADMIN_TAB = { id: 'admin', label: '超管后台', icon: <Shield size={20} /> };

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
  const [petConditionConfigsByClassId, setPetConditionConfigsByClassId] = useState({});
  const [seatingConfigsByClassId, setSeatingConfigsByClassId] = useState({});
  const [lastBulkFedAtByClassId, setLastBulkFedAtByClassId] = useState({});
  const [authErrorMessage, setAuthErrorMessage] = useState('');
  const [appErrorMessage, setAppErrorMessage] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoadingClassData, setIsLoadingClassData] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(() => Boolean(readStoredUser()));
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState(() => readStoredTheme());
  const [density, setDensity] = useState(() => readStoredDensity());
  const [soundEnabled, setSoundEnabled] = useState(() => readStoredSoundEnabled());
  const [soundVolume, setSoundVolume] = useState(() => readStoredSoundVolume());
  const [voiceEnabled, setVoiceEnabledState] = useState(() => readStoredVoiceEnabled());
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminCodes, setAdminCodes] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [adminRegisterChannels, setAdminRegisterChannels] = useState([]);
  const [freeRegisterConfig, setFreeRegisterConfig] = useState({
    enabled: false,
    is_active: false,
    mode: 'permanent',
    end_at: null,
    default_level: 'temporary',
    updated_at: null,
  });
  const [toolboxAccessConfig, setToolboxAccessConfig] = useState(DEFAULT_TOOLBOX_ACCESS);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const notifPanelRef = useRef(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  // 反馈工单（教师端）
  const [notifTab, setNotifTab] = useState('notif'); // 'notif' | 'feedback'
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [feedbackUnread, setFeedbackUnread] = useState(0);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [selectedFeedbackTicket, setSelectedFeedbackTicket] = useState(null);
  const [feedbackDetailMessages, setFeedbackDetailMessages] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackDetailError, setFeedbackDetailError] = useState('');

  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    tone: 'default',
    confirmLabel: '确认',
    cancelLabel: '取消',
    requireMatch: '',
    matchLabel: '',
    matchPlaceholder: '',
    inputValue: '',
    resolver: null,
  });

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
  const currentPetConditionConfig = currentClassId
    ? petConditionConfigsByClassId[currentClassId] || DEFAULT_PET_CONDITION_CONFIG
    : DEFAULT_PET_CONDITION_CONFIG;
  const currentSeatingConfig = currentClassId ? seatingConfigsByClassId[currentClassId] || null : null;
  const currentLastBulkFedAt = currentClassId ? lastBulkFedAtByClassId[currentClassId] || null : null;
  const isSuperAdmin = user?.role === 'super_admin';
  const membershipLabel = user?.level ? MEMBERSHIP_LABELS[user.level] || user.level : '';
  const visibleTabs = useMemo(
    () => (isSuperAdmin ? [...tabs, ADMIN_TAB] : tabs),
    [isSuperAdmin],
  );

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
    setPetConditionConfigsByClassId((prev) => ({
      ...prev,
      [classId]: bundle.petConditionConfig || DEFAULT_PET_CONDITION_CONFIG,
    }));
    setSeatingConfigsByClassId((prev) => ({
      ...prev,
      [classId]: bundle.smartSeatingConfig || null,
    }));
    setLastBulkFedAtByClassId((prev) => ({
      ...prev,
      [classId]: bundle.lastBulkFedAt || null,
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
      setToolboxAccessConfig(bundle.toolboxAccess || DEFAULT_TOOLBOX_ACCESS);
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

  // 加载通知 + 反馈列表
  const loadMyFeedback = useCallback(async () => {
    if (!user?.id) return;
    try {
      setFeedbackLoading(true);
      const res = await fetchMyFeedback({ userId: user.id });
      setMyFeedbacks(res?.tickets || []);
      setFeedbackUnread(res?.unread_count || 0);
    } catch (e) {
      console.error('[DEBUG] fetchMyFeedback failed:', e);
    } finally {
      setFeedbackLoading(false);
    }
  }, [user?.id]);

  const loadCustomPets = useCallback(async () => {
    try {
      const res = await fetchPublicCustomPets();
      setCustomPetsCache(res?.pets || []);
    } catch {
      setCustomPetsCache([]);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetchNotifications({ userId: user.id });
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch {
      // silent
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setMyFeedbacks([]);
      setFeedbackUnread(0);
      setCustomPetsCache([]);
      return;
    }
    Promise.allSettled([
      loadNotifications(),
      loadMyFeedback(),
      loadCustomPets(),
    ]);
  }, [user?.id, loadCustomPets, loadMyFeedback, loadNotifications]);

  const handleMarkRead = useCallback(async (notif) => {
    if (notif.is_read) return;
    try {
      await markNotificationRead({ userId: user.id, notificationId: notif.id });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  }, [user?.id]);

  const handleMarkAllRead = useCallback(async () => {
    if (!user?.id || unreadCount === 0) return;
    try {
      await markAllNotificationsRead({ userId: user.id });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  }, [user?.id, unreadCount]);

  const handleOpenNotif = useCallback((notif) => {
    setSelectedNotif(notif);
    setShowNotifPanel(false);
    if (!notif.is_read) handleMarkRead(notif);
  }, [handleMarkRead]);

  // ─── 反馈工单 ───────────────────────────────────────
  const handleOpenFeedbackTicket = useCallback(async (ticket) => {
    if (!user?.id) return;
    try {
      setShowNotifPanel(false);
      setFeedbackDetailError('');
      setSelectedFeedbackTicket(ticket);
      setFeedbackDetailMessages([]);
      const detail = await fetchFeedbackDetail({ userId: user.id, ticketId: ticket.id });
      setSelectedFeedbackTicket(detail.ticket);
      setFeedbackDetailMessages(detail.messages || []);
      // 本地清除该工单的未读标记
      setMyFeedbacks((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, user_has_unread_reply: false } : t)),
      );
      if (ticket.user_has_unread_reply) {
        setFeedbackUnread((prev) => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error('[DEBUG] fetchFeedbackDetail failed:', e);
      setFeedbackDetailError(e?.message || '加载详情失败');
    }
  }, [user?.id]);

  const handleCloseFeedbackDetail = useCallback(() => {
    setSelectedFeedbackTicket(null);
    setFeedbackDetailMessages([]);
    setFeedbackDetailError('');
    // 刷新列表，拿到最新的消息数 / 更新时间
    loadMyFeedback();
  }, [loadMyFeedback]);

  const handleReplyFeedback = useCallback(async ({ content, imageData }) => {
    if (!user?.id || !selectedFeedbackTicket) return;
    await replyFeedback({
      userId: user.id,
      ticketId: selectedFeedbackTicket.id,
      content,
      imageData,
    });
    // 重新加载详情以显示新消息
    const detail = await fetchFeedbackDetail({
      userId: user.id,
      ticketId: selectedFeedbackTicket.id,
    });
    setSelectedFeedbackTicket(detail.ticket);
    setFeedbackDetailMessages(detail.messages || []);
  }, [user?.id, selectedFeedbackTicket]);

  const handleOpenFeedbackForm = useCallback(() => {
    setShowHelpModal(false);
    setShowNotifPanel(false);
    setShowFeedbackForm(true);
  }, []);

  const handleFeedbackCreated = useCallback(() => {
    setShowFeedbackForm(false);
    setNotifTab('feedback');
    loadMyFeedback();
  }, [loadMyFeedback]);

  const handleDeleteMyFeedback = useCallback(async (ticketId) => {
    if (!user?.id) return;
    const confirmed = window.confirm('确认删除这条已关闭的反馈工单？删除后聊天记录也会一起移除。');
    if (!confirmed) return;

    try {
      const deletingTicket = myFeedbacks.find((t) => t.id === ticketId);
      await deleteMyFeedback({ userId: user.id, ticketId });
      setMyFeedbacks((prev) => prev.filter((t) => t.id !== ticketId));
      if (deletingTicket?.user_has_unread_reply) {
        setFeedbackUnread((prev) => Math.max(0, prev - 1));
      }
      if (selectedFeedbackTicket?.id === ticketId) {
        setSelectedFeedbackTicket(null);
        setFeedbackDetailMessages([]);
        setFeedbackDetailError('');
      }
    } catch (e) {
      alert(e?.message || '删除失败');
    }
  }, [myFeedbacks, selectedFeedbackTicket?.id, user?.id]);

  const totalUnreadBadge = unreadCount + feedbackUnread;

  // 点击通知面板外部关闭
  useEffect(() => {
    if (!showNotifPanel) return;
    const handler = (e) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifPanel]);

  useEffect(() => {
    const loadFreeRegisterConfig = async () => {
      try {
        const response = await fetchFreeRegisterConfig();
        setFreeRegisterConfig(response.freeRegister || {
          enabled: false,
          is_active: false,
          mode: 'permanent',
          end_at: null,
          default_level: 'temporary',
          updated_at: null,
        });
      } catch {
        setFreeRegisterConfig({
          enabled: false,
          is_active: false,
          mode: 'permanent',
          end_at: null,
          default_level: 'temporary',
          updated_at: null,
        });
      }
    };

    loadFreeRegisterConfig();
  }, []);

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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
    window.localStorage.setItem(STORAGE_KEYS.density, density);
  }, [density]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.soundEnabled, String(soundEnabled));
    window.localStorage.setItem(STORAGE_KEYS.soundVolume, String(soundVolume));
    setSoundPreferences({ enabled: soundEnabled, volume: soundVolume });
  }, [soundEnabled, soundVolume]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.voiceEnabled, String(voiceEnabled));
    setVoiceEnabled(voiceEnabled);
  }, [voiceEnabled]);

  const requestConfirm = useCallback((options) => new Promise((resolve) => {
    setConfirmState({
      isOpen: true,
      title: options?.title || '确认操作',
      message: options?.message || '',
      tone: options?.tone || 'default',
      confirmLabel: options?.confirmLabel || '确认',
      cancelLabel: options?.cancelLabel || '取消',
      requireMatch: options?.requireMatch || '',
      matchLabel: options?.matchLabel || '',
      matchPlaceholder: options?.matchPlaceholder || '',
      inputValue: '',
      resolver: resolve,
    });
  }), []);

  const closeConfirm = useCallback((confirmed) => {
    setConfirmState((prev) => {
      prev.resolver?.(confirmed);
      return {
        isOpen: false,
        title: '',
        message: '',
        tone: 'default',
        confirmLabel: '确认',
        cancelLabel: '取消',
        requireMatch: '',
        matchLabel: '',
        matchPlaceholder: '',
        inputValue: '',
        resolver: null,
      };
    });
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
    setPetConditionConfigsByClassId({});
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

  const handleSaveSmartSeatingConfig = async (config) => {
    if (!user || !currentClassId) {
      throw new Error('请先选择班级后再保存');
    }

    const response = await updateSmartSeatingConfig({
      userId: user.id,
      classId: currentClassId,
      config,
    });

    setSeatingConfigsByClassId((prev) => ({
      ...prev,
      [currentClassId]: response.smartSeatingConfig || null,
    }));

    if (response.logs) {
      setLogsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.logs,
      }));
    }

    return response.smartSeatingConfig || null;
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

  const handleUpdateStudent = async ({ student, actionType, detail, undoMeta = null, studentLog = null }) => {
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
        studentLog,
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
      studentLog: {
        classId: currentClassId,
        studentId: student.id,
        action: 'system',
        ruleName: `成功孵化：${student.pet_name}！`,
        ruleIcon: '🥚',
        expDelta: 0,
        coinsDelta: 0,
        expAfter: student.total_exp || 0,
        coinsAfter: student.coins || 0,
        levelAfter: student.pet_level || 1,
      }
    });
  };

  const handleGraduatePet = async (originalStudent, nextStudent) => {
    await handleUpdateStudent({
      student: nextStudent,
      actionType: '宠物毕业',
      detail: `${originalStudent.name} 的宠物 ${originalStudent.pet_name} 已满级毕业，并获得了一颗新的神秘蛋`,
      studentLog: {
        classId: currentClassId,
        studentId: nextStudent.id,
        action: 'system',
        ruleName: `恭喜毕业：${originalStudent.pet_name}已收录！`,
        ruleIcon: '🎓',
        expDelta: 0,
        coinsDelta: 0,
        expAfter: nextStudent.total_exp || 0,
        coinsAfter: nextStudent.coins || 0,
        levelAfter: nextStudent.pet_level || 0,
      }
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
          pet_condition: originalStudent.pet_condition,
          last_fed_at: originalStudent.last_fed_at,
          last_decay_at: originalStudent.last_decay_at,
          pet_condition_locked_at: originalStudent.pet_condition_locked_at,
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
      studentLog: {
        classId: currentClass.id,
        studentId: originalStudent.id,
        action: 'interact',
        ruleName: rule.name,
        ruleIcon: rule.icon,
        expDelta: rule.exp,
        coinsDelta: rule.coins,
        expAfter: updatedStudent.total_exp,
        coinsAfter: updatedStudent.coins,
        levelAfter: updatedStudent.pet_level,
      }
    });
  };

  const handleFeedStudentsBatch = async (studentIds, rule = null, options = {}) => {
    if (!user || !currentClassId || studentIds.length === 0) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await feedStudentsBatch({
        userId: user.id,
        classId: currentClassId,
        studentIds,
        rule,
        dailyBulkFeed: Boolean(options.dailyBulkFeed),
      });

      setStudentsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.students || [],
      }));
      setLogsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.logs || [],
      }));
      if (response.lastBulkFedAt !== undefined) {
        setLastBulkFedAtByClassId((prev) => ({
          ...prev,
          [currentClassId]: response.lastBulkFedAt || null,
        }));
      }
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleStudentGroupsUpdated = (response) => {
    if (!currentClassId) {
      return;
    }

    if (response?.students) {
      setStudentsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.students || [],
      }));
    }

    if (response?.logs) {
      setLogsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.logs || [],
      }));
    }
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

  const handleMoveRule = async (ruleId, direction) => {
    if (!user || !currentClassId) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await moveRule({
        userId: user.id,
        classId: currentClassId,
        ruleId,
        direction,
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

  const handleImportRules = async ({ sourceClassId, mode }) => {
    if (!user || !currentClassId || !sourceClassId) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const response = await importRules({
        userId: user.id,
        classId: currentClassId,
        sourceClassId,
        mode,
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

  const handleSaveThresholds = async ({ thresholds, petConditionConfig }) => {
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
        petConditionConfig,
      });
      setThresholdsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.levelThresholds || DEFAULT_LEVEL_THRESHOLDS,
      }));
      setPetConditionConfigsByClassId((prev) => ({
        ...prev,
        [currentClassId]: response.petConditionConfig || DEFAULT_PET_CONDITION_CONFIG,
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
    const redemptionLogs = currentLogs.filter((log) => (log.actionType || log.action) === '商品兑换');
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
        pet_condition: student.pet_condition,
        last_fed_at: student.last_fed_at || null,
        last_decay_at: student.last_decay_at || null,
        pet_name: student.pet_name,
        pet_type_id: student.pet_type_id,
        pet_level: student.pet_level || 0,
        pet_points: student.pet_points || 0,
        reward_count: student.reward_count || 0,
        pet_collection: student.pet_collection || [],
      })),
      rules: currentRules,
      levelThresholds: currentThresholds,
      petConditionConfig: currentPetConditionConfig,
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

  const refreshAdminConsole = useCallback(async () => {
    if (!user || user.role !== 'super_admin') {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');

    try {
      const [usersResponse, codesResponse, logsResponse, freeRegisterResponse, channelsResponse] = await Promise.all([
        fetchAdminUsers({ userId: user.id }),
        fetchAdminCodes({ userId: user.id }),
        fetchAdminLogs({ userId: user.id }),
        fetchFreeRegisterConfig(),
        fetchAdminRegisterChannels({ userId: user.id }),
      ]);
      setAdminUsers(usersResponse.users || []);
      setAdminCodes(codesResponse.activationCodes || []);
      setAdminLogs(logsResponse.logs || []);
      setFreeRegisterConfig((prev) => freeRegisterResponse.freeRegister || prev);
      setAdminRegisterChannels(channelsResponse.channels || []);
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  }, [user]);

  const handleAdminUpdateFreeRegisterConfig = async (payload) => {
    if (!user || !isSuperAdmin) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');
    try {
      const response = await updateFreeRegisterConfig({ userId: user.id, ...payload });
      setFreeRegisterConfig(response.freeRegister || freeRegisterConfig);
      notify('免激活注册配置已更新');
      await refreshAdminConsole();
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleAdminUpdateToolboxAccessConfig = async (config) => {
    if (!user || !isSuperAdmin) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');
    try {
      const response = await updateToolboxAccessConfig({ userId: user.id, config });
      setToolboxAccessConfig(response.toolboxAccess || DEFAULT_TOOLBOX_ACCESS);
      notify('百宝箱权限配置已更新');
      await refreshAdminConsole();
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleAdminCreateRegisterChannel = async (channel) => {
    if (!user || !isSuperAdmin) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');
    try {
      const response = await createAdminRegisterChannel({ userId: user.id, channel });
      setAdminRegisterChannels(response.channels || []);
      notify('注册渠道已创建');
      await refreshAdminConsole();
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleAdminUpdateRegisterChannel = async (channelId, channel) => {
    if (!user || !isSuperAdmin) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');
    try {
      const response = await updateAdminRegisterChannel({ userId: user.id, channelId, channel });
      setAdminRegisterChannels(response.channels || []);
      notify('注册渠道已更新');
      await refreshAdminConsole();
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin' && isSuperAdmin) {
      refreshAdminConsole();
    }
  }, [activeTab, isSuperAdmin, refreshAdminConsole]);

  useEffect(() => {
    if (!isSuperAdmin && activeTab === 'admin') {
      setActiveTab('pet');
    }
  }, [activeTab, isSuperAdmin]);

  const handleAdminUpdateUser = async (targetUserId, updates) => {
    if (!user || !isSuperAdmin) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');
    try {
      await updateAdminUser({ userId: user.id, targetUserId, updates });
      await refreshAdminConsole();
      const nextSelf = targetUserId === user.id ? { ...user, ...updates } : null;
      if (nextSelf) {
        setUser(nextSelf);
        persistSession(nextSelf, currentClassId);
      }
      notify('账号信息已更新');
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleAdminResetUserPassword = async (targetUserId, nextPassword) => {
    if (!user || !isSuperAdmin) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');
    try {
      await resetAdminUserPassword({ userId: user.id, targetUserId, nextPassword });
      notify('密码已重置');
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleAdminCreateCode = async (payload) => {
    if (!user || !isSuperAdmin) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');
    try {
      await createAdminCode({ userId: user.id, ...payload });
      await refreshAdminConsole();
      notify('激活码已创建');
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleAdminCreateCodesBatch = async (payload) => {
    if (!user || !isSuperAdmin) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');
    try {
      const response = await createAdminCodesBatch({ userId: user.id, ...payload });
      const createdCodes = Array.isArray(response.createdCodes) ? response.createdCodes : [];

      if (createdCodes.length > 0) {
        const clipboardText = createdCodes.join('\n');

        try {
          await navigator.clipboard.writeText(clipboardText);
          notify(`已批量生成 ${createdCodes.length} 个激活码，并复制到剪贴板`);
        } catch {
          notify(`已批量生成 ${createdCodes.length} 个激活码，但复制到剪贴板失败`, 'warning');
        }
      } else {
        notify('批量生成已完成，但没有返回激活码内容', 'warning');
      }

      await refreshAdminConsole();
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleAdminUpdateCode = async (codeId, updates) => {
    if (!user || !isSuperAdmin) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');
    try {
      await updateAdminCode({ userId: user.id, codeId, updates });
      await refreshAdminConsole();
      notify('激活码已更新');
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleAdminBatchUpdateUsers = async (userIds, updates) => {
    if (!user || !isSuperAdmin || userIds.length === 0) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');
    try {
      await updateAdminUsersBatch({ userId: user.id, userIds, updates });
      await refreshAdminConsole();
      if (userIds.includes(user.id)) {
        const nextSelf = { ...user, ...updates };
        setUser(nextSelf);
        persistSession(nextSelf, currentClassId);
      }
      notify(`已批量更新 ${userIds.length} 个账号`);
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleAdminBatchUpdateCodes = async (codeIds, updates) => {
    if (!user || !isSuperAdmin || codeIds.length === 0) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');
    try {
      await updateAdminCodesBatch({ userId: user.id, codeIds, updates });
      await refreshAdminConsole();
      notify(`已批量更新 ${codeIds.length} 个激活码`);
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const handleAdminBatchRevokeCodes = async (codeIds) => {
    if (!user || !isSuperAdmin || codeIds.length === 0) {
      return;
    }

    const confirmed = await requestConfirm({
      title: '批量作废激活码',
      message: `确定要批量作废这 ${codeIds.length} 个激活码吗？作废后这些激活码将无法再用于注册。`,
      tone: 'danger',
      confirmLabel: '确认作废',
    });

    if (!confirmed) {
      return;
    }

    setIsMutating(true);
    setAppErrorMessage('');
    try {
      await revokeAdminCodesBatch({ userId: user.id, codeIds });
      await refreshAdminConsole();
      notify(`已作废 ${codeIds.length} 个激活码`);
    } catch (error) {
      setAppErrorMessage(error.message);
      throw error;
    } finally {
      setIsMutating(false);
    }
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
        freeRegisterConfig={freeRegisterConfig}
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
          {visibleTabs.map((tab) => (
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

          {/* 使用说明按钮 */}
          <button
            className="notif-bell-btn help-btn"
            onClick={() => setShowHelpModal(true)}
            type="button"
            title="使用说明"
          >
            <HelpCircle size={18} />
          </button>

          {/* 通知铃铛 */}
          <div className="notif-bell-wrap" ref={notifPanelRef}>
            <button
              className="notif-bell-btn"
              onClick={() => setShowNotifPanel((prev) => !prev)}
              type="button"
              title="通知"
            >
              <Bell size={18} />
              {totalUnreadBadge > 0 && (
                <span className="notif-badge">{totalUnreadBadge > 99 ? '99+' : totalUnreadBadge}</span>
              )}
            </button>

            {showNotifPanel && (
              <div className="notif-panel glass-card">
                <div className="notif-panel-tabs">
                  <button
                    type="button"
                    className={`notif-panel-tab ${notifTab === 'notif' ? 'active' : ''}`}
                    onClick={() => setNotifTab('notif')}
                  >
                    系统通知{unreadCount > 0 ? ` (${unreadCount})` : ''}
                  </button>
                  <button
                    type="button"
                    className={`notif-panel-tab ${notifTab === 'feedback' ? 'active' : ''}`}
                    onClick={() => setNotifTab('feedback')}
                  >
                    我的反馈{feedbackUnread > 0 ? ` (${feedbackUnread})` : ''}
                  </button>
                </div>

                {notifTab === 'notif' ? (
                  <>
                    <div className="notif-panel-header">
                      <strong>通知</strong>
                      {unreadCount > 0 && (
                        <button className="notif-mark-all" onClick={handleMarkAllRead} type="button">
                          全部已读
                        </button>
                      )}
                    </div>
                    <div className="notif-panel-list">
                      {notifications.length === 0 ? (
                        <div className="notif-empty">暂无通知</div>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            className={`notif-item ${n.is_read ? '' : 'unread'}`}
                            onClick={() => handleOpenNotif(n)}
                            type="button"
                          >
                            <div className="notif-item-top">
                              <span className="notif-item-title">{n.title}</span>
                            </div>
                            <span className="notif-item-time">
                              {new Date(n.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="notif-panel-feedback">
                    <FeedbackList
                      tickets={myFeedbacks}
                      loading={feedbackLoading}
                      onSelect={handleOpenFeedbackTicket}
                      onCreate={handleOpenFeedbackForm}
                      onDelete={handleDeleteMyFeedback}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="user-profile">
            <span className="user-name">{user.nickname}</span>
            <span className="user-level">{membershipLabel}</span>
            <button className="logout-btn" onClick={handleLogout} type="button">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* 通知详情弹框 */}
      {selectedNotif && (
        <div className="modal-overlay" onClick={() => setSelectedNotif(null)}>
          <div className="notif-detail-modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="notif-detail-header">
              <h3>{selectedNotif.title}</h3>
              <button className="icon-btn" onClick={() => setSelectedNotif(null)} type="button">
                <X size={18} />
              </button>
            </div>
            <div className="notif-detail-meta">
              <span className="notif-detail-time">
                {new Date(selectedNotif.created_at).toLocaleString('zh-CN')}
              </span>
            </div>
            <div className="notif-detail-body">
              {selectedNotif.type === 'image' && selectedNotif.image_url && (
                <img
                  src={selectedNotif.image_url}
                  alt={selectedNotif.title}
                  className="notif-detail-img"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              {selectedNotif.type === 'html' && selectedNotif.html_content ? (
                <div
                  className="notif-html-content"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedNotif.html_content) }}
                />
              ) : null}
              {selectedNotif.type !== 'html' && selectedNotif.content && (
                <p className="notif-text-content">{selectedNotif.content}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 使用说明弹框 */}
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="notif-detail-modal glass-card help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notif-detail-header">
              <h3 style={{ margin: 0 }}>使用说明</h3>
              <button className="icon-btn" onClick={() => setShowHelpModal(false)} type="button">
                <X size={18} />
              </button>
            </div>
            <div className="notif-detail-body">
              <UserGuide variant="modal" onOpenFeedback={handleOpenFeedbackForm} />
            </div>
          </div>
        </div>
      )}

      {/* 反馈提交弹框 */}
      {showFeedbackForm && user && (
        <div className="modal-overlay" onClick={() => setShowFeedbackForm(false)}>
          <div
            className="notif-detail-modal glass-card help-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="notif-detail-header">
              <h3 style={{ margin: 0 }}>提交反馈</h3>
              <button
                className="icon-btn"
                onClick={() => setShowFeedbackForm(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="notif-detail-body">
              <FeedbackForm
                userId={user.id}
                onCreated={handleFeedbackCreated}
                onCancel={() => setShowFeedbackForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 反馈详情弹框（教师端） */}
      {selectedFeedbackTicket && user && (
        <div className="modal-overlay" onClick={handleCloseFeedbackDetail}>
          <div
            className="notif-detail-modal glass-card help-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="notif-detail-header">
              <h3 style={{ margin: 0, fontSize: 16 }}>
                反馈详情 #{selectedFeedbackTicket.id}
              </h3>
              <button
                className="icon-btn"
                onClick={handleCloseFeedbackDetail}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="notif-detail-body">
              {feedbackDetailError ? (
                <div className="feedback-form-error">{feedbackDetailError}</div>
              ) : (
                <FeedbackDetail
                  ticket={selectedFeedbackTicket}
                  messages={feedbackDetailMessages}
                  role="user"
                  onReply={handleReplyFeedback}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {appErrorMessage && <div className="app-error-banner">{appErrorMessage}</div>}
      {toast && <div className={`app-toast ${toast.type}`}>{toast.message}</div>}

      <main className="content-area">
        <section className="view-container" style={{ width: '100%' }}>
          {activeTab === 'pet' && (
            <PetParadise
              currentUser={user}
              currentClass={currentClass}
              students={currentStudents}
              rules={currentRules}
              logs={currentLogs}
              levelThresholds={currentThresholds}
              petConditionConfig={currentPetConditionConfig}
              voiceEnabled={voiceEnabled}
              lastBulkFedAt={currentLastBulkFedAt}
              onImportStudents={handleImportStudents}
              onActivatePet={handleActivatePet}
              onGraduatePet={handleGraduatePet}
              onInteractStudent={handleInteractStudent}
              onFeedStudentsBatch={handleFeedStudentsBatch}
              onStudentGroupsUpdated={handleStudentGroupsUpdated}
              onRequestConfirm={requestConfirm}
            />
          )}

          {activeTab === 'shop' && (
            <MiniShop
              items={currentItems}
              students={currentStudents}
              logs={currentLogs}
              onRequestConfirm={requestConfirm}
              onAddItem={handleAddShopItem}
              onUpdateItem={handleUpdateShopItem}
              onDeleteItem={handleDeleteShopItem}
              onRedeem={handleRedeemShopItem}
            />
          )}

          {activeTab === 'rank' && <HallOfFame students={currentStudents} currentClass={currentClass} />}

          {activeTab === 'toolbox' && (
            <Toolbox
              user={user}
              currentClass={currentClass}
              students={currentStudents}
              onFeedStudentsBatch={handleFeedStudentsBatch}
              onRequestConfirm={requestConfirm}
              savedSmartSeatingConfig={currentSeatingConfig}
              onSaveSmartSeatingConfig={handleSaveSmartSeatingConfig}
              toolboxAccessConfig={toolboxAccessConfig}
            />
          )}

          {activeTab === 'settings' && (
            <Settings
              user={user}
              classes={classes}
              theme={theme}
              themeOptions={THEME_OPTIONS}
              density={density}
              densityOptions={DENSITY_OPTIONS}
              soundEnabled={soundEnabled}
              soundVolume={soundVolume}
              voiceEnabled={voiceEnabled}
              currentClass={currentClass}
              students={currentStudents}
              rules={currentRules}
              logs={currentLogs}
              levelThresholds={currentThresholds}
              petConditionConfig={currentPetConditionConfig}
              onUpdateClass={handleRenameClass}
              onImportStudents={handleImportStudents}
              onRemoveStudent={handleRemoveStudent}
              onBatchRemoveStudents={handleBatchRemoveStudents}
              onAddRule={handleAddRule}
              onUpdateRule={handleUpdateRule}
              onDeleteRule={handleDeleteRule}
              onMoveRule={handleMoveRule}
              onImportRules={handleImportRules}
              onSaveThresholds={handleSaveThresholds}
              onUpdateStudent={(student, actionType, detail, undoMeta, studentLog) =>
                handleUpdateStudent({ student, actionType, detail, undoMeta, studentLog })
              }
              onUpdatePassword={handleUpdatePassword}
              onResetClassProgress={handleResetClassProgress}
              onArchiveClassStudents={handleArchiveClassStudents}
              onUndoLog={handleUndoLog}
              onExportClassData={handleExportClassData}
              onThemeChange={setTheme}
              onDensityChange={setDensity}
              onSoundEnabledChange={setSoundEnabled}
              onSoundVolumeChange={setSoundVolume}
              onVoiceEnabledChange={setVoiceEnabledState}
              onRequestConfirm={requestConfirm}
              isMutating={isMutating}
            />
          )}

          {activeTab === 'admin' && isSuperAdmin && (
            <AdminConsole
              currentUser={user}
              users={adminUsers}
              activationCodes={adminCodes}
              adminLogs={adminLogs}
              registerChannels={adminRegisterChannels}
              freeRegisterConfig={freeRegisterConfig}
              toolboxAccessConfig={toolboxAccessConfig}
              isMutating={isMutating}
              onRefresh={refreshAdminConsole}
              onUpdateFreeRegisterConfig={handleAdminUpdateFreeRegisterConfig}
              onUpdateToolboxAccessConfig={handleAdminUpdateToolboxAccessConfig}
              onCreateRegisterChannel={handleAdminCreateRegisterChannel}
              onUpdateRegisterChannel={handleAdminUpdateRegisterChannel}
              onRequestConfirm={requestConfirm}
              onUpdateUser={handleAdminUpdateUser}
              onBatchUpdateUsers={handleAdminBatchUpdateUsers}
              onResetUserPassword={handleAdminResetUserPassword}
              onCreateCode={handleAdminCreateCode}
              onCreateCodesBatch={handleAdminCreateCodesBatch}
              onUpdateCode={handleAdminUpdateCode}
              onBatchUpdateCodes={handleAdminBatchUpdateCodes}
              onBatchRevokeCodes={handleAdminBatchRevokeCodes}
            />
          )}
        </section>
      </main>

      <Modal
        isOpen={confirmState.isOpen}
        onClose={() => closeConfirm(false)}
        title={confirmState.title}
        contentClassName={`confirm-modal ${confirmState.tone}`.trim()}
      >
        <div className="confirm-modal-body">
          <p>{confirmState.message}</p>
          {confirmState.requireMatch && (
            <div className="confirm-match-field">
              <label>{confirmState.matchLabel || `请输入 ${confirmState.requireMatch} 继续`}</label>
              <input
                className="glass-input"
                placeholder={confirmState.matchPlaceholder || confirmState.requireMatch}
                value={confirmState.inputValue}
                onChange={(event) =>
                  setConfirmState((prev) => ({
                    ...prev,
                    inputValue: event.target.value,
                  }))
                }
              />
            </div>
          )}
          <div className="modal-footer">
            <button className="cancel-btn" onClick={() => closeConfirm(false)} type="button">
              {confirmState.cancelLabel}
            </button>
            <button
              className={`confirm-btn ${confirmState.tone === 'danger' ? 'danger' : ''}`.trim()}
              onClick={() => closeConfirm(true)}
              disabled={
                Boolean(confirmState.requireMatch)
                && confirmState.inputValue.trim() !== confirmState.requireMatch.trim()
              }
              type="button"
            >
              {confirmState.confirmLabel}
            </button>
          </div>
        </div>
      </Modal>

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
