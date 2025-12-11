'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { MapPin, CheckCircle, Navigation, Phone, FileText, X, Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://routesnap-backend.lalawgwg99.workers.dev';

function DriverContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
    const [viewingDeliveryPhotos, setViewingDeliveryPhotos] = useState<{ orderIndex: number; photos: string[] } | null>(null);
    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (!id) return;
        fetch(`${API_URL}/api/route/${id}`)
            .then(res => res.json())
            .then(data => {
                if (data.orders) {
                    const loadedOrders = data.orders.map((o: any) => ({
                        ...o,
                        status: o.deliveryPhotoCount && o.deliveryPhotoCount >= 2 ? 'done' : 'pending'
                    }));
                    setOrders(loadedOrders);
                }
                setLoading(false);
            })
            .catch(() => {
                alert('訂單讀取錯誤');
                setLoading(false);
            });
    }, [id]);

    const openMap = (address: string) => {
        window.location.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    };

    const makeCall = (phone: string) => {
        if (!phone) return;
        window.location.href = `tel:${phone}`;
    };

    // 上傳送達照片
    const uploadDeliveryPhoto = async (orderIndex: number, file: File) => {
        if (!id) return;
        setUploadingIndex(orderIndex);

        const formData = new FormData();
        formData.append('image', file);
        formData.append('routeId', id);
        formData.append('orderIndex', String(orderIndex));

        try {
            const res = await fetch(`${API_URL}/api/upload-delivery-photo`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                // 更新本地狀態
                const newOrders = [...orders];
                newOrders[orderIndex].deliveryPhotoCount = data.totalPhotos;
                if (data.totalPhotos >= 2) {
                    newOrders[orderIndex].status = 'done';
                }
                setOrders(newOrders);
            } else {
                alert(data.error || '上傳失敗');
            }
        } catch (e) {
            alert('上傳失敗，請重試');
        }
        setUploadingIndex(null);
    };

    // 查看已拍照片
    const viewDeliveryPhotos = async (orderIndex: number) => {
        if (!id) return;
        try {
            const res = await fetch(`${API_URL}/api/delivery-photos/${id}/${orderIndex}`);
            const data = await res.json();
            if (data.success && data.photos.length > 0) {
                const photoUrls = data.photos.map((p: any) => `${API_URL}${p.url}`);
                setViewingDeliveryPhotos({ orderIndex, photos: photoUrls });
            } else {
                alert('尚無送達照片');
            }
        } catch (e) {
            alert('載入照片失敗');
        }
    };

    const handleFileSelect = (orderIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadDeliveryPhoto(orderIndex, file);
        }
        e.target.value = ''; // 重置，允許再次選擇同一檔案
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen text-gray-500 gap-3">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p>正在載入訂單...</p>
        </div>
    );

    if (orders.length === 0) return <div className="p-8 text-center text-gray-500">此連結無效或訂單已過期</div>;

    const doneCount = orders.filter(o => o.status === 'done').length;
    const progress = Math.round((doneCount / orders.length) * 100);

    return (
        <div className="min-h-screen bg-[#F2F4F6] p-4 max-w-md mx-auto font-sans pb-10">
            {/* 頂部進度條 */}
            <div className="bg-white px-5 py-4 rounded-2xl shadow-sm mb-5 sticky top-2 z-20 border border-gray-100/50 backdrop-blur-md bg-white/90">
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <h1 className="text-xl font-black text-gray-800">🛵 今日配送</h1>
                        <p className="text-xs text-gray-400 mt-0.5">還有 {orders.length - doneCount} 單待送</p>
                    </div>
                    <span className="text-2xl font-black text-blue-600">{progress}<span className="text-sm">%</span></span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            <div className="space-y-4">
                {orders.map((order, i) => {
                    const isDone = order.status === 'done';
                    const photoCount = order.deliveryPhotoCount || 0;
                    const isUploading = uploadingIndex === i;

                    return (
                        <div
                            key={i}
                            className={`relative p-5 rounded-2xl transition-all duration-300 border ${isDone
                                ? 'bg-green-50 border-green-200'
                                : 'bg-white shadow-sm border-gray-100 scale-100'
                                }`}
                        >
                            {/* 頂部：序號、客戶名稱 */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shadow-sm ${isDone ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'
                                        }`}>
                                        {isDone ? '✓' : i + 1}
                                    </span>
                                    <div>
                                        <span className={`font-bold text-lg ${isDone ? 'text-green-700' : 'text-gray-800'}`}>
                                            {order.customer || '客戶'}
                                        </span>
                                        {order.phone && (
                                            <button
                                                onClick={() => makeCall(order.phone)}
                                                className="flex items-center gap-1 mt-1 text-sm text-blue-600 hover:text-blue-700 active:scale-95 transition-all"
                                            >
                                                <Phone className="w-3.5 h-3.5" />
                                                <span>{order.phone}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* 照片狀態標籤 */}
                                <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${isDone
                                    ? 'bg-green-100 text-green-700'
                                    : photoCount > 0
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-gray-100 text-gray-400'
                                    }`}>
                                    📷 {photoCount}/8
                                </div>
                            </div>

                            {/* 訂單編號與發票號碼 */}
                            {(order.orderNumber || order.invoiceNumber) && (
                                <div className="flex gap-2 mb-3 text-xs">
                                    {order.orderNumber && (
                                        <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">
                                            單號: {order.orderNumber}
                                        </span>
                                    )}
                                    {order.invoiceNumber && (
                                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded">
                                            發票: {order.invoiceNumber}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* 商品資訊 */}
                            {order.items && (
                                <div className="bg-blue-50 px-3 py-2 rounded-lg mb-3">
                                    <p className="text-sm font-medium text-blue-900">
                                        📦 {order.items}
                                    </p>
                                </div>
                            )}

                            {/* 地址 */}
                            <div
                                onClick={() => openMap(order.address)}
                                className="flex items-start gap-2.5 mb-4 pl-1 cursor-pointer group"
                            >
                                <MapPin className={`w-5 h-5 mt-0.5 flex-shrink-0 transition-colors ${isDone ? 'text-green-500' : 'text-red-500 group-hover:scale-110'}`} />
                                <div className="flex-1">
                                    <p className={`text-[17px] leading-snug font-medium transition-colors ${isDone ? 'text-green-700' : 'text-gray-800 group-hover:text-blue-600'
                                        }`}>
                                        {order.address}
                                    </p>
                                    {order.note && <p className="text-sm text-orange-500 mt-1">{order.note}</p>}
                                </div>
                            </div>

                            {/* 操作按鈕區 */}
                            <div className="grid grid-cols-2 gap-2">
                                {/* 導航/看單 按鈕 */}
                                <button
                                    onClick={() => openMap(order.address)}
                                    className="bg-blue-50 text-blue-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors active:scale-95"
                                >
                                    <Navigation className="w-4 h-4 fill-current" />
                                    開啟導航
                                </button>

                                {order.imageKey && (
                                    <button
                                        onClick={() => setViewingImage(order.imageKey)}
                                        className="bg-gray-50 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors active:scale-95"
                                    >
                                        <FileText className="w-4 h-4" />
                                        看單
                                    </button>
                                )}
                            </div>

                            {/* 拍照回報區 */}
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <p className="text-xs text-gray-500 mb-2">
                                    送達拍照回報 (需至少 2 張)
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => fileInputRefs.current[i]?.click()}
                                        disabled={isUploading || photoCount >= 8}
                                        className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors active:scale-95 ${photoCount >= 8
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                                            }`}
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                上傳中...
                                            </>
                                        ) : (
                                            <>
                                                <Camera className="w-4 h-4" />
                                                拍照上傳
                                            </>
                                        )}
                                    </button>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        ref={el => { fileInputRefs.current[i] = el; }}
                                        onChange={(e) => handleFileSelect(i, e)}
                                    />

                                    <button
                                        onClick={() => viewDeliveryPhotos(i)}
                                        disabled={photoCount === 0}
                                        className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors active:scale-95 ${photoCount === 0
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                                            }`}
                                    >
                                        <ImageIcon className="w-4 h-4" />
                                        查看已拍 ({photoCount})
                                    </button>
                                </div>
                            </div>

                            {/* 完成標記 */}
                            {isDone && (
                                <div className="absolute top-3 right-3">
                                    <CheckCircle className="w-6 h-6 text-green-500" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 外送單原圖彈窗 */}
            {viewingImage && (
                <div
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setViewingImage(null)}
                >
                    <div className="relative max-w-4xl w-full bg-white rounded-2xl p-4 animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setViewingImage(null)}
                            className="absolute top-2 right-2 bg-gray-900/80 text-white p-2 rounded-full hover:bg-gray-900 transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">外送單原圖</h3>
                            <div className="bg-gray-100 rounded-xl overflow-hidden">
                                <img
                                    src={`${API_URL}/api/image/${viewingImage}`}
                                    alt="外送單原圖"
                                    className="w-full h-auto max-h-[70vh] object-contain"
                                    onError={(e) => {
                                        e.currentTarget.src = '';
                                        e.currentTarget.alt = '圖片載入失敗';
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 送達照片彈窗 */}
            {viewingDeliveryPhotos && (
                <div
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setViewingDeliveryPhotos(null)}
                >
                    <div className="relative max-w-4xl w-full bg-white rounded-2xl p-4 animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setViewingDeliveryPhotos(null)}
                            className="absolute top-2 right-2 bg-gray-900/80 text-white p-2 rounded-full hover:bg-gray-900 transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">送達照片 ({viewingDeliveryPhotos.photos.length} 張)</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {viewingDeliveryPhotos.photos.map((url, idx) => (
                                    <div key={idx} className="bg-gray-100 rounded-xl overflow-hidden">
                                        <img
                                            src={url}
                                            alt={`送達照片 ${idx + 1}`}
                                            className="w-full h-auto object-cover aspect-square"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="text-center mt-8 text-gray-300 text-xs font-mono">
                Powered by RouteSnap AI
            </div>
        </div>
    );
}

export default function DriverView() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
            <DriverContent />
        </Suspense>
    );
}
