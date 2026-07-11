/**
 * 医疗球 - 触碰队友时治疗；仅在双队团战模式可选
 */

const MedicalBallConstants = {
  /** 触身治疗间隔（毫秒） */
  HEAL_INTERVAL_MS: 800,
  /** 单次治疗量（若模板未指定 skillDamage 时使用） */
  DEFAULT_HEAL_AMOUNT: 18,
  HEAL_CAST_FLASH_MS: 320,
  HEAL_RECEIVE_FLASH_MS: 420,
  TEAM_RING_PULSE_MS: 700,
};

/**
 * 医疗球技能系统
 */
class MedicalSkillSystem {
  static isMedicalFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.MEDICAL;
  }

  static initFighter(fighter) {
    fighter.medicalLastHealByTarget = {};
    fighter.medicalHealCastFlashUntil = 0;
    fighter.medicalHealReceiveFlashUntil = 0;
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
    if (!MedicalSkillSystem.isTeamBattleActive(game)) {
      return [];
    }

    return allFighters.filter((other) => {
      if (!other || other === fighter || !other.isAlive()) {
        return false;
      }
      return !HeroTeamRegistry.areEnemies(fighter.playerId, other.playerId);
    });
  }

  static getHealAmount(fighter) {
    const amount =
      typeof fighter.getSkillDamage === "function"
        ? fighter.getSkillDamage()
        : fighter.template.skillDamage;
    return Math.max(1, Math.round(amount || MedicalBallConstants.DEFAULT_HEAL_AMOUNT));
  }

  static getHealIntervalMs(fighter) {
    if (typeof CrazyFightSkillSystem !== "undefined") {
      return CrazyFightSkillSystem.getSkillIntervalMs(
        fighter,
        fighter.template.skillIntervalMs
      );
    }
    return (
      fighter.template.skillIntervalMs ||
      MedicalBallConstants.HEAL_INTERVAL_MS
    );
  }

  static healTeammate(healer, teammate, amount, now) {
    const beforeHealth = teammate.health;
    teammate.health = Math.min(teammate.maxHealth, teammate.health + amount);
    const actualHeal = teammate.health - beforeHealth;
    if (actualHeal <= 0) {
      return 0;
    }

    healer.medicalHealCastFlashUntil =
      now + MedicalBallConstants.HEAL_CAST_FLASH_MS;
    teammate.medicalHealReceiveFlashUntil =
      now + MedicalBallConstants.HEAL_RECEIVE_FLASH_MS;

    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.setStatusText(teammate, `+${actualHeal}`);
      ElementStatusEffectSystem.setStatusText(healer, "治疗");
    }

    return actualHeal;
  }

  static tickHeal(fighter, allFighters, game, now) {
    if (!MedicalSkillSystem.isMedicalFighter(fighter) || !fighter.isAlive()) {
      return;
    }
    if (!MedicalSkillSystem.isTeamBattleActive(game)) {
      return;
    }
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isAttackBlocked(fighter)
    ) {
      return;
    }

    const teammates = MedicalSkillSystem.getTeammates(
      fighter,
      allFighters,
      game
    );
    const healAmount = MedicalSkillSystem.getHealAmount(fighter);
    const healInterval = MedicalSkillSystem.getHealIntervalMs(fighter);

    for (const teammate of teammates) {
      if (!MedicalSkillSystem.isOverlapping(fighter, teammate)) {
        continue;
      }
      if (teammate.health >= teammate.maxHealth) {
        continue;
      }

      const lastHealTime =
        fighter.medicalLastHealByTarget[teammate.playerId] || 0;
      if (now - lastHealTime < healInterval) {
        continue;
      }

      const healed = MedicalSkillSystem.healTeammate(
        fighter,
        teammate,
        healAmount,
        now
      );
      if (healed > 0) {
        fighter.medicalLastHealByTarget[teammate.playerId] = now;
      }
    }
  }

  static draw(ctx, fighter) {
    if (!MedicalSkillSystem.isMedicalFighter(fighter)) {
      return;
    }

    const now = Date.now();
    if (now < fighter.medicalHealCastFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(51, 217, 178, 0.75)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    if (now < fighter.medicalHealReceiveFlashUntil) {
      ctx.fillStyle = "#38d9a9";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("治疗", fighter.x, fighter.y - fighter.radius - 18);
      ctx.textAlign = "left";
    }

    const pulse =
      0.45 +
      0.35 *
        Math.sin(
          (now % MedicalBallConstants.TEAM_RING_PULSE_MS) /
            (MedicalBallConstants.TEAM_RING_PULSE_MS / (Math.PI * 2))
        );
    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.radius + 5 + pulse * 3, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(32, 201, 151, ${0.25 + pulse * 0.2})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
