/**
 * 健身球 - 贴身追击最近敌人，触碰近战攻击，不与墙壁或其他球体弹跳
 */

const FitnessBallConstants = {
  /** 触碰近战伤害间隔（毫秒） */
  CONTACT_DAMAGE_INTERVAL_MS: 700,
  CONTACT_HIT_FLASH_MS: 280,
  /** 与其他球体重叠时的最小分离力度 */
  SEPARATION_PUSH_STRENGTH: 1.2,
  CHASE_RING_PULSE_MS: 700,
};

/**
 * 健身球技能系统
 */
class FitnessBallSkillSystem {
  static isFitnessFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.FITNESS;
  }

  static initFighter(fighter) {
    fighter.fitnessHitFlashUntil = 0;
    fighter.fitnessLastHitByTarget = {};
  }

  static isOverlapping(fighterA, fighterB) {
    return CollisionDetector.circleHitsCircle(
      fighterA.x,
      fighterA.y,
      fighterA.radius,
      fighterB.x,
      fighterB.y,
      fighterB.radius
    );
  }

  static getChaseSpeed(fighter) {
    let speed = fighter.template.moveSpeed;
    if (typeof IceRotSkillSystem !== "undefined") {
      speed *= IceRotSkillSystem.getMoveSpeedRatio(fighter);
    }
    if (
      typeof DefenseBallSkillSystem !== "undefined" &&
      fighter.defenseRestrictUntil &&
      Date.now() < fighter.defenseRestrictUntil
    ) {
      speed *= fighter.defenseRestrictSpeedRatio || 1;
    }
    return speed;
  }

  static updateMovement(fighter, target, arena) {
    if (!target || !target.isAlive()) {
      fighter.vx *= 0.9;
      fighter.vy *= 0.9;
      FitnessBallSkillSystem.applyPosition(fighter, arena);
      return;
    }

    const dx = target.x - fighter.x;
    const dy = target.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }

    const speed = FitnessBallSkillSystem.getChaseSpeed(fighter);
    fighter.vx = (dx / dist) * speed;
    fighter.vy = (dy / dist) * speed;
    FitnessBallSkillSystem.applyPosition(fighter, arena);
  }

  static applyPosition(fighter, arena) {
    fighter.x += fighter.vx;
    fighter.y += fighter.vy;

    const radius = fighter.radius;
    if (fighter.x - radius < arena.left) {
      fighter.x = arena.left + radius;
    } else if (fighter.x + radius > arena.right) {
      fighter.x = arena.right - radius;
    }

    if (fighter.y - radius < arena.top) {
      fighter.y = arena.top + radius;
    } else if (fighter.y + radius > arena.bottom) {
      fighter.y = arena.bottom - radius;
    }
  }

  static getContactOpponents(fighter, allFighters, game) {
    let opponents = HeroBattleArenaHelper.getAliveOpponents(fighter, allFighters);
    if (game && typeof game.isTeamBattle === "function" && game.isTeamBattle()) {
      opponents = opponents.filter((opponent) =>
        HeroTeamRegistry.areEnemies(fighter.playerId, opponent.playerId)
      );
    }
    return opponents;
  }

  static tickContact(fighter, allFighters, game, now) {
    if (!FitnessBallSkillSystem.isFitnessFighter(fighter) || !fighter.isAlive()) {
      return;
    }
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isAttackBlocked(fighter)
    ) {
      return;
    }

    const opponents = FitnessBallSkillSystem.getContactOpponents(
      fighter,
      allFighters,
      game
    );

    for (const opponent of opponents) {
      if (!FitnessBallSkillSystem.isOverlapping(fighter, opponent)) {
        continue;
      }

      const lastHitTime = fighter.fitnessLastHitByTarget[opponent.playerId] || 0;
      if (now - lastHitTime < FitnessBallConstants.CONTACT_DAMAGE_INTERVAL_MS) {
        continue;
      }

      fighter.fitnessLastHitByTarget[opponent.playerId] = now;
      opponent.takeDamage(fighter.template.skillDamage, fighter);
      fighter.fitnessHitFlashUntil =
        now + FitnessBallConstants.CONTACT_HIT_FLASH_MS;

      if (typeof ElementStatusEffectSystem !== "undefined") {
        ElementStatusEffectSystem.setStatusText(opponent, "贴身打击");
      }
    }
  }

  /**
   * 健身球参与碰撞时仅做分离，不触发弹性反弹
   */
  static resolveContactPair(fighterA, fighterB, game) {
    const fitnessA = FitnessBallSkillSystem.isFitnessFighter(fighterA);
    const fitnessB = FitnessBallSkillSystem.isFitnessFighter(fighterB);
    if (!fitnessA && !fitnessB) {
      return false;
    }

    const dx = fighterB.x - fighterA.x;
    const dy = fighterB.y - fighterA.y;
    const dist = Math.hypot(dx, dy);
    const minDist = fighterA.radius + fighterB.radius;

    if (dist >= minDist || dist < 0.001) {
      return true;
    }

    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    const totalMass = fighterA.mass + fighterB.mass;

    fighterA.x -= (nx * overlap * fighterB.mass) / totalMass;
    fighterA.y -= (ny * overlap * fighterB.mass) / totalMass;
    fighterB.x += (nx * overlap * fighterA.mass) / totalMass;
    fighterB.y += (ny * overlap * fighterA.mass) / totalMass;

    const push = FitnessBallConstants.SEPARATION_PUSH_STRENGTH;
    if (fitnessA && !fitnessB) {
      fighterB.vx += nx * push;
      fighterB.vy += ny * push;
      ContinuousBouncePhysics.maintainSpeed(fighterB);
    } else if (fitnessB && !fitnessA) {
      fighterA.vx -= nx * push;
      fighterA.vy -= ny * push;
      ContinuousBouncePhysics.maintainSpeed(fighterA);
    }

    return true;
  }

  static draw(ctx, fighter) {
    if (!FitnessBallSkillSystem.isFitnessFighter(fighter)) {
      return;
    }

    const pulse =
      0.5 +
      0.5 *
        Math.sin(
          (Date.now() % FitnessBallConstants.CHASE_RING_PULSE_MS) /
            (FitnessBallConstants.CHASE_RING_PULSE_MS / (Math.PI * 2))
        );

    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.radius + 8 + pulse * 3, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(247, 103, 7, ${0.28 + pulse * 0.2})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (Date.now() < fighter.fitnessHitFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 12, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 146, 43, 0.85)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#ffd43b";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("贴身打击", fighter.x, fighter.y - fighter.radius - 20);
      ctx.textAlign = "left";
    } else {
      ctx.fillStyle = "#ffa94d";
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("追击", fighter.x, fighter.y - fighter.radius - 18);
      ctx.textAlign = "left";
    }
  }
}
