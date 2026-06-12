/**
 * 数字老师游戏 - 头顶数字自动追踪敌人，命中造成等于数字的伤害，数字可无限增长
 */

const NumberTeacherConstants = {
  MAX_HEALTH: BallHealthResolver.resolve(300),
  START_NUMBER: 1,
  BALL_MASS: 1.0,
  BALL_RADIUS_RATIO: 0.038,
  MOVE_SPEED: 9,
  NUMBER_SPAWN_INTERVAL_MS: 700,
  NUMBER_PROJECTILE_SPEED: 6.5,
  NUMBER_HOMING_STRENGTH: 0.12,
  MAX_PROJECTILES_PER_PLAYER: 3,
  PROJECTILE_RADIUS: 18,
  PLAYER1_COLOR: "#4c6ef5",
  PLAYER1_GLOW: "#748ffc",
  PLAYER2_COLOR: "#f03e3e",
  PLAYER2_GLOW: "#ff8787",
  NUMBER_COLOR: "#ffd43b",
};

/**
 * 追踪敌人的数字弹（显示数字本身，命中伤害=数字值）
 */
class NumberHomingProjectile {
  constructor(x, y, numberValue, ownerId, target) {
    this.x = x;
    this.y = y;
    this.numberValue = numberValue;
    this.ownerId = ownerId;
    this.target = target;
    this.alive = true;
    this.radius = NumberTeacherConstants.PROJECTILE_RADIUS;
  }

  update() {
    if (!this.target || !this.target.isAlive()) {
      this.alive = false;
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }

    const speed = NumberTeacherConstants.NUMBER_PROJECTILE_SPEED;
    const homing = NumberTeacherConstants.NUMBER_HOMING_STRENGTH;
    const dirX = dx / dist;
    const dirY = dy / dist;

    this.x += dirX * speed + dirX * homing * dist * 0.05;
    this.y += dirY * speed + dirY * homing * dist * 0.05;
  }

  draw(ctx) {
    const text = String(this.numberValue);
    const fontSize = Math.min(28, 14 + Math.log10(this.numberValue + 1) * 6);

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 212, 59, 0.25)";
    ctx.fill();

    ctx.fillStyle = NumberTeacherConstants.NUMBER_COLOR;
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 3;
    ctx.strokeText(text, this.x, this.y);
    ctx.fillText(text, this.x, this.y);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}

/**
 * 星球外观绘制（径向渐变 + 大气光晕）
 */
class PlanetBallRenderer {
  static draw(ctx, fighter) {
    const { x, y, radius, color, glowColor, playerId } = fighter;
    const highlightX = x - radius * 0.28;
    const highlightY = y - radius * 0.32;

    ctx.save();

    ctx.beginPath();
    ctx.arc(x, y, radius + 14, 0, Math.PI * 2);
    const atmosphere = ctx.createRadialGradient(x, y, radius * 0.6, x, y, radius + 14);
    atmosphere.addColorStop(0, "rgba(255, 255, 255, 0)");
    atmosphere.addColorStop(0.65, glowColor + "55");
    atmosphere.addColorStop(1, glowColor + "00");
    ctx.fillStyle = atmosphere;
    ctx.fill();

    const body = ctx.createRadialGradient(
      highlightX,
      highlightY,
      radius * 0.15,
      x,
      y,
      radius
    );
    body.addColorStop(0, "#ffffff");
    body.addColorStop(0.25, color);
    body.addColorStop(0.75, color);
    body.addColorStop(1, PlanetBallRenderer.darkenColor(color, 0.45));

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (playerId === 2) {
      ctx.beginPath();
      ctx.ellipse(x, y, radius * 1.35, radius * 0.22, -0.35, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = `bold ${Math.max(10, radius * 0.32)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(playerId === 1 ? "红星球" : "蓝星球", x, y + radius + 18);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    ctx.restore();
  }

  static darkenColor(hex, factor) {
    const raw = hex.replace("#", "");
    const r = Math.floor(parseInt(raw.substring(0, 2), 16) * factor);
    const g = Math.floor(parseInt(raw.substring(2, 4), 16) * factor);
    const b = Math.floor(parseInt(raw.substring(4, 6), 16) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

/**
 * 数字老师对战球（星球）
 */
class NumberTeacherFighter {
  constructor(playerId, x, y, radius, color, glowColor, dirX, dirY) {
    this.playerId = playerId;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.glowColor = glowColor;
    this.mass = NumberTeacherConstants.BALL_MASS;
    this.health = NumberTeacherConstants.MAX_HEALTH;
    this.attackNumber = NumberTeacherConstants.START_NUMBER;
    this.vx = dirX * NumberTeacherConstants.MOVE_SPEED;
    this.vy = dirY * NumberTeacherConstants.MOVE_SPEED;
    this.lastSpawnTime = 0;
    this.hitFlashUntil = 0;
  }

  getSpeed() {
    return Math.hypot(this.vx, this.vy);
  }

  getMoveAngle() {
    const speed = this.getSpeed();
    if (speed < 0.001) {
      return 0;
    }
    return Math.atan2(this.vy, this.vx);
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.hitFlashUntil = Date.now() + 300;
  }

  isAlive() {
    return this.health > 0;
  }

  canSpawnNumber(now, activeCount) {
    return (
      now - this.lastSpawnTime >= NumberTeacherConstants.NUMBER_SPAWN_INTERVAL_MS &&
      activeCount < NumberTeacherConstants.MAX_PROJECTILES_PER_PLAYER
    );
  }

  markSpawned(now) {
    this.lastSpawnTime = now;
  }

  onNumberHitSuccess() {
    this.attackNumber += 1;
  }

  draw(ctx) {
    if (Date.now() < this.hitFlashUntil) {
      ctx.globalAlpha = 0.65;
    }

    PlanetBallRenderer.draw(ctx, this);
    this.drawHeadNumber(ctx);

    const barW = this.radius * 2.4;
    const barX = this.x - barW / 2;
    const barY = this.y + this.radius + 10;
    ctx.fillStyle = "#2a2a40";
    ctx.fillRect(barX, barY, barW, 5);
    ctx.fillStyle = this.color;
    ctx.fillRect(
      barX,
      barY,
      barW * (this.health / NumberTeacherConstants.MAX_HEALTH),
      5
    );

    if (Date.now() < this.hitFlashUntil) {
      ctx.globalAlpha = 1;
    }
  }

  drawHeadNumber(ctx) {
    const text = String(this.attackNumber);
    const badgeY = this.y - this.radius - 22;
    const fontSize = Math.min(22, 14 + Math.log10(this.attackNumber + 1) * 5);

    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
    const textW = ctx.measureText(text).width;
    const pad = 8;
    const boxW = textW + pad * 2;
    const boxH = fontSize + pad;

    ctx.fillStyle = "rgba(26, 26, 46, 0.85)";
    ctx.fillRect(
      this.x - boxW / 2,
      badgeY - boxH / 2,
      boxW,
      boxH
    );

    ctx.fillStyle = NumberTeacherConstants.NUMBER_COLOR;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, this.x, badgeY);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}

/**
 * 数字老师主游戏
 */
class NumberTeacherGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.state = "idle";
    this.subMode = "training";
    this.fighters = [];
    this.projectiles = [];
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

    const padX = this.width * GameConstants.ARENA_PADDING_RATIO;
    const padY = this.height * GameConstants.ARENA_PADDING_RATIO;
    this.arena = new ArenaBounds(
      padX,
      padY + 55,
      this.width - padX,
      this.height - padY
    );

    const r = this.getBallRadius();
    for (const fighter of this.fighters) {
      fighter.radius = r;
      this.arena.clampBall(fighter);
    }
  }

  getBallRadius() {
    return Math.max(20, this.height * NumberTeacherConstants.BALL_RADIUS_RATIO);
  }

  isTwoPlayer() {
    return this.subMode === "versus";
  }

  start(subMode) {
    this.resize();
    this.subMode = subMode || "training";
    this.state = "playing";
    this.projectiles = [];
    const r = this.getBallRadius();
    const cy = (this.arena.top + this.arena.bottom) / 2;

    this.fighters = [
      new NumberTeacherFighter(
        1,
        this.arena.left + this.width * 0.28,
        cy,
        r,
        NumberTeacherConstants.PLAYER1_COLOR,
        NumberTeacherConstants.PLAYER1_GLOW,
        1,
        0.15
      ),
      new NumberTeacherFighter(
        2,
        this.arena.right - this.width * 0.28,
        cy,
        r,
        NumberTeacherConstants.PLAYER2_COLOR,
        NumberTeacherConstants.PLAYER2_GLOW,
        -1,
        0.15
      ),
    ];

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.loop();
    this.notifyHud();
  }

  getFighter(playerId) {
    return this.fighters.find((f) => f.playerId === playerId);
  }

  getOpponent(fighter) {
    return this.fighters.find((f) => f.playerId !== fighter.playerId);
  }

  countProjectilesFor(ownerId) {
    return this.projectiles.filter(
      (p) => p.alive && p.ownerId === ownerId
    ).length;
  }

  trySpawnNumbers(now) {
    for (const fighter of this.fighters) {
      if (!fighter.isAlive()) {
        continue;
      }
      const opponent = this.getOpponent(fighter);
      if (!opponent || !opponent.isAlive()) {
        continue;
      }
      const active = this.countProjectilesFor(fighter.playerId);
      if (!fighter.canSpawnNumber(now, active)) {
        continue;
      }

      const spawnX = fighter.x;
      const spawnY = fighter.y - fighter.radius - 8;
      this.projectiles.push(
        new NumberHomingProjectile(
          spawnX,
          spawnY,
          fighter.attackNumber,
          fighter.playerId,
          opponent
        )
      );
      fighter.markSpawned(now);
    }
  }

  updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const proj = this.projectiles[i];
      proj.update();

      if (!proj.alive) {
        this.projectiles.splice(i, 1);
        continue;
      }

      const target = proj.target;
      if (!target || !target.isAlive()) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (
        CollisionDetector.circleHitsCircle(
          proj.x,
          proj.y,
          proj.radius,
          target.x,
          target.y,
          target.radius
        )
      ) {
        const damage = proj.numberValue;
        target.takeDamage(damage);
        const shooter = this.getFighter(proj.ownerId);
        if (shooter) {
          shooter.onNumberHitSuccess();
        }
        this.lastHitMessage = `数字 ${damage} 命中！造成 ${damage} 点伤害`;
        this.hitMessageUntil = Date.now() + 1000;
        this.projectiles.splice(i, 1);
        this.notifyHud();
      }
    }
  }

  notifyHud() {
    if (typeof this.onHudUpdate === "function") {
      const p1 = this.getFighter(1);
      const p2 = this.getFighter(2);
      this.onHudUpdate({
        p1Number: p1 ? p1.attackNumber : 1,
        p2Number: p2 ? p2.attackNumber : 1,
        lastHit: this.lastHitMessage,
      });
    }
  }

  update() {
    if (this.state !== "playing") {
      return;
    }

    const f1 = this.fighters[0];
    const f2 = this.fighters[1];
    if (!f1 || !f2) {
      return;
    }

    ContinuousBouncePhysics.updateBall(f1, this.arena);
    ContinuousBouncePhysics.updateBall(f2, this.arena);
    ContinuousBouncePhysics.resolveBallCollision(f1, f2, false);

    this.trySpawnNumbers(Date.now());
    this.updateProjectiles();

    for (const fighter of this.fighters) {
      if (!fighter.isAlive()) {
        const winnerId = fighter.playerId === 1 ? 2 : 1;
        this.endGame(winnerId);
        return;
      }
    }

    this.notifyHud();
  }

  endGame(winnerId) {
    this.state = "gameover";
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (typeof this.onGameOver === "function") {
      this.onGameOver(winnerId);
    }
  }

  drawBackground() {
    this.ctx.fillStyle = "#1a1a2e";
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.arena.draw(this.ctx);

    this.ctx.fillStyle = "rgba(255, 212, 59, 0.35)";
    this.ctx.font = "14px system-ui, sans-serif";
    const label =
      this.subMode === "training"
        ? "数字老师 · 训练场"
        : "数字老师 · 双人";
    this.ctx.fillText(label, 12, 28);
  }

  draw() {
    this.drawBackground();

    for (const fighter of this.fighters) {
      if (fighter.isAlive()) {
        fighter.draw(this.ctx);
      }
    }

    for (const proj of this.projectiles) {
      proj.draw(this.ctx);
    }

    this.ctx.textAlign = "center";
    if (Date.now() < this.hitMessageUntil) {
      this.ctx.fillStyle = "#ffd43b";
      this.ctx.font = "13px system-ui, sans-serif";
      this.ctx.fillText(this.lastHitMessage, this.width / 2, this.arena.bottom + 28);
    } else {
      this.ctx.fillStyle = "#aaa";
      this.ctx.font = "12px system-ui, sans-serif";
      this.ctx.fillText(
        "头顶数字自动飞出追踪敌人 · 命中伤害=数字 · 命中后数字+1（无上限）",
        this.width / 2,
        this.arena.bottom + 28
      );
    }
    this.ctx.textAlign = "left";
  }

  loop() {
    this.update();
    this.draw();

    if (this.state === "playing") {
      this.animationId = requestAnimationFrame(() => this.loop());
    }
  }

  getHealthPercent(playerId) {
    const fighter = this.getFighter(playerId);
    if (!fighter) {
      return 100;
    }
    return (fighter.health / NumberTeacherConstants.MAX_HEALTH) * 100;
  }
}
