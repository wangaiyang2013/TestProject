/**
 * 弹射球 - 仅在与敌人触碰时向前方射出子弹
 */

const ForwardShotBallConstants = {
  TOUCH_SHOT_FLASH_MS: 280,
};

/**
 * 触碰触发的弹射技能
 */
class ForwardShotSkillSystem {
  static isShotFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.SHOT;
  }

  static initFighter(fighter) {
    fighter.forwardShotFlashUntil = 0;
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
    let opponents = HeroBattleArenaHelper.getAliveOpponents(fighter, allFighters);
    if (game && typeof game.isTeamBattle === "function" && game.isTeamBattle()) {
      opponents = opponents.filter((opponent) =>
        HeroTeamRegistry.areEnemies(fighter.playerId, opponent.playerId)
      );
    }
    return opponents;
  }

  static tickContact(fighter, allFighters, game, projectiles, projectileRadius, now) {
    if (!ForwardShotSkillSystem.isShotFighter(fighter) || !fighter.isAlive()) {
      return;
    }
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isAttackBlocked(fighter)
    ) {
      return;
    }
    if (!fighter.canUseSkill(now)) {
      return;
    }

    const opponents = ForwardShotSkillSystem.getContactOpponents(
      fighter,
      allFighters,
      game
    );

    for (const opponent of opponents) {
      if (!ForwardShotSkillSystem.isOverlapping(fighter, opponent)) {
        continue;
      }
      if (
        game &&
        typeof game.canFighterDamageTarget === "function" &&
        !game.canFighterDamageTarget(fighter, opponent)
      ) {
        continue;
      }

      fighter.markSkillUsed(now);
      HeroAutoSkillSystem.fireShot(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        fighter.getSkillDamage()
      );
      fighter.forwardShotFlashUntil =
        now + ForwardShotBallConstants.TOUCH_SHOT_FLASH_MS;

      if (typeof ElementStatusEffectSystem !== "undefined") {
        ElementStatusEffectSystem.setStatusText(fighter, "触碰弹射");
      }
      break;
    }
  }

  static draw(ctx, fighter) {
    if (!ForwardShotSkillSystem.isShotFighter(fighter)) {
      return;
    }

    if (Date.now() < fighter.forwardShotFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 224, 102, 0.85)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#ffd43b";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("触碰弹射", fighter.x, fighter.y - fighter.radius - 20);
      ctx.textAlign = "left";
    }
  }
}
