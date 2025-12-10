
{/* 操作說明 - 只在初始狀態顯示 */ }
{
    !routeId && orders.length === 0 && !loading && (
        <div className="mt-6 space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-3 text-base">📱 店端操作說明</h3>
                <div className="space-y-3 text-sm text-gray-600">
                    <div><strong className="text-gray-800">📍 拍攝外送單</strong><br />點擊上方卡片開啟相機 • 可一次上傳 2-6 張圖片 • AI 自動辨識地址並排序</div>
                    <div><strong className="text-gray-800">✏️ 確認與編輯</strong><br />檢查 AI 辨識的資訊 • 點擊可直接修改客戶、地址、電話 • 長按拖曳調整配送順序</div>
                    <div><strong className="text-gray-800">🚀 生成派單</strong><br />按下「生成派單連結」• 透過 LINE 傳送給外送員 • 或複製連結分享</div>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-3 text-base">🚗 外送公司操作說明</h3>
                <div className="space-y-3 text-sm text-gray-600">
                    <div><strong className="text-gray-800">📍 查看訂單</strong><br />點擊 LINE 連結開啟路線 • 查看今日所有配送地址 • 依序號完成配送</div>
                    <div><strong className="text-gray-800">🧭 導航與聯絡</strong><br />點擊「開啟導航」前往目的地 • 點擊電話號碼直接撥打 • 點擊「看單」查看原始訂單</div>
                    <div><strong className="text-gray-800">✅ 標記完成</strong><br />送達後點擊「標記完成」• 系統自動更新進度 • 繼續下一筆訂單</div>
                </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="font-semibold text-blue-900 mb-2 text-sm">💡 小提示</p>
                <div className="text-sm text-blue-800 space-y-1">
                    <div>📸 圖片越清晰，辨識越準確</div>
                    <div>🔄 可隨時調整訂單順序</div>
                    <div>📱 建議網頁加入手機主畫面當作 APP 使用</div>
                </div>
            </div>

            <div className="text-center pt-2">
                <p className="text-xs text-gray-400 font-mono">DESIGNED_Alex德</p>
            </div>
        </div>
    )
}
