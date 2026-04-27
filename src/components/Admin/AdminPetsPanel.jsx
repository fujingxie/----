import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createCustomPet, deleteCustomPet, fetchCustomPets, uploadPetImage } from '../../api/client';
import { compressImageToBlob } from '../../lib/imageCompress';

const CATEGORY_OPTIONS = [
  { value: 'animal', label: '动物' },
  { value: 'plant', label: '植物' },
  { value: 'dinosaur', label: '恐龙' },
  { value: 'robot', label: '机器人' },
  { value: '__custom__', label: '自定义…' },
];

const EMPTY_FORM = {
  name: '',
  category: 'animal',
  imageLv1: '',
  imageLv2: '',
  imageLv3: '',
  imageLv4: '',
  imageLv5: '',
  imageLv6: '',
  imageLv7: '',
};

function AdminPetsPanel({ currentUser }) {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [customCategory, setCustomCategory] = useState('');
  const [uploading, setUploading] = useState({});
  const [saving, setSaving] = useState(false);

  const loadPets = useCallback(async () => {
    if (!currentUser?.id) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetchCustomPets({ userId: currentUser.id });
      setPets(response?.pets || []);
    } catch (error) {
      console.error('[DEBUG] fetchCustomPets failed:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadPets();
  }, [loadPets]);

  const getPreviewUrl = useCallback((key) => (key ? `/api/pets/images/${key}` : ''), []);

  const isFormComplete = useMemo(() => {
    if (!formData.name.trim()) {
      return false;
    }

    return [1, 2, 3, 4, 5, 6, 7].every((level) => Boolean(formData[`imageLv${level}`]));
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData(EMPTY_FORM);
    setCustomCategory('');
    setUploading({});
    setSaving(false);
  }, []);

  const handleImageUpload = useCallback(async (level, file) => {
    setUploading((prev) => ({ ...prev, [`lv${level}`]: true }));

    try {
      // 上传前压缩：最长边 800px，≤300KB，宠物图片无需高分辨率
      // 宠物图片用 PNG 保留透明背景，体积放宽到 500KB
      const compressed = await compressImageToBlob(file, { maxBytes: 500 * 1024, maxDim: 800, format: 'png' });
      const compressedFile = new File([compressed], file.name.replace(/\.[^.]+$/, '.png'), { type: 'image/png' });
      const response = await uploadPetImage({ userId: currentUser.id, file: compressedFile });
      setFormData((prev) => ({
        ...prev,
        [`imageLv${level}`]: response?.key || '',
      }));
    } catch (error) {
      alert(error?.message || '上传失败');
    } finally {
      setUploading((prev) => ({ ...prev, [`lv${level}`]: false }));
    }
  }, [currentUser?.id]);

  const handleSubmit = useCallback(async () => {
    if (!isFormComplete || saving) {
      return;
    }

    try {
      setSaving(true);
      // 若选了自定义，取输入框里的值；为空时降级为 'custom'
      const finalCategory =
        formData.category === '__custom__'
          ? (customCategory.trim() || 'custom')
          : formData.category;

      await createCustomPet({
        userId: currentUser.id,
        name: formData.name.trim(),
        category: finalCategory,
        imageLv1: formData.imageLv1,
        imageLv2: formData.imageLv2,
        imageLv3: formData.imageLv3,
        imageLv4: formData.imageLv4,
        imageLv5: formData.imageLv5,
        imageLv6: formData.imageLv6,
        imageLv7: formData.imageLv7,
      });
      resetForm();
      setShowForm(false);
      await loadPets();
    } catch (error) {
      alert(error?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }, [currentUser?.id, formData, isFormComplete, loadPets, resetForm, saving]);

  const handleDelete = useCallback(async (petId) => {
    if (!window.confirm('确认删除此宠物？已领养该宠物的学生不受影响。')) {
      return;
    }

    try {
      await deleteCustomPet({ userId: currentUser.id, petId });
      setPets((prev) => prev.filter((item) => item.id !== petId));
    } catch (error) {
      alert(error?.message || '删除失败');
    }
  }, [currentUser?.id]);

  return (
    <div className="admin-pets-panel">
      <div className="admin-pets-toolbar">
        <button
          type="button"
          className="confirm-btn"
          onClick={() => {
            if (showForm) {
              resetForm();
            }
            setShowForm((prev) => !prev);
          }}
        >
          {showForm ? '收起表单' : '＋ 新增宠物'}
        </button>
        <button
          type="button"
          className="confirm-btn secondary"
          onClick={loadPets}
          disabled={loading}
        >
          {loading ? '刷新中…' : '刷新列表'}
        </button>
      </div>

      {showForm ? (
        <section className="admin-pets-form glass-card">
          <div className="admin-pets-form-grid">
            <label className="admin-field">
              <span>宠物名称</span>
              <input
                className="glass-input"
                type="text"
                maxLength={30}
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="例如：星际小虎机器人"
              />
            </label>
            <label className="admin-field">
              <span>分类</span>
              <select
                className="glass-input"
                value={formData.category}
                onChange={(event) => {
                  setFormData((prev) => ({ ...prev, category: event.target.value }));
                  // 切换离「自定义」时清空输入内容
                  if (event.target.value !== '__custom__') {
                    setCustomCategory('');
                  }
                }}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {formData.category === '__custom__' && (
              <label className="admin-field">
                <span>自定义分类名</span>
                <input
                  className="glass-input"
                  type="text"
                  maxLength={20}
                  placeholder="例如：神兽、海洋生物…"
                  value={customCategory}
                  onChange={(event) => setCustomCategory(event.target.value)}
                />
              </label>
            )}
          </div>

          <div className="pet-image-upload-grid">
            {[1, 2, 3, 4, 5, 6, 7].map((level) => {
              const key = formData[`imageLv${level}`];

              return (
                <div key={level} className="pet-image-upload-slot">
                  <span className="slot-label">Lv{level}</span>
                  {key ? (
                    <label className="slot-filled">
                      <img
                        src={getPreviewUrl(key)}
                        alt={`Lv${level}`}
                        className="slot-preview"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            handleImageUpload(level, file);
                          }
                          event.target.value = '';
                        }}
                      />
                    </label>
                  ) : (
                    <label className="slot-placeholder">
                      {uploading[`lv${level}`] ? '上传中...' : '点击上传'}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            handleImageUpload(level, file);
                          }
                          event.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          <div className="admin-pets-form-actions">
            <button
              type="button"
              className="confirm-btn"
              onClick={handleSubmit}
              disabled={!isFormComplete || saving}
            >
              {saving ? '保存中…' : '保存宠物'}
            </button>
            <button
              type="button"
              className="confirm-btn secondary"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              disabled={saving}
            >
              取消
            </button>
          </div>
        </section>
      ) : null}

      <div className="admin-table-shell">
        <table className="admin-table admin-pets-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>分类</th>
              <th>图片预览</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pets.length === 0 ? (
              <tr>
                <td colSpan="5" className="admin-table-empty">
                  {loading ? '加载中…' : '还没有自定义宠物。'}
                </td>
              </tr>
            ) : (
              pets.map((pet) => (
                <tr key={pet.id}>
                  <td>{pet.name}</td>
                  <td>{CATEGORY_OPTIONS.find((option) => option.value === pet.category)?.label || pet.category}</td>
                  <td>
                    <img
                      src={getPreviewUrl(pet.image_lv1)}
                      alt={pet.name}
                      className="admin-pet-list-preview"
                    />
                  </td>
                  <td>{pet.created_at ? new Date(pet.created_at).toLocaleString() : '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="confirm-btn micro danger"
                      onClick={() => handleDelete(pet.id)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminPetsPanel;
