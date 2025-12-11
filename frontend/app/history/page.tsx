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

    // 密碼輸入頁面
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 shadow-lg max-w-sm w-full">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8 text-blue-600" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">歷史記錄查詢</h1>
                        <p className="text-gray-500 text-sm mt-2">請輸入查詢密碼</p>
                    </div>

                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                        placeholder="請輸入密碼"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />

                    {error && (
                        <p className="text-red-500 text-sm text-center mb-4">{error}</p>
                    )}

                    <button
                        onClick={verifyPassword}
                        disabled={loading || !password}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {loading ? '驗證中...' : '確認'}
                    </button>

                    <Link href="/" className="block text-center text-blue-600 mt-4 text-sm">
                        ← 返回首頁
                    </Link>
                </div>
            </div>
        );
    }

    // 查看詳情彈窗
    if (viewingDetail) {
        return (
            <div className="min-h-screen bg-[#F2F2F7] p-4">
                <div className="max-w-md mx-auto">
                    <button
                        onClick={() => setViewingDetail(null)}
                        className="flex items-center gap-2 text-blue-600 mb-4"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        返回列表
                    </button>

                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <h2 className="text-lg font-bold mb-4">訂單詳情</h2>
                        <p className="text-sm text-gray-500 mb-4">ID: {viewingDetail.routeId}</p>

                        <div className="space-y-4">
                            {viewingDetail.orders.map((order, idx) => (
                                <div key={idx} className="border-b border-gray-100 pb-4 last:border-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${order.deliveryPhotoCount && order.deliveryPhotoCount >= 2 ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}>
                                                {order.deliveryPhotoCount && order.deliveryPhotoCount >= 2 ? '✓' : idx + 1}
                                            </span>
                                            <span className="font-bold">{order.customer || '未命名'}</span>
                                        </div>
                                        {order.deliveryPhotoCount && order.deliveryPhotoCount > 0 && (
                                            <a
                                                href={`/driver?id=${viewingDetail.routeId}`}
                                                target="_blank"
                                                className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full"
                                            >
                                                📷 {order.deliveryPhotoCount} 張照片
                                            </a>
                                        )}
                                    </div>
                                    {order.phone && <p className="text-sm text-gray-600">📞 {order.phone}</p>}
                                    {order.address && <p className="text-sm text-gray-600">📍 {order.address}</p>}
                                    {order.items && <p className="text-sm text-gray-600">📦 {order.items}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 歷史列表頁面
    return (
        <div className="min-h-screen bg-[#F2F2F7]">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 px-5 py-4">
                <div className="flex items-center justify-between max-w-md mx-auto">
                    <Link href="/" className="text-blue-600">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-lg font-bold">歷史記錄</h1>
                    <div className="w-6" />
                </div>
            </header>

            <main className="max-w-md mx-auto p-4">
                {/* 日期選擇 */}
                <div className="flex items-center gap-3 mb-4">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                {/* 記錄列表 */}
                {loading ? (
                    <div className="text-center py-8 text-gray-500">載入中...</div>
                ) : records.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        當日無派單記錄
                    </div>
                ) : (
                    <div className="space-y-3">
                        {records.map((record) => (
                            <div
                                key={record.routeId}
                                className="bg-white rounded-2xl p-4 shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span className="font-medium">{formatTime(record.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-gray-500">
                                        <Package className="w-4 h-4" />
                                        <span>{record.orderCount} 筆訂單</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => copyLink(record.routeId)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        {copiedId === record.routeId ? (
                                            <>
                                                <Check className="w-4 h-4 text-green-600" />
                                                <span className="text-green-600">已複製</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4" />
                                                <span>複製</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => viewDetail(record.routeId)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors"
                                    >
                                        <Eye className="w-4 h-4" />
                                        <span>詳情</span>
                                    </button>
                                    <button
                                        onClick={() => deleteRecord(record.routeId)}
                                        className="py-2 px-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
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
