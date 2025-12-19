import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

type Bindings = {
	ORDERS_DB: KVNamespace;
	GEMINI_API_KEY: string;
	HISTORY_PASSWORD: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// 允許跨域請求 (讓前端可以連線)
app.use('/*', cors({
	origin: '*',
	allowMethods: ['POST', 'GET', 'OPTIONS'],
	maxAge: 86400,
}));

// 1. 上傳圖片 -> AI 分析
app.post('/api/analyze', async (c) => {
	try {
		const formData = await c.req.parseBody();
		const image = formData['image'];

		if (!(image instanceof File)) {
			return c.json({ success: false, error: 'No image uploaded' }, 400);
		}

		console.log('📸 Image received:', image.name, image.type, image.size, 'bytes');

		// 設定 Gemini，啟用 JSON 模式
		const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY);
		const model = genAI.getGenerativeModel({
			model: "gemini-2.5-flash",
			generationConfig: {
				responseMimeType: "application/json",
				temperature: 0.4,  // 降低隨機性，提高穩定性
			}
		});

		const arrayBuffer = await image.arrayBuffer();

		// 使用 Web API 轉換為 base64（Cloudflare Workers 相容）
		const bytes = new Uint8Array(arrayBuffer);
		let binary = '';
		for (let i = 0; i < bytes.byteLength; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		const base64Image = btoa(binary);

		console.log('🔄 Sending to Gemini AI...');

		const customPrompt = formData['prompt'] as string;
		const prompt = customPrompt || `你是一個台灣物流路徑規劃專家。請分析這張收據或手寫單圖片。
      
      【請依照以下「視覺區塊」順序進行精確提取】
      
      **區塊 1：單據頭部 (Header)**
      - 尋找 「訂貨編號 (Order No.)」 或 「Booking No.」 -> 提取為 orderNumber
      - 尋找 「發票號碼 (Invoice No.)」 -> 提取為 invoiceNumber
      
      **區塊 2：客戶資訊 (Customer Info)**
      - 尋找 「顧客姓名 (Customer Name)」 -> 提取為 customer
      - 尋找 「電話號碼 (Telephone)」 -> 提取為 phone
      - 尋找 「送貨地址 (Delivery Address)」 -> 提取為 address (請去除郵遞區號，只保留完整中文地址)
      
      **區塊 3：商品明細 (Items)**
      - 尋找表格中的「商品名稱」或「Item Name」欄位
      - 尋找對應的「訂貨數」或「Qty」
      - **格式要求**：請將所有商品合併為一個字串，格式為「商品A x數量, 商品B x數量」
      - 若有「店備註 (Store Note)」或「其它備註」，請提取為 note

      **區塊 4：物流智慧運算 (Appliance Logistics AI)**
      - 分析上述提取的商品名稱與地址，計算以下欄位：

      **A. install_time_estimate (預估工時，單位：分鐘，Number)**
        - 基礎時間：30 分鐘
        - 加時規則 (累加)：
          - 若包含「滾筒洗衣機」或「洗脫烘」：+20 分鐘
          - 若包含「冷氣」或「空調」或「分離式」：+150 分鐘
          - 若包含「回收」或「舊機」：+15 分鐘
          - 若地址包含「3F」「4F」「5F」或更高樓層且無「電梯」字樣：+20 分鐘
        - 回傳計算後的總分鐘數。若無特殊項目，回傳 30。

      **B. high_value_item (高價品偵測，Boolean)**
        - 若符合以下任一條件，回傳 true：
          - 商品名稱包含：「OLED」、「QLED」、「75型」、「75吋」、「85型」、「旗艦」、「對開冰箱」、「Side-by-Side」
          - 商品金額超過 20,000 元
        - 否則回傳 false。

      **C. tags (貨物標籤，Array)**
        - 分析商品名稱，回傳相關標籤：
          - TV/螢幕 -> 'tv_fragile'
          - 冰箱 -> 'fridge_upright'
          - 洗衣機 -> 'washer_install'
          - 冷氣 -> 'ac_heavy'
          - 冰箱、冷氣、洗衣機、或回收服務 -> 'recycle_required'

      **D. distance_check (較遠路程判定)**
        - 中心點：高雄市鳳山區林森路291號
        - 請根據你的地理與交通知識，預估從中心點開車前往該地址的「單程時間」。
        - 若預估時間 **超過 25 分鐘**，請在 tags 中加入 'remote_area'。

      **【重要：排除區域】**
      - **嚴格忽略**：商品列表下方的「注意事項」、「Note」、「消費者簽名」、「廢四機回收」等法律條文或長篇文字。
      - 一旦提取完商品和備註，請立刻停止，不要往下讀取底部的公司資訊或個資聲明。

      請直接回傳純 JSON 格式，不要 Markdown。
      格式: { "orders": [ { "customer": "...", "phone": "...", "address": "...", "delivery_time": "...", "items": "...", "orderNumber": "...", "invoiceNumber": "...", "note": "...", "tags": ["tv_fragile"], "install_time_estimate": 50, "high_value_item": false } ] }`;

		const result = await model.generateContent([
			prompt,
			{ inlineData: { data: base64Image, mimeType: image.type } }
		]);

		console.log('✅ Gemini response received');

		const text = result.response.text();
		console.log('📝 Raw response:', text.substring(0, 200));

		// 清理並解析 JSON
		let jsonStr = text.replace(/```json | ```/g, '').trim();

		// 如果還有其他 markdown 標記，也清除
		jsonStr = jsonStr.replace(/^```[\w]*\n ? /gm, '').replace(/\n ? ```$/gm, '');

		let data;
		try {
			data = JSON.parse(jsonStr);
		} catch (parseError) {
			console.error('❌ JSON parse failed:', parseError);
			console.error('Raw text:', text);

			// 嘗試修復常見的 JSON 問題
			try {
				// 移除可能的 BOM 或特殊字符
				jsonStr = jsonStr.replace(/^\uFEFF/, '');
				data = JSON.parse(jsonStr);
			} catch (retryError) {
				return c.json({
					success: false,
					error: 'AI 回應格式錯誤，請重試或更換圖片',
					details: text.substring(0, 500)
				}, 500);
			}
		}

		// 驗證資料結構
		if (!data.orders || !Array.isArray(data.orders)) {
			console.error('❌ Invalid data structure:', data);
			return c.json({
				success: false,
				error: 'AI 未能識別出訂單資訊，請確認圖片清晰度'
			}, 500);
		}

		console.log('✨ Successfully parsed', data.orders.length, 'orders');

		// 構建 Data URL
		const imageDataUrl = `data:${image.type};base64,${base64Image}`;

		// 將圖片 base64 存入 KV (暫存 24 小時)，只回傳 Key 給前端
		const draftImageKey = `draft_${crypto.randomUUID()}`;
		await c.env.ORDERS_DB.put(draftImageKey, imageDataUrl, { expirationTtl: 86400 });

		data.orders = data.orders.map((order: any) => ({
			...order,
			imageKey: draftImageKey
		}));

		return c.json({ success: true, data });

	} catch (e: any) {
		console.error('💥 Error in /api/analyze:', e);
		return c.json({
			success: false,
			error: e.message || '系統錯誤，請稍後再試',
			stack: e.stack?.substring(0, 500)
		}, 500);
	}
});

// 2. 建立訂單並產生分享 ID（同時存入歷史記錄）
app.post('/api/create-route', async (c) => {
	const body = await c.req.json();
	const routeId = crypto.randomUUID().split('-')[0];
	const now = new Date();

	// 處理圖片儲存
	if (body.orders && Array.isArray(body.orders)) {
		for (let i = 0; i < body.orders.length; i++) {
			const order = body.orders[i];

			// 新邏輯：從 Draft KV 轉存到永久 KV
			if (order.imageKey) {
				// 1. 嘗試讀取暫存圖片
				let imageData = await c.env.ORDERS_DB.get(order.imageKey);

				// 如果找不到 (可能過期)，嘗試看是否直接傳了 base64 (兼容舊版/備援)
				if (!imageData && order.sourceImageData) {
					imageData = order.sourceImageData;
				}

				if (imageData) {
					// 2. 生成永久 Key
					const permanentKey = `img_${routeId}_${i}`;

					// 3. 存入永久 KV
					await c.env.ORDERS_DB.put(permanentKey, imageData);

					// 4. 更新訂單資訊，指向永久 Key
					body.orders[i] = {
						...order,
						imageKey: permanentKey,
						sourceImageData: undefined // 確保移除大檔
					};
				} else {
					console.warn(`Image data not found for draft key: ${order.imageKey}`);
				}
			}
			// 舊邏輯兼容：如果前端直接傳 base64 (不太可能，但保留相容性)
			else if (order.sourceImageData) {
				const imageKey = `img_${routeId}_${i}`;
				await c.env.ORDERS_DB.put(imageKey, order.sourceImageData);
				body.orders[i] = {
					...order,
					imageKey,
					sourceImageData: undefined
				};
			}
		}
	}

	// 存入訂單 KV（不設過期時間，永久保存）
	await c.env.ORDERS_DB.put(routeId, JSON.stringify(body));

	// 存入歷史記錄索引
	const dateStr = now.toISOString().split('T')[0]; // 2025-12-11
	const historyKey = `history:${dateStr}:${routeId}`;
	const historyEntry = {
		routeId,
		createdAt: now.toISOString(),
		orderCount: body.orders?.length || 0,
		// 儲存簡要資訊，不重複存完整訂單
	};
	await c.env.ORDERS_DB.put(historyKey, JSON.stringify(historyEntry));

	return c.json({ success: true, routeId });
});

// 3. 讀取訂單
app.get('/api/route/:id', async (c) => {
	const routeId = c.req.param('id');
	const data = await c.env.ORDERS_DB.get(routeId);

	if (!data) return c.json({ error: '訂單不存在' }, 404);
	return c.json(JSON.parse(data));
});

// 4. 讀取圖片
app.get('/api/image/:key', async (c) => {
	const imageKey = c.req.param('key');
	const imageData = await c.env.ORDERS_DB.get(imageKey);

	if (!imageData) {
		return c.json({ error: '圖片不存在' }, 404);
	}

	// 解析 data URL
	const matches = imageData.match(/^data:(.+);base64,(.+)$/);
	if (!matches) {
		return c.json({ error: '圖片格式錯誤' }, 500);
	}

	const mimeType = matches[1];
	const base64Data = matches[2];

	// 將 base64 轉換為 binary
	const binaryString = atob(base64Data);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}

	return new Response(bytes, {
		headers: {
			'Content-Type': mimeType,
			'Cache-Control': 'public, max-age=86400'
		}
	});
});

// 5. 驗證歷史查詢密碼
app.post('/api/history/verify', async (c) => {
	const body = await c.req.json();
	const password = body.password;

	if (!c.env.HISTORY_PASSWORD) {
		return c.json({ success: false, error: '未設定查詢密碼' }, 500);
	}

	if (password === c.env.HISTORY_PASSWORD) {
		return c.json({ success: true });
	} else {
		return c.json({ success: false, error: '密碼錯誤' }, 401);
	}
});

// 6. 查詢歷史記錄
app.post('/api/history/list', async (c) => {
	const body = await c.req.json();
	const { password, date } = body;

	// 驗證密碼
	if (!c.env.HISTORY_PASSWORD || password !== c.env.HISTORY_PASSWORD) {
		return c.json({ success: false, error: '密碼錯誤' }, 401);
	}

	// 查詢指定日期的歷史記錄
	const prefix = `history:${date}:`;
	const list = await c.env.ORDERS_DB.list({ prefix });

	const records = [];
	for (const key of list.keys) {
		const data = await c.env.ORDERS_DB.get(key.name);
		if (data) {
			records.push(JSON.parse(data));
		}
	}

	// 按時間排序（最新在前）
	records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

	return c.json({ success: true, records });
});

// 7. 查詢歷史記錄詳情
app.post('/api/history/detail', async (c) => {
	const body = await c.req.json();
	const { password, routeId } = body;

	// 驗證密碼
	if (!c.env.HISTORY_PASSWORD || password !== c.env.HISTORY_PASSWORD) {
		return c.json({ success: false, error: '密碼錯誤' }, 401);
	}

	const data = await c.env.ORDERS_DB.get(routeId);
	if (!data) {
		return c.json({ success: false, error: '訂單不存在' }, 404);
	}

	return c.json({ success: true, data: JSON.parse(data) });
});

// 8. 刪除歷史記錄
app.post('/api/history/delete', async (c) => {
	const body = await c.req.json();
	const { password, routeId, date } = body;

	// 驗證密碼
	if (!c.env.HISTORY_PASSWORD || password !== c.env.HISTORY_PASSWORD) {
		return c.json({ success: false, error: '密碼錯誤' }, 401);
	}

	// 刪除訂單本身
	await c.env.ORDERS_DB.delete(routeId);

	// 刪除歷史索引
	const historyKey = `history:${date}:${routeId}`;
	await c.env.ORDERS_DB.delete(historyKey);

	// 刪除相關圖片
	const imgPrefix = `img_${routeId}_`;
	const imgList = await c.env.ORDERS_DB.list({ prefix: imgPrefix });
	for (const key of imgList.keys) {
		await c.env.ORDERS_DB.delete(key.name);
	}

	// 刪除送達照片
	const photoPrefix = `delivery_photo:${routeId}:`;
	const photoList = await c.env.ORDERS_DB.list({ prefix: photoPrefix });
	for (const key of photoList.keys) {
		await c.env.ORDERS_DB.delete(key.name);
	}

	return c.json({ success: true });
});

// 9. 上傳送達照片
app.post('/api/upload-delivery-photo', async (c) => {
	try {
		const formData = await c.req.parseBody();
		const image = formData['image'];
		const routeId = formData['routeId'] as string;
		const orderIndex = formData['orderIndex'] as string;

		if (!(image instanceof File)) {
			return c.json({ success: false, error: 'No image uploaded' }, 400);
		}

		if (!routeId || orderIndex === undefined) {
			return c.json({ success: false, error: 'Missing routeId or orderIndex' }, 400);
		}

		// 轉換為 base64
		const arrayBuffer = await image.arrayBuffer();
		const bytes = new Uint8Array(arrayBuffer);
		let binary = '';
		for (let i = 0; i < bytes.byteLength; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		const base64Image = btoa(binary);
		const imageDataUrl = `data:${image.type};base64,${base64Image}`;

		// 查詢現有照片數量
		const prefix = `delivery_photo:${routeId}:${orderIndex}:`;
		const list = await c.env.ORDERS_DB.list({ prefix });
		const photoCount = list.keys.length;

		if (photoCount >= 16) {
			return c.json({ success: false, error: '已達照片上限 (16張)' }, 400);
		}

		// 儲存照片
		const photoKey = `delivery_photo:${routeId}:${orderIndex}:${photoCount}`;
		await c.env.ORDERS_DB.put(photoKey, imageDataUrl);

		// 更新訂單的照片數量
		const orderData = await c.env.ORDERS_DB.get(routeId);
		if (orderData) {
			const order = JSON.parse(orderData);
			if (order.orders && order.orders[parseInt(orderIndex)]) {
				order.orders[parseInt(orderIndex)].deliveryPhotoCount = photoCount + 1;
				await c.env.ORDERS_DB.put(routeId, JSON.stringify(order));
			}
		}

		return c.json({ success: true, photoIndex: photoCount, totalPhotos: photoCount + 1 });

	} catch (e: any) {
		console.error('Error uploading delivery photo:', e);
		return c.json({ success: false, error: e.message }, 500);
	}
});

// 9.5 標記訂單為完成
app.post('/api/complete-order', async (c) => {
	try {
		const body = await c.req.json();
		const { routeId, orderIndex } = body;

		if (!routeId || orderIndex === undefined) {
			return c.json({ success: false, error: 'Missing routeId or orderIndex' }, 400);
		}

		console.log('Completing order:', routeId, orderIndex);

		const orderData = await c.env.ORDERS_DB.get(routeId);
		if (orderData) {
			const order = JSON.parse(orderData);
			if (order.orders && order.orders[parseInt(orderIndex)]) {
				// 設定狀態為 done
				order.orders[parseInt(orderIndex)].status = 'done';

				// 寫回 KV
				await c.env.ORDERS_DB.put(routeId, JSON.stringify(order));
				return c.json({ success: true });
			}
		}
		return c.json({ success: false, error: 'Order not found' }, 404);
	} catch (e: any) {
		console.error('Error completing order:', e);
		return c.json({ success: false, error: e.message }, 500);
	}
});

// 9. 查詢送達照片列表
app.get('/api/delivery-photos/:routeId/:orderIndex', async (c) => {
	const routeId = c.req.param('routeId');
	const orderIndex = c.req.param('orderIndex');

	const prefix = `delivery_photo:${routeId}:${orderIndex}:`;
	const list = await c.env.ORDERS_DB.list({ prefix });

	const photos = list.keys.map(key => ({
		key: key.name,
		url: `/api/delivery-photo/${encodeURIComponent(key.name)}`
	}));

	return c.json({ success: true, photos });
});

// 10. 讀取單張送達照片
app.get('/api/delivery-photo/:key', async (c) => {
	const photoKey = decodeURIComponent(c.req.param('key'));
	const imageData = await c.env.ORDERS_DB.get(photoKey);

	if (!imageData) {
		return c.json({ error: '照片不存在' }, 404);
	}

	// 解析 data URL
	const matches = imageData.match(/^data:(.+);base64,(.+)$/);
	if (!matches) {
		return c.json({ error: '照片格式錯誤' }, 500);
	}

	const mimeType = matches[1];
	const base64Data = matches[2];

	// 將 base64 轉換為 binary
	const binaryString = atob(base64Data);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}

	return new Response(bytes, {
		headers: {
			'Content-Type': mimeType,
			'Cache-Control': 'public, max-age=86400'
		}
	});
});

export default app;

