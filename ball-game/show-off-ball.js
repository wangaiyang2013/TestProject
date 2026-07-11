/**
 * 装逼球 - 初始 5 秒一次普攻，每次攻击减少 0.1 秒间隔，最低 0.1 秒；伤害 50
 */

const ShowOffBallConstants = {
  /** 初始普攻间隔（毫秒） */
  START_ATTACK_INTERVAL_MS: 5000,
  /** 每次攻击后减少的间隔（毫秒） */
  INTERVAL_DECREASE_MS: 100,
  /** 最低普攻间隔（毫秒） */
  MIN_ATTACK_INTERVAL_MS: 100,
  /** 攻击伤害 */
  ATTACK_DAMAGE: 50,
  /** 生命值 */
  MAX_HEALTH: 888,
  /** 射击闪光时长 */
  FIRE_FLASH_MS: 260,
};

/**
 * 装逼球技能系统
 */
class ShowOffBallSkillSystem {
  static isShowOffFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.SHOW_OFF;
  }

  static initFighter(fighter) {
    fighter.showOffAttackIntervalMs = ShowOffBallConstants.START_ATTACK_INTERVAL_MS;
    fighter.showOffAttackCount = 0;
    fighter.showOffFireFlashUntil = 0;
    fighter.lastSkillTime = Date.now();
  }

  static getAttackIntervalMs(fighter) {
    let interval = fighter.showOffAttackIntervalMs;
    if (typeof CrazyFightSkillSystem !== "undefined") {
      interval = CrazyFightSkillSystem.getSkillIntervalMs(fighter, interval);
    }
    if (typeof BallTouchBonusSystem !== "undefined") {
      interval = Math.round(
        interval * BallTouchBonusSystem.getSkillIntervalRatio(fighter)
      );
    }
    return Math.max(ShowOffBallConstants.MIN_ATTACK_INTERVAL_MS, interval);
  }

  static canAttack(fighter, now) {
    if (!ShowOffBallSkillSystem.isShowOffFighter(fighter) || !fighter.isAlive()) {
      return false;
    }
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isAttackBlocked(fighter)
    ) {
      return false;
    }
    const interval = ShowOffBallSkillSystem.getAttackIntervalMs(fighter);
    return now - fighter.lastSkillTime >= interval;
  }

  static decreaseAttackInterval(fighter) {
    fighter.showOffAttackIntervalMs = Math.max(
      ShowOffBallConstants.MIN_ATTACK_INTERVAL_MS,
      fighter.showOffAttackIntervalMs - ShowOffBallConstants.INTERVAL_DECREASE_MS
    );
    fighter.showOffAttackCount += 1;
  }

  static getIntervalDisplaySec(fighter) {
    const intervalMs = ShowOffBallSkillSystem.getAttackIntervalMs(fighter);
    return (intervalMs / 1000).toFixed(1);
  }

  static fireAttack(fighter, opponent, projectiles, projectileRadius, now) {
    const damage = fighter.getSkillDamage(ShowOffBallConstants.ATTACK_DAMAGE);
    HeroAutoSkillSystem.fireShot(
      fighter,
      opponent,
      projectiles,
      projectileRadius,
      damage,
      "#ffd43b"
    );
    fighter.markSkillUsed(now);
    ShowOffBallSkillSystem.decreaseAttackInterval(fighter);
    fighter.showOffFireFlashUntil = now + ShowOffBallConstants.FIRE_FLASH_MS;

    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.setStatusText(
        fighter,
        `攻速${ShowOffBallSkillSystem.getIntervalDisplaySec(fighter)}s`
      );
    }
  }

  static tryAttack(fighter, opponent, projectiles, projectileRadius, now) {
    if (!ShowOffBallSkillSystem.canAttack(fighter, now)) {
      return;
    }
    if (!opponent || !opponent.isAlive()) {
      return;
    }
    ShowOffBallSkillSystem.fireAttack(
      fighter,
      opponent,
      projectiles,
      projectileRadius,
      now
    );
  }

  static draw(ctx, fighter) {
    if (!ShowOffBallSkillSystem.isShowOffFighter(fighter)) {
      return;
    }

    const now = Date.now();
    const intervalSec = ShowOffBallSkillSystem.getIntervalDisplaySec(fighter);

    ctx.fillStyle = "#ffd43b";
    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `${intervalSec}s`,
      fighter.x,
      fighter.y + fighter.radius + 24
    );
    ctx.textAlign = "left";

    if (now < fighter.showOffFireFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 212, 59, 0.8)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}
