// =================================================================
// 步驟一：模擬成績數據接收
// -----------------------------------------------------------------

// 確保這是全域變數
let finalScore = 0; 
let maxScore = 0;
let scoreText = ""; // 用於 p5.js 繪圖的文字
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
        // 關鍵步驟 2: 呼叫重新繪製 
        // ----------------------------------------
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
        this.isFirework = isFirework; // 判斷是否為「火箭」本身，還是「爆炸碎片」
        this.lifespan = 255;
        this.hu = hu; // 顏色 (色相)
        
        if (this.isFirework) {
            // 火箭向上飛的初始速度
            this.vel = createVector(0, random(-12, -8)); 
        } else {
            // 爆炸碎片向四周飛濺的初始速度
            this.vel = p5.Vector.random2D();
            this.vel.mult(random(1, 8)); // 賦予隨機的速度
        }
        this.acc = createVector(0, 0); // 加速度
    }

    applyForce(force) {
        this.acc.add(force);
    }

    update() {
        if (!this.isFirework) {
            // 碎片會逐漸減速並受重力影響
            this.vel.mult(0.9); 
            this.lifespan -= 4; // 碎片逐漸消失
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
            stroke(this.hu, 255, 255, this.lifespan); // 帶透明度
        } else {
            // 火箭本身 (上升時)
            strokeWeight(4);
            stroke(this.hu, 255, 255);
        }
        point(this.pos.x, this.pos.y);
        colorMode(RGB); // 繪製完畢切回 RGB
    }
    
    // 檢查碎片是否消失
    done() {
        return this.lifespan < 0;
    }
}

// 煙火 (Firework) 類別
class Firework {
    constructor() {
        // 煙火的顏色是隨機的色相值
        this.hu = random(255); 
        // 煙火是一個 Particle 物件，初始在底部，是火箭狀態 (true)
        this.firework = new Particle(random(width), height, this.hu, true);
        this.exploded = false;
        this.particles = [];
    }

    update() {
        if (!this.exploded) {
            this.firework.applyForce(gravity); // 火箭受重力影響
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
            // 刪除已經消失的碎片
            if (this.particles[i].done()) {
                this.particles.splice(i, 1);
            }
        }
    }

    // 產生爆炸碎片
    explode() {
        for (let i = 0; i < 100; i++) { // 產生 100 個碎片
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
    background(0); // 煙火背景為黑色
    // 讓 draw() 持續執行，這樣才能有動畫效果，不再使用 noLoop()
    // noLoop(); 
    
    // 定義重力向量
    gravity = createVector(0, 0.2); 
} 

function draw() { 
    // 為了視覺殘留效果 (拖尾)，每次不清空背景，而是繪製一個半透明的黑矩形
    background(0, 0, 0, 25); 

    // 計算百分比
    let percentage = (finalScore / maxScore) * 100;
    
    // -----------------------------------------------------------------
    // C. 煙火特效控制 (在滿分時持續燃放)
    // -----------------------------------------------------------------
    if (percentage >= 100 && maxScore > 0) {
        // 每 10 幀產生一個新的煙火 (可以調整頻率)
        if (frameCount % 10 === 0) {
             fireworks.push(new Firework()); // 創建一個新的煙火物件
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
    textSize(80); 
    textAlign(CENTER);
    
    if (percentage >= 90) {
        // 滿分或高分
        fill(100, 255, 255); // 綠色/高亮度
        text("恭喜！優異成績！", width / 2, height / 2 - 50);
        
    } else if (percentage >= 60) {
        // 中等分數
        fill(45, 255, 255); // 黃色
        text("成績良好，請再接再厲。", width / 2, height / 2 - 50);
        
    } else if (percentage > 0) {
        // 低分
        fill(0, 255, 255); // 紅色
        text("需要加強努力！", width / 2, height / 2 - 50);
        
    } else {
        // 尚未收到分數或分數為 0
        fill(0, 0, 150); // 灰色
        text(scoreText, width / 2, height / 2);
    }

    // 顯示具體分數
    textSize(50);
    fill(0, 0, 255); // 白色
    text(`得分: ${finalScore}/${maxScore}`, width / 2, height / 2 + 50);
    
    
    // -----------------------------------------------------------------
    // B. 幾何圖形反映 (可選，但保持您的原始邏輯)
    // -----------------------------------------------------------------
    
    if (percentage >= 90) {
        // 畫一個大圓圈代表完美
        fill(100, 255, 255, 150); // 綠色帶透明度
        noStroke();
        circle(width / 2, height / 2 + 150, 150);
        
    } else if (percentage >= 60) {
        // 畫一個方形
        fill(45, 255, 255, 150); // 黃色帶透明度
        rectMode(CENTER);
        rect(width / 2, height / 2 + 150, 150, 150);
    }
}
