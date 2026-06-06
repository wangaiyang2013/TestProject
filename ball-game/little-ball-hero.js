/**
 * 小球英雄模式 - 仅需选球（限时）；双球持续自动反弹，技能自动释放
 */

const LittleBallHeroConstants = {
  PICK_TIME_LIMIT_MS: 8000,
  MIN_BOUNCE_SPEED: 7,
  MAX_BOUNCE_SPEED: 11,
  WALL_BOUNCE: 0.98,
  BALL_BOUNCE: 0.92,
  SKILL_INTERVAL_MS: 1400,
  PROJECTILE_SPEED: 11,
  PROJECTILE_LIFETIME_MS: 900,
  PULSE_RANGE: 72,
  PULSE_DAMAGE: 14,
  BUMP_DAMAGE: 10,
  SUNGLASSES_OUTBOUND_DAMAGE: 14,
  SUNGLASSES_RETURN_DAMAGE: 11,
  SUNGLASSES_SPEED: 10,
  BOXING_MIN_RANGE_METERS: 1,
  BOXING_MAX_RANGE_METERS: 2,
  BOXING_METERS_TO_RADIUS_FACTOR: 4.5,
  BOXING_PUNCH_FLASH_MS: 280,
  AI_PICK_DELAY_MS: 500,
};

/**
 * 英雄技能类型
 */
class HeroSkillType {
  static SHOT = "shot";

  static PULSE = "pulse";

  static BUMP = "bump";

  /** 江西步牛仔球专属：双发左轮射击 */
  static REVOLVER = "revolver";

  /** 墨镜球专属：投出墨镜，命中后折返造成二次伤害 */
  static SUNGLASSES = "sunglasses";

  /** 拳击球专属：最近敌人在 1-2 米内时出拳 */
  static BOXING = "boxing";
}

/**
 * 可选英雄球模板
 */
class HeroBallTemplate {
  constructor(
    id,
    name,
    color,
    glow,
    maxHealth,
    moveSpeed,
    mass,
    skillType,
    skillDamage,
    skillIntervalMs,
    returnDamage
  ) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.glow = glow;
    this.maxHealth = maxHealth;
    this.moveSpeed = moveSpeed;
    this.mass = mass;
    this.skillType = skillType;
    this.skillDamage = skillDamage;
    this.skillIntervalMs =
      skillIntervalMs || LittleBallHeroConstants.SKILL_INTERVAL_MS;
    this.returnDamage = returnDamage || Math.round(skillDamage * 0.8);
  }
}

/**
 * 英雄球图鉴
 */
class HeroRoster {
  static getAll() {
    return [
      new HeroBallTemplate(
        "flame",
        "烈焰丸",
        "#e94560",
        "#ff6b6b",
        100,
        9,
        1.0,
        HeroSkillType.SHOT,
        16
      ),
      new HeroBallTemplate(
        "wind",
        "疾风丸",
        "#51cf66",
        "#8ce99a",
        85,
        10,
        0.85,
        HeroSkillType.BUMP,
        12
      ),
      new HeroBallTemplate(
        "iron",
        "铁壁丸",
        "#868e96",
        "#ced4da",
        130,
        8,
        1.4,
        HeroSkillType.PULSE,
        18
      ),
      new HeroBallTemplate(
        "bolt",
        "闪电丸",
        "#fcc419",
        "#ffe066",
        95,
        9,
        1.0,
        HeroSkillType.SHOT,
        14
      ),
      new HeroBallTemplate(
        "jiangxi_cowboy",
        "江西步牛仔球",
        "#c68642",
        "#e9b872",
        92,
        10,
        0.95,
        HeroSkillType.REVOLVER,
        12,
        1000
      ),
      new HeroBallTemplate(
        "sunglasses",
        "墨镜球",
        "#212529",
        "#495057",
        88,
        9,
        0.9,
        HeroSkillType.SUNGLASSES,
        LittleBallHeroConstants.SUNGLASSES_OUTBOUND_DAMAGE,
        1300,
        LittleBallHeroConstants.SUNGLASSES_RETURN_DAMAGE
      ),
      new HeroBallTemplate(
        "boxing",
        "拳击球",
        "#e03131",
        "#ff8787",
        96,
        9,
        1.1,
        HeroSkillType.BOXING,
        20,
        1100
      ),
    ];
  }

  static getById(id) {
    return HeroRoster.getAll().find((h) => h.id === id) || HeroRoster.getAll()[0];
  }

  static pickRandom(available) {
    const list = available.length > 0 ? available : HeroRoster.getAll();
    return list[Math.floor(Math.random() * list.length)];
  }
}

/**
 * 技能投射物
 */
class HeroSkillProjectile {
  constructor(x, y, dirX, dirY, radius, ownerId, color, damage) {
    this.x = x;
    this.y = y;
    this.dirX = dirX;
    this.dirY = dirY;
    this.radius = radius;
    this.ownerId = ownerId;
    this.color = color;
    this.damage = damage;
    this.alive = true;
    this.spawnTime = Date.now();
  }

  update() {
    this.x += this.dirX * LittleBallHeroConstants.PROJECTILE_SPEED;
    this.y += this.dirY * LittleBallHeroConstants.PROJECTILE_SPEED;
    if (Date.now() - this.spawnTime > LittleBallHeroConstants.PROJECTILE_LIFETIME_MS) {
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
}

/**
 * 墨镜球投出的回旋墨镜（命中后折返，二次伤害）
 */
class SunglassesProjectile {
  constructor(
    x,
    y,
    dirX,
    dirY,
    radius,
    ownerId,
    outboundDamage,
    returnDamage
  ) {
    this.x = x;
    this.y = y;
    this.dirX = dirX;
    this.dirY = dirY;
    this.radius = radius;
    this.ownerId = ownerId;
    this.outboundDamage = outboundDamage;
    this.returnDamage = returnDamage;
    this.alive = true;
    this.spawnTime = Date.now();
    this.isReturning = false;
    this.hasHitEnemy = false;
    this.hitEnemyId = null;
  }

  update(ownerFighter) {
    if (this.isReturning && ownerFighter && ownerFighter.isAlive()) {
      const dx = ownerFighter.x - this.x;
      const dy = ownerFighter.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.001) {
        this.dirX = dx / dist;
        this.dirY = dy / dist;
      }
      if (dist < ownerFighter.radius + this.radius + 4) {
        this.alive = false;
        return;
      }
    }

    const speed = LittleBallHeroConstants.SUNGLASSES_SPEED;
    this.x += this.dirX * speed;
    this.y += this.dirY * speed;

    if (Date.now() - this.spawnTime > LittleBallHeroConstants.PROJECTILE_LIFETIME_MS * 2) {
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

  beginReturn() {
    this.isReturning = true;
  }

  /**
   * @returns {boolean} 是否应从场上移除
   */
  handleEnemyHit(fighter) {
    if (fighter.playerId === this.ownerId || !fighter.isAlive()) {
      return false;
    }

    if (!this.hasHitEnemy) {
      fighter.takeDamage(this.outboundDamage);
      this.hasHitEnemy = true;
      this.hitEnemyId = fighter.playerId;
      this.beginReturn();
      return false;
    }

    if (this.isReturning && fighter.playerId === this.hitEnemyId) {
      fighter.takeDamage(this.returnDamage);
      this.alive = false;
      return true;
    }

    return false;
  }

  draw(ctx) {
    const lensW = this.radius * 1.1;
    const lensH = this.radius * 0.75;
    const gap = this.radius * 0.35;
    const angle = Math.atan2(this.dirY, this.dirX);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);

    ctx.fillStyle = "#111";
    ctx.strokeStyle = this.isReturning ? "#74c0fc" : "#ffd43b";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(-gap, 0, lensW, lensH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(gap, 0, lensW, lensH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-gap + lensW * 0.3, 0);
    ctx.lineTo(gap - lensW * 0.3, 0);
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * 拳击球攻击距离（1-2 米，按球半径换算像素）
 */
class BoxingRangeHelper {
  static metersToPixels(meters, ballRadius) {
    return meters * ballRadius * LittleBallHeroConstants.BOXING_METERS_TO_RADIUS_FACTOR;
  }

  static getRangePixels(ballRadius) {
    return {
      min: BoxingRangeHelper.metersToPixels(
        LittleBallHeroConstants.BOXING_MIN_RANGE_METERS,
        ballRadius
      ),
      max: BoxingRangeHelper.metersToPixels(
        LittleBallHeroConstants.BOXING_MAX_RANGE_METERS,
        ballRadius
      ),
    };
  }

  /**
   * 最近敌人是否在拳击有效距离内（1-2 米）
   */
  static isClosestEnemyInRange(fighter, opponent) {
    if (!opponent || !opponent.isAlive()) {
      return false;
    }
    const dist = Math.hypot(opponent.x - fighter.x, opponent.y - fighter.y);
    const range = BoxingRangeHelper.getRangePixels(fighter.radius);
    return dist >= range.min && dist <= range.max;
  }
}

/**
 * 场上战斗用英雄球（自动反弹 + 自动技能）
 */
class HeroBallFighter {
  constructor(playerId, template, x, y, radius, dirX, dirY) {
    this.playerId = playerId;
    this.template = template;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.health = template.maxHealth;
    this.vx = dirX * template.moveSpeed;
    this.vy = dirY * template.moveSpeed;
    this.lastSkillTime = Date.now() - Math.random() * LittleBallHeroConstants.SKILL_INTERVAL_MS;
    this.pulseFlashUntil = 0;
    this.punchFlashUntil = 0;
    this.punchAngle = 0;
  }

  get maxHealth() {
    return this.template.maxHealth;
  }

  get color() {
    return this.template.color;
  }

  get glow() {
    return this.template.glow;
  }

  get mass() {
    return this.template.mass;
  }

  getSpeed() {
    return Math.hypot(this.vx, this.vy);
  }

  getMoveAngle() {
    const speed = this.getSpeed();
    if (speed < 0.001) {
      return this.playerId === 1 ? 0 : Math.PI;
    }
    return Math.atan2(this.vy, this.vx);
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  isAlive() {
    return this.health > 0;
  }

  canUseSkill(now) {
    const interval = this.template.skillIntervalMs;
    return now - this.lastSkillTime >= interval;
  }

  markSkillUsed(now) {
    this.lastSkillTime = now;
  }

  draw(ctx) {
    if (Date.now() < this.pulseFlashUntil) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, LittleBallHeroConstants.PULSE_RANGE, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 212, 59, 0.55)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
    ctx.fillStyle = this.glow;
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();

    const barW = this.radius * 2.2;
    const barX = this.x - barW / 2;
    const barY = this.y - this.radius - 16;
    ctx.fillStyle = "#2a2a40";
    ctx.fillRect(barX, barY, barW, 5);
    ctx.fillStyle = this.color;
    ctx.fillRect(barX, barY, barW * (this.health / this.maxHealth), 5);

    ctx.fillStyle = "#fff";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.template.name, this.x, this.y + this.radius + 14);

    if (this.template.id === "jiangxi_cowboy") {
      ctx.fillStyle = "#3d2914";
      ctx.font = "bold 8px system-ui, sans-serif";
      ctx.fillText("牛仔", this.x, this.y - this.radius - 6);
    }

    if (this.template.id === "sunglasses") {
      ctx.fillStyle = "#111";
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.fillText("墨镜", this.x, this.y - this.radius - 6);
    }

    if (this.template.skillType === HeroSkillType.BOXING) {
      this.drawBoxingRange(ctx);
      this.drawBoxingPunch(ctx);
    }

    ctx.textAlign = "left";
  }

  drawBoxingRange(ctx) {
    const range = BoxingRangeHelper.getRangePixels(this.radius);
    ctx.beginPath();
    ctx.arc(this.x, this.y, range.min, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 135, 135, 0.2)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.x, this.y, range.max, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 135, 135, 0.35)";
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawBoxingPunch(ctx) {
    if (Date.now() >= this.punchFlashUntil) {
      return;
    }
    const reach = this.radius + 28;
    const px = this.x + Math.cos(this.punchAngle) * reach;
    const py = this.y + Math.sin(this.punchAngle) * reach;

    ctx.strokeStyle = "#ff6b6b";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(
      this.x + Math.cos(this.punchAngle) * this.radius,
      this.y + Math.sin(this.punchAngle) * this.radius
    );
    ctx.lineTo(px, py);
    ctx.stroke();

    ctx.fillStyle = "#fa5252";
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * 持续反弹物理（球体永不停止，保持最低速度）
 */
class ContinuousBouncePhysics {
  static maintainSpeed(ball) {
    const speed = ball.getSpeed();
    const minSpeed = LittleBallHeroConstants.MIN_BOUNCE_SPEED;
    const maxSpeed = LittleBallHeroConstants.MAX_BOUNCE_SPEED;
    const angle = ball.getMoveAngle();

    if (speed < minSpeed) {
      ball.vx = Math.cos(angle) * minSpeed;
      ball.vy = Math.sin(angle) * minSpeed;
    } else if (speed > maxSpeed) {
      ball.vx = (ball.vx / speed) * maxSpeed;
      ball.vy = (ball.vy / speed) * maxSpeed;
    }
  }

  static updateBall(ball, arena) {
    ball.x += ball.vx;
    ball.y += ball.vy;

    const bounce = LittleBallHeroConstants.WALL_BOUNCE;
    const r = ball.radius;

    if (ball.x - r < arena.left) {
      ball.x = arena.left + r;
      ball.vx = Math.abs(ball.vx) * bounce;
    } else if (ball.x + r > arena.right) {
      ball.x = arena.right - r;
      ball.vx = -Math.abs(ball.vx) * bounce;
    }

    if (ball.y - r < arena.top) {
      ball.y = arena.top + r;
      ball.vy = Math.abs(ball.vy) * bounce;
    } else if (ball.y + r > arena.bottom) {
      ball.y = arena.bottom - r;
      ball.vy = -Math.abs(ball.vy) * bounce;
    }

    ContinuousBouncePhysics.maintainSpeed(ball);
  }

  static resolveBallCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const minDist = a.radius + b.radius;

    if (dist >= minDist || dist < 0.001) {
      return;
    }

    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    const totalMass = a.mass + b.mass;

    a.x -= (nx * overlap * b.mass) / totalMass;
    a.y -= (ny * overlap * b.mass) / totalMass;
    b.x += (nx * overlap * a.mass) / totalMass;
    b.y += (ny * overlap * a.mass) / totalMass;

    const dvx = a.vx - b.vx;
    const dvy = a.vy - b.vy;
    const impact = dvx * nx + dvy * ny;
    if (impact <= 0) {
      return;
    }

    const restitution = LittleBallHeroConstants.BALL_BOUNCE;
    const impulse = (2 * impact * restitution) / totalMass;
    a.vx -= impulse * b.mass * nx;
    a.vy -= impulse * b.mass * ny;
    b.vx += impulse * a.mass * nx;
    b.vy += impulse * a.mass * ny;

    const touchDamage = LittleBallHeroConstants.BUMP_DAMAGE;
    a.takeDamage(touchDamage);
    b.takeDamage(touchDamage);

    ContinuousBouncePhysics.maintainSpeed(a);
    ContinuousBouncePhysics.maintainSpeed(b);
  }
}

/**
 * 自动技能系统
 */
class HeroAutoSkillSystem {
  static tryUseSkill(fighter, opponent, projectiles, projectileRadius) {
    const now = Date.now();
    if (!fighter.canUseSkill(now) || !opponent || !opponent.isAlive()) {
      return;
    }

    const template = fighter.template;

    if (template.skillType === HeroSkillType.BOXING) {
      if (BoxingRangeHelper.isClosestEnemyInRange(fighter, opponent)) {
        fighter.markSkillUsed(now);
        HeroAutoSkillSystem.fireBoxingPunch(fighter, opponent, template.skillDamage);
      }
      return;
    }

    fighter.markSkillUsed(now);

    if (template.skillType === HeroSkillType.SHOT) {
      HeroAutoSkillSystem.fireShot(fighter, opponent, projectiles, projectileRadius, template.skillDamage);
      return;
    }

    if (template.skillType === HeroSkillType.PULSE) {
      HeroAutoSkillSystem.firePulse(fighter, opponent, template.skillDamage);
      return;
    }

    if (template.skillType === HeroSkillType.BUMP) {
      HeroAutoSkillSystem.fireBump(fighter, opponent, template.skillDamage);
      return;
    }

    if (template.skillType === HeroSkillType.REVOLVER) {
      HeroAutoSkillSystem.fireRevolver(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        template.skillDamage
      );
      return;
    }

    if (template.skillType === HeroSkillType.SUNGLASSES) {
      HeroAutoSkillSystem.fireSunglasses(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        template.skillDamage,
        template.returnDamage
      );
    }
  }

  static fireBoxingPunch(fighter, opponent, damage) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }
    const nx = dx / dist;
    const ny = dy / dist;

    fighter.punchAngle = Math.atan2(dy, dx);
    fighter.punchFlashUntil =
      Date.now() + LittleBallHeroConstants.BOXING_PUNCH_FLASH_MS;
    opponent.takeDamage(damage);

    opponent.vx += nx * 2;
    opponent.vy += ny * 2;
    fighter.vx -= nx * 0.8;
    fighter.vy -= ny * 0.8;
    ContinuousBouncePhysics.maintainSpeed(fighter);
    ContinuousBouncePhysics.maintainSpeed(opponent);
  }

  static fireSunglasses(
    fighter,
    opponent,
    projectiles,
    radius,
    outboundDamage,
    returnDamage
  ) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }
    const dirX = dx / dist;
    const dirY = dy / dist;
    const offset = fighter.radius + radius + 6;
    projectiles.push(
      new SunglassesProjectile(
        fighter.x + dirX * offset,
        fighter.y + dirY * offset,
        dirX,
        dirY,
        radius * 1.4,
        fighter.playerId,
        outboundDamage,
        returnDamage
      )
    );
  }

  static fireRevolver(fighter, opponent, projectiles, radius, damage) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }
    const baseAngle = Math.atan2(dy, dx);
    const spread = 0.18;
    const angles = [baseAngle - spread, baseAngle + spread];
    const offset = fighter.radius + radius + 4;

    for (const angle of angles) {
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      projectiles.push(
        new HeroSkillProjectile(
          fighter.x + dirX * offset,
          fighter.y + dirY * offset,
          dirX,
          dirY,
          radius,
          fighter.playerId,
          "#ffd43b",
          damage
        )
      );
    }
  }

  static fireShot(fighter, opponent, projectiles, radius, damage) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }
    const dirX = dx / dist;
    const dirY = dy / dist;
    const offset = fighter.radius + radius + 4;
    projectiles.push(
      new HeroSkillProjectile(
        fighter.x + dirX * offset,
        fighter.y + dirY * offset,
        dirX,
        dirY,
        radius,
        fighter.playerId,
        fighter.color,
        damage
      )
    );
  }

  static firePulse(fighter, opponent, damage) {
    fighter.pulseFlashUntil = Date.now() + 200;
    const dist = Math.hypot(opponent.x - fighter.x, opponent.y - fighter.y);
    if (dist <= LittleBallHeroConstants.PULSE_RANGE + opponent.radius) {
      opponent.takeDamage(damage);
    }
  }

  static fireBump(fighter, opponent, damage) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }
    const nx = dx / dist;
    const ny = dy / dist;
    opponent.vx += nx * 2.5;
    opponent.vy += ny * 2.5;
    fighter.vx -= nx * 1.2;
    fighter.vy -= ny * 1.2;
    opponent.takeDamage(damage);
    ContinuousBouncePhysics.maintainSpeed(fighter);
    ContinuousBouncePhysics.maintainSpeed(opponent);
  }
}

/**
 * 选球倒计时
 */
class PickTimer {
  constructor(limitMs) {
    this.limitMs = limitMs;
    this.startTime = Date.now();
  }

  getRemainingMs() {
    return Math.max(0, this.limitMs - (Date.now() - this.startTime));
  }

  isExpired() {
    return this.getRemainingMs() <= 0;
  }

  reset() {
    this.startTime = Date.now();
  }
}

/**
 * 小球英雄主游戏
 */
class LittleBallHeroGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.input = new InputManager();
    this.state = "idle";
    this.subMode = "training";
    this.phase = "pick";
    this.pickStep = 1;
    this.pickTimer = null;
    this.fighters = [];
    this.projectiles = [];
    this.p1HeroId = null;
    this.p2HeroId = null;
    this.takenHeroIds = new Set();
    this.arena = null;
    this.width = 0;
    this.height = 0;
    this.animationId = null;
    this.onPhaseChange = null;
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
      padY + 50,
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
    return Math.max(18, this.height * GameConstants.BALL_RADIUS_RATIO);
  }

  getProjectileRadius() {
    return Math.max(8, this.height * GameConstants.PROJECTILE_RADIUS_RATIO);
  }

  start(subMode) {
    this.subMode = subMode;
    this.state = "playing";
    this.phase = "pick";
    this.pickStep = 1;
    this.p1HeroId = null;
    this.p2HeroId = null;
    this.takenHeroIds = new Set();
    this.fighters = [];
    this.projectiles = [];
    this.startPickTimer();
    this.notifyPhase();

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.loop();
  }

  isTwoPlayer() {
    return this.subMode === "versus";
  }

  startPickTimer() {
    this.pickTimer = new PickTimer(LittleBallHeroConstants.PICK_TIME_LIMIT_MS);
  }

  notifyPhase() {
    if (typeof this.onPhaseChange === "function") {
      this.onPhaseChange(this.getPhaseSnapshot());
    }
  }

  getPhaseSnapshot() {
    return {
      phase: this.phase,
      pickStep: this.pickStep,
      subMode: this.subMode,
      pickRemainingMs: this.pickTimer ? this.pickTimer.getRemainingMs() : 0,
      p1HeroId: this.p1HeroId,
      p2HeroId: this.p2HeroId,
      fighters: this.fighters.map((f) => ({
        playerId: f.playerId,
        name: f.template.name,
        health: f.health,
        maxHealth: f.maxHealth,
        skillName: HeroAutoSkillSystem.getSkillLabel(f.template.skillType),
      })),
    };
  }

  getAvailableHeroes() {
    return HeroRoster.getAll().filter((h) => !this.takenHeroIds.has(h.id));
  }

  autoPickForCurrentStep() {
    const available = this.getAvailableHeroes();
    const hero = HeroRoster.pickRandom(available);
    this.applyPick(hero.id, true);
  }

  applyPick(heroId, wasAuto) {
    if (this.pickStep === 1) {
      this.p1HeroId = heroId;
    } else {
      this.p2HeroId = heroId;
    }
    this.takenHeroIds.add(heroId);
    this.advancePick(wasAuto);
  }

  tryPickHero(heroId) {
    if (this.phase !== "pick" || this.takenHeroIds.has(heroId)) {
      return false;
    }
    this.applyPick(heroId, false);
    return true;
  }

  advancePick(wasAuto) {
    if (this.pickStep === 1) {
      this.pickStep = 2;

      if (!this.isTwoPlayer()) {
        const available = this.getAvailableHeroes();
        const aiHero = HeroRoster.pickRandom(available);
        this.p2HeroId = aiHero.id;
        this.takenHeroIds.add(aiHero.id);
        this.beginBattle();
        return;
      }

      this.startPickTimer();
      this.notifyPhase();
      return;
    }

    this.beginBattle();
  }

  beginBattle() {
    const r = this.getBallRadius();
    const cy = (this.arena.top + this.arena.bottom) / 2;
    const p1Template = HeroRoster.getById(this.p1HeroId);
    const p2Template = HeroRoster.getById(this.p2HeroId);

    this.fighters = [
      new HeroBallFighter(
        1,
        p1Template,
        this.arena.left + this.width * 0.28,
        cy,
        r,
        1,
        0.2
      ),
      new HeroBallFighter(
        2,
        p2Template,
        this.arena.right - this.width * 0.28,
        cy,
        r,
        -1,
        0.2
      ),
    ];

    this.phase = "battle";
    this.projectiles = [];
    this.notifyPhase();
  }

  updatePickPhase() {
    if (this.pickTimer && this.pickTimer.isExpired()) {
      this.autoPickForCurrentStep();
      return;
    }

    const heroes = HeroRoster.getAll();
    for (let i = 0; i < heroes.length; i += 1) {
      const keyCode = `Digit${i + 1}`;
      if (this.input.wasPressed(keyCode)) {
        const hero = heroes[i];
        if (hero && !this.takenHeroIds.has(hero.id)) {
          const isP1Turn = this.pickStep === 1;
          const isP2Turn = this.pickStep === 2 && this.isTwoPlayer();
          if (isP1Turn || isP2Turn) {
            this.tryPickHero(hero.id);
          }
        }
      }
    }
  }

  getFighter(playerId) {
    return this.fighters.find((f) => f.playerId === playerId);
  }

  updateBattle() {
    const f1 = this.fighters[0];
    const f2 = this.fighters[1];
    if (!f1 || !f2) {
      return;
    }

    ContinuousBouncePhysics.updateBall(f1, this.arena);
    ContinuousBouncePhysics.updateBall(f2, this.arena);
    ContinuousBouncePhysics.resolveBallCollision(f1, f2);

    const now = Date.now();
    HeroAutoSkillSystem.tryUseSkill(f1, f2, this.projectiles, this.getProjectileRadius());
    HeroAutoSkillSystem.tryUseSkill(f2, f1, this.projectiles, this.getProjectileRadius());

    this.updateProjectiles();

    for (const fighter of this.fighters) {
      if (!fighter.isAlive()) {
        this.endGame(fighter.playerId === 1 ? 2 : 1);
        return;
      }
    }
  }

  updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const proj = this.projectiles[i];

      if (proj instanceof SunglassesProjectile) {
        const owner = this.getFighter(proj.ownerId);
        proj.update(owner);

        if (!proj.alive || proj.isOutOfBounds(this.arena)) {
          this.projectiles.splice(i, 1);
          continue;
        }

        for (const fighter of this.fighters) {
          if (
            CollisionDetector.circleHitsCircle(
              proj.x,
              proj.y,
              proj.radius,
              fighter.x,
              fighter.y,
              fighter.radius
            )
          ) {
            const removed = proj.handleEnemyHit(fighter);
            if (removed || !proj.alive) {
              this.projectiles.splice(i, 1);
            }
            break;
          }
        }
        continue;
      }

      proj.update();

      if (!proj.alive || proj.isOutOfBounds(this.arena)) {
        this.projectiles.splice(i, 1);
        continue;
      }

      for (const fighter of this.fighters) {
        if (fighter.playerId === proj.ownerId || !fighter.isAlive()) {
          continue;
        }
        if (
          CollisionDetector.circleHitsCircle(
            proj.x,
            proj.y,
            proj.radius,
            fighter.x,
            fighter.y,
            fighter.radius
          )
        ) {
          fighter.takeDamage(proj.damage);
          proj.alive = false;
          this.projectiles.splice(i, 1);
          break;
        }
      }
    }
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

  update() {
    if (this.state !== "playing") {
      return;
    }

    if (this.phase === "pick") {
      this.updatePickPhase();
      this.notifyPhase();
    } else if (this.phase === "battle") {
      this.updateBattle();
      this.notifyPhase();
    }

    this.input.clearFrame();
  }

  drawPickScreen() {
    const heroes = HeroRoster.getAll();
    const remainingSec = Math.ceil(
      (this.pickTimer ? this.pickTimer.getRemainingMs() : 0) / 1000
    );
    const pickerLabel =
      this.pickStep === 1
        ? "红队（玩家1）选球"
        : "蓝队（玩家2）选球";

    this.ctx.fillStyle = "rgba(0,0,0,0.55)";
    this.ctx.fillRect(
      this.arena.left,
      this.arena.top,
      this.arena.right - this.arena.left,
      this.arena.bottom - this.arena.top
    );

    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#ffd43b";
    this.ctx.font = "bold 18px system-ui, sans-serif";
    this.ctx.fillText(pickerLabel, this.width / 2, this.arena.top + 32);

    this.ctx.fillStyle = remainingSec <= 3 ? "#ff6b6b" : "#ccc";
    this.ctx.font = "14px system-ui, sans-serif";
    this.ctx.fillText(
      `剩余 ${remainingSec} 秒 · 按 1-${heroes.length} 选球，超时随机`,
      this.width / 2,
      this.arena.top + 56
    );

    const cardWidth = Math.min(100, (this.width - 80) / heroes.length);
    const startX = this.width / 2 - (heroes.length * cardWidth) / 2;
    heroes.forEach((hero, i) => {
      const cx = startX + i * cardWidth + cardWidth / 2;
      const cy = this.height / 2;
      const taken = this.takenHeroIds.has(hero.id);

      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      this.ctx.fillStyle = taken ? "#444" : hero.color;
      this.ctx.globalAlpha = taken ? 0.35 : 1;
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
      this.ctx.strokeStyle = "#fff";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.fillStyle = "#fff";
      this.ctx.font = "12px system-ui, sans-serif";
      this.ctx.fillText(`${i + 1}. ${hero.name}`, cx, cy + 48);
      const skillLabel = HeroAutoSkillSystem.getSkillLabel(hero.skillType);
      this.ctx.fillStyle = "#aaa";
      this.ctx.fillText(`自动·${skillLabel}`, cx, cy + 64);
      if (taken) {
        this.ctx.fillStyle = "#888";
        this.ctx.fillText("已选", cx, cy + 78);
      }
    });
    this.ctx.textAlign = "left";
  }

  drawBackground() {
    this.ctx.fillStyle = GameConstants.BACKGROUND_COLOR;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.arena.draw(this.ctx);

    const modeLabel =
      this.subMode === "training" ? "小球英雄 · 训练场" : "小球英雄 · 双人";
    this.ctx.fillStyle = "rgba(255, 212, 59, 0.3)";
    this.ctx.font = "14px system-ui, sans-serif";
    this.ctx.fillText(modeLabel, 12, 28);
  }

  draw() {
    this.drawBackground();

    if (this.phase === "pick") {
      this.drawPickScreen();
      return;
    }

    for (const fighter of this.fighters) {
      if (fighter.isAlive()) {
        fighter.draw(this.ctx);
      }
    }

    for (const proj of this.projectiles) {
      proj.draw(this.ctx);
    }

    this.ctx.fillStyle = "rgba(255, 212, 59, 0.85)";
    this.ctx.font = "13px system-ui, sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "双球自动反弹对打 · 技能自动释放 · 你只需选球",
      this.width / 2,
      this.arena.bottom + 28
    );
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
    return (fighter.health / fighter.maxHealth) * 100;
  }
}

HeroAutoSkillSystem.getSkillLabel = function getSkillLabel(skillType) {
  if (skillType === HeroSkillType.SHOT) {
    return "弹射";
  }
  if (skillType === HeroSkillType.PULSE) {
    return "震荡";
  }
  if (skillType === HeroSkillType.BUMP) {
    return "冲击";
  }
  if (skillType === HeroSkillType.REVOLVER) {
    return "左轮双射";
  }
  if (skillType === HeroSkillType.SUNGLASSES) {
    return "回旋墨镜";
  }
  if (skillType === HeroSkillType.BOXING) {
    return "近距重拳";
  }
  return "技能";
};
