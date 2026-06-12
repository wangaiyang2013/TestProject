/**
 * 寒冰腐烂球 - 满血每秒射冰球；受伤后狂暴近战；踩踏吞噬，百次即杀
 */

const IceRotConstants = {
  ICE_SHOT_INTERVAL_MS: 1000,
  ICE_PROJECTILE_SPEED: 10.5,
  ICE_PROJECTILE_LIFETIME_MS: 1400,
  ICE_PROJECTILE_RADIUS: 10,
  /** 冰球命中叠层，达到后冻结 */
  ICE_HITS_TO_FREEZE: 5,
  ICE_SLOW_DURATION_MS: 2500,
  ICE_SLOW_RATIO: 0.52,
  /** 狂暴近战：每秒造成技能伤害的比例 */
  CRAZY_MELEE_DAMAGE_RATIO: 0.8,
  /** 吞噬踩踏：每秒造成技能伤害的比例 */
  SWALLOW_DAMAGE_RATIO: 1.0,
  CRAZY_MELEE_INTERVAL_MS: 1000,
  /** 敌人踩在球上累计次数，达到后立即击杀 */
  SWALLOW_KILL_STEP_COUNT: 100,
  SWALLOW_PULL_STRENGTH: 0.18,
  CRAZY_BURST_FLASH_MS: 280,
  /**
   * 狂暴触发：须先损失 100 点生命（例：596 满血 → 496 及以下才狂暴）
   * 算法：狂暴线 = 最大生命 - CRAZY_BURST_MIN_HP_LOST
   */
  CRAZY_BURST_MIN_HP_LOST: 100,
};

/**
 * 寒冰腐烂球冰弹投射物
 */
class IceRotProjectile {
  constructor(x, y, dirX, dirY, ownerId, damage, ownerFighter) {
    this.x = x;
    this.y = y;
    this.dirX = dirX;
    this.dirY = dirY;
    this.radius = IceRotConstants.ICE_PROJECTILE_RADIUS;
    this.ownerId = ownerId;
    this.ownerFighter = ownerFighter;
    this.damage = damage;
    this.alive = true;
    this.spawnTime = Date.now();
  }

  update() {
    this.x += this.dirX * IceRotConstants.ICE_PROJECTILE_SPEED;
    this.y += this.dirY * IceRotConstants.ICE_PROJECTILE_SPEED;
    if (
      Date.now() - this.spawnTime >
      IceRotConstants.ICE_PROJECTILE_LIFETIME_MS
    ) {
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
    ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(34, 184, 207, 0.28)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
      this.x,
      this.y,
      this.radius * 0.15,
      this.x,
      this.y,
      this.radius
    );
    gradient.addColorStop(0, "#e3fafc");
    gradient.addColorStop(0.5, "#66d9e8");
    gradient.addColorStop(1, "#1098ad");
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = "#c5f6fa";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * 寒冰腐烂球技能系统
 */
class IceRotSkillSystem {
  static isIceRotFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.ICE_ROT;
  }

  static initFighter(fighter) {
    fighter.iceRotHitCount = 0;
    fighter.iceRotSlowUntil = 0;
    fighter.iceRotSlowRatio = 1;
    fighter.iceRotSwallowCounts = {};
    fighter.iceRotSwallowing = false;
    fighter.iceRotCrazyFlashUntil = 0;
    fighter.lastIceRotMeleeTime = 0;
  }

  /** 狂暴触发血量线 = 最大生命 - 100 */
  static getCrazyBurstThresholdHp(fighter) {
    return Math.max(
      1,
      fighter.maxHealth - IceRotConstants.CRAZY_BURST_MIN_HP_LOST
    );
  }

  /**
   * 狂暴模式：当前生命 ≤ 狂暴线（596 满血时即为 496）
   */
  static isCrazyBurst(fighter) {
    if (!IceRotSkillSystem.isIceRotFighter(fighter)) {
      return false;
    }

    const maxHp = fighter.maxHealth;
    if (maxHp <= 0) {
      return false;
    }

    return fighter.health <= IceRotSkillSystem.getCrazyBurstThresholdHp(fighter);
  }

  static getCrazyBurstHpPercent(fighter) {
    const maxHp = fighter.maxHealth;
    if (maxHp <= 0) {
      return 100;
    }
    return Math.round((fighter.health / maxHp) * 100);
  }

  static getMoveSpeedRatio(fighter) {
    if (!fighter || Date.now() >= fighter.iceRotSlowUntil) {
      return 1;
    }
    return fighter.iceRotSlowRatio;
  }

  static applySlow(target) {
    target.iceRotSlowUntil = Date.now() + IceRotConstants.ICE_SLOW_DURATION_MS;
    target.iceRotSlowRatio = IceRotConstants.ICE_SLOW_RATIO;
    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.setStatusText(target, "减速");
    }
  }

  static registerIceHit(target, attacker) {
    if (!target.iceRotHitCount) {
      target.iceRotHitCount = 0;
    }
    target.iceRotHitCount += 1;
    IceRotSkillSystem.applySlow(target);

    if (target.iceRotHitCount >= IceRotConstants.ICE_HITS_TO_FREEZE) {
      if (typeof ElementStatusEffectSystem !== "undefined") {
        ElementStatusEffectSystem.applyFreeze(target);
      }
    }

    if (attacker) {
      attacker.iceRotCrazyFlashUntil =
        Date.now() + IceRotConstants.CRAZY_BURST_FLASH_MS;
    }
  }

  static applyBurnOrPoison(target) {
    if (!target || !target.isAlive()) {
      return;
    }
    if (typeof ElementStatusEffectSystem === "undefined") {
      return;
    }
    if (Math.random() < 0.5) {
      ElementStatusEffectSystem.applyBurn(target);
      return;
    }
    ElementStatusEffectSystem.applyPoison(target);
  }

  static isOverlapping(a, b) {
    return CollisionDetector.circleHitsCircle(
      a.x,
      a.y,
      a.radius,
      b.x,
      b.y,
      b.radius
    );
  }

  static fireIceBall(fighter, opponent, projectiles, projectileRadius) {
    if (!opponent || !opponent.isAlive()) {
      return;
    }

    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }

    const startX = fighter.x + (dx / dist) * (fighter.radius + projectileRadius);
    const startY = fighter.y + (dy / dist) * (fighter.radius + projectileRadius);

    projectiles.push(
      new IceRotProjectile(
        startX,
        startY,
        dx / dist,
        dy / dist,
        fighter.playerId,
        fighter.template.skillDamage,
        fighter
      )
    );
  }

  static handleProjectileHit(target, projectile) {
    target.takeDamage(projectile.damage, projectile.ownerFighter);
    IceRotSkillSystem.registerIceHit(target, projectile.ownerFighter);
  }

  static computeMeleeDamage(fighter, swallowing) {
    const ratio = swallowing
      ? IceRotConstants.SWALLOW_DAMAGE_RATIO
      : IceRotConstants.CRAZY_MELEE_DAMAGE_RATIO;
    return Math.max(1, Math.round(fighter.template.skillDamage * ratio));
  }

  static tickCrazyBurst(fighter, opponent, now) {
    if (!IceRotSkillSystem.isCrazyBurst(fighter)) {
      fighter.iceRotSwallowing = false;
      return;
    }
    if (!opponent || !opponent.isAlive()) {
      return;
    }

    const overlapping = IceRotSkillSystem.isOverlapping(fighter, opponent);
    fighter.iceRotSwallowing = overlapping;

    if (overlapping) {
      IceRotSkillSystem.tickSwallow(fighter, opponent, now);
    }

    if (now - fighter.lastIceRotMeleeTime < IceRotConstants.CRAZY_MELEE_INTERVAL_MS) {
      return;
    }

    const inMeleeRange =
      overlapping ||
      Math.hypot(opponent.x - fighter.x, opponent.y - fighter.y) <=
        fighter.radius + opponent.radius + 18;

    if (!inMeleeRange) {
      return;
    }

    fighter.lastIceRotMeleeTime = now;
    const damage = IceRotSkillSystem.computeMeleeDamage(fighter, overlapping);
    opponent.takeDamage(damage, fighter);
    IceRotSkillSystem.applyBurnOrPoison(opponent);
    fighter.iceRotCrazyFlashUntil = now + IceRotConstants.CRAZY_BURST_FLASH_MS;

    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.setStatusText(
        opponent,
        overlapping ? "吞噬灼腐" : "狂暴近战"
      );
    }
  }

  static tickSwallow(fighter, opponent, now) {
    const opponentId = opponent.playerId;
    if (!fighter.iceRotSwallowCounts) {
      fighter.iceRotSwallowCounts = {};
    }

    fighter.iceRotSwallowCounts[opponentId] =
      (fighter.iceRotSwallowCounts[opponentId] || 0) + 1;

    const dx = fighter.x - opponent.x;
    const dy = fighter.y - opponent.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.001) {
      const pull = IceRotConstants.SWALLOW_PULL_STRENGTH;
      opponent.x += (dx / dist) * pull * fighter.radius;
      opponent.y += (dy / dist) * pull * fighter.radius;
      opponent.vx *= 0.72;
      opponent.vy *= 0.72;
    }

    if (
      fighter.iceRotSwallowCounts[opponentId] >=
      IceRotConstants.SWALLOW_KILL_STEP_COUNT
    ) {
      opponent.health = 0;
      if (typeof ElementStatusEffectSystem !== "undefined") {
        ElementStatusEffectSystem.setStatusText(opponent, "吞噬处决");
      }
      return;
    }

    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.setStatusText(opponent, "被吞噬");
    }

    fighter.iceRotCrazyFlashUntil = now + IceRotConstants.CRAZY_BURST_FLASH_MS;
  }

  static tick(fighter, opponent, now) {
    if (!IceRotSkillSystem.isIceRotFighter(fighter)) {
      return;
    }
    IceRotSkillSystem.tickCrazyBurst(fighter, opponent, now);
  }

  static draw(ctx, fighter) {
    if (!IceRotSkillSystem.isIceRotFighter(fighter)) {
      return;
    }

    if (IceRotSkillSystem.isCrazyBurst(fighter)) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(224, 49, 49, 0.55)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("狂暴", fighter.x, fighter.y - fighter.radius - 20);
      ctx.textAlign = "left";
    }

    if (fighter.iceRotSwallowing) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(15, 152, 173, 0.35)";
      ctx.fill();
      ctx.fillStyle = "#99e9f2";
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("吞噬", fighter.x, fighter.y + fighter.radius + 22);
      ctx.textAlign = "left";
    }

    if (Date.now() < fighter.iceRotCrazyFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 14, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(34, 184, 207, 0.45)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}
