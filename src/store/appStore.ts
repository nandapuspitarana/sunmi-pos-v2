import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface AppState {
  socket: Socket | null;
  isConnected: boolean;
  stats: {
    registered_visitors: number;
    active_visitors: number;
    exited_visitors: number;
    total_visitors: number;
    pending_payments: number;
    daily_revenue: number;
    gate_status: string;
  };
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    timestamp: Date;
  }>;
  connectSocket: () => void;
  disconnectSocket: () => void;
  updateStats: (stats: any) => void;
  addNotification: (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
}

const SOCKET_URL = 'http://localhost:3001';

export const useAppStore = create<AppState>((set, get) => ({
  socket: null,
  isConnected: false,
  stats: {
    registered_visitors: 0,
    active_visitors: 0,
    exited_visitors: 0,
    total_visitors: 0,
    pending_payments: 0,
    daily_revenue: 0,
    gate_status: 'offline',
  },
  notifications: [],

  connectSocket: () => {
    const { socket } = get();
    if (socket?.connected) return;

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      set({ isConnected: true });
      
      // Join admin room for monitoring
      newSocket.emit('join-admin-room', { admin_id: 'admin' });
      
      // Request initial stats
      newSocket.emit('request-stats');
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      set({ isConnected: false });
    });

    newSocket.on('stats-update', (stats) => {
      set({ stats });
    });

    newSocket.on('new-visitor', (data) => {
      const { addNotification } = get();
      addNotification({
        type: 'info',
        message: `New visitor entered: ${data.visitor_id}`,
      });
    });

    newSocket.on('new-order', (data) => {
      const { addNotification } = get();
      addNotification({
        type: 'success',
        message: `New order created: Rp ${data.total_amount.toLocaleString()}`,
      });
    });

    newSocket.on('payment-validated', (data) => {
      const { addNotification } = get();
      addNotification({
        type: data.status === 'approved' ? 'success' : 'warning',
        message: `Payment ${data.status}: Order ${data.order_id}`,
      });
    });

    newSocket.on('gate-access', (data) => {
      const { addNotification } = get();
      addNotification({
        type: data.success ? 'info' : 'error',
        message: `Gate ${data.action}: ${data.success ? 'Success' : 'Failed'}`,
      });
    });

    newSocket.on('visitor-movement', (data) => {
      const { addNotification } = get();
      const actionText = data.action === 'entry' ? 'entered' : 'exited';
      addNotification({
        type: data.action === 'entry' ? 'success' : 'info',
        message: `${data.visitor_name} ${actionText} at ${data.gate_location} (Order: ${data.booking_order_id})`,
      });
      
      // Request updated stats after movement
      newSocket.emit('request-stats');
    });

    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  updateStats: (stats) => {
    set({ stats });
  },

  addNotification: (notification) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification = {
      ...notification,
      id,
      timestamp: new Date(),
    };
    
    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep only last 50
    }));

    // Auto remove after 5 seconds
    setTimeout(() => {
      get().removeNotification(id);
    }, 5000);
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
}));