/**
 * 防卫球 - 每局随机获得防具头，须先击破防具才能伤害本体
 */

const DefenseBallConstants = {
  BODY_MAX_HEALTH: 500,
  DEBRIS_HEAD_HEALTH: 200,
  BRICK_HEAD_HEALTH: 500,
  IRON_HEAD_HEALTH: 1000,
  DEBRIS_RETALIATE_DAMAGE: 12,
  BRICK_DAMAGE_REDUCTION: 0.25,
  BRICK_RESTRICT_DURATION_MS: 900,
  BRICK_RESTRICT_SPEED_RATIO: 0.55,
  IRON_DAMAGE_REDUCTION: 0.15,
  SHIELD_HIT_FLASH_MS: 260,
  SHIELD_BREAK_FLASH_MS: 420,
  HEAD_ORNAMENT_RADIUS: 16,
  STRIKE_INTERVAL_MS: 3200,
  STRIKE_DAMAGE: 16,
};

/**
 * 防具头类型
 */
class DefenseHeadType {
  static DEBRIS = "debris";

  static BRICK = "brick";

  static IRON = "iron";

  static getAll() {
    return [
      DefenseHeadType.DEBRIS,
      DefenseHeadType.BRICK,
      DefenseHeadType.IRON,
    ];
  }

  static rollRandom() {
    const types = DefenseHeadType.getAll();
    return types[Math.floor(Math.random() * types.length)];
  }

  static getLabel(headType) {
    const labels = {
      [DefenseHeadType.DEBRIS]: "碎屑头",
      [DefenseHeadType.BRICK]: "砖块头",
      [DefenseHeadType.IRON]: "铁块头",
    };
    return labels[headType] || "防具头";
  }

  static getMaxHealth(headType) {
    if (headType === DefenseHeadType.DEBRIS) {
      return DefenseBallConstants.DEBRIS_HEAD_HEALTH;
    }
    if (headType === DefenseHeadType.BRICK) {
      return DefenseBallConstants.BRICK_HEAD_HEALTH;
    }
    if (headType === DefenseHeadType.IRON) {
      return DefenseBallConstants.IRON_HEAD_HEALTH;
    }
    return DefenseBallConstants.DEBRIS_HEAD_HEALTH;
  }

  static getColor(headType) {
    const colors = {
      [DefenseHeadType.DEBRIS]: "#a9a9a9",
      [DefenseHeadType.BRICK]: "#e8590c",
      [DefenseHeadType.IRON]: "#868e96",
    };
    return colors[headType] || "#adb5bd";
  }

  /** 金属防具（可被磁铁球吸取） */
  static isMetalHead(headType) {
    return headType === DefenseHeadType.IRON;
  }
}

/**
 * 单局防具头状态
 */
class DefenseHeadItem {
  constructor(headType) {
    this.headType = headType;
    this.maxHealth = DefenseHeadType.getMaxHealth(headType);
    this.health = this.maxHealth;
  }

  isBroken() {
    return this.health <= 0;
  }
}

/**
 * 防卫球技能与防具系统
 */
class DefenseBallSkillSystem {
  static initFighter(fighter) {
    fighter.defenseItem = null;
    fighter.defenseShieldFlashUntil = 0;
    fighter.defenseBreakFlashUntil = 0;
    fighter.defenseRestrictUntil = 0;
    fighter.defenseRestrictSpeedRatio = 1;
  }

  static isDefenseFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.DEFENSE;
  }

  static rollDefenseItemForBattle(fighter) {
    const headType = DefenseHeadType.rollRandom();
    fighter.defenseItem = new DefenseHeadItem(headType);
  }

  static hasActiveShield(fighter) {
    return (
      DefenseBallSkillSystem.isDefenseFighter(fighter) &&
      fighter.defenseItem &&
      !fighter.defenseItem.isBroken()
    );
  }

  static hasMetalDefense(fighter) {
    return (
      DefenseBallSkillSystem.hasActiveShield(fighter) &&
      DefenseHeadType.isMetalHead(fighter.defenseItem.headType)
    );
  }

  static applyShieldDamage(fighter, amount, attacker, skipReflect, now) {
    const item = fighter.defenseItem;
    if (!item || item.isBroken()) {
      return false;
    }

    let shieldDamage = amount;

    if (item.headType === DefenseHeadType.BRICK) {
      shieldDamage = Math.max(
        1,
        Math.ceil(amount * (1 - DefenseBallConstants.BRICK_DAMAGE_REDUCTION))
      );
      if (attacker && attacker.isAlive()) {
        attacker.defenseRestrictUntil =
          now + DefenseBallConstants.BRICK_RESTRICT_DURATION_MS;
        attacker.defenseRestrictSpeedRatio =
          DefenseBallConstants.BRICK_RESTRICT_SPEED_RATIO;
        if (typeof ElementStatusEffectSystem !== "undefined") {
          ElementStatusEffectSystem.setStatusText(attacker, "砖压");
        }
      }
    }

    if (item.headType === DefenseHeadType.IRON) {
      shieldDamage = Math.max(
        1,
        Math.ceil(amount * (1 - DefenseBallConstants.IRON_DAMAGE_REDUCTION))
      );
    }

    item.health = Math.max(0, item.health - shieldDamage);
    fighter.defenseShieldFlashUntil =
      now + DefenseBallConstants.SHIELD_HIT_FLASH_MS;

    if (item.headType === DefenseHeadType.DEBRIS && attacker && attacker.isAlive()) {
      attacker.takeDamage(
        DefenseBallConstants.DEBRIS_RETALIATE_DAMAGE,
        fighter,
        true
      );
      if (typeof ElementStatusEffectSystem !== "undefined") {
        ElementStatusEffectSystem.setStatusText(attacker, "碎屑反伤");
      }
    }

    if (item.isBroken()) {
      fighter.defenseBreakFlashUntil =
        now + DefenseBallConstants.SHIELD_BREAK_FLASH_MS;
    }

    if (!skipReflect) {
      SpikeReflectSystem.tryReflect(fighter, attacker, false);
    }

    return true;
  }

  static applyBodyDamage(fighter, amount, attacker, skipReflect) {
    let finalAmount = amount;
    if (IronWallSkillSystem.isIronWallFighter(fighter)) {
      finalAmount = IronWallSkillSystem.applyDamageReduction(amount);
      IronWallSkillSystem.markShieldHit(fighter);
    }
    fighter.health = Math.max(0, fighter.health - finalAmount);
    if (!skipReflect) {
      SpikeReflectSystem.tryReflect(fighter, attacker, skipReflect);
    }
  }

  static takeDamage(fighter, amount, attacker, skipReflect) {
    const now = Date.now();
    if (DefenseBallSkillSystem.applyShieldDamage(fighter, amount, attacker, skipReflect, now)) {
      return;
    }
    DefenseBallSkillSystem.applyBodyDamage(fighter, amount, attacker, skipReflect);
  }

  static tickMovementRestriction(fighter, now) {
    if (!fighter.defenseRestrictUntil || now >= fighter.defenseRestrictUntil) {
      fighter.defenseRestrictSpeedRatio = 1;
      return;
    }
    const speed = fighter.getSpeed();
    if (speed < 0.001) {
      return;
    }
    const targetSpeed = fighter.template.moveSpeed * fighter.defenseRestrictSpeedRatio;
    if (speed > targetSpeed) {
      const ratio = targetSpeed / speed;
      fighter.vx *= ratio;
      fighter.vy *= ratio;
    }
  }

  static fireDefenseStrike(fighter, opponent, projectiles, projectileRadius) {
    if (!opponent || !opponent.isAlive()) {
      return;
    }

    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }

    const headType =
      fighter.defenseItem && !fighter.defenseItem.isBroken()
        ? fighter.defenseItem.headType
        : DefenseHeadType.DEBRIS;
    const dirX = dx / dist;
    const dirY = dy / dist;
    const offset = fighter.radius + projectileRadius + 4;
    const damage =
      headType === DefenseHeadType.IRON
        ? DefenseBallConstants.STRIKE_DAMAGE + 6
        : DefenseBallConstants.STRIKE_DAMAGE;

    projectiles.push(
      new HeroSkillProjectile(
        fighter.x + dirX * offset,
        fighter.y + dirY * offset,
        dirX,
        dirY,
        projectileRadius,
        fighter.playerId,
        DefenseHeadType.getColor(headType),
        damage
      )
    );
  }

  static drawDefenseHead(ctx, fighter) {
    if (!fighter.defenseItem || fighter.defenseItem.isBroken()) {
      return;
    }

    const item = fighter.defenseItem;
    const headY = fighter.y - fighter.radius - 14;
    const color = DefenseHeadType.getColor(item.headType);

    ctx.save();
    ctx.translate(fighter.x, headY);

    if (item.headType === DefenseHeadType.DEBRIS) {
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI * 2 * i) / 6;
        const px = Math.cos(angle) * 10;
        const py = Math.sin(angle) * 8;
        ctx.fillStyle = color;
        ctx.fillRect(px - 3, py - 3, 6, 6);
      }
    } else if (item.headType === DefenseHeadType.BRICK) {
      ctx.fillStyle = color;
      ctx.fillRect(-14, -8, 28, 16);
      ctx.strokeStyle = "#933300";
      ctx.lineWidth = 2;
      ctx.strokeRect(-14, -8, 28, 16);
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(-12, -10, 24, 20);
      ctx.strokeStyle = "#495057";
      ctx.lineWidth = 3;
      ctx.strokeRect(-12, -10, 24, 20);
      ctx.fillStyle = "#ced4da";
      ctx.fillRect(-4, -6, 8, 12);
    }

    ctx.restore();

    const barW = 36;
    const barX = fighter.x - barW / 2;
    const barY = headY - 18;
    ctx.fillStyle = "#2a2a40";
    ctx.fillRect(barX, barY, barW, 5);
    ctx.fillStyle = color;
    ctx.fillRect(
      barX,
      barY,
      barW * (item.health / item.maxHealth),
      5
    );

    ctx.fillStyle = "#fff";
    ctx.font = "9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(DefenseHeadType.getLabel(item.headType), fighter.x, barY - 4);
    ctx.textAlign = "left";

    const now = Date.now();
    if (now < fighter.defenseShieldFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, headY, 20, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 212, 59, 0.75)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (now < fighter.defenseBreakFlashUntil) {
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("防具破碎!", fighter.x, headY - 24);
      ctx.textAlign = "left";
    }
  }
}
