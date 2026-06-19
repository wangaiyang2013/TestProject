/**
 * 劍刃球 - 敌人进入挥剑范围时劈砍吸血；释放大招后无敌 20 秒并释放元素弹，无敌结束后 80 秒冷却
 */

const SwordBladeConstants = {
  /** 挥剑冷却（毫秒） */
  SLASH_INTERVAL_MS: 900,
  /** 挥剑有效距离：米（敌人进入此范围即挥剑） */
  SLASH_RANGE_METERS: 2.4,
  METERS_TO_RADIUS_FACTOR: 4.5,
  /** 劈砍伤害倍率（基于 skillDamage） */
  SLASH_DAMAGE_MULTIPLIER: 1.35,
  /** 吸血比例：按造成伤害回复生命 */
  LIFESTEAL_RATIO: 0.4,
  /** 无敌持续时间：固定 20 秒（与元素弹释放同时进行） */
  INVINCIBLE_DURATION_MS: 20000,
  /** 无敌结束后的的大招冷却时间 */
  ULT_COOLDOWN_AFTER_INVINCIBLE_MS: 80000,
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

  static getSlashRangePixels(ballRadius) {
    return SwordBladeRangeHelper.metersToPixels(
      SwordBladeConstants.SLASH_RANGE_METERS,
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
    fighter.swordBladeInvincibleUntil = 0;
    fighter.swordBladeNextUltAt = 0;
    fighter.lastSwordSlashTime = 0;
    fighter.swordBladeUltFlashUntil = 0;
    fighter.swordBladeLifestealTextUntil = 0;
  }

  static isInvincible(fighter) {
    return (
      SwordBladeSkillSystem.isSwordFighter(fighter) &&
      Date.now() < fighter.swordBladeInvincibleUntil
    );
  }

  static isUltOnCooldown(fighter, now) {
    return (
      SwordBladeSkillSystem.isSwordFighter(fighter) &&
      now < fighter.swordBladeNextUltAt &&
      !SwordBladeSkillSystem.isInvincible(fighter)
    );
  }

  static getUltCooldownRemainingSec(fighter, now) {
    if (!SwordBladeSkillSystem.isUltOnCooldown(fighter, now)) {
      return 0;
    }
    return Math.ceil((fighter.swordBladeNextUltAt - now) / 1000);
  }

  static canUseUltimate(fighter, now) {
    return (
      SwordBladeSkillSystem.isSwordFighter(fighter) &&
      now >= fighter.swordBladeNextUltAt
    );
  }

  /**
   * 敌人是否在挥剑范围内（进入范围即攻击，不要求朝本体移动）
   */
  static isEnemyInSlashRange(fighter, opponent) {
    if (!opponent || !opponent.isAlive()) {
      return false;
    }

    const dist = Math.hypot(opponent.x - fighter.x, opponent.y - fighter.y);
    const slashRange = SwordBladeRangeHelper.getSlashRangePixels(fighter.radius);
    return dist <= slashRange + opponent.radius;
  }

  static computeSlashDamage(fighter) {
    const base = fighter.template.skillDamage;
    return Math.round(base * SwordBladeConstants.SLASH_DAMAGE_MULTIPLIER);
  }

  static canSlash(fighter, now) {
    return now - fighter.lastSwordSlashTime >= SwordBladeConstants.SLASH_INTERVAL_MS;
  }

  static tickSlash(fighter, opponent, now) {
    if (!SwordBladeSkillSystem.isSwordFighter(fighter)) {
      return;
    }
    if (!opponent || !opponent.isAlive()) {
      return;
    }
    if (!SwordBladeSkillSystem.isEnemyInSlashRange(fighter, opponent)) {
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
    const now = Date.now();
    fighter.swordBladeInvincibleUntil =
      now + SwordBladeConstants.INVINCIBLE_DURATION_MS;
    fighter.swordBladeNextUltAt =
      now +
      SwordBladeConstants.INVINCIBLE_DURATION_MS +
      SwordBladeConstants.ULT_COOLDOWN_AFTER_INVINCIBLE_MS;
    fighter.swordBladeUltFlashUntil = now + SwordBladeConstants.ULT_FLASH_MS;
    ElementBurstSystem.summonOrbitBullets(
      fighter,
      fighter.template.skillDamage
    );
    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.setStatusText(fighter, "无敌元素");
    }
  }

  static drawSlashRange(ctx, fighter) {
    const range = SwordBladeRangeHelper.getSlashRangePixels(fighter.radius);
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

  static drawUltCooldownText(ctx, fighter) {
    const now = Date.now();
    if (!SwordBladeSkillSystem.isUltOnCooldown(fighter, now)) {
      return;
    }

    const remainingSec = SwordBladeSkillSystem.getUltCooldownRemainingSec(
      fighter,
      now
    );
    ctx.fillStyle = "#adb5bd";
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `大招冷却 ${remainingSec}s`,
      fighter.x,
      fighter.y - fighter.radius - 22
    );
    ctx.textAlign = "left";
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

    SwordBladeSkillSystem.drawSlashRange(ctx, fighter);
    SwordBladeSkillSystem.drawInvincibleRing(ctx, fighter);
    SwordBladeSkillSystem.drawUltCooldownText(ctx, fighter);
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
