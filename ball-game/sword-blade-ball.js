/**
 * 劍刃球 - 敌人靠近时挥剑劈砍并吸血；每 20 秒无敌并释放元素弹，元素弹结束后无敌消失
 */

const SwordBladeConstants = {
  /** 挥剑冷却（毫秒） */
  SLASH_INTERVAL_MS: 900,
  /** 近距判定：米 */
  APPROACH_RANGE_METERS: 2.4,
  METERS_TO_RADIUS_FACTOR: 4.5,
  /** 敌人朝劍刃球移动的最小速度分量 */
  APPROACH_MIN_SPEED: 0.35,
  /** 劈砍伤害倍率（基于 skillDamage） */
  SLASH_DAMAGE_MULTIPLIER: 1.35,
  /** 吸血比例：按造成伤害回复生命 */
  LIFESTEAL_RATIO: 0.4,
  /** 大招间隔：无敌 + 元素弹 */
  ULT_INTERVAL_MS: 20000,
  SLASH_FLASH_MS: 320,
  INVINCIBLE_RING_PULSE_MS: 600,
  ULT_FLASH_MS: 400,
};

/**
 * 劍刃球近距判定
 */
class SwordBladeRangeHelper {
  static metersToPixels(meters, ballRadius) {
    return (
      meters * ballRadius * SwordBladeConstants.METERS_TO_RADIUS_FACTOR
    );
  }

  static getApproachRangePixels(ballRadius) {
    return SwordBladeRangeHelper.metersToPixels(
      SwordBladeConstants.APPROACH_RANGE_METERS,
      ballRadius
    );
  }
}

/**
 * 劍刃球技能系统
 */
class SwordBladeSkillSystem {
  static isSwordFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.SWORD_BLADE;
  }

  static initFighter(fighter) {
    fighter.swordBladeSlashFlashUntil = 0;
    fighter.swordBladeSlashAngle = 0;
    fighter.swordBladeInvincible = false;
    fighter.lastSwordSlashTime = 0;
    fighter.swordBladeUltFlashUntil = 0;
    fighter.swordBladeLifestealTextUntil = 0;
  }

  static isInvincible(fighter) {
    return (
      SwordBladeSkillSystem.isSwordFighter(fighter) &&
      fighter.swordBladeInvincible === true
    );
  }

  /**
   * 敌人是否在靠近劍刃球（近距 + 朝本体移动）
   */
  static isEnemyApproaching(fighter, opponent) {
    if (!opponent || !opponent.isAlive()) {
      return false;
    }

    const dx = fighter.x - opponent.x;
    const dy = fighter.y - opponent.y;
    const dist = Math.hypot(dx, dy);
    const maxRange = SwordBladeRangeHelper.getApproachRangePixels(fighter.radius);

    if (dist > maxRange) {
      return false;
    }

    if (dist < fighter.radius + opponent.radius + 4) {
      return true;
    }

    if (dist < 0.001) {
      return true;
    }

    const towardSpeed = (opponent.vx * dx + opponent.vy * dy) / dist;
    return towardSpeed >= SwordBladeConstants.APPROACH_MIN_SPEED;
  }

  static computeSlashDamage(fighter) {
    const base = fighter.template.skillDamage;
    return Math.round(base * SwordBladeConstants.SLASH_DAMAGE_MULTIPLIER);
  }

  static canSlash(fighter, now) {
    return now - fighter.lastSwordSlashTime >= SwordBladeConstants.SLASH_INTERVAL_MS;
  }

  static tickApproachSlash(fighter, opponent, now) {
    if (!SwordBladeSkillSystem.isSwordFighter(fighter)) {
      return;
    }
    if (!opponent || !opponent.isAlive()) {
      return;
    }
    if (!SwordBladeSkillSystem.isEnemyApproaching(fighter, opponent)) {
      return;
    }
    if (!SwordBladeSkillSystem.canSlash(fighter, now)) {
      return;
    }

    fighter.lastSwordSlashTime = now;
    SwordBladeSkillSystem.fireSlash(fighter, opponent);
  }

  static fireSlash(fighter, opponent) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }

    const nx = dx / dist;
    const ny = dy / dist;
    const damage = SwordBladeSkillSystem.computeSlashDamage(fighter);

    fighter.swordBladeSlashAngle = Math.atan2(dy, dx);
    fighter.swordBladeSlashFlashUntil =
      Date.now() + SwordBladeConstants.SLASH_FLASH_MS;

    opponent.takeDamage(damage, fighter);
    const heal = Math.round(damage * SwordBladeConstants.LIFESTEAL_RATIO);
    if (heal > 0) {
      fighter.health = Math.min(fighter.maxHealth, fighter.health + heal);
      fighter.swordBladeLifestealTextUntil = Date.now() + 700;
    }

    opponent.vx += nx * 2.8;
    opponent.vy += ny * 2.8;
    fighter.vx -= nx * 0.8;
    fighter.vy -= ny * 0.8;
    ContinuousBouncePhysics.maintainSpeed(fighter);
    ContinuousBouncePhysics.maintainSpeed(opponent);
  }

  static activateUltimate(fighter) {
    fighter.swordBladeInvincible = true;
    fighter.swordBladeUltFlashUntil =
      Date.now() + SwordBladeConstants.ULT_FLASH_MS;
    ElementBurstSystem.summonOrbitBullets(
      fighter,
      fighter.template.skillDamage
    );
    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.setStatusText(fighter, "无敌元素");
    }
  }

  /**
   * 元素弹全部消失后结束无敌；对手阵亡时立即清除环绕弹
   */
  static tickInvincibility(fighter, opponent) {
    if (!SwordBladeSkillSystem.isInvincible(fighter)) {
      return;
    }

    const bullets = fighter.elementOrbitBullets || [];

    if (opponent && !opponent.isAlive()) {
      for (const bullet of bullets) {
        bullet.alive = false;
      }
      fighter.elementOrbitBullets = [];
      fighter.swordBladeInvincible = false;
      return;
    }

    const hasAliveBullets = bullets.some((bullet) => bullet.alive);
    if (!hasAliveBullets) {
      fighter.swordBladeInvincible = false;
    }
  }

  static drawApproachRange(ctx, fighter) {
    const range = SwordBladeRangeHelper.getApproachRangePixels(fighter.radius);
    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, range, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(51, 154, 240, 0.22)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  static drawSlash(ctx, fighter) {
    if (Date.now() >= fighter.swordBladeSlashFlashUntil) {
      return;
    }

    const reach = fighter.radius + 40;
    const arcSpan = Math.PI * 0.6;
    const angle = fighter.swordBladeSlashAngle;
    const startAngle = angle - arcSpan / 2;
    const endAngle = angle + arcSpan / 2;

    ctx.strokeStyle = "rgba(116, 192, 252, 0.9)";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, reach, startAngle, endAngle);
    ctx.stroke();

    ctx.strokeStyle = "#339af0";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(
      fighter.x + Math.cos(angle) * fighter.radius,
      fighter.y + Math.sin(angle) * fighter.radius
    );
    ctx.lineTo(
      fighter.x + Math.cos(angle) * reach,
      fighter.y + Math.sin(angle) * reach
    );
    ctx.stroke();
  }

  static drawInvincibleRing(ctx, fighter) {
    if (!SwordBladeSkillSystem.isInvincible(fighter)) {
      return;
    }

    const pulse =
      0.5 +
      0.5 *
        Math.sin(
          (Date.now() % SwordBladeConstants.INVINCIBLE_RING_PULSE_MS) /
            (SwordBladeConstants.INVINCIBLE_RING_PULSE_MS / (Math.PI * 2))
        );

    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.radius + 14 + pulse * 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 212, 59, ${0.55 + pulse * 0.35})`;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#ffd43b";
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("无敌", fighter.x, fighter.y - fighter.radius - 22);
    ctx.textAlign = "left";
  }

  static drawLifestealText(ctx, fighter) {
    if (Date.now() >= fighter.swordBladeLifestealTextUntil) {
      return;
    }
    ctx.fillStyle = "#51cf66";
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("吸血", fighter.x, fighter.y + fighter.radius + 24);
    ctx.textAlign = "left";
  }

  static draw(ctx, fighter) {
    if (!SwordBladeSkillSystem.isSwordFighter(fighter)) {
      return;
    }

    SwordBladeSkillSystem.drawApproachRange(ctx, fighter);
    SwordBladeSkillSystem.drawInvincibleRing(ctx, fighter);
    SwordBladeSkillSystem.drawSlash(ctx, fighter);
    SwordBladeSkillSystem.drawLifestealText(ctx, fighter);

    if (Date.now() < fighter.swordBladeUltFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 18, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(151, 117, 250, 0.7)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ElementBurstSystem.drawBurstFlash(ctx, fighter);
    ElementBurstSystem.drawOrbitBullets(ctx, fighter);
  }
}
