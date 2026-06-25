/**
 * 武器球 - 每 3 秒向敌人释放一次随机武器箱武器效果
 */

const WeaponBallConstants = {
  SKILL_INTERVAL_MS: 3000,
  FIRE_FLASH_MS: 360,
  BADGE_PULSE_MS: 800,
};

/**
 * 武器球技能系统
 */
class WeaponBallSkillSystem {
  static isWeaponBallFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.WEAPON_BALL;
  }

  static initFighter(fighter) {
    fighter.weaponBallLastWeaponType = "";
    fighter.weaponBallFireFlashUntil = 0;
  }

  static fireRandomWeapon(
    fighter,
    opponent,
    projectiles,
    projectileRadius,
    game,
    now
  ) {
    if (!WeaponBallSkillSystem.isWeaponBallFighter(fighter)) {
      return false;
    }
    if (!opponent || !opponent.isAlive()) {
      return false;
    }
    if (typeof WeaponBoxCombatSystem === "undefined") {
      return false;
    }

    const weaponType = WeaponType.rollRandomCombatWeapon();
    WeaponBoxCombatSystem.fireWeaponByType(
      fighter,
      opponent,
      projectiles,
      projectileRadius,
      weaponType,
      game
    );

    fighter.weaponBallLastWeaponType = weaponType;
    fighter.weaponBallFireFlashUntil = now + WeaponBallConstants.FIRE_FLASH_MS;

    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.setStatusText(
        fighter,
        WeaponType.getLabel(weaponType)
      );
    }

    return true;
  }

  static tickSkill(fighter, opponent, projectiles, projectileRadius, game, now) {
    if (!WeaponBallSkillSystem.isWeaponBallFighter(fighter) || !fighter.isAlive()) {
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

    const fired = WeaponBallSkillSystem.fireRandomWeapon(
      fighter,
      opponent,
      projectiles,
      projectileRadius,
      game,
      now
    );
    if (fired) {
      fighter.markSkillUsed(now);
    }
  }

  static draw(ctx, fighter) {
    if (!WeaponBallSkillSystem.isWeaponBallFighter(fighter)) {
      return;
    }

    const now = Date.now();
    if (now < fighter.weaponBallFireFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 12, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 212, 59, 0.75)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    const pulse =
      0.4 +
      0.3 *
        Math.sin(
          (now % WeaponBallConstants.BADGE_PULSE_MS) /
            (WeaponBallConstants.BADGE_PULSE_MS / (Math.PI * 2))
        );
    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.radius + 6 + pulse * 2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(134, 142, 150, ${0.28 + pulse * 0.2})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (fighter.weaponBallLastWeaponType) {
      ctx.fillStyle = WeaponType.getColor(fighter.weaponBallLastWeaponType);
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        WeaponType.getShortLabel(fighter.weaponBallLastWeaponType),
        fighter.x,
        fighter.y - fighter.radius - 18
      );
      ctx.textAlign = "left";
    }
  }
}
