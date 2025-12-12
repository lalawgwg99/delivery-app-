/**
 * 圖片壓縮工具
 * 使用 HTML Canvas 進行客戶端壓縮
 */
export async function compressImage(file: File): Promise<File> {
    // 如果不是圖片，直接返回
    if (!file.type.startsWith('image/')) return file;

    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };

        reader.onerror = reject;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                resolve(file); // 如果無法創建 canvas，回傳原圖
                return;
            }

            // 設定最大寬度
            const MAX_WIDTH = 1280;
            let width = img.width;
            let height = img.height;

            // 等比例縮放
            if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;

            // 繪製圖片
            ctx.drawImage(img, 0, 0, width, height);

            // 輸出壓縮後的 Blob
            canvas.toBlob(
                (blob) => {
                    // Help GC by clearing canvas
                    canvas.width = 0;
                    canvas.height = 0;

                    if (blob) {
                        // 建立新的 File 物件
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        console.log(`壓縮完成: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
                        resolve(compressedFile);
                    } else {
                        resolve(file); // 壓縮失敗回傳原圖
                    }
                },
                'image/jpeg',
                0.6 // 壓縮品質 (0.6 通常能兼顧畫質與檔案大小，約原本的 10-20%)
            );
        };

        reader.readAsDataURL(file);
    });
}
