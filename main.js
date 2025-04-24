document.addEventListener('DOMContentLoaded', function() {
    console.log('音頻波紋效果已載入！');

    // 建立 canvas 元素並插入 body
    let canvas = document.getElementById('waveCanvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'waveCanvas';
        document.body.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');

    // 設定基本參數
    const verticalCenter = window.innerHeight / 2;
    const extensionFactor = 0.3; // 每側延伸畫面寬度的30%

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function drawGradientBackground() {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function drawRectangle() {
        // 移除中間藍色方塊的繪製邏輯
        return { rectX: 0, rectY: 0, rectWidth: 0, rectHeight: 0 };
    }

    let time = 0; // 新增時間變數
    let speedFactor = 0.05; // 初始速度因子
    let targetSpeedFactor = 0.05; // 目標速度因子
    let colorSpeedFactor = 0.05; // 顏色變化速度因子
    let lastColorSpeedFactor = 0.05; // 記錄最後一次轉動時的顏色變化速度

    async function connectToArduino() {
        try {
            console.log('嘗試請求串列埠...');
            const port = await navigator.serial.requestPort(); // 請求選擇串列埠
            console.log('串列埠已選擇:', port);

            console.log('嘗試開啟串列埠...');
            await port.open({ baudRate: 9600 }); // 開啟串列埠，波特率設為 9600
            console.log('串列埠已開啟');

            const reader = port.readable.getReader();
            console.log('開始讀取數據...');

            // 持續讀取 Arduino 傳來的數據
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    console.log('串列埠已關閉');
                    break; // 如果串列埠關閉，退出循環
                }

                const text = new TextDecoder().decode(value);
                console.log('接收到的原始數據:', text.trim()); // 顯示原始數據

                const sensorValue = parseInt(text.trim(), 10);
                if (!isNaN(sensorValue)) {
                    // 確保 sensorValue 在有效範圍內
                    if (sensorValue < 0 || sensorValue > 1023) {
                        console.warn('接收到的數據超出範圍:', sensorValue);
                        continue;
                    }

                    // 平滑過渡到新的顏色變化速度，減少跳動
                    const newColorSpeedFactor = 0.01 + (sensorValue / 1023 * 0.03);
                    colorSpeedFactor = lerp(colorSpeedFactor, newColorSpeedFactor, 0.1); // 使用線性插值平滑過渡
                    lastColorSpeedFactor = colorSpeedFactor; // 更新最後一次的顏色變化速度
                    console.log('更新後的顏色變化速度因子:', colorSpeedFactor); // 顯示更新後的速度因子
                } else {
                    console.error('無法解析數據:', text.trim()); // 顯示解析失敗的數據
                }
            }
        } catch (error) {
            console.error('無法連接到 Arduino:', error);
        }
    }

    // 新增按鈕以選擇 Arduino 的串列埠
    const connectButton = document.createElement('button');
    connectButton.textContent = '連接 Arduino';
    connectButton.style.position = 'absolute';
    connectButton.style.top = '10px';
    connectButton.style.left = '10px';
    document.body.appendChild(connectButton);

    connectButton.addEventListener('click', async () => {
        await connectToArduino(); // 點擊按鈕後啟動與 Arduino 的連線
        connectButton.style.display = 'none'; // 隱藏按鈕
    });

    function drawWave() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGradientBackground();

        const bufferLength = 48; // 波紋的數量
        const barWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            // 設定初始大小
            const baseHeight = 50;
            let barHeight = baseHeight;

            // 計算每個波紋的循序變化
            const delayFactor = Math.sin((time - i * 5) * speedFactor) * 0.5 + 0.5; // 每個波紋根據索引延遲變化

            // 固定大小變化幅度
            barHeight *= 1 + delayFactor * 6; // 固定高度變化幅度

            // 動態色彩，根據 colorSpeedFactor 調整顏色變化速度
            let hue;
            if (colorSpeedFactor === 0.05) {
                hue = (i / bufferLength) * 360 + time * lastColorSpeedFactor; // 使用最後一次的顏色變化速度
            } else {
                hue = (i / bufferLength) * 360 + time * colorSpeedFactor; // 否則根據當前速度變化
            }
            ctx.fillStyle = `hsl(${hue % 360}, 100%, 50%)`;

            // 繪製矩形作為波紋，固定在畫面中央
            ctx.fillRect(x, verticalCenter - barHeight / 2, barWidth, barHeight);

            x += barWidth + 1;
        }

        time += 1; // 更新時間
        requestAnimationFrame(drawWave); // 繼續動畫
    }

    resizeCanvas();
    drawGradientBackground();
    drawWave(); // 啟動動畫
});
