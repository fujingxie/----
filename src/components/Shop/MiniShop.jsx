import React, { useState } from 'react';
import './MiniShop.css';
import { Plus, Package, ShoppingCart } from 'lucide-react';
import Modal from '../Common/Modal';

const MiniShop = ({ items, onAddItem, onRedeem, students }) => {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [selectedItemForRedeem, setSelectedItemForRedeem] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  
  const [newItem, setNewItem] = useState({ name: '', price: '', stock: '', icon: '🎁' });

  const selectedCount = selectedStudents.length;
  const remainingSlots = Math.max((selectedItemForRedeem?.stock || 0) - selectedCount, 0);

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.price) return;
    await onAddItem({
      ...newItem,
      price: parseInt(newItem.price, 10),
      stock: parseInt(newItem.stock, 10) || 99,
    });
    setIsAddingItem(false);
    setNewItem({ name: '', price: '', stock: '', icon: '🎁' });
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

  return (
    <div className="mini-shop-container">
      <div className="shop-header">
        <div className="header-info">
          <ShoppingCart size={24} className="shop-icon" />
          <h2>班级小卖部</h2>
          <span className="subtitle">用奋斗兑换惊喜奖励</span>
        </div>
        <button className="add-item-btn" onClick={() => setIsAddingItem(true)}>
          <Plus size={18} />
          <span>补货上架</span>
        </button>
      </div>

      <div className="shop-items-grid">
        {items.length === 0 ? (
          <div className="empty-shop">
            <Package size={48} />
            <p>货架空空的，快去补货吧</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="shop-item-card glass-card">
              <div className="item-icon">{item.icon}</div>
              <div className="item-details">
                <h3>{item.name}</h3>
                <div className="item-meta">
                  <span className="price">💰 {item.price}</span>
                  <span className="stock">库存: {item.stock}</span>
                </div>
              </div>
              <button 
                className="redeem-trigger-btn" 
                onClick={() => {
                  setSelectedItemForRedeem(item);
                  setSelectedStudents([]);
                  setIsRedeeming(true);
                }}
                disabled={item.stock <= 0}
              >
                兑换发货
              </button>
            </div>
          ))
        )}
      </div>

      {/* 补货上架弹窗 */}
      <Modal isOpen={isAddingItem} onClose={() => setIsAddingItem(false)} title="商品补货上架">
        <div className="add-item-form">
          <div className="form-group">
            <label>商品名称</label>
            <input 
              className="glass-input" 
              placeholder="如：免作业券、小零食" 
              value={newItem.name}
              onChange={e => setNewItem({...newItem, name: e.target.value})}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>兑换价格 (金币)</label>
              <input 
                className="glass-input" 
                type="number" 
                placeholder="50"
                value={newItem.price}
                onChange={e => setNewItem({...newItem, price: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>上架库存</label>
              <input 
                className="glass-input" 
                type="number" 
                placeholder="99"
                value={newItem.stock}
                onChange={e => setNewItem({...newItem, stock: e.target.value})}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button className="cancel-btn" onClick={() => setIsAddingItem(false)}>取消</button>
            <button className="confirm-btn" onClick={handleAddItem}>确认上架</button>
          </div>
        </div>
      </Modal>

      {/* 兑换发货弹窗 (逻辑将在下一步完善) */}
      <Modal 
        isOpen={isRedeeming} 
        onClose={handleRedeemClose} 
        title={`商品兑换：${selectedItemForRedeem?.name}`}
      >
        <div className="redeem-container">
           {/* 学生过滤选择列表 */}
            <p className="redeem-hint">请选择要兑换的学生（余额不足者已置灰）</p>
            <div className="redeem-summary">
              <span>库存剩余：{selectedItemForRedeem?.stock || 0}</span>
              <span>已选择：{selectedCount}</span>
              <span>还可选：{remainingSlots}</span>
            </div>
            <div className="student-selection-grid">
               {students.map(student => {
                  const canAfford = (student.coins || 0) >= (selectedItemForRedeem?.price || 0);
                  const isSelected = selectedStudents.includes(student.id);
                  const soldOutForSelection = !isSelected && selectedItemForRedeem && selectedCount >= selectedItemForRedeem.stock;
                 return (
                   <div 
                     key={student.id} 
                     className={`student-item ${!canAfford || soldOutForSelection ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
                     onClick={() => toggleStudentSelection(student.id, canAfford && !soldOutForSelection)}
                   >
                     <span className="s-name">{student.name}</span>
                     <span className="s-coins">💰{student.coins || 0}</span>
                    {isSelected && <div className="check-mark">✓</div>}
                  </div>
                );
              })}
            </div>
            <div className="modal-footer">
               <button className="cancel-btn" onClick={handleRedeemClose}>取消</button>
               <button 
                 className="confirm-btn" 
                 disabled={selectedStudents.length === 0 || selectedStudents.length > (selectedItemForRedeem?.stock || 0)}
                 onClick={async () => {
                   await onRedeem(selectedItemForRedeem, selectedStudents);
                   handleRedeemClose();
                 }}
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
