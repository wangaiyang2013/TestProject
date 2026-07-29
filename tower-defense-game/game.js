/**
 * 塔防大战 - 5 条路 × 26 列长距离战场
 * 6 种蛇系植物 vs 小怪物，最左侧小推车可清整路敌人
 */

const ShootDirection = {
  LEFT: -1,
  RIGHT: 1,
};

const GameConstants = {
  ROAD_COUNT: 5,
  COLUMN_COUNT: 26,
  INITIAL_SUN: 150,
  PROJECTILE_SPEED: 0.18,
  ENEMY_SPEED: 0.045,
  ENEMY_HP: 270,
  ENEMY_SPAWN_INTERVAL_MS: 1800,
  ENEMY_INITIAL_SPAWN_COUNT: 3,
  ENEMY_INITIAL_SPAWN_DELAY_MS: 600,
  PLANT_SPAWN_ANIM_MS: 650,
  WAVE_ENEMY_COUNT: 8,
  WAVE_BREAK_MS: 5000,
  CART_WIDTH_RATIO: 0.6,
  BASE_FAIL_COLUMN: 0,
  CART_TRIGGER_COLUMN: 0.55,
  GRASS_LIGHT: "#40916c",
  GRASS_DARK: "#2d6a4f",
  GRID_LINE: "rgba(255, 255, 255, 0.08)",
  CART_COLOR: "#e63946",
  CART_WHEEL: "#1d3557",
  ENEMY_COLOR: "#6a4c93",
  ENEMY_EYE: "#fffcf2",
  SUN_PRODUCE_INTERVAL_MS: 15000,
  SUN_PRODUCE_VALUE: 50,
  SCULPTURE_SHOOT_INTERVAL_MS: 1500,
  SCULPTURE_DAMAGE: 20,
  SLOW_DURATION_MS: 4000,
  SLOW_SPEED_FACTOR: 0.45,
  BATTLE_ENGINE_RECOVER_MS: 20000,
  IRON_PLATE_HP: 4000,
  EXPLOSION_RADIUS: 1,
  EXPLOSION_FLASH_MS: 500,
};

const PlantCatalog = {
  snakeHeadSculptor: {
    name: "蛇形雕首",
    cost: 100,
    maxHp: 100,
    color: "#2a9d8f",
    leafColor: "#1b4332",
  },
  smallKitchen: {
    name: "小厨局",
    cost: 50,
    maxHp: 80,
    color: "#e9c46a",
    leafColor: "#2d6a4f",
  },
  bigIronPlate: {
    name: "大铁板",
    cost: 50,
    maxHp: GameConstants.IRON_PLATE_HP,
    color: "#6c757d",
    leafColor: "#495057",
  },
  bigNuclearBomb: {
    name: "大核弹",
    cost: 150,
    maxHp: 100,
    color: "#212529",
    leafColor: "#343a40",
  },
  bigIceHorn: {
    name: "大汉角",
    cost: 175,
    maxHp: 100,
    color: "#457b9d",
    leafColor: "#1d3557",
  },
  battleEngine: {
    name: "战斗引擎",
    cost: 150,
    maxHp: 100,
    color: "#606c38",
    leafColor: "#283618",
  },
};

/**
 * 战场网格：5 行 × 26 列
 */
class FieldGrid {
  constructor(roadCount, columnCount) {
    this.roadCount = roadCount;
    this.columnCount = columnCount;
    this.plants = [];
    for (let road = 0; road < roadCount; road += 1) {
      this.plants[road] = new Array(columnCount).fill(null);
    }
  }

  reset() {
    for (let road = 0; road < this.roadCount; road += 1) {
      this.plants[road] = new Array(this.columnCount).fill(null);
    }
  }

  canPlantAt(road, column) {
    if (road < 0 || road >= this.roadCount) {
      return false;
    }
    if (column < 1 || column >= this.columnCount) {
      return false;
    }
    return this.plants[road][column] === null;
  }

  placePlant(road, column, plant) {
    if (!this.canPlantAt(road, column)) {
      return false;
    }
    this.plants[road][column] = plant;
    plant.road = road;
    plant.column = column;
    return true;
  }

  removePlant(road, column) {
    if (road < 0 || road >= this.roadCount) {
      return null;
    }
    if (column < 0 || column >= this.columnCount) {
      return null;
    }
    const removed = this.plants[road][column];
    this.plants[road][column] = null;
    return removed;
  }

  getPlant(road, column) {
    if (road < 0 || road >= this.roadCount) {
      return null;
    }
    if (column < 0 || column >= this.columnCount) {
      return null;
    }
    return this.plants[road][column];
  }

  getPlantsInRoad(road) {
    const result = [];
    for (let column = 0; column < this.columnCount; column += 1) {
      const plant = this.plants[road][column];
      if (plant !== null && plant.isAlive()) {
        result.push(plant);
      }
    }
    return result;
  }
}

/**
 * 植物基类
 */
class Plant {
  constructor(typeKey, road, column) {
    const definition = PlantCatalog[typeKey];
    this.typeKey = typeKey;
    this.name = definition.name;
    this.cost = definition.cost;
    this.maxHp = definition.maxHp;
    this.hp = definition.maxHp;
    this.color = definition.color;
    this.leafColor = definition.leafColor;
    this.road = road;
    this.column = column;
    this.alive = true;
    this.spawnAnimMs = 0;
    this.spawnAnimDuration = GameConstants.PLANT_SPAWN_ANIM_MS;
  }

  getSpawnScale() {
    if (this.spawnAnimMs >= this.spawnAnimDuration) {
      return 1;
    }
    const progress = this.spawnAnimMs / this.spawnAnimDuration;
    if (progress < 0.55) {
      return 0.2 + progress * 1.45;
    }
    return 1 + Math.sin((progress - 0.55) * Math.PI * 2.2) * 0.08 * (1 - progress);
  }

  updateSpawnAnimation(deltaMs) {
    if (this.spawnAnimMs < this.spawnAnimDuration) {
      this.spawnAnimMs += deltaMs;
    }
  }

  isAlive() {
    return this.alive && this.hp > 0;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.alive = false;
      this.hp = 0;
    }
  }

  update() {
    // 子类实现
  }

  blocksEnemy() {
    return this.isAlive();
  }

  draw(ctx, cellX, cellY, cellSize) {
    const scale = this.getSpawnScale();
    const centerX = cellX + cellSize * 0.5;
    const centerY = cellY + cellSize * 0.5;
    const radius = cellSize * 0.38 * scale;

    if (this.spawnAnimMs < this.spawnAnimDuration) {
      ctx.fillStyle = "rgba(255, 209, 102, " + (0.35 * (1 - this.spawnAnimMs / this.spawnAnimDuration)) + ")";
      ctx.beginPath();
      ctx.arc(centerX, centerY, cellSize * 0.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = this.leafColor;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + cellSize * 0.2 * scale, radius * 0.95, radius * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold " + Math.max(10, Math.floor(cellSize * 0.22)) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.getIconLabel(), centerX, centerY);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    if (this.maxHp >= GameConstants.IRON_PLATE_HP) {
      const hpRatio = this.hp / this.maxHp;
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(cellX + 4, cellY + 4, cellSize - 8, 5);
      ctx.fillStyle = hpRatio > 0.5 ? "#95d5b2" : "#e63946";
      ctx.fillRect(cellX + 4, cellY + 4, (cellSize - 8) * hpRatio, 5);
    }
  }

  getIconLabel() {
    if (this.typeKey === "snakeHeadSculptor") {
      return "蛇";
    }
    if (this.typeKey === "smallKitchen") {
      return "阳";
    }
    if (this.typeKey === "bigIronPlate") {
      return "铁";
    }
    if (this.typeKey === "bigNuclearBomb") {
      return "核";
    }
    if (this.typeKey === "bigIceHorn") {
      return "角";
    }
    if (this.typeKey === "battleEngine") {
      return "战";
    }
    return "植";
  }
}

/**
 * 蛇形雕首射手基类：右侧有敌人时，向右侧发射蛇形雕首
 */
class RightSculptureShooterPlant extends Plant {
  constructor(typeKey, road, column, slowDurationMs) {
    super(typeKey, road, column);
    this.slowDurationMs = slowDurationMs;
    this.shootTimerMs = 0;
  }

  update(context) {
    if (!this.isAlive()) {
      return;
    }
    if (!context.hasEnemyOnRight(this.road, this.column)) {
      return;
    }
    this.shootTimerMs += context.deltaMs;
    if (this.shootTimerMs >= GameConstants.SCULPTURE_SHOOT_INTERVAL_MS) {
      this.shootTimerMs = 0;
      context.spawnSnakeHeadSculpture(this.road, this.column, {
        damage: GameConstants.SCULPTURE_DAMAGE,
        slowDurationMs: this.slowDurationMs,
      });
    }
  }

  draw(ctx, cellX, cellY, cellSize) {
    super.draw(ctx, cellX, cellY, cellSize);
    const centerX = cellX + cellSize * 0.5;
    const centerY = cellY + cellSize * 0.5;
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(centerX + cellSize * 0.18, centerY, cellSize * 0.08, 0, Math.PI * 2);
    ctx.fill();
    SnakeHeadProjectile.drawMini(ctx, centerX + cellSize * 0.28, centerY, cellSize * 0.14, ShootDirection.RIGHT);
  }
}

/** 1. 蛇形雕首：100 阳光，向右侧敌人发射，20 伤害，无特殊效果 */
class SnakeHeadSculptorPlant extends RightSculptureShooterPlant {
  constructor(road, column) {
    super("snakeHeadSculptor", road, column, 0);
  }
}

/** 2. 小厨局：50 阳光，每 15 秒产生 50 阳光 */
class SmallKitchenPlant extends Plant {
  constructor(road, column) {
    super("smallKitchen", road, column);
    this.timerMs = 0;
  }

  update(context) {
    if (!this.isAlive()) {
      return;
    }
    this.timerMs += context.deltaMs;
    if (this.timerMs >= GameConstants.SUN_PRODUCE_INTERVAL_MS) {
      this.timerMs = 0;
      context.addSun(GameConstants.SUN_PRODUCE_VALUE);
      context.spawnSunVisual(this.road, this.column);
    }
  }

  draw(ctx, cellX, cellY, cellSize) {
    super.draw(ctx, cellX, cellY, cellSize);
    const centerX = cellX + cellSize * 0.5;
    const centerY = cellY + cellSize * 0.5;
    ctx.fillStyle = "#ffd166";
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      ctx.beginPath();
      ctx.arc(
        centerX + Math.cos(angle) * cellSize * 0.22,
        centerY + Math.sin(angle) * cellSize * 0.22,
        cellSize * 0.08,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }
}

/** 3. 大铁板：50 阳光，原地驻守阻挡，4000 生命 */
class BigIronPlatePlant extends Plant {
  constructor(road, column) {
    super("bigIronPlate", road, column);
  }

  update() {
    // 原地驻守
  }

  draw(ctx, cellX, cellY, cellSize) {
    super.draw(ctx, cellX, cellY, cellSize);
    const centerX = cellX + cellSize * 0.5;
    const centerY = cellY + cellSize * 0.5;
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(centerX - cellSize * 0.28, centerY - cellSize * 0.28, cellSize * 0.56, cellSize * 0.56);
  }
}

/** 4. 大核弹：150 阳光，3x3 范围爆炸，秒杀范围内敌人 */
class BigNuclearBombPlant extends Plant {
  constructor(road, column) {
    super("bigNuclearBomb", road, column);
    this.armTimerMs = 0;
    this.armed = false;
  }

  update(context) {
    if (!this.isAlive()) {
      return;
    }
    if (!this.armed) {
      this.armTimerMs += context.deltaMs;
      if (this.armTimerMs >= 1000) {
        this.armed = true;
      }
      return;
    }
    const enemiesInRange = context.getEnemiesInArea(
      this.road,
      this.column,
      GameConstants.EXPLOSION_RADIUS
    );
    if (enemiesInRange.length === 0) {
      return;
    }
    context.killEnemiesInstant(enemiesInRange);
    context.spawnExplosionEffect(this.road, this.column);
    this.alive = false;
    context.removePlantAt(this.road, this.column);
    console.info("[BigNuclearBomb] 3x3 爆炸，秒杀范围内敌人");
  }

  draw(ctx, cellX, cellY, cellSize) {
    super.draw(ctx, cellX, cellY, cellSize);
    const centerX = cellX + cellSize * 0.5;
    const centerY = cellY + cellSize * 0.5;
    ctx.fillStyle = this.armed ? "#ff006e" : "#495057";
    ctx.beginPath();
    ctx.arc(centerX, centerY - cellSize * 0.05, cellSize * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 5. 大汉角：175 阳光，机制同蛇形雕首，命中额外减速 */
class BigIceHornPlant extends RightSculptureShooterPlant {
  constructor(road, column) {
    super("bigIceHorn", road, column, GameConstants.SLOW_DURATION_MS);
  }

  draw(ctx, cellX, cellY, cellSize) {
    super.draw(ctx, cellX, cellY, cellSize);
    const centerX = cellX + cellSize * 0.5;
    const centerY = cellY + cellSize * 0.5;
    ctx.fillStyle = "#a8dadc";
    ctx.beginPath();
    ctx.arc(centerX, centerY - cellSize * 0.22, cellSize * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 6. 战斗引擎：150 阳光，秒杀前方一格敌人，自身爆碎，20 秒后恢复 */
class BattleEnginePlant extends Plant {
  constructor(road, column) {
    super("battleEngine", road, column);
    this.shattered = false;
    this.recoverTimerMs = 0;
  }

  blocksEnemy() {
    return this.isAlive() && !this.shattered;
  }

  update(context) {
    if (!this.alive) {
      return;
    }
    if (this.shattered) {
      this.recoverTimerMs += context.deltaMs;
      if (this.recoverTimerMs >= GameConstants.BATTLE_ENGINE_RECOVER_MS) {
        this.shattered = false;
        this.recoverTimerMs = 0;
        console.info("[BattleEngine] 恢复完成，可再次使用");
      }
      return;
    }
    const frontColumn = this.column + 1;
    if (frontColumn >= GameConstants.COLUMN_COUNT) {
      return;
    }
    const enemy = context.getEnemyAtCell(this.road, frontColumn);
    if (enemy === null) {
      return;
    }
    context.killEnemiesInstant([enemy]);
    this.shattered = true;
    this.recoverTimerMs = 0;
    console.info("[BattleEngine] 秒杀前方一格敌人，自身爆碎");
  }

  draw(ctx, cellX, cellY, cellSize) {
    if (this.shattered) {
      const ratio = this.recoverTimerMs / GameConstants.BATTLE_ENGINE_RECOVER_MS;
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(cellX + 6, cellY + cellSize * 0.5 - 8, cellSize - 12, 16);
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(cellX + 6, cellY + cellSize * 0.5 - 8, (cellSize - 12) * ratio, 16);
      ctx.fillStyle = "rgba(96, 108, 56, 0.45)";
      ctx.fillRect(cellX + 4, cellY + 4, cellSize - 8, cellSize - 8);
      ctx.fillStyle = "#adb5bd";
      ctx.font = "11px sans-serif";
      ctx.fillText("恢复中", cellX + cellSize * 0.22, cellY + cellSize * 0.58);
      return;
    }
    super.draw(ctx, cellX, cellY, cellSize);
    const centerX = cellX + cellSize * 0.5;
    const centerY = cellY + cellSize * 0.5;
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(centerX + cellSize * 0.05, centerY - cellSize * 0.05, cellSize * 0.2, cellSize * 0.1);
  }
}

/**
 * 蛇形雕首弹：向右侧飞行
 */
class SnakeHeadProjectile {
  constructor(road, columnPosition, damage, slowDurationMs, direction) {
    this.road = road;
    this.columnPosition = columnPosition;
    this.damage = damage;
    this.slowDurationMs = slowDurationMs;
    this.direction = direction;
    this.alive = true;
  }

  update(deltaMs, cellWidth) {
    const moveStep = (GameConstants.PROJECTILE_SPEED * deltaMs) / cellWidth;
    this.columnPosition += moveStep * this.direction;
    if (this.direction === ShootDirection.RIGHT && this.columnPosition >= GameConstants.COLUMN_COUNT) {
      this.alive = false;
    }
  }

  static drawMini(ctx, x, y, size, direction) {
    const headOffset = direction === ShootDirection.RIGHT ? size * 0.7 : -size * 0.7;
    ctx.fillStyle = "#2a9d8f";
    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.9, size * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(x + headOffset, y - size * 0.15, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx, layout) {
    const x = layout.columnToPixel(this.columnPosition);
    const y = layout.roadCenterY(this.road);
    const size = layout.cellSize * 0.16;
    SnakeHeadProjectile.drawMini(ctx, x, y, size, this.direction);
    if (this.slowDurationMs > 0) {
      ctx.fillStyle = "rgba(168, 218, 220, 0.5)";
      ctx.beginPath();
      ctx.arc(x, y, size * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * 爆炸特效
 */
class ExplosionEffect {
  constructor(road, column, layout) {
    this.road = road;
    this.column = column;
    this.layout = layout;
    this.timerMs = 0;
    this.alive = true;
  }

  update(deltaMs) {
    this.timerMs += deltaMs;
    if (this.timerMs >= GameConstants.EXPLOSION_FLASH_MS) {
      this.alive = false;
    }
  }

  draw(ctx, layout) {
    const radius = layout.cellSize * (GameConstants.EXPLOSION_RADIUS + 0.5);
    const x = layout.columnToPixel(this.column + 0.5);
    const y = layout.roadCenterY(this.road);
    const alpha = 1 - this.timerMs / GameConstants.EXPLOSION_FLASH_MS;
    ctx.fillStyle = "rgba(255, 100, 0, " + (alpha * 0.55) + ")";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 小怪物：无特性，向左行走
 */
class LittleMonster {
  constructor(road) {
    this.road = road;
    this.columnPosition = GameConstants.COLUMN_COUNT + 0.8;
    this.hp = GameConstants.ENEMY_HP;
    this.maxHp = GameConstants.ENEMY_HP;
    this.alive = true;
    this.eatingPlant = null;
    this.eatTimerMs = 0;
    this.eatIntervalMs = 900;
    this.slowTimerMs = 0;
    this.enterAnimMs = 0;
    this.enterAnimDuration = 500;
  }

  isSlowed() {
    return this.slowTimerMs > 0;
  }

  applySlow(durationMs) {
    this.slowTimerMs = Math.max(this.slowTimerMs, durationMs);
  }

  getMoveSpeed(context) {
    if (this.slowTimerMs > 0) {
      return GameConstants.ENEMY_SPEED * GameConstants.SLOW_SPEED_FACTOR;
    }
    return GameConstants.ENEMY_SPEED;
  }

  isAlive() {
    return this.alive && this.hp > 0;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.alive = false;
      this.hp = 0;
      this.eatingPlant = null;
    }
  }

  update(context) {
    if (!this.isAlive()) {
      return;
    }

    if (this.slowTimerMs > 0) {
      this.slowTimerMs = Math.max(0, this.slowTimerMs - context.deltaMs);
    }
    if (this.enterAnimMs < this.enterAnimDuration) {
      this.enterAnimMs += context.deltaMs;
    }

    if (this.columnPosition <= GameConstants.BASE_FAIL_COLUMN) {
      context.triggerGameOver("小怪物突破了最左端防线！");
      return;
    }

    const plant = context.getBlockingPlant(this.road, this.columnPosition);
    if (plant !== null) {
      this.eatingPlant = plant;
      this.eatTimerMs += context.deltaMs;
      if (this.eatTimerMs >= this.eatIntervalMs) {
        this.eatTimerMs = 0;
        plant.takeDamage(35);
        if (!plant.isAlive()) {
          context.removePlantAt(this.road, plant.column);
          this.eatingPlant = null;
        }
      }
      return;
    }

    this.eatingPlant = null;
    const moveStep = (this.getMoveSpeed(context) * context.deltaMs) / context.layout.cellWidth;
    this.columnPosition -= moveStep;

    if (this.columnPosition <= GameConstants.CART_TRIGGER_COLUMN) {
      context.triggerCart(this.road);
    }
  }

  draw(ctx, layout) {
    const x = layout.columnToPixel(this.columnPosition);
    const y = layout.roadCenterY(this.road);
    const enterScale = this.enterAnimMs < this.enterAnimDuration
      ? 0.4 + (this.enterAnimMs / this.enterAnimDuration) * 0.6
      : 1;
    const size = layout.cellSize * 0.44 * enterScale;

    ctx.fillStyle = this.isSlowed() ? "#4cc9f0" : GameConstants.ENEMY_COLOR;
    ctx.beginPath();
    ctx.roundRect(x - size * 0.5, y - size * 0.55, size, size * 1.1, size * 0.2);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = GameConstants.ENEMY_EYE;
    ctx.beginPath();
    ctx.arc(x - size * 0.18, y - size * 0.12, size * 0.11, 0, Math.PI * 2);
    ctx.arc(x + size * 0.18, y - size * 0.12, size * 0.11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold " + Math.max(10, Math.floor(size * 0.35)) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("怪", x, y + size * 0.08);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = "#ff6b6b";
    ctx.font = Math.max(10, Math.floor(size * 0.28)) + "px sans-serif";
    ctx.fillText("←", x + size * 0.35, y - size * 0.35);

    const hpRatio = this.hp / this.maxHp;
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(x - size * 0.45, y - size * 0.75, size * 0.9, 4);
    ctx.fillStyle = "#e63946";
    ctx.fillRect(x - size * 0.45, y - size * 0.75, size * 0.9 * hpRatio, 4);
  }
}

/**
 * 最左侧小推车
 */
class PushCart {
  constructor(road) {
    this.road = road;
    this.active = true;
    this.flashMs = 0;
  }

  trigger(context) {
    if (!this.active) {
      return;
    }
    this.active = false;
    this.flashMs = 600;
    context.killEnemiesInRoad(this.road);
    console.info("[PushCart] 第 " + (this.road + 1) + " 路小推车触发，清剿整路敌人");
  }

  update(deltaMs) {
    if (this.flashMs > 0) {
      this.flashMs -= deltaMs;
    }
  }

  draw(ctx, layout) {
    const x = layout.cartCenterX();
    const y = layout.roadCenterY(this.road);
    const width = layout.cellSize * GameConstants.CART_WIDTH_RATIO;
    const height = layout.cellSize * 0.55;

    ctx.fillStyle = this.flashMs > 0 ? "#ffd166" : GameConstants.CART_COLOR;
    ctx.beginPath();
    ctx.roundRect(x - width * 0.5, y - height * 0.5, width, height, 6);
    ctx.fill();

    ctx.fillStyle = GameConstants.CART_WHEEL;
    ctx.beginPath();
    ctx.arc(x - width * 0.25, y + height * 0.42, height * 0.18, 0, Math.PI * 2);
    ctx.arc(x + width * 0.25, y + height * 0.42, height * 0.18, 0, Math.PI * 2);
    ctx.fill();

    if (!this.active) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(x - width * 0.5, y - height * 0.5, width, height);
    }
  }
}

/**
 * 阳光飘落动画
 */
class SunVisual {
  constructor(road, column, layout) {
    this.x = layout.columnToPixel(column + 0.5);
    this.y = layout.roadCenterY(road);
    this.targetY = this.y - layout.cellSize * 0.8;
    this.alive = true;
    this.value = GameConstants.SUN_PRODUCE_VALUE;
    this.radius = layout.cellSize * 0.18;
  }

  update(deltaMs) {
    this.y -= (deltaMs / 1000) * 18;
    if (this.y <= this.targetY) {
      this.alive = false;
    }
  }

  draw(ctx) {
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f4a261";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * 波次生成器
 */
class WaveSpawner {
  constructor() {
    this.wave = 1;
    this.spawnedInWave = 0;
    this.spawnTimerMs = 0;
    this.breakTimerMs = 0;
    this.inBreak = false;
    this.initialSpawnRemaining = 0;
    this.initialSpawnTimerMs = 0;
  }

  reset() {
    this.wave = 1;
    this.spawnedInWave = 0;
    this.spawnTimerMs = 0;
    this.breakTimerMs = 0;
    this.inBreak = false;
    this.initialSpawnRemaining = GameConstants.ENEMY_INITIAL_SPAWN_COUNT;
    this.initialSpawnTimerMs = 0;
  }

  update(context) {
    if (this.initialSpawnRemaining > 0) {
      this.initialSpawnTimerMs += context.deltaMs;
      if (this.initialSpawnTimerMs >= GameConstants.ENEMY_INITIAL_SPAWN_DELAY_MS) {
        this.initialSpawnTimerMs = 0;
        const road = this.initialSpawnRemaining % GameConstants.ROAD_COUNT;
        context.spawnEnemy(road);
        this.spawnedInWave += 1;
        this.initialSpawnRemaining -= 1;
        context.showTip("小怪物从右侧第 " + (road + 1) + " 路出现了！");
      }
      return;
    }

    if (this.inBreak) {
      this.breakTimerMs += context.deltaMs;
      if (this.breakTimerMs >= GameConstants.WAVE_BREAK_MS) {
        this.inBreak = false;
        this.breakTimerMs = 0;
        this.wave += 1;
        this.spawnedInWave = 0;
        context.onWaveChanged(this.wave);
      }
      return;
    }

    if (this.spawnedInWave >= GameConstants.WAVE_ENEMY_COUNT + this.wave - 1) {
      this.inBreak = true;
      return;
    }

    this.spawnTimerMs += context.deltaMs;
    if (this.spawnTimerMs >= GameConstants.ENEMY_SPAWN_INTERVAL_MS) {
      this.spawnTimerMs = 0;
      const road = Math.floor(Math.random() * GameConstants.ROAD_COUNT);
      context.spawnEnemy(road);
      this.spawnedInWave += 1;
    }
  }
}

/**
 * 布局计算
 */
class FieldLayout {
  constructor(canvas, roadCount, columnCount) {
    this.canvas = canvas;
    this.roadCount = roadCount;
    this.columnCount = columnCount;
    this.offsetX = 0;
    this.offsetY = 0;
    this.cellWidth = 0;
    this.cellHeight = 0;
    this.cellSize = 0;
    this.logicalWidth = canvas.width;
    this.logicalHeight = canvas.height;
    this.recalculate(this.logicalWidth, this.logicalHeight);
  }

  recalculate(logicalWidth, logicalHeight) {
    const padding = 8;
    const availableWidth = logicalWidth - padding * 2;
    const availableHeight = logicalHeight - padding * 2;
    this.cellWidth = availableWidth / this.columnCount;
    this.cellHeight = availableHeight / this.roadCount;
    this.cellSize = Math.min(this.cellWidth, this.cellHeight);
    const fieldWidth = this.cellSize * this.columnCount;
    const fieldHeight = this.cellSize * this.roadCount;
    this.offsetX = (logicalWidth - fieldWidth) * 0.5;
    this.offsetY = (logicalHeight - fieldHeight) * 0.5;
    this.logicalWidth = logicalWidth;
    this.logicalHeight = logicalHeight;
  }

  roadCenterY(road) {
    return this.offsetY + road * this.cellSize + this.cellSize * 0.5;
  }

  columnToPixel(column) {
    return this.offsetX + column * this.cellSize + this.cellSize * 0.5;
  }

  cartCenterX() {
    return this.offsetX + this.cellSize * 0.5;
  }

  pixelToGrid(pixelX, pixelY) {
    const column = Math.floor((pixelX - this.offsetX) / this.cellSize);
    const road = Math.floor((pixelY - this.offsetY) / this.cellSize);
    return { road, column };
  }

  isInsideField(pixelX, pixelY) {
    const column = Math.floor((pixelX - this.offsetX) / this.cellSize);
    const road = Math.floor((pixelY - this.offsetY) / this.cellSize);
    return (
      road >= 0 &&
      road < this.roadCount &&
      column >= 0 &&
      column < this.columnCount
    );
  }
}

/**
 * 植物工厂
 */
class PlantFactory {
  static create(typeKey, road, column) {
    if (typeKey === "snakeHeadSculptor") {
      return new SnakeHeadSculptorPlant(road, column);
    }
    if (typeKey === "smallKitchen") {
      return new SmallKitchenPlant(road, column);
    }
    if (typeKey === "bigIronPlate") {
      return new BigIronPlatePlant(road, column);
    }
    if (typeKey === "bigNuclearBomb") {
      return new BigNuclearBombPlant(road, column);
    }
    if (typeKey === "bigIceHorn") {
      return new BigIceHornPlant(road, column);
    }
    if (typeKey === "battleEngine") {
      return new BattleEnginePlant(road, column);
    }
    return null;
  }
}

/**
 * 主游戏控制器
 */
class TowerDefenseGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.layout = new FieldLayout(canvas, GameConstants.ROAD_COUNT, GameConstants.COLUMN_COUNT);
    this.grid = new FieldGrid(GameConstants.ROAD_COUNT, GameConstants.COLUMN_COUNT);
    this.enemies = [];
    this.projectiles = [];
    this.explosionEffects = [];
    this.sunVisuals = [];
    this.carts = [];
    this.spawner = new WaveSpawner();
    this.sun = GameConstants.INITIAL_SUN;
    this.killCount = 0;
    this.selectedPlantType = null;
    this.hoverRoad = -1;
    this.hoverColumn = -1;
    this.tipTimerId = null;
    this.running = false;
    this.gameOver = false;
    this.lastFrameMs = 0;
    this.animationFrameId = null;

    this.ui = {
      sunCount: document.getElementById("sun-count"),
      waveCount: document.getElementById("wave-count"),
      killCount: document.getElementById("kill-count"),
      enemyCount: document.getElementById("enemy-count"),
      startOverlay: document.getElementById("overlay"),
      gameOverOverlay: document.getElementById("game-over-overlay"),
      gameOverTitle: document.getElementById("game-over-title"),
      gameOverMessage: document.getElementById("game-over-message"),
      plantCards: document.querySelectorAll(".plant-card"),
      statusTip: document.getElementById("status-tip"),
    };

    this.bindEvents();
    this.resizeCanvas();
    this.renderStaticPreview();
  }

  bindEvents() {
    window.addEventListener("resize", () => {
      this.resizeCanvas();
    });

    document.getElementById("start-btn").addEventListener("click", () => {
      this.startGame();
    });

    document.getElementById("restart-btn").addEventListener("click", () => {
      this.ui.gameOverOverlay.classList.add("hidden");
      this.ui.gameOverOverlay.classList.remove("visible");
      this.startGame();
    });

    this.ui.plantCards.forEach((card) => {
      card.addEventListener("click", () => {
        const plantType = card.getAttribute("data-plant");
        if (this.gameOver) {
          return;
        }
        if (!this.running) {
          this.selectedPlantType = plantType;
          this.refreshPlantCards();
          this.showTip("已选择「" + PlantCatalog[plantType].name + "」，请点击「开始游戏」后再在绿地上种植");
          return;
        }
        this.selectPlantType(plantType);
      });
    });

    this.canvas.addEventListener("click", (event) => {
      this.handleCanvasClick(event.clientX, event.clientY);
    });

    this.canvas.addEventListener("mousemove", (event) => {
      this.handleCanvasHover(event.clientX, event.clientY);
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.hoverRoad = -1;
      this.hoverColumn = -1;
    });

    this.canvas.addEventListener("touchstart", (event) => {
      event.preventDefault();
      const touch = event.changedTouches[0];
      this.handleCanvasClick(touch.clientX, touch.clientY);
    });
  }

  resizeCanvas() {
    const topBar = document.getElementById("top-bar");
    const plantBar = document.getElementById("plant-bar");
    const statusTip = document.getElementById("status-tip");
    const topBarHeight = topBar ? topBar.offsetHeight : 48;
    const plantBarHeight = plantBar ? plantBar.offsetHeight : 88;
    const statusTipHeight = statusTip ? statusTip.offsetHeight : 28;
    const horizontalPadding = 16;
    const verticalPadding = 24;
    const displayWidth = Math.min(window.innerWidth - horizontalPadding, 1200);
    const displayHeight = Math.max(
      300,
      window.innerHeight - topBarHeight - plantBarHeight - statusTipHeight - verticalPadding
    );

    this.canvas.style.width = displayWidth + "px";
    this.canvas.style.height = displayHeight + "px";
    this.canvas.width = Math.floor(displayWidth);
    this.canvas.height = Math.floor(displayHeight);
    this.layout.recalculate(displayWidth, displayHeight);

    if (this.running && !this.gameOver) {
      this.draw();
    } else {
      this.renderStaticPreview();
    }
  }

  showTip(message) {
    if (this.ui.statusTip === null) {
      return;
    }
    this.ui.statusTip.textContent = message;
    this.ui.statusTip.classList.remove("hidden");
    if (this.tipTimerId !== null) {
      clearTimeout(this.tipTimerId);
    }
    this.tipTimerId = setTimeout(() => {
      if (this.ui.statusTip !== null) {
        this.ui.statusTip.classList.add("hidden");
      }
      this.tipTimerId = null;
    }, 3000);
  }

  selectPlantType(plantType) {
    if (this.selectedPlantType === plantType) {
      this.selectedPlantType = null;
      this.showTip("已取消选择");
    } else {
      this.selectedPlantType = plantType;
      this.showTip("已选择「" + PlantCatalog[plantType].name + "」，点击绿色草地放置（第1列起可种）");
    }
    this.refreshPlantCards();
  }

  refreshPlantCards() {
    this.ui.plantCards.forEach((card) => {
      const plantType = card.getAttribute("data-plant");
      const definition = PlantCatalog[plantType];
      if (definition === undefined) {
        return;
      }
      const selected = this.selectedPlantType === plantType;
      const disabled = this.running && this.sun < definition.cost;
      card.classList.toggle("selected", selected);
      card.classList.toggle("disabled", disabled);
    });
  }

  startGame() {
    this.running = true;
    this.gameOver = false;
    this.sun = GameConstants.INITIAL_SUN;
    this.killCount = 0;
    const pendingPlantType = this.selectedPlantType;
    this.selectedPlantType = pendingPlantType;
    this.enemies = [];
    this.projectiles = [];
    this.explosionEffects = [];
    this.sunVisuals = [];
    this.grid.reset();
    this.spawner.reset();
    this.carts = [];
    for (let road = 0; road < GameConstants.ROAD_COUNT; road += 1) {
      this.carts.push(new PushCart(road));
    }

    this.ui.startOverlay.classList.add("hidden");
    this.ui.startOverlay.classList.remove("visible");
    this.updateHud();
    this.refreshPlantCards();
    if (this.selectedPlantType !== null) {
      this.showTip("游戏开始！敌人将从右侧进攻。点击绿地把「" + PlantCatalog[this.selectedPlantType].name + "」种下去");
    } else {
      this.showTip("游戏开始！敌人将从右侧出现并向左进攻，请先选择植物");
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.lastFrameMs = performance.now();
    this.animationFrameId = requestAnimationFrame((time) => {
      this.gameLoop(time);
    });

    console.info("[TowerDefenseGame] 游戏开始");
  }

  getCanvasPosition(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }
    return {
      pixelX: ((clientX - rect.left) / rect.width) * this.canvas.width,
      pixelY: ((clientY - rect.top) / rect.height) * this.canvas.height,
    };
  }

  handleCanvasHover(clientX, clientY) {
    if (!this.running || this.gameOver) {
      return;
    }
    const position = this.getCanvasPosition(clientX, clientY);
    if (position === null) {
      return;
    }
    if (!this.layout.isInsideField(position.pixelX, position.pixelY)) {
      this.hoverRoad = -1;
      this.hoverColumn = -1;
      return;
    }
    const gridPos = this.layout.pixelToGrid(position.pixelX, position.pixelY);
    this.hoverRoad = gridPos.road;
    this.hoverColumn = gridPos.column;
  }

  handleCanvasClick(clientX, clientY) {
    if (!this.running || this.gameOver) {
      this.showTip("请先点击「开始游戏」");
      return;
    }
    const position = this.getCanvasPosition(clientX, clientY);
    if (position === null) {
      this.showTip("战场尚未加载完成，请稍后再试");
      return;
    }
    if (!this.layout.isInsideField(position.pixelX, position.pixelY)) {
      this.showTip("请点击绿色草地区域");
      return;
    }
    if (this.selectedPlantType === null) {
      this.showTip("请先在上方选择一种植物");
      return;
    }

    const gridPos = this.layout.pixelToGrid(position.pixelX, position.pixelY);
    this.tryPlacePlant(this.selectedPlantType, gridPos.road, gridPos.column);
  }

  tryPlacePlant(typeKey, road, column) {
    const definition = PlantCatalog[typeKey];
    if (definition === undefined) {
      this.showTip("未知植物类型");
      return;
    }
    if (this.sun < definition.cost) {
      this.showTip("阳光不足，需要 " + definition.cost + " 阳光");
      return;
    }
    if (column < 1) {
      this.showTip("最左列是小推车区域，不能种植");
      return;
    }
    if (road < 0 || road >= GameConstants.ROAD_COUNT) {
      this.showTip("请点击五条路中的任意一条");
      return;
    }
    if (!this.grid.canPlantAt(road, column)) {
      this.showTip("该格子已有植物或不可种植");
      return;
    }

    const plant = PlantFactory.create(typeKey, road, column);
    if (plant === null) {
      this.showTip("放置失败");
      return;
    }

    this.grid.placePlant(road, column, plant);
    plant.spawnAnimMs = 0;
    this.sun -= definition.cost;
    this.updateHud();
    this.refreshPlantCards();
    this.showTip("成功放置「" + definition.name + "」在第 " + (road + 1) + " 路第 " + column + " 列");
    console.info("[TowerDefenseGame] 放置 " + definition.name + " 于第 " + (road + 1) + " 路第 " + column + " 列");
    if (this.running && !this.gameOver) {
      this.draw();
    }
  }

  addSun(amount) {
    this.sun += amount;
    this.updateHud();
    this.refreshPlantCards();
  }

  spawnSunVisual(road, column) {
    this.sunVisuals.push(new SunVisual(road, column, this.layout));
  }

  spawnSnakeHeadSculpture(road, column, options) {
    this.projectiles.push(
      new SnakeHeadProjectile(
        road,
        column + 0.8,
        options.damage,
        options.slowDurationMs,
        ShootDirection.RIGHT
      )
    );
  }

  getEnemiesInArea(centerRoad, centerColumn, radius) {
    return this.enemies.filter((enemy) => {
      if (!enemy.isAlive()) {
        return false;
      }
      const enemyColumn = Math.floor(enemy.columnPosition + 0.5);
      const roadDelta = Math.abs(enemy.road - centerRoad);
      const columnDelta = Math.abs(enemyColumn - centerColumn);
      return roadDelta <= radius && columnDelta <= radius;
    });
  }

  killEnemiesInstant(enemyList) {
    let killed = 0;
    enemyList.forEach((enemy) => {
      if (enemy.isAlive()) {
        enemy.alive = false;
        killed += 1;
      }
    });
    this.killCount += killed;
    this.updateHud();
  }

  spawnExplosionEffect(road, column) {
    this.explosionEffects.push(new ExplosionEffect(road, column, this.layout));
  }

  spawnEnemy(road) {
    this.enemies.push(new LittleMonster(road));
  }

  hasEnemyOnRight(road, column) {
    return this.enemies.some(
      (enemy) => enemy.isAlive() && enemy.road === road && enemy.columnPosition > column + 0.2
    );
  }

  hasEnemyOnLeft(road, column) {
    return this.enemies.some(
      (enemy) => enemy.isAlive() && enemy.road === road && enemy.columnPosition < column + 0.8
    );
  }

  getEnemyAtCell(road, column) {
    return (
      this.enemies.find(
        (enemy) =>
          enemy.isAlive() &&
          enemy.road === road &&
          Math.abs(enemy.columnPosition - (column + 0.5)) < 0.45
      ) || null
    );
  }

  getBlockingPlant(road, columnPosition) {
    const column = Math.floor(columnPosition + 0.2);
    const plant = this.grid.getPlant(road, column);
    if (plant !== null && plant.blocksEnemy()) {
      return plant;
    }
    return null;
  }

  removePlantAt(road, column) {
    this.grid.removePlant(road, column);
  }

  killEnemiesInRoad(road) {
    let killed = 0;
    this.enemies.forEach((enemy) => {
      if (enemy.isAlive() && enemy.road === road) {
        enemy.alive = false;
        killed += 1;
      }
    });
    this.killCount += killed;
    this.updateHud();
  }

  triggerCart(road) {
    const cart = this.carts[road];
    if (cart !== undefined) {
      cart.trigger(this);
    }
  }

  triggerGameOver(message) {
    if (this.gameOver) {
      return;
    }
    this.gameOver = true;
    this.running = false;
    this.ui.gameOverTitle.textContent = "游戏失败";
    this.ui.gameOverMessage.textContent = message + " 你坚持了 " + this.spawner.wave + " 波，击杀 " + this.killCount + " 只小怪物。";
    this.ui.gameOverOverlay.classList.remove("hidden");
    this.ui.gameOverOverlay.classList.add("visible");
    console.warn("[TowerDefenseGame] 游戏结束: " + message);
  }

  onWaveChanged(wave) {
    this.updateHud();
    console.info("[TowerDefenseGame] 进入第 " + wave + " 波");
  }

  updateHud() {
    this.ui.sunCount.textContent = String(this.sun);
    this.ui.waveCount.textContent = String(this.spawner.wave);
    this.ui.killCount.textContent = String(this.killCount);
    if (this.ui.enemyCount !== null) {
      const aliveCount = this.enemies.filter((enemy) => enemy.isAlive()).length;
      this.ui.enemyCount.textContent = String(aliveCount);
    }
  }

  buildUpdateContext(deltaMs) {
    const self = this;
    return {
      deltaMs,
      layout: this.layout,
      addSun(amount) {
        self.addSun(amount);
      },
      spawnSunVisual(road, column) {
        self.spawnSunVisual(road, column);
      },
      spawnSnakeHeadSculpture(road, column, options) {
        self.spawnSnakeHeadSculpture(road, column, options);
      },
      getEnemiesInArea(centerRoad, centerColumn, radius) {
        return self.getEnemiesInArea(centerRoad, centerColumn, radius);
      },
      killEnemiesInstant(enemyList) {
        self.killEnemiesInstant(enemyList);
      },
      spawnExplosionEffect(road, column) {
        self.spawnExplosionEffect(road, column);
      },
      hasEnemyOnRight(road, column) {
        return self.hasEnemyOnRight(road, column);
      },
      hasEnemyOnLeft(road, column) {
        return self.hasEnemyOnLeft(road, column);
      },
      getEnemyAtCell(road, column) {
        return self.getEnemyAtCell(road, column);
      },
      getBlockingPlant(road, columnPosition) {
        return self.getBlockingPlant(road, columnPosition);
      },
      removePlantAt(road, column) {
        self.removePlantAt(road, column);
      },
      killEnemiesInRoad(road) {
        self.killEnemiesInRoad(road);
      },
      triggerCart(road) {
        self.triggerCart(road);
      },
      triggerGameOver(message) {
        self.triggerGameOver(message);
      },
      showTip(message) {
        self.showTip(message);
      },
    };
  }

  update(deltaMs) {
    if (!this.running || this.gameOver) {
      return;
    }

    const context = this.buildUpdateContext(deltaMs);
    this.spawner.update(context);

    for (let road = 0; road < GameConstants.ROAD_COUNT; road += 1) {
      const plants = this.grid.getPlantsInRoad(road);
      plants.forEach((plant) => {
        plant.updateSpawnAnimation(deltaMs);
        plant.update(context);
      });
    }

    this.enemies.forEach((enemy) => {
      enemy.update(context);
    });

    this.projectiles.forEach((projectile) => {
      projectile.update(deltaMs, this.layout.cellWidth);
      if (!projectile.alive) {
        return;
      }
      this.enemies.forEach((enemy) => {
        if (!projectile.alive || !enemy.isAlive()) {
          return;
        }
        if (enemy.road !== projectile.road) {
          return;
        }
        if (Math.abs(enemy.columnPosition - projectile.columnPosition) < 0.35) {
          enemy.takeDamage(projectile.damage);
          if (projectile.slowDurationMs > 0) {
            enemy.applySlow(projectile.slowDurationMs);
          }
          projectile.alive = false;
          if (!enemy.isAlive()) {
            this.killCount += 1;
            this.updateHud();
          }
        }
      });
    });

    this.carts.forEach((cart) => {
      cart.update(deltaMs);
    });

    this.sunVisuals.forEach((visual) => {
      visual.update(deltaMs);
    });

    this.explosionEffects.forEach((effect) => {
      effect.update(deltaMs);
    });

    this.enemies = this.enemies.filter((enemy) => enemy.isAlive());
    this.projectiles = this.projectiles.filter((projectile) => projectile.alive);
    this.explosionEffects = this.explosionEffects.filter((effect) => effect.alive);
    this.sunVisuals = this.sunVisuals.filter((visual) => visual.alive);
  }

  drawField() {
    const ctx = this.ctx;
    const layout = this.layout;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = "#1b4332";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let road = 0; road < GameConstants.ROAD_COUNT; road += 1) {
      for (let column = 0; column < GameConstants.COLUMN_COUNT; column += 1) {
        const x = layout.offsetX + column * layout.cellSize;
        const y = layout.offsetY + road * layout.cellSize;
        const isDark = (road + column) % 2 === 0;
        ctx.fillStyle = isDark ? GameConstants.GRASS_DARK : GameConstants.GRASS_LIGHT;
        ctx.fillRect(x, y, layout.cellSize, layout.cellSize);
      }
    }

    ctx.strokeStyle = GameConstants.GRID_LINE;
    ctx.lineWidth = 1;
    for (let road = 0; road <= GameConstants.ROAD_COUNT; road += 1) {
      const y = layout.offsetY + road * layout.cellSize;
      ctx.beginPath();
      ctx.moveTo(layout.offsetX, y);
      ctx.lineTo(layout.offsetX + layout.cellSize * GameConstants.COLUMN_COUNT, y);
      ctx.stroke();
    }
    for (let column = 0; column <= GameConstants.COLUMN_COUNT; column += 1) {
      const x = layout.offsetX + column * layout.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, layout.offsetY);
      ctx.lineTo(x, layout.offsetY + layout.cellSize * GameConstants.ROAD_COUNT);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(230, 57, 70, 0.15)";
    ctx.fillRect(layout.offsetX, layout.offsetY, layout.cellSize, layout.cellSize * GameConstants.ROAD_COUNT);

    const spawnColumnStart = GameConstants.COLUMN_COUNT - 2;
    ctx.fillStyle = "rgba(255, 100, 100, 0.12)";
    ctx.fillRect(
      layout.offsetX + spawnColumnStart * layout.cellSize,
      layout.offsetY,
      layout.cellSize * 2,
      layout.cellSize * GameConstants.ROAD_COUNT
    );
    ctx.fillStyle = "#ff6b6b";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(
      "敌人入口 →",
      layout.offsetX + spawnColumnStart * layout.cellSize + 6,
      layout.offsetY - 2
    );

    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "12px sans-serif";
    for (let road = 0; road < GameConstants.ROAD_COUNT; road += 1) {
      const labelY = layout.offsetY + road * layout.cellSize + layout.cellSize * 0.35;
      ctx.fillText("第" + (road + 1) + "路", layout.offsetX + 4, labelY);
    }
  }

  drawPlantPreview() {
    if (this.selectedPlantType === null || this.hoverRoad < 0 || this.hoverColumn < 1) {
      return;
    }
    const canPlace = this.grid.canPlantAt(this.hoverRoad, this.hoverColumn)
      && this.sun >= PlantCatalog[this.selectedPlantType].cost;
    const x = this.layout.offsetX + this.hoverColumn * this.layout.cellSize;
    const y = this.layout.offsetY + this.hoverRoad * this.layout.cellSize;
    this.ctx.fillStyle = canPlace ? "rgba(255, 209, 102, 0.35)" : "rgba(230, 57, 70, 0.35)";
    this.ctx.fillRect(x, y, this.layout.cellSize, this.layout.cellSize);
    this.ctx.strokeStyle = canPlace ? "#ffd166" : "#e63946";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x + 1, y + 1, this.layout.cellSize - 2, this.layout.cellSize - 2);
  }

  draw() {
    this.drawField();
    this.drawPlantPreview();

    for (let road = 0; road < GameConstants.ROAD_COUNT; road += 1) {
      for (let column = 1; column < GameConstants.COLUMN_COUNT; column += 1) {
        const plant = this.grid.getPlant(road, column);
        if (plant !== null && (plant.isAlive() || (plant.typeKey === "battleEngine" && plant.shattered))) {
          const x = this.layout.offsetX + column * this.layout.cellSize;
          const y = this.layout.offsetY + road * this.layout.cellSize;
          plant.draw(this.ctx, x, y, this.layout.cellSize);
        }
      }
    }

    this.carts.forEach((cart) => {
      cart.draw(this.ctx, this.layout);
    });

    this.enemies.forEach((enemy) => {
      enemy.draw(this.ctx, this.layout);
    });

    this.projectiles.forEach((projectile) => {
      projectile.draw(this.ctx, this.layout);
    });

    this.explosionEffects.forEach((effect) => {
      effect.draw(this.ctx, this.layout);
    });

    this.sunVisuals.forEach((visual) => {
      visual.draw(this.ctx);
    });

    if (this.selectedPlantType !== null) {
      this.ctx.fillStyle = "rgba(255, 209, 102, 0.85)";
      this.ctx.font = "14px sans-serif";
      this.ctx.fillText("已选择: " + PlantCatalog[this.selectedPlantType].name, 12, 22);
    }
  }

  renderStaticPreview() {
    this.drawField();
    this.drawPlantPreview();
    for (let road = 0; road < GameConstants.ROAD_COUNT; road += 1) {
      const cart = new PushCart(road);
      cart.draw(this.ctx, this.layout);
    }
  }

  gameLoop(currentMs) {
    const deltaMs = Math.min(currentMs - this.lastFrameMs, 50);
    this.lastFrameMs = currentMs;

    this.update(deltaMs);
    this.draw();

    if (this.running && !this.gameOver) {
      this.animationFrameId = requestAnimationFrame((time) => {
        this.gameLoop(time);
      });
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("game-canvas");
  const game = new TowerDefenseGame(canvas);
  window.towerDefenseGame = game;
});
