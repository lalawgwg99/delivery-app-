import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

type Bindings = {
	ORDERS_DB: KVNamespace;
	GEMINI_API_KEY: string;
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
      3. 地址 (Address) - (起點定位為家樂福五甲店)，請做順路排序。若模糊請修正為正確行政區。
      4. 配送時間 (Delivery Time)
      5. 單品名稱 (Item Name)
      6. 訂貨編號 (Order Number)
      7. 發票號碼 (Invoice Number)

      請直接回傳純 JSON 格式，不要 Markdown。
      格式: { "orders": [ { "customer": "...", "phone": "...", "address": "...", "delivery_time": "...", "items": "...", "orderNumber": "...", "invoiceNumber": "...", "note": "..." } ] }`;


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

// 2. 建立訂單並產生分享 ID
app.post('/api/create-route', async (c) => {
	const body = await c.req.json();
	const routeId = crypto.randomUUID().split('-')[0];

	// 存入 KV (保存 24 小時)
	await c.env.ORDERS_DB.put(routeId, JSON.stringify(body), { expirationTtl: 86400 });

	return c.json({ success: true, routeId });
});

// 3. 讀取訂單
app.get('/api/route/:id', async (c) => {
	const routeId = c.req.param('id');
	const data = await c.env.ORDERS_DB.get(routeId);

	if (!data) return c.json({ error: '訂單不存在' }, 404);
	return c.json(JSON.parse(data));
});

export default app;
