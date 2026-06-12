/**
 * 双球对战 - 两名玩家各控制一个球，用不同按键移动与攻击
 */

/**
 * 球生命值换算：在原始生命值基础上统一 +500
 */
class BallHealthResolver {
  static BALL_HEALTH_BONUS = 500;

  static resolve(baseMaxHealth) {
    return baseMaxHealth + BallHealthResolver.BALL_HEALTH_BONUS;
  }

  static getDefaultMaxHealth() {
    return BallHealthResolver.resolve(100);
  }
}

/**
 * 在球体上方绘制生命值上限文字（替代生命条）
 */
class BallMaxHealthLabelRenderer {
  static drawAboveHead(ctx, x, y, radius, maxHealth, options) {
    const config = options || {};
    const offsetY = config.offsetY !== undefined ? config.offsetY : 16;
    const fontSize = config.fontSize !== undefined ? config.fontSize : 11;
    const textColor = config.textColor !== undefined ? config.textColor : "#fff";
    const labelY = y - radius - offsetY;

    ctx.fillStyle = textColor;
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(maxHealth), x, labelY);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}

const GameConstants = {
  MAX_HEALTH: BallHealthResolver.getDefaultMaxHealth(),
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
  AI_ATTACK_RANGE: 300,
  AI_IDEAL_RANGE_MIN: 100,
  AI_IDEAL_RANGE_MAX: 240,
  AI_DODGE_RADIUS: 110,
  AI_STRAFE_STRENGTH: 0.65,
  AI_REACTION_INTERVAL_MS: 150,
  AI_ATTACK_CHANCE: 0.85,
};

/**
 * 游戏模式
 */
class GameMode {
  static VERSUS = "versus";

  static TRAINING = "training";

  static GROUP_BATTLE = "group_battle";

  static LITTLE_BALL_HERO = "little_ball_hero";

  static WEST_BULLDOG = "west_bulldog";

  static NUMBER_TEACHER = "number_teacher";

  static SELF_DEFINITION = "self_definition";
}

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
    if (!this.controlScheme) {
      return new DirectionVector(0, 0);
    }

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
    if (!this.controlScheme) {
      return false;
    }

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

  aimToward(targetX, targetY) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dir = new DirectionVector(dx, dy).normalize();
    if (dir.x !== 0 || dir.y !== 0) {
      this.lastMoveDir = dir;
    }
  }

  move(dir, arena) {
    if (dir.x !== 0 || dir.y !== 0) {
      this.lastMoveDir = dir.clone();
    }
    this.x += dir.x * GameConstants.MOVE_SPEED;
    this.y += dir.y * GameConstants.MOVE_SPEED;
    arena.clampBall(this);
  }

  tryAttack(projectileRadius) {
    if (!this.canAttack()) {
      return null;
    }
    this.lastAttackTime = Date.now();
    return this.spawnProjectile(projectileRadius);
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
 * 训练模式 AI 机器人（控制玩家2）
 */
class AiOpponentController {
  constructor() {
    this.lastThinkTime = 0;
    this.strafeSign = 1;
    this.pendingAttack = false;
  }

  /**
   * 计算与目标球的距离
   */
  distanceTo(target) {
    return Math.hypot(target.x - this.aiPlayer.x, target.y - this.aiPlayer.y);
  }

  /**
   * 寻找飞向 AI 的最近危险弹幕
   */
  findThreateningProjectile(projectiles, aiPlayer) {
    let closest = null;
    let closestDist = GameConstants.AI_DODGE_RADIUS;

    for (const proj of projectiles) {
      if (!proj.alive || proj.ownerId === aiPlayer.id) {
        continue;
      }

      const toAiX = aiPlayer.x - proj.x;
      const toAiY = aiPlayer.y - proj.y;
      const dot = toAiX * proj.dirX + toAiY * proj.dirY;
      if (dot <= 0) {
        continue;
      }

      const dist = Math.hypot(toAiX, toAiY);
      if (dist < closestDist) {
        closestDist = dist;
        closest = proj;
      }
    }

    return closest;
  }

  /**
   * 躲避弹幕：垂直于飞行方向移动
   */
  getDodgeDirection(projectile, aiPlayer) {
    const perpX = -projectile.dirY;
    const perpY = projectile.dirX;
    const toAiX = aiPlayer.x - projectile.x;
    const toAiY = aiPlayer.y - projectile.y;
    const sign = toAiX * perpX + toAiY * perpY >= 0 ? 1 : -1;
    return new DirectionVector(perpX * sign, perpY * sign).normalize();
  }

  /**
   * 根据与玩家的距离决定追击、后撤或侧移
   */
  getChaseDirection(aiPlayer, humanPlayer) {
    const dx = humanPlayer.x - aiPlayer.x;
    const dy = humanPlayer.y - aiPlayer.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return new DirectionVector(0, 0);
    }

    const toHuman = new DirectionVector(dx / dist, dy / dist);
    const perp = new DirectionVector(-toHuman.y, toHuman.y);

    if (dist > GameConstants.AI_IDEAL_RANGE_MAX) {
      return toHuman;
    }

    if (dist < GameConstants.AI_IDEAL_RANGE_MIN) {
      return new DirectionVector(-toHuman.x, -toHuman.y);
    }

    return new DirectionVector(
      perp.x * this.strafeSign * GameConstants.AI_STRAFE_STRENGTH +
        toHuman.x * 0.25,
      perp.y * this.strafeSign * GameConstants.AI_STRAFE_STRENGTH +
        toHuman.y * 0.25
    ).normalize();
  }

  /**
   * 贴边时往场地中心微调，避免 AI 卡在墙角
   */
  getArenaCenterBias(aiPlayer, arena) {
    const centerX = (arena.left + arena.right) / 2;
    const centerY = (arena.top + arena.bottom) / 2;
    const margin = aiPlayer.radius * 3;
    let bx = 0;
    let by = 0;

    if (aiPlayer.x < arena.left + margin) {
      bx = 1;
    } else if (aiPlayer.x > arena.right - margin) {
      bx = -1;
    }
    if (aiPlayer.y < arena.top + margin) {
      by = 1;
    } else if (aiPlayer.y > arena.bottom - margin) {
      by = -1;
    }

    if (bx === 0 && by === 0) {
      return new DirectionVector(
        (centerX - aiPlayer.x) * 0.001,
        (centerY - aiPlayer.y) * 0.001
      ).normalize();
    }

    return new DirectionVector(bx, by).normalize();
  }

  combineDirections(primary, secondary, secondaryWeight) {
    const combined = new DirectionVector(
      primary.x + secondary.x * secondaryWeight,
      primary.y + secondary.y * secondaryWeight
    );
    return combined.normalize();
  }

  think(aiPlayer, humanPlayer, projectiles, arena) {
    this.aiPlayer = aiPlayer;

    const now = Date.now();
    if (now - this.lastThinkTime < GameConstants.AI_REACTION_INTERVAL_MS) {
      return;
    }
    this.lastThinkTime = now;

    if (Math.random() < 0.08) {
      this.strafeSign *= -1;
    }

    const threat = this.findThreateningProjectile(projectiles, aiPlayer);
    let moveDir;

    if (threat) {
      moveDir = this.getDodgeDirection(threat, aiPlayer);
    } else {
      moveDir = this.getChaseDirection(aiPlayer, humanPlayer);
      const centerBias = this.getArenaCenterBias(aiPlayer, arena);
      moveDir = this.combineDirections(moveDir, centerBias, 0.35);
    }

    this.currentMoveDir = moveDir;

    const dist = this.distanceTo(humanPlayer);
    const healthRatio = aiPlayer.health / GameConstants.MAX_HEALTH;
    const attackRange =
      GameConstants.AI_ATTACK_RANGE * (0.85 + healthRatio * 0.15);

    this.pendingAttack =
      dist <= attackRange &&
      dist >= GameConstants.AI_IDEAL_RANGE_MIN * 0.6 &&
      Math.random() < GameConstants.AI_ATTACK_CHANCE;
  }

  getMoveDirection() {
    return this.currentMoveDir || new DirectionVector(0, 0);
  }

  shouldAttackNow() {
    return this.pendingAttack;
  }

  reset() {
    this.lastThinkTime = 0;
    this.strafeSign = Math.random() < 0.5 ? -1 : 1;
    this.pendingAttack = false;
    this.currentMoveDir = new DirectionVector(-1, 0);
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
    this.gameMode = GameMode.VERSUS;
    this.input = new InputManager();
    this.aiController = new AiOpponentController();
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

  start(mode) {
    this.gameMode = mode || GameMode.VERSUS;
    this.state = "playing";
    this.winnerId = null;
    this.projectiles = [];

    const r = this.getBallRadius();
    const centerY = (this.arena.top + this.arena.bottom) / 2;
    const isTraining = this.gameMode === GameMode.TRAINING;

    const player2Scheme = isTraining ? null : ControlScheme.player2();

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
        player2Scheme
      ),
    ];

    if (isTraining) {
      this.aiController.reset();
    }

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.loop();
  }

  isTrainingMode() {
    return this.gameMode === GameMode.TRAINING;
  }

  updateHumanPlayer() {
    const human = this.players[0];
    if (!human || !human.isAlive()) {
      return;
    }
    const dir = human.getMoveInput(this.input);
    human.move(dir, this.arena);
  }

  updateAiPlayer() {
    const aiPlayer = this.players[1];
    const human = this.players[0];
    if (!aiPlayer || !human || !aiPlayer.isAlive() || !human.isAlive()) {
      return;
    }

    this.aiController.think(
      aiPlayer,
      human,
      this.projectiles,
      this.arena
    );

    const moveDir = this.aiController.getMoveDirection();
    aiPlayer.move(moveDir, this.arena);
    aiPlayer.aimToward(human.x, human.y);
  }

  updateVersusPlayers() {
    for (const player of this.players) {
      if (!player.isAlive()) {
        continue;
      }
      const dir = player.getMoveInput(this.input);
      player.move(dir, this.arena);
    }
  }

  handleAttacks() {
    const projectileRadius = this.getProjectileRadius();

    const human = this.players[0];
    if (human && human.isAlive() && human.wantsAttack(this.input)) {
      const proj = human.tryAttack(projectileRadius);
      if (proj) {
        this.projectiles.push(proj);
      }
    }

    if (this.isTrainingMode()) {
      const aiPlayer = this.players[1];
      if (
        aiPlayer &&
        aiPlayer.isAlive() &&
        this.aiController.shouldAttackNow()
      ) {
        aiPlayer.aimToward(this.players[0].x, this.players[0].y);
        const proj = aiPlayer.tryAttack(projectileRadius);
        if (proj) {
          this.projectiles.push(proj);
        }
        this.aiController.pendingAttack = false;
      }
      return;
    }

    const player2 = this.players[1];
    if (player2 && player2.isAlive() && player2.wantsAttack(this.input)) {
      const proj = player2.tryAttack(projectileRadius);
      if (proj) {
        this.projectiles.push(proj);
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

    if (this.isTrainingMode()) {
      this.updateHumanPlayer();
      this.updateAiPlayer();
    } else {
      this.updateVersusPlayers();
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

    if (this.isTrainingMode()) {
      this.ctx.fillStyle = "rgba(77, 171, 247, 0.2)";
      this.ctx.font = "14px system-ui, sans-serif";
      this.ctx.fillText("训练模式 · AI 对战", 12, 28);
    }
  }

  drawAiRobotBadge(ctx, player) {
    ctx.fillStyle = "#74c0fc";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("AI", player.x, player.y - player.radius - 10);
    ctx.textAlign = "left";
  }

  draw() {
    this.drawBackground();

    for (const proj of this.projectiles) {
      proj.draw(this.ctx);
    }

    for (const player of this.players) {
      if (player.isAlive()) {
        player.draw(this.ctx);
        if (this.isTrainingMode() && player.id === 2) {
          this.drawAiRobotBadge(this.ctx, player);
        }
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
    this.groupSetupOverlay = document.getElementById("group-setup-overlay");
    this.cardOverlay = document.getElementById("card-overlay");
    this.cardChoicesEl = document.getElementById("card-choices");
    this.cardLevelHint = document.getElementById("card-level-hint");
    this.hud = document.getElementById("hud");
    this.groupHud = document.getElementById("group-hud");
    this.modeBadge = document.getElementById("mode-badge");
    this.versusBtn = document.getElementById("versus-btn");
    this.trainingBtn = document.getElementById("training-btn");
    this.groupBattleBtn = document.getElementById("group-battle-btn");
    this.group1pBtn = document.getElementById("group-1p-btn");
    this.group2pBtn = document.getElementById("group-2p-btn");
    this.groupSetupBack = document.getElementById("group-setup-back");
    this.rulesVersus = document.getElementById("rules-versus");
    this.rulesTraining = document.getElementById("rules-training");
    this.rulesGroup = document.getElementById("rules-group");
    this.hpP1 = document.getElementById("hp-p1");
    this.hpP2 = document.getElementById("hp-p2");
    this.p2Bar = document.querySelector(".health-bar.p2");
    this.p2Label = document.getElementById("p2-label");
    this.p1HudLabel = document.querySelector(".health-bar.p1 span");
    this.gbLevel = document.getElementById("gb-level");
    this.gbBoss = document.getElementById("gb-boss");
    this.gbP1Xp = document.getElementById("gb-p1-xp");
    this.gbP2Xp = document.getElementById("gb-p2-xp");
    this.gbP2Block = document.getElementById("gb-p2-block");
    this.gbPhase = document.getElementById("gb-phase");
    this.currentMode = GameMode.VERSUS;
    this.economy = GameEconomyService.getInstance();
    this.coinHud = document.getElementById("coin-hud");
    this.matchCoinReward = document.getElementById("match-coin-reward");
    this.shopOverlay = document.getElementById("shop-overlay");
    this.shopBtn = document.getElementById("shop-btn");
    this.shopPanel = new ShopPanel(
      {
        overlay: this.shopOverlay,
        openBtn: this.shopBtn,
        closeBtn: document.getElementById("shop-close-btn"),
        backBtn: document.getElementById("shop-back-btn"),
        coinHud: this.coinHud,
        shopCoins: document.getElementById("shop-coins"),
        list: document.getElementById("shop-item-list"),
        message: document.getElementById("shop-message"),
        tabButtons: Array.from(document.querySelectorAll(".shop-tab-btn")),
      },
      this.economy
    );
    this.shopPanel.onBack = () => this.showMainMenu();
    this.updateCoinHud();
    this.game = new DualBallGame(this.canvas);
    this.groupBattle = new GroupBattleGame(this.canvas);
    this.littleBallHero = new LittleBallHeroGame(this.canvas);
    this.westBulldog = new WestBulldogGame(this.canvas);
    this.numberTeacher = new NumberTeacherGame(this.canvas);
    this.selfDefinition = new SelfDefinitionGame(this.canvas);
    this.westBulldogBtn = document.getElementById("west-bulldog-btn");
    this.selfDefBtn = document.getElementById("self-def-btn");
    this.selfDefSetup = document.getElementById("self-def-setup");
    this.selfDefRoom = document.getElementById("self-def-room");
    this.selfDefTrainingBtn = document.getElementById("self-def-training-btn");
    this.selfDefVersusBtn = document.getElementById("self-def-versus-btn");
    this.selfDefSetupBack = document.getElementById("self-def-setup-back");
    this.selfDefConfirmBtn = document.getElementById("self-def-confirm-btn");
    this.selfDefRoomBack = document.getElementById("self-def-room-back");
    this.pendingSelfDefSubMode = "training";
    this.customBallRoom = new CustomBallRoom();
    this.selfDefRoomPanel = new CustomBallRoomPanel(this.customBallRoom, {
      slotsContainer: document.getElementById("self-def-slots"),
      name: document.getElementById("sdf-name"),
      color: document.getElementById("sdf-color"),
      glow: document.getElementById("sdf-glow"),
      decoration: document.getElementById("sdf-decoration"),
      maxHealth: document.getElementById("sdf-health"),
      moveSpeed: document.getElementById("sdf-speed"),
      mass: document.getElementById("sdf-mass"),
      skillTypeName: document.getElementById("sdf-skill"),
      skillDamage: document.getElementById("sdf-damage"),
      skillIntervalSec: document.getElementById("sdf-interval"),
      confirmBtn: this.selfDefConfirmBtn,
    });
    this.selfDefRoomPanel.onConfirm = (templates) => {
      this.selfDefRoom.classList.add("hidden");
      this.beginSelfDefinition(this.pendingSelfDefSubMode, templates);
    };
    this.numberTeacherBtn = document.getElementById("number-teacher-btn");
    this.numberTeacherSetup = document.getElementById("number-teacher-setup");
    this.ntTrainingBtn = document.getElementById("nt-training-btn");
    this.ntVersusBtn = document.getElementById("nt-versus-btn");
    this.ntSetupBack = document.getElementById("nt-setup-back");
    this.numberTeacherHud = document.getElementById("number-teacher-hud");
    this.ntP1Num = document.getElementById("nt-p1-num");
    this.ntP2Num = document.getElementById("nt-p2-num");
    this.ntHitMsg = document.getElementById("nt-hit-msg");
    this.westHud = document.getElementById("west-hud");
    this.westHitMsg = document.getElementById("west-hit-msg");
    this.heroSetupOverlay = document.getElementById("hero-setup-overlay");
    this.heroHud = document.getElementById("hero-hud");
    this.heroPhaseText = document.getElementById("hero-phase-text");
    this.heroP1Info = document.getElementById("hero-p1-info");
    this.heroP2Info = document.getElementById("hero-p2-info");
    this.heroPickPanel = document.getElementById("hero-pick-panel");
    this.heroPickInput = document.getElementById("hero-pick-input");
    this.heroPickConfirm = document.getElementById("hero-pick-confirm");
    this.heroPickMatch = document.getElementById("hero-pick-match");
    this.heroPickPanelKey = "";
    this.heroModeBtn = document.getElementById("hero-mode-btn");
    this.heroTrainingBtn = document.getElementById("hero-training-btn");
    this.heroVersusBtn = document.getElementById("hero-versus-btn");
    this.heroSetupBack = document.getElementById("hero-setup-back");

    this.bindDualBallGame();
    this.bindGroupBattleGame();
    this.bindLittleBallHeroGame();
    this.bindWestBulldogGame();
    this.bindNumberTeacherGame();
    this.bindSelfDefinitionGame();
    this.bindHeroPickPanel();
    this.bindMenuButtons();

    window.addEventListener("keydown", (e) => {
      const playing =
        this.game.state === "playing" ||
        this.groupBattle.state === "playing" ||
        this.littleBallHero.state === "playing" ||
        this.westBulldog.state === "playing" ||
        this.numberTeacher.state === "playing" ||
        this.selfDefinition.state === "playing";
      if (e.code === "ControlRight" && playing) {
        e.preventDefault();
      }
    });
  }

  bindDualBallGame() {
    this.game.onGameOver = (winnerId) => {
      const winnerText = this.getWinnerMessage(winnerId);
      const playerWon =
        this.currentMode === GameMode.TRAINING ? winnerId === 1 : winnerId === 1;
      this.finishMatchWithCoins(winnerText, playerWon);
    };
  }

  bindGroupBattleGame() {
    this.groupBattle.onHudUpdate = (snap) => this.updateGroupHud(snap);

    this.groupBattle.onLevelComplete = (cards, snap) => {
      this.showCardDraw(cards, snap);
    };

    this.groupBattle.onGameVictory = () => {
      this.finishMatchWithCoins("恭喜通关！30 个 Boss 全部击败！", true);
    };

    this.groupBattle.onGameOver = () => {
      this.finishMatchWithCoins("组团失败，全员阵亡，再试一次！", false);
    };
  }

  bindNumberTeacherGame() {
    this.numberTeacher.onHudUpdate = (snap) => {
      this.ntP1Num.textContent = `红队 数字 ${snap.p1Number}`;
      this.ntP2Num.textContent = `蓝队 数字 ${snap.p2Number}`;
      if (snap.lastHit) {
        this.ntHitMsg.textContent = snap.lastHit;
      }
    };

    this.numberTeacher.onGameOver = (winnerId) => {
      const p1 = this.numberTeacher.getFighter(1);
      const p2 = this.numberTeacher.getFighter(2);
      const winNum = winnerId === 1 ? p1.attackNumber : p2.attackNumber;
      const msg =
        this.numberTeacher.subMode === "training"
          ? winnerId === 1
            ? `胜利！你的数字已达 ${winNum}`
            : "失败！再试一次！"
          : winnerId === 1
            ? `红队获胜！数字 ${winNum}`
            : `蓝队获胜！数字 ${winNum}`;
      this.finishMatchWithCoins(msg, winnerId === 1);
    };
  }

  bindWestBulldogGame() {
    this.westBulldog.onHudUpdate = (snap) => {
      if (snap.lastHit) {
        this.westHitMsg.textContent = snap.lastHit;
      }
    };

    this.westBulldog.onGameOver = (playerWon) => {
      this.finishMatchWithCoins(
        playerWon ? "西部斗牛球胜利！对手已倒下" : "你被对手撞倒了，再试一次！",
        playerWon
      );
    };
  }

  bindHeroPickPanel() {
    this.heroPickConfirm.addEventListener("click", () => {
      this.submitHeroPick();
    });

    this.heroPickInput.addEventListener("input", () => {
      this.updateHeroPickPreview();
    });

    this.heroPickInput.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Enter") {
        event.preventDefault();
        this.submitHeroPick();
      }
    });
  }

  getActiveHeroPickGame() {
    if (this.currentMode === GameMode.LITTLE_BALL_HERO) {
      return this.littleBallHero;
    }
    if (this.currentMode === GameMode.SELF_DEFINITION) {
      return this.selfDefinition;
    }
    return null;
  }

  showHeroPickPanel(snap, game) {
    this.heroPickPanel.classList.remove("hidden");
    const heroCount = game.getHeroes().length;
    const teamLabel = game.getCurrentPickerTeamLabel();
    this.heroPickInput.placeholder = `${teamLabel}：输入角色名或编号（1-${heroCount}）`;
    this.heroPickConfirm.textContent =
      snap.pickStep === 1 ? "确认选球（红队）" : "确认选球（蓝队）";
    this.heroPickInput.focus();
  }

  hideHeroPickPanel() {
    this.heroPickPanel.classList.add("hidden");
    this.heroPickInput.value = "";
    this.heroPickMatch.textContent = "输入角色名或编号，下方显示对弈编号";
    this.heroPickPanelKey = "";
  }

  resetHeroPickInputForStep(snap, game) {
    this.heroPickInput.value = "";
    const context = game.getPickInputContext();
    this.heroPickMatch.textContent = context.emptyHint;
  }

  updateHeroPickPreview() {
    const game = this.getActiveHeroPickGame();
    if (!game || game.phase !== "pick") {
      return;
    }
    this.heroPickMatch.textContent = game.getPickPreviewText(
      this.heroPickInput.value
    );
  }

  submitHeroPick() {
    const game = this.getActiveHeroPickGame();
    if (!game) {
      this.heroPickMatch.textContent = "当前模式无法选球";
      return;
    }
    if (!game.canPlayerPickNow()) {
      if (game.phase === "pick" && game.pickStep === 2 && !game.isTwoPlayer()) {
        this.heroPickMatch.textContent =
          "训练场蓝队由 AI 自动选球，请使用「双人模式」让蓝队手动输入";
      } else {
        this.heroPickMatch.textContent = "当前不可选球，请等待回合切换";
      }
      return;
    }

    const result = game.tryPickByInput(this.heroPickInput.value);
    this.heroPickMatch.textContent = result.message;
    if (result.ok) {
      this.heroPickInput.value = "";
    }
  }

  syncHeroPickPanel(snap) {
    if (snap.phase !== "pick") {
      this.hideHeroPickPanel();
      return;
    }

    const canPick =
      snap.pickStep === 1 ||
      (snap.pickStep === 2 && snap.subMode === "versus");
    if (!canPick) {
      this.hideHeroPickPanel();
      return;
    }

    const game = this.getActiveHeroPickGame();
    if (!game) {
      return;
    }

    const panelKey = `${snap.phase}:${snap.pickStep}:${snap.subMode}:${snap.p1HeroId || ""}`;
    if (this.heroPickPanelKey !== panelKey) {
      this.heroPickPanelKey = panelKey;
      this.resetHeroPickInputForStep(snap, game);
    }

    this.showHeroPickPanel(snap, game);
  }

  bindSelfDefinitionGame() {
    this.selfDefinition.onPhaseChange = (snap) => this.updateSelfDefHud(snap);

    this.selfDefinition.onGameOver = (winnerId) => {
      const msg =
        this.selfDefinition.subMode === "training"
          ? winnerId === 1
            ? "自定义模式训练场胜利！"
            : "自定义模式训练场失败，再试一次！"
          : winnerId === 1
            ? "红队（玩家1）获胜！"
            : "蓝队（玩家2）获胜！";
      this.finishMatchWithCoins(msg, winnerId === 1);
    };
  }

  bindLittleBallHeroGame() {
    this.littleBallHero.onPhaseChange = (snap) => this.updateHeroHud(snap);

    this.littleBallHero.onGameOver = (winnerId) => {
      const msg =
        this.littleBallHero.subMode === "training"
          ? winnerId === 1
            ? "训练场胜利！"
            : "训练场失败，再试一次！"
          : winnerId === 1
            ? "红队（玩家1）获胜！"
            : "蓝队（玩家2）获胜！";
      this.finishMatchWithCoins(msg, winnerId === 1);
    };
  }

  bindMenuButtons() {
    this.versusBtn.addEventListener("click", () =>
      this.beginDualGame(GameMode.VERSUS)
    );
    this.trainingBtn.addEventListener("click", () =>
      this.beginDualGame(GameMode.TRAINING)
    );
    this.groupBattleBtn.addEventListener("click", () => this.showGroupSetup());
    this.heroModeBtn.addEventListener("click", () => this.showHeroSetup());
    this.westBulldogBtn.addEventListener("click", () => this.beginWestBulldog());
    this.numberTeacherBtn.addEventListener("click", () => this.showNumberTeacherSetup());
    this.selfDefBtn.addEventListener("click", () => this.showSelfDefSetup());
    this.selfDefTrainingBtn.addEventListener("click", () =>
      this.openSelfDefRoom("training")
    );
    this.selfDefVersusBtn.addEventListener("click", () =>
      this.openSelfDefRoom("versus")
    );
    this.selfDefSetupBack.addEventListener("click", () => this.showMainMenu());
    this.selfDefRoomBack.addEventListener("click", () => this.showSelfDefSetup());
    this.ntTrainingBtn.addEventListener("click", () =>
      this.beginNumberTeacher("training")
    );
    this.ntVersusBtn.addEventListener("click", () =>
      this.beginNumberTeacher("versus")
    );
    this.ntSetupBack.addEventListener("click", () => this.showMainMenu());
    this.group1pBtn.addEventListener("click", () => this.beginGroupBattle(1));
    this.group2pBtn.addEventListener("click", () => this.beginGroupBattle(2));
    this.groupSetupBack.addEventListener("click", () => this.showMainMenu());
    this.heroTrainingBtn.addEventListener("click", () =>
      this.beginLittleBallHero("training")
    );
    this.heroVersusBtn.addEventListener("click", () =>
      this.beginLittleBallHero("versus")
    );
    this.heroSetupBack.addEventListener("click", () => this.showMainMenu());
  }

  getWinnerMessage(winnerId) {
    if (this.currentMode === GameMode.TRAINING) {
      return winnerId === 1 ? "你赢了！击败了 AI 机器人" : "AI 机器人获胜，再试一次！";
    }
    return winnerId === 1 ? "玩家1（红球）获胜！" : "玩家2（蓝球）获胜！";
  }

  hideAllOverlays() {
    this.overlay.classList.add("hidden");
    this.groupSetupOverlay.classList.add("hidden");
    this.cardOverlay.classList.add("hidden");
    this.heroSetupOverlay.classList.add("hidden");
    this.numberTeacherSetup.classList.add("hidden");
    this.selfDefSetup.classList.add("hidden");
    this.selfDefRoom.classList.add("hidden");
    this.shopOverlay.classList.add("hidden");
  }

  updateCoinHud() {
    this.coinHud.textContent = `金币：${this.economy.wallet.getCoins()}`;
  }

  finishMatchWithCoins(message, playerWon) {
    const reward = this.economy.awardMatchCoins(playerWon);
    this.updateCoinHud();
    this.showMainOverlay(message, reward);
  }

  /**
   * 停止其他模式的渲染循环，避免共用画布时互相覆盖
   */
  stopInactiveGameLoops(activeGame) {
    const allGames = [
      this.game,
      this.groupBattle,
      this.littleBallHero,
      this.westBulldog,
      this.numberTeacher,
      this.selfDefinition,
    ];

    for (const game of allGames) {
      if (game === activeGame || game.state !== "playing") {
        continue;
      }
      game.state = "idle";
      if (game.animationId !== null) {
        cancelAnimationFrame(game.animationId);
        game.animationId = null;
      }
    }
  }

  showNumberTeacherSetup() {
    this.hideAllOverlays();
    this.numberTeacherSetup.classList.remove("hidden");
  }

  showSelfDefSetup() {
    this.hideAllOverlays();
    this.selfDefSetup.classList.remove("hidden");
  }

  openSelfDefRoom(subMode) {
    this.pendingSelfDefSubMode = subMode;
    this.selfDefRoomPanel.reset();
    this.hideAllOverlays();
    this.selfDefRoom.classList.remove("hidden");
  }

  beginSelfDefinition(subMode, templates) {
    this.currentMode = GameMode.SELF_DEFINITION;
    this.stopInactiveGameLoops(this.selfDefinition);
    this.hideAllOverlays();
    this.hud.classList.remove("hidden");
    this.groupHud.classList.add("hidden");
    this.westHud.classList.add("hidden");
    this.numberTeacherHud.classList.add("hidden");
    this.heroHud.classList.remove("hidden");
    this.p2Bar.classList.remove("hidden-bar");
    this.modeBadge.classList.remove("hidden");
    this.modeBadge.textContent = "自定义模式";

    this.p1HudLabel.textContent = "红队";
    this.p2Label.textContent = subMode === "training" ? "AI" : "蓝队";

    this.selfDefinition.startWithCustomRoster(subMode, templates);
    this.trackSelfDefHealth();
  }

  updateSelfDefHud(snap) {
    if (snap.phase === "pick") {
      const sec = Math.ceil(snap.pickRemainingMs / 1000);
      if (snap.pickStep === 1) {
        this.heroPhaseText.textContent = `红队选球 · 剩余 ${sec} 秒 · 在下方输入栏选球`;
      } else {
        this.heroPhaseText.textContent =
          snap.subMode === "training"
            ? "AI 选球中…"
            : `蓝队选球 · 剩余 ${sec} 秒 · 在下方输入栏选球`;
      }
      this.heroP1Info.textContent = snap.p1HeroId
        ? `红队 · ${this.selfDefinition.getHeroById(snap.p1HeroId).name}`
        : "红队 · 待选";
      this.heroP2Info.textContent = snap.p2HeroId
        ? `蓝队 · ${this.selfDefinition.getHeroById(snap.p2HeroId).name}`
        : "蓝队 · 待选";
      this.syncHeroPickPanel(snap);
      return;
    }

    this.hideHeroPickPanel();

    const p1 = snap.fighters.find((f) => f.playerId === 1);
    const p2 = snap.fighters.find((f) => f.playerId === 2);
    if (p1) {
      this.heroP1Info.textContent = `红队 · ${p1.name} HP ${Math.ceil(p1.health)} · ${p1.skillName}`;
    }
    if (p2) {
      this.heroP2Info.textContent = `蓝队 · ${p2.name} HP ${Math.ceil(p2.health)} · ${p2.skillName}`;
    }

    if (snap.phase === "battle") {
      this.heroPhaseText.textContent = "自定义模式 · 自动对战中";
    }
  }

  trackSelfDefHealth() {
    const tick = () => {
      if (this.selfDefinition.state === "playing") {
        this.hpP1.style.width = `${this.selfDefinition.getHealthPercent(1)}%`;
        this.hpP2.style.width = `${this.selfDefinition.getHealthPercent(2)}%`;
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  beginNumberTeacher(subMode) {
    this.currentMode = GameMode.NUMBER_TEACHER;
    this.stopInactiveGameLoops(this.numberTeacher);
    this.hideAllOverlays();
    this.hud.classList.remove("hidden");
    this.groupHud.classList.add("hidden");
    this.heroHud.classList.add("hidden");
    this.westHud.classList.add("hidden");
    this.numberTeacherHud.classList.remove("hidden");
    this.p2Bar.classList.remove("hidden-bar");
    this.modeBadge.classList.remove("hidden");
    this.modeBadge.textContent = "数字老师";

    this.p1HudLabel.textContent = "红队";
    this.p2Label.textContent = subMode === "training" ? "AI" : "蓝队";
    this.ntHitMsg.textContent = "";

    this.numberTeacher.start(subMode);
    this.trackNumberTeacherHealth();
  }

  trackNumberTeacherHealth() {
    const tick = () => {
      if (this.numberTeacher.state === "playing") {
        this.hpP1.style.width = `${this.numberTeacher.getHealthPercent(1)}%`;
        this.hpP2.style.width = `${this.numberTeacher.getHealthPercent(2)}%`;
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  showHeroSetup() {
    this.hideAllOverlays();
    this.heroSetupOverlay.classList.remove("hidden");
  }

  beginWestBulldog() {
    this.currentMode = GameMode.WEST_BULLDOG;
    this.stopInactiveGameLoops(this.westBulldog);
    this.hideAllOverlays();
    this.hud.classList.remove("hidden");
    this.groupHud.classList.add("hidden");
    this.heroHud.classList.add("hidden");
    this.westHud.classList.remove("hidden");
    this.numberTeacherHud.classList.add("hidden");
    this.p2Bar.classList.remove("hidden-bar");
    this.modeBadge.classList.remove("hidden");
    this.modeBadge.textContent = "西部斗牛球";

    this.p1HudLabel.textContent = "西部斗牛球";
    this.p2Label.textContent = "敌人";
    this.westHitMsg.textContent = "";

    this.westBulldog.start();
    this.trackWestHealth();
  }

  trackWestHealth() {
    const tick = () => {
      if (this.westBulldog.state === "playing") {
        this.hpP1.style.width = `${this.westBulldog.getPlayerHealthPercent()}%`;
        this.hpP2.style.width = `${this.westBulldog.getEnemyHealthPercent()}%`;
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  beginLittleBallHero(subMode) {
    this.currentMode = GameMode.LITTLE_BALL_HERO;
    this.stopInactiveGameLoops(this.littleBallHero);
    this.hideAllOverlays();
    this.hud.classList.remove("hidden");
    this.groupHud.classList.add("hidden");
    this.westHud.classList.add("hidden");
    this.numberTeacherHud.classList.add("hidden");
    this.heroHud.classList.remove("hidden");
    this.p2Bar.classList.remove("hidden-bar");
    this.modeBadge.classList.remove("hidden");
    this.modeBadge.textContent = "小球英雄";

    this.p1HudLabel.textContent = "红队";
    this.p2Label.textContent = subMode === "training" ? "AI" : "蓝队";

    this.littleBallHero.start(subMode);
    this.trackHeroHealth();
  }

  updateHeroHud(snap) {
    if (snap.phase === "pick") {
      const sec = Math.ceil(snap.pickRemainingMs / 1000);
      if (snap.pickStep === 1) {
        this.heroPhaseText.textContent = `红队选球 · 剩余 ${sec} 秒 · 在下方输入栏选球`;
      } else {
        this.heroPhaseText.textContent =
          snap.subMode === "training"
            ? "AI 选球中…"
            : `蓝队选球 · 剩余 ${sec} 秒 · 在下方输入栏选球`;
      }
      this.heroP1Info.textContent = snap.p1HeroId
        ? `红队 · ${HeroRoster.getById(snap.p1HeroId).name}`
        : "红队 · 待选";
      this.heroP2Info.textContent = snap.p2HeroId
        ? `蓝队 · ${HeroRoster.getById(snap.p2HeroId).name}`
        : "蓝队 · 待选";
      this.syncHeroPickPanel(snap);
      return;
    }

    this.hideHeroPickPanel();

    const p1 = snap.fighters.find((f) => f.playerId === 1);
    const p2 = snap.fighters.find((f) => f.playerId === 2);
    if (p1) {
      this.heroP1Info.textContent = `红队 · ${p1.name} HP ${Math.ceil(p1.health)} · ${p1.skillName}`;
    }
    if (p2) {
      this.heroP2Info.textContent = `蓝队 · ${p2.name} HP ${Math.ceil(p2.health)} · ${p2.skillName}`;
    }

    if (snap.phase === "battle") {
      this.heroPhaseText.textContent = "自动对战中 · 双球持续反弹";
    }
  }

  trackHeroHealth() {
    const tick = () => {
      if (this.littleBallHero.state === "playing") {
        this.hpP1.style.width = `${this.littleBallHero.getHealthPercent(1)}%`;
        this.hpP2.style.width = `${this.littleBallHero.getHealthPercent(2)}%`;
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  showMainMenu() {
    this.hideHeroPickPanel();
    this.hideAllOverlays();
    this.matchCoinReward.classList.add("hidden");
    this.overlay.classList.remove("hidden");
    this.updateCoinHud();
    this.hud.classList.add("hidden");
    this.groupHud.classList.add("hidden");
    this.heroHud.classList.add("hidden");
    this.westHud.classList.add("hidden");
    this.numberTeacherHud.classList.add("hidden");
    this.modeBadge.classList.add("hidden");
    this.overlay.querySelector("h1").textContent = "双球对战";
    this.rulesVersus.classList.remove("hidden");
    this.rulesTraining.classList.add("hidden");
    this.rulesGroup.classList.add("hidden");
    this.versusBtn.textContent = "双人对战";
    this.trainingBtn.textContent = "训练模式";
    this.groupBattleBtn.textContent = "组团战斗";
    this.heroModeBtn.textContent = "小球英雄";
    this.westBulldogBtn.textContent = "西部斗牛球";
    this.numberTeacherBtn.textContent = "数字老师";
    this.selfDefBtn.textContent = "自定义模式";
    this.shopBtn.textContent = "商店";
  }

  showGroupSetup() {
    this.hideAllOverlays();
    this.groupSetupOverlay.classList.remove("hidden");
    this.rulesGroup.classList.remove("hidden");
  }

  beginDualGame(mode) {
    this.currentMode = mode;
    const isTraining = mode === GameMode.TRAINING;

    this.stopInactiveGameLoops(this.game);
    this.hideHeroPickPanel();
    this.hideAllOverlays();
    this.hud.classList.remove("hidden");
    this.groupHud.classList.add("hidden");
    this.heroHud.classList.add("hidden");
    this.westHud.classList.add("hidden");
    this.numberTeacherHud.classList.add("hidden");
    this.p2Bar.classList.remove("hidden-bar");
    this.modeBadge.classList.toggle("hidden", !isTraining);
    this.modeBadge.textContent = "训练模式";

    this.p1HudLabel.textContent = isTraining ? "你" : "玩家1";
    this.p2Label.textContent = isTraining ? "AI 机器人" : "玩家2";

    this.game.start(mode);
    this.trackDualHealth();
  }

  beginGroupBattle(playerCount) {
    this.currentMode = GameMode.GROUP_BATTLE;
    this.stopInactiveGameLoops(this.groupBattle);
    this.hideHeroPickPanel();
    this.hideAllOverlays();
    this.hud.classList.remove("hidden");
    this.heroHud.classList.add("hidden");
    this.westHud.classList.add("hidden");
    this.numberTeacherHud.classList.add("hidden");
    this.groupHud.classList.remove("hidden");
    this.modeBadge.classList.remove("hidden");
    this.modeBadge.textContent = "组团战斗";

    this.p1HudLabel.textContent = "玩家1";
    this.p2Label.textContent = "玩家2";
    this.p2Bar.classList.toggle("hidden-bar", playerCount === 1);
    this.gbP2Block.classList.toggle("hidden", playerCount === 1);

    this.groupBattle.start(playerCount);
    this.trackGroupHealth();
  }

  updateGroupHud(snap) {
    this.gbLevel.textContent = `第 ${snap.level} 关`;
    this.gbBoss.textContent = `Boss ${snap.bossesDefeated}/${snap.bossTotal}`;
    this.gbP1Xp.textContent = `Lv.${snap.p1Level} · XP ${snap.p1Xp}`;
    if (snap.playerCount === 2) {
      this.gbP2Xp.textContent = `Lv.${snap.p2Level} · XP ${snap.p2Xp}`;
    }
    this.gbPhase.textContent =
      snap.phase === "boss" ? "Boss 战中！" : `剩余怪物 ${snap.monstersLeft}`;
  }

  trackDualHealth() {
    const tick = () => {
      if (this.game.state === "playing") {
        this.hpP1.style.width = `${this.game.getHealthPercent(1)}%`;
        this.hpP2.style.width = `${this.game.getHealthPercent(2)}%`;
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  trackGroupHealth() {
    const tick = () => {
      if (this.groupBattle.state === "playing") {
        const snap = this.groupBattle.getHudSnapshot();
        this.hpP1.style.width = `${snap.p1Hp}%`;
        if (snap.playerCount === 2) {
          this.hpP2.style.width = `${snap.p2Hp}%`;
        }
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  showCardDraw(cards, snap) {
    this.cardOverlay.classList.remove("hidden");
    this.cardLevelHint.textContent = `第 ${snap.level} 关完成 · 已击败 Boss ${snap.bossesDefeated}/${snap.bossTotal}`;
    this.cardChoicesEl.innerHTML = "";

    for (const card of cards) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card-btn";
      btn.innerHTML = `<h3>${card.name}</h3><p>${card.description}</p>`;
      btn.addEventListener("click", () => {
        this.cardOverlay.classList.add("hidden");
        this.groupBattle.applyCardToParty(card);
        if (this.groupBattle.state === "playing") {
          this.trackGroupHealth();
        }
      });
      this.cardChoicesEl.appendChild(btn);
    }
  }

  showMainOverlay(message, coinReward) {
    this.hideHeroPickPanel();
    this.hideAllOverlays();
    this.overlay.classList.remove("hidden");
    this.updateCoinHud();
    this.hud.classList.add("hidden");
    this.groupHud.classList.add("hidden");
    this.heroHud.classList.add("hidden");
    this.westHud.classList.add("hidden");
    this.numberTeacherHud.classList.add("hidden");
    this.modeBadge.classList.add("hidden");
    this.overlay.querySelector("h1").textContent = message;
    if (coinReward && coinReward.earned > 0) {
      this.matchCoinReward.textContent = `+${coinReward.earned} 金币（本局价值 ${coinReward.matchValue}，获得 50%）`;
      this.matchCoinReward.classList.remove("hidden");
    } else {
      this.matchCoinReward.classList.add("hidden");
    }
    this.rulesVersus.classList.remove("hidden");
    this.rulesTraining.classList.add("hidden");
    this.rulesGroup.classList.add("hidden");
    this.versusBtn.textContent = "双人对战";
    this.trainingBtn.textContent = "训练模式";
    this.groupBattleBtn.textContent = "组团战斗";
    this.heroModeBtn.textContent = "小球英雄";
    this.westBulldogBtn.textContent = "西部斗牛球";
    this.numberTeacherBtn.textContent = "数字老师";
    this.selfDefBtn.textContent = "自定义模式";
    this.shopBtn.textContent = "商店";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new GameUI();
});
