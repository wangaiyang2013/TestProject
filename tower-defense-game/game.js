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
  ENEMY_SPEED: 0.035,
  ENEMY_HP: 270,
  ENEMY_SPAWN_INTERVAL_MS: 2200,
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
  SNAKE_SUN_INTERVAL_MS: 15000,
  SNAKE_SUN_VALUE: 50,
  SNAKE_SCULPTOR_INTERVAL_MS: 1500,
  SNAKE_SCULPTOR_DAMAGE: 20,
  SNAKE_HEAVY_INTERVAL_MS: 2000,
  SNAKE_HEAVY_DAMAGE: 50,
  SNAKE_REPAIR_MS: 20000,
};

const PlantCatalog = {
  snakeSculptor: {
    name: "蛇雕师",
    cost: 100,
    maxHp: 100,
    color: "#2a9d8f",
    leafColor: "#1b4332",
    shootDirection: ShootDirection.LEFT,
    shootDamage: GameConstants.SNAKE_SCULPTOR_DAMAGE,
    shootIntervalMs: GameConstants.SNAKE_SCULPTOR_INTERVAL_MS,
  },
  snakeSunflower: {
    name: "蛇阳花",
    cost: 50,
    maxHp: 80,
    color: "#e9c46a",
    leafColor: "#2d6a4f",
  },
  snakeShooterRight: {
    name: "右蛇射手",
    cost: 150,
    maxHp: 100,
    color: "#40916c",
    leafColor: "#1b4332",
    shootDirection: ShootDirection.RIGHT,
    shootDamage: GameConstants.SNAKE_HEAVY_DAMAGE,
    shootIntervalMs: GameConstants.SNAKE_HEAVY_INTERVAL_MS,
  },
  snakeShooterLeft: {
    name: "左蛇射手",
    cost: 150,
    maxHp: 100,
    color: "#52b788",
    leafColor: "#1b4332",
    shootDirection: ShootDirection.LEFT,
    shootDamage: GameConstants.SNAKE_HEAVY_DAMAGE,
    shootIntervalMs: GameConstants.SNAKE_HEAVY_INTERVAL_MS,
  },
  snakeCannonRight: {
    name: "右蛇炮",
    cost: 175,
    maxHp: 100,
    color: "#1d3557",
    leafColor: "#14213d",
    shootDirection: ShootDirection.RIGHT,
    shootDamage: GameConstants.SNAKE_HEAVY_DAMAGE,
    shootIntervalMs: GameConstants.SNAKE_HEAVY_INTERVAL_MS,
  },
  snakeRegeneratorLeft: {
    name: "再生左蛇",
    cost: 200,
    maxHp: 150,
    color: "#606c38",
    leafColor: "#283618",
    shootDirection: ShootDirection.LEFT,
    shootDamage: GameConstants.SNAKE_HEAVY_DAMAGE,
    shootIntervalMs: GameConstants.SNAKE_HEAVY_INTERVAL_MS,
    autoRepairMs: GameConstants.SNAKE_REPAIR_MS,
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
    if (column <= 0 || column >= this.columnCount) {
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

  draw(ctx, cellX, cellY, cellSize) {
    const centerX = cellX + cellSize * 0.5;
    const centerY = cellY + cellSize * 0.5;
    const radius = cellSize * 0.32;

    ctx.fillStyle = this.leafColor;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + cellSize * 0.18, radius * 0.9, radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    if (this.maxHp > 100) {
      const hpRatio = this.hp / this.maxHp;
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(cellX + 4, cellY + 4, cellSize - 8, 5);
      ctx.fillStyle = hpRatio > 0.5 ? "#95d5b2" : "#e63946";
      ctx.fillRect(cellX + 4, cellY + 4, (cellSize - 8) * hpRatio, 5);
    }
  }
}

/**
 * 定向射手基类：支持向左或向右攻击
 */
class DirectionalShooterPlant extends Plant {
  constructor(typeKey, road, column) {
    super(typeKey, road, column);
    const definition = PlantCatalog[typeKey];
    this.shootDirection = definition.shootDirection;
    this.shootDamage = definition.shootDamage;
    this.shootIntervalMs = definition.shootIntervalMs;
    this.shootTimerMs = 0;
  }

  hasTargetInDirection(context) {
    if (this.shootDirection === ShootDirection.RIGHT) {
      return context.hasEnemyOnRight(this.road, this.column);
    }
    return context.hasEnemyOnLeft(this.road, this.column);
  }

  update(context) {
    if (!this.isAlive()) {
      return;
    }
    if (!this.hasTargetInDirection(context)) {
      return;
    }
    this.shootTimerMs += context.deltaMs;
    if (this.shootTimerMs >= this.shootIntervalMs) {
      this.shootTimerMs = 0;
      context.spawnProjectile(this.road, this.column, {
        direction: this.shootDirection,
        damage: this.shootDamage,
      });
    }
  }

  draw(ctx, cellX, cellY, cellSize) {
    super.draw(ctx, cellX, cellY, cellSize);
    const centerX = cellX + cellSize * 0.5;
    const centerY = cellY + cellSize * 0.5;
    const muzzleOffset = this.shootDirection === ShootDirection.RIGHT ? cellSize * 0.18 : -cellSize * 0.18;
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(centerX + muzzleOffset, centerY, cellSize * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 蛇雕师：消耗 100 阳光，对左侧敌人造成 20 点伤害
 */
class SnakeSculptorPlant extends DirectionalShooterPlant {
  constructor(road, column) {
    super("snakeSculptor", road, column);
  }
}

/**
 * 蛇阳花：每 15 秒产生 50 阳光
 */
class SnakeSunflowerPlant extends Plant {
  constructor(road, column) {
    super("snakeSunflower", road, column);
    this.timerMs = 0;
  }

  update(context) {
    if (!this.isAlive()) {
      return;
    }
    this.timerMs += context.deltaMs;
    if (this.timerMs >= GameConstants.SNAKE_SUN_INTERVAL_MS) {
      this.timerMs = 0;
      context.addSun(GameConstants.SNAKE_SUN_VALUE);
      context.spawnSunVisual(this.road, this.column);
      console.info("[SnakeSunflower] 产生 " + GameConstants.SNAKE_SUN_VALUE + " 阳光");
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

/**
 * 右蛇射手：对右侧敌人造成 50 点伤害
 */
class SnakeShooterRightPlant extends DirectionalShooterPlant {
  constructor(road, column) {
    super("snakeShooterRight", road, column);
  }
}

/**
 * 左蛇射手：对左侧敌人造成 50 点伤害
 */
class SnakeShooterLeftPlant extends DirectionalShooterPlant {
  constructor(road, column) {
    super("snakeShooterLeft", road, column);
  }
}

/**
 * 右蛇炮：对右侧敌人造成 50 点伤害
 */
class SnakeCannonRightPlant extends DirectionalShooterPlant {
  constructor(road, column) {
    super("snakeCannonRight", road, column);
  }

  draw(ctx, cellX, cellY, cellSize) {
    super.draw(ctx, cellX, cellY, cellSize);
    const centerX = cellX + cellSize * 0.5;
    const centerY = cellY + cellSize * 0.5;
    ctx.fillStyle = "#457b9d";
    ctx.fillRect(centerX + cellSize * 0.08, centerY - cellSize * 0.06, cellSize * 0.22, cellSize * 0.12);
  }
}

/**
 * 再生左蛇：对左侧敌人造成 50 点伤害，受伤后 20 秒自动回满生命
 */
class SnakeRegeneratorLeftPlant extends DirectionalShooterPlant {
  constructor(road, column) {
    super("snakeRegeneratorLeft", road, column);
    this.repairTimerMs = 0;
  }

  takeDamage(amount) {
    super.takeDamage(amount);
    this.repairTimerMs = 0;
  }

  update(context) {
    super.update(context);
    if (!this.isAlive()) {
      return;
    }
    if (this.hp >= this.maxHp) {
      this.repairTimerMs = 0;
      return;
    }
    this.repairTimerMs += context.deltaMs;
    if (this.repairTimerMs >= GameConstants.SNAKE_REPAIR_MS) {
      this.hp = this.maxHp;
      this.repairTimerMs = 0;
      console.info("[SnakeRegeneratorLeft] 自动修复完成，生命回满");
    }
  }

  draw(ctx, cellX, cellY, cellSize) {
    super.draw(ctx, cellX, cellY, cellSize);
    if (this.hp < this.maxHp) {
      const hpRatio = this.hp / this.maxHp;
      const repairRatio = this.repairTimerMs / GameConstants.SNAKE_REPAIR_MS;
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(cellX + 4, cellY + cellSize - 10, cellSize - 8, 4);
      ctx.fillStyle = "#95d5b2";
      ctx.fillRect(cellX + 4, cellY + cellSize - 10, (cellSize - 8) * repairRatio, 4);
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(cellX + 4, cellY + 4, (cellSize - 8) * hpRatio, 5);
    }
  }
}

/**
 * 子弹：支持向左或向右飞行
 */
class Projectile {
  constructor(road, columnPosition, direction, damage) {
    this.road = road;
    this.columnPosition = columnPosition;
    this.direction = direction;
    this.alive = true;
    this.damage = damage;
  }

  update(deltaMs, cellWidth) {
    const moveStep = (GameConstants.PROJECTILE_SPEED * deltaMs) / cellWidth;
    this.columnPosition += moveStep * this.direction;
    if (this.direction === ShootDirection.RIGHT && this.columnPosition >= GameConstants.COLUMN_COUNT) {
      this.alive = false;
    }
    if (this.direction === ShootDirection.LEFT && this.columnPosition <= 0) {
      this.alive = false;
    }
  }

  draw(ctx, layout) {
    const x = layout.columnToPixel(this.columnPosition);
    const y = layout.roadCenterY(this.road);
    ctx.fillStyle = this.direction === ShootDirection.RIGHT ? "#52b788" : "#90be6d";
    ctx.beginPath();
    ctx.arc(x, y, layout.cellSize * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 小怪物：无特性，向左行走
 */
class LittleMonster {
  constructor(road) {
    this.road = road;
    this.columnPosition = GameConstants.COLUMN_COUNT + 0.5;
    this.hp = GameConstants.ENEMY_HP;
    this.maxHp = GameConstants.ENEMY_HP;
    this.alive = true;
    this.eatingPlant = null;
    this.eatTimerMs = 0;
    this.eatIntervalMs = 900;
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

    if (this.columnPosition <= GameConstants.BASE_FAIL_COLUMN) {
      context.triggerGameOver("小怪物突破了最左端防线！");
      return;
    }

    const plant = context.getBlockingPlant(this.road, this.columnPosition);
    if (plant !== null && plant.isAlive()) {
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
    const moveStep = (GameConstants.ENEMY_SPEED * context.deltaMs) / context.layout.cellWidth;
    this.columnPosition -= moveStep;

    if (this.columnPosition <= GameConstants.CART_TRIGGER_COLUMN) {
      context.triggerCart(this.road);
    }
  }

  draw(ctx, layout) {
    const x = layout.columnToPixel(this.columnPosition);
    const y = layout.roadCenterY(this.road);
    const size = layout.cellSize * 0.38;

    ctx.fillStyle = GameConstants.ENEMY_COLOR;
    ctx.beginPath();
    ctx.roundRect(x - size * 0.5, y - size * 0.55, size, size * 1.1, size * 0.2);
    ctx.fill();

    ctx.fillStyle = GameConstants.ENEMY_EYE;
    ctx.beginPath();
    ctx.arc(x - size * 0.18, y - size * 0.12, size * 0.1, 0, Math.PI * 2);
    ctx.arc(x + size * 0.18, y - size * 0.12, size * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1d3557";
    ctx.fillRect(x - size * 0.08, y + size * 0.08, size * 0.16, size * 0.08);

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
    this.value = GameConstants.SNAKE_SUN_VALUE;
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
  }

  reset() {
    this.wave = 1;
    this.spawnedInWave = 0;
    this.spawnTimerMs = 0;
    this.breakTimerMs = 0;
    this.inBreak = false;
  }

  update(context) {
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
    this.recalculate();
  }

  recalculate() {
    const padding = 8;
    const availableWidth = this.canvas.width - padding * 2;
    const availableHeight = this.canvas.height - padding * 2;
    this.cellWidth = availableWidth / this.columnCount;
    this.cellHeight = availableHeight / this.roadCount;
    this.cellSize = Math.min(this.cellWidth, this.cellHeight);
    const fieldWidth = this.cellSize * this.columnCount;
    const fieldHeight = this.cellSize * this.roadCount;
    this.offsetX = (this.canvas.width - fieldWidth) * 0.5;
    this.offsetY = (this.canvas.height - fieldHeight) * 0.5;
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
    if (typeKey === "snakeSculptor") {
      return new SnakeSculptorPlant(road, column);
    }
    if (typeKey === "snakeSunflower") {
      return new SnakeSunflowerPlant(road, column);
    }
    if (typeKey === "snakeShooterRight") {
      return new SnakeShooterRightPlant(road, column);
    }
    if (typeKey === "snakeShooterLeft") {
      return new SnakeShooterLeftPlant(road, column);
    }
    if (typeKey === "snakeCannonRight") {
      return new SnakeCannonRightPlant(road, column);
    }
    if (typeKey === "snakeRegeneratorLeft") {
      return new SnakeRegeneratorLeftPlant(road, column);
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
    this.sunVisuals = [];
    this.carts = [];
    this.spawner = new WaveSpawner();
    this.sun = GameConstants.INITIAL_SUN;
    this.killCount = 0;
    this.selectedPlantType = null;
    this.running = false;
    this.gameOver = false;
    this.lastFrameMs = 0;
    this.animationFrameId = null;

    this.ui = {
      sunCount: document.getElementById("sun-count"),
      waveCount: document.getElementById("wave-count"),
      killCount: document.getElementById("kill-count"),
      startOverlay: document.getElementById("overlay"),
      gameOverOverlay: document.getElementById("game-over-overlay"),
      gameOverTitle: document.getElementById("game-over-title"),
      gameOverMessage: document.getElementById("game-over-message"),
      plantCards: document.querySelectorAll(".plant-card"),
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
        if (!this.running || this.gameOver) {
          return;
        }
        const plantType = card.getAttribute("data-plant");
        this.selectPlantType(plantType);
      });
    });

    this.canvas.addEventListener("click", (event) => {
      this.handleCanvasClick(event.clientX, event.clientY);
    });

    this.canvas.addEventListener("touchstart", (event) => {
      event.preventDefault();
      const touch = event.changedTouches[0];
      this.handleCanvasClick(touch.clientX, touch.clientY);
    });
  }

  resizeCanvas() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const width = Math.min(rect.width, 1200);
    const height = Math.max(320, rect.height - 160);
    this.canvas.width = width;
    this.canvas.height = height;
    this.layout.recalculate();
  }

  selectPlantType(plantType) {
    if (this.selectedPlantType === plantType) {
      this.selectedPlantType = null;
    } else {
      this.selectedPlantType = plantType;
    }
    this.refreshPlantCards();
  }

  refreshPlantCards() {
    this.ui.plantCards.forEach((card) => {
      const plantType = card.getAttribute("data-plant");
      const cost = PlantCatalog[plantType].cost;
      const selected = this.selectedPlantType === plantType;
      const disabled = this.sun < cost;
      card.classList.toggle("selected", selected);
      card.classList.toggle("disabled", disabled);
    });
  }

  startGame() {
    this.running = true;
    this.gameOver = false;
    this.sun = GameConstants.INITIAL_SUN;
    this.killCount = 0;
    this.selectedPlantType = null;
    this.enemies = [];
    this.projectiles = [];
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

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.lastFrameMs = performance.now();
    this.animationFrameId = requestAnimationFrame((time) => {
      this.gameLoop(time);
    });

    console.info("[TowerDefenseGame] 游戏开始");
  }

  handleCanvasClick(clientX, clientY) {
    if (!this.running || this.gameOver) {
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const pixelX = ((clientX - rect.left) / rect.width) * this.canvas.width;
    const pixelY = ((clientY - rect.top) / rect.height) * this.canvas.height;

    if (!this.layout.isInsideField(pixelX, pixelY)) {
      return;
    }
    if (this.selectedPlantType === null) {
      return;
    }

    const gridPos = this.layout.pixelToGrid(pixelX, pixelY);
    this.tryPlacePlant(this.selectedPlantType, gridPos.road, gridPos.column);
  }

  tryPlacePlant(typeKey, road, column) {
    const definition = PlantCatalog[typeKey];
    if (definition === undefined) {
      return;
    }
    if (this.sun < definition.cost) {
      return;
    }
    if (!this.grid.canPlantAt(road, column)) {
      return;
    }

    const plant = PlantFactory.create(typeKey, road, column);
    if (plant === null) {
      return;
    }

    this.grid.placePlant(road, column, plant);
    this.sun -= definition.cost;
    this.updateHud();
    this.refreshPlantCards();
    console.info("[TowerDefenseGame] 放置 " + definition.name + " 于第 " + (road + 1) + " 路第 " + column + " 列");
  }

  addSun(amount) {
    this.sun += amount;
    this.updateHud();
    this.refreshPlantCards();
  }

  spawnSunVisual(road, column) {
    this.sunVisuals.push(new SunVisual(road, column, this.layout));
  }

  spawnProjectile(road, column, options) {
    const direction = options.direction;
    const damage = options.damage;
    const startOffset = direction === ShootDirection.RIGHT ? 0.8 : -0.8;
    this.projectiles.push(new Projectile(road, column + startOffset, direction, damage));
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
    if (plant !== null && plant.isAlive()) {
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
      spawnProjectile(road, column, options) {
        self.spawnProjectile(road, column, options);
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

    this.enemies = this.enemies.filter((enemy) => enemy.isAlive());
    this.projectiles = this.projectiles.filter((projectile) => projectile.alive);
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
  }

  draw() {
    this.drawField();

    for (let road = 0; road < GameConstants.ROAD_COUNT; road += 1) {
      for (let column = 1; column < GameConstants.COLUMN_COUNT; column += 1) {
        const plant = this.grid.getPlant(road, column);
        if (plant !== null && plant.isAlive()) {
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
