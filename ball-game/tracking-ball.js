/**
 * 追踪球 - 首次触碰敌人后解锁贴身追击，触碰近战攻击
 */

const TrackingBallConstants = {
  /** 触碰近战伤害间隔（毫秒） */
  CONTACT_DAMAGE_INTERVAL_MS: 700,
  CONTACT_HIT_FLASH_MS: 280,
  /** 首次触碰后解锁追击的提示时长 */
  CHASE_UNLOCK_FLASH_MS: 900,
  /** 与其他球体重叠时的最小分离力度 */
  SEPARATION_PUSH_STRENGTH: 1.2,
  CHASE_RING_PULSE_MS: 700,
};

/**
 * 追踪球技能系统
 */
class TrackingBallSkillSystem {
  static isTrackingFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.TRACKING;
  }

  static initFighter(fighter) {
    fighter.trackingHitFlashUntil = 0;
    fighter.trackingLastHitByTarget = {};
    fighter.trackingChaseUnlocked = false;
    fighter.trackingChaseUnlockFlashUntil = 0;
  }

  static canChase(fighter) {
    return Boolean(fighter && fighter.trackingChaseUnlocked);
  }

  static unlockChase(fighter, now) {
    if (!fighter || fighter.trackingChaseUnlocked) {
      return;
    }
    fighter.trackingChaseUnlocked = true;
    fighter.trackingChaseUnlockFlashUntil =
      now + TrackingBallConstants.CHASE_UNLOCK_FLASH_MS;
    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.setStatusText(fighter, "追击已解锁");
    }
  }

  static tryUnlockChaseOnContact(fighter, opponent, now) {
    if (
      !TrackingBallSkillSystem.isTrackingFighter(fighter) ||
      !opponent ||
      !opponent.isAlive()
    ) {
      return;
    }
    if (!TrackingBallSkillSystem.isOverlapping(fighter, opponent)) {
      return;
    }
    TrackingBallSkillSystem.unlockChase(fighter, now);
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
    if (!TrackingBallSkillSystem.canChase(fighter)) {
      return;
    }

    if (!target || !target.isAlive()) {
      fighter.vx *= 0.9;
      fighter.vy *= 0.9;
      TrackingBallSkillSystem.applyPosition(fighter, arena);
      return;
    }

    const dx = target.x - fighter.x;
    const dy = target.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }

    const speed = TrackingBallSkillSystem.getChaseSpeed(fighter);
    fighter.vx = (dx / dist) * speed;
    fighter.vy = (dy / dist) * speed;
    TrackingBallSkillSystem.applyPosition(fighter, arena);
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
    if (!TrackingBallSkillSystem.isTrackingFighter(fighter) || !fighter.isAlive()) {
      return;
    }
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isAttackBlocked(fighter)
    ) {
      return;
    }

    const opponents = TrackingBallSkillSystem.getContactOpponents(
      fighter,
      allFighters,
      game
    );

    for (const opponent of opponents) {
      if (!TrackingBallSkillSystem.isOverlapping(fighter, opponent)) {
        continue;
      }

      TrackingBallSkillSystem.unlockChase(fighter, now);

      const lastHitTime = fighter.trackingLastHitByTarget[opponent.playerId] || 0;
      if (now - lastHitTime < TrackingBallConstants.CONTACT_DAMAGE_INTERVAL_MS) {
        continue;
      }

      fighter.trackingLastHitByTarget[opponent.playerId] = now;
      opponent.takeDamage(fighter.getSkillDamage(), fighter);
      fighter.trackingHitFlashUntil =
        now + TrackingBallConstants.CONTACT_HIT_FLASH_MS;

      if (typeof ElementStatusEffectSystem !== "undefined") {
        ElementStatusEffectSystem.setStatusText(opponent, "追踪打击");
      }
    }
  }

  /**
   * 追踪球参与碰撞时仅做分离，不触发弹性反弹
   */
  static resolveContactPair(fighterA, fighterB, game) {
    const trackingA = TrackingBallSkillSystem.isTrackingFighter(fighterA);
    const trackingB = TrackingBallSkillSystem.isTrackingFighter(fighterB);
    if (!trackingA && !trackingB) {
      return false;
    }

    const now = Date.now();
    if (trackingA && !trackingB) {
      TrackingBallSkillSystem.tryUnlockChaseOnContact(fighterA, fighterB, now);
    }
    if (trackingB && !trackingA) {
      TrackingBallSkillSystem.tryUnlockChaseOnContact(fighterB, fighterA, now);
    }

    const chaseA = trackingA && TrackingBallSkillSystem.canChase(fighterA);
    const chaseB = trackingB && TrackingBallSkillSystem.canChase(fighterB);
    if (!chaseA && !chaseB) {
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

    const push = TrackingBallConstants.SEPARATION_PUSH_STRENGTH;
    if (chaseA && !chaseB) {
      fighterB.vx += nx * push;
      fighterB.vy += ny * push;
      ContinuousBouncePhysics.maintainSpeed(fighterB);
    } else if (chaseB && !chaseA) {
      fighterA.vx -= nx * push;
      fighterA.vy -= ny * push;
      ContinuousBouncePhysics.maintainSpeed(fighterA);
    }

    return true;
  }

  static draw(ctx, fighter) {
    if (!TrackingBallSkillSystem.isTrackingFighter(fighter)) {
      return;
    }

    const pulse =
      0.5 +
      0.5 *
        Math.sin(
          (Date.now() % TrackingBallConstants.CHASE_RING_PULSE_MS) /
            (TrackingBallConstants.CHASE_RING_PULSE_MS / (Math.PI * 2))
        );

    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.radius + 8 + pulse * 3, 0, Math.PI * 2);
    const ringAlpha = TrackingBallSkillSystem.canChase(fighter) ? 0.28 + pulse * 0.2 : 0.14;
    ctx.strokeStyle = `rgba(76, 110, 245, ${ringAlpha})`;
    ctx.lineWidth = 2;
    ctx.setLineDash(TrackingBallSkillSystem.canChase(fighter) ? [4, 4] : [2, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (Date.now() < fighter.trackingChaseUnlockFlashUntil) {
      ctx.fillStyle = "#51cf66";
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("追击解锁", fighter.x, fighter.y - fighter.radius - 28);
      ctx.textAlign = "left";
    }

    if (Date.now() < fighter.trackingHitFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 12, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(116, 143, 252, 0.85)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#ffd43b";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("追踪打击", fighter.x, fighter.y - fighter.radius - 20);
      ctx.textAlign = "left";
    } else {
      ctx.fillStyle = TrackingBallSkillSystem.canChase(fighter) ? "#748ffc" : "#adb5bd";
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        TrackingBallSkillSystem.canChase(fighter) ? "追踪" : "待触碰",
        fighter.x,
        fighter.y - fighter.radius - 18
      );
      ctx.textAlign = "left";
    }
  }
}
