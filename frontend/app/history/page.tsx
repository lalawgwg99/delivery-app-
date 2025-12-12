'use client';

import { useState, useEffect } from 'react';
import { Lock, Calendar, ArrowLeft, Copy, Eye, Check, Clock, Package } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://routesnap-backend.lalawgwg99.workers.dev';

interface HistoryRecord {
    routeId: string;
    createdAt: string;
    orderCount: number;
}

interface OrderDetail {
    customer: string;
    phone: string;
    address: string;
    items: string;
    deliveryPhotoCount?: number;
}

export default function HistoryPage() {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [records, setRecords] = useState<HistoryRecord[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [viewingDetail, setViewingDetail] = useState<{ routeId: string; orders: OrderDetail[] } | null>(null);

    // 驗證密碼
    const verifyPassword = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/history/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            if (data.success) {
                setIsAuthenticated(true);
                // 儲存密碼到 sessionStorage，方便後續查詢
                sessionStorage.setItem('historyPassword', password);
                loadRecords(selectedDate);
            } else {
                setError(data.error || '密碼錯誤');
            }
        } catch (e) {
            setError('連線失敗，請稍後再試');
        }
        setLoading(false);
    };

    // 載入歷史記錄
    const loadRecords = async (date: string) => {
        setLoading(true);
        try {
            const pwd = sessionStorage.getItem('historyPassword') || password;
            const res = await fetch(`${API_URL}/api/history/list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd, date })
            });
            const data = await res.json();
            if (data.success) {
                setRecords(data.records);
            }
        } catch (e) {
            console.error('載入失敗', e);
        }
        setLoading(false);
    };

    // 日期變更
    useEffect(() => {
        if (isAuthenticated) {
            loadRecords(selectedDate);
        }
    }, [selectedDate, isAuthenticated]);

    // 複製連結
    const copyLink = (routeId: string) => {
        const link = `${window.location.origin}/driver?id=${routeId}`;
        navigator.clipboard.writeText(link);
        setCopiedId(routeId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // 刪除記錄
    const deleteRecord = async (routeId: string) => {
        if (!confirm('確定要刪除這筆記錄嗎？此操作無法復原。')) {
            return;
        }
        try {
            const pwd = sessionStorage.getItem('historyPassword') || password;
            const res = await fetch(`${API_URL}/api/history/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd, routeId, date: selectedDate })
            });
            const data = await res.json();
            if (data.success) {
                // 從列表中移除
                setRecords(records.filter(r => r.routeId !== routeId));
            } else {
                alert(data.error || '刪除失敗');
            }
        } catch (e) {
            alert('刪除失敗，請重試');
        }
    };

    // 查看詳情
    const viewDetail = async (routeId: string) => {
        try {
            const pwd = sessionStorage.getItem('historyPassword') || password;
            const res = await fetch(`${API_URL}/api/history/detail`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd, routeId })
            });
            const data = await res.json();
            if (data.success) {
                setViewingDetail({ routeId, orders: data.data.orders || [] });
            }
        } catch (e) {
            console.error('載入詳情失敗', e);
        }
    };

    // 格式化時間
    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    };

    // 密碼輸入頁面 (Vitality)
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[var(--color-surface-bg)] flex items-center justify-center p-6">
                <div className="bg-white rounded-[32px] p-10 soft-shadow max-w-sm w-full animate-in zoom-in duration-300">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-[var(--color-aqua-50)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <Lock className="w-8 h-8 text-[var(--color-aqua-500)]" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800">歷史記錄查詢</h1>
                        <p className="text-slate-400 text-sm mt-2 font-medium">請輸入管理員密碼以繼續</p>
                    </div>

                    <div className="space-y-4">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                            placeholder="輸入密碼..."
                            className="w-full px-6 py-4 bg-slate-50 border-none rounded-[20px] focus:ring-2 focus:ring-[var(--color-aqua-400)] text-slate-800 placeholder-slate-400 outline-none transition-all font-bold text-lg text-center tracking-widest"
                        />

                        {error && (
                            <div className="bg-red-50 text-red-500 px-4 py-3 rounded-xl text-sm text-center font-bold animate-pulse">
                                ⚠️ {error}
                            </div>
                        )}

                        <button
                            onClick={verifyPassword}
                            disabled={loading || !password}
                            className="w-full bg-gradient-to-r from-[var(--color-aqua-500)] to-[var(--color-aqua-400)] text-white py-4 rounded-[20px] font-bold text-lg shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105 active:scale-[0.98] transition-all"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                                    驗證中...
                                </span>
                            ) : '確認進入'}
                        </button>
                    </div>

                    <Link href="/" className="block text-center text-slate-400 mt-8 text-sm font-bold hover:text-[var(--color-aqua-600)] transition-colors">
                        ← 返回首頁
                    </Link>
                </div>
            </div>
        );
    }

    // 查看詳情彈窗 (Vitality)
    if (viewingDetail) {
        return (
            <div className="min-h-screen bg-[var(--color-surface-bg)] p-4 font-sans">
                <div className="max-w-md mx-auto pt-2">
                    <button
                        onClick={() => setViewingDetail(null)}
                        className="flex items-center gap-2 text-slate-500 font-bold mb-6 hover:text-[var(--color-aqua-600)] transition-colors pl-2"
                    >
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <ArrowLeft className="w-5 h-5" />
                        </div>
                        返回列表
                    </button>

                    <div className="bg-white rounded-[32px] p-6 soft-shadow animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-800">訂單詳情</h2>
                            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">ID: {viewingDetail.routeId}</span>
                        </div>

                        <div className="space-y-4">
                            {viewingDetail.orders.map((order, idx) => (
                                <div key={idx} className="bg-slate-50/50 rounded-[20px] p-4 border border-slate-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${order.deliveryPhotoCount && order.deliveryPhotoCount >= 2
                                                ? 'bg-[#22C55E] text-white shadow-green-500/20'
                                                : 'bg-gradient-to-br from-[var(--color-aqua-400)] to-[var(--color-aqua-600)] text-white shadow-cyan-500/20'}`}>
                                                {order.deliveryPhotoCount && order.deliveryPhotoCount >= 2 ? '✓' : idx + 1}
                                            </span>
                                            <span className="font-bold text-slate-800 text-lg">{order.customer || '未命名'}</span>
                                        </div>
                                        {order.deliveryPhotoCount && order.deliveryPhotoCount > 0 && (
                                            <a
                                                href={`/driver?id=${viewingDetail.routeId}`}
                                                target="_blank"
                                                className="flex items-center gap-1 text-xs bg-[var(--color-surface-bg)] text-[var(--color-aqua-600)] px-3 py-1.5 rounded-full font-bold border border-[var(--color-aqua-100)]"
                                            >
                                                📷 {order.deliveryPhotoCount}
                                            </a>
                                        )}
                                    </div>
                                    <div className="space-y-1 pl-11">
                                        {order.phone && <p className="text-sm text-slate-500 font-medium tracking-wide">📞 {order.phone}</p>}
                                        {order.address && <p className="text-sm text-slate-700 font-bold leading-snug">{order.address}</p>}
                                        {order.items && <p className="text-sm text-slate-500 mt-2 bg-white p-2 rounded-xl border border-slate-100">📦 {order.items}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 歷史列表頁面 (Vitality)
    return (
        <div className="min-h-screen bg-[var(--color-surface-bg)] font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[var(--color-surface-bg)]/90 backdrop-blur-xl px-5 py-4 transition-all">
                <div className="flex items-center justify-between max-w-md mx-auto">
                    <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-slate-600 shadow-sm hover:text-[var(--color-aqua-600)] transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-lg font-bold text-slate-800">歷史記錄</h1>
                    <div className="w-10" />
                </div>
            </header>

            <main className="max-w-md mx-auto p-5 pt-2 pb-24">
                {/* 日期選擇 */}
                <div className="bg-white p-2 rounded-[24px] soft-shadow mb-6 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-surface-bg)] flex items-center justify-center text-[var(--color-aqua-600)] mr-2">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="flex-1 bg-transparent border-none text-slate-800 font-bold text-lg focus:ring-0 cursor-pointer"
                    />
                </div>

                {/* 記錄列表 */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                        <div className="w-8 h-8 border-4 border-[var(--color-aqua-200)] border-t-[var(--color-aqua-500)] rounded-full animate-spin"></div>
                        <p className="font-medium">載入中...</p>
                    </div>
                ) : records.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                        <Package className="w-16 h-16 mb-4 opacity-20" />
                        <p className="font-bold text-lg">無派單記錄</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {records.map((record) => (
                            <div
                                key={record.routeId}
                                className="bg-white rounded-[28px] p-5 soft-shadow hover:shadow-lg transition-all"
                            >
                                <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-[var(--color-aqua-50)] p-1.5 rounded-lg">
                                            <Clock className="w-4 h-4 text-[var(--color-aqua-600)]" />
                                        </div>
                                        <span className="font-bold text-slate-800 text-lg">{formatTime(record.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-full">
                                        <Package className="w-4 h-4" />
                                        <span>{record.orderCount} 單</span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => copyLink(record.routeId)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] text-sm font-bold transition-all ${copiedId === record.routeId
                                            ? 'bg-green-50 text-green-600'
                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        {copiedId === record.routeId ? (
                                            <>
                                                <Check className="w-4 h-4" />
                                                已複製
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4" />
                                                複製連結
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => viewDetail(record.routeId)}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--color-aqua-50)] text-[var(--color-aqua-700)] rounded-[18px] text-sm font-bold hover:bg-[var(--color-aqua-100)] transition-colors"
                                    >
                                        <Eye className="w-4 h-4" />
                                        <span>詳情</span>
                                    </button>
                                    <button
                                        onClick={() => deleteRecord(record.routeId)}
                                        className="py-3 px-4 bg-red-50 text-red-500 rounded-[18px] hover:bg-red-100 transition-colors"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
