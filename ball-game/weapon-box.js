/**
 * 小球英雄战场武器箱：每 15 秒在随机位置刷新，球捡到后可发动武器攻击
 */

const WeaponBoxConstants = {
  SPAWN_INTERVAL_MS: 15000,
  BOX_RADIUS: 18,
  SPAWN_EDGE_PADDING: 52,
  PICKUP_FLASH_MS: 700,
  WEAPON_USE_INTERVAL_MS: 900,
  LASER_DAMAGE: 28,
  HAMMER_DAMAGE: 32,
  GRENADE_DAMAGE: 24,
  GRENADE_BLAST_RADIUS: 64,
  PROJECTILE_SPEED: 12,
  PROJECTILE_LIFETIME_MS: 1100,
};

/**
 * 武器箱可开出的武器类型
 */
class WeaponType {
  static LASER = "laser";

  static HAMMER = "hammer";

  static GRENADE = "grenade";

  static getAll() {
    return [WeaponType.LASER, WeaponType.HAMMER, WeaponType.GRENADE];
  }

  static rollRandom() {
    const types = WeaponType.getAll();
    return types[Math.floor(Math.random() * types.length)];
  }

  static getLabel(weaponType) {
    const labels = {
      [WeaponType.LASER]: "激光炮",
      [WeaponType.HAMMER]: "巨锤",
      [WeaponType.GRENADE]: "榴弹",
    };
    return labels[weaponType] || "武器";
  }

  static getDamage(weaponType) {
    if (weaponType === WeaponType.LASER) {
      return WeaponBoxConstants.LASER_DAMAGE;
    }
    if (weaponType === WeaponType.HAMMER) {
      return WeaponBoxConstants.HAMMER_DAMAGE;
    }
    if (weaponType === WeaponType.GRENADE) {
      return WeaponBoxConstants.GRENADE_DAMAGE;
    }
    return 20;
  }

  static getColor(weaponType) {
    const colors = {
      [WeaponType.LASER]: "#ff6b6b",
      [WeaponType.HAMMER]: "#fcc419",
      [WeaponType.GRENADE]: "#51cf66",
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
    ctx.fillText("箱", this.x, this.y - 3);
    ctx.fillStyle = color;
    ctx.font = "8px system-ui, sans-serif";
    ctx.fillText(
      WeaponType.getLabel(this.weaponType).charAt(0),
      this.x,
      this.y + 7
    );
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}

/**
 * 武器箱投射物（激光炮）
 */
class WeaponBoxProjectile {
  constructor(x, y, dirX, dirY, ownerId, damage, color, ownerFighter) {
    this.x = x;
    this.y = y;
    this.dirX = dirX;
    this.dirY = dirY;
    this.radius = 9;
    this.ownerId = ownerId;
    this.ownerFighter = ownerFighter;
    this.damage = damage;
    this.color = color;
    this.alive = true;
    this.spawnTime = Date.now();
  }

  update() {
    this.x += this.dirX * WeaponBoxConstants.PROJECTILE_SPEED;
    this.y += this.dirY * WeaponBoxConstants.PROJECTILE_SPEED;
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
 * 武器攻击结算
 */
class WeaponBoxCombatSystem {
  static hasWeapon(fighter) {
    return !!(fighter && fighter.weaponCharge);
  }

  static tryUseWeapon(fighter, opponent, projectiles, projectileRadius, now) {
    if (!WeaponBoxCombatSystem.hasWeapon(fighter)) {
      return false;
    }
    if (!opponent || !opponent.isAlive()) {
      return false;
    }
    if (fighter.lastWeaponUseTime && now - fighter.lastWeaponUseTime < WeaponBoxConstants.WEAPON_USE_INTERVAL_MS) {
      return false;
    }

    const charge = fighter.weaponCharge;
    fighter.lastWeaponUseTime = now;
    fighter.weaponCharge = null;
    fighter.weaponUseFlashUntil = now + WeaponBoxConstants.PICKUP_FLASH_MS;

    if (charge.weaponType === WeaponType.LASER) {
      WeaponBoxCombatSystem.fireLaser(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        charge.damage
      );
    } else if (charge.weaponType === WeaponType.HAMMER) {
      WeaponBoxCombatSystem.fireHammer(fighter, opponent, charge.damage);
    } else if (charge.weaponType === WeaponType.GRENADE) {
      WeaponBoxCombatSystem.fireGrenade(fighter, opponent, charge.damage);
    }

    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.setStatusText(fighter, charge.label);
    }
    return true;
  }

  static fireLaser(fighter, opponent, projectiles, projectileRadius, damage) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }
    const dirX = dx / dist;
    const dirY = dy / dist;
    const offset = fighter.radius + projectileRadius + 4;
    projectiles.push(
      new WeaponBoxProjectile(
        fighter.x + dirX * offset,
        fighter.y + dirY * offset,
        dirX,
        dirY,
        fighter.playerId,
        damage,
        WeaponType.getColor(WeaponType.LASER),
        fighter
      )
    );
  }

  static fireHammer(fighter, opponent, damage) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }
    const nx = dx / dist;
    const ny = dy / dist;
    const reach = fighter.radius + opponent.radius + 36;
    if (dist <= reach) {
      opponent.takeDamage(damage, fighter);
      opponent.vx += nx * 4;
      opponent.vy += ny * 4;
      fighter.vx -= nx * 1.2;
      fighter.vy -= ny * 1.2;
      ContinuousBouncePhysics.maintainSpeed(fighter);
      ContinuousBouncePhysics.maintainSpeed(opponent);
    }
  }

  static fireGrenade(fighter, opponent, damage) {
    const blastRadius = WeaponBoxConstants.GRENADE_BLAST_RADIUS;
    const dist = Math.hypot(opponent.x - fighter.x, opponent.y - fighter.y);
    if (dist <= blastRadius + opponent.radius) {
      opponent.takeDamage(damage, fighter);
    }
    fighter.weaponGrenadeFlashUntil = Date.now() + 320;
  }

  static drawFighterWeaponBadge(ctx, fighter) {
    if (WeaponBoxCombatSystem.hasWeapon(fighter)) {
      ctx.fillStyle = WeaponType.getColor(fighter.weaponCharge.weaponType);
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        fighter.weaponCharge.label,
        fighter.x,
        fighter.y - fighter.radius - 34
      );
      ctx.textAlign = "left";
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

    if (Date.now() < fighter.weaponGrenadeFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, WeaponBoxConstants.GRENADE_BLAST_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(81, 207, 102, 0.45)";
      ctx.lineWidth = 3;
      ctx.stroke();
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
        fighter.weaponCharge = new FighterWeaponCharge(box.weaponType);
        fighter.weaponPickupFlashUntil =
          Date.now() + WeaponBoxConstants.PICKUP_FLASH_MS;
        box.alive = false;
        game.weaponBox = null;
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
  }
}
