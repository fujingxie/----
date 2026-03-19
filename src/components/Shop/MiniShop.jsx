import React, { useMemo, useState } from 'react';
import './MiniShop.css';
import { Gift, Package, PenSquare, Plus, ShoppingCart, Sparkles, Trash2 } from 'lucide-react';
import Modal from '../Common/Modal';
import EmptyState from '../Common/EmptyState';
import { notify } from '../../lib/notify';

const EMPTY_ITEM = { name: '', price: '', stock: '', icon: '🎁' };
const SHOP_ICON_OPTIONS = ['🎁', '🍬', '🍪', '🧃', '📚', '✏️', '🏅', '🎨', '🧩', '🪁', '🎯', '⭐'];

const toSafeNonNegativeInteger = (value) => {
  if (value === '' || value === null || value === undefined) {
    return '';
  }

  return String(Math.max(0, parseInt(value, 10) || 0));
};

function ShopIconPicker({ value, onChange }) {
  return (
    <div className="shop-icon-picker">
      {SHOP_ICON_OPTIONS.map((icon) => (
        <button
          key={icon}
          className={`shop-icon-option ${value === icon ? 'active' : ''}`}
          onClick={() => onChange(icon)}
          type="button"
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

const MiniShop = ({
  items,
  logs = [],
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onRedeem,
  onRequestConfirm,
  students,
}) => {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [selectedItemForRedeem, setSelectedItemForRedeem] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [editDraft, setEditDraft] = useState(EMPTY_ITEM);

  const selectedCount = selectedStudents.length;
  const remainingSlots = Math.max((selectedItemForRedeem?.stock || 0) - selectedCount, 0);
  const redemptionLogs = useMemo(
    () => logs.filter((log) => (log.actionType || log.action) === '商品兑换').slice(0, 8),
    [logs],
  );
  const affordableStudents = useMemo(
    () =>
      students.filter((student) => (student.coins || 0) >= (selectedItemForRedeem?.price || 0)).length,
    [selectedItemForRedeem?.price, students],
  );

  const normalizeItem = (item) => ({
    ...item,
    price: parseInt(item.price, 10),
    stock: parseInt(item.stock, 10) || 99,
  });

  const handleAddItem = async () => {
    const normalized = normalizeItem(newItem);

    if (!newItem.name || !newItem.price || normalized.price <= 0) {
      notify('商品价格必须大于 0，库存不能为负数', 'warning');
      return;
    }

    await onAddItem(normalized);
    setIsAddingItem(false);
    setNewItem(EMPTY_ITEM);
  };

  const handleEditItem = async () => {
    const normalized = normalizeItem(editDraft);

    if (!editingItem || !editDraft.name || !editDraft.price || normalized.price <= 0) {
      notify('商品价格必须大于 0，库存不能为负数', 'warning');
      return;
    }

    await onUpdateItem({
      ...editingItem,
      ...normalized,
    });
    setEditingItem(null);
    setEditDraft(EMPTY_ITEM);
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setEditDraft({
      name: item.name,
      price: String(item.price),
      stock: String(item.stock),
      icon: item.icon || '🎁',
    });
  };

  const handleRedeemClose = () => {
    setIsRedeeming(false);
    setSelectedStudents([]);
    setSelectedItemForRedeem(null);
  };

  const toggleStudentSelection = (studentId, canAfford) => {
    if (!canAfford) {
      return;
    }

    setSelectedStudents((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      }

      if (selectedItemForRedeem && prev.length >= selectedItemForRedeem.stock) {
        return prev;
      }

      return [...prev, studentId];
    });
  };

  const handleDeleteItem = async (item) => {
    const confirmed = await onRequestConfirm({
      title: '下架商品',
      message: `确定要下架商品 ${item.name} 吗？下架后学生将不能继续兑换这个商品。`,
      tone: 'danger',
      confirmLabel: '确认下架',
    });

    if (confirmed) {
      onDeleteItem(item);
    }
  };

  return (
    <div className="mini-shop-container">
      <div className="shop-header">
        <div className="header-info">
          <ShoppingCart size={24} className="shop-icon" />
          <div>
            <h2>班级小卖部</h2>
            <span className="subtitle">补货、维护商品并为学生发货</span>
          </div>
        </div>
        <button className="add-item-btn" onClick={() => setIsAddingItem(true)} type="button">
          <Plus size={18} />
          <span>补货上架</span>
        </button>
      </div>

      <div className="shop-content-grid">
        <div className="shop-items-grid">
        {items.length === 0 ? (
          <EmptyState
            className="empty-shop"
            icon={<Package size={34} />}
            title="货架还空着"
            description="先补几样课堂奖励上架吧，学生兑换后会自动扣减金币和库存。"
            action={
              <button className="add-item-btn" onClick={() => setIsAddingItem(true)} type="button">
                <Plus size={18} />
                <span>立即补货</span>
              </button>
            }
          />
        ) : (
          items.map((item) => (
            <div key={item.id} className="shop-item-card glass-card">
              <div className="item-card-top">
                <div className="item-icon">{item.icon}</div>
                <div className="item-head-copy">
                  <div className="item-badge">
                    <Sparkles size={12} />
                    <span>课堂奖励</span>
                  </div>
                  <h3>{item.name}</h3>
                  <div className="item-meta">
                    <span className="price">💰 {item.price}</span>
                    <span className={`stock ${item.stock <= 3 ? 'low' : ''}`}>库存 {item.stock}</span>
                  </div>
                </div>
              </div>
              <div className="item-details">
                <p>把课堂表现兑换成看得见的惊喜奖励，让积极行为更有反馈。</p>
              </div>
              <div className="shop-card-actions">
                <button className="icon-btn blue" onClick={() => openEditItem(item)} type="button" title="编辑商品">
                  <PenSquare size={14} />
                </button>
                <button
                  className="icon-btn red"
                  onClick={() => handleDeleteItem(item)}
                  type="button"
                  title="下架商品"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  className="redeem-trigger-btn"
                  onClick={() => {
                    setSelectedItemForRedeem(item);
                    setSelectedStudents([]);
                    setIsRedeeming(true);
                  }}
                  disabled={item.stock <= 0}
                  type="button"
                >
                  <Gift size={15} />
                  <span>{item.stock <= 0 ? '已售罄' : '兑换发货'}</span>
                </button>
              </div>
            </div>
          ))
        )}
        </div>

        <aside className="shop-records-panel glass-card">
          <div className="shop-records-head">
            <h3>最近兑换记录</h3>
            <span>{redemptionLogs.length} 条</span>
          </div>
          {redemptionLogs.length === 0 ? (
            <EmptyState
              icon={<Gift size={28} />}
              title="还没有兑换记录"
              description="学生兑换过商品后，这里会按时间顺序显示明细。"
            />
          ) : (
            <div className="shop-record-list">
              {redemptionLogs.map((log) => (
                <article key={log.id} className="shop-record-item">
                  <div>
                    <strong>{log.detail}</strong>
                    <p>{log.user_nickname || log.operator || '系统'} · {log.created_at || log.time}</p>
                  </div>
                  <span className="shop-record-tag">兑换</span>
                </article>
              ))}
            </div>
          )}
        </aside>
      </div>

      <Modal isOpen={isAddingItem} onClose={() => setIsAddingItem(false)} title="商品补货上架">
        <div className="add-item-form">
          <div className="form-group">
            <label>商品图标</label>
            <ShopIconPicker value={newItem.icon} onChange={(icon) => setNewItem({ ...newItem, icon })} />
          </div>
          <div className="form-group">
            <label>商品名称</label>
            <input
              className="glass-input"
              placeholder="如：免作业券、小零食"
              value={newItem.name}
              onChange={(event) => setNewItem({ ...newItem, name: event.target.value })}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>兑换价格 (金币)</label>
              <input
                className="glass-input"
                type="number"
                min="1"
                step="1"
                placeholder="50"
                value={newItem.price}
                onChange={(event) => setNewItem({ ...newItem, price: toSafeNonNegativeInteger(event.target.value) })}
              />
            </div>
            <div className="form-group">
              <label>上架库存</label>
              <input
                className="glass-input"
                type="number"
                min="0"
                step="1"
                placeholder="99"
                value={newItem.stock}
                onChange={(event) => setNewItem({ ...newItem, stock: toSafeNonNegativeInteger(event.target.value) })}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button className="cancel-btn" onClick={() => setIsAddingItem(false)} type="button">取消</button>
            <button className="confirm-btn" onClick={handleAddItem} type="button">确认上架</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={Boolean(editingItem)} onClose={() => setEditingItem(null)} title={`维护商品：${editingItem?.name || ''}`}>
        <div className="add-item-form">
          <div className="form-group">
            <label>商品图标</label>
            <ShopIconPicker value={editDraft.icon} onChange={(icon) => setEditDraft((prev) => ({ ...prev, icon }))} />
          </div>
          <div className="form-group">
            <label>商品名称</label>
            <input
              className="glass-input"
              value={editDraft.name}
              onChange={(event) => setEditDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>兑换价格 (金币)</label>
              <input
                className="glass-input"
                type="number"
                min="1"
                step="1"
                value={editDraft.price}
                onChange={(event) => setEditDraft((prev) => ({ ...prev, price: toSafeNonNegativeInteger(event.target.value) }))}
              />
            </div>
            <div className="form-group">
              <label>库存数量</label>
              <input
                className="glass-input"
                type="number"
                min="0"
                step="1"
                value={editDraft.stock}
                onChange={(event) => setEditDraft((prev) => ({ ...prev, stock: toSafeNonNegativeInteger(event.target.value) }))}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button className="cancel-btn" onClick={() => setEditingItem(null)} type="button">取消</button>
            <button className="confirm-btn" onClick={handleEditItem} type="button">保存商品</button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isRedeeming}
        onClose={handleRedeemClose}
        title={`商品兑换：${selectedItemForRedeem?.name || ''}`}
        contentClassName="shop-redeem-modal"
      >
        <div className="redeem-container">
          <p className="redeem-hint">请选择要兑换的学生，余额不足会显示提示，但不再使用整块灰色禁用。</p>
          <div className="redeem-summary">
            <span>库存剩余：{selectedItemForRedeem?.stock || 0}</span>
            <span>可兑换人数：{affordableStudents}</span>
            <span>已选择：{selectedCount}</span>
            <span>还可选：{remainingSlots}</span>
          </div>
          <div className="student-selection-grid">
            {students.map((student) => {
              const canAfford = (student.coins || 0) >= (selectedItemForRedeem?.price || 0);
              const isSelected = selectedStudents.includes(student.id);
              const soldOutForSelection = !isSelected && selectedItemForRedeem && selectedCount >= selectedItemForRedeem.stock;

              return (
                <div
                  key={student.id}
                  className={`student-item ${!canAfford ? 'insufficient' : ''} ${soldOutForSelection ? 'soldout' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleStudentSelection(student.id, canAfford && !soldOutForSelection)}
                >
                  <span className="s-name">{student.name}</span>
                  <span className="s-coins">💰{student.coins || 0}</span>
                  {!canAfford && <span className="s-status danger">金币不足</span>}
                  {canAfford && soldOutForSelection && <span className="s-status warn">库存已满</span>}
                  {canAfford && !soldOutForSelection && !isSelected && <span className="s-status ok">可兑换</span>}
                  {isSelected && <div className="check-mark">✓</div>}
                </div>
              );
            })}
          </div>
          <div className="modal-footer">
            <button className="cancel-btn" onClick={handleRedeemClose} type="button">取消</button>
            <button
              className="confirm-btn"
              disabled={selectedStudents.length === 0 || selectedStudents.length > (selectedItemForRedeem?.stock || 0)}
              onClick={async () => {
                await onRedeem(selectedItemForRedeem, selectedStudents);
                handleRedeemClose();
              }}
              type="button"
            >
              确认扣款发货 ({selectedStudents.length})
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MiniShop;
