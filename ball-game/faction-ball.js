/**
 * 阵营球 - 触碰队友时施加阵营共鸣；仅在双队团战模式可选
 */

const FactionBallConstants = {
  /** 触身共鸣间隔（毫秒） */
  RESONANCE_INTERVAL_MS: 900,
  /** 阵营共鸣持续时间（毫秒） */
  RESONANCE_DURATION_MS: 3000,
  /** 共鸣期间技能伤害加成比例 */
  DAMAGE_BONUS_RATIO: 0.25,
  /** 共鸣期间移动速度倍率 */
  MOVE_SPEED_MULTIPLIER: 1.15,
  RESONANCE_CAST_FLASH_MS: 320,
  RESONANCE_RECEIVE_FLASH_MS: 420,
  TEAM_RING_PULSE_MS: 700,
};

/**
 * 阵营球技能系统
 */
class FactionBallSkillSystem {
  static isFactionFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.FACTION;
  }

  static initFighter(fighter) {
    fighter.factionLastResonanceByTarget = {};
    fighter.factionResonanceCastFlashUntil = 0;
    fighter.factionResonanceUntil = 0;
    fighter.factionResonanceReceiveFlashUntil = 0;
  }

  static isTeamBattleActive(game) {
    return (
      game &&
      typeof game.isTeamBattle === "function" &&
      game.isTeamBattle()
    );
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

  static getTeammates(fighter, allFighters, game) {
    if (!FactionBallSkillSystem.isTeamBattleActive(game)) {
      return [];
    }

    return allFighters.filter((other) => {
      if (!other || other === fighter || !other.isAlive()) {
        return false;
      }
      return HeroBattleArenaHelper.areAllies(fighter, other, game);
    });
  }

  static hasResonance(fighter) {
    return !!(fighter && Date.now() < (fighter.factionResonanceUntil || 0));
  }

  static getMoveSpeedMultiplier(fighter) {
    if (FactionBallSkillSystem.hasResonance(fighter)) {
      return FactionBallConstants.MOVE_SPEED_MULTIPLIER;
    }
    return 1;
  }

  static applyDamageBonus(fighter, damage) {
    if (!FactionBallSkillSystem.hasResonance(fighter)) {
      return damage;
    }
    return Math.max(
      1,
      Math.round(damage * (1 + FactionBallConstants.DAMAGE_BONUS_RATIO))
    );
  }

  static getResonanceIntervalMs(fighter) {
    if (typeof CrazyFightSkillSystem !== "undefined") {
      return CrazyFightSkillSystem.getSkillIntervalMs(
        fighter,
        fighter.template.skillIntervalMs
      );
    }
    return (
      fighter.template.skillIntervalMs ||
      FactionBallConstants.RESONANCE_INTERVAL_MS
    );
  }

  static applyResonance(caster, teammate, now) {
    const until = now + FactionBallConstants.RESONANCE_DURATION_MS;
    caster.factionResonanceUntil = until;
    teammate.factionResonanceUntil = until;
    caster.factionResonanceCastFlashUntil =
      now + FactionBallConstants.RESONANCE_CAST_FLASH_MS;
    teammate.factionResonanceReceiveFlashUntil =
      now + FactionBallConstants.RESONANCE_RECEIVE_FLASH_MS;

    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.setStatusText(caster, "阵营共鸣");
      ElementStatusEffectSystem.setStatusText(teammate, "阵营加成");
    }
  }

  static tickResonance(fighter, allFighters, game, now) {
    if (!FactionBallSkillSystem.isFactionFighter(fighter) || !fighter.isAlive()) {
      return;
    }
    if (!FactionBallSkillSystem.isTeamBattleActive(game)) {
      return;
    }
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isAttackBlocked(fighter)
    ) {
      return;
    }

    const teammates = FactionBallSkillSystem.getTeammates(
      fighter,
      allFighters,
      game
    );
    const interval = FactionBallSkillSystem.getResonanceIntervalMs(fighter);

    for (const teammate of teammates) {
      if (!FactionBallSkillSystem.isOverlapping(fighter, teammate)) {
        continue;
      }

      const lastTime =
        fighter.factionLastResonanceByTarget[teammate.playerId] || 0;
      if (now - lastTime < interval) {
        continue;
      }

      fighter.factionLastResonanceByTarget[teammate.playerId] = now;
      FactionBallSkillSystem.applyResonance(fighter, teammate, now);
    }
  }

  static drawFactionBall(ctx, fighter) {
    if (!FactionBallSkillSystem.isFactionFighter(fighter)) {
      return;
    }

    const now = Date.now();
    if (now < fighter.factionResonanceCastFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(116, 192, 252, 0.8)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    const pulse =
      0.45 +
      0.35 *
        Math.sin(
          (now % FactionBallConstants.TEAM_RING_PULSE_MS) /
            (FactionBallConstants.TEAM_RING_PULSE_MS / (Math.PI * 2))
        );
    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.radius + 5 + pulse * 3, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(76, 110, 245, ${0.25 + pulse * 0.2})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  static drawResonanceAura(ctx, fighter) {
    if (!FactionBallSkillSystem.hasResonance(fighter)) {
      return;
    }

    if (Date.now() < fighter.factionResonanceReceiveFlashUntil) {
      ctx.fillStyle = "#748ffc";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("共鸣", fighter.x, fighter.y - fighter.radius - 18);
      ctx.textAlign = "left";
    }

    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.radius + 7, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(116, 192, 252, 0.45)";
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
