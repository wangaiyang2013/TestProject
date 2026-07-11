/**
 * 黑帮球 - 在场时触发黑帮事件：每 5 秒 4 名打手从场外入侵；
 * 打手死亡后若本体未死会重新入场；击杀本体后事件结束
 */

const GangsterBallConstants = {
  /** 入侵波次间隔（毫秒） */
  WAVE_INTERVAL_MS: 5000,
  /** 每波入侵打手数量 */
  MINIONS_PER_WAVE: 4,
  /** 打手重新入场延迟（毫秒） */
  MINION_RESPAWN_DELAY_MS: 400,
  /** 打手入场速度 */
  MINION_ENTER_SPEED: 10,
  /** 打手场内追击速度 */
  MINION_CHASE_SPEED: 9.2,
  /** 打手攻击间隔 */
  MINION_ATTACK_INTERVAL_MS: 1100,
  /** 打手触碰伤害 */
  MINION_CONTACT_DAMAGE: 10,
  /** 打手射击伤害 */
  MINION_SHOT_DAMAGE: 12,
  /** 打手生命值（基础值，经 BallHealthResolver 换算） */
  MINION_BASE_HEALTH: 52,
  /** 打手独立玩家编号起点 */
  MINION_PLAYER_ID_START: 300,
  WAVE_FLASH_MS: 480,
  MINION_ENTER_FLASH_MS: 360,
  EVENT_BANNER_FLASH_MS: 900,
};

/**
 * 黑帮打手模板（仅事件用，不进入选球列表）
 */
class GangMinionTemplateFactory {
  static create() {
    return new HeroBallTemplate(
      "gang_minion",
      "黑帮打手",
      "#212529",
      "#495057",
      BallHealthResolver.resolve(GangsterBallConstants.MINION_BASE_HEALTH),
      GangsterBallConstants.MINION_CHASE_SPEED,
      1.05,
      HeroSkillType.SHOT,
      GangsterBallConstants.MINION_SHOT_DAMAGE,
      GangsterBallConstants.MINION_ATTACK_INTERVAL_MS
    );
  }
}

/**
 * 黑帮球技能系统
 */
class GangsterBallSkillSystem {
  static isGangsterBoss(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.GANGSTER;
  }

  static isGangMinion(fighter) {
    return Boolean(fighter && fighter.isGangMinion);
  }

  static initBattle(game) {
    if (!game) {
      return;
    }
    game.nextGangMinionPlayerId = GangsterBallConstants.MINION_PLAYER_ID_START;
    game.gangEventWaveFlashUntil = 0;
    game.gangEventBannerUntil = 0;
    game.gangMinionRespawnQueue = [];
  }

  static initFighter(fighter) {
    fighter.gangLastWaveTime = 0;
    fighter.gangEventStarted = false;
    fighter.gangBossFlashUntil = 0;
    fighter.gangActiveMinionCount = 0;
  }

  static allocateMinionPlayerId(game) {
    if (!game.nextGangMinionPlayerId) {
      game.nextGangMinionPlayerId = GangsterBallConstants.MINION_PLAYER_ID_START;
    }
    game.nextGangMinionPlayerId += 1;
    return game.nextGangMinionPlayerId;
  }

  static findBoss(fighters) {
    return (
      fighters.find(
        (fighter) =>
          GangsterBallSkillSystem.isGangsterBoss(fighter) && fighter.isAlive()
      ) || null
    );
  }

  static countAliveMinions(fighters, bossPlayerId) {
    return fighters.filter(
      (fighter) =>
        GangsterBallSkillSystem.isGangMinion(fighter) &&
        fighter.isAlive() &&
        fighter.gangBossOwnerPlayerId === bossPlayerId
    ).length;
  }

  static getEntryPoint(arena, radius, sideIndex) {
    const margin = radius + 10;
    const verticalSpan = Math.max(40, arena.bottom - arena.top - margin * 2);
    const horizontalSpan = Math.max(40, arena.right - arena.left - margin * 2);
    const verticalPos = arena.top + margin + verticalSpan * (0.2 + (sideIndex % 3) * 0.3);
    const horizontalPos =
      arena.left + margin + horizontalSpan * (0.2 + (sideIndex % 3) * 0.3);
    const side = sideIndex % 4;

    if (side === 0) {
      return { x: arena.left - margin, y: verticalPos };
    }
    if (side === 1) {
      return { x: arena.right + margin, y: verticalPos };
    }
    if (side === 2) {
      return { x: horizontalPos, y: arena.top - margin };
    }
    return { x: horizontalPos, y: arena.bottom + margin };
  }

  static isInsideArena(fighter, arena) {
    const radius = fighter.radius;
    return (
      fighter.x - radius >= arena.left &&
      fighter.x + radius <= arena.right &&
      fighter.y - radius >= arena.top &&
      fighter.y + radius <= arena.bottom
    );
  }

  static clampInsideArena(fighter, arena) {
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

  static spawnMinion(boss, game, sideIndex, now) {
    if (!boss || !boss.isAlive() || !game) {
      return null;
    }

    const radius = game.getBallRadius();
    const entry = GangsterBallSkillSystem.getEntryPoint(
      game.arena,
      radius,
      sideIndex
    );
    const centerX = (game.arena.left + game.arena.right) / 2;
    const centerY = (game.arena.top + game.arena.bottom) / 2;
    const dx = centerX - entry.x;
    const dy = centerY - entry.y;
    const dist = Math.hypot(dx, dy) || 1;
    const template = GangMinionTemplateFactory.create();
    const minion = new HeroBallFighter(
      GangsterBallSkillSystem.allocateMinionPlayerId(game),
      template,
      entry.x,
      entry.y,
      radius,
      dx / dist,
      dy / dist
    );

    minion.isGangMinion = true;
    minion.gangBossOwnerPlayerId = boss.playerId;
    minion.gangMinionSideIndex = sideIndex;
    minion.gangEntering = true;
    minion.gangMinionEnterFlashUntil =
      now + GangsterBallConstants.MINION_ENTER_FLASH_MS;
    minion.vx = (dx / dist) * GangsterBallConstants.MINION_ENTER_SPEED;
    minion.vy = (dy / dist) * GangsterBallConstants.MINION_ENTER_SPEED;
    minion.lastSkillTime = 0;

    game.fighters.push(minion);

    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.setStatusText(minion, "入侵");
    }

    return minion;
  }

  static spawnWave(boss, game, now) {
    for (let index = 0; index < GangsterBallConstants.MINIONS_PER_WAVE; index += 1) {
      GangsterBallSkillSystem.spawnMinion(boss, game, index, now);
    }
    game.gangEventWaveFlashUntil = now + GangsterBallConstants.WAVE_FLASH_MS;
    game.gangEventBannerUntil = now + GangsterBallConstants.EVENT_BANNER_FLASH_MS;
    boss.gangBossFlashUntil = now + GangsterBallConstants.WAVE_FLASH_MS;

    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.setStatusText(boss, "黑帮入侵");
    }
  }

  static queueMinionRespawn(boss, game, sideIndex, now) {
    if (!game.gangMinionRespawnQueue) {
      game.gangMinionRespawnQueue = [];
    }
    game.gangMinionRespawnQueue.push({
      bossPlayerId: boss.playerId,
      sideIndex,
      respawnAt: now + GangsterBallConstants.MINION_RESPAWN_DELAY_MS,
    });
  }

  static processRespawnQueue(boss, game, fighters, now) {
    if (!game.gangMinionRespawnQueue || game.gangMinionRespawnQueue.length === 0) {
      return;
    }

    const remaining = [];
    for (const entry of game.gangMinionRespawnQueue) {
      if (entry.bossPlayerId !== boss.playerId) {
        remaining.push(entry);
        continue;
      }
      if (now < entry.respawnAt) {
        remaining.push(entry);
        continue;
      }
      if (boss.isAlive()) {
        GangsterBallSkillSystem.spawnMinion(boss, game, entry.sideIndex, now);
      }
    }
    game.gangMinionRespawnQueue = remaining;
  }

  static removeDeadMinions(game, boss, now) {
    for (let index = game.fighters.length - 1; index >= 0; index -= 1) {
      const fighter = game.fighters[index];
      if (!GangsterBallSkillSystem.isGangMinion(fighter)) {
        continue;
      }
      if (fighter.gangBossOwnerPlayerId !== boss.playerId) {
        continue;
      }
      if (fighter.isAlive()) {
        continue;
      }
      const sideIndex = fighter.gangMinionSideIndex || 0;
      game.fighters.splice(index, 1);
      if (boss.isAlive()) {
        GangsterBallSkillSystem.queueMinionRespawn(boss, game, sideIndex, now);
      }
    }
  }

  static purgeAllMinions(game, bossPlayerId) {
    if (!game || !Array.isArray(game.fighters)) {
      return;
    }
    game.fighters = game.fighters.filter((fighter) => {
      if (!GangsterBallSkillSystem.isGangMinion(fighter)) {
        return true;
      }
      return fighter.gangBossOwnerPlayerId !== bossPlayerId;
    });
    if (game.gangMinionRespawnQueue) {
      game.gangMinionRespawnQueue = game.gangMinionRespawnQueue.filter(
        (entry) => entry.bossPlayerId !== bossPlayerId
      );
    }
  }

  static purgeAllGangMinions(game) {
    if (!game || !Array.isArray(game.fighters)) {
      return;
    }
    game.fighters = game.fighters.filter(
      (fighter) => !GangsterBallSkillSystem.isGangMinion(fighter)
    );
    game.gangMinionRespawnQueue = [];
  }

  static getMinionAttackTarget(minion, allFighters) {
    let nearest = null;
    let nearestDistance = Infinity;

    for (const fighter of allFighters) {
      if (!fighter || !fighter.isAlive() || fighter === minion) {
        continue;
      }
      if (GangsterBallSkillSystem.isGangMinion(fighter)) {
        continue;
      }
      if (fighter.playerId === minion.gangBossOwnerPlayerId) {
        continue;
      }

      const distance = Math.hypot(fighter.x - minion.x, fighter.y - minion.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = fighter;
      }
    }

    return nearest;
  }

  static canDamage(attacker, target) {
    if (!attacker || !target) {
      return true;
    }
    if (
      GangsterBallSkillSystem.isGangMinion(attacker) &&
      target.playerId === attacker.gangBossOwnerPlayerId
    ) {
      return false;
    }
    if (
      GangsterBallSkillSystem.isGangMinion(attacker) &&
      GangsterBallSkillSystem.isGangMinion(target)
    ) {
      return false;
    }
    return true;
  }

  static updateMinionMovement(minion, allFighters, game, arena) {
    if (!GangsterBallSkillSystem.isGangMinion(minion) || !minion.isAlive()) {
      return;
    }

    const target = GangsterBallSkillSystem.getMinionAttackTarget(
      minion,
      allFighters
    );
    let moveX = minion.vx;
    let moveY = minion.vy;

    if (target) {
      const dx = target.x - minion.x;
      const dy = target.y - minion.y;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = minion.gangEntering
        ? GangsterBallConstants.MINION_ENTER_SPEED
        : GangsterBallConstants.MINION_CHASE_SPEED;
      moveX = (dx / dist) * speed;
      moveY = (dy / dist) * speed;
      minion.vx = moveX;
      minion.vy = moveY;
    }

    minion.x += moveX;
    minion.y += moveY;

    if (minion.gangEntering && GangsterBallSkillSystem.isInsideArena(minion, arena)) {
      minion.gangEntering = false;
    }

    GangsterBallSkillSystem.clampInsideArena(minion, arena);
  }

  static tickMinionCombat(minion, allFighters, game, projectiles, projectileRadius, now) {
    if (!GangsterBallSkillSystem.isGangMinion(minion) || !minion.isAlive()) {
      return;
    }
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isAttackBlocked(minion)
    ) {
      return;
    }

    const target = GangsterBallSkillSystem.getMinionAttackTarget(
      minion,
      allFighters
    );
    if (!target) {
      return;
    }

    if (ContactMeleeHelper.isOverlapping(minion, target)) {
      const lastHitTime = minion.gangMinionLastHitByTarget[target.playerId] || 0;
      if (
        now - lastHitTime >=
        GangsterBallConstants.MINION_ATTACK_INTERVAL_MS
      ) {
        minion.gangMinionLastHitByTarget[target.playerId] = now;
        target.takeDamage(GangsterBallConstants.MINION_CONTACT_DAMAGE, minion);
      }
    }

    if (now - minion.lastSkillTime >= GangsterBallConstants.MINION_ATTACK_INTERVAL_MS) {
      minion.markSkillUsed(now);
      HeroAutoSkillSystem.fireShot(
        minion,
        target,
        projectiles,
        projectileRadius,
        GangsterBallConstants.MINION_SHOT_DAMAGE,
        "#343a40"
      );
    }
  }

  static tickBossEvent(game, fighters, now) {
    const boss = GangsterBallSkillSystem.findBoss(fighters);
    const hadBoss = fighters.some((fighter) =>
      GangsterBallSkillSystem.isGangsterBoss(fighter)
    );

    if (!boss) {
      if (hadBoss) {
        GangsterBallSkillSystem.purgeAllGangMinions(game);
      }
      return;
    }

    if (!boss.gangEventStarted) {
      boss.gangEventStarted = true;
      boss.gangLastWaveTime = now;
      GangsterBallSkillSystem.spawnWave(boss, game, now);
    } else if (
      now - boss.gangLastWaveTime >=
      GangsterBallConstants.WAVE_INTERVAL_MS
    ) {
      boss.gangLastWaveTime = now;
      GangsterBallSkillSystem.spawnWave(boss, game, now);
    }

    boss.gangActiveMinionCount = GangsterBallSkillSystem.countAliveMinions(
      fighters,
      boss.playerId
    );

    GangsterBallSkillSystem.removeDeadMinions(game, boss, now);
    GangsterBallSkillSystem.processRespawnQueue(boss, game, fighters, now);
  }

  static tickMinions(game, fighters, now) {
    const projectileRadius = game.getProjectileRadius();
    for (const fighter of fighters) {
      if (!GangsterBallSkillSystem.isGangMinion(fighter) || !fighter.isAlive()) {
        continue;
      }
      if (!fighter.gangMinionLastHitByTarget) {
        fighter.gangMinionLastHitByTarget = {};
      }
      GangsterBallSkillSystem.tickMinionCombat(
        fighter,
        fighters,
        game,
        game.projectiles,
        projectileRadius,
        now
      );
    }
  }

  static tick(game, fighters, now) {
    GangsterBallSkillSystem.tickBossEvent(game, fighters, now);
    GangsterBallSkillSystem.tickMinions(game, fighters, now);
  }

  static drawBoss(ctx, fighter) {
    if (!GangsterBallSkillSystem.isGangsterBoss(fighter)) {
      return;
    }

    const now = Date.now();
    if (now < fighter.gangBossFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 12, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(33, 37, 41, 0.75)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.fillStyle = "#ced4da";
    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `打手${fighter.gangActiveMinionCount || 0}`,
      fighter.x,
      fighter.y + fighter.radius + 24
    );
    ctx.textAlign = "left";
  }

  static drawMinion(ctx, fighter) {
    if (!GangsterBallSkillSystem.isGangMinion(fighter)) {
      return;
    }

    const now = Date.now();
    if (now < fighter.gangMinionEnterFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(33, 37, 41, 0.65)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = "#f8f9fa";
    ctx.font = "bold 8px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("打手", fighter.x, fighter.y - fighter.radius - 10);
    ctx.textAlign = "left";
  }

  static drawEventBanner(ctx, game) {
    if (!game || Date.now() >= game.gangEventWaveFlashUntil) {
      return;
    }

    ctx.fillStyle = "rgba(33, 37, 41, 0.82)";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("黑帮事件 · 打手入侵", game.width / 2, game.arena.top - 14);
    ctx.textAlign = "left";
  }
}
