/**
 * 小球英雄战场武器箱：每 15 秒刷新，可开出多种枪械与爆炸物
 */

const WeaponBoxConstants = {
  SPAWN_INTERVAL_MS: 15000,
  BOX_RADIUS: 18,
  SPAWN_EDGE_PADDING: 52,
  PICKUP_FLASH_MS: 700,
  WEAPON_USE_INTERVAL_MS: 900,
  PROJECTILE_SPEED: 12,
  PROJECTILE_LIFETIME_MS: 1100,
  STEN_BURST_COUNT: 4,
  STEN_DAMAGE: 7,
  GATLING_BURST_COUNT: 8,
  GATLING_DAMAGE: 5,
  SHOTGUN_PELLET_COUNT: 5,
  SHOTGUN_SPREAD_ANGLE: 0.38,
  SHOTGUN_DAMAGE: 8,
  DESERT_EAGLE_DAMAGE: 38,
  ROCKET_DAMAGE: 42,
  ROCKET_BLAST_RADIUS: 72,
  C4_DAMAGE: 45,
  C4_BLAST_RADIUS: 70,
  C4_DELAY_MS: 1500,
  MINE_DAMAGE: 36,
  MINE_RADIUS: 14,
  MINE_TRIGGER_RADIUS: 24,
  TRAP_MAX_LIFETIME_MS: 30000,
  /** 匕首：共 3 次攻击，总伤害 3 点（每次 1 点真实伤害） */
  DAGGER_HIT_COUNT: 3,
  DAGGER_HIT_DAMAGE: 1,
  DAGGER_HIT_INTERVAL_MS: 380,
  DAGGER_MELEE_EXTRA_REACH: 30,
  /** 血袋：拾取即饮用，恢复最大生命 30% */
  BLOOD_POUCH_HEAL_RATIO: 0.3,
  /** 血袋：饮用后无敌时间（毫秒） */
  BLOOD_POUCH_INVINCIBLE_MS: 3000,
  BLOOD_POUCH_HEAL_FLASH_MS: 500,
};

/**
 * 武器箱武器类型
 */
class WeaponType {
  static STEN = "sten";

  static GATLING = "gatling";

  static SHOTGUN = "shotgun";

  static DESERT_EAGLE = "desert_eagle";

  static ROCKET = "rocket";

  static C4 = "c4";

  static MINE = "mine";

  static DAGGER = "dagger";

  static BLOOD_POUCH = "blood_pouch";

  static getAll() {
    return [
      WeaponType.STEN,
      WeaponType.GATLING,
      WeaponType.SHOTGUN,
      WeaponType.DESERT_EAGLE,
      WeaponType.ROCKET,
      WeaponType.C4,
      WeaponType.MINE,
      WeaponType.DAGGER,
      WeaponType.BLOOD_POUCH,
    ];
  }

  static isConsumableOnPickup(weaponType) {
    return weaponType === WeaponType.BLOOD_POUCH;
  }

  /** 可向敌人释放的武器类型（排除血袋等消耗品） */
  static getCombatWeaponTypes() {
    return WeaponType.getAll().filter(
      (weaponType) => !WeaponType.isConsumableOnPickup(weaponType)
    );
  }

  static rollRandomCombatWeapon() {
    const types = WeaponType.getCombatWeaponTypes();
    return types[Math.floor(Math.random() * types.length)];
  }

  static rollRandom() {
    const types = WeaponType.getAll();
    return types[Math.floor(Math.random() * types.length)];
  }

  static getLabel(weaponType) {
    const labels = {
      [WeaponType.STEN]: "斯登",
      [WeaponType.GATLING]: "加特林",
      [WeaponType.SHOTGUN]: "霰弹枪",
      [WeaponType.DESERT_EAGLE]: "沙漠巨鹰",
      [WeaponType.ROCKET]: "火箭筒",
      [WeaponType.C4]: "C4炸弹",
      [WeaponType.MINE]: "地雷",
      [WeaponType.DAGGER]: "匕首",
      [WeaponType.BLOOD_POUCH]: "血袋",
    };
    return labels[weaponType] || "武器";
  }

  static getShortLabel(weaponType) {
    const labels = {
      [WeaponType.STEN]: "斯",
      [WeaponType.GATLING]: "林",
      [WeaponType.SHOTGUN]: "霰",
      [WeaponType.DESERT_EAGLE]: "鹰",
      [WeaponType.ROCKET]: "筒",
      [WeaponType.C4]: "C4",
      [WeaponType.MINE]: "雷",
      [WeaponType.DAGGER]: "匕",
      [WeaponType.BLOOD_POUCH]: "血",
    };
    return labels[weaponType] || "武";
  }

  static getDamage(weaponType) {
    const damageMap = {
      [WeaponType.STEN]: WeaponBoxConstants.STEN_DAMAGE,
      [WeaponType.GATLING]: WeaponBoxConstants.GATLING_DAMAGE,
      [WeaponType.SHOTGUN]: WeaponBoxConstants.SHOTGUN_DAMAGE,
      [WeaponType.DESERT_EAGLE]: WeaponBoxConstants.DESERT_EAGLE_DAMAGE,
      [WeaponType.ROCKET]: WeaponBoxConstants.ROCKET_DAMAGE,
      [WeaponType.C4]: WeaponBoxConstants.C4_DAMAGE,
      [WeaponType.MINE]: WeaponBoxConstants.MINE_DAMAGE,
      [WeaponType.DAGGER]: WeaponBoxConstants.DAGGER_HIT_DAMAGE,
      [WeaponType.BLOOD_POUCH]: 0,
    };
    return damageMap[weaponType] || 20;
  }

  static getColor(weaponType) {
    const colors = {
      [WeaponType.STEN]: "#868e96",
      [WeaponType.GATLING]: "#e03131",
      [WeaponType.SHOTGUN]: "#f08c00",
      [WeaponType.DESERT_EAGLE]: "#fcc419",
      [WeaponType.ROCKET]: "#ff6b6b",
      [WeaponType.C4]: "#51cf66",
      [WeaponType.MINE]: "#845ef7",
      [WeaponType.DAGGER]: "#ced4da",
      [WeaponType.BLOOD_POUCH]: "#c92a2a",
    };
    return colors[weaponType] || "#dee2e6";
  }
}

/**
 * 拾取后暂存的武器（一次使用）
 */
class FighterWeaponCharge {
  constructor(weaponType) {
    this.weaponType = weaponType;
    this.damage = WeaponType.getDamage(weaponType);
    this.label = WeaponType.getLabel(weaponType);
    this.acquiredAt = Date.now();
    if (weaponType === WeaponType.DAGGER) {
      this.hitsRemaining = WeaponBoxConstants.DAGGER_HIT_COUNT;
      this.totalDamage = WeaponBoxConstants.DAGGER_HIT_COUNT * WeaponBoxConstants.DAGGER_HIT_DAMAGE;
    }
  }
}

/**
 * 场上武器箱
 */
class WeaponBox {
  constructor(x, y, weaponType) {
    this.x = x;
    this.y = y;
    this.weaponType = weaponType;
    this.radius = WeaponBoxConstants.BOX_RADIUS;
    this.alive = true;
    this.spawnTime = Date.now();
  }

  draw(ctx) {
    if (!this.alive) {
      return;
    }

    const color = WeaponType.getColor(this.weaponType);
    const pulse = 0.85 + 0.15 * Math.sin((Date.now() - this.spawnTime) / 180);

    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.fillRect(
      this.x - this.radius - 4,
      this.y - this.radius - 4,
      (this.radius + 4) * 2,
      (this.radius + 4) * 2
    );

    ctx.fillStyle = "#343a40";
    ctx.fillRect(
      this.x - this.radius,
      this.y - this.radius,
      this.radius * 2,
      this.radius * 2
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(
      this.x - this.radius,
      this.y - this.radius,
      this.radius * 2,
      this.radius * 2
    );

    ctx.fillStyle = color;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#fff";
    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("箱", this.x, this.y - 4);
    ctx.fillStyle = color;
    ctx.font = "bold 8px system-ui, sans-serif";
    ctx.fillText(
      WeaponType.getShortLabel(this.weaponType),
      this.x,
      this.y + 7
    );
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}

/**
 * 武器箱子弹/火箭投射物
 */
class WeaponBoxProjectile {
  constructor(x, y, dirX, dirY, ownerId, damage, color, ownerFighter, options) {
    const config = options || {};
    this.x = x;
    this.y = y;
    this.dirX = dirX;
    this.dirY = dirY;
    this.radius = config.radius || 8;
    this.speed = config.speed || WeaponBoxConstants.PROJECTILE_SPEED;
    this.ownerId = ownerId;
    this.ownerFighter = ownerFighter;
    this.damage = damage;
    this.color = color;
    this.alive = true;
    this.spawnTime = Date.now();
    this.isRocket = config.isRocket === true;
    this.blastRadius = config.blastRadius || 0;
  }

  update() {
    this.x += this.dirX * this.speed;
    this.y += this.dirY * this.speed;
    if (
      Date.now() - this.spawnTime >
      WeaponBoxConstants.PROJECTILE_LIFETIME_MS
    ) {
      this.alive = false;
    }
  }

  isOutOfBounds(arena) {
    return (
      this.x - this.radius < arena.left ||
      this.x + this.radius > arena.right ||
      this.y - this.radius < arena.top ||
      this.y + this.radius > arena.bottom
    );
  }

  onHitTarget(target, fighters) {
    if (this.isRocket) {
      WeaponBoxCombatSystem.applyBlastDamage(
        this.x,
        this.y,
        this.blastRadius,
        this.damage,
        this.ownerFighter,
        fighters
      );
      return;
    }
    target.takeDamage(this.damage, this.ownerFighter);
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = this.color + "55";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * 场上陷阱：C4 / 地雷
 */
class WeaponFieldTrap {
  constructor(trapType, x, y, ownerId, ownerFighter) {
    this.trapType = trapType;
    this.x = x;
    this.y = y;
    this.ownerId = ownerId;
    this.ownerFighter = ownerFighter;
    this.alive = true;
    this.spawnTime = Date.now();
    this.detonateAt =
      trapType === WeaponType.C4
        ? Date.now() + WeaponBoxConstants.C4_DELAY_MS
        : 0;
    this.radius =
      trapType === WeaponType.MINE
        ? WeaponBoxConstants.MINE_RADIUS
        : 12;
    this.triggerRadius =
      trapType === WeaponType.MINE
        ? WeaponBoxConstants.MINE_TRIGGER_RADIUS
        : WeaponBoxConstants.C4_BLAST_RADIUS;
  }

  isExpired(now) {
    return now - this.spawnTime > WeaponBoxConstants.TRAP_MAX_LIFETIME_MS;
  }

  draw(ctx) {
    if (!this.alive) {
      return;
    }

    const color = WeaponType.getColor(this.trapType);
    if (this.trapType === WeaponType.C4) {
      ctx.fillStyle = "#2b8a3e";
      ctx.fillRect(this.x - 10, this.y - 8, 20, 16);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x - 10, this.y - 8, 20, 16);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("C4", this.x, this.y);
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#343a40";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = "bold 8px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("雷", this.x, this.y);
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}

/**
 * 武器攻击结算
 */
class WeaponBoxCombatSystem {
  static hasWeapon(fighter) {
    return !!(fighter && fighter.weaponCharge);
  }

  static isInvincible(fighter) {
    return !!(fighter && Date.now() < (fighter.weaponInvincibleUntil || 0));
  }

  static applyBloodPouch(fighter, now) {
    const healAmount = Math.max(
      1,
      Math.round(
        fighter.maxHealth * WeaponBoxConstants.BLOOD_POUCH_HEAL_RATIO
      )
    );
    fighter.health = Math.min(fighter.maxHealth, fighter.health + healAmount);
    fighter.weaponInvincibleUntil =
      now + WeaponBoxConstants.BLOOD_POUCH_INVINCIBLE_MS;
    fighter.weaponPickupFlashUntil = now + WeaponBoxConstants.PICKUP_FLASH_MS;
    fighter.weaponBloodHealFlashUntil =
      now + WeaponBoxConstants.BLOOD_POUCH_HEAL_FLASH_MS;

    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.setStatusText(
        fighter,
        `血袋+${healAmount}·无敌3秒`
      );
    }

    return healAmount;
  }

  static tryUseWeapon(fighter, opponent, projectiles, projectileRadius, now, game) {
    if (!WeaponBoxCombatSystem.hasWeapon(fighter)) {
      return false;
    }
    if (!opponent || !opponent.isAlive()) {
      return false;
    }

    const charge = fighter.weaponCharge;

    if (charge.weaponType === WeaponType.DAGGER) {
      if (
        fighter.lastWeaponUseTime &&
        now - fighter.lastWeaponUseTime < WeaponBoxConstants.DAGGER_HIT_INTERVAL_MS
      ) {
        return false;
      }
      const struck = WeaponBoxCombatSystem.fireDaggerStrike(fighter, opponent);
      if (!struck) {
        return false;
      }
      fighter.lastWeaponUseTime = now;
      charge.hitsRemaining -= 1;
      fighter.weaponUseFlashUntil = now + WeaponBoxConstants.PICKUP_FLASH_MS;
      fighter.weaponDaggerSlashUntil = now + 220;
      if (charge.hitsRemaining <= 0) {
        fighter.weaponCharge = null;
      }
      if (typeof ElementStatusEffectSystem !== "undefined") {
        const left = charge.hitsRemaining;
        ElementStatusEffectSystem.setStatusText(
          fighter,
          left > 0 ? `匕首剩${left}击` : "匕首3伤打完"
        );
      }
      return true;
    }

    if (
      fighter.lastWeaponUseTime &&
      now - fighter.lastWeaponUseTime < WeaponBoxConstants.WEAPON_USE_INTERVAL_MS
    ) {
      return false;
    }

    fighter.lastWeaponUseTime = now;
    fighter.weaponCharge = null;
    fighter.weaponUseFlashUntil = now + WeaponBoxConstants.PICKUP_FLASH_MS;

    WeaponBoxCombatSystem.fireWeapon(
      fighter,
      opponent,
      projectiles,
      projectileRadius,
      charge,
      game
    );

    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.setStatusText(fighter, charge.label);
    }
    return true;
  }

  static fireWeaponByType(
    fighter,
    opponent,
    projectiles,
    projectileRadius,
    weaponType,
    game
  ) {
    const charge = new FighterWeaponCharge(weaponType);
    WeaponBoxCombatSystem.fireWeapon(
      fighter,
      opponent,
      projectiles,
      projectileRadius,
      charge,
      game
    );
    return weaponType;
  }

  static fireWeapon(fighter, opponent, projectiles, projectileRadius, charge, game) {
    const type = charge.weaponType;

    if (type === WeaponType.STEN) {
      WeaponBoxCombatSystem.fireBurst(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        WeaponBoxConstants.STEN_BURST_COUNT,
        WeaponBoxConstants.STEN_DAMAGE,
        WeaponType.getColor(type),
        0.06
      );
      return;
    }
    if (type === WeaponType.GATLING) {
      WeaponBoxCombatSystem.fireBurst(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        WeaponBoxConstants.GATLING_BURST_COUNT,
        WeaponBoxConstants.GATLING_DAMAGE,
        WeaponType.getColor(type),
        0.12
      );
      return;
    }
    if (type === WeaponType.SHOTGUN) {
      WeaponBoxCombatSystem.fireShotgun(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        charge.damage
      );
      return;
    }
    if (type === WeaponType.DESERT_EAGLE) {
      WeaponBoxCombatSystem.fireProjectile(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        charge.damage,
        WeaponType.getColor(type),
        { radius: 10, speed: 14 }
      );
      return;
    }
    if (type === WeaponType.ROCKET) {
      WeaponBoxCombatSystem.fireProjectile(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        charge.damage,
        WeaponType.getColor(type),
        {
          radius: 11,
          speed: 10,
          isRocket: true,
          blastRadius: WeaponBoxConstants.ROCKET_BLAST_RADIUS,
        }
      );
      return;
    }
    if (type === WeaponType.C4) {
      WeaponBoxTrapSystem.placeTrap(
        game,
        WeaponType.C4,
        opponent.x,
        opponent.y,
        fighter
      );
      return;
    }
    if (type === WeaponType.MINE) {
      WeaponBoxTrapSystem.placeTrap(
        game,
        WeaponType.MINE,
        fighter.x,
        fighter.y,
        fighter
      );
      return;
    }
    if (type === WeaponType.DAGGER) {
      WeaponBoxCombatSystem.fireDaggerStrike(fighter, opponent);
    }
  }

  /**
   * 匕首突刺：真实伤害（无视减伤/防具），不触发尖刺反伤
   * 弱点：总伤害仅 3 点；优势：尽可能全额结算不被抵消
   */
  static fireDaggerStrike(fighter, opponent) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return false;
    }

    const reach =
      fighter.radius +
      opponent.radius +
      WeaponBoxConstants.DAGGER_MELEE_EXTRA_REACH;
    if (dist > reach) {
      return false;
    }

    const nx = dx / dist;
    const ny = dy / dist;
    opponent.takeDamage(
      WeaponBoxConstants.DAGGER_HIT_DAMAGE,
      fighter,
      true,
      true
    );
    opponent.vx += nx * 1.2;
    opponent.vy += ny * 1.2;
    fighter.vx -= nx * 0.4;
    fighter.vy -= ny * 0.4;
    ContinuousBouncePhysics.maintainSpeed(fighter);
    ContinuousBouncePhysics.maintainSpeed(opponent);
    return true;
  }

  static getAimDirection(fighter, opponent) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return { dirX: 1, dirY: 0 };
    }
    return { dirX: dx / dist, dirY: dy / dist };
  }

  static fireProjectile(
    fighter,
    opponent,
    projectiles,
    projectileRadius,
    damage,
    color,
    options
  ) {
    const aim = WeaponBoxCombatSystem.getAimDirection(fighter, opponent);
    const offset = fighter.radius + projectileRadius + 4;
    projectiles.push(
      new WeaponBoxProjectile(
        fighter.x + aim.dirX * offset,
        fighter.y + aim.dirY * offset,
        aim.dirX,
        aim.dirY,
        fighter.playerId,
        damage,
        color,
        fighter,
        options
      )
    );
  }

  static fireBurst(
    fighter,
    opponent,
    projectiles,
    projectileRadius,
    count,
    damage,
    color,
    spread
  ) {
    const aim = WeaponBoxCombatSystem.getAimDirection(fighter, opponent);
    const baseAngle = Math.atan2(aim.dirY, aim.dirX);
    const offset = fighter.radius + projectileRadius + 4;

    for (let i = 0; i < count; i += 1) {
      const angleOffset = (i - (count - 1) / 2) * spread;
      const angle = baseAngle + angleOffset;
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      projectiles.push(
        new WeaponBoxProjectile(
          fighter.x + dirX * offset,
          fighter.y + dirY * offset,
          dirX,
          dirY,
          fighter.playerId,
          damage,
          color,
          fighter,
          { radius: 6, speed: 13 }
        )
      );
    }
  }

  static fireShotgun(
    fighter,
    opponent,
    projectiles,
    projectileRadius,
    damage
  ) {
    const aim = WeaponBoxCombatSystem.getAimDirection(fighter, opponent);
    const baseAngle = Math.atan2(aim.dirY, aim.dirX);
    const offset = fighter.radius + projectileRadius + 4;
    const spread = WeaponBoxConstants.SHOTGUN_SPREAD_ANGLE;
    const count = WeaponBoxConstants.SHOTGUN_PELLET_COUNT;

    for (let i = 0; i < count; i += 1) {
      const angleOffset = (i - (count - 1) / 2) * spread;
      const angle = baseAngle + angleOffset;
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      projectiles.push(
        new WeaponBoxProjectile(
          fighter.x + dirX * offset,
          fighter.y + dirY * offset,
          dirX,
          dirY,
          fighter.playerId,
          damage,
          WeaponType.getColor(WeaponType.SHOTGUN),
          fighter,
          { radius: 5, speed: 11 }
        )
      );
    }
  }

  static applyBlastDamage(centerX, centerY, blastRadius, damage, attacker, fighters) {
    for (const fighter of fighters) {
      if (!fighter.isAlive()) {
        continue;
      }
      if (attacker && fighter.playerId === attacker.playerId) {
        continue;
      }
      const dist = Math.hypot(fighter.x - centerX, fighter.y - centerY);
      if (dist <= blastRadius + fighter.radius) {
        fighter.takeDamage(damage, attacker);
      }
    }
  }

  static drawFighterWeaponBadge(ctx, fighter) {
    if (WeaponBoxCombatSystem.hasWeapon(fighter)) {
      ctx.fillStyle = WeaponType.getColor(fighter.weaponCharge.weaponType);
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      let badgeText = fighter.weaponCharge.label;
      if (
        fighter.weaponCharge.weaponType === WeaponType.DAGGER &&
        fighter.weaponCharge.hitsRemaining
      ) {
        badgeText = `匕首×${fighter.weaponCharge.hitsRemaining}`;
      }
      ctx.fillText(badgeText, fighter.x, fighter.y - fighter.radius - 34);
      ctx.textAlign = "left";
    }

    if (Date.now() < fighter.weaponDaggerSlashUntil) {
      const angle = Math.atan2(
        fighter.vy || 0.001,
        fighter.vx || 1
      );
      const reach = fighter.radius + 22;
      ctx.strokeStyle = "#f8f9fa";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fighter.x, fighter.y);
      ctx.lineTo(
        fighter.x + Math.cos(angle) * reach,
        fighter.y + Math.sin(angle) * reach
      );
      ctx.stroke();
    }

    if (Date.now() < fighter.weaponPickupFlashUntil) {
      ctx.fillStyle = "#ffd43b";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("获得武器!", fighter.x, fighter.y - fighter.radius - 46);
      ctx.textAlign = "left";
    }

    if (Date.now() < fighter.weaponUseFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 12, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 212, 59, 0.75)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    if (WeaponBoxCombatSystem.isInvincible(fighter)) {
      const pulse =
        0.5 +
        0.5 * Math.sin((Date.now() % 500) / (500 / (Math.PI * 2)));
      ctx.beginPath();
      ctx.arc(
        fighter.x,
        fighter.y,
        fighter.radius + 10 + pulse * 4,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = `rgba(255, 107, 107, ${0.45 + pulse * 0.35})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("无敌", fighter.x, fighter.y + fighter.radius + 24);
      ctx.textAlign = "left";
    }

    if (Date.now() < (fighter.weaponBloodHealFlashUntil || 0)) {
      ctx.fillStyle = "#51cf66";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("饮血回复", fighter.x, fighter.y - fighter.radius - 58);
      ctx.textAlign = "left";
    }
  }
}

/**
 * C4 / 地雷陷阱系统
 */
class WeaponBoxTrapSystem {
  static initBattle(game) {
    game.weaponTraps = [];
  }

  static placeTrap(game, trapType, x, y, ownerFighter) {
    if (!game.weaponTraps) {
      game.weaponTraps = [];
    }
    game.weaponTraps.push(
      new WeaponFieldTrap(trapType, x, y, ownerFighter.playerId, ownerFighter)
    );
  }

  static tick(game, now) {
    if (!game || !game.weaponTraps || game.phase !== "battle") {
      return;
    }

    for (let i = game.weaponTraps.length - 1; i >= 0; i -= 1) {
      const trap = game.weaponTraps[i];
      if (!trap.alive || trap.isExpired(now)) {
        game.weaponTraps.splice(i, 1);
        continue;
      }

      if (trap.trapType === WeaponType.C4 && now >= trap.detonateAt) {
        WeaponBoxTrapSystem.detonateTrap(game, trap);
        game.weaponTraps.splice(i, 1);
        continue;
      }

      if (trap.trapType === WeaponType.MINE) {
        WeaponBoxTrapSystem.tryTriggerMine(game, trap);
        if (!trap.alive) {
          game.weaponTraps.splice(i, 1);
        }
      }
    }
  }

  static detonateTrap(game, trap) {
    const damage =
      trap.trapType === WeaponType.C4
        ? WeaponBoxConstants.C4_DAMAGE
        : WeaponBoxConstants.MINE_DAMAGE;
    const radius =
      trap.trapType === WeaponType.C4
        ? WeaponBoxConstants.C4_BLAST_RADIUS
        : WeaponBoxConstants.MINE_TRIGGER_RADIUS;

    WeaponBoxCombatSystem.applyBlastDamage(
      trap.x,
      trap.y,
      radius,
      damage,
      trap.ownerFighter,
      game.fighters
    );
    trap.alive = false;

    if (typeof ElementStatusEffectSystem !== "undefined") {
      for (const fighter of game.fighters) {
        const dist = Math.hypot(fighter.x - trap.x, fighter.y - trap.y);
        if (dist <= radius + fighter.radius) {
          ElementStatusEffectSystem.setStatusText(fighter, "爆炸");
        }
      }
    }
  }

  static tryTriggerMine(game, trap) {
    for (const fighter of game.fighters) {
      if (!fighter.isAlive() || fighter.playerId === trap.ownerId) {
        continue;
      }
      if (
        CollisionDetector.circleHitsCircle(
          fighter.x,
          fighter.y,
          fighter.radius,
          trap.x,
          trap.y,
          trap.triggerRadius
        )
      ) {
        WeaponBoxTrapSystem.detonateTrap(game, trap);
        return;
      }
    }
  }

  static draw(ctx, game) {
    if (!game.weaponTraps) {
      return;
    }
    for (const trap of game.weaponTraps) {
      trap.draw(ctx);
    }
  }
}

/**
 * 武器箱刷新与拾取
 */
class WeaponBoxSpawnSystem {
  static initBattle(game) {
    game.weaponBox = null;
    game.lastWeaponBoxSpawnAt = Date.now();
    WeaponBoxTrapSystem.initBattle(game);
    WeaponBoxSpawnSystem.spawnBox(game);
  }

  static tick(game, now) {
    if (!game || game.phase !== "battle") {
      return;
    }

    if (now - game.lastWeaponBoxSpawnAt >= WeaponBoxConstants.SPAWN_INTERVAL_MS) {
      WeaponBoxSpawnSystem.spawnBox(game);
      game.lastWeaponBoxSpawnAt = now;
    }

    WeaponBoxSpawnSystem.tryPickup(game);
    WeaponBoxTrapSystem.tick(game, now);
  }

  static spawnBox(game) {
    const arena = game.arena;
    if (!arena) {
      return;
    }

    const pad = WeaponBoxConstants.SPAWN_EDGE_PADDING;
    const boxRadius = WeaponBoxConstants.BOX_RADIUS;
    const minX = arena.left + pad + boxRadius;
    const maxX = arena.right - pad - boxRadius;
    const minY = arena.top + pad + boxRadius;
    const maxY = arena.bottom - pad - boxRadius;

    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);

    game.weaponBox = new WeaponBox(x, y, WeaponType.rollRandom());
  }

  static tryPickup(game) {
    const box = game.weaponBox;
    if (!box || !box.alive) {
      return;
    }

    for (const fighter of game.fighters) {
      if (!fighter.isAlive()) {
        continue;
      }
      if (
        CollisionDetector.circleHitsCircle(
          fighter.x,
          fighter.y,
          fighter.radius,
          box.x,
          box.y,
          box.radius
        )
      ) {
        const now = Date.now();
        box.alive = false;
        game.weaponBox = null;

        if (WeaponType.isConsumableOnPickup(box.weaponType)) {
          WeaponBoxCombatSystem.applyBloodPouch(fighter, now);
          return;
        }

        fighter.weaponCharge = new FighterWeaponCharge(box.weaponType);
        fighter.weaponPickupFlashUntil = now + WeaponBoxConstants.PICKUP_FLASH_MS;
        if (typeof ElementStatusEffectSystem !== "undefined") {
          ElementStatusEffectSystem.setStatusText(
            fighter,
            "拾取" + fighter.weaponCharge.label
          );
        }
        return;
      }
    }
  }

  static draw(ctx, game) {
    if (game.weaponBox && game.weaponBox.alive) {
      game.weaponBox.draw(ctx);
    }
    WeaponBoxTrapSystem.draw(ctx, game);
  }
}
