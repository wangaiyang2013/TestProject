/**
 * Square Game - 小方块自动奔跑，点击屏幕跳跃
 */

const GameConstants = {
  GRAVITY: 0.65,
  JUMP_VELOCITY: -14,
  RUN_SPEED: 6,
  GROUND_HEIGHT_RATIO: 0.18,
  PLAYER_SIZE_RATIO: 0.06,
  OBSTACLE_MIN_GAP: 280,
  OBSTACLE_MAX_GAP: 520,
  OBSTACLE_WIDTH_MIN: 24,
  OBSTACLE_WIDTH_MAX: 48,
  OBSTACLE_HEIGHT_MIN: 28,
  OBSTACLE_HEIGHT_MAX: 72,
  SCORE_PER_FRAME: 0.1,
  SKY_COLOR: "#1a1a2e",
  GROUND_COLOR: "#16213e",
  GROUND_TOP_COLOR: "#4ecca3",
  PLAYER_COLOR: "#e94560",
  OBSTACLE_COLOR: "#0f3460",
  OBSTACLE_EDGE_COLOR: "#533483",
};

/**
 * 玩家方块
 */
class SquarePlayer {
  constructor(x, groundY, size) {
    this.x = x;
    this.groundY = groundY;
    this.size = size;
    this.y = groundY - size;
    this.velocityY = 0;
    this.isOnGround = true;
  }

  jump() {
    if (!this.isOnGround) {
      return false;
    }
    this.velocityY = GameConstants.JUMP_VELOCITY;
    this.isOnGround = false;
    return true;
  }

  update() {
    this.velocityY += GameConstants.GRAVITY;
    this.y += this.velocityY;

    const floorY = this.groundY - this.size;
    if (this.y >= floorY) {
      this.y = floorY;
      this.velocityY = 0;
      this.isOnGround = true;
    }
  }

  draw(ctx) {
    ctx.fillStyle = GameConstants.PLAYER_COLOR;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x + 1, this.y + 1, this.size - 2, this.size - 2);
  }

  getBounds() {
    const padding = this.size * 0.15;
    return {
      left: this.x + padding,
      right: this.x + this.size - padding,
      top: this.y + padding,
      bottom: this.y + this.size - padding,
    };
  }
}

/**
 * 地面障碍物
 */
class Obstacle {
  constructor(x, groundY, width, height) {
    this.x = x;
    this.groundY = groundY;
    this.width = width;
    this.height = height;
    this.y = groundY - height;
  }

  update(runSpeed) {
    this.x -= runSpeed;
  }

  isOffScreen() {
    return this.x + this.width < 0;
  }

  draw(ctx) {
    ctx.fillStyle = GameConstants.OBSTACLE_COLOR;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeStyle = GameConstants.OBSTACLE_EDGE_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
  }

  getBounds() {
    return {
      left: this.x,
      right: this.x + this.width,
      top: this.y,
      bottom: this.groundY,
    };
  }
}

/**
 * 检测矩形碰撞
 */
class CollisionDetector {
  static intersects(a, b) {
    return (
      a.left < b.right &&
      a.right > b.left &&
      a.top < b.bottom &&
      a.bottom > b.top
    );
  }
}

/**
 * 主游戏逻辑
 */
class SquareGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.state = "idle";
    this.score = 0;
    this.obstacles = [];
    this.nextObstacleX = 0;
    this.animationId = null;
    this.player = null;
    this.groundY = 0;
    this.playerSize = 0;
    this.playerX = 0;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
    this.groundY = this.height * (1 - GameConstants.GROUND_HEIGHT_RATIO);
    this.playerSize = Math.max(24, this.height * GameConstants.PLAYER_SIZE_RATIO);
    this.playerX = this.width * 0.15;

    if (this.player) {
      this.player.groundY = this.groundY;
      this.player.size = this.playerSize;
      this.player.x = this.playerX;
      if (this.player.isOnGround) {
        this.player.y = this.groundY - this.playerSize;
      }
    }
  }

  start() {
    this.state = "playing";
    this.score = 0;
    this.obstacles = [];
    this.player = new SquarePlayer(
      this.playerX,
      this.groundY,
      this.playerSize
    );
    this.nextObstacleX = this.width + 200;
    this.spawnObstacle();
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.loop();
  }

  spawnObstacle() {
    const width =
      GameConstants.OBSTACLE_WIDTH_MIN +
      Math.random() *
        (GameConstants.OBSTACLE_WIDTH_MAX - GameConstants.OBSTACLE_WIDTH_MIN);
    const height =
      GameConstants.OBSTACLE_HEIGHT_MIN +
      Math.random() *
        (GameConstants.OBSTACLE_HEIGHT_MAX - GameConstants.OBSTACLE_HEIGHT_MIN);
    this.obstacles.push(
      new Obstacle(this.nextObstacleX, this.groundY, width, height)
    );
    const gap =
      GameConstants.OBSTACLE_MIN_GAP +
      Math.random() *
        (GameConstants.OBSTACLE_MAX_GAP - GameConstants.OBSTACLE_MIN_GAP);
    this.nextObstacleX += width + gap;
  }

  jump() {
    if (this.state === "idle") {
      return;
    }
    if (this.state === "gameover") {
      return;
    }
    if (this.player) {
      this.player.jump();
    }
  }

  gameOver() {
    this.state = "gameover";
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (typeof this.onGameOver === "function") {
      this.onGameOver(Math.floor(this.score));
    }
  }

  update() {
    if (this.state !== "playing" || !this.player) {
      return;
    }

    this.player.update();
    this.score += GameConstants.SCORE_PER_FRAME;

    for (let i = this.obstacles.length - 1; i >= 0; i -= 1) {
      const obstacle = this.obstacles[i];
      obstacle.update(GameConstants.RUN_SPEED);

      if (CollisionDetector.intersects(this.player.getBounds(), obstacle.getBounds())) {
        this.gameOver();
        return;
      }

      if (obstacle.isOffScreen()) {
        this.obstacles.splice(i, 1);
      }
    }

    const lastObstacle = this.obstacles[this.obstacles.length - 1];
    if (!lastObstacle || lastObstacle.x < this.width) {
      if (this.nextObstacleX < this.width + 100) {
        this.nextObstacleX = this.width + 100;
      }
      this.spawnObstacle();
    }
  }

  drawBackground() {
    const ctx = this.ctx;
    ctx.fillStyle = GameConstants.SKY_COLOR;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = GameConstants.GROUND_COLOR;
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    ctx.fillStyle = GameConstants.GROUND_TOP_COLOR;
    ctx.fillRect(0, this.groundY - 4, this.width, 4);
  }

  draw() {
    this.drawBackground();

    for (const obstacle of this.obstacles) {
      obstacle.draw(this.ctx);
    }

    if (this.player) {
      this.player.draw(this.ctx);
    }
  }

  loop() {
    this.update();
    this.draw();

    if (this.state === "playing") {
      this.animationId = requestAnimationFrame(() => this.loop());
    }
  }
}

/**
 * UI 与输入绑定
 */
class GameUI {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.overlay = document.getElementById("overlay");
    this.scoreHud = document.getElementById("score-hud");
    this.scoreEl = document.getElementById("score");
    this.startBtn = document.getElementById("start-btn");
    this.game = new SquareGame(this.canvas);

    this.game.onGameOver = (score) => {
      this.showOverlay(`游戏结束！得分: ${score}`, "再玩一次");
    };

    this.startBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.beginGame();
    });

    this.bindJumpInput();
  }

  bindJumpInput() {
    const jumpHandler = (e) => {
      if (e.type === "keydown" && e.code !== "Space" && e.code !== "ArrowUp") {
        return;
      }
      if (e.type === "keydown") {
        e.preventDefault();
      }
      if (this.game.state === "playing") {
        this.game.jump();
      }
    };

    this.canvas.addEventListener("pointerdown", jumpHandler);
    document.addEventListener("keydown", jumpHandler);
  }

  beginGame() {
    this.overlay.classList.add("hidden");
    this.scoreHud.classList.remove("hidden");
    this.scoreEl.textContent = "0";
    this.game.start();
    this.trackScore();
  }

  trackScore() {
    const tick = () => {
      if (this.game.state === "playing") {
        this.scoreEl.textContent = String(Math.floor(this.game.score));
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  showOverlay(message, buttonText) {
    this.overlay.classList.remove("hidden");
    this.scoreHud.classList.add("hidden");
    this.overlay.querySelector("h1").textContent = message;
    this.overlay.querySelector("p").textContent = "点击屏幕跳跃，躲开障碍";
    this.startBtn.textContent = buttonText;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new GameUI();
});
