import React, { useState } from 'react';
import './Login.css';

const initialFormState = {
  username: '',
  password: '',
  confirmPassword: '',
  activationCode: '',
  nickname: '',
};

const Login = ({ onLogin, isSubmitting = false, errorMessage = '', freeRegisterConfig = null }) => {
  const [activeMode, setActiveMode] = useState('login');
  const [formData, setFormData] = useState({
    ...initialFormState,
  });
  const exampleActivationCodes = ['CLASS-VIP1-2026', 'CLASS-VIP2-2026', 'CLASS-PERM-2026'];
  const isFreeRegisterActive = Boolean(freeRegisterConfig?.is_active);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (activeMode === 'register' && formData.password !== formData.confirmPassword) {
      return;
    }

    await onLogin({
      ...formData,
      mode: activeMode,
    });
  };

  const handleModeChange = (mode) => {
    setActiveMode(mode);
    setFormData({ ...initialFormState });
  };

  return (
    <div className="login-page">
      <div className="login-header">
        <div className="logo-box">
          <img src="https://api.iconify.design/noto-v1:paw-prints.svg" alt="logo" />
        </div>
        <h1>Class萌宠乐园</h1>
        <p>让每一次课堂互动都充满惊喜</p>
      </div>

      <div className="login-card glass-card">
        <div className="mode-tabs">
          <button 
            className={activeMode === 'login' ? 'active' : ''} 
            onClick={() => handleModeChange('login')}
            type="button"
          >
            教师登录
          </button>
          <button 
            className={activeMode === 'register' ? 'active' : ''} 
            onClick={() => handleModeChange('register')}
            type="button"
          >
            激活新账号
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <p className="login-hint">
            {activeMode === 'login'
              ? '请输入已注册的教师账号和密码登录。'
              : isFreeRegisterActive
                ? ''
                : `注册时需要一个未使用的激活码，例如：${exampleActivationCodes.join(' / ')}`}
          </p>

          {activeMode === 'register' && !isFreeRegisterActive && (
            <div className="form-group">
              <label>专属激活码</label>
              <input 
                type="text" 
                placeholder="请输入您的激活码"
                className="glass-input"
                value={formData.activationCode}
                onChange={(e) => setFormData((prev) => ({ ...prev, activationCode: e.target.value }))}
              />
            </div>
          )}

          {activeMode === 'register' && (
            <div className="form-group">
              <label>展示昵称</label>
              <input 
                type="text" 
                placeholder="例如：王老师"
                className="glass-input"
                value={formData.nickname}
                onChange={(e) => setFormData((prev) => ({ ...prev, nickname: e.target.value }))}
              />
            </div>
          )}

          <div className="form-group">
            <label>{activeMode === 'login' ? '登录账号' : '设置登录账号'}</label>
            <input 
              type="text" 
              placeholder="例如: teacher_wang"
              className="glass-input"
              value={formData.username}
              onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>{activeMode === 'login' ? '登录密码' : '设置登录密码'}</label>
            <input 
              type="password" 
              placeholder="••••••••"
              className="glass-input"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
            />
          </div>

          {activeMode === 'register' && (
            <div className="form-group">
              <label>确认密码</label>
              <input 
                type="password" 
                placeholder="请再次输入密码"
                className="glass-input"
                value={formData.confirmPassword}
                onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </div>
          )}

          {activeMode === 'register' && formData.confirmPassword && formData.password !== formData.confirmPassword && (
            <p className="form-error">两次输入的密码不一致</p>
          )}

          {errorMessage && <p className="form-error">{errorMessage}</p>}

          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? '正在进入...' : activeMode === 'login' ? '进入乐园' : '立即激活身份'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
