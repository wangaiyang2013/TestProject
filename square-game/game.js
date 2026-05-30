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
  PLAYER_COLOR_INVINCIBLE: "#ffd369",
  OBSTACLE_COLOR: "#0f3460",
  OBSTACLE_EDGE_COLOR: "#533483",
  JUMP_HINT_DISTANCE: 120,
  INVINCIBLE_FRAMES: 90,
};

const PracticeConstants = {
  RUN_SPEED: 3.5,
  OBSTACLE_MIN_GAP: 380,
  OBSTACLE_MAX_GAP: 620,
  OBSTACLE_HEIGHT_MIN: 20,
  OBSTACLE_HEIGHT_MAX: 48,
  JUMP_HINT_DISTANCE: 150,
};

/**
 * 根据模式返回当前难度参数
 */
class DifficultyProfile {
  constructor(isPractice) {
    this.isPractice = isPractice;
  }

  getRunSpeed() {
    return this.isPractice ? PracticeConstants.RUN_SPEED : GameConstants.RUN_SPEED;
  }

  getObstacleGapRange() {
    if (this.isPractice) {
      return {
        min: PracticeConstants.OBSTACLE_MIN_GAP,
        max: PracticeConstants.OBSTACLE_MAX_GAP,
      };
    }
    return {
      min: GameConstants.OBSTACLE_MIN_GAP,
      max: GameConstants.OBSTACLE_MAX_GAP,
    };
  }

  getObstacleHeightRange() {
    if (this.isPractice) {
      return {
        min: PracticeConstants.OBSTACLE_HEIGHT_MIN,
        max: PracticeConstants.OBSTACLE_HEIGHT_MAX,
      };
    }
    return {
      min: GameConstants.OBSTACLE_HEIGHT_MIN,
      max: GameConstants.OBSTACLE_HEIGHT_MAX,
    };
  }

  getJumpHintDistance() {
    return this.isPractice
      ? PracticeConstants.JUMP_HINT_DISTANCE
      : GameConstants.JUMP_HINT_DISTANCE;
  }
}

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
    this.invincibleFrames = 0;
  }

  jump() {
    if (!this.isOnGround) {
      return false;
    }
    this.velocityY = GameConstants.JUMP_VELOCITY;
    this.isOnGround = false;
    return true;
  }

  setInvincible(frames) {
    this.invincibleFrames = frames;
  }

  isInvincible() {
    return this.invincibleFrames > 0;
  }

  update() {
    if (this.invincibleFrames > 0) {
      this.invincibleFrames -= 1;
    }

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
    ctx.fillStyle = this.isInvincible()
      ? GameConstants.PLAYER_COLOR_INVINCIBLE
      : GameConstants.PLAYER_COLOR;
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
    this.cleared = false;
  }

  update(runSpeed) {
    this.x -= runSpeed;
  }

  isOffScreen() {
    return this.x + this.width < 0;
  }

  isAheadOfPlayer(playerX) {
    return this.x + this.width > playerX;
  }

  shouldShowJumpHint(playerX, hintDistance) {
    const obstacleFront = this.x;
    const distance = obstacleFront - playerX;
    return distance > 0 && distance < hintDistance;
  }

  draw(ctx, showHint) {
    ctx.fillStyle = GameConstants.OBSTACLE_COLOR;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeStyle = showHint
      ? "#ffd369"
      : GameConstants.OBSTACLE_EDGE_COLOR;
    ctx.lineWidth = showHint ? 3 : 2;
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
 * 练习模式提示文案
 */
class PracticeCoach {
  constructor(tipElement) {
    this.tipElement = tipElement;
    this.clears = 0;
    this.misses = 0;
  }

  reset() {
    this.clears = 0;
    this.misses = 0;
    this.show("看到黄色边框时点击跳跃");
  }

  show(message, styleClass) {
    if (!this.tipElement) {
      return;
    }
    this.tipElement.textContent = message;
    this.tipElement.classList.remove("hidden", "fade", "jump-now");
    if (styleClass) {
      this.tipElement.classList.add(styleClass);
    }
  }

  hide() {
    if (this.tipElement) {
      this.tipElement.classList.add("hidden");
    }
  }

  onJumpHint() {
    this.show("现在跳！", "jump-now");
  }

  onJumpSuccess() {
    this.clears += 1;
    this.show(`漂亮！已连续躲过 ${this.clears} 个`, "fade");
  }

  onHit() {
    this.misses += 1;
    this.clears = 0;
    this.show(`没关系，再试一次（碰撞 ${this.misses} 次）`);
  }

  onIdle() {
    this.show("点击屏幕让方块跳起来");
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
    this.isPractice = false;
    this.profile = new DifficultyProfile(false);
    this.score = 0;
    this.obstacles = [];
    this.nextObstacleX = 0;
    this.animationId = null;
    this.player = null;
    this.groundY = 0;
    this.playerSize = 0;
    this.playerX = 0;
    this.coach = null;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  setPracticeMode(enabled) {
    this.isPractice = enabled;
    this.profile = new DifficultyProfile(enabled);
  }

  setCoach(coach) {
    this.coach = coach;
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

    if (this.isPractice && this.coach) {
      this.coach.reset();
    }

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
    const heightRange = this.profile.getObstacleHeightRange();
    const height =
      heightRange.min +
      Math.random() * (heightRange.max - heightRange.min);
    this.obstacles.push(
      new Obstacle(this.nextObstacleX, this.groundY, width, height)
    );
    const gapRange = this.profile.getObstacleGapRange();
    const gap =
      gapRange.min + Math.random() * (gapRange.max - gapRange.min);
    this.nextObstacleX += width + gap;
  }

  jump() {
    if (this.state !== "playing" || !this.player) {
      return;
    }
    this.player.jump();
  }

  getNextObstacle() {
    for (const obstacle of this.obstacles) {
      if (obstacle.isAheadOfPlayer(this.playerX)) {
        return obstacle;
      }
    }
    return null;
  }

  handleCollision() {
    if (this.isPractice) {
      if (this.player.isInvincible()) {
        return;
      }
      this.player.setInvincible(GameConstants.INVINCIBLE_FRAMES);
      if (this.coach) {
        this.coach.onHit();
      }
      return;
    }
    this.gameOver();
  }

  gameOver() {
    this.state = "gameover";
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (typeof this.onGameOver === "function") {
      this.onGameOver(Math.floor(this.score), this.isPractice);
    }
  }

  updatePracticeHints() {
    if (!this.isPractice || !this.coach) {
      return;
    }

    const nextObstacle = this.getNextObstacle();
    if (!nextObstacle) {
      this.coach.onIdle();
      return;
    }

    const playerFront = this.player.x + this.player.size;
    if (
      nextObstacle.shouldShowJumpHint(
        playerFront,
        this.profile.getJumpHintDistance()
      )
    ) {
      this.coach.onJumpHint();
    } else if (nextObstacle.x + nextObstacle.width < playerFront) {
      if (!nextObstacle.cleared) {
        nextObstacle.cleared = true;
        this.coach.onJumpSuccess();
      }
    }
  }

  update() {
    if (this.state !== "playing" || !this.player) {
      return;
    }

    this.player.update();
    this.score += GameConstants.SCORE_PER_FRAME;
    const runSpeed = this.profile.getRunSpeed();

    for (let i = this.obstacles.length - 1; i >= 0; i -= 1) {
      const obstacle = this.obstacles[i];
      obstacle.update(runSpeed);

      if (
        !this.player.isInvincible() &&
        CollisionDetector.intersects(
          this.player.getBounds(),
          obstacle.getBounds()
        )
      ) {
        this.handleCollision();
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

    this.updatePracticeHints();
  }

  drawBackground() {
    const ctx = this.ctx;
    ctx.fillStyle = GameConstants.SKY_COLOR;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = GameConstants.GROUND_COLOR;
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    ctx.fillStyle = GameConstants.GROUND_TOP_COLOR;
    ctx.fillRect(0, this.groundY - 4, this.width, 4);

    if (this.isPractice) {
      ctx.fillStyle = "rgba(78, 204, 163, 0.25)";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText("练习模式", 12, 28);
    }
  }

  draw() {
    this.drawBackground();

    const nextObstacle = this.getNextObstacle();
    const hintDistance = this.profile.getJumpHintDistance();
    const playerFront = this.player
      ? this.player.x + this.player.size
      : 0;

    for (const obstacle of this.obstacles) {
      const showHint =
        this.isPractice &&
        obstacle.shouldShowJumpHint(playerFront, hintDistance);
      obstacle.draw(this.ctx, showHint);
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
    this.modeLabel = document.getElementById("mode-label");
    this.startBtn = document.getElementById("start-btn");
    this.practiceBtn = document.getElementById("practice-btn");
    this.practiceTip = document.getElementById("practice-tip");
    this.game = new SquareGame(this.canvas);
    this.coach = new PracticeCoach(this.practiceTip);
    this.game.setCoach(this.coach);

    this.game.onGameOver = (score, isPractice) => {
      if (isPractice) {
        return;
      }
      this.showOverlay(`游戏结束！得分: ${score}`, "再玩一次", false);
    };

    this.startBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.beginGame(false);
    });

    this.practiceBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.beginGame(true);
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

  beginGame(isPractice) {
    this.game.setPracticeMode(isPractice);
    this.overlay.classList.add("hidden");
    this.scoreHud.classList.remove("hidden");
    this.scoreEl.textContent = "0";
    this.modeLabel.textContent = isPractice ? "练习" : "得分";

    if (isPractice) {
      this.practiceTip.classList.remove("hidden");
    } else {
      this.practiceTip.classList.add("hidden");
      this.coach.hide();
    }

    this.game.start();
    this.trackScore(isPractice);
  }

  trackScore(isPractice) {
    const tick = () => {
      if (this.game.state === "playing") {
        if (isPractice) {
          this.scoreEl.textContent = String(this.coach.clears);
        } else {
          this.scoreEl.textContent = String(Math.floor(this.game.score));
        }
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  showOverlay(message, buttonText, isPracticeEnd) {
    this.overlay.classList.remove("hidden");
    this.scoreHud.classList.add("hidden");
    this.practiceTip.classList.add("hidden");
    this.overlay.querySelector("h1").textContent = message;
    if (isPracticeEnd) {
      this.overlay.querySelector("p").textContent =
        "练习模式可随时返回菜单，选正式游戏挑战高分";
    } else {
      this.overlay.querySelector("p").textContent =
        "点击屏幕跳跃，躲开障碍。新手可先点「练习模式」";
    }
    this.startBtn.textContent = buttonText;
    this.practiceBtn.textContent = "练习模式";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new GameUI();
});
