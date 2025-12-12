'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Share2, Loader2, GripVertical, X, MapPin, Image as ImageIcon, Info, ListOrdered, Send, FileText, Github } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { compressImage } from '../utils/image-compression';
import { saveToDB, getFromDB, deleteFromDB } from '../utils/db';

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
  const [failedUploads, setFailedUploads] = useState<{ file: File; error: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://routesnap-backend.lalawgwg99.workers.dev';
  const STORAGE_KEY = 'routesnap_draft_orders'; // LocalStorage key

  // LocalStorage 暫存：自動儲存 (遷移到 IndexedDB)
  useEffect(() => {
    const loadDrafts = async () => {
      try {
        const saved = await getFromDB(STORAGE_KEY);
        if (saved && Array.isArray(saved) && saved.length > 0) {
          setOrders(saved);
          console.log('Restored drafts from IndexedDB');
        } else {
          // Fallback: Check LocalStorage (migration path)
          const lsSaved = localStorage.getItem(STORAGE_KEY);
          if (lsSaved) {
            try {
              const parsed = JSON.parse(lsSaved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setOrders(parsed);
                console.log('Restored drafts from Legacy LocalStorage');
              }
            } catch (e) { console.error(e); }
          }
        }
      } catch (e) {
        console.error('無法恢復草稿:', e);
      }
    };
    loadDrafts();
  }, []);

  // IndexedDB 暫存：防抖動儲存 (Debounce Save)
  useEffect(() => {
    if (orders.length > 0 && !routeId) {
      // 延遲 1 秒存檔，避免連續操作大量寫入
      const timer = setTimeout(() => {
        saveToDB(STORAGE_KEY, orders).catch(e => console.error('Failed to save to DB', e));
        console.log('Debounced save to DB executed');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [orders, routeId]);

  // 防手殘關閉 (Unload Protection)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (loading || uploadQueue.length > 0) {
        e.preventDefault();
        e.returnValue = ''; // Chrome require returnValue to be set
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [loading, uploadQueue]);



  // 批量上傳處理
  // 批量上傳處理
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.length > 15) {
      alert('最多只能上傳 15 張圖片');
      return;
    }

    setUploadQueue(files);
    setLoading(true);

    const newOrders: any[] = [];
    let successCount = 0;
    let failCount = 0;
    const errorDetails: string[] = [];

    // Helper: Retry function
    const fetchWithRetry = async (url: string, options: any, retries = 3, delay = 1000): Promise<any> => {
      try {
        const res = await fetch(url, options);
        if (!res.ok) {
          // 如果是 5xx 錯誤，拋出異常以觸發重試
          if (res.status >= 500) throw new Error(`HTTP Error ${res.status}`);
          return res; // 4xx 錯誤直接回傳 (如圖片格式錯誤)
        }
        return res;
      } catch (err) {
        if (retries > 0) {
          console.warn(`Retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchWithRetry(url, options, retries - 1, delay * 2);
        } else {
          throw err;
        }
      }
    };

    // 順序處理每張圖片
    for (const file of files) {
      // 更新處理進度 (使用 index)
      const currentIndex = files.indexOf(file);
      setProcessingIndex(currentIndex);

      // CRITICAL: 讓出主線程，避免 UI 凍結 (特別是手機)
      await new Promise(r => setTimeout(r, 100));

      // 1. 執行壓縮
      let processedFile = file;
      try {
        processedFile = await compressImage(file);
      } catch (e) {
        console.error('Compression failed, using original file', e);
      }

      const formData = new FormData();
      formData.append('image', processedFile);

      try {
        // 使用 retry 機制呼叫 API
        const res = await fetchWithRetry(`${API_URL}/api/analyze`, { method: 'POST', body: formData });

        let json;
        try {
          json = await res.json();
        } catch (_) { // Fix lint: unused var
          throw new Error('Invalid JSON response');
        }

        if (json.success && json.data.orders) {
          const ordersWithId = json.data.orders.map((o: any, idx: number) => ({
            ...o,
            id: `item-${Date.now()}-${currentIndex}-${idx}`,
            sourceImage: file.name
          }));
          newOrders.push(...ordersWithId);
          // successCount is purely for logging/stats now, and we are using it
          successCount++;
        } else {
          console.error(`圖片 ${file.name} 辨識失敗:`, json.error);
          failCount++;
          errorDetails.push(`${file.name}: ${json.error || 'Unknown error'}`);
          // 加入失敗清單
          setFailedUploads(prev => [...prev, { file, error: json.error || 'Unknown error' }]);
        }
      } catch (err: any) {
        console.error(`圖片 ${file.name} 上傳錯誤:`, err);
        failCount++;
        errorDetails.push(`${file.name}: ${err.message || 'Network/Server error'}`);
        // 加入失敗清單
        setFailedUploads(prev => [...prev, { file, error: err.message || 'Network error' }]);
      }
    }

    // 追加到現有訂單（而非取代）
    setOrders(prevOrders => [...prevOrders, ...newOrders]);
    setLoading(false);
    setProcessingIndex(-1);
    setUploadQueue([]);

    // 顯示結果摘要 (如果有失敗，且沒有顯示失敗重試區塊時才跳窗，但這裡我們總是有重試區塊，所以可以簡化報告)
    if (failCount > 0) {
      // 選擇不跳煩人的 alert，因為我們會顯示 "失敗項目" 區塊讓用戶重試
      console.log(`Upload completed with ${failCount} failures.`);
    } else {
      console.log('Batch upload completed successfully');
      // 成功後清除失敗紀錄 (如果是乾淨的上傳)
      // 如果這次是重試，我們不清除之前的（除非重試與之前無關，這裡假設每次 handleUpload 都是新的一批或重試）
      // 因為 handleUpload 接收 files 參數，如果是新上傳，則不影響舊的 failedUploads 除非我們想合併
      // 這裡簡化邏輯：如果是手動上傳新檔案，保留舊的失敗紀錄是合理的嗎？
      // 通常上傳新檔案時，舊的失敗檔案如果還沒重試，應該還是在那裡比較好。
      /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
      const _unused = successCount; // keep logic but make linter happy or just remove it if really unused
    }
  };

  const handleRetryFailed = () => {
    if (failedUploads.length === 0) return;
    const filesToRetry = failedUploads.map(f => f.file);
    // 清除失敗紀錄，重新開始上傳這些檔案
    setFailedUploads([]);
    // 呼叫 handleUpload 邏輯 (需要封裝一下或模擬 event)
    // 由於 handleUpload 依賴 event，我們將其核心邏輯抽取出來或簡單地構造一個 mock event
    // 但更好的方式是將核心邏輯抽離。為了最小改動，我們模擬一個 event object
    const mockEvent = {
      target: { files: filesToRetry }
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    handleUpload(mockEvent);
  };

  // Explicitly export or use handleRetryFailed (it is used in JSX but sometimes linter misses it if conditional render is complex, verifying usage)
  // It is used in the JSX: onClick={handleRetryFailed}


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
        body: JSON.stringify({ orders, createdAt: new Date() }),
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setRouteId(data.routeId);
      // 成功建立連結後清除草稿
      deleteFromDB(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY); // Clean legacy
    } catch (_) { // Fix lint: 'e' is defined but never used
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
          .quantity.clickable {
            cursor: pointer;
            transition: all 0.2s;
          }
          .quantity.clickable:hover {
            background-color: #e6f7ff;
          }
          .quantity.checked {
            background-color: #d4edda;
            color: #155724;
            border-radius: 4px;
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
        <script>
          function toggleCheck(cell) {
            if (cell.classList.contains('checked')) {
              cell.classList.remove('checked');
              const text = cell.innerText.replace('✅ ', '');
              cell.innerText = text;
            } else {
              cell.classList.add('checked');
              const text = cell.innerText;
              cell.innerText = '✅ ' + text;
            }
          }
        </script>
        <button class="close-button" onclick="window.close()">← 關閉視窗</button>
        <button class="print-button" onclick="window.print()">🖨️ 列印 / 儲存 PDF</button>
        <div class="instruction">
          💡 <strong>提示：</strong><br>
          您可以點擊「數量」欄位來標記進度<br>
          列印完成後，請關閉此視窗
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
                    <th style="width: 30%">數量 (點擊打勾)</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((item: { name: string; quantity: string }) => `
                    <tr>
                      <td>${item.name}</td>
                      <td class="quantity clickable" onclick="toggleCheck(this)">${item.quantity}</td>
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

  // 重置/清除所有資料
  const handleReset = () => {
    if (confirm('確定要清除所有資料並重新開始嗎？\n這將會移除目前的訂單清單以及暫存。')) {
      setOrders([]);
      setRouteId('');
      setUploadQueue([]);
      setFailedUploads([]); // 清除失敗紀錄
      setLoading(false);
      setProcessingIndex(-1);
      setProcessingIndex(-1);
      // 清除 IndexedDB
      deleteFromDB(STORAGE_KEY);
      // 清除 LocalStorage (Legacy)
      localStorage.removeItem(STORAGE_KEY);
      // 清除檔案輸入
      // 清除檔案輸入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // 重整頁面以確保乾淨狀態 (可選，但這樣最保險)
      window.location.reload();
    }
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
              <button
                onClick={handleReset}
                className="text-[13px] font-semibold bg-red-50 text-red-600 px-3 py-1 rounded-full hover:bg-red-100 transition-colors flex items-center gap-1"
              >
                ↺ 重置
              </button>
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
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6">
        {/* 狀態 0: 失敗重試區 */}
        {!routeId && failedUploads.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-100 rounded-[20px] p-5 shadow-sm animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-red-800 font-bold flex items-center gap-2">
                <span className="bg-red-200 text-red-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">!</span>
                {failedUploads.length} 張圖片上傳失敗
              </h3>
              <button
                onClick={() => setFailedUploads([])}
                className="text-red-400 text-sm font-medium hover:text-red-600"
              >
                忽略
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto bg-white/50 rounded-lg p-2 mb-4 text-xs space-y-1">
              {failedUploads.map((fail, idx) => (
                <div key={idx} className="text-red-600 flex justify-between">
                  <span className="truncate max-w-[70%]">{fail.file.name}</span>
                  <span className="opacity-70">{fail.error}</span>
                </div>
              ))}
            </div>
            <button
              onClick={handleRetryFailed}
              className="w-full py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : 'hidden'}`} />
              重新上傳失敗項目
            </button>
          </div>
        )}

        {/* 狀態 1-A: 載入/處理中 (獨立顯示，覆蓋在上方或插入列表頭部) */}
        {loading && (
          <div className="bg-white rounded-[20px] p-8 text-center shadow-sm border border-blue-100 mb-4 animate-in fade-in zoom-in">
            <div className="py-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 font-medium">
                {uploadQueue.length > 0
                  ? `AI 正在分析第 ${processingIndex + 1}/${uploadQueue.length} 張...`
                  : '正在處理中...'
                }
              </p>
              {uploadQueue.length > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((processingIndex + 1) / uploadQueue.length) * 100}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 狀態 1-B: 初始拍照區 (僅在無訂單且非載入中時顯示) */}
        {!routeId && orders.length === 0 && !loading && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group relative overflow-hidden bg-white rounded-[20px] p-8 text-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 transition-all active:scale-[0.98] cursor-pointer"
          >
            <div className="py-2">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 transition-colors">
                <Camera className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">拍攝訂單</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                開啟相機或上傳圖片<br />支援批量上傳 2-15 張<br />AI 自動辨識地址並排序
              </p>
            </div>
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
                    點擊上方相機圖示，一次可選 <span className="text-blue-600 font-bold">2-50 張</span> 照片。AI 會自動辨識地址並排序。
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

              {/* GitHub 連結 */}
              <a
                href="https://github.com/lalawgwg99/delivery-app-"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer mt-2"
              >
                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 text-white">
                  <Github className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">GitHub 開源專案</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    查看原始碼與說明文件
                  </p>
                </div>
              </a>
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-blue-500 font-mono tracking-widest">DESIGNED 🐣榮德</p>
            </div>
          </div>
        )}

        {/* 狀態 2: 編輯與排序列表 (Vitality Style) */}
        {orders.length > 0 && !routeId && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 pb-24">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">配送順序 ({orders.length})</h2>
              <span className="text-xs font-medium text-[var(--color-aqua-600)] bg-[var(--color-aqua-50)] px-3 py-1 rounded-full">長按拖曳排序</span>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <StrictModeDroppable droppableId="orders-list">
                {(provided: any) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4"
                  >
                    {orders.map((order, index) => (
                      <Draggable key={order.id || index} draggableId={order.id || String(index)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`relative bg-white rounded-[24px] p-5 transition-all ${snapshot.isDragging
                              ? 'shadow-2xl scale-105 z-50 rotate-1 ring-2 ring-[var(--color-aqua-400)]'
                              : 'soft-shadow hover:shadow-md'
                              }`}
                          >
                            <div className="flex items-start gap-4">
                              {/* Index Avatar */}
                              <div className="flex-shrink-0">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color-aqua-400)] to-[var(--color-aqua-600)] flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-500/30">
                                  {index + 1}
                                </div>
                              </div>

                              {/* 內容編輯區 */}
                              <div className="flex-1 min-w-0 space-y-1">
                                {/* 客戶名稱與電話 */}
                                <div className="flex items-center justify-between">
                                  <input
                                    value={order.customer || ''}
                                    placeholder="輸入客戶名稱..."
                                    onChange={(e) => updateOrder(index, 'customer', e.target.value)}
                                    className="block w-full text-lg font-bold text-slate-800 placeholder-slate-300 bg-transparent border-none focus:ring-0 p-0"
                                  />
                                </div>

                                {order.phone && (
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <span className="opacity-50">📞</span>
                                    <input
                                      value={order.phone || ''}
                                      placeholder="電話號碼"
                                      onChange={(e) => updateOrder(index, 'phone', e.target.value)}
                                      className="block w-full bg-transparent border-none focus:ring-0 p-0 text-slate-600 font-medium"
                                    />
                                  </div>
                                )}

                                {/* 地址編輯 */}
                                <div className="pt-2">
                                  <div className="flex items-start gap-2 bg-[var(--color-surface-bg)] rounded-xl p-3">
                                    <MapPin className="w-4 h-4 text-[var(--color-aqua-500)] mt-0.5 flex-shrink-0" />
                                    <textarea
                                      value={order.address || ''}
                                      placeholder="輸入完整地址..."
                                      rows={2}
                                      onChange={(e) => updateOrder(index, 'address', e.target.value)}
                                      className="block w-full text-[14px] leading-relaxed text-slate-600 bg-transparent border-none focus:ring-0 p-0 resize-none placeholder-slate-400"
                                    />
                                  </div>
                                </div>

                                {/* 標籤區 */}
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {order.orderNumber && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700">
                                      #{order.orderNumber}
                                    </span>
                                  )}
                                  {order.invoiceNumber && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">
                                      發票 {order.invoiceNumber}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* 拖曳手把與刪除 */}
                              <div className="flex flex-col items-center gap-2">
                                <button
                                  onClick={() => removeOrder(index)}
                                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                                <div
                                  {...provided.dragHandleProps}
                                  className="p-2 text-slate-300 hover:text-[var(--color-aqua-500)] cursor-grab active:cursor-grabbing touch-none"
                                >
                                  <GripVertical className="w-5 h-5" />
                                </div>
                              </div>
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

            {/* 底部浮動按鈕區 (Glassmorphism) */}
            <div className="fixed bottom-0 left-0 right-0 p-4 z-40">
              <div className="max-w-md mx-auto">
                <div className="glass-panel p-2 rounded-[28px] shadow-2xl shadow-blue-900/10">
                  <div className="flex items-center gap-2">
                    {/* 更多功能 Dropdown or inline buttons */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--color-surface-bg)] text-[var(--color-aqua-600)] hover:bg-[var(--color-aqua-50)] transition-colors"
                      title="追加上傳"
                    >
                      <Camera className="w-5 h-5" />
                    </button>

                    <button
                      onClick={generatePickingListPDF}
                      className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--color-surface-bg)] text-slate-600 hover:bg-slate-100 transition-colors"
                      title="備貨表"
                    >
                      <FileText className="w-5 h-5" />
                    </button>

                    {/* 主按鈕: 生成連結 */}
                    <button
                      onClick={createLink}
                      className="flex-1 bg-gradient-to-r from-[var(--color-aqua-500)] to-[var(--color-aqua-400)] text-white h-12 rounded-full font-bold text-lg shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-5 h-5" />
                      生成派單連結
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 狀態 3: 分享成功頁 (Vitality Style) */}
        {routeId && (
          <div className="bg-white rounded-[32px] p-8 soft-shadow text-center animate-in zoom-in duration-300 mt-4 border border-[var(--color-aqua-100)]">
            <div className="w-24 h-24 bg-[var(--color-aqua-50)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Share2 className="w-12 h-12 text-[var(--color-aqua-500)]" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">準備完成！</h2>

            {/* 顯示訂單數量 */}
            <div className="bg-[var(--color-surface-bg)] text-[var(--color-aqua-600)] px-5 py-2 rounded-full inline-block mb-6 font-bold border border-[var(--color-aqua-100)]">
              📦 本次共 {orders.length} 筆訂單
            </div>

            <p className="text-slate-500 mb-8 leading-relaxed text-lg">
              路線已建立並儲存<br />請將連結傳送給外送員
            </p>

            <button
              onClick={shareToLine}
              className="w-full bg-[#06C755] text-white py-4 rounded-[20px] font-bold text-xl flex items-center justify-center gap-3 shadow-lg shadow-[#06C755]/20 active:brightness-90 transition-all mb-4"
            >
              <span className="text-2xl">LINE</span> 一鍵傳送
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(driverLink);
                alert('連結已複製');
              }}
              className="w-full bg-slate-100/50 text-slate-600 py-4 rounded-[20px] font-bold text-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5 opacity-50" />
              複製連結
            </button>

            {/* 繼續上傳和建立新單 */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
              <button
                onClick={() => {
                  setRouteId('');
                  // 保留現有訂單，返回編輯頁面繼續上傳
                }}
                className="flex-1 py-3 text-[var(--color-warm-500)] font-bold hover:bg-[var(--color-warm-50)] rounded-xl transition-colors"
              >
                ➕ 繼續上傳
              </button>
              <div className="w-px bg-slate-200"></div>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 text-slate-400 font-bold hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
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
