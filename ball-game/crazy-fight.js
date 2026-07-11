/**
 * 疯狂对战 - 玩法同双人模式，全场球体技能超强
 */

const CrazyFightConstants = {
  SUB_MODE: "crazy_fight",
  /** 技能伤害倍率 */
  SKILL_DAMAGE_MULTIPLIER: 1.35,
  /** 技能冷却倍率（越小越快） */
  SKILL_INTERVAL_RATIO: 0.72,
  MIN_SKILL_INTERVAL_MS: 400,
  /** 喷火球触发概率 */
  FLAMETHROWER_PROC_CHANCE: 0.95,
  /** 尖刺球额外反伤次数 */
  SPIKE_EXTRA_REFLECTS: 1,
  /** 橙算球额外叠乘次数 */
  ORANGE_CALC_EXTRA_MULTIPLY: 1,
  /** 斷刀球叠伤间隔倍率 */
  BLADE_STACK_INTERVAL_RATIO: 0.65,
  AURA_PULSE_MS: 900,
};

/**
 * 疯狂对战技能增强
 */
class CrazyFightSkillSystem {
  static isCrazyFightMode(game) {
    return Boolean(game && game.subMode === CrazyFightConstants.SUB_MODE);
  }

  static isSupercharged(fighter) {
    return Boolean(fighter && fighter.crazyFightSupercharged);
  }

  static activateFighter(fighter) {
    fighter.crazyFightSupercharged = true;
    fighter.crazyFightOrangeCalcBonus = CrazyFightConstants.ORANGE_CALC_EXTRA_MULTIPLY;
    fighter.crazyFightBladeStackRatio = CrazyFightConstants.BLADE_STACK_INTERVAL_RATIO;

    if (typeof SpikeReflectSystem !== "undefined" && SpikeReflectSystem.isSpikeFighter(fighter)) {
      fighter.spikeReflectsRemaining =
        (fighter.spikeReflectsRemaining || 0) + CrazyFightConstants.SPIKE_EXTRA_REFLECTS;
    }
  }

  static activateAllFighters(fighters) {
    for (const fighter of fighters) {
      CrazyFightSkillSystem.activateFighter(fighter);
    }
  }

  static getSkillDamage(fighter, baseDamage) {
    if (!CrazyFightSkillSystem.isSupercharged(fighter)) {
      return baseDamage;
    }
    return Math.max(
      1,
      Math.round(baseDamage * CrazyFightConstants.SKILL_DAMAGE_MULTIPLIER)
    );
  }

  static getSkillIntervalMs(fighter, baseIntervalMs) {
    if (!CrazyFightSkillSystem.isSupercharged(fighter)) {
      return baseIntervalMs;
    }
    return Math.max(
      CrazyFightConstants.MIN_SKILL_INTERVAL_MS,
      Math.round(baseIntervalMs * CrazyFightConstants.SKILL_INTERVAL_RATIO)
    );
  }

  static shouldIceRotKeepIceShots(game) {
    return CrazyFightSkillSystem.isCrazyFightMode(game);
  }

  static getFlamethrowerProcChance(fighter) {
    if (CrazyFightSkillSystem.isSupercharged(fighter)) {
      return CrazyFightConstants.FLAMETHROWER_PROC_CHANCE;
    }
    return LittleBallHeroConstants.FLAMETHROWER_PROC_CHANCE;
  }

  static getBladeStackIntervalMs(fighter) {
    const base = LittleBallHeroConstants.BLADE_STACK_INTERVAL_MS;
    if (!CrazyFightSkillSystem.isSupercharged(fighter)) {
      return base;
    }
    const ratio = fighter.crazyFightBladeStackRatio || CrazyFightConstants.BLADE_STACK_INTERVAL_RATIO;
    return Math.max(500, Math.round(base * ratio));
  }

  static getOrangeCalcMaxMultiply(fighter) {
    const bonus = CrazyFightSkillSystem.isSupercharged(fighter)
      ? fighter.crazyFightOrangeCalcBonus || 0
      : 0;
    return LittleBallHeroConstants.ORANGE_CALC_MAX_MULTIPLY_COUNT + bonus;
  }

  static drawAura(ctx, fighter) {
    if (!CrazyFightSkillSystem.isSupercharged(fighter) || !fighter.isAlive()) {
      return;
    }

    const pulse =
      0.5 +
      0.5 *
        Math.sin(
          (Date.now() % CrazyFightConstants.AURA_PULSE_MS) /
            (CrazyFightConstants.AURA_PULSE_MS / (Math.PI * 2))
        );

    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.radius + 10 + pulse * 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 107, 107, ${0.35 + pulse * 0.25})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#ff6b6b";
    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("超强", fighter.x, fighter.y - fighter.radius - 20);
    ctx.textAlign = "left";
  }
}
