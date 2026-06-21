/**
 * 球体触碰加成 - 贴近敌人时攻击更频繁，并追加触身打击（类似追踪球）
 * 远程技能照常释放，触碰为额外加成而非门槛
 */

const BallTouchBonusConstants = {
  /** 触身追加打击间隔（毫秒） */
  CONTACT_BONUS_INTERVAL_MS: 700,
  /** 非追踪球触身打击伤害比例（相对技能伤害） */
  CONTACT_BONUS_DAMAGE_RATIO: 0.7,
  /** 贴身时技能冷却缩短比例（越小越快） */
  SKILL_INTERVAL_TOUCH_RATIO: 0.55,
  TOUCH_BONUS_FLASH_MS: 260,
};

/**
 * 触碰敌人时的攻击加成
 */
class BallTouchBonusSystem {
  static initFighter(fighter) {
    fighter.touchBonusLastHitByTarget = {};
    fighter.touchBonusFlashUntil = 0;
    fighter.isTouchingEnemy = false;
  }

  static shouldReceiveTouchBonus(fighter) {
    if (!fighter || !fighter.template) {
      return false;
    }
    if (TrackingBallSkillSystem.isTrackingFighter(fighter)) {
      return false;
    }
    if (fighter.template.skillType === HeroSkillType.SPIKE) {
      return false;
    }
    if (CycloneMechaSkillSystem.isCycloneMechaFighter(fighter)) {
      return false;
    }
    return true;
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

  static getTouchingOpponents(fighter, allFighters, game) {
    let opponents = HeroBattleArenaHelper.getAliveOpponents(fighter, allFighters);
    if (game && typeof game.isTeamBattle === "function" && game.isTeamBattle()) {
      opponents = opponents.filter((opponent) =>
        HeroTeamRegistry.areEnemies(fighter.playerId, opponent.playerId)
      );
    }
    return opponents.filter((opponent) =>
      BallTouchBonusSystem.isOverlapping(fighter, opponent)
    );
  }

  static updateTouchState(fighter, allFighters, game) {
    if (!BallTouchBonusSystem.shouldReceiveTouchBonus(fighter)) {
      fighter.isTouchingEnemy = false;
      return;
    }
    fighter.isTouchingEnemy =
      BallTouchBonusSystem.getTouchingOpponents(fighter, allFighters, game).length >
      0;
  }

  static getSkillIntervalRatio(fighter) {
    if (fighter && fighter.isTouchingEnemy) {
      return BallTouchBonusConstants.SKILL_INTERVAL_TOUCH_RATIO;
    }
    return 1;
  }

  static getContactBonusDamage(fighter) {
    const skillDamage = fighter.getSkillDamage();
    return Math.max(
      1,
      Math.round(skillDamage * BallTouchBonusConstants.CONTACT_BONUS_DAMAGE_RATIO)
    );
  }

  static tickContactBonus(fighter, allFighters, game, now) {
    if (!fighter.isAlive() || !BallTouchBonusSystem.shouldReceiveTouchBonus(fighter)) {
      return;
    }
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isAttackBlocked(fighter)
    ) {
      return;
    }

    const opponents = BallTouchBonusSystem.getTouchingOpponents(
      fighter,
      allFighters,
      game
    );
    if (opponents.length === 0) {
      return;
    }

    for (const opponent of opponents) {
      const opponentId = opponent.playerId;
      const lastHitTime = fighter.touchBonusLastHitByTarget[opponentId] || 0;
      if (
        now - lastHitTime <
        BallTouchBonusConstants.CONTACT_BONUS_INTERVAL_MS
      ) {
        continue;
      }

      fighter.touchBonusLastHitByTarget[opponentId] = now;
      opponent.takeDamage(BallTouchBonusSystem.getContactBonusDamage(fighter), fighter);
      fighter.touchBonusFlashUntil =
        now + BallTouchBonusConstants.TOUCH_BONUS_FLASH_MS;

      if (typeof ElementStatusEffectSystem !== "undefined") {
        ElementStatusEffectSystem.setStatusText(opponent, "触身连击");
      }
    }
  }

  static draw(ctx, fighter) {
    if (!BallTouchBonusSystem.shouldReceiveTouchBonus(fighter)) {
      return;
    }

    if (fighter.isTouchingEnemy) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 212, 59, 0.45)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (Date.now() < fighter.touchBonusFlashUntil) {
      ctx.fillStyle = "#ffd43b";
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("触身连击", fighter.x, fighter.y - fighter.radius - 22);
      ctx.textAlign = "left";
    }
  }
}
