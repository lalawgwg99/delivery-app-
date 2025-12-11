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
      
      【重要指引】
      請「忽略」：條碼、價格、店內代碼、商店名稱。
      請「專注提取」以下欄位：
      1. 客戶名 (Customer Name)
      2. 電話 (Telephone)
      3. 地址 (Address) - (從配送起點出發)，請做順路排序。若模糊請修正為正確行政區。
      4. 配送時間 (Delivery Time)
      5. 商品名稱與數量 (Product Name and Quantity) - 格式：「商品名稱 x數量」，多項用逗號分隔
      6. 訂貨編號 (Order Number)
      7. 發票號碼 (Invoice Number)

      請直接回傳純 JSON 格式，不要 Markdown。
      格式: { "orders": [ { "customer": "...", "phone": "...", "address": "...", "delivery_time": "...", "items": "商品A x2, 商品B x1", "orderNumber": "...", "invoiceNumber": "...", "note": "..." } ] }`;

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

		// 將圖片 base64 加入每個訂單（用於後續存儲）
		const imageDataUrl = `data:${image.type};base64,${base64Image}`;
		data.orders = data.orders.map((order: any) => ({
			...order,
			sourceImageData: imageDataUrl
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
			if (order.sourceImageData) {
				// 為每個訂單生成唯一的圖片 key
				const imageKey = `img_${routeId}_${i}`;
				// 儲存圖片到 KV（不設過期時間，永久保存）
				await c.env.ORDERS_DB.put(imageKey, order.sourceImageData);
				// 將 key 存入訂單，移除 base64 數據以減少存儲
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

// 8. 上傳送達照片
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

		if (photoCount >= 8) {
			return c.json({ success: false, error: '已達照片上限 (8張)' }, 400);
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

