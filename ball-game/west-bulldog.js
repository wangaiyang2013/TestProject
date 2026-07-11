/**
 * 西部斗牛球模式 - 鼠标移动，点击朝鼠标瞄准射击，距离越远伤害越低
 */

const WestBulldogConstants = {
  MAX_HEALTH: BallHealthResolver.getDefaultMaxHealth(),
  ENEMY_HEALTH: BallHealthResolver.getDefaultMaxHealth(),
  BALL_RADIUS_RATIO: 0.04,
  MOVE_SPEED: 5.5,
  BULLET_SPEED: 16,
  BULLET_RADIUS_RATIO: 0.012,
  ATTACK_INTERVAL_MS: 100,
  MAX_SHOOT_RANGE: 420,
  ENEMY_COUNT: 3,
  MAX_DAMAGE: 28,
  MIN_DAMAGE: 6,
  BULLET_LIFETIME_MS: 1400,
  ENEMY_MOVE_SPEED: 3.2,
  ENEMY_CONTACT_DAMAGE: 8,
  CONTACT_COOLDOWN_MS: 700,
  ARENA_PADDING_RATIO: 0.08,
  PLAYER_COLOR: "#c68642",
  PLAYER_GLOW: "#e9b872",
  HANDGUN_COLOR: "#4a3728",
  BULLET_COLOR: "#ffd43b",
  ENEMY_COLOR: "#495057",
  ENEMY_GLOW: "#868e96",
  BACKGROUND_TINT: "#2d2419",
};

/**
 * 斗牛犬手枪子弹
 */
class BulldogBullet {
  constructor(x, y, dirX, dirY, radius, damage) {
    this.x = x;
    this.y = y;
    this.dirX = dirX;
    this.dirY = dirY;
    this.radius = radius;
    this.baseDamage = damage;
    this.travelDistance = 0;
    this.alive = true;
    this.spawnTime = Date.now();
  }

  update() {
    const step = WestBulldogConstants.BULLET_SPEED;
    this.x += this.dirX * step;
    this.y += this.dirY * step;
    this.travelDistance += step;

    if (Date.now() - this.spawnTime > WestBulldogConstants.BULLET_LIFETIME_MS) {
      this.alive = false;
    }
  }

  getDamageAtImpact() {
    const range = WestBulldogConstants.MAX_SHOOT_RANGE;
    const ratio = Math.min(1, this.travelDistance / range);
    const maxDmg = WestBulldogConstants.MAX_DAMAGE;
    const minDmg = WestBulldogConstants.MIN_DAMAGE;
    return Math.round(maxDmg - (maxDmg - minDmg) * ratio);
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
    ctx.fillStyle = WestBulldogConstants.BULLET_COLOR;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

/**
 * 西部斗牛球（玩家）
 */
class WestBulldogBall {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.health = WestBulldogConstants.MAX_HEALTH;
    this.aimAngle = 0;
    this.lastShootTime = 0;
    this.invincibleUntil = 0;
  }

  moveToward(targetX, targetY, arena) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) {
      return;
    }
    const speed = WestBulldogConstants.MOVE_SPEED;
    const step = Math.min(speed, dist);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    arena.clampBall(this);
  }

  updateAim(mouseX, mouseY) {
    this.aimAngle = Math.atan2(mouseY - this.y, mouseX - this.x);
  }

  aimAt(targetX, targetY) {
    this.aimAngle = Math.atan2(targetY - this.y, targetX - this.x);
  }

  canShoot() {
    return Date.now() - this.lastShootTime >= WestBulldogConstants.ATTACK_INTERVAL_MS;
  }

  shoot(bulletRadius) {
    this.lastShootTime = Date.now();
    const dirX = Math.cos(this.aimAngle);
    const dirY = Math.sin(this.aimAngle);
    const offset = this.radius + bulletRadius + 6;
    const damage = WestBulldogConstants.MAX_DAMAGE;
    return new BulldogBullet(
      this.x + dirX * offset,
      this.y + dirY * offset,
      dirX,
      dirY,
      bulletRadius,
      damage
    );
  }

  takeDamage(amount) {
    if (Date.now() < this.invincibleUntil) {
      return false;
    }
    this.health = Math.max(0, this.health - amount);
    this.invincibleUntil = Date.now() + 400;
    return true;
  }

  isAlive() {
    return this.health > 0;
  }

  drawHandgun(ctx) {
    const barrelLen = this.radius + 14;
    const hx = this.x + Math.cos(this.aimAngle) * (this.radius * 0.5);
    const hy = this.y + Math.sin(this.aimAngle) * (this.radius * 0.5);
    const ex = hx + Math.cos(this.aimAngle) * barrelLen;
    const ey = hy + Math.sin(this.aimAngle) * barrelLen;

    ctx.strokeStyle = WestBulldogConstants.HANDGUN_COLOR;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.fillStyle = WestBulldogConstants.HANDGUN_COLOR;
    ctx.beginPath();
    ctx.arc(hx, hy, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
    ctx.fillStyle = WestBulldogConstants.PLAYER_GLOW;
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = WestBulldogConstants.PLAYER_COLOR;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();

    this.drawHandgun(ctx);

    ctx.fillStyle = "#3d2914";
    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("斗牛", this.x - 6, this.y - 4);
    ctx.fillText("犬", this.x + 6, this.y + 6);
    ctx.textAlign = "left";
  }
}

/**
 * 敌方球体
 */
class BulldogEnemyBall {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.health = WestBulldogConstants.ENEMY_HEALTH;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.painFlashUntil = 0;
    this.lastContactDamage = 0;
    this.wanderAngle = Math.random() * Math.PI * 2;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.painFlashUntil = Date.now() + 350;
  }

  isAlive() {
    return this.health > 0;
  }

  isInPain() {
    return Date.now() < this.painFlashUntil;
  }

  update(player, arena) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 120) {
      this.wanderAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.8;
    } else {
      this.wanderAngle += (Math.random() - 0.5) * 0.4;
    }

    const speed = WestBulldogConstants.ENEMY_MOVE_SPEED;
    this.x += Math.cos(this.wanderAngle) * speed;
    this.y += Math.sin(this.wanderAngle) * speed;
    arena.clampBall(this);

    if (dist < this.radius + player.radius + 4) {
      const now = Date.now();
      if (now - this.lastContactDamage >= WestBulldogConstants.CONTACT_COOLDOWN_MS) {
        player.takeDamage(WestBulldogConstants.ENEMY_CONTACT_DAMAGE);
        this.lastContactDamage = now;
      }
    }
  }

  draw(ctx) {
    if (this.isInPain()) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 12, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 107, 107, 0.7)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
    ctx.fillStyle = WestBulldogConstants.ENEMY_GLOW;
    ctx.globalAlpha = 0.3;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.isInPain() ? "#ff6b6b" : WestBulldogConstants.ENEMY_COLOR;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (this.isInPain()) {
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("痛!", this.x, this.y - this.radius - 10);
      ctx.textAlign = "left";
    }
  }
}

/**
 * 查找距离玩家最近的存活敌人
 */
class NearestEnemyFinder {
  static find(player, enemies) {
    let nearest = null;
    let minDist = Infinity;

    for (const enemy of enemies) {
      if (!enemy.isAlive()) {
        continue;
      }
      const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = enemy;
      }
    }

    if (!nearest || minDist > WestBulldogConstants.MAX_SHOOT_RANGE) {
      return null;
    }

    return { enemy: nearest, distance: minDist };
  }
}

/**
 * 鼠标输入
 */
class MouseInput {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = 0;
    this.y = 0;
    this.clicked = false;
    this.inside = false;

    canvas.addEventListener("mousemove", (e) => this.onMove(e));
    canvas.addEventListener("mousedown", (e) => this.onDown(e));
    canvas.addEventListener("mouseenter", () => {
      this.inside = true;
    });
    canvas.addEventListener("mouseleave", () => {
      this.inside = false;
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  updateFromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.x = event.clientX - rect.left;
    this.y = event.clientY - rect.top;
  }

  onMove(event) {
    this.updateFromEvent(event);
  }

  onDown(event) {
    if (event.button === 0) {
      this.updateFromEvent(event);
      this.clicked = true;
    }
  }

  consumeClick() {
    const was = this.clicked;
    this.clicked = false;
    return was;
  }
}

/**
 * 西部斗牛球主游戏
 */
class WestBulldogGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.mouse = new MouseInput(canvas);
    this.state = "idle";
    this.player = null;
    this.enemies = [];
    this.bullets = [];
    this.arena = null;
    this.width = 0;
    this.height = 0;
    this.lastHitMessage = "";
    this.hitMessageUntil = 0;
    this.animationId = null;
    this.onHudUpdate = null;
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

    const padX = this.width * WestBulldogConstants.ARENA_PADDING_RATIO;
    const padY = this.height * WestBulldogConstants.ARENA_PADDING_RATIO;
    this.arena = new ArenaBounds(
      padX,
      padY + 48,
      this.width - padX,
      this.height - padY
    );

    const r = this.getBallRadius();
    if (this.player) {
      this.player.radius = r;
      this.arena.clampBall(this.player);
    }
    for (const enemy of this.enemies) {
      enemy.radius = r;
      this.arena.clampBall(enemy);
    }
  }

  getBallRadius() {
    return Math.max(20, this.height * WestBulldogConstants.BALL_RADIUS_RATIO);
  }

  getBulletRadius() {
    return Math.max(5, this.height * WestBulldogConstants.BULLET_RADIUS_RATIO);
  }

  start() {
    this.state = "playing";
    this.bullets = [];
    if (typeof GameSessionControls !== "undefined") {
      GameSessionControls.prepareGame(this);
    } else {
      this.isPaused = false;
    }
    const r = this.getBallRadius();
    const cy = (this.arena.top + this.arena.bottom) / 2;

    this.player = new WestBulldogBall(
      this.arena.left + this.width * 0.25,
      cy,
      r
    );
    this.enemies = [];
    const spawnSlots = [
      { x: 0.72, y: 0.35 },
      { x: 0.78, y: 0.55 },
      { x: 0.65, y: 0.72 },
    ];
    const count = Math.min(
      WestBulldogConstants.ENEMY_COUNT,
      spawnSlots.length
    );

    for (let i = 0; i < count; i += 1) {
      const slot = spawnSlots[i];
      this.enemies.push(
        new BulldogEnemyBall(
          this.arena.left + (this.arena.right - this.arena.left) * slot.x,
          this.arena.top + (this.arena.bottom - this.arena.top) * slot.y,
          r
        )
      );
    }

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.loop();
    this.notifyHud();
  }

  notifyHud() {
    if (typeof this.onHudUpdate === "function") {
      this.onHudUpdate({
        playerHp: this.player ? this.player.health : 0,
        enemyHp: this.getTotalEnemyHealth(),
        enemyCount: this.getAliveEnemyCount(),
        lastHit: this.lastHitMessage,
      });
    }
  }

  getAliveEnemyCount() {
    return this.enemies.filter((e) => e.isAlive()).length;
  }

  getTotalEnemyHealth() {
    return this.enemies.reduce((sum, e) => sum + (e.isAlive() ? e.health : 0), 0);
  }

  getMaxTotalEnemyHealth() {
    return WestBulldogConstants.ENEMY_HEALTH * this.enemies.length;
  }

  fireBullet() {
    if (!this.player.canShoot()) {
      return false;
    }
    const bullet = this.player.shoot(this.getBulletRadius());
    this.bullets.push(bullet);
    return true;
  }

  tryManualShoot() {
    if (!this.mouse.consumeClick()) {
      return;
    }
    const result = NearestEnemyFinder.find(this.player, this.enemies);
    if (result) {
      this.player.aimAt(result.enemy.x, result.enemy.y);
    } else if (this.mouse.inside) {
      this.player.updateAim(this.mouse.x, this.mouse.y);
    }
    this.fireBullet();
  }

  updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.bullets[i];
      bullet.update();

      if (!bullet.alive || bullet.isOutOfBounds(this.arena)) {
        this.bullets.splice(i, 1);
        continue;
      }

      for (const enemy of this.enemies) {
        if (!enemy.isAlive()) {
          continue;
        }
        if (
          CollisionDetector.circleHitsCircle(
            bullet.x,
            bullet.y,
            bullet.radius,
            enemy.x,
            enemy.y,
            enemy.radius
          )
        ) {
          const damage = bullet.getDamageAtImpact();
          enemy.takeDamage(damage);
          this.lastHitMessage = `命中最近敌人！${damage} 伤害（越远越低）`;
          this.hitMessageUntil = Date.now() + 800;
          bullet.alive = false;
          this.bullets.splice(i, 1);
          this.notifyHud();
          break;
        }
      }
    }

    if (this.getAliveEnemyCount() === 0) {
      this.endGame(true);
    }
  }

  update() {
    if (this.state !== "playing") {
      return;
    }

    if (this.mouse.inside) {
      this.player.moveToward(this.mouse.x, this.mouse.y, this.arena);
    }

    const nearest = NearestEnemyFinder.find(this.player, this.enemies);
    if (nearest) {
      this.player.aimAt(nearest.enemy.x, nearest.enemy.y);
      this.fireBullet();
    } else if (this.mouse.inside) {
      this.player.updateAim(this.mouse.x, this.mouse.y);
    }

    this.tryManualShoot();

    for (const enemy of this.enemies) {
      if (enemy.isAlive()) {
        enemy.update(this.player, this.arena);
      }
    }

    this.updateBullets();

    if (!this.player.isAlive()) {
      this.endGame(false);
    }

    this.notifyHud();
  }

  endGame(playerWon) {
    this.state = "gameover";
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (typeof this.onGameOver === "function") {
      this.onGameOver(playerWon);
    }
  }

  drawAimLine() {
    const maxLen = WestBulldogConstants.MAX_SHOOT_RANGE;
    const ex = this.player.x + Math.cos(this.player.aimAngle) * maxLen;
    const ey = this.player.y + Math.sin(this.player.aimAngle) * maxLen;
    const nearest = NearestEnemyFinder.find(this.player, this.enemies);

    const ctx = this.ctx;
    ctx.strokeStyle = nearest
      ? "rgba(255, 107, 107, 0.45)"
      : "rgba(255, 212, 59, 0.25)";
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.player.x, this.player.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);

    if (nearest) {
      ctx.fillStyle = "rgba(255, 107, 107, 0.75)";
      ctx.beginPath();
      ctx.arc(nearest.enemy.x, nearest.enemy.y, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.mouse.inside) {
      ctx.fillStyle = "rgba(255, 212, 59, 0.6)";
      ctx.beginPath();
      ctx.arc(this.mouse.x, this.mouse.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  drawBackground() {
    this.ctx.fillStyle = WestBulldogConstants.BACKGROUND_TINT;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = "#3d2f1f";
    const w = this.arena.right - this.arena.left;
    const h = this.arena.bottom - this.arena.top;
    this.ctx.fillRect(this.arena.left, this.arena.top, w, h);
    this.ctx.strokeStyle = "#c68642";
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(this.arena.left, this.arena.top, w, h);

    this.ctx.fillStyle = "rgba(198, 134, 66, 0.35)";
    this.ctx.font = "14px system-ui, sans-serif";
    this.ctx.fillText("西部斗牛球 · 斗牛犬手枪", 12, 28);
  }

  draw() {
    this.drawBackground();

    for (const enemy of this.enemies) {
      if (enemy.isAlive()) {
        enemy.draw(this.ctx);
      }
    }
    if (this.player.isAlive()) {
      this.player.draw(this.ctx);
      this.drawAimLine();
    }

    for (const bullet of this.bullets) {
      bullet.draw(this.ctx);
    }

    if (Date.now() < this.hitMessageUntil) {
      this.ctx.fillStyle = "#ffd43b";
      this.ctx.font = "13px system-ui, sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.fillText(this.lastHitMessage, this.width / 2, this.arena.bottom + 26);
      this.ctx.textAlign = "left";
    } else {
      this.ctx.fillStyle = "#aaa";
      this.ctx.font = "12px system-ui, sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        "鼠标移动 · 最近敌人自动射击（0.1秒/发）· 远距伤害更低",
        this.width / 2,
        this.arena.bottom + 26
      );
      this.ctx.textAlign = "left";
    }
  }

  loop() {
    if (
      typeof GameSessionControls === "undefined" ||
      !GameSessionControls.shouldSkipUpdate(this)
    ) {
      this.update();
    }
    this.draw();

    if (this.state === "playing") {
      this.animationId = requestAnimationFrame(() => this.loop());
    }
  }

  getPlayerHealthPercent() {
    if (!this.player) {
      return 100;
    }
    return (this.player.health / WestBulldogConstants.MAX_HEALTH) * 100;
  }

  getEnemyHealthPercent() {
    const maxTotal = this.getMaxTotalEnemyHealth();
    if (maxTotal <= 0) {
      return 0;
    }
    return (this.getTotalEnemyHealth() / maxTotal) * 100;
  }
}
