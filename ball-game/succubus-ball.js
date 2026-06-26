/**
 * 魅魔球 - 每秒牵引敌人并叠加魅惑；叠满 5 层后敌人进入舔狗状态，转而守护魅魔并攻击原队友
 */

const SuccubusBallConstants = {
  /** 魅惑技能间隔（毫秒） */
  SEDUCE_INTERVAL_MS: 1000,
  /** 进入舔狗状态所需魅惑层数 */
  CHARM_STACKS_REQUIRED: 5,
  /** 魅惑牵引有效距离 */
  PULL_RANGE: 220,
  /** 每秒牵引位移 */
  PULL_DISTANCE_PER_TICK: 28,
  /** 单次魅惑附带伤害 */
  SEDUCE_TOUCH_DAMAGE: 4,
  /** 舔狗守护魅魔的贴身半径 */
  GUARD_RADIUS: 72,
  /** 舔狗移速加成 */
  CHARM_MOVE_SPEED_RATIO: 1.2,
  /** 舔狗攻速加成（间隔乘数） */
  CHARM_ATTACK_INTERVAL_RATIO: 0.65,
  SEDUCE_FLASH_MS: 360,
  CHARM_FLASH_MS: 520,
  HEART_PULSE_MS: 700,
};

/**
 * 魅魔球技能系统
 */
class SuccubusBallSkillSystem {
  static isSuccubusFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.SUCCUBUS;
  }

  static initCharmState(fighter) {
    fighter.succubusSeductionStacks = 0;
    fighter.succubusSeductionOwnerPlayerId = null;
    fighter.succubusCharmOwnerPlayerId = null;
    fighter.succubusSeduceFlashUntil = 0;
    fighter.succubusCharmFlashUntil = 0;
  }

  static initFighter(fighter) {
    SuccubusBallSkillSystem.initCharmState(fighter);
    fighter.succubusLastSeduceTime = 0;
    fighter.succubusSeduceCastFlashUntil = 0;
    fighter.succubusCharmedCount = 0;
  }

  static isCharmed(fighter) {
    return Boolean(fighter && fighter.succubusCharmOwnerPlayerId);
  }

  static findCharmMaster(fighter, allFighters) {
    if (!SuccubusBallSkillSystem.isCharmed(fighter)) {
      return null;
    }
    return (
      allFighters.find(
        (other) =>
          other &&
          other.isAlive() &&
          other.playerId === fighter.succubusCharmOwnerPlayerId
      ) || null
    );
  }

  static clearCharm(fighter) {
    if (!fighter) {
      return;
    }
    fighter.succubusCharmOwnerPlayerId = null;
    fighter.succubusSeductionStacks = 0;
    fighter.succubusSeductionOwnerPlayerId = null;
  }

  static clearCharmsOwnedBy(ownerPlayerId, allFighters) {
    for (const fighter of allFighters) {
      if (
        fighter &&
        fighter.succubusCharmOwnerPlayerId === ownerPlayerId
      ) {
        SuccubusBallSkillSystem.clearCharm(fighter);
      }
      if (
        fighter &&
        fighter.succubusSeductionOwnerPlayerId === ownerPlayerId &&
        !SuccubusBallSkillSystem.isCharmed(fighter)
      ) {
        fighter.succubusSeductionStacks = 0;
        fighter.succubusSeductionOwnerPlayerId = null;
      }
    }
  }

  static tickCharmMaintenance(allFighters) {
    for (const fighter of allFighters) {
      if (!fighter) {
        continue;
      }

      if (
        fighter.succubusSeductionOwnerPlayerId &&
        !SuccubusBallSkillSystem.isCharmed(fighter)
      ) {
        const seducer = allFighters.find(
          (other) =>
            other &&
            other.isAlive() &&
            other.playerId === fighter.succubusSeductionOwnerPlayerId
        );
        if (!seducer) {
          fighter.succubusSeductionStacks = 0;
          fighter.succubusSeductionOwnerPlayerId = null;
        }
      }

      if (!fighter.isAlive() && SuccubusBallSkillSystem.isCharmed(fighter)) {
        SuccubusBallSkillSystem.clearCharm(fighter);
        continue;
      }

      if (!fighter.isAlive() || !SuccubusBallSkillSystem.isCharmed(fighter)) {
        continue;
      }

      const master = SuccubusBallSkillSystem.findCharmMaster(fighter, allFighters);
      if (!master) {
        SuccubusBallSkillSystem.clearCharm(fighter);
      }
    }

    for (const fighter of allFighters) {
      if (SuccubusBallSkillSystem.isSuccubusFighter(fighter)) {
        fighter.succubusCharmedCount = SuccubusBallSkillSystem.countCharmedBy(
          fighter,
          allFighters
        );
      }
    }
  }

  static getSeduceIntervalMs(fighter) {
    if (typeof CrazyFightSkillSystem !== "undefined") {
      return CrazyFightSkillSystem.getSkillIntervalMs(
        fighter,
        SuccubusBallConstants.SEDUCE_INTERVAL_MS
      );
    }
    return SuccubusBallConstants.SEDUCE_INTERVAL_MS;
  }

  static getDistance(fighterA, fighterB) {
    return Math.hypot(fighterB.x - fighterA.x, fighterB.y - fighterA.y);
  }

  static pullToward(target, succubus) {
    const dx = succubus.x - target.x;
    const dy = succubus.y - target.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }

    const minGap = succubus.radius + target.radius + 2;
    const available = Math.max(0, dist - minGap);
    const move = Math.min(
      SuccubusBallConstants.PULL_DISTANCE_PER_TICK,
      available
    );
    if (move <= 0) {
      return;
    }

    target.x += (dx / dist) * move;
    target.y += (dy / dist) * move;
  }

  static applySeductionStack(succubus, target, now) {
    if (
      target.succubusSeductionOwnerPlayerId &&
      target.succubusSeductionOwnerPlayerId !== succubus.playerId
    ) {
      target.succubusSeductionStacks = 0;
    }

    target.succubusSeductionOwnerPlayerId = succubus.playerId;
    target.succubusSeductionStacks += 1;
    target.succubusSeduceFlashUntil = now + SuccubusBallConstants.SEDUCE_FLASH_MS;

    const touchDamage = succubus.getSkillDamage(
      SuccubusBallConstants.SEDUCE_TOUCH_DAMAGE
    );
    target.takeDamage(touchDamage, succubus);

    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.setStatusText(
        target,
        `魅惑${target.succubusSeductionStacks}/${SuccubusBallConstants.CHARM_STACKS_REQUIRED}`
      );
    }

    if (target.succubusSeductionStacks >= SuccubusBallConstants.CHARM_STACKS_REQUIRED) {
      SuccubusBallSkillSystem.applyCharm(target, succubus, now);
    }
  }

  static applyCharm(target, succubus, now) {
    target.succubusCharmOwnerPlayerId = succubus.playerId;
    target.succubusSeductionStacks = SuccubusBallConstants.CHARM_STACKS_REQUIRED;
    target.succubusCharmFlashUntil = now + SuccubusBallConstants.CHARM_FLASH_MS;

    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.setStatusText(target, "舔狗");
    }
  }

  static seduceTarget(succubus, target, now) {
    SuccubusBallSkillSystem.pullToward(target, succubus);
    SuccubusBallSkillSystem.applySeductionStack(succubus, target, now);
  }

  static tickSeduce(succubus, allFighters, game, now) {
    if (!SuccubusBallSkillSystem.isSuccubusFighter(succubus) || !succubus.isAlive()) {
      return;
    }
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isAttackBlocked(succubus)
    ) {
      return;
    }

    const interval = SuccubusBallSkillSystem.getSeduceIntervalMs(succubus);
    if (now - succubus.succubusLastSeduceTime < interval) {
      return;
    }

    const opponents = HeroBattleArenaHelper.getAliveOpponents(
      succubus,
      allFighters,
      game
    );
    let seducedAnyone = false;

    for (const opponent of opponents) {
      if (SuccubusBallSkillSystem.isCharmed(opponent)) {
        continue;
      }
      const distance = SuccubusBallSkillSystem.getDistance(succubus, opponent);
      if (distance > SuccubusBallConstants.PULL_RANGE) {
        continue;
      }

      SuccubusBallSkillSystem.seduceTarget(succubus, opponent, now);
      seducedAnyone = true;
    }

    if (seducedAnyone) {
      succubus.succubusLastSeduceTime = now;
      succubus.succubusSeduceCastFlashUntil =
        now + SuccubusBallConstants.SEDUCE_FLASH_MS;
    }
  }

  static clampToArena(fighter, arena) {
    const radius = fighter.radius;
    if (fighter.x - radius < arena.left) {
      fighter.x = arena.left + radius;
    }
    if (fighter.x + radius > arena.right) {
      fighter.x = arena.right - radius;
    }
    if (fighter.y - radius < arena.top) {
      fighter.y = arena.top + radius;
    }
    if (fighter.y + radius > arena.bottom) {
      fighter.y = arena.bottom - radius;
    }
  }

  static updateCharmedMovement(fighter, allFighters, game, arena) {
    if (!SuccubusBallSkillSystem.isCharmed(fighter) || !fighter.isAlive()) {
      return;
    }

    const master = SuccubusBallSkillSystem.findCharmMaster(fighter, allFighters);
    if (!master) {
      SuccubusBallSkillSystem.clearCharm(fighter);
      return;
    }

    const teammateTarget =
      SuccubusBallSkillSystem.getCharmedAttackTarget(
        fighter,
        allFighters,
        game
      );
    const distToMaster = SuccubusBallSkillSystem.getDistance(fighter, master);
    let target = master;

    if (
      teammateTarget &&
      (distToMaster <= SuccubusBallConstants.GUARD_RADIUS ||
        SuccubusBallSkillSystem.getDistance(fighter, teammateTarget) <
          distToMaster)
    ) {
      target = teammateTarget;
    }

    const dx = target.x - fighter.x;
    const dy = target.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }

    const speed =
      fighter.template.moveSpeed * SuccubusBallConstants.CHARM_MOVE_SPEED_RATIO;
    fighter.vx = (dx / dist) * speed;
    fighter.vy = (dy / dist) * speed;
    fighter.x += fighter.vx;
    fighter.y += fighter.vy;
    SuccubusBallSkillSystem.clampToArena(fighter, arena);
  }

  static getCharmAttackIntervalRatio(fighter) {
    if (SuccubusBallSkillSystem.isCharmed(fighter)) {
      return SuccubusBallConstants.CHARM_ATTACK_INTERVAL_RATIO;
    }
    return 1;
  }

  static countCharmedBy(succubus, allFighters) {
    if (!succubus) {
      return 0;
    }
    return allFighters.filter(
      (fighter) =>
        fighter &&
        fighter.isAlive() &&
        fighter.succubusCharmOwnerPlayerId === succubus.playerId
    ).length;
  }

  static getCharmedTeammateTargets(fighter, allFighters) {
    const originalTeamId = HeroTeamRegistry.getTeamId(fighter.playerId);
    return allFighters.filter((other) => {
      if (!other || other === fighter || !other.isAlive()) {
        return false;
      }
      if (
        other.succubusCharmOwnerPlayerId === fighter.succubusCharmOwnerPlayerId
      ) {
        return false;
      }
      if (!originalTeamId) {
        return other.playerId !== fighter.playerId;
      }
      return HeroTeamRegistry.getTeamId(other.playerId) === originalTeamId;
    });
  }

  static getCharmedAttackTarget(fighter, allFighters, game) {
    const targets = SuccubusBallSkillSystem.getCharmedTeammateTargets(
      fighter,
      allFighters
    );
    let nearest = null;
    let nearestDistance = Infinity;

    for (const target of targets) {
      const distance = SuccubusBallSkillSystem.getDistance(fighter, target);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = target;
      }
    }

    return nearest;
  }

  static onFighterDeath(deadFighter, allFighters) {
    if (!deadFighter) {
      return;
    }
    if (SuccubusBallSkillSystem.isSuccubusFighter(deadFighter)) {
      SuccubusBallSkillSystem.clearCharmsOwnedBy(deadFighter.playerId, allFighters);
    }
    if (SuccubusBallSkillSystem.isCharmed(deadFighter)) {
      SuccubusBallSkillSystem.clearCharm(deadFighter);
    }
  }

  static drawCharmAura(ctx, fighter) {
    if (!SuccubusBallSkillSystem.isCharmed(fighter)) {
      return;
    }

    const now = Date.now();
    const pulse =
      0.45 +
      0.35 *
        Math.sin(
          (now % SuccubusBallConstants.HEART_PULSE_MS) /
            (SuccubusBallConstants.HEART_PULSE_MS / (Math.PI * 2))
        );

    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.radius + 6 + pulse * 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(240, 101, 149, ${0.35 + pulse * 0.25})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#f06595";
    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("舔狗", fighter.x, fighter.y - fighter.radius - 18);
    ctx.textAlign = "left";
  }

  static drawSeductionMark(ctx, fighter) {
    if (
      SuccubusBallSkillSystem.isCharmed(fighter) ||
      !fighter.succubusSeductionStacks
    ) {
      return;
    }

    ctx.fillStyle = "#ff8787";
    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `魅惑${fighter.succubusSeductionStacks}/${SuccubusBallConstants.CHARM_STACKS_REQUIRED}`,
      fighter.x,
      fighter.y + fighter.radius + 22
    );
    ctx.textAlign = "left";
  }

  static draw(ctx, fighter) {
    if (!SuccubusBallSkillSystem.isSuccubusFighter(fighter)) {
      return;
    }

    const now = Date.now();
    const pulse =
      0.4 +
      0.35 *
        Math.sin(
          (now % SuccubusBallConstants.HEART_PULSE_MS) /
            (SuccubusBallConstants.HEART_PULSE_MS / (Math.PI * 2))
        );

    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.radius + 8 + pulse * 5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(240, 101, 149, ${0.28 + pulse * 0.2})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (now < fighter.succubusSeduceCastFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, SuccubusBallConstants.PULL_RANGE, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 135, 135, 0.22)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}
