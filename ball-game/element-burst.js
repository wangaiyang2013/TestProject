/**
 * 元素球 - 元素爆破：周期召唤 4 颗随机元素子弹环绕自身
 * 物理（暴击）弹造成真实伤害，无视防卫球防具
 */

const ElementBurstConstants = {
  BULLET_COUNT: 4,
  BULLET_RADIUS: 11,
  ORBIT_RADIUS: 58,
  ORBIT_SPEED: 0.048,
  BURST_FLASH_MS: 320,
  BURN_TICK_MS: 500,
  BURN_DURATION_MS: 3000,
  BURN_TICK_DAMAGE: 4,
  POISON_TICK_MS: 600,
  POISON_DURATION_MS: 4000,
  POISON_TICK_DAMAGE: 3,
  FREEZE_DURATION_MS: 1500,
  PARALYZE_DURATION_MS: 1200,
  SILENCE_DURATION_MS: 2000,
  EXPLOSION_RADIUS: 50,
  EXPLOSION_DAMAGE: 22,
  CRIT_MULTIPLIER: 2.0,
  LIFESTEAL_RATIO: 0.5,
  TOUCH_BASE_DAMAGE: 8,
  BLEED_TICK_MS: 800,
  BLEED_DURATION_MS: 4000,
  BLEED_TICK_DAMAGE: 5,
};

/**
 * 八种元素子弹类型
 */
class ElementBulletType {
  static FIRE = "fire";

  static PHYSICAL = "physical";

  static ICE = "ice";

  static POISON = "poison";

  static LIGHTNING = "lightning";

  static VAMPIRE = "vampire";

  static EXPLOSION = "explosion";

  static SILENCE = "silence";

  static getAll() {
    return [
      ElementBulletType.FIRE,
      ElementBulletType.PHYSICAL,
      ElementBulletType.ICE,
      ElementBulletType.POISON,
      ElementBulletType.LIGHTNING,
      ElementBulletType.VAMPIRE,
      ElementBulletType.EXPLOSION,
      ElementBulletType.SILENCE,
    ];
  }

  static getLabel(elementType) {
    const labels = {
      [ElementBulletType.FIRE]: "火焰",
      [ElementBulletType.PHYSICAL]: "物理",
      [ElementBulletType.ICE]: "冰冻",
      [ElementBulletType.POISON]: "中毒",
      [ElementBulletType.LIGHTNING]: "闪电",
      [ElementBulletType.VAMPIRE]: "吸血",
      [ElementBulletType.EXPLOSION]: "爆炸",
      [ElementBulletType.SILENCE]: "沉默",
    };
    return labels[elementType] || "元素";
  }

  static getEffectLabel(elementType) {
    const labels = {
      [ElementBulletType.FIRE]: "灼烧",
      [ElementBulletType.PHYSICAL]: "真实暴击",
      [ElementBulletType.ICE]: "冰冻",
      [ElementBulletType.POISON]: "中毒",
      [ElementBulletType.LIGHTNING]: "麻痹",
      [ElementBulletType.VAMPIRE]: "吸血",
      [ElementBulletType.EXPLOSION]: "爆炸",
      [ElementBulletType.SILENCE]: "沉默",
    };
    return labels[elementType] || "效果";
  }

  static getColor(elementType) {
    const colors = {
      [ElementBulletType.FIRE]: "#ff6b35",
      [ElementBulletType.PHYSICAL]: "#dee2e6",
      [ElementBulletType.ICE]: "#74c0fc",
      [ElementBulletType.POISON]: "#51cf66",
      [ElementBulletType.LIGHTNING]: "#fcc419",
      [ElementBulletType.VAMPIRE]: "#e64980",
      [ElementBulletType.EXPLOSION]: "#ff922b",
      [ElementBulletType.SILENCE]: "#868e96",
    };
    return colors[elementType] || "#9775fa";
  }
}

/**
 * 元素状态效果（灼烧、中毒、冰冻等）
 */
class ElementStatusEffectSystem {
  static initFighter(fighter) {
    fighter.burnUntil = 0;
    fighter.burnNextTickAt = 0;
    fighter.poisonUntil = 0;
    fighter.poisonNextTickAt = 0;
    fighter.frozenUntil = 0;
    fighter.paralyzedUntil = 0;
    fighter.silencedUntil = 0;
    fighter.elementStatusText = "";
    fighter.elementStatusUntil = 0;
    fighter.elementOrbitBullets = [];
    fighter.elementBurstFlashUntil = 0;
    fighter.iceRotHitCount = 0;
    fighter.iceRotSlowUntil = 0;
    fighter.iceRotSlowRatio = 1;
    fighter.bleedUntil = 0;
    fighter.bleedNextTickAt = 0;
  }

  static isSkillBlocked(fighter) {
    const now = Date.now();
    return now < fighter.paralyzedUntil || now < fighter.silencedUntil;
  }

  /** 冰冻或麻痹/沉默时无法发动攻击 */
  static isAttackBlocked(fighter) {
    if (!fighter) {
      return true;
    }
    if (ElementStatusEffectSystem.isFrozen(fighter)) {
      return true;
    }
    return ElementStatusEffectSystem.isSkillBlocked(fighter);
  }

  static isFrozen(fighter) {
    return Date.now() < fighter.frozenUntil;
  }

  static setStatusText(fighter, text) {
    fighter.elementStatusText = text;
    fighter.elementStatusUntil = Date.now() + 900;
  }

  static applyBurn(fighter) {
    fighter.burnUntil = Date.now() + ElementBurstConstants.BURN_DURATION_MS;
    fighter.burnNextTickAt = Date.now() + ElementBurstConstants.BURN_TICK_MS;
    ElementStatusEffectSystem.setStatusText(fighter, "灼烧");
  }

  static applyPoison(fighter) {
    fighter.poisonUntil = Date.now() + ElementBurstConstants.POISON_DURATION_MS;
    fighter.poisonNextTickAt = Date.now() + ElementBurstConstants.POISON_TICK_MS;
    ElementStatusEffectSystem.setStatusText(fighter, "中毒");
  }

  static applyFreeze(fighter) {
    fighter.frozenUntil = Date.now() + ElementBurstConstants.FREEZE_DURATION_MS;
    fighter.vx = 0;
    fighter.vy = 0;
    ElementStatusEffectSystem.setStatusText(fighter, "冰冻·无法攻击");
  }

  static applyParalyze(fighter) {
    fighter.paralyzedUntil = Date.now() + ElementBurstConstants.PARALYZE_DURATION_MS;
    ElementStatusEffectSystem.setStatusText(fighter, "麻痹");
  }

  static applySilence(fighter) {
    fighter.silencedUntil = Date.now() + ElementBurstConstants.SILENCE_DURATION_MS;
    ElementStatusEffectSystem.setStatusText(fighter, "沉默");
  }

  static applyBleed(fighter) {
    const now = Date.now();
    fighter.bleedUntil = now + ElementBurstConstants.BLEED_DURATION_MS;
    fighter.bleedNextTickAt = now + ElementBurstConstants.BLEED_TICK_MS;
    ElementStatusEffectSystem.setStatusText(fighter, "流血");
  }

  static isBleeding(fighter) {
    return fighter && Date.now() < fighter.bleedUntil;
  }

  static tickFighter(fighter, now) {
    if (!fighter || !fighter.isAlive()) {
      return;
    }

    if (now >= fighter.burnUntil) {
      fighter.burnUntil = 0;
    } else if (now >= fighter.burnNextTickAt) {
      fighter.takeDamage(ElementBurstConstants.BURN_TICK_DAMAGE, null, true);
      fighter.burnNextTickAt = now + ElementBurstConstants.BURN_TICK_MS;
    }

    if (now >= fighter.poisonUntil) {
      fighter.poisonUntil = 0;
    } else if (now >= fighter.poisonNextTickAt) {
      fighter.takeDamage(ElementBurstConstants.POISON_TICK_DAMAGE, null, true);
      fighter.poisonNextTickAt = now + ElementBurstConstants.POISON_TICK_MS;
    }

    if (now >= fighter.bleedUntil) {
      fighter.bleedUntil = 0;
    } else if (now >= fighter.bleedNextTickAt) {
      fighter.takeDamage(ElementBurstConstants.BLEED_TICK_DAMAGE, null, true);
      fighter.bleedNextTickAt = now + ElementBurstConstants.BLEED_TICK_MS;
    }

    if (ElementStatusEffectSystem.isFrozen(fighter)) {
      fighter.vx = 0;
      fighter.vy = 0;
    }
  }

  static drawStatus(ctx, fighter) {
    if (Date.now() >= fighter.elementStatusUntil || !fighter.elementStatusText) {
      return;
    }
    const isBleeding = ElementStatusEffectSystem.isBleeding(fighter);
    ctx.fillStyle = isBleeding ? "#fa5252" : "#e599f7";
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(fighter.elementStatusText, fighter.x, fighter.y - fighter.radius - 24);
    ctx.textAlign = "left";
  }
}

/**
 * 环绕元素球的元素子弹
 */
class ElementOrbitBullet {
  constructor(owner, elementType, startAngle, baseDamage) {
    this.owner = owner;
    this.ownerId = owner.playerId;
    this.elementType = elementType;
    this.angle = startAngle;
    this.baseDamage = baseDamage;
    this.alive = true;
    this.radius = ElementBurstConstants.BULLET_RADIUS;
    this.orbitRadius = ElementBurstConstants.ORBIT_RADIUS;
    this.x = owner.x;
    this.y = owner.y;
  }

  update() {
    if (!this.owner || !this.owner.isAlive()) {
      this.alive = false;
      return;
    }
    this.angle += ElementBurstConstants.ORBIT_SPEED;
    this.x = this.owner.x + Math.cos(this.angle) * this.orbitRadius;
    this.y = this.owner.y + Math.sin(this.angle) * this.orbitRadius;
  }

  draw(ctx) {
    const color = ElementBulletType.getColor(this.elementType);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = color + "44";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "8px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      ElementBulletType.getLabel(this.elementType).charAt(0),
      this.x,
      this.y
    );
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}

/**
 * 元素子弹命中效果
 */
class ElementEffectApplier {
  static apply(elementType, owner, target, baseDamage, allFighters) {
    const touchDamage = ElementBurstConstants.TOUCH_BASE_DAMAGE;

    if (elementType === ElementBulletType.FIRE) {
      target.takeDamage(touchDamage, owner);
      ElementStatusEffectSystem.applyBurn(target);
      return;
    }

    if (elementType === ElementBulletType.PHYSICAL) {
      const critDamage = Math.round(
        baseDamage * ElementBurstConstants.CRIT_MULTIPLIER
      );
      target.takeDamage(critDamage, owner, false, true);
      ElementStatusEffectSystem.setStatusText(target, "真实暴击");
      return;
    }

    if (elementType === ElementBulletType.ICE) {
      target.takeDamage(touchDamage, owner);
      ElementStatusEffectSystem.applyFreeze(target);
      return;
    }

    if (elementType === ElementBulletType.POISON) {
      target.takeDamage(touchDamage, owner);
      ElementStatusEffectSystem.applyPoison(target);
      return;
    }

    if (elementType === ElementBulletType.LIGHTNING) {
      target.takeDamage(touchDamage, owner);
      ElementStatusEffectSystem.applyParalyze(target);
      return;
    }

    if (elementType === ElementBulletType.VAMPIRE) {
      target.takeDamage(baseDamage, owner);
      const heal = Math.round(baseDamage * ElementBurstConstants.LIFESTEAL_RATIO);
      owner.health = Math.min(owner.maxHealth, owner.health + heal);
      ElementStatusEffectSystem.setStatusText(owner, "吸血");
      return;
    }

    if (elementType === ElementBulletType.EXPLOSION) {
      ElementEffectApplier.applyExplosion(owner, target, allFighters);
      ElementStatusEffectSystem.setStatusText(target, "爆炸");
      return;
    }

    if (elementType === ElementBulletType.SILENCE) {
      target.takeDamage(touchDamage, owner);
      ElementStatusEffectSystem.applySilence(target);
    }
  }

  static applyExplosion(owner, primaryTarget, allFighters) {
    const centerX = primaryTarget.x;
    const centerY = primaryTarget.y;
    const blastRadius = ElementBurstConstants.EXPLOSION_RADIUS;

    for (const fighter of allFighters) {
      if (!fighter.isAlive() || fighter.playerId === owner.playerId) {
        continue;
      }
      const dist = Math.hypot(fighter.x - centerX, fighter.y - centerY);
      if (dist <= blastRadius + fighter.radius) {
        fighter.takeDamage(ElementBurstConstants.EXPLOSION_DAMAGE, owner);
      }
    }
  }
}

/**
 * 元素爆破召唤与碰撞
 */
class ElementBurstSystem {
  static isElementFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.ELEMENT_BURST;
  }

  static summonOrbitBullets(fighter, baseDamage) {
    const types = ElementBulletType.getAll();
    fighter.elementOrbitBullets = [];

    for (let i = 0; i < ElementBurstConstants.BULLET_COUNT; i += 1) {
      const elementType = types[Math.floor(Math.random() * types.length)];
      const startAngle = (Math.PI * 2 * i) / ElementBurstConstants.BULLET_COUNT;
      fighter.elementOrbitBullets.push(
        new ElementOrbitBullet(fighter, elementType, startAngle, baseDamage)
      );
    }

    fighter.elementBurstFlashUntil = Date.now() + ElementBurstConstants.BURST_FLASH_MS;
  }

  static updateOrbitBullets(owner, opponent, allFighters) {
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isAttackBlocked(owner)
    ) {
      return;
    }
    if (!owner.elementOrbitBullets || owner.elementOrbitBullets.length === 0) {
      return;
    }

    for (const bullet of owner.elementOrbitBullets) {
      if (!bullet.alive) {
        continue;
      }
      bullet.update();

      if (
        opponent &&
        opponent.isAlive() &&
        CollisionDetector.circleHitsCircle(
          bullet.x,
          bullet.y,
          bullet.radius,
          opponent.x,
          opponent.y,
          opponent.radius
        )
      ) {
        ElementEffectApplier.apply(
          bullet.elementType,
          owner,
          opponent,
          bullet.baseDamage,
          allFighters
        );
        bullet.alive = false;
      }
    }

    owner.elementOrbitBullets = owner.elementOrbitBullets.filter(
      (bullet) => bullet.alive
    );
  }

  static drawOrbitBullets(ctx, fighter) {
    if (!fighter.elementOrbitBullets) {
      return;
    }
    for (const bullet of fighter.elementOrbitBullets) {
      if (bullet.alive) {
        bullet.draw(ctx);
      }
    }
  }

  static drawBurstFlash(ctx, fighter) {
    if (Date.now() >= fighter.elementBurstFlashUntil) {
      return;
    }
    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.radius + 16, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(151, 117, 250, 0.65)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}
