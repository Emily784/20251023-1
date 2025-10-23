// =================================================================
// 步驟一：模擬成績數據接收
// -----------------------------------------------------------------

// 確保這是全域變數
let finalScore = 0; 
let maxScore = 0;
// 修正：給 scoreText 一個有意義的初始值
let scoreText = "等待成績分數..."; 
let fireworks = []; // 全域陣列，用於儲存所有的煙火物件
let gravity; // 全域變數，用於模擬重力

window.addEventListener('message', function (event) {
    // ... 執行來源驗證 ...
    const data = event.data;
    
    if (data && data.type === 'H5P_SCORE_RESULT') {
        
        // !!! 關鍵步驟：更新全域變數 !!!
        finalScore = data.score; // 更新全域變數
        maxScore = data.maxScore;
        scoreText = `最終成績分數: ${finalScore}/${maxScore}`;
        
        console.log("新的分數已接收:", scoreText); 
        
        // ----------------------------------------
        // 關鍵步驟 2: 呼叫重新繪製 (如果 noLoop() 被使用，則需要)
        // 但因為我們將允許 draw() 持續執行，這裡可以保留或移除。
        // 保留 redraw() 是為了確保在收到分數時立即更新畫面。
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
            this.vel = createVector(0, random(-12, -8)); 
        } else {
            this.vel = p5.Vector.random2D();
            this.vel.mult(random(1, 8)); 
        }
        this.acc = createVector(0, 0); 
    }

    applyForce(force) {
        this.acc.add(force);
    }

    update() {
        if (!this.isFirework) {
            this.vel.mult(0.9); 
            this.lifespan -= 4; 
        }
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.acc.mult(0);
    }

    // 煙火火箭的繪製
    show() {
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
        colorMode(RGB); // 繪製完畢切回 RGB (雖然在 draw 裡面會被 HSB 覆蓋，但為了確保單獨執行時的顏色正確性，保留此行)
    }
    
    // 檢查碎片是否消失
    done() {
        return this.lifespan < 0;
    }
}

// 煙火 (Firework) 類別
class Firework {
    constructor() {
        this.hu = random(255); 
        this.firework = new Particle(random(width), height, this.hu, true);
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
    createCanvas(windowWidth / 2, windowHeight / 2); 
    colorMode(HSB); // 使用 HSB 模式更容易控制顏色變化
    // 關鍵修復：移除 noLoop()，讓 draw() 持續執行以產生動畫
    // 您的原始程式碼中沒有 noLoop()，但如果有，請確保它被移除
    // background(255); // 初始背景
    
    // 定義重力向量
    gravity = createVector(0, 0.2); 
} 

function draw() { 
    // 為了視覺殘留效果 (拖尾)，每次不清空背景，而是繪製一個半透明的黑矩形
    background(0, 0, 0, 25); 
    colorMode(HSB); // 確保在繪製顏色時使用 HSB 模式

    // -----------------------------------------------------------------
    // C. 煙火特效控制 (在滿分時持續燃放)
    // -----------------------------------------------------------------
    let percentage = (maxScore > 0) ? (finalScore / maxScore) * 100 : 0;
    
    if (percentage >= 100 && maxScore > 0) {
        // 每 10 幀產生一個新的煙火 (可以調整頻率)
        if (frameCount % 10 === 0) {
             // 隨機在寬度的 1/4 到 3/4 之間發射，避免太靠近邊緣
             fireworks.push(new Firework()); 
        }
    }
    
    // 更新和繪製所有煙火
    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        fireworks[i].show();
        
        // 刪除已經燃放完畢的煙火
        if (fireworks[i].done()) {
            fireworks.splice(i, 1);
        }
    }

    
    // -----------------------------------------------------------------
    // A. 根據分數區間改變文本顏色和內容
    // -----------------------------------------------------------------
    colorMode(RGB); // 切換回 RGB 模式繪製文字和靜態圖形，避免顏色混淆
    textSize(80); 
    textAlign(CENTER);
    
    // 處理分數顯示和顏色
    if (percentage >= 90) {
        // 滿分或高分：顯示鼓勵文本，使用鮮豔顏色
        fill(0, 200, 50); // 綠色
        text("恭喜！優異成績！", width / 2, height / 2 - 50);
        
    } else if (percentage >= 60) {
        // 中等分數：顯示一般文本，使用黃色
        fill(255, 181, 35); 
        text("成績良好，請再接再厲。", width / 2, height / 2 - 50);
        
    } else if (percentage > 0) {
        // 低分：顯示警示文本，使用紅色
        fill(200, 0, 0); 
        text("需要加強努力！", width / 2, height / 2 - 50);
        
    } else {
        // 尚未收到分數或分數為 0/0
        fill(150);
        // 關鍵修復：確保在沒有分數時顯示初始的提示文字
        text(scoreText, width / 2, height / 2); 
    }

    // 顯示具體分數（只有在收到成績後才顯示具體分數）
    if (maxScore > 0) {
        textSize(50);
        fill(255); // 讓分數文字在煙火的黑背景下更清晰
        text(`得分: ${finalScore}/${maxScore}`, width / 2, height / 2 + 50);
    }
    
    
    // -----------------------------------------------------------------
    // B. 根據分數觸發不同的幾何圖形反映 
    // -----------------------------------------------------------------
    
    if (percentage >= 90) {
        // 畫一個大圓圈代表完美 
        fill(0, 200, 50, 150); // 綠色帶透明度
        noStroke();
        circle(width / 2, height / 2 + 150, 150);
        
    } else if (percentage >= 60) {
        // 畫一個方形 
        fill(255, 181, 35, 150); // 黃色帶透明度
        rectMode(CENTER);
        rect(width / 2, height / 2 + 150, 150, 150);
    }
}
