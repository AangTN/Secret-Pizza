import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

const CartContext = createContext();

const initialState = {
  // items: [{
  //   key,               // derived identity: loai|id
  //   loai,              // 'SP' (sản phẩm) | 'CB' (combo)
  //   
  //   // For loai='SP':
  //   monAnId,           // number
  //   bienTheId,         // number|null
  //   deBanhId,          // number|null
  //   tuyChonThem,       // number[]
  //   
  //   // For loai='CB':
  //   comboId,           // number
  //   
  //   soLuong,           // number
  // }]
  items: []
};

const STORAGE_KEY = 'cart';
const COMPACT_KEY = 'cart:compact';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function loadInitialState() {
  if (!canUseStorage()) {
    return initialState;
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.items) && parsed.items.every(it => it?.loai && (it.monAnId != null || it.comboId != null))) {
        const items = parsed.items.map(it => ({ ...it, key: it.key || buildKey(it) }));
        return { items };
      }
    }
    const compact = localStorage.getItem(COMPACT_KEY);
    if (compact) {
      const rawItems = JSON.parse(compact);
      if (Array.isArray(rawItems)) {
        const items = rawItems
          .filter(it => it && it.loai && (it.monAnId != null || it.comboId != null))
          .map(it => normalizeItem(it));
        if (items.length > 0) return { items };
      }
    }
  } catch {}
  return initialState;
}

function buildKey(item) {
  const loai = item.loai || 'SP';
  if (loai === 'CB') {
    return `CB|${item.comboId}`;
  }
  // For SP: include variant, crust, and options to allow different configurations
  const opts = Array.isArray(item.tuyChonThem) ? [...item.tuyChonThem].sort((a, b) => a - b) : [];
  const deBanh = item.deBanhId == null ? 'null' : String(item.deBanhId);
  const bienThe = item.bienTheId == null ? 'null' : String(item.bienTheId);
  return `SP|${item.monAnId}|${bienThe}|${deBanh}|[${opts.join(',')}]`;
}

function normalizeItem(payload) {
  const loai = payload.loai || 'SP';
  
  if (loai === 'CB') {
    const base = {
      loai: 'CB',
      comboId: Number(payload.comboId),
      soLuong: Math.max(1, Number(payload.soLuong || 1))
    };
    return { ...base, key: buildKey(base) };
  }
  
  // For SP
  const base = {
    loai: 'SP',
    monAnId: Number(payload.monAnId),
    bienTheId: payload.bienTheId != null ? Number(payload.bienTheId) : null,
    deBanhId: payload.deBanhId != null ? Number(payload.deBanhId) : null,
    tuyChonThem: Array.isArray(payload.tuyChonThem) ? payload.tuyChonThem.map(Number) : [],
    soLuong: Math.max(1, Number(payload.soLuong || 1))
  };
  return { ...base, key: buildKey(base) };
}

function reducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return action.payload || initialState;
    case 'ADD': {
      const newItem = normalizeItem(action.payload);
      const existing = state.items.find(i => i.key === newItem.key);
      const items = existing
        ? state.items.map(i => i.key === newItem.key ? { ...i, soLuong: i.soLuong + newItem.soLuong } : i)
        : [...state.items, newItem];
      return { ...state, items };
    }
    case 'REMOVE': {
      const items = state.items.filter(i => i.key !== action.payload.key);
      return { ...state, items };
    }
    case 'SET_QTY': {
      const { key, soLuong } = action.payload;
      const items = state.items.map(i => i.key === key ? { ...i, soLuong: Math.max(1, Number(soLuong)) } : i);
      return { ...state, items };
    }
    case 'CLEAR':
      return initialState;
    default:
      return state;
  }
}

export const CartProvider = ({ children }) => {
  // Load synchronously from localStorage to avoid losing cart on refresh/flicker
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);

  useEffect(() => {
    if (!canUseStorage()) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      const compactItems = state.items.map(item => {
        if (item.loai === 'CB') {
          return { loai: 'CB', comboId: item.comboId, soLuong: item.soLuong };
        }
        return {
          loai: 'SP',
          monAnId: item.monAnId,
          bienTheId: item.bienTheId,
          deBanhId: item.deBanhId,
          tuyChonThem: item.tuyChonThem,
          soLuong: item.soLuong
        };
      });
      localStorage.setItem(COMPACT_KEY, JSON.stringify(compactItems));
    } catch {}
  }, [state]);

  const totalQuantity = useMemo(() => state.items.reduce((sum, i) => sum + Number(i.soLuong || 0), 0), [state.items]);

  const value = useMemo(() => ({
    items: state.items,
    totalQuantity,
    add: (item) => dispatch({ type: 'ADD', payload: item }),
    remove: (key) => dispatch({ type: 'REMOVE', payload: { key } }),
    setQty: (key, soLuong) => dispatch({ type: 'SET_QTY', payload: { key, soLuong } }),
    clear: () => dispatch({ type: 'CLEAR' })
  }), [state.items, totalQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);
