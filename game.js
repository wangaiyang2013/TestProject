/**
 * 双球对战 - 两名玩家各控制一个球，用不同按键移动与攻击
 */

const GameConstants = {
  MAX_HEALTH: 100,
  BALL_RADIUS_RATIO: 0.035,
  MOVE_SPEED: 5,
  ATTACK_COOLDOWN_MS: 400,
  PROJECTILE_SPEED: 12,
  PROJECTILE_RADIUS_RATIO: 0.018,
  PROJECTILE_DAMAGE: 15,
  PROJECTILE_LIFETIME_MS: 1200,
  ARENA_PADDING_RATIO: 0.08,
  BACKGROUND_COLOR: "#1a1a2e",
  ARENA_COLOR: "#16213e",
  ARENA_BORDER_COLOR: "#4ecca3",
  PLAYER1_COLOR: "#e94560",
  PLAYER1_GLOW: "#ff6b6b",
  PLAYER2_COLOR: "#339af0",
  PLAYER2_GLOW: "#74c0fc",
  PROJECTILE1_COLOR: "#ff8787",
  PROJECTILE2_COLOR: "#91d5ff",
};

/**
 * 键盘输入管理
 */
class InputManager {
  constructor() {
    this.keys = new Set();
    this.justPressed = new Set();
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.onKeyUp(e));
  }

  onKeyDown(event) {
    if (!this.keys.has(event.code)) {
      this.justPressed.add(event.code);
    }
    this.keys.add(event.code);
  }

  onKeyUp(event) {
    this.keys.delete(event.code);
  }

  isDown(code) {
    return this.keys.has(code);
  }

  wasPressed(code) {
    return this.justPressed.has(code);
  }

  clearFrame() {
    this.justPressed.clear();
  }
}

/**
 * 移动方向向量
 */
class DirectionVector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  normalize() {
    const length = Math.hypot(this.x, this.y);
    if (length < 0.001) {
      return new DirectionVector(0, 0);
    }
    return new DirectionVector(this.x / length, this.y / length);
  }

  clone() {
    return new DirectionVector(this.x, this.y);
  }
}

/**
 * 攻击投射物
 */
class Projectile {
  constructor(x, y, dirX, dirY, radius, ownerId, color) {
    this.x = x;
    this.y = y;
    this.dirX = dirX;
    this.dirY = dirY;
    this.radius = radius;
    this.ownerId = ownerId;
    this.color = color;
    this.alive = true;
    this.spawnTime = Date.now();
  }

  update() {
    this.x += this.dirX * GameConstants.PROJECTILE_SPEED;
    this.y += this.dirY * GameConstants.PROJECTILE_SPEED;

    const elapsed = Date.now() - this.spawnTime;
    if (elapsed > GameConstants.PROJECTILE_LIFETIME_MS) {
      this.alive = false;
    }
  }

  isOutOfBounds(arena) {
    return (
      this.x - this.radius < arena.left ||
      this.x + this.radius > arena.right ||
      this.y - this.radius < arena.top ||
      this.y + this.radius > arena.bottom
    );
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  getBounds() {
    return {
      left: this.x - this.radius,
      right: this.x + this.radius,
      top: this.y - this.radius,
      bottom: this.y + this.radius,
    };
  }
}

/**
 * 竞技场边界
 */
class ArenaBounds {
  constructor(left, top, right, bottom) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
  }

  clampBall(ball) {
    ball.x = Math.max(this.left + ball.radius, Math.min(this.right - ball.radius, ball.x));
    ball.y = Math.max(this.top + ball.radius, Math.min(this.bottom - ball.radius, ball.y));
  }

  draw(ctx) {
    const width = this.right - this.left;
    const height = this.bottom - this.top;

    ctx.fillStyle = GameConstants.ARENA_COLOR;
    ctx.fillRect(this.left, this.top, width, height);

    ctx.strokeStyle = GameConstants.ARENA_BORDER_COLOR;
    ctx.lineWidth = 4;
    ctx.strokeRect(this.left, this.top, width, height);
  }
}

/**
 * 碰撞检测
 */
class CollisionDetector {
  static circleHitsCircle(ax, ay, ar, bx, by, br) {
    const dist = Math.hypot(ax - bx, ay - by);
    return dist < ar + br;
  }
}

/**
 * 玩家小球
 */
class BallPlayer {
  constructor(id, x, y, radius, color, glowColor, controlScheme) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.glowColor = glowColor;
    this.controlScheme = controlScheme;
    this.health = GameConstants.MAX_HEALTH;
    this.lastMoveDir = new DirectionVector(1, 0);
    this.lastAttackTime = 0;
    this.invincibleUntil = 0;
  }

  getMoveInput(input) {
    let dx = 0;
    let dy = 0;
    const scheme = this.controlScheme;

    if (input.isDown(scheme.up)) {
      dy -= 1;
    }
    if (input.isDown(scheme.down)) {
      dy += 1;
    }
    if (input.isDown(scheme.left)) {
      dx -= 1;
    }
    if (input.isDown(scheme.right)) {
      dx += 1;
    }

    return new DirectionVector(dx, dy).normalize();
  }

  wantsAttack(input) {
    const attackKey = this.controlScheme.attack;
    if (attackKey === "ControlLeft") {
      return (
        input.wasPressed("ControlLeft") || input.wasPressed("ControlRight")
      );
    }
    return input.wasPressed(attackKey);
  }

  canAttack() {
    return Date.now() - this.lastAttackTime >= GameConstants.ATTACK_COOLDOWN_MS;
  }

  move(dir, arena) {
    if (dir.x !== 0 || dir.y !== 0) {
      this.lastMoveDir = dir.clone();
    }
    this.x += dir.x * GameConstants.MOVE_SPEED;
    this.y += dir.y * GameConstants.MOVE_SPEED;
    arena.clampBall(this);
  }

  spawnProjectile(projectileRadius) {
    const dir = this.lastMoveDir.normalize();
    let dirX = dir.x;
    let dirY = dir.y;
    if (dirX === 0 && dirY === 0) {
      dirX = this.id === 1 ? 1 : -1;
    }

    const offset = this.radius + projectileRadius + 4;
    const spawnX = this.x + dirX * offset;
    const spawnY = this.y + dirY * offset;

    const color =
      this.id === 1
        ? GameConstants.PROJECTILE1_COLOR
        : GameConstants.PROJECTILE2_COLOR;

    return new Projectile(
      spawnX,
      spawnY,
      dirX,
      dirY,
      projectileRadius,
      this.id,
      color
    );
  }

  takeDamage(amount) {
    if (Date.now() < this.invincibleUntil) {
      return false;
    }
    this.health = Math.max(0, this.health - amount);
    this.invincibleUntil = Date.now() + 300;
    return true;
  }

  isAlive() {
    return this.health > 0;
  }

  draw(ctx) {
    const flashing = Date.now() < this.invincibleUntil && Math.floor(Date.now() / 80) % 2 === 0;
    if (flashing) {
      ctx.globalAlpha = 0.5;
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
    ctx.fillStyle = this.glowColor;
    ctx.globalAlpha = flashing ? 0.25 : 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();

    if (flashing) {
      ctx.globalAlpha = 1;
    }
  }
}

/**
 * 控制方案配置
 */
class ControlScheme {
  constructor(up, down, left, right, attack) {
    this.up = up;
    this.down = down;
    this.left = left;
    this.right = right;
    this.attack = attack;
  }

  static player1() {
    return new ControlScheme(
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ControlLeft"
    );
  }

  static player2() {
    return new ControlScheme("KeyW", "KeyS", "KeyA", "KeyZ", "KeyY");
  }
}

/**
 * 主游戏逻辑
 */
class DualBallGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.state = "idle";
    this.input = new InputManager();
    this.players = [];
    this.projectiles = [];
    this.arena = null;
    this.winnerId = null;
    this.animationId = null;
    this.onGameOver = null;
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

    const padX = this.width * GameConstants.ARENA_PADDING_RATIO;
    const padY = this.height * GameConstants.ARENA_PADDING_RATIO;
    this.arena = new ArenaBounds(
      padX,
      padY + 40,
      this.width - padX,
      this.height - padY
    );

    if (this.players.length === 2) {
      const r = this.getBallRadius();
      this.players[0].radius = r;
      this.players[1].radius = r;
      this.arena.clampBall(this.players[0]);
      this.arena.clampBall(this.players[1]);
    }
  }

  getBallRadius() {
    return Math.max(16, this.height * GameConstants.BALL_RADIUS_RATIO);
  }

  getProjectileRadius() {
    return Math.max(8, this.height * GameConstants.PROJECTILE_RADIUS_RATIO);
  }

  start() {
    this.state = "playing";
    this.winnerId = null;
    this.projectiles = [];

    const r = this.getBallRadius();
    const centerY = (this.arena.top + this.arena.bottom) / 2;

    this.players = [
      new BallPlayer(
        1,
        this.arena.left + this.width * 0.15,
        centerY,
        r,
        GameConstants.PLAYER1_COLOR,
        GameConstants.PLAYER1_GLOW,
        ControlScheme.player1()
      ),
      new BallPlayer(
        2,
        this.arena.right - this.width * 0.15,
        centerY,
        r,
        GameConstants.PLAYER2_COLOR,
        GameConstants.PLAYER2_GLOW,
        ControlScheme.player2()
      ),
    ];

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.loop();
  }

  handleAttacks() {
    const projectileRadius = this.getProjectileRadius();

    for (const player of this.players) {
      if (!player.isAlive()) {
        continue;
      }
      if (player.wantsAttack(this.input) && player.canAttack()) {
        player.lastAttackTime = Date.now();
        this.projectiles.push(player.spawnProjectile(projectileRadius));
      }
    }
  }

  updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const proj = this.projectiles[i];
      proj.update();

      if (!proj.alive || proj.isOutOfBounds(this.arena)) {
        this.projectiles.splice(i, 1);
        continue;
      }

      for (const player of this.players) {
        if (player.id === proj.ownerId || !player.isAlive()) {
          continue;
        }
        if (
          CollisionDetector.circleHitsCircle(
            proj.x,
            proj.y,
            proj.radius,
            player.x,
            player.y,
            player.radius
          )
        ) {
          player.takeDamage(GameConstants.PROJECTILE_DAMAGE);
          proj.alive = false;
          this.projectiles.splice(i, 1);
          break;
        }
      }
    }
  }

  checkWinner() {
    const alive = this.players.filter((p) => p.isAlive());
    if (alive.length === 1 && this.players.length === 2) {
      this.winnerId = alive[0].id;
      this.endGame();
    }
  }

  endGame() {
    this.state = "gameover";
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (typeof this.onGameOver === "function") {
      this.onGameOver(this.winnerId);
    }
  }

  update() {
    if (this.state !== "playing") {
      return;
    }

    for (const player of this.players) {
      if (!player.isAlive()) {
        continue;
      }
      const dir = player.getMoveInput(this.input);
      player.move(dir, this.arena);
    }

    this.handleAttacks();
    this.updateProjectiles();
    this.checkWinner();
    this.input.clearFrame();
  }

  drawBackground() {
    this.ctx.fillStyle = GameConstants.BACKGROUND_COLOR;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.arena.draw(this.ctx);
  }

  draw() {
    this.drawBackground();

    for (const proj of this.projectiles) {
      proj.draw(this.ctx);
    }

    for (const player of this.players) {
      if (player.isAlive()) {
        player.draw(this.ctx);
      }
    }
  }

  loop() {
    this.update();
    this.draw();

    if (this.state === "playing") {
      this.animationId = requestAnimationFrame(() => this.loop());
    }
  }

  getHealthPercent(playerId) {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) {
      return 100;
    }
    return (player.health / GameConstants.MAX_HEALTH) * 100;
  }
}

/**
 * UI 绑定
 */
class GameUI {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.overlay = document.getElementById("overlay");
    this.hud = document.getElementById("hud");
    this.startBtn = document.getElementById("start-btn");
    this.hpP1 = document.getElementById("hp-p1");
    this.hpP2 = document.getElementById("hp-p2");
    this.game = new DualBallGame(this.canvas);

    this.game.onGameOver = (winnerId) => {
      const winnerText = winnerId === 1 ? "玩家1（红球）获胜！" : "玩家2（蓝球）获胜！";
      this.showOverlay(winnerText);
    };

    this.startBtn.addEventListener("click", () => this.beginGame());

    window.addEventListener("keydown", (e) => {
      if (e.code === "ControlRight" && this.game.state === "playing") {
        e.preventDefault();
      }
    });
  }

  beginGame() {
    this.overlay.classList.add("hidden");
    this.hud.classList.remove("hidden");
    this.overlay.querySelector("h1").textContent = "双球对战";
    this.game.start();
    this.trackHealth();
  }

  trackHealth() {
    const tick = () => {
      if (this.game.state === "playing") {
        this.hpP1.style.width = `${this.game.getHealthPercent(1)}%`;
        this.hpP2.style.width = `${this.game.getHealthPercent(2)}%`;
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  showOverlay(message) {
    this.overlay.classList.remove("hidden");
    this.hud.classList.add("hidden");
    this.overlay.querySelector("h1").textContent = message;
    this.startBtn.textContent = "再来一局";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new GameUI();
});
