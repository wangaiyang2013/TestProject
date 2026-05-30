/**
 * 小球英雄模式 - 选球对战，回合制发射，碰墙反弹，飞行中不可操控方向
 */

const LittleBallHeroConstants = {
  LAUNCH_MIN_SPEED: 8,
  LAUNCH_MAX_SPEED: 16,
  FRICTION: 0.985,
  WALL_BOUNCE: 0.92,
  BALL_BOUNCE: 0.85,
  STOP_SPEED: 0.35,
  AIM_ROTATE_SPEED: 0.06,
  COLLISION_DAMAGE_SCALE: 2.5,
  PICK_COUNTDOWN_MS: 0,
};

/**
 * 可选英雄球模板
 */
class HeroBallTemplate {
  constructor(id, name, color, glow, maxHealth, launchSpeed, mass, collisionDamage) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.glow = glow;
    this.maxHealth = maxHealth;
    this.launchSpeed = launchSpeed;
    this.mass = mass;
    this.collisionDamage = collisionDamage;
  }
}

/**
 * 英雄球图鉴
 */
class HeroRoster {
  static getAll() {
    return [
      new HeroBallTemplate("flame", "烈焰丸", "#e94560", "#ff6b6b", 100, 14, 1.0, 18),
      new HeroBallTemplate("wind", "疾风丸", "#51cf66", "#8ce99a", 85, 16, 0.85, 14),
      new HeroBallTemplate("iron", "铁壁丸", "#868e96", "#ced4da", 130, 11, 1.4, 22),
      new HeroBallTemplate("bolt", "闪电丸", "#fcc419", "#ffe066", 95, 13, 1.0, 16),
    ];
  }

  static getById(id) {
    return HeroRoster.getAll().find((h) => h.id === id) || HeroRoster.getAll()[0];
  }
}

/**
 * 场上战斗用英雄球
 */
class HeroBallFighter {
  constructor(playerId, template, x, y, radius) {
    this.playerId = playerId;
    this.template = template;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.health = template.maxHealth;
    this.vx = 0;
    this.vy = 0;
    this.aimAngle = playerId === 1 ? 0 : Math.PI;
    this.isMoving = false;
  }

  get maxHealth() {
    return this.template.maxHealth;
  }

  get color() {
    return this.template.color;
  }

  get glow() {
    return this.template.glow;
  }

  get mass() {
    return this.template.mass;
  }

  launch() {
    this.vx = Math.cos(this.aimAngle) * this.template.launchSpeed;
    this.vy = Math.sin(this.aimAngle) * this.template.launchSpeed;
    this.isMoving = true;
  }

  isStopped() {
    const speed = Math.hypot(this.vx, this.vy);
    return !this.isMoving || speed < LittleBallHeroConstants.STOP_SPEED;
  }

  stop() {
    this.vx = 0;
    this.vy = 0;
    this.isMoving = false;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  isAlive() {
    return this.health > 0;
  }

  rotateAim(delta) {
    this.aimAngle += delta;
  }

  draw(ctx, isActive, showAim) {
    if (showAim && !this.isMoving) {
      const lineLen = this.radius + 36;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(
        this.x + Math.cos(this.aimAngle) * lineLen,
        this.y + Math.sin(this.aimAngle) * lineLen
      );
      ctx.strokeStyle = isActive ? "#ffd43b" : "rgba(255,255,255,0.35)";
      ctx.lineWidth = isActive ? 3 : 2;
      ctx.setLineDash(isActive ? [] : [6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
    ctx.fillStyle = this.glow;
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = isActive ? "#ffd43b" : "#fff";
    ctx.lineWidth = isActive ? 4 : 2;
    ctx.stroke();

    const barW = this.radius * 2.2;
    const barX = this.x - barW / 2;
    const barY = this.y - this.radius - 16;
    ctx.fillStyle = "#2a2a40";
    ctx.fillRect(barX, barY, barW, 5);
    ctx.fillStyle = this.color;
    ctx.fillRect(barX, barY, barW * (this.health / this.maxHealth), 5);

    ctx.fillStyle = "#fff";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.template.name, this.x, this.y + this.radius + 14);
    ctx.textAlign = "left";
  }
}

/**
 * 墙壁反弹物理
 */
class BouncePhysics {
  static updateBall(ball, arena) {
    if (!ball.isMoving) {
      return;
    }

    ball.x += ball.vx;
    ball.y += ball.vy;

    const bounce = LittleBallHeroConstants.WALL_BOUNCE;
  const r = ball.radius;

    if (ball.x - r < arena.left) {
      ball.x = arena.left + r;
      ball.vx = Math.abs(ball.vx) * bounce;
    } else if (ball.x + r > arena.right) {
      ball.x = arena.right - r;
      ball.vx = -Math.abs(ball.vx) * bounce;
    }

    if (ball.y - r < arena.top) {
      ball.y = arena.top + r;
      ball.vy = Math.abs(ball.vy) * bounce;
    } else if (ball.y + r > arena.bottom) {
      ball.y = arena.bottom - r;
      ball.vy = -Math.abs(ball.vy) * bounce;
    }

    ball.vx *= LittleBallHeroConstants.FRICTION;
    ball.vy *= LittleBallHeroConstants.FRICTION;

    if (ball.isStopped()) {
      ball.stop();
    }
  }

  static resolveBallCollision(a, b) {
    if (!a.isMoving && !b.isMoving) {
      return;
    }

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const minDist = a.radius + b.radius;

    if (dist >= minDist || dist < 0.001) {
      return;
    }

    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    const totalMass = a.mass + b.mass;

    a.x -= (nx * overlap * b.mass) / totalMass;
    a.y -= (ny * overlap * b.mass) / totalMass;
    b.x += (nx * overlap * a.mass) / totalMass;
    b.y += (ny * overlap * a.mass) / totalMass;

    const dvx = a.vx - b.vx;
    const dvy = a.vy - b.vy;
    const impact = dvx * nx + dvy * ny;
    if (impact > 0) {
      const restitution = LittleBallHeroConstants.BALL_BOUNCE;
      const impulse = (2 * impact * restitution) / totalMass;
      a.vx -= impulse * b.mass * nx;
      a.vy -= impulse * b.mass * ny;
      b.vx += impulse * a.mass * nx;
      b.vy += impulse * a.mass * ny;

      const relSpeed = Math.abs(impact);
      const dmgA = Math.round(
        b.template.collisionDamage *
          LittleBallHeroConstants.COLLISION_DAMAGE_SCALE *
          (relSpeed / 10)
      );
      const dmgB = Math.round(
        a.template.collisionDamage *
          LittleBallHeroConstants.COLLISION_DAMAGE_SCALE *
          (relSpeed / 10)
      );
      a.takeDamage(Math.max(4, dmgA));
      b.takeDamage(Math.max(4, dmgB));

      if (!a.isStopped()) {
        a.isMoving = true;
      }
      if (!b.isStopped()) {
        b.isMoving = true;
      }
    }
  }
}

/**
 * 训练场 AI
 */
class HeroTrainingAi {
  pickHero(available) {
    const idx = Math.floor(Math.random() * available.length);
    return available[idx];
  }

  computeAimAngle(aiBall, targetBall) {
    const dx = targetBall.x - aiBall.x;
    const dy = targetBall.y - aiBall.y;
    return Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.35;
  }
}

/**
 * 小球英雄主游戏
 */
class LittleBallHeroGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.input = new InputManager();
    this.state = "idle";
    this.subMode = "training";
    this.phase = "pick";
    this.activePlayerId = 1;
    this.pickStep = 1;
    this.fighters = [];
    this.p1HeroId = null;
    this.p2HeroId = null;
    this.takenHeroIds = new Set();
    this.arena = null;
    this.width = 0;
    this.height = 0;
    this.animationId = null;
    this.trainingAi = new HeroTrainingAi();
    this.onPhaseChange = null;
    this.onGameOver = null;
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
    for (const fighter of this.fighters) {
      fighter.radius = r;
      this.arena.clampBall(fighter);
    }
  }

  getBallRadius() {
    return Math.max(18, this.height * GameConstants.BALL_RADIUS_RATIO);
  }

  start(subMode) {
    this.subMode = subMode;
    this.state = "playing";
    this.phase = "pick";
    this.activePlayerId = 1;
    this.pickStep = 1;
    this.p1HeroId = null;
    this.p2HeroId = null;
    this.takenHeroIds = new Set();
    this.fighters = [];
    this.notifyPhase();

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.loop();
  }

  isTwoPlayer() {
    return this.subMode === "versus";
  }

  notifyPhase() {
    if (typeof this.onPhaseChange === "function") {
      this.onPhaseChange(this.getPhaseSnapshot());
    }
  }

  getPhaseSnapshot() {
    return {
      phase: this.phase,
      activePlayerId: this.activePlayerId,
      pickStep: this.pickStep,
      subMode: this.subMode,
      p1HeroId: this.p1HeroId,
      p2HeroId: this.p2HeroId,
      fighters: this.fighters.map((f) => ({
        playerId: f.playerId,
        name: f.template.name,
        health: f.health,
        maxHealth: f.maxHealth,
      })),
    };
  }

  getAvailableHeroes() {
    return HeroRoster.getAll().filter((h) => !this.takenHeroIds.has(h.id));
  }

  tryPickHero(heroId) {
    if (this.phase !== "pick") {
      return false;
    }
    if (this.takenHeroIds.has(heroId)) {
      return false;
    }

    const pickingPlayer =
      this.pickStep === 1 ? 1 : this.pickStep === 2 ? 2 : null;
    if (!pickingPlayer) {
      return false;
    }

    if (pickingPlayer === 1) {
      this.p1HeroId = heroId;
    } else {
      this.p2HeroId = heroId;
    }
    this.takenHeroIds.add(heroId);
    this.advancePick();
    return true;
  }

  advancePick() {
    if (this.pickStep === 1) {
      this.pickStep = 2;
      this.activePlayerId = 2;

      if (!this.isTwoPlayer()) {
        const available = this.getAvailableHeroes();
        const aiHero = this.trainingAi.pickHero(available);
        this.p2HeroId = aiHero.id;
        this.takenHeroIds.add(aiHero.id);
        this.beginBattle();
        return;
      }
      this.notifyPhase();
      return;
    }

    this.beginBattle();
  }

  beginBattle() {
    const r = this.getBallRadius();
    const cy = (this.arena.top + this.arena.bottom) / 2;
    const p1Template = HeroRoster.getById(this.p1HeroId);
    const p2Template = HeroRoster.getById(this.p2HeroId);

    this.fighters = [
      new HeroBallFighter(
        1,
        p1Template,
        this.arena.left + this.width * 0.25,
        cy,
        r
      ),
      new HeroBallFighter(
        2,
        p2Template,
        this.arena.right - this.width * 0.25,
        cy,
        r
      ),
    ];

    this.phase = "aim";
    this.activePlayerId = 1;
    this.notifyPhase();
  }

  getActiveFighter() {
    return this.fighters.find((f) => f.playerId === this.activePlayerId);
  }

  getOpponentFighter() {
    return this.fighters.find((f) => f.playerId !== this.activePlayerId);
  }

  handlePickInput() {
    if (!this.isTwoPlayer() && this.pickStep === 2) {
      return;
    }

    const keys = ["Digit1", "Digit2", "Digit3", "Digit4"];
    const heroes = HeroRoster.getAll();
    for (let i = 0; i < keys.length; i += 1) {
      if (this.input.wasPressed(keys[i])) {
        const hero = heroes[i];
        if (hero && !this.takenHeroIds.has(hero.id)) {
          this.tryPickHero(hero.id);
        }
      }
    }
  }

  handleAimInputP1() {
    if (this.input.isDown("ArrowLeft")) {
      this.getActiveFighter().rotateAim(-LittleBallHeroConstants.AIM_ROTATE_SPEED);
    }
    if (this.input.isDown("ArrowRight")) {
      this.getActiveFighter().rotateAim(LittleBallHeroConstants.AIM_ROTATE_SPEED);
    }
    if (this.input.isDown("ArrowUp")) {
      this.getActiveFighter().rotateAim(-LittleBallHeroConstants.AIM_ROTATE_SPEED);
    }
    if (this.input.isDown("ArrowDown")) {
      this.getActiveFighter().rotateAim(LittleBallHeroConstants.AIM_ROTATE_SPEED);
    }
    if (
      this.input.wasPressed("ControlLeft") ||
      this.input.wasPressed("ControlRight") ||
      this.input.wasPressed("Space")
    ) {
      this.launchActiveBall();
    }
  }

  handleAimInputP2() {
    if (this.input.isDown("KeyA")) {
      this.getActiveFighter().rotateAim(-LittleBallHeroConstants.AIM_ROTATE_SPEED);
    }
    if (this.input.isDown("KeyZ")) {
      this.getActiveFighter().rotateAim(LittleBallHeroConstants.AIM_ROTATE_SPEED);
    }
    if (this.input.isDown("KeyW")) {
      this.getActiveFighter().rotateAim(-LittleBallHeroConstants.AIM_ROTATE_SPEED * 0.7);
    }
    if (this.input.isDown("KeyS")) {
      this.getActiveFighter().rotateAim(LittleBallHeroConstants.AIM_ROTATE_SPEED * 0.7);
    }
    if (this.input.wasPressed("KeyY")) {
      this.launchActiveBall();
    }
  }

  launchActiveBall() {
    const fighter = this.getActiveFighter();
    if (!fighter || fighter.isMoving) {
      return;
    }
    fighter.launch();
    this.phase = "slide";
    this.notifyPhase();
  }

  runTrainingAiTurn() {
    const fighter = this.getActiveFighter();
    if (!fighter || fighter.playerId !== 2) {
      return;
    }
    const target = this.getOpponentFighter();
    if (target) {
      fighter.aimAngle = this.trainingAi.computeAimAngle(fighter, target);
    }
    fighter.launch();
    this.phase = "slide";
    this.notifyPhase();
  }

  updateSlide() {
    let anyMoving = false;

    for (const fighter of this.fighters) {
      BouncePhysics.updateBall(fighter, this.arena);
      if (fighter.isMoving && !fighter.isStopped()) {
        anyMoving = true;
      }
    }

    BouncePhysics.resolveBallCollision(this.fighters[0], this.fighters[1]);

    for (const fighter of this.fighters) {
      this.arena.clampBall(fighter);
      if (!fighter.isAlive()) {
        this.endGame(fighter.playerId === 1 ? 2 : 1);
        return;
      }
    }

    if (!anyMoving) {
      for (const fighter of this.fighters) {
        fighter.stop();
      }
      this.endTurn();
    }
  }

  endTurn() {
    const dead = this.fighters.find((f) => !f.isAlive());
    if (dead) {
      this.endGame(dead.playerId === 1 ? 2 : 1);
      return;
    }

    this.activePlayerId = this.activePlayerId === 1 ? 2 : 1;
    this.phase = "aim";
    this.notifyPhase();

    if (!this.isTwoPlayer() && this.activePlayerId === 2) {
      setTimeout(() => {
        if (this.state === "playing" && this.phase === "aim") {
          this.runTrainingAiTurn();
        }
      }, 600);
    }
  }

  endGame(winnerId) {
    this.state = "gameover";
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (typeof this.onGameOver === "function") {
      this.onGameOver(winnerId);
    }
  }

  update() {
    if (this.state !== "playing") {
      return;
    }

    if (this.phase === "pick") {
      this.handlePickInput();
    } else if (this.phase === "aim") {
      if (this.activePlayerId === 1) {
        this.handleAimInputP1();
      } else if (this.isTwoPlayer()) {
        this.handleAimInputP2();
      }
    } else if (this.phase === "slide") {
      this.updateSlide();
    }

    this.input.clearFrame();
  }

  drawPickScreen() {
    const heroes = HeroRoster.getAll();
    const pickerLabel =
      this.pickStep === 1
        ? "红队（玩家1）先选球"
        : "蓝队（玩家2）选球";

    this.ctx.fillStyle = "rgba(0,0,0,0.55)";
    this.ctx.fillRect(this.arena.left, this.arena.top, this.arena.right - this.arena.left, this.arena.bottom - this.arena.top);

    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#ffd43b";
    this.ctx.font = "bold 18px system-ui, sans-serif";
    this.ctx.fillText(pickerLabel, this.width / 2, this.arena.top + 36);

    this.ctx.fillStyle = "#ccc";
    this.ctx.font = "13px system-ui, sans-serif";
    this.ctx.fillText("按 1-4 选择英雄球（双人模式 P2 用 Y/A/Z 确认见提示）", this.width / 2, this.arena.top + 58);

    const startX = this.width / 2 - (heroes.length * 110) / 2;
    heroes.forEach((hero, i) => {
      const cx = startX + i * 110 + 55;
      const cy = this.height / 2;
      const taken = this.takenHeroIds.has(hero.id);

      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      this.ctx.fillStyle = taken ? "#444" : hero.color;
      this.ctx.globalAlpha = taken ? 0.35 : 1;
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
      this.ctx.strokeStyle = "#fff";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.fillStyle = "#fff";
      this.ctx.font = "12px system-ui, sans-serif";
      this.ctx.fillText(`${i + 1}. ${hero.name}`, cx, cy + 48);
      if (taken) {
        this.ctx.fillStyle = "#888";
        this.ctx.fillText("已选", cx, cy + 62);
      }
    });
    this.ctx.textAlign = "left";
  }

  drawBackground() {
    this.ctx.fillStyle = GameConstants.BACKGROUND_COLOR;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.arena.draw(this.ctx);

    const modeLabel =
      this.subMode === "training" ? "小球英雄 · 训练场" : "小球英雄 · 双人";
    this.ctx.fillStyle = "rgba(255, 212, 59, 0.3)";
    this.ctx.font = "14px system-ui, sans-serif";
    this.ctx.fillText(modeLabel, 12, 28);
  }

  draw() {
    this.drawBackground();

    if (this.phase === "pick") {
      this.drawPickScreen();
      return;
    }

    for (const fighter of this.fighters) {
      const isActive =
        this.phase === "aim" && fighter.playerId === this.activePlayerId;
      const showAim = this.phase === "aim";
      fighter.draw(this.ctx, isActive, showAim && !fighter.isMoving);
    }

    if (this.phase === "aim") {
      const label =
        this.activePlayerId === 1
          ? "红队回合：调整方向后 Ctrl/空格 发射"
          : "蓝队回合：调整方向后 Y 发射";
      this.ctx.fillStyle = "rgba(255, 212, 59, 0.9)";
      this.ctx.font = "13px system-ui, sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.fillText(label, this.width / 2, this.arena.bottom + 28);
      this.ctx.textAlign = "left";
    } else if (this.phase === "slide") {
      this.ctx.fillStyle = "#aaa";
      this.ctx.font = "13px system-ui, sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.fillText("小球飞行中，碰墙反弹…", this.width / 2, this.arena.bottom + 28);
      this.ctx.textAlign = "left";
    }
  }

  loop() {
    this.update();
    this.draw();

    if (this.state === "playing") {
      this.animationId = requestAnimationFrame(() => this.loop());
    }
  }

  getHealthPercent(playerId) {
    const fighter = this.fighters.find((f) => f.playerId === playerId);
    if (!fighter) {
      return 100;
    }
    return (fighter.health / fighter.maxHealth) * 100;
  }
}
