/**
 * 组团战斗模式 - 击杀怪物获得经验，通关抽卡，击败30个Boss获胜
 */

const GroupBattleConstants = {
  FINAL_BOSS_TOTAL: 30,
  MONSTERS_PER_LEVEL_BASE: 6,
  MONSTER_BASE_HP: 35,
  MONSTER_SPEED: 2.2,
  MONSTER_DAMAGE: 12,
  MONSTER_XP: 20,
  MONSTER_RADIUS_RATIO: 0.028,
  BOSS_HP_BASE: 180,
  BOSS_DAMAGE: 18,
  BOSS_XP: 80,
  BOSS_RADIUS_RATIO: 0.055,
  BOSS_SPEED: 1.8,
  LEVEL_HP_SCALE: 1.12,
  LEVEL_COUNT_SCALE: 1,
  XP_PER_LEVEL: 100,
  CONTACT_DAMAGE_COOLDOWN_MS: 600,
  SPAWN_DELAY_MS: 400,
  MONSTER_COLOR: "#a9e34b",
  MONSTER_GLOW: "#94d82d",
  BOSS_COLOR: "#ff922b",
  BOSS_GLOW: "#ffd43b",
};

/**
 * 增益卡牌定义
 */
class PowerCard {
  constructor(id, name, description, applyFn) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.applyFn = applyFn;
  }
}

/**
 * 卡牌池
 */
class CardPool {
  static getAllCards() {
    return [
      new PowerCard(
        "health",
        "生命强化",
        "最大生命 +25",
        (player) => {
          player.maxHealthBonus += 25;
          player.health = Math.min(
            player.getMaxHealth(),
            player.health + 25
          );
        }
      ),
      new PowerCard(
        "damage",
        "攻击强化",
        "伤害 +20%",
        (player) => {
          player.damageMultiplier += 0.2;
        }
      ),
      new PowerCard(
        "speed",
        "疾风步",
        "移动速度 +15%",
        (player) => {
          player.speedMultiplier += 0.15;
        }
      ),
      new PowerCard(
        "attack_speed",
        "快速射击",
        "攻击冷却 -20%",
        (player) => {
          player.cooldownMultiplier *= 0.8;
        }
      ),
      new PowerCard(
        "heal",
        "恢复术",
        "立即回满生命",
        (player) => {
          player.health = player.getMaxHealth();
        }
      ),
      new PowerCard(
        "xp_boost",
        "经验加成",
        "获得经验 +30%",
        (player) => {
          player.xpMultiplier += 0.3;
        }
      ),
    ];
  }

  static drawThree() {
    const pool = CardPool.getAllCards();
    const picked = [];
    const copy = pool.slice();
    for (let i = 0; i < 3 && copy.length > 0; i += 1) {
      const idx = Math.floor(Math.random() * copy.length);
      picked.push(copy[idx]);
      copy.splice(idx, 1);
    }
    return picked;
  }
}

/**
 * 组团战斗玩家（继承基础球玩家能力）
 */
class GroupBattlePlayer extends BallPlayer {
  constructor(id, x, y, radius, color, glowColor, controlScheme) {
    super(id, x, y, radius, color, glowColor, controlScheme);
    this.experience = 0;
    this.characterLevel = 1;
    this.maxHealthBonus = 0;
    this.damageMultiplier = 1;
    this.speedMultiplier = 1;
    this.cooldownMultiplier = 1;
    this.xpMultiplier = 1;
    this.cardsCollected = [];
  }

  getMaxHealth() {
    return GameConstants.MAX_HEALTH + this.maxHealthBonus;
  }

  getMoveSpeed() {
    return GameConstants.MOVE_SPEED * this.speedMultiplier;
  }

  getAttackCooldownMs() {
    return GameConstants.ATTACK_COOLDOWN_MS * this.cooldownMultiplier;
  }

  getProjectileDamage() {
    return Math.round(
      GameConstants.PROJECTILE_DAMAGE * this.damageMultiplier
    );
  }

  canAttack() {
    return Date.now() - this.lastAttackTime >= this.getAttackCooldownMs();
  }

  move(dir, arena) {
    if (dir.x !== 0 || dir.y !== 0) {
      this.lastMoveDir = dir.clone();
    }
    this.x += dir.x * this.getMoveSpeed();
    this.y += dir.y * this.getMoveSpeed();
    arena.clampBall(this);
  }

  takeDamage(amount) {
    if (Date.now() < this.invincibleUntil) {
      return false;
    }
    this.health = Math.max(0, this.health - amount);
    this.invincibleUntil = Date.now() + 300;
    return true;
  }

  healToFull() {
    this.health = this.getMaxHealth();
  }

  addExperience(amount) {
    const gained = Math.round(amount * this.xpMultiplier);
    this.experience += gained;
    while (this.experience >= GroupBattleConstants.XP_PER_LEVEL) {
      this.experience -= GroupBattleConstants.XP_PER_LEVEL;
      this.characterLevel += 1;
      this.maxHealthBonus += 5;
      this.health = Math.min(this.getMaxHealth(), this.health + 10);
      this.damageMultiplier += 0.05;
    }
    return gained;
  }

  applyCard(card) {
    card.applyFn(this);
    this.cardsCollected.push(card.name);
    this.health = Math.min(this.health, this.getMaxHealth());
  }

  getHealthPercent() {
    return (this.health / this.getMaxHealth()) * 100;
  }

  draw(ctx) {
    super.draw(ctx);
    ctx.fillStyle = "#fff";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Lv.${this.characterLevel}`, this.x, this.y + this.radius + 14);
    ctx.textAlign = "left";
  }
}

/**
 * 怪物 / Boss
 */
class BattleMonster {
  constructor(x, y, radius, maxHealth, speed, damage, xpValue, isBoss) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.speed = speed;
    this.damage = damage;
    this.xpValue = xpValue;
    this.isBoss = isBoss;
    this.alive = true;
    this.lastContactDamage = 0;
    this.color = isBoss
      ? GroupBattleConstants.BOSS_COLOR
      : GroupBattleConstants.MONSTER_COLOR;
    this.glowColor = isBoss
      ? GroupBattleConstants.BOSS_GLOW
      : GroupBattleConstants.MONSTER_GLOW;
  }

  update(players, arena) {
    const target = this.findNearestPlayer(players);
    if (!target) {
      return;
    }

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }

    const step = this.speed;
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;

    this.x = Math.max(
      arena.left + this.radius,
      Math.min(arena.right - this.radius, this.x)
    );
    this.y = Math.max(
      arena.top + this.radius,
      Math.min(arena.bottom - this.radius, this.y)
    );
  }

  findNearestPlayer(players) {
    let nearest = null;
    let minDist = Infinity;
    for (const player of players) {
      if (!player.isAlive()) {
        continue;
      }
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = player;
      }
    }
    return nearest;
  }

  tryDamagePlayer(player) {
    const now = Date.now();
    if (now - this.lastContactDamage < GroupBattleConstants.CONTACT_DAMAGE_COOLDOWN_MS) {
      return;
    }
    if (
      CollisionDetector.circleHitsCircle(
        this.x,
        this.y,
        this.radius,
        player.x,
        player.y,
        player.radius
      )
    ) {
      player.takeDamage(this.damage);
      this.lastContactDamage = now;
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = this.glowColor;
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = this.isBoss ? 4 : 2;
    ctx.stroke();

    BallMaxHealthLabelRenderer.drawAboveHead(
      ctx,
      this.x,
      this.y,
      this.radius,
      this.maxHealth,
      {
        offsetY: 12,
        textColor: this.isBoss ? "#ff922b" : "#94d82d",
      }
    );

    if (this.isBoss) {
      ctx.fillStyle = "#ffd43b";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BOSS", this.x, this.y - this.radius - 24);
      ctx.textAlign = "left";
    }
  }
}

/**
 * 关卡生成器
 */
class LevelSpawner {
  static getMonsterCount(level) {
    return (
      GroupBattleConstants.MONSTERS_PER_LEVEL_BASE +
      Math.floor((level - 1) * GroupBattleConstants.LEVEL_COUNT_SCALE)
    );
  }

  static getScaledHp(baseHp, level) {
    return Math.round(
      baseHp * Math.pow(GroupBattleConstants.LEVEL_HP_SCALE, level - 1)
    );
  }

  static createMonster(x, y, radius, level) {
    const hp = LevelSpawner.getScaledHp(
      GroupBattleConstants.MONSTER_BASE_HP,
      level
    );
    return new BattleMonster(
      x,
      y,
      radius,
      hp,
      GroupBattleConstants.MONSTER_SPEED,
      GroupBattleConstants.MONSTER_DAMAGE,
      GroupBattleConstants.MONSTER_XP,
      false
    );
  }

  static createBoss(x, y, radius, level) {
    const hp = LevelSpawner.getScaledHp(
      GroupBattleConstants.BOSS_HP_BASE,
      level
    );
    return new BattleMonster(
      x,
      y,
      radius,
      hp,
      GroupBattleConstants.BOSS_SPEED,
      GroupBattleConstants.BOSS_DAMAGE,
      GroupBattleConstants.BOSS_XP,
      true
    );
  }
}

/**
 * 组团战斗主逻辑
 */
class GroupBattleGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.input = new InputManager();
    this.state = "idle";
    this.playerCount = 1;
    this.currentLevel = 1;
    this.bossesDefeated = 0;
    this.players = [];
    this.monsters = [];
    this.projectiles = [];
    this.arena = null;
    this.width = 0;
    this.height = 0;
    this.monstersRemaining = 0;
    this.monstersSpawned = 0;
    this.spawnTimer = 0;
    this.phase = "monsters";
    this.onLevelComplete = null;
    this.onGameVictory = null;
    this.onGameOver = null;
    this.onHudUpdate = null;
    this.animationId = null;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;

    const padX = this.width * GameConstants.ARENA_PADDING_RATIO;
    const padY = this.height * GameConstants.ARENA_PADDING_RATIO;
    this.arena = new ArenaBounds(
      padX,
      padY + 50,
      this.width - padX,
      this.height - padY
    );

    const r = this.getBallRadius();
    for (const player of this.players) {
      player.radius = r;
      this.arena.clampBall(player);
    }
  }

  getBallRadius() {
    return Math.max(16, this.height * GameConstants.BALL_RADIUS_RATIO);
  }

  getMonsterRadius() {
    return Math.max(12, this.height * GroupBattleConstants.MONSTER_RADIUS_RATIO);
  }

  getBossRadius() {
    return Math.max(24, this.height * GroupBattleConstants.BOSS_RADIUS_RATIO);
  }

  getProjectileRadius() {
    return Math.max(8, this.height * GameConstants.PROJECTILE_RADIUS_RATIO);
  }

  randomSpawnPoint() {
    const margin = 40;
    return {
      x:
        this.arena.left +
        margin +
        Math.random() * (this.arena.right - this.arena.left - margin * 2),
      y:
        this.arena.top +
        margin +
        Math.random() * (this.arena.bottom - this.arena.top - margin * 2),
    };
  }

  start(playerCount) {
    this.playerCount = playerCount;
    this.currentLevel = 1;
    this.bossesDefeated = 0;
    this.state = "playing";
    this.projectiles = [];
    this.monsters = [];
    this.phase = "monsters";

    const r = this.getBallRadius();
    const centerY = (this.arena.top + this.arena.bottom) / 2;

    this.players = [
      new GroupBattlePlayer(
        1,
        this.arena.left + this.width * 0.2,
        centerY,
        r,
        GameConstants.PLAYER1_COLOR,
        GameConstants.PLAYER1_GLOW,
        ControlScheme.player1()
      ),
    ];

    if (playerCount === 2) {
      this.players.push(
        new GroupBattlePlayer(
          2,
          this.arena.left + this.width * 0.35,
          centerY,
          r,
          GameConstants.PLAYER2_COLOR,
          GameConstants.PLAYER2_GLOW,
          ControlScheme.player2()
        )
      );
    }

    this.beginLevel();

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.loop();
  }

  beginLevel() {
    this.monsters = [];
    this.projectiles = [];
    this.phase = "monsters";
    this.monstersSpawned = 0;
    this.monstersRemaining = LevelSpawner.getMonsterCount(this.currentLevel);
    this.spawnTimer = 0;

    for (const player of this.players) {
      player.healToFull();
    }

    this.notifyHud();
  }

  spawnNextMonster() {
    if (this.monstersSpawned >= this.monstersRemaining) {
      return;
    }

    const point = this.randomSpawnPoint();
    const monster = LevelSpawner.createMonster(
      point.x,
      point.y,
      this.getMonsterRadius(),
      this.currentLevel
    );
    this.monsters.push(monster);
    this.monstersSpawned += 1;
  }

  spawnBoss() {
    const point = {
      x: (this.arena.left + this.arena.right) / 2,
      y: (this.arena.top + this.arena.bottom) / 2,
    };
    const boss = LevelSpawner.createBoss(
      point.x,
      point.y,
      this.getBossRadius(),
      this.currentLevel
    );
    this.monsters.push(boss);
    this.phase = "boss";
    this.notifyHud();
  }

  notifyHud() {
    if (typeof this.onHudUpdate === "function") {
      this.onHudUpdate(this.getHudSnapshot());
    }
  }

  getHudSnapshot() {
    const p1 = this.players[0];
    const p2 = this.players[1];
    return {
      level: this.currentLevel,
      bossesDefeated: this.bossesDefeated,
      bossTotal: GroupBattleConstants.FINAL_BOSS_TOTAL,
      phase: this.phase,
      monstersLeft: this.monsters.filter((m) => m.alive).length,
      p1Xp: p1 ? p1.experience : 0,
      p1Level: p1 ? p1.characterLevel : 1,
      p2Xp: p2 ? p2.experience : 0,
      p2Level: p2 ? p2.characterLevel : 1,
      p1Hp: p1 ? p1.getHealthPercent() : 0,
      p2Hp: p2 ? p2.getHealthPercent() : 0,
      playerCount: this.playerCount,
    };
  }

  distributeXp(amount) {
    for (const player of this.players) {
      player.addExperience(amount);
    }
    this.notifyHud();
  }

  onMonsterKilled(monster) {
    this.distributeXp(monster.xpValue);

    if (this.phase === "boss") {
      this.bossesDefeated += 1;
      this.state = "card_select";
      if (this.animationId !== null) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      if (typeof this.onLevelComplete === "function") {
        this.onLevelComplete(CardPool.drawThree(), this.getHudSnapshot());
      }
      return;
    }

    const aliveMonsters = this.monsters.filter((m) => m.alive);
    if (
      aliveMonsters.length === 0 &&
      this.monstersSpawned >= this.monstersRemaining
    ) {
      this.spawnBoss();
    }
  }

  applyCardToParty(card) {
    for (const player of this.players) {
      player.applyCard(card);
    }
    this.advanceAfterCard();
  }

  advanceAfterCard() {
    if (this.bossesDefeated >= GroupBattleConstants.FINAL_BOSS_TOTAL) {
      this.state = "victory";
      if (typeof this.onGameVictory === "function") {
        this.onGameVictory();
      }
      return;
    }

    this.currentLevel += 1;
    this.state = "playing";
    this.beginLevel();
    this.loop();
  }

  updatePlayers() {
    for (const player of this.players) {
      if (!player.isAlive()) {
        continue;
      }
      const dir = player.getMoveInput(this.input);
      player.move(dir, this.arena);
    }
  }

  handlePlayerAttacks() {
    const projectileRadius = this.getProjectileRadius();

    for (const player of this.players) {
      if (!player.isAlive()) {
        continue;
      }
      if (!player.wantsAttack(this.input)) {
        continue;
      }
      const proj = player.tryAttack(projectileRadius);
      if (proj) {
        proj.damage = player.getProjectileDamage();
        this.projectiles.push(proj);
      }
    }
  }

  updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const proj = this.projectiles[i];
      proj.update();

      if (!proj.alive || proj.isOutOfBounds(this.arena)) {
        this.projectiles.splice(i, 1);
        continue;
      }

      for (let j = this.monsters.length - 1; j >= 0; j -= 1) {
        const monster = this.monsters[j];
        if (!monster.alive) {
          continue;
        }
        if (
          CollisionDetector.circleHitsCircle(
            proj.x,
            proj.y,
            proj.radius,
            monster.x,
            monster.y,
            monster.radius
          )
        ) {
          const damage = proj.damage || GameConstants.PROJECTILE_DAMAGE;
          const killed = monster.takeDamage(damage);
          proj.alive = false;
          this.projectiles.splice(i, 1);
          if (killed) {
            this.onMonsterKilled(monster);
          }
          break;
        }
      }
    }
  }

  updateMonsters() {
    if (this.phase === "monsters" && this.monstersSpawned < this.monstersRemaining) {
      this.spawnTimer += 1;
      if (this.spawnTimer >= GroupBattleConstants.SPAWN_DELAY_MS / 16) {
        this.spawnNextMonster();
        this.spawnTimer = 0;
      }
    }

    for (const monster of this.monsters) {
      if (!monster.alive) {
        continue;
      }
      monster.update(this.players, this.arena);
      for (const player of this.players) {
        if (player.isAlive()) {
          monster.tryDamagePlayer(player);
        }
      }
    }
  }

  checkPartyWipe() {
    const alivePlayers = this.players.filter((p) => p.isAlive());
    if (alivePlayers.length === 0) {
      this.state = "gameover";
      if (this.animationId !== null) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      if (typeof this.onGameOver === "function") {
        this.onGameOver();
      }
    }
  }

  update() {
    if (this.state !== "playing") {
      return;
    }

    this.updatePlayers();
    this.handlePlayerAttacks();
    this.updateProjectiles();
    this.updateMonsters();
    this.checkPartyWipe();
    this.input.clearFrame();
    this.notifyHud();
  }

  drawBackground() {
    this.ctx.fillStyle = GameConstants.BACKGROUND_COLOR;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.arena.draw(this.ctx);

    this.ctx.fillStyle = "rgba(169, 227, 75, 0.25)";
    this.ctx.font = "14px system-ui, sans-serif";
    const phaseText =
      this.phase === "boss"
        ? `第 ${this.currentLevel} 关 · BOSS 战`
        : `第 ${this.currentLevel} 关 · 清剿怪物`;
    this.ctx.fillText(phaseText, 12, 28);
    this.ctx.fillText(
      `Boss ${this.bossesDefeated}/${GroupBattleConstants.FINAL_BOSS_TOTAL}`,
      12,
      46
    );
  }

  draw() {
    this.drawBackground();

    for (const monster of this.monsters) {
      if (monster.alive) {
        monster.draw(this.ctx);
      }
    }

    for (const proj of this.projectiles) {
      proj.draw(this.ctx);
    }

    for (const player of this.players) {
      if (player.isAlive()) {
        player.draw(this.ctx);
      }
    }
  }

  loop() {
    this.update();
    this.draw();

    if (this.state === "playing") {
      this.animationId = requestAnimationFrame(() => this.loop());
    }
  }
}
