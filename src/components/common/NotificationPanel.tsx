import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Send, CheckCheck, Bell, ShieldAlert, CheckCircle2, Clock, SendHorizontal } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { notifications, markNotificationAsRead, clearAllNotifications, sendTelegramSimulatedAlert } = useERP();
  const [filterType, setFilterType] = useState<string>('all');
  const [customMsg, setCustomMsg] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  if (!isOpen) return null;

  const filtered = notifications.filter(n => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !n.isRead;
    return n.type === filterType;
  });

  const handleSendTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customMsg.trim()) return;
    sendTelegramSimulatedAlert(customTitle, customMsg, 'General Alert');
    setCustomTitle('');
    setCustomMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-xs">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Telegram Notification Engine</h3>
                <p className="text-[11px] text-slate-500">Live outbound alerts & receipt confirmations</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-700 font-medium px-2 py-1 rounded"
            >
              Close
            </button>
          </div>

          {/* Filter Bar */}
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between text-xs bg-white">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2 py-1 rounded-md font-medium ${
                  filterType === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('unread')}
                className={`px-2 py-1 rounded-md font-medium ${
                  filterType === 'unread' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Unread ({notifications.filter(n => !n.isRead).length})
              </button>
            </div>
            <button
              type="button"
              onClick={clearAllNotifications}
              className="text-[11px] text-rose-600 hover:underline font-medium"
            >
              Clear Log
            </button>
          </div>

          {/* Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => markNotificationAsRead(item.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    item.isRead
                      ? 'bg-slate-50/60 border-slate-200/70 text-slate-700'
                      : 'bg-white border-blue-200 ring-1 ring-blue-500/20 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-xs font-semibold text-slate-900">{item.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDateTime(item.timestamp)}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed font-sans">
                    {item.message}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium text-[10px] uppercase">
                      {item.module}
                    </span>
                    <div className="flex items-center space-x-1 text-blue-600 font-medium">
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Telegram Bot Dispatched</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs">
                <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                No telegram notifications in this filter.
              </div>
            )}
          </div>

          {/* Test Dispatch Form */}
          <form onSubmit={handleSendTest} className="p-3.5 border-t border-slate-100 bg-slate-50 space-y-2">
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">
              Simulate Instant Telegram Alert
            </span>
            <input
              type="text"
              placeholder="Alert Title (e.g. Loan Payment Reminder)"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
            />
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Alert Message..."
                value={customMsg}
                onChange={e => setCustomMsg(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-1"
              >
                <SendHorizontal className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
