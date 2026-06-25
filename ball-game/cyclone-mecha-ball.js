/**
 * 旋风机甲球 - 触碰近战；开战 20 秒后连续追踪导弹 5 秒，冷却 30 秒
 */

const CycloneMechaConstants = {
  /** 首次导弹齐射延迟（毫秒） */
  INITIAL_BURST_DELAY_MS: 20000,
  /** 导弹齐射持续时间（毫秒） */
  BURST_DURATION_MS: 5000,
  /** 齐射结束后的冷却（毫秒） */
  BURST_COOLDOWN_MS: 30000,
  /** 齐射期间发射间隔（毫秒） */
  MISSILE_INTERVAL_MS: 380,
  /** 触碰近战间隔（毫秒） */
  MELEE_INTERVAL_MS: 700,
  MELEE_HIT_FLASH_MS: 280,
  BURST_START_FLASH_MS: 420,
  MISSILE_RADIUS: 9,
  MISSILE_SPEED: 11.5,
  MISSILE_HOMING_STRENGTH: 2.4,
  MISSILE_LIFETIME_MS: 2400,
  MISSILE_DAMAGE_RATIO: 0.85,
  CHASE_RING_PULSE_MS: 800,
};

/**
 * 旋风机甲追踪导弹
 */
class CycloneMechaHomingMissile {
  constructor(x, y, ownerId, target, ownerFighter, damage) {
    this.x = x;
    this.y = y;
    this.ownerId = ownerId;
    this.ownerFighter = ownerFighter;
    this.target = target;
    this.damage = damage;
    this.alive = true;
    this.radius = CycloneMechaConstants.MISSILE_RADIUS;
    this.spawnTime = Date.now();
  }

  update() {
    if (!this.target || !this.target.isAlive()) {
      this.alive = false;
      return;
    }
    if (
      Date.now() - this.spawnTime >
      CycloneMechaConstants.MISSILE_LIFETIME_MS
    ) {
      this.alive = false;
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }

    const dirX = dx / dist;
    const dirY = dy / dist;
    const speed = CycloneMechaConstants.MISSILE_SPEED;
    const homing = CycloneMechaConstants.MISSILE_HOMING_STRENGTH;

    this.x += dirX * speed + dirX * homing * dist * 0.04;
    this.y += dirY * speed + dirY * homing * dist * 0.04;
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
    const angle = Math.atan2(
      this.target ? this.target.y - this.y : 0,
      this.target ? this.target.x - this.x : 1
    );

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(this.radius + 4, 0);
    ctx.lineTo(-this.radius, this.radius * 0.55);
    ctx.lineTo(-this.radius * 0.4, 0);
    ctx.lineTo(-this.radius, -this.radius * 0.55);
    ctx.closePath();
    ctx.fillStyle = "#82c91e";
    ctx.fill();
    ctx.strokeStyle = "#e9fac8";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#ffd43b";
    ctx.beginPath();
    ctx.arc(-this.radius * 0.55, 0, this.radius * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * 旋风机甲球技能系统
 */
class CycloneMechaSkillSystem {
  static isCycloneMechaFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.CYCLONE_MECHA;
  }

  static initFighter(fighter) {
    const now = Date.now();
    fighter.cycloneBattleStartAt = now;
    fighter.cycloneMeleeLastHitByTarget = {};
    fighter.cycloneMeleeFlashUntil = 0;
    fighter.cycloneBurstEndAt = 0;
    fighter.cycloneNextBurstAt = now + CycloneMechaConstants.INITIAL_BURST_DELAY_MS;
    fighter.cycloneLastMissileAt = 0;
    fighter.cycloneBurstFlashUntil = 0;
  }

  static isBursting(fighter, now) {
    return (
      CycloneMechaSkillSystem.isCycloneMechaFighter(fighter) &&
      fighter.cycloneBurstEndAt > now
    );
  }

  static getBurstCooldownRemainingSec(fighter, now) {
    if (
      !CycloneMechaSkillSystem.isCycloneMechaFighter(fighter) ||
      CycloneMechaSkillSystem.isBursting(fighter, now)
    ) {
      return 0;
    }
    if (now >= fighter.cycloneNextBurstAt) {
      return 0;
    }
    return Math.ceil((fighter.cycloneNextBurstAt - now) / 1000);
  }

  static getBurstPrepareRemainingSec(fighter, now) {
    if (
      !CycloneMechaSkillSystem.isCycloneMechaFighter(fighter) ||
      CycloneMechaSkillSystem.isBursting(fighter, now) ||
      now >= fighter.cycloneNextBurstAt
    ) {
      return 0;
    }
    return Math.ceil((fighter.cycloneNextBurstAt - now) / 1000);
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

  static getContactOpponents(fighter, allFighters, game) {
    return HeroBattleArenaHelper.getAliveOpponents(fighter, allFighters, game);
  }

  static getMeleeDamage(fighter) {
    return fighter.getSkillDamage();
  }

  static getMissileDamage(fighter) {
    return Math.max(
      1,
      Math.round(
        fighter.getSkillDamage() * CycloneMechaConstants.MISSILE_DAMAGE_RATIO
      )
    );
  }

  static tickMelee(fighter, allFighters, game, now) {
    if (!CycloneMechaSkillSystem.isCycloneMechaFighter(fighter) || !fighter.isAlive()) {
      return;
    }
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isAttackBlocked(fighter)
    ) {
      return;
    }

    const opponents = CycloneMechaSkillSystem.getContactOpponents(
      fighter,
      allFighters,
      game
    );

    for (const opponent of opponents) {
      if (!CycloneMechaSkillSystem.isOverlapping(fighter, opponent)) {
        continue;
      }

      const lastHitTime =
        fighter.cycloneMeleeLastHitByTarget[opponent.playerId] || 0;
      if (now - lastHitTime < CycloneMechaConstants.MELEE_INTERVAL_MS) {
        continue;
      }

      fighter.cycloneMeleeLastHitByTarget[opponent.playerId] = now;
      opponent.takeDamage(CycloneMechaSkillSystem.getMeleeDamage(fighter), fighter);
      fighter.cycloneMeleeFlashUntil =
        now + CycloneMechaConstants.MELEE_HIT_FLASH_MS;

      if (typeof ElementStatusEffectSystem !== "undefined") {
        ElementStatusEffectSystem.setStatusText(opponent, "机甲近战");
      }
    }
  }

  static startBurst(fighter, now) {
    fighter.cycloneBurstEndAt = now + CycloneMechaConstants.BURST_DURATION_MS;
    fighter.cycloneLastMissileAt = 0;
    fighter.cycloneBurstFlashUntil =
      now + CycloneMechaConstants.BURST_START_FLASH_MS;
    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.setStatusText(fighter, "导弹齐射");
    }
  }

  static endBurst(fighter, now) {
    fighter.cycloneBurstEndAt = 0;
    fighter.cycloneNextBurstAt = now + CycloneMechaConstants.BURST_COOLDOWN_MS;
  }

  static fireMissile(fighter, opponent, projectiles) {
    if (!opponent || !opponent.isAlive()) {
      return;
    }

    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }

    const startX = fighter.x + (dx / dist) * (fighter.radius + 6);
    const startY = fighter.y + (dy / dist) * (fighter.radius + 6);

    projectiles.push(
      new CycloneMechaHomingMissile(
        startX,
        startY,
        fighter.playerId,
        opponent,
        fighter,
        CycloneMechaSkillSystem.getMissileDamage(fighter)
      )
    );
  }

  static tickMissileBurst(fighter, allFighters, game, projectiles, now) {
    if (!CycloneMechaSkillSystem.isCycloneMechaFighter(fighter) || !fighter.isAlive()) {
      return;
    }
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isAttackBlocked(fighter)
    ) {
      return;
    }

    if (fighter.cycloneBurstEndAt > 0 && now >= fighter.cycloneBurstEndAt) {
      CycloneMechaSkillSystem.endBurst(fighter, now);
    }

    if (
      fighter.cycloneBurstEndAt === 0 &&
      now >= fighter.cycloneNextBurstAt
    ) {
      CycloneMechaSkillSystem.startBurst(fighter, now);
    }

    if (!CycloneMechaSkillSystem.isBursting(fighter, now)) {
      return;
    }

    if (
      now - fighter.cycloneLastMissileAt <
      CycloneMechaConstants.MISSILE_INTERVAL_MS
    ) {
      return;
    }

    const target = HeroBattleArenaHelper.getNearestOpponent(
      fighter,
      allFighters,
      game
    );
    if (!target) {
      return;
    }

    fighter.cycloneLastMissileAt = now;
    CycloneMechaSkillSystem.fireMissile(fighter, target, projectiles);
  }

  static tick(fighter, allFighters, game, projectiles, now) {
    CycloneMechaSkillSystem.tickMelee(fighter, allFighters, game, now);
    CycloneMechaSkillSystem.tickMissileBurst(
      fighter,
      allFighters,
      game,
      projectiles,
      now
    );
  }

  static draw(ctx, fighter) {
    if (!CycloneMechaSkillSystem.isCycloneMechaFighter(fighter)) {
      return;
    }

    const now = Date.now();
    const bursting = CycloneMechaSkillSystem.isBursting(fighter, now);
    const pulse =
      0.5 +
      0.5 *
        Math.sin(
          (now % CycloneMechaConstants.CHASE_RING_PULSE_MS) /
            (CycloneMechaConstants.CHASE_RING_PULSE_MS / (Math.PI * 2))
        );

    ctx.beginPath();
    ctx.arc(
      fighter.x,
      fighter.y,
      fighter.radius + 8 + (bursting ? pulse * 5 : pulse * 2),
      0,
      Math.PI * 2
    );
    ctx.strokeStyle = bursting
      ? `rgba(130, 201, 30, ${0.45 + pulse * 0.25})`
      : `rgba(116, 192, 252, ${0.22 + pulse * 0.15})`;
    ctx.lineWidth = bursting ? 3 : 2;
    ctx.setLineDash(bursting ? [] : [4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (now < fighter.cycloneBurstFlashUntil) {
      ctx.fillStyle = "#82c91e";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("导弹齐射", fighter.x, fighter.y - fighter.radius - 28);
      ctx.textAlign = "left";
    } else if (now < fighter.cycloneMeleeFlashUntil) {
      ctx.fillStyle = "#ffd43b";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("机甲近战", fighter.x, fighter.y - fighter.radius - 22);
      ctx.textAlign = "left";
    } else if (bursting) {
      ctx.fillStyle = "#82c91e";
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("导弹中", fighter.x, fighter.y - fighter.radius - 18);
      ctx.textAlign = "left";
    } else {
      const cooldownSec = CycloneMechaSkillSystem.getBurstCooldownRemainingSec(
        fighter,
        now
      );
      const prepareSec = CycloneMechaSkillSystem.getBurstPrepareRemainingSec(
        fighter,
        now
      );
      ctx.fillStyle = "#74c0fc";
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      if (prepareSec > 0 && fighter.cycloneNextBurstAt > now) {
        ctx.fillText(`导弹${prepareSec}s`, fighter.x, fighter.y - fighter.radius - 18);
      } else if (cooldownSec > 0) {
        ctx.fillText(`冷却${cooldownSec}s`, fighter.x, fighter.y - fighter.radius - 18);
      } else {
        ctx.fillText("触身近战", fighter.x, fighter.y - fighter.radius - 18);
      }
      ctx.textAlign = "left";
    }
  }
}
