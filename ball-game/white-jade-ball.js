/**
 * 白玉球 - 极速射击；击杀敌人后召唤随机英雄球助战
 */

const WhiteJadeBallConstants = {
  /** 射击间隔：0.001 秒 */
  FIRE_INTERVAL_MS: 1,
  BULLET_COLOR: "#f8f9fa",
  SUMMON_FLASH_MS: 520,
  /** 召唤球使用的独立玩家编号起点 */
  SUMMON_PLAYER_ID_START: 100,
};

/**
 * 白玉球技能系统
 */
class WhiteJadeBallSkillSystem {
  static isWhiteJadeFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.WHITE_JADE;
  }

  static initFighter(fighter) {
    fighter.whiteJadeLastFireTime = 0;
    fighter.whiteJadeSummonFlashUntil = 0;
    fighter.pendingWhiteJadeSummon = false;
    fighter.whiteJadeSummonX = 0;
    fighter.whiteJadeSummonY = 0;
  }

  static initBattle(game) {
    if (!game) {
      return;
    }
    game.nextSummonPlayerId = WhiteJadeBallConstants.SUMMON_PLAYER_ID_START;
  }

  static allocateSummonPlayerId(game) {
    if (!game.nextSummonPlayerId) {
      game.nextSummonPlayerId = WhiteJadeBallConstants.SUMMON_PLAYER_ID_START;
    }
    game.nextSummonPlayerId += 1;
    return game.nextSummonPlayerId;
  }

  static getSummonCandidateTemplates(game) {
    const heroes = game.getHeroes();
    return heroes.filter(
      (hero) => hero.skillType !== HeroSkillType.WHITE_JADE
    );
  }

  static tickFire(fighter, opponent, projectiles, projectileRadius, now) {
    if (!WhiteJadeBallSkillSystem.isWhiteJadeFighter(fighter) || !fighter.isAlive()) {
      return;
    }
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isAttackBlocked(fighter)
    ) {
      return;
    }
    if (!opponent || !opponent.isAlive()) {
      return;
    }

    const lastFireTime = fighter.whiteJadeLastFireTime || 0;
    if (now - lastFireTime < WhiteJadeBallConstants.FIRE_INTERVAL_MS) {
      return;
    }

    fighter.whiteJadeLastFireTime = now;
    HeroAutoSkillSystem.fireShot(
      fighter,
      opponent,
      projectiles,
      projectileRadius,
      fighter.getSkillDamage(),
      WhiteJadeBallConstants.BULLET_COLOR
    );
  }

  static onEnemyKilled(killer, victim) {
    if (!WhiteJadeBallSkillSystem.isWhiteJadeFighter(killer)) {
      return;
    }
    if (!victim) {
      return;
    }

    killer.pendingWhiteJadeSummon = true;
    killer.whiteJadeSummonX = victim.x;
    killer.whiteJadeSummonY = victim.y;
  }

  static processPendingSummons(fighters, game) {
    for (const fighter of fighters) {
      if (!fighter.pendingWhiteJadeSummon) {
        continue;
      }
      fighter.pendingWhiteJadeSummon = false;
      WhiteJadeBallSkillSystem.summonRandomBall(
        fighter,
        game,
        fighter.whiteJadeSummonX,
        fighter.whiteJadeSummonY
      );
    }
  }

  static summonRandomBall(killer, game, x, y) {
    const candidates = WhiteJadeBallSkillSystem.getSummonCandidateTemplates(game);
    if (candidates.length === 0) {
      return null;
    }

    const template =
      candidates[Math.floor(Math.random() * candidates.length)];
    const summonPlayerId = WhiteJadeBallSkillSystem.allocateSummonPlayerId(game);
    const radius = game.getBallRadius();
    const angle = Math.random() * Math.PI * 2;
    const summon = new HeroBallFighter(
      summonPlayerId,
      template,
      x,
      y,
      radius,
      Math.cos(angle),
      Math.sin(angle)
    );

    summon.summonOwnerPlayerId = killer.playerId;
    summon.isWhiteJadeSummon = true;
    summon.whiteJadeSummonFlashUntil =
      Date.now() + WhiteJadeBallConstants.SUMMON_FLASH_MS;

    game.fighters.push(summon);

    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.setStatusText(killer, `召唤${template.name}`);
      ElementStatusEffectSystem.setStatusText(summon, "白玉召唤");
    }

    killer.whiteJadeSummonFlashUntil =
      Date.now() + WhiteJadeBallConstants.SUMMON_FLASH_MS;
    return summon;
  }

  static draw(ctx, fighter) {
    if (!WhiteJadeBallSkillSystem.isWhiteJadeFighter(fighter)) {
      return;
    }

    if (Date.now() < fighter.whiteJadeSummonFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 14, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(150, 242, 215, 0.8)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  static drawSummon(ctx, fighter) {
    if (!fighter.isWhiteJadeSummon) {
      return;
    }
    if (Date.now() >= fighter.whiteJadeSummonFlashUntil) {
      return;
    }

    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.radius + 8, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(248, 249, 250, 0.65)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
