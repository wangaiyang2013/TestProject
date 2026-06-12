/**
 * 磁铁球 - 吸附敌方投射物化为盾牌；触碰反弹或超时环射
 */

const MagnetBallConstants = {
  ABSORB_WINDOW_MS: 10000,
  SKILL_LOCKOUT_MS: 15000,
  SHIELD_ORBIT_RADIUS: 54,
  SHIELD_ORBIT_SPEED: 0.055,
  ABSORB_CAPTURE_RADIUS: 60,
  MAX_SHIELD_COUNT: 14,
  BURST_RING_SPEED: 10,
  BURST_RING_LIFETIME_MS: 1400,
  BURST_RING_RADIUS: 11,
  CONTACT_FLASH_MS: 320,
  BURST_FLASH_MS: 360,
  HEAD_MAGNET_WIDTH: 28,
  HEAD_MAGNET_HEIGHT: 22,
  HEAD_THROW_SPEED: 12,
  HEAD_THROW_RADIUS: 14,
  HEAD_THROW_LIFETIME_MS: 1800,
  HEAD_RETURN_SPEED: 14,
  HEAD_THROW_HIT_FLASH_MS: 280,
};

/**
 * 被吸附投射物的伤害效果类型
 */
class MagnetProjectileEffectKind {
  static SHOT = "shot";

  static FLAME = "flame";

  static NUMBER = "number";

  static SUNGLASSES = "sunglasses";

  static CRIT = "crit";
}

/**
 * 磁铁盾电荷（由敌方投射物转化）
 */
class MagnetShieldCharge {
  constructor(effectKind, damage, color, originalOwnerId, orbitAngle) {
    this.effectKind = effectKind;
    this.damage = damage;
    this.color = color;
    this.originalOwnerId = originalOwnerId;
    this.orbitAngle = orbitAngle;
  }
}

/**
 * 磁铁环射弹（超时释放的一圈投射物）
 */
class MagnetBurstProjectile {
  constructor(x, y, dirX, dirY, charge, magnetOwner) {
    this.x = x;
    this.y = y;
    this.dirX = dirX;
    this.dirY = dirY;
    this.radius = MagnetBallConstants.BURST_RING_RADIUS;
    this.charge = charge;
    this.magnetOwner = magnetOwner;
    this.magnetOwnerId = magnetOwner.playerId;
    this.alive = true;
    this.spawnTime = Date.now();
  }

  update() {
    this.x += this.dirX * MagnetBallConstants.BURST_RING_SPEED;
    this.y += this.dirY * MagnetBallConstants.BURST_RING_SPEED;
    if (
      Date.now() - this.spawnTime >
      MagnetBallConstants.BURST_RING_LIFETIME_MS
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
    ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = this.charge.color + "55";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.charge.color;
    ctx.fill();
    ctx.strokeStyle = "#ffd43b";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * 近战英雄判定（不发射飞行投射物）
 */
class MeleeHeroClassifier {
  static isMeleeFighter(fighter) {
    if (!fighter || !fighter.template) {
      return false;
    }
    return MeleeHeroClassifier.isMeleeSkillType(fighter.template.skillType);
  }

  static isMeleeSkillType(skillType) {
    return (
      skillType === HeroSkillType.BUMP ||
      skillType === HeroSkillType.IRON_WALL ||
      skillType === HeroSkillType.BOXING ||
      skillType === HeroSkillType.SPIKE ||
      skillType === HeroSkillType.BROKEN_BLADE
    );
  }
}

/**
 * 头上磁铁投掷物（对战近战球时使用）
 */
class MagnetHeadThrowProjectile {
  constructor(owner, opponent, damage) {
    this.owner = owner;
    this.ownerId = owner.playerId;
    this.opponent = opponent;
    this.damage = damage;
    this.radius = MagnetBallConstants.HEAD_THROW_RADIUS;
    this.x = owner.x;
    this.y = owner.y - owner.radius - 10;
    this.alive = true;
    this.isReturning = false;
    this.hasHit = false;
    this.spawnTime = Date.now();
    this.dirX = 1;
    this.dirY = 0;
    this.refreshDirection();
  }

  refreshDirection() {
    const target = this.isReturning ? this.owner : this.opponent;
    if (!target || !target.isAlive()) {
      this.alive = false;
      return;
    }

    const targetX = this.isReturning
      ? target.x
      : target.x;
    const targetY = this.isReturning
      ? target.y - target.radius - 10
      : target.y;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }
    this.dirX = dx / dist;
    this.dirY = dy / dist;
  }

  update() {
    if (!this.alive) {
      return;
    }

    if (Date.now() - this.spawnTime > MagnetBallConstants.HEAD_THROW_LIFETIME_MS) {
      this.alive = false;
      return;
    }

    this.refreshDirection();
    const speed = this.isReturning
      ? MagnetBallConstants.HEAD_RETURN_SPEED
      : MagnetBallConstants.HEAD_THROW_SPEED;
    this.x += this.dirX * speed;
    this.y += this.dirY * speed;

    if (!this.isReturning && this.opponent && this.opponent.isAlive()) {
      if (
        CollisionDetector.circleHitsCircle(
          this.x,
          this.y,
          this.radius,
          this.opponent.x,
          this.opponent.y,
          this.opponent.radius
        )
      ) {
        this.opponent.takeDamage(this.damage, this.owner);
        this.owner.magnetHeadHitFlashUntil =
          Date.now() + MagnetBallConstants.HEAD_THROW_HIT_FLASH_MS;
        this.hasHit = true;
        this.isReturning = true;
      }
      return;
    }

    if (this.isReturning && this.owner && this.owner.isAlive()) {
      const homeX = this.owner.x;
      const homeY = this.owner.y - this.owner.radius - 10;
      const distHome = Math.hypot(homeX - this.x, homeY - this.y);
      if (distHome < this.radius + 8) {
        this.alive = false;
        this.owner.magnetHeadThrown = false;
        this.owner.magnetHeadProjectile = null;
      }
    }
  }

  draw(ctx) {
    const w = MagnetBallConstants.HEAD_MAGNET_WIDTH * 0.85;
    const h = MagnetBallConstants.HEAD_MAGNET_HEIGHT * 0.85;
    const poleW = w * 0.22;

    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = "#5c0a0a";
    ctx.strokeStyle = "#2b0505";
    ctx.lineWidth = 2;
    ctx.fillRect(-w / 2, -h * 0.35, poleW, h * 0.7);
    ctx.strokeRect(-w / 2, -h * 0.35, poleW, h * 0.7);
    ctx.fillRect(w / 2 - poleW, -h * 0.35, poleW, h * 0.7);
    ctx.strokeRect(w / 2 - poleW, -h * 0.35, poleW, h * 0.7);

    ctx.beginPath();
    ctx.arc(-w / 2 + poleW / 2, h * 0.38, poleW * 0.95, 0, Math.PI, false);
    ctx.arc(w / 2 - poleW / 2, h * 0.38, poleW * 0.95, Math.PI, 0, false);
    ctx.closePath();
    ctx.fillStyle = "#8b0000";
    ctx.fill();
    ctx.strokeStyle = "#3b0000";
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * 磁铁盾效果结算
 */
class MagnetShieldEffectApplier {
  static applyCharge(charge, magnetOwner, target, allFighters) {
    if (!charge || !target || !target.isAlive()) {
      return;
    }

    const attacker = magnetOwner;

    if (charge.effectKind === MagnetProjectileEffectKind.FLAME) {
      target.takeDamage(charge.damage, attacker);
      if (typeof ElementStatusEffectSystem !== "undefined") {
        ElementStatusEffectSystem.applyBurn(target);
      }
      return;
    }

    if (charge.effectKind === MagnetProjectileEffectKind.CRIT) {
      const critDamage = Math.round(charge.damage * 2);
      target.takeDamage(critDamage, attacker);
      if (typeof IronWallSkillSystem !== "undefined") {
        IronWallSkillSystem.markCriticalStrike(attacker, target);
      }
      return;
    }

    if (charge.effectKind === MagnetProjectileEffectKind.NUMBER) {
      target.takeDamage(charge.damage, attacker);
      return;
    }

    target.takeDamage(charge.damage, attacker);
  }

  static applyAllCharges(charges, magnetOwner, target, allFighters) {
    for (const charge of charges) {
      MagnetShieldEffectApplier.applyCharge(
        charge,
        magnetOwner,
        target,
        allFighters
      );
    }
  }
}

/**
 * 磁铁球技能系统
 */
class MagnetSkillSystem {
  static initFighter(fighter) {
    fighter.magnetShields = [];
    fighter.magnetModeUntil = 0;
    fighter.magnetSkillLockedUntil = 0;
    fighter.magnetContactFlashUntil = 0;
    fighter.magnetBurstFlashUntil = 0;
    fighter.magnetEnemyTouchedDuringMode = false;
    fighter.magnetBurstProjectiles = [];
    fighter.magnetHeadThrown = false;
    fighter.magnetHeadProjectile = null;
    fighter.magnetHeadHitFlashUntil = 0;
    fighter.magnetVsMelee = false;
  }

  static isMagnetFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.MAGNET;
  }

  static isMagnetModeActive(fighter, now) {
    return (
      MagnetSkillSystem.isMagnetFighter(fighter) &&
      fighter.magnetModeUntil > 0 &&
      now < fighter.magnetModeUntil
    );
  }

  static canActivate(fighter, now) {
    if (!MagnetSkillSystem.isMagnetFighter(fighter)) {
      return false;
    }
    if (now < fighter.magnetSkillLockedUntil) {
      return false;
    }
    if (MagnetSkillSystem.isMagnetModeActive(fighter, now)) {
      return false;
    }
    return fighter.canUseSkill(now);
  }

  static activate(fighter, opponent, now) {
    fighter.magnetShields = [];
    fighter.magnetModeUntil = now + MagnetBallConstants.ABSORB_WINDOW_MS;
    fighter.magnetEnemyTouchedDuringMode = false;
    fighter.magnetContactFlashUntil = now + MagnetBallConstants.CONTACT_FLASH_MS;
    fighter.magnetVsMelee = MeleeHeroClassifier.isMeleeFighter(opponent);

    if (fighter.magnetVsMelee) {
      MagnetSkillSystem.throwHeadMagnet(fighter, opponent);
    }
  }

  static throwHeadMagnet(fighter, opponent) {
    if (!opponent || !opponent.isAlive()) {
      return;
    }
    if (fighter.magnetHeadThrown && fighter.magnetHeadProjectile) {
      return;
    }

    const damage = fighter.template.skillDamage;
    fighter.magnetHeadThrown = true;
    fighter.magnetHeadProjectile = new MagnetHeadThrowProjectile(
      fighter,
      opponent,
      damage
    );
  }

  static updateHeadThrow(fighter) {
    if (!fighter.magnetHeadProjectile) {
      return;
    }

    fighter.magnetHeadProjectile.update();
    if (!fighter.magnetHeadProjectile.alive) {
      fighter.magnetHeadProjectile = null;
      fighter.magnetHeadThrown = false;
    }
  }

  static captureFromProjectile(proj, magnetOwner) {
    if (proj instanceof TeacherNumberProjectile) {
      return new MagnetShieldCharge(
        MagnetProjectileEffectKind.NUMBER,
        proj.numberValue,
        "#748ffc",
        proj.ownerId,
        Math.random() * Math.PI * 2
      );
    }

    if (proj instanceof FlamethrowerProjectile) {
      return new MagnetShieldCharge(
        MagnetProjectileEffectKind.FLAME,
        proj.damage,
        "#ff922b",
        proj.ownerId,
        Math.random() * Math.PI * 2
      );
    }

    if (proj instanceof SunglassesProjectile) {
      const damage = proj.isReturning
        ? proj.returnDamage
        : proj.outboundDamage;
      return new MagnetShieldCharge(
        MagnetProjectileEffectKind.SUNGLASSES,
        damage,
        "#495057",
        proj.ownerId,
        Math.random() * Math.PI * 2
      );
    }

    if (proj instanceof HeroSkillProjectile) {
      const isCritColor = proj.color === "#ffc078";
      return new MagnetShieldCharge(
        isCritColor
          ? MagnetProjectileEffectKind.CRIT
          : MagnetProjectileEffectKind.SHOT,
        proj.damage,
        proj.color,
        proj.ownerId,
        Math.random() * Math.PI * 2
      );
    }

    return null;
  }

  static tryAbsorbProjectiles(fighter, projectiles, now) {
    if (!MagnetSkillSystem.isMagnetModeActive(fighter, now)) {
      return;
    }
    if (fighter.magnetShields.length >= MagnetBallConstants.MAX_SHIELD_COUNT) {
      return;
    }

    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      const proj = projectiles[i];
      if (!proj || !proj.alive) {
        continue;
      }
      if (proj.ownerId === fighter.playerId) {
        continue;
      }

      const captureRadius =
        fighter.radius + MagnetBallConstants.ABSORB_CAPTURE_RADIUS;
      const hitX = proj.x !== undefined ? proj.x : fighter.x;
      const hitY = proj.y !== undefined ? proj.y : fighter.y;
      const projRadius = proj.radius || 8;

      if (
        !CollisionDetector.circleHitsCircle(
          fighter.x,
          fighter.y,
          captureRadius,
          hitX,
          hitY,
          projRadius
        )
      ) {
        continue;
      }

      const charge = MagnetSkillSystem.captureFromProjectile(proj, fighter);
      if (!charge) {
        continue;
      }

      fighter.magnetShields.push(charge);
      proj.alive = false;
      projectiles.splice(i, 1);

      if (fighter.magnetShields.length >= MagnetBallConstants.MAX_SHIELD_COUNT) {
        break;
      }
    }
  }

  static areBallsTouching(a, b) {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    return dist < a.radius + b.radius;
  }

  static onBallContact(magnetFighter, otherFighter, allFighters, now) {
    if (!MagnetSkillSystem.isMagnetFighter(magnetFighter)) {
      return;
    }
    if (!MagnetSkillSystem.isMagnetModeActive(magnetFighter, now)) {
      return;
    }
    if (!otherFighter || !otherFighter.isAlive()) {
      return;
    }
    if (magnetFighter.magnetShields.length === 0) {
      return;
    }
    if (!MagnetSkillSystem.areBallsTouching(magnetFighter, otherFighter)) {
      return;
    }

    MagnetShieldEffectApplier.applyAllCharges(
      magnetFighter.magnetShields,
      magnetFighter,
      otherFighter,
      allFighters
    );

    magnetFighter.magnetEnemyTouchedDuringMode = true;
    magnetFighter.magnetShields = [];
    magnetFighter.magnetModeUntil = 0;
    magnetFighter.magnetContactFlashUntil =
      now + MagnetBallConstants.CONTACT_FLASH_MS;
  }

  static releaseBurstRing(fighter, now) {
    if (fighter.magnetShields.length === 0) {
      return;
    }

    const count = fighter.magnetShields.length;
    for (let i = 0; i < count; i += 1) {
      const charge = fighter.magnetShields[i];
      const angle = (Math.PI * 2 * i) / count;
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      const offset = fighter.radius + MagnetBallConstants.BURST_RING_RADIUS + 4;
      fighter.magnetBurstProjectiles.push(
        new MagnetBurstProjectile(
          fighter.x + dirX * offset,
          fighter.y + dirY * offset,
          dirX,
          dirY,
          charge,
          fighter
        )
      );
    }

    fighter.magnetShields = [];
    fighter.magnetModeUntil = 0;
    fighter.magnetSkillLockedUntil = now + MagnetBallConstants.SKILL_LOCKOUT_MS;
    fighter.magnetBurstFlashUntil = now + MagnetBallConstants.BURST_FLASH_MS;
  }

  static updateBurstProjectiles(fighter, opponent, allFighters, arena) {
    if (!fighter.magnetBurstProjectiles) {
      return;
    }

    for (let i = fighter.magnetBurstProjectiles.length - 1; i >= 0; i -= 1) {
      const burstProj = fighter.magnetBurstProjectiles[i];
      burstProj.update();

      if (!burstProj.alive || burstProj.isOutOfBounds(arena)) {
        fighter.magnetBurstProjectiles.splice(i, 1);
        continue;
      }

      if (!opponent || !opponent.isAlive()) {
        continue;
      }

      if (
        CollisionDetector.circleHitsCircle(
          burstProj.x,
          burstProj.y,
          burstProj.radius,
          opponent.x,
          opponent.y,
          opponent.radius
        )
      ) {
        MagnetShieldEffectApplier.applyCharge(
          burstProj.charge,
          fighter,
          opponent,
          allFighters
        );
        fighter.magnetBurstProjectiles.splice(i, 1);
      }
    }
  }

  static tick(fighter, opponent, projectiles, allFighters, arena, now) {
    if (!MagnetSkillSystem.isMagnetFighter(fighter)) {
      return;
    }

    MagnetSkillSystem.tryAbsorbProjectiles(fighter, projectiles, now);

    if (
      fighter.magnetModeUntil > 0 &&
      now >= fighter.magnetModeUntil &&
      !fighter.magnetEnemyTouchedDuringMode
    ) {
      if (fighter.magnetShields.length > 0) {
        MagnetSkillSystem.releaseBurstRing(fighter, now);
      } else if (fighter.magnetVsMelee) {
        MagnetSkillSystem.throwHeadMagnet(fighter, opponent);
        fighter.magnetModeUntil = 0;
      } else {
        fighter.magnetModeUntil = 0;
      }
    }

    MagnetSkillSystem.updateHeadThrow(fighter);

    MagnetSkillSystem.updateBurstProjectiles(
      fighter,
      opponent,
      allFighters,
      arena
    );

    for (let i = 0; i < fighter.magnetShields.length; i += 1) {
      fighter.magnetShields[i].orbitAngle +=
        MagnetBallConstants.SHIELD_ORBIT_SPEED;
    }
  }

  static drawHeadMagnet(ctx, fighter) {
    if (fighter.magnetHeadProjectile && fighter.magnetHeadProjectile.alive) {
      fighter.magnetHeadProjectile.draw(ctx);
    }

    if (fighter.magnetHeadThrown) {
      return;
    }

    const y = fighter.y - fighter.radius - 10;
    const w = MagnetBallConstants.HEAD_MAGNET_WIDTH;
    const h = MagnetBallConstants.HEAD_MAGNET_HEIGHT;
    const poleW = w * 0.22;

    ctx.save();
    ctx.translate(fighter.x, y);

    ctx.fillStyle = "#5c0a0a";
    ctx.strokeStyle = "#2b0505";
    ctx.lineWidth = 2;

    ctx.fillRect(-w / 2, -h * 0.35, poleW, h * 0.7);
    ctx.strokeRect(-w / 2, -h * 0.35, poleW, h * 0.7);

    ctx.fillRect(w / 2 - poleW, -h * 0.35, poleW, h * 0.7);
    ctx.strokeRect(w / 2 - poleW, -h * 0.35, poleW, h * 0.7);

    ctx.beginPath();
    ctx.arc(-w / 2 + poleW / 2, h * 0.38, poleW * 0.95, 0, Math.PI, false);
    ctx.arc(w / 2 - poleW / 2, h * 0.38, poleW * 0.95, Math.PI, 0, false);
    ctx.closePath();
    ctx.fillStyle = "#8b0000";
    ctx.fill();
    ctx.strokeStyle = "#3b0000";
    ctx.stroke();

    ctx.fillStyle = "#ff6b6b";
    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("N", -w / 2 + poleW / 2, h * 0.2);
    ctx.fillText("S", w / 2 - poleW / 2, h * 0.2);
    ctx.textAlign = "left";

    ctx.restore();
  }

  static drawShields(ctx, fighter) {
    const now = Date.now();

    if (now < fighter.magnetHeadHitFlashUntil) {
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("磁铁命中!", fighter.x, fighter.y - fighter.radius - 28);
      ctx.textAlign = "left";
    }

    if (!fighter.magnetShields || fighter.magnetShields.length === 0) {
      if (fighter.magnetBurstProjectiles) {
        for (const burstProj of fighter.magnetBurstProjectiles) {
          burstProj.draw(ctx);
        }
      }
      if (now < fighter.magnetBurstFlashUntil) {
        ctx.beginPath();
        ctx.arc(fighter.x, fighter.y, fighter.radius + 20, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 146, 43, 0.65)";
        ctx.lineWidth = 4;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (now < fighter.magnetSkillLockedUntil) {
        ctx.fillStyle = "rgba(173, 181, 189, 0.85)";
        ctx.font = "9px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("磁能冷却", fighter.x, fighter.y + fighter.radius + 28);
        ctx.textAlign = "left";
      }
      return;
    }

    if (now < fighter.magnetContactFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 14, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 212, 59, 0.7)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    for (const charge of fighter.magnetShields) {
      const sx =
        fighter.x +
        Math.cos(charge.orbitAngle) * MagnetBallConstants.SHIELD_ORBIT_RADIUS;
      const sy =
        fighter.y +
        Math.sin(charge.orbitAngle) * MagnetBallConstants.SHIELD_ORBIT_RADIUS;

      ctx.beginPath();
      ctx.arc(sx, sy, 10, 0, Math.PI * 2);
      ctx.fillStyle = charge.color;
      ctx.fill();
      ctx.strokeStyle = "#ffd43b";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (fighter.magnetBurstProjectiles) {
      for (const burstProj of fighter.magnetBurstProjectiles) {
        burstProj.draw(ctx);
      }
    }

    if (now < fighter.magnetBurstFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 20, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 146, 43, 0.65)";
      ctx.lineWidth = 4;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (now < fighter.magnetSkillLockedUntil) {
      ctx.fillStyle = "rgba(173, 181, 189, 0.85)";
      ctx.font = "9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("磁能冷却", fighter.x, fighter.y + fighter.radius + 28);
      ctx.textAlign = "left";
    }
  }
}
