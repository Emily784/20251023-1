// =================================================================
// 步驟一：模擬成績數據接收
// -----------------------------------------------------------------

// 確保這是全域變數
let finalScore = 0; 
let maxScore = 0;
// 初始提示文字：確保在未收到分數時有內容顯示
let scoreText = "等待成績分數 (請先完成作答)"; 
let fireworks = []; // 全域陣列，用於儲存所有的煙火物件
let gravity; // 全域變數，用於模擬重力


// 監聽來自 H5P 或其他 iframe 的分數訊息
window.addEventListener('message', function (event) {
    // 執行來源驗證... (建議實際應用中加入)
    // ...
    const data = event.data;
    
    if (data && data.type === 'H5P_SCORE_RESULT') {
        
        // !!! 關鍵步驟：更新全域變數 !!!
        finalScore = data.score; 
        maxScore = data.maxScore;
        scoreText = `最終成績分數: ${finalScore}/${maxScore}`;
        
        console.log("新的分數已接收:", scoreText); 
        
        // 確保在收到分數時畫面立即更新
        if (typeof redraw === 'function') {
            redraw(); 
        }
    }
}, false);


// =================================================================
// 步驟二：p5.js 粒子和煙火類別定義
// -----------------------------------------------------------------

// 粒子 (Particle) 類別
class Particle {
    constructor(x, y, hu, isFirework) {
        this.pos = createVector(x, y);
        this.isFirework = isFirework; 
        this.lifespan = 255;
        this.hu = hu; 
        
        if (this.isFirework) {
            // 火箭向上飛的初始速度
            this.vel = createVector(0, random(-15, -10)); // 提高速度讓它更快到達頂部
        } else {
            // 爆炸碎片向四周飛濺的初始速度
            this.vel = p5.Vector.random2D();
            this.vel.mult(random(1, 10)); 
        }
        this.acc = createVector(0, 0); 
    }

    applyForce(force) {
        this.acc.add(force);
    }

    update() {
        if (!this.isFirework) {
            this.vel.mult(0.9); // 碎片逐漸減速
            this.lifespan -= 4; // 碎片逐漸消失
        }
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.acc.mult(0);
    }

    // 煙火火箭的繪製
    show() {
        // HSB 顏色模式用於煙火
        colorMode(HSB); 
        if (!this.isFirework) {
            // 碎片
            strokeWeight(2);
            stroke(this.hu, 255, 255, this.lifespan); 
        } else {
            // 火箭本身 (上升時)
            strokeWeight(4);
            stroke(this.hu, 255, 255);
        }
        point(this.pos.x, this.pos.y);
    }
    
    done() {
        return this.lifespan < 0;
    }
}

// 煙火 (Firework) 類別
class Firework {
    constructor() {
        this.hu = random(255); 
        // 隨機在畫布寬度的中間區域發射 (1/4 寬度到 3/4 寬度)
        let launchX = random(width * 0.25, width * 0.75); 
        this.firework = new Particle(launchX, height, this.hu, true);
        this.exploded = false;
        this.particles = [];
    }

    update() {
        if (!this.exploded) {
            this.firework.applyForce(gravity); 
            this.firework.update();

            // 如果火箭速度開始變為正值 (開始下降)，則爆炸
            if (this.firework.vel.y >= 0) {
                this.exploded = true;
                this.explode();
            }
        }
        
        // 更新所有的碎片
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].applyForce(gravity);
            this.particles[i].update();
            if (this.particles[i].done()) {
                this.particles.splice(i, 1);
            }
        }
    }

    // 產生爆炸碎片
    explode() {
        for (let i = 0; i < 100; i++) { 
            const p = new Particle(this.firework.pos.x, this.firework.pos.y, this.hu, false);
            this.particles.push(p);
        }
    }

    show() {
        if (!this.exploded) {
            this.firework.show();
        }
        
        for (const p of this.particles) {
            p.show();
        }
    }

    // 檢查煙火是否燃放完畢
    done() {
        return this.exploded && this.particles.length === 0;
    }
}


// =================================================================
// 步驟三：p5.js 繪製與邏輯整合
// -----------------------------------------------------------------

function setup() { 
    // 確保 canvas 尺寸是正數
    let canvasW = windowWidth / 2;
    let canvasH = windowHeight / 2;

    // 最小寬度檢查，避免 W=0 導致隨機發射失敗
    if (canvasW < 200) canvasW = 400; 
    if (canvasH < 200) canvasH = 400; 

    createCanvas(canvasW, canvasH); 
    
    // 關鍵修復：由於煙火需要動畫，我們需要 draw() 持續執行
    // 如果您曾加入 noLoop()，請將其移除。
    
    // 定義重力向量
    gravity = createVector(0, 0.2); 
    
    // 預先產生一個分數，用於測試
    // finalScore = 10;
    // maxScore = 10;
} 

function draw() { 
    // 為了視覺殘留效果 (拖尾)，每次不清空背景，而是繪製一個半透明的黑矩形
    colorMode(RGB); // 確保背景使用 RGB
    background(0, 0, 0, 25); 

    // -----------------------------------------------------------------
    // C. 煙火特效控制 (在滿分時持續燃放)
    // -----------------------------------------------------------------
    // 安全計算百分比
    let percentage = (maxScore > 0) ? (finalScore / maxScore) * 100 : 0;
    
    if (percentage >= 100 && maxScore > 0) {
        // 每 10 幀產生一個新的煙火 (調整頻率)
        if (frameCount % 10 === 0) {
             fireworks.push(new Firework()); 
        }
    }
    
    // 更新和繪製所有煙火
    // 這裡會自動切換到 HSB 模式來繪製煙火顆粒
    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        fireworks[i].show();
        
        // 刪除已經燃放完畢的煙火
        if (fireworks[i].done()) {
            fireworks.splice(i, 1);
        }
    }

    
    // -----------------------------------------------------------------
    // A. 根據分數區間改變文本顏色和內容 (使用 RGB 模式)
    // -----------------------------------------------------------------
    colorMode(RGB); // 確保文本使用 RGB 模式，顏色更穩定
    textSize(80); 
    textAlign(CENTER);
    
    // 處理分數顯示和顏色
    if (percentage >= 90) {
        // 滿分或高分：使用鮮豔顏色
        fill(0, 255, 0); // 純綠色
        text("恭喜！優異成績！", width / 2, height / 2 - 50);
        
    } else if (percentage >= 60) {
        // 中等分數：使用黃色
        fill(255, 255, 0); 
        text("成績良好，請再接再厲。", width / 2, height / 2 - 50);
        
    } else if (percentage > 0) {
        // 低分：使用紅色
        fill(255, 0, 0); 
        text("需要加強努力！", width / 2, height / 2 - 50);
        
    } else {
        // 尚未收到分數或分數為 0/0
        // 文本顏色設為白色，確保在黑背景下可見
        fill(255); 
        // 關鍵修復：顯示初始的提示文字
        text(scoreText, width / 2, height / 2); 
    }

    // 顯示具體分數
    textSize(50);
    fill(255); // 白色，確保可見
    // 不論百分比多少，只要 maxScore > 0 就顯示具體分數
    if (maxScore > 0 || percentage === 0) { 
        text(`得分: ${finalScore}/${maxScore}`, width / 2, height / 2 + 50);
    }
    
    
    // -----------------------------------------------------------------
    // B. 根據分數觸發不同的幾何圖形反映 (使用 RGB 模式)
    // -----------------------------------------------------------------
    
    if (percentage >= 90) {
        // 畫一個大圓圈代表完美 
        fill(0, 255, 0, 150); // 綠色帶透明度
        noStroke();
        circle(width / 2, height / 2 + 150, 150);
        
    } else if (percentage >= 60) {
        // 畫一個方形 
        fill(255, 255, 0, 150); // 黃色帶透明度
        rectMode(CENTER);
        rect(width / 2, height / 2 + 150, 150, 150);
    }
}
