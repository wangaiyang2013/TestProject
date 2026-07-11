/**
 * 巨齿球 - 周身环绕巨齿，敌人触碰巨齿受到高额伤害并开始流血
 */

const GiantTeethBallConstants = {
  /** 环绕巨齿数量 */
  TOOTH_COUNT: 12,
  /** 巨齿轨道相对球体半径的外扩距离 */
  ORBIT_OFFSET: 14,
  /** 单颗巨齿碰撞半径 */
  TOOTH_HIT_RADIUS: 10,
  /** 巨齿环绕角速度 */
  ORBIT_SPEED: 0.055,
  /** 同一敌人再次受巨齿伤害的最小间隔（毫秒） */
  HIT_INTERVAL_MS: 500,
  /** 触碰伤害（模板未指定 skillDamage 时使用） */
  DEFAULT_SKILL_DAMAGE: 28,
  /** 命中闪光时长 */
  HIT_FLASH_MS: 280,
  /** 巨齿尖端相对轨道半径的外伸长度 */
  TOOTH_TIP_LENGTH: 9,
};

/**
 * 巨齿球技能系统
 */
class GiantTeethSkillSystem {
  static isGiantTeethFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.GIANT_TEETH;
  }

  static initFighter(fighter) {
    fighter.giantTeethOrbitAngle = 0;
    fighter.giantTeethLastHitByTarget = {};
    fighter.giantTeethHitFlashUntil = 0;
  }

  static getOrbitRadius(fighter) {
    return fighter.radius + GiantTeethBallConstants.ORBIT_OFFSET;
  }

  static getToothPositions(fighter) {
    const orbitRadius = GiantTeethSkillSystem.getOrbitRadius(fighter);
    const positions = [];
    const step = (Math.PI * 2) / GiantTeethBallConstants.TOOTH_COUNT;

    for (let index = 0; index < GiantTeethBallConstants.TOOTH_COUNT; index += 1) {
      const angle = fighter.giantTeethOrbitAngle + step * index;
      positions.push({
        x: fighter.x + Math.cos(angle) * orbitRadius,
        y: fighter.y + Math.sin(angle) * orbitRadius,
        angle,
      });
    }

    return positions;
  }

  static getSkillDamage(fighter) {
    const amount =
      typeof fighter.getSkillDamage === "function"
        ? fighter.getSkillDamage()
        : fighter.template.skillDamage;
    return Math.max(
      1,
      Math.round(amount || GiantTeethBallConstants.DEFAULT_SKILL_DAMAGE)
    );
  }

  static getHitIntervalMs(fighter) {
    if (typeof CrazyFightSkillSystem !== "undefined") {
      return CrazyFightSkillSystem.getSkillIntervalMs(
        fighter,
        GiantTeethBallConstants.HIT_INTERVAL_MS
      );
    }
    return GiantTeethBallConstants.HIT_INTERVAL_MS;
  }

  static isToothHittingOpponent(tooth, opponent) {
    return CollisionDetector.circleHitsCircle(
      tooth.x,
      tooth.y,
      GiantTeethBallConstants.TOOTH_HIT_RADIUS,
      opponent.x,
      opponent.y,
      opponent.radius
    );
  }

  static applyToothHit(fighter, opponent, damage, now) {
    opponent.takeDamage(damage, fighter);
    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.applyBleed(opponent);
    }
    fighter.giantTeethHitFlashUntil =
      now + GiantTeethBallConstants.HIT_FLASH_MS;
  }

  static tick(fighter, allFighters, game, now) {
    if (!GiantTeethSkillSystem.isGiantTeethFighter(fighter) || !fighter.isAlive()) {
      return;
    }

    fighter.giantTeethOrbitAngle += GiantTeethBallConstants.ORBIT_SPEED;

    const opponents = HeroBattleArenaHelper.getAliveOpponents(
      fighter,
      allFighters,
      game
    );
    if (opponents.length === 0) {
      return;
    }

    const teeth = GiantTeethSkillSystem.getToothPositions(fighter);
    const damage = GiantTeethSkillSystem.getSkillDamage(fighter);
    const hitInterval = GiantTeethSkillSystem.getHitIntervalMs(fighter);

    for (const opponent of opponents) {
      let touchingTooth = false;
      for (const tooth of teeth) {
        if (GiantTeethSkillSystem.isToothHittingOpponent(tooth, opponent)) {
          touchingTooth = true;
          break;
        }
      }
      if (!touchingTooth) {
        continue;
      }

      const lastHitTime =
        fighter.giantTeethLastHitByTarget[opponent.playerId] || 0;
      if (now - lastHitTime < hitInterval) {
        continue;
      }

      fighter.giantTeethLastHitByTarget[opponent.playerId] = now;
      GiantTeethSkillSystem.applyToothHit(fighter, opponent, damage, now);
    }
  }

  static drawTooth(ctx, tooth) {
    const tipLength = GiantTeethBallConstants.TOOTH_TIP_LENGTH;
    const baseAngle = tooth.angle + Math.PI;
    const leftAngle = baseAngle - 0.42;
    const rightAngle = baseAngle + 0.42;
    const baseX = tooth.x;
    const baseY = tooth.y;
    const tipX = tooth.x + Math.cos(baseAngle) * tipLength;
    const tipY = tooth.y + Math.sin(baseAngle) * tipLength;
    const leftX = tooth.x + Math.cos(leftAngle) * (tipLength * 0.55);
    const leftY = tooth.y + Math.sin(leftAngle) * (tipLength * 0.55);
    const rightX = tooth.x + Math.cos(rightAngle) * (tipLength * 0.55);
    const rightY = tooth.y + Math.sin(rightAngle) * (tipLength * 0.55);

    ctx.beginPath();
    ctx.moveTo(leftX, leftY);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
    ctx.fillStyle = "#ffe3e3";
    ctx.fill();
    ctx.strokeStyle = "#c92a2a";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(baseX, baseY, GiantTeethBallConstants.TOOTH_HIT_RADIUS * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "#ff6b6b";
    ctx.fill();
  }

  static draw(ctx, fighter) {
    if (!GiantTeethSkillSystem.isGiantTeethFighter(fighter)) {
      return;
    }

    const teeth = GiantTeethSkillSystem.getToothPositions(fighter);
    const orbitRadius = GiantTeethSkillSystem.getOrbitRadius(fighter);
    const now = Date.now();

    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, orbitRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(201, 42, 42, 0.22)";
    ctx.lineWidth = 2;
    ctx.stroke();

    for (const tooth of teeth) {
      GiantTeethSkillSystem.drawTooth(ctx, tooth);
    }

    if (now < fighter.giantTeethHitFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, orbitRadius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 107, 107, 0.75)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}
