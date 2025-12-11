'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Share2, Loader2, GripVertical, X, MapPin, Image as ImageIcon, Info, ListOrdered, Send, Smartphone, CheckCircle, Navigation, Phone, FileText } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

// 解決 Next.js 在 Strict Mode 下與拖曳套件的兼容性問題
const StrictModeDroppable = ({ children, ...props }: any) => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);
  if (!enabled) return null;
  return <Droppable {...props}>{children}</Droppable>;
};

export default function StoreAdmin() {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [routeId, setRouteId] = useState('');
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [processingIndex, setProcessingIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://routesnap-backend.lalawgwg99.workers.dev';

  // 批量上傳處理
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.length > 6) {
      alert('最多只能上傳 6 張圖片');
      return;
    }

    setUploadQueue(files);
    setLoading(true);

    const allOrders: any[] = [];

    for (let i = 0; i < files.length; i++) {
      setProcessingIndex(i);
      const file = files[i];
      const formData = new FormData();
      formData.append('image', file);

      try {
        const res = await fetch(`${API_URL}/api/analyze`, { method: 'POST', body: formData });
        const json = await res.json();

        if (json.success && json.data.orders) {
          const ordersWithId = json.data.orders.map((o: any, idx: number) => ({
            ...o,
            id: `item-${Date.now()}-${i}-${idx}`,
            sourceImage: file.name
          }));
          allOrders.push(...ordersWithId);
        } else {
          console.error(`圖片 ${i + 1} 辨識失敗:`, json.error);
        }
      } catch (err: any) {
        console.error(`圖片 ${i + 1} 上傳錯誤:`, err);
      }
    }

    setOrders(allOrders);
    setLoading(false);
    setProcessingIndex(-1);
    setUploadQueue([]);
  };

  // 拖曳排序邏輯
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(orders);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setOrders(items);
  };

  // 編輯邏輯
  const updateOrder = (index: number, field: string, value: string) => {
    const newOrders = [...orders];
    newOrders[index][field] = value;
    setOrders(newOrders);
  };

  const removeOrder = (index: number) => {
    if (confirm('確定要刪除這筆訂單嗎？')) {
      const newOrders = [...orders];
      newOrders.splice(index, 1);
      setOrders(newOrders);
    }
  };

  const createLink = async () => {
    if (!API_URL) return alert('未設定 API URL');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/create-route`, {
        method: 'POST',
        body: JSON.stringify({ orders, createdAt: new Date() })
      });
      const data = await res.json();
      setRouteId(data.routeId);
    } catch (e) {
      alert('建立連結失敗');
    }
    setLoading(false);
  };

  const driverLink = typeof window !== 'undefined' ? `${window.location.origin}/driver?id=${routeId}` : '';
  const shareToLine = () => {
    window.location.href = `https://line.me/R/msg/text/?今日外送單！%0A點擊導航：${encodeURIComponent(driverLink)}`;
  };

  // 生成備貨總表（使用瀏覽器列印功能，完美支援中文）
  const generatePickingListPDF = () => {
    const today = new Date().toLocaleDateString('zh-TW');

    // 計算總商品數
    const totalItems = orders.reduce((sum, order) => {
      const items = order.items ? order.items.split(',') : [];
      const quantities = items.map((item: string) => {
        const match = item.match(/[xX×]\s*(\d+)/);
        return match ? parseInt(match[1]) : 1;
      });
      return sum + quantities.reduce((a: number, b: number) => a + b, 0);
    }, 0);

    // 創建列印視窗
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('請允許彈出視窗以生成備貨總表');
      return;
    }

    // 生成 HTML 內容
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>備貨總表_${today}</title>
        <style>
          @media print {
            @page { margin: 1cm; }
            body { margin: 0; }
          }
          body {
            font-family: 'Microsoft JhengHei', 'PingFang TC', 'Noto Sans TC', sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            text-align: center;
            color: #333;
            font-size: 24px;
            margin-bottom: 10px;
          }
          .header-info {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
          }
          .customer-section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          .customer-name {
            font-size: 16px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
            padding: 8px;
            background: #f5f5f5;
            border-left: 4px solid #428bca;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          th {
            background-color: #428bca;
            color: white;
            font-weight: bold;
          }
          td {
            background-color: white;
          }
          .quantity {
            text-align: center;
            font-weight: bold;
            color: #428bca;
          }
          .footer {
            margin-top: 30px;
            padding: 15px;
            background: #f8f9fa;
            border: 2px solid #428bca;
            text-align: center;
            font-size: 16px;
            font-weight: bold;
          }
          .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: #428bca;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          }
          .print-button:hover {
            background: #3071a9;
          }
          .close-button {
            position: fixed;
            top: 20px;
            left: 20px;
            padding: 12px 24px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          }
          .close-button:hover {
            background: #5a6268;
          }
          .instruction {
            position: fixed;
            top: 80px;
            right: 20px;
            background: #fff3cd;
            border: 2px solid #ffc107;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            color: #856404;
            max-width: 300px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          @media print {
            .print-button, .close-button, .instruction { display: none; }
          }
        </style>
      </head>
      <body>
        <button class="close-button" onclick="window.close()">← 關閉視窗</button>
        <button class="print-button" onclick="window.print()">🖨️ 列印 / 儲存 PDF</button>
        <div class="instruction">
          💡 <strong>提示：</strong><br>
          列印完成後，請關閉此視窗<br>
          返回主頁面生成派單連結
        </div>
        
        <h1>備貨總表</h1>
        <div class="header-info">
          日期：${today} | 訂單數：${orders.length}
        </div>

        ${orders.map((order, index) => {
      // 解析商品
      const items = order.items ? order.items.split(',').map((item: string) => {
        const trimmed = item.trim();
        const match = trimmed.match(/^(.+?)\s*[xX×]\s*(\d+)$/);
        if (match) {
          return { name: match[1].trim(), quantity: match[2] };
        }
        return { name: trimmed, quantity: '1' };
      }) : [{ name: '無商品資訊', quantity: '0' }];

      return `
            <div class="customer-section">
              <div class="customer-name">${index + 1}. ${order.customer || '未命名客戶'}</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 70%">商品名稱</th>
                    <th style="width: 30%">數量</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((item: { name: string; quantity: string }) => `
                    <tr>
                      <td>${item.name}</td>
                      <td class="quantity">${item.quantity}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
    }).join('')}

        <div class="footer">
          總計：${orders.length} 位客戶，${totalItems} 件商品
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-32">
      {/* iOS Style Header with Blur */}
      <header className="sticky top-0 z-50 bg-[#F2F2F7]/80 backdrop-blur-xl border-b border-gray-200/50 px-5 py-4 transition-all">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex flex-col">
            <h1 className="text-[20px] font-bold text-gray-900 tracking-tight leading-tight">RouteSnap</h1>
            <p className="text-[13px] font-medium text-blue-600">AI識別派單系統</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <a
                href="/history"
                className="text-[13px] font-semibold bg-gray-100 text-gray-600 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                📋 歷史
              </a>
              <span className="text-[13px] font-semibold bg-blue-100 text-blue-600 px-3 py-1 rounded-full">
                WG五甲
              </span>
            </div>
            <a
              href="https://github.com/lalawgwg99/delivery-app-"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-gray-400 hover:text-blue-500 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6">
        {/* 狀態 1: 拍照區 */}
        {!routeId && (
          <div
            onClick={() => !loading && fileInputRef.current?.click()}
            className={`group relative overflow-hidden bg-white rounded-[20px] p-8 text-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 transition-all active:scale-[0.98] ${loading ? 'opacity-80' : 'cursor-pointer'}`}
          >
            {loading ? (
              <div className="py-8">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-500 font-medium">AI 正在分析第 {processingIndex + 1}/{uploadQueue.length} 張...</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((processingIndex + 1) / uploadQueue.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="py-2">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 transition-colors">
                  <Camera className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">拍攝訂單</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  開啟相機或上傳圖片<br />支援批量上傳 2-6 張<br />AI 自動辨識地址並排序
                </p>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={loading}
            />
          </div>
        )}

        {/* 操作說明區 (僅在初始狀態顯示) */}
        {!routeId && orders.length === 0 && !loading && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex items-center gap-2 mb-4 px-2">
              <Info className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">使用說明</h3>
            </div>

            <div className="grid gap-4">
              {/* 步驟 1: 拍照 */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">1. 拍攝訂單</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    點擊上方相機圖示，一次可選 <span className="text-blue-600 font-bold">2-6 張</span> 照片。AI 會自動辨識地址並排序。
                  </p>
                </div>
              </div>

              {/* 步驟 2: 編輯 */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 text-purple-600">
                  <ListOrdered className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">2. 確認與排序</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    檢查辨識結果，長按卡片可<span className="text-purple-600 font-bold">拖曳排序</span>。確認無誤後點擊生成連結。
                  </p>
                </div>
              </div>

              {/* 步驟 3: 分享 */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 text-green-600">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">3. 分享派單</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    將連結傳給外送員 (LINE)，他們即可透過手機導航並回報進度。
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-blue-500 font-mono tracking-widest">DESIGNED 🐣榮德</p>
            </div>
          </div>
        )}

        {/* 狀態 2: 編輯與排序列表 */}
        {orders.length > 0 && !routeId && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div className="flex items-center justify-between mb-3 px-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">配送順序 ({orders.length})</h2>
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">長按拖曳排序</span>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <StrictModeDroppable droppableId="orders-list">
                {(provided: any) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {orders.map((order, index) => (
                      <Draggable key={order.id || index} draggableId={order.id || String(index)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`relative bg-white rounded-[18px] p-4 shadow-sm border transition-all ${snapshot.isDragging
                              ? 'shadow-xl scale-105 border-blue-500 z-50 rotate-1'
                              : 'border-transparent hover:border-gray-200'
                              }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* 拖曳手把 */}
                              <div
                                {...provided.dragHandleProps}
                                className="mt-2 text-gray-300 active:text-blue-500 touch-none"
                              >
                                <GripVertical className="w-6 h-6" />
                              </div>

                              {/* 內容編輯區 */}
                              <div className="flex-1 min-w-0 space-y-2">
                                {/* 序號與客戶名稱 */}
                                <div className="flex items-center gap-2">
                                  <span className="flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex-shrink-0">
                                    {index + 1}
                                  </span>
                                  <input
                                    value={order.customer || ''}
                                    placeholder="輸入客戶名稱..."
                                    onChange={(e) => updateOrder(index, 'customer', e.target.value)}
                                    className="block w-full text-base font-bold text-gray-900 placeholder-gray-300 bg-transparent border-none focus:ring-0 p-0"
                                  />
                                </div>

                                {/* 電話號碼 */}
                                {order.phone && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-400">📞</span>
                                    <input
                                      value={order.phone || ''}
                                      placeholder="電話號碼"
                                      onChange={(e) => updateOrder(index, 'phone', e.target.value)}
                                      className="block w-full text-gray-700 bg-transparent border-none focus:ring-0 p-0"
                                    />
                                  </div>
                                )}

                                {/* 訂單編號與發票號碼 */}
                                <div className="flex gap-2 text-xs">
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

                                {/* 地址編輯 */}
                                <div className="flex items-start gap-2">
                                  <MapPin className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                                  <textarea
                                    value={order.address || ''}
                                    placeholder="輸入完整地址..."
                                    rows={2}
                                    onChange={(e) => updateOrder(index, 'address', e.target.value)}
                                    className="block w-full text-[15px] leading-snug text-gray-600 bg-gray-50 rounded-lg border-none focus:ring-2 focus:ring-blue-500/20 px-2 py-1.5 resize-none"
                                  />
                                </div>

                                {/* 來源圖片 */}
                                {order.sourceImage && (
                                  <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <ImageIcon className="w-3 h-3" />
                                    <span>{order.sourceImage}</span>
                                  </div>
                                )}
                              </div>

                              {/* 刪除按鈕 */}
                              <button
                                onClick={() => removeOrder(index)}
                                className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </StrictModeDroppable>
            </DragDropContext>

            {/* 底部浮動按鈕區 */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-gray-200">
              <div className="max-w-md mx-auto flex gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 active:bg-gray-200 transition-colors"
                >
                  重來
                </button>
                <button
                  onClick={generatePickingListPDF}
                  className="px-4 py-3.5 rounded-xl font-bold text-blue-600 bg-blue-50 active:bg-blue-100 transition-colors flex items-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  備貨總表
                </button>
                <button
                  onClick={createLink}
                  className="flex-1 bg-gray-900 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="w-5 h-5" />
                  生成派單連結
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 狀態 3: 分享成功頁 */}
        {routeId && (
          <div className="bg-white rounded-[24px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] text-center animate-in zoom-in duration-300 mt-4">
            <div className="w-20 h-20 bg-[#34C759]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Share2 className="w-10 h-10 text-[#34C759]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">準備完成！</h2>

            {/* 顯示訂單數量 */}
            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full inline-block mb-4">
              📦 本次共 {orders.length} 筆訂單
            </div>

            <p className="text-gray-500 mb-6 leading-relaxed">
              路線已建立並儲存<br />請將連結傳送給外送員
            </p>

            <button
              onClick={shareToLine}
              className="w-full bg-[#06C755] text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:brightness-90 transition-all"
            >
              LINE 一鍵傳送
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(driverLink);
                alert('連結已複製');
              }}
              className="mt-4 w-full bg-gray-50 text-gray-600 py-4 rounded-xl font-bold hover:bg-gray-100 transition-colors"
            >
              複製連結
            </button>

            {/* 繼續上傳和建立新單 */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setRouteId('');
                  // 保留現有訂單，返回編輯頁面繼續上傳
                }}
                className="flex-1 bg-orange-50 text-orange-600 py-3 rounded-xl font-bold hover:bg-orange-100 transition-colors"
              >
                ➕ 繼續上傳
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                建立新的一單
              </button>
            </div>
          </div>
        )}
      </main>
    </div >
  );
}
