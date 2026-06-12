/**
 * 小球英雄模式 - 仅需选球（限时）；双球持续自动反弹，技能自动释放
 */

const LittleBallHeroConstants = {
  PICK_TIME_LIMIT_MS: 8000,
  MIN_BOUNCE_SPEED: 7,
  MAX_BOUNCE_SPEED: 11,
  WALL_BOUNCE: 0.98,
  BALL_BOUNCE: 0.92,
  SKILL_INTERVAL_MS: 1400,
  PROJECTILE_SPEED: 11,
  PROJECTILE_LIFETIME_MS: 900,
  PULSE_RANGE: 72,
  PULSE_DAMAGE: 14,
  BUMP_DAMAGE: 10,
  SUNGLASSES_OUTBOUND_DAMAGE: 14,
  SUNGLASSES_RETURN_DAMAGE: 11,
  SUNGLASSES_SPEED: 10,
  BOXING_MIN_RANGE_METERS: 1,
  BOXING_MAX_RANGE_METERS: 2,
  BOXING_METERS_TO_RADIUS_FACTOR: 4.5,
  BOXING_PUNCH_FLASH_MS: 280,
  SPIKE_REFLECT_FLASH_MS: 280,
  BLADE_MIN_RANGE_METERS: 0.8,
  BLADE_MAX_RANGE_METERS: 2.2,
  BLADE_METERS_TO_RADIUS_FACTOR: 4.5,
  BLADE_STACK_DAMAGE_PER_SEC: 10,
  BLADE_STACK_INTERVAL_MS: 1000,
  BLADE_SLASH_FLASH_MS: 320,
  FLAMETHROWER_PROC_CHANCE: 0.8,
  FLAMETHROWER_PROJECTILE_LIFETIME_MS: 750,
  FLAMETHROWER_BURST_FLASH_MS: 260,
  IRON_WALL_DAMAGE_REDUCTION: 0.9,
  IRON_WALL_CRIT_MULTIPLIER: 2.0,
  IRON_WALL_SHIELD_FLASH_MS: 300,
  IRON_WALL_CRIT_FLASH_MS: 320,
  AI_PICK_DELAY_MS: 500,
  PICK_GRID_COLUMNS: 4,
  PICK_TOP_PADDING: 72,
  TEACHER_START_NUMBER: 1,
  TEACHER_NUMBER_SPEED: 6.5,
  TEACHER_NUMBER_HOMING: 0.12,
  /** 橙算球：叠乘伤害上限，防止数值溢出 */
  ORANGE_CALC_MAX_DAMAGE: 99999,
  ORANGE_CALC_FLASH_MS: 280,
};

/**
 * 英雄技能类型
 */
class HeroSkillType {
  static SHOT = "shot";

  /** 喷火球专属：每次攻击 80% 概率造成喷火伤害 */
  static FLAMETHROWER = "flamethrower";

  static PULSE = "pulse";

  /** 铁壁丸专属：受击减伤 90%，攻击必定暴击 */
  static IRON_WALL = "iron_wall";

  static BUMP = "bump";

  /** 江西步牛仔球专属：双发左轮射击 */
  static REVOLVER = "revolver";

  /** 墨镜球专属：投出墨镜，命中后折返造成二次伤害 */
  static SUNGLASSES = "sunglasses";

  /** 拳击球专属：最近敌人在 1-2 米内时出拳 */
  static BOXING = "boxing";

  /** 数字老师球专属：头顶数字追踪敌人，命中后数字增长 */
  static NUMBER_TEACHER = "number_teacher";

  /** 尖刺球专属：受到攻击时反伤攻击者 */
  static SPIKE = "spike";

  /** 斷刀球专属：近距挥刀劈砍，远离敌人时每秒叠伤 */
  static BROKEN_BLADE = "broken_blade";

  /** 元素球专属：周期召唤四颗随机元素子弹 */
  static ELEMENT_BURST = "element_burst";

  /** 橙算球专属：每次攻击后，下次攻击伤害乘以上次攻击伤害 */
  static ORANGE_CALC = "orange_calc";

  /** 磁铁球专属：吸附敌方投射物为盾，触碰反弹或超时环射 */
  static MAGNET = "magnet";

  /** 防卫球专属：每局随机防具头，须先击破防具 */
  static DEFENSE = "defense";
}

/**
 * 可选英雄球模板
 */
class HeroBallTemplate {
  constructor(
    id,
    name,
    color,
    glow,
    maxHealth,
    moveSpeed,
    mass,
    skillType,
    skillDamage,
    skillIntervalMs,
    returnDamage
  ) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.glow = glow;
    this.maxHealth = maxHealth;
    this.moveSpeed = moveSpeed;
    this.mass = mass;
    this.skillType = skillType;
    this.skillDamage = skillDamage;
    this.skillIntervalMs =
      skillIntervalMs || LittleBallHeroConstants.SKILL_INTERVAL_MS;
    this.returnDamage = returnDamage || Math.round(skillDamage * 0.8);
  }
}

/**
 * 英雄球图鉴
 */
class HeroRoster {
  static getBaseHeroes() {
    return [
      new HeroBallTemplate(
        "flame",
        "喷火球",
        "#e94560",
        "#ff6b6b",
        BallHealthResolver.resolve(100),
        9,
        1.0,
        HeroSkillType.FLAMETHROWER,
        22
      ),
      new HeroBallTemplate(
        "wind",
        "疾风丸",
        "#51cf66",
        "#8ce99a",
        BallHealthResolver.resolve(85),
        10,
        0.85,
        HeroSkillType.BUMP,
        12
      ),
      new HeroBallTemplate(
        "iron",
        "铁壁丸",
        "#868e96",
        "#ced4da",
        BallHealthResolver.resolve(130),
        8,
        1.4,
        HeroSkillType.IRON_WALL,
        18
      ),
      new HeroBallTemplate(
        "bolt",
        "闪电丸",
        "#fcc419",
        "#ffe066",
        BallHealthResolver.resolve(95),
        9,
        1.0,
        HeroSkillType.SHOT,
        14
      ),
      new HeroBallTemplate(
        "jiangxi_cowboy",
        "江西步牛仔球",
        "#c68642",
        "#e9b872",
        BallHealthResolver.resolve(92),
        10,
        0.95,
        HeroSkillType.REVOLVER,
        12,
        1000
      ),
      new HeroBallTemplate(
        "sunglasses",
        "墨镜球",
        "#212529",
        "#495057",
        BallHealthResolver.resolve(88),
        9,
        0.9,
        HeroSkillType.SUNGLASSES,
        LittleBallHeroConstants.SUNGLASSES_OUTBOUND_DAMAGE,
        1300,
        LittleBallHeroConstants.SUNGLASSES_RETURN_DAMAGE
      ),
      new HeroBallTemplate(
        "boxing",
        "拳击球",
        "#e03131",
        "#ff8787",
        BallHealthResolver.resolve(96),
        9,
        1.1,
        HeroSkillType.BOXING,
        20,
        1100
      ),
      new HeroBallTemplate(
        "number_teacher",
        "数字老师球",
        "#4c6ef5",
        "#748ffc",
        BallHealthResolver.resolve(94),
        9,
        1.0,
        HeroSkillType.NUMBER_TEACHER,
        LittleBallHeroConstants.TEACHER_START_NUMBER,
        1200
      ),
      new HeroBallTemplate(
        "spike",
        "尖刺球",
        "#2f9e44",
        "#69db7c",
        BallHealthResolver.resolve(110),
        8,
        1.2,
        HeroSkillType.SPIKE,
        15,
        9999
      ),
      new HeroBallTemplate(
        "broken_blade",
        "斷刀球",
        "#9c36b5",
        "#cc5de8",
        BallHealthResolver.resolve(102),
        9,
        1.0,
        HeroSkillType.BROKEN_BLADE,
        20,
        800
      ),
      new HeroBallTemplate(
        "element",
        "元素球",
        "#9775fa",
        "#b197fc",
        BallHealthResolver.resolve(98),
        9,
        1.0,
        HeroSkillType.ELEMENT_BURST,
        12,
        2600
      ),
      new HeroBallTemplate(
        "orange_calc",
        "橙算球",
        "#ff922b",
        "#ffc078",
        BallHealthResolver.resolve(92),
        9,
        0.95,
        HeroSkillType.ORANGE_CALC,
        10,
        1500
      ),
      new HeroBallTemplate(
        "magnet",
        "磁铁球",
        "#495057",
        "#868e96",
        BallHealthResolver.resolve(98),
        8,
        1.15,
        HeroSkillType.MAGNET,
        14,
        2800
      ),
      new HeroBallTemplate(
        "defense",
        "防卫球",
        "#74b816",
        "#a9e34b",
        DefenseBallConstants.BODY_MAX_HEALTH,
        8,
        1.25,
        HeroSkillType.DEFENSE,
        DefenseBallConstants.STRIKE_DAMAGE,
        DefenseBallConstants.STRIKE_INTERVAL_MS
      ),
    ];
  }

  static getPurchasedHeroes() {
    if (typeof GameEconomyService === "undefined") {
      return [];
    }
    return GameEconomyService.getInstance().inventory.getPurchasedCustomBallTemplates();
  }

  static getAll() {
    return [...HeroRoster.getBaseHeroes(), ...HeroRoster.getPurchasedHeroes()];
  }

  static getById(id) {
    return HeroRoster.getAll().find((h) => h.id === id) || HeroRoster.getAll()[0];
  }

  static pickRandom(available) {
    const list = available.length > 0 ? available : HeroRoster.getAll();
    return list[Math.floor(Math.random() * list.length)];
  }
}

/**
 * 数字老师球追踪数字弹（伤害=数字值，命中后发射者数字+1）
 */
class TeacherNumberProjectile {
  constructor(x, y, numberValue, ownerId, target, ownerFighter) {
    this.x = x;
    this.y = y;
    this.numberValue = numberValue;
    this.ownerId = ownerId;
    this.target = target;
    this.ownerFighter = ownerFighter;
    this.alive = true;
    this.radius = 16;
    this.damage = numberValue;
  }

  update() {
    if (!this.target || !this.target.isAlive()) {
      this.alive = false;
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }

    const speed = LittleBallHeroConstants.TEACHER_NUMBER_SPEED;
    const homing = LittleBallHeroConstants.TEACHER_NUMBER_HOMING;
    const dirX = dx / dist;
    const dirY = dy / dist;
    this.x += dirX * speed + dirX * homing * dist * 0.05;
    this.y += dirY * speed + dirY * homing * dist * 0.05;
  }

  isOutOfBounds() {
    return false;
  }

  draw(ctx) {
    const text = String(this.numberValue);
    const fontSize = Math.min(22, 12 + Math.log10(this.numberValue + 1) * 5);

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 212, 59, 0.25)";
    ctx.fill();

    ctx.fillStyle = "#ffd43b";
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.strokeText(text, this.x, this.y);
    ctx.fillText(text, this.x, this.y);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}

/**
 * 选球界面网格布局（双行展示，避免末位球体被挤出画面）
 */
class HeroPickScreenLayout {
  static computeSlots(heroCount, arena) {
    const columns = LittleBallHeroConstants.PICK_GRID_COLUMNS;
    const rows = Math.ceil(heroCount / columns);
    const arenaWidth = arena.right - arena.left;
    const arenaHeight = arena.bottom - arena.top;
    const cellWidth = arenaWidth / columns;
    const cellHeight =
      (arenaHeight - LittleBallHeroConstants.PICK_TOP_PADDING) / rows;
    const ballRadius = Math.min(30, cellWidth * 0.22, cellHeight * 0.26);
    const slots = [];

    for (let index = 0; index < heroCount; index += 1) {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const rowStartIndex = row * columns;
      const itemsInRow = Math.min(columns, heroCount - rowStartIndex);
      const rowWidth = itemsInRow * cellWidth;
      const rowStartX = arena.left + (arenaWidth - rowWidth) / 2;

      slots.push({
        cx: rowStartX + col * cellWidth + cellWidth / 2,
        cy:
          arena.top +
          LittleBallHeroConstants.PICK_TOP_PADDING +
          row * cellHeight +
          cellHeight * 0.4,
        ballRadius,
      });
    }

    return slots;
  }
}

/**
 * 选球输入解析：支持角色名称或列表编号
 */
class HeroPickInputResolver {
  static TEAM_KEYWORDS = ["红队", "蓝队", "红", "蓝", "玩家1", "玩家2", "p1", "p2"];

  static resolve(fullHeroes, availableHeroes, rawInput, options) {
    const config = options || {};
    const text = String(rawInput || "").trim();
    if (!text) {
      return {
        hero: null,
        pickNumber: 0,
        message: "请输入角色名称或编号",
      };
    }

    if (HeroPickInputResolver.isTeamKeyword(text)) {
      return {
        hero: null,
        pickNumber: 0,
        message: "请直接输入角色名或列表编号，不要输入「红队/蓝队」",
      };
    }

    if (/^\d+$/.test(text)) {
      return HeroPickInputResolver.resolveByNumber(
        fullHeroes,
        availableHeroes,
        parseInt(text, 10),
        config
      );
    }

    return HeroPickInputResolver.resolveByName(
      fullHeroes,
      availableHeroes,
      text,
      config
    );
  }

  static isTeamKeyword(text) {
    const lowerText = text.toLowerCase();
    return HeroPickInputResolver.TEAM_KEYWORDS.some(
      (keyword) => keyword.toLowerCase() === lowerText
    );
  }

  static resolveByNumber(fullHeroes, availableHeroes, pickNumber, options) {
    const index = pickNumber - 1;
    if (index < 0 || index >= fullHeroes.length) {
      return {
        hero: null,
        pickNumber: 0,
        message: `编号需在 1-${fullHeroes.length} 之间`,
      };
    }

    const hero = fullHeroes[index];
    const isAvailable = availableHeroes.some((item) => item.id === hero.id);
    if (!isAvailable) {
      return {
        hero: null,
        pickNumber,
        message: HeroPickInputResolver.buildTakenMessage(hero.name, options),
      };
    }

    return { hero, pickNumber, message: "" };
  }

  static resolveByName(fullHeroes, availableHeroes, text, options) {
    const lowerText = text.toLowerCase();
    const matches = availableHeroes.filter((hero) => {
      const heroName = hero.name.toLowerCase();
      return heroName.includes(lowerText) || lowerText.includes(heroName);
    });

    if (matches.length === 0) {
      const takenHero = HeroPickInputResolver.findTakenHeroByName(
        fullHeroes,
        availableHeroes,
        lowerText
      );
      if (takenHero) {
        return {
          hero: null,
          pickNumber: 0,
          message: HeroPickInputResolver.buildTakenMessage(takenHero.name, options),
        };
      }
      return { hero: null, pickNumber: 0, message: "未找到匹配角色" };
    }
    if (matches.length > 1) {
      return {
        hero: null,
        pickNumber: 0,
        message: "匹配到多个角色，请输入更完整的名称",
      };
    }

    const hero = matches[0];
    const pickNumber = fullHeroes.findIndex((item) => item.id === hero.id) + 1;
    return { hero, pickNumber, message: "" };
  }

  static findTakenHeroByName(fullHeroes, availableHeroes, lowerText) {
    const takenHeroes = fullHeroes.filter(
      (hero) => !availableHeroes.some((item) => item.id === hero.id)
    );
    const matches = takenHeroes.filter((hero) =>
      hero.name.toLowerCase().includes(lowerText)
    );
    if (matches.length === 1) {
      return matches[0];
    }
    return null;
  }

  static buildTakenMessage(heroName, options) {
    const config = options || {};
    const ownerLabel = config.blockedByTeam || "对方";
    return `【${heroName}】已被${ownerLabel}选择，请换其他角色`;
  }

  static preview(fullHeroes, availableHeroes, rawInput, options) {
    const result = HeroPickInputResolver.resolve(
      fullHeroes,
      availableHeroes,
      rawInput,
      options
    );
    if (result.hero) {
      return `对弈编号：${result.pickNumber} · ${result.hero.name}`;
    }
    if (!String(rawInput || "").trim()) {
      if (options && options.emptyHint) {
        return options.emptyHint;
      }
      return "输入角色名或编号，下方显示对弈编号";
    }
    return result.message;
  }
}

/**
 * 选球界面英雄预览绘制（拳击球、老师球等一眼可辨）
 */
class HeroPickPreviewRenderer {
  static draw(ctx, hero, cx, cy, radius, taken) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
    ctx.fillStyle = taken ? "#333" : hero.glow;
    ctx.globalAlpha = taken ? 0.2 : 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = taken ? "#444" : hero.color;
    ctx.globalAlpha = taken ? 0.35 : 1;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = taken ? "#666" : "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (!taken) {
      HeroPickPreviewRenderer.drawTraitIcon(ctx, hero, cx, cy, radius);
    }
  }

  static drawTraitIcon(ctx, hero, cx, cy, radius) {
    if (hero.skillType === HeroSkillType.BOXING) {
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(10, radius * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("拳", cx, cy);
      return;
    }

    if (hero.skillType === HeroSkillType.NUMBER_TEACHER) {
      const badgeY = cy - radius - 6;
      ctx.fillStyle = "rgba(26, 26, 46, 0.9)";
      ctx.fillRect(cx - 14, badgeY - 10, 28, 20);
      ctx.fillStyle = "#ffd43b";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("1", cx, badgeY);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      return;
    }

    if (hero.skillType === HeroSkillType.SUNGLASSES) {
      const lensW = radius * 0.55;
      const lensH = radius * 0.38;
      ctx.fillStyle = "#111";
      ctx.strokeStyle = "#ffd43b";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx - lensW * 0.55, cy, lensW, lensH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx + lensW * 0.55, cy, lensW, lensH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      return;
    }

    if (hero.skillType === HeroSkillType.FLAMETHROWER) {
      ctx.fillStyle = "#ff922b";
      ctx.font = `bold ${Math.max(10, radius * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("火", cx, cy);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      return;
    }

    if (hero.skillType === HeroSkillType.IRON_WALL) {
      ctx.fillStyle = "#dee2e6";
      ctx.font = `bold ${Math.max(10, radius * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("壁", cx, cy);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      return;
    }

    if (hero.skillType === HeroSkillType.ELEMENT_BURST) {
      ctx.fillStyle = "#f3f0ff";
      ctx.font = `bold ${Math.max(10, radius * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("元", cx, cy);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      return;
    }

    if (hero.skillType === HeroSkillType.REVOLVER) {
      ctx.fillStyle = "#3d2914";
      ctx.font = `bold ${Math.max(9, radius * 0.4)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("牛仔", cx, cy);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      return;
    }

    if (hero.skillType === HeroSkillType.SPIKE) {
      ctx.strokeStyle = "#d8f5a2";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI * 2 * i) / 8;
        const innerR = radius * 0.55;
        const outerR = radius * 0.95;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
        ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
        ctx.stroke();
      }
      return;
    }

    if (hero.skillType === HeroSkillType.BROKEN_BLADE) {
      ctx.fillStyle = "#f3f0ff";
      ctx.font = `bold ${Math.max(10, radius * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("刀", cx, cy);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      return;
    }

    if (hero.skillType === HeroSkillType.MAGNET) {
      const headY = cy - radius - 4;
      ctx.fillStyle = "#8b0000";
      ctx.fillRect(cx - 10, headY - 6, 5, 12);
      ctx.fillRect(cx + 5, headY - 6, 5, 12);
      ctx.beginPath();
      ctx.arc(cx - 7, headY + 7, 5, 0, Math.PI, false);
      ctx.arc(cx + 7, headY + 7, 5, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();
      return;
    }

    if (hero.skillType === HeroSkillType.DEFENSE) {
      ctx.fillStyle = "#e8590c";
      ctx.fillRect(cx - 10, cy - radius - 8, 20, 10);
      ctx.strokeStyle = "#933300";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 10, cy - radius - 8, 20, 10);
      return;
    }
  }
}

/**
 * 斷刀球劈砍距离判定
 */
class BrokenBladeRangeHelper {
  static metersToPixels(meters, ballRadius) {
    return (
      meters * ballRadius * LittleBallHeroConstants.BLADE_METERS_TO_RADIUS_FACTOR
    );
  }

  static getSlashRangePixels(ballRadius) {
    return {
      min: BrokenBladeRangeHelper.metersToPixels(
        LittleBallHeroConstants.BLADE_MIN_RANGE_METERS,
        ballRadius
      ),
      max: BrokenBladeRangeHelper.metersToPixels(
        LittleBallHeroConstants.BLADE_MAX_RANGE_METERS,
        ballRadius
      ),
    };
  }

  /**
   * 最近敌人是否在斷刀劈砍范围内
   */
  static isEnemyInSlashRange(fighter, opponent) {
    if (!opponent || !opponent.isAlive()) {
      return false;
    }
    const dist = Math.hypot(opponent.x - fighter.x, opponent.y - fighter.y);
    const range = BrokenBladeRangeHelper.getSlashRangePixels(fighter.radius);
    return dist >= range.min && dist <= range.max;
  }
}

/**
 * 斷刀球技能：范围内劈砍，范围外每秒叠伤
 */
class BrokenBladeSkillSystem {
  static isBladeFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.BROKEN_BLADE;
  }

  static tick(fighter, opponent, now) {
    if (!BrokenBladeSkillSystem.isBladeFighter(fighter)) {
      return;
    }
    if (!opponent || !opponent.isAlive()) {
      return;
    }

    if (BrokenBladeRangeHelper.isEnemyInSlashRange(fighter, opponent)) {
      if (fighter.canUseSkill(now)) {
        fighter.markSkillUsed(now);
        HeroAutoSkillSystem.fireBladeSlash(fighter, opponent, fighter.bladeDamage);
      }
      return;
    }

    if (now - fighter.lastBladeStackTime < LittleBallHeroConstants.BLADE_STACK_INTERVAL_MS) {
      return;
    }

    fighter.bladeDamage += LittleBallHeroConstants.BLADE_STACK_DAMAGE_PER_SEC;
    fighter.lastBladeStackTime = now;
  }
}

/**
 * 铁壁丸技能：受击减免 90% 伤害，出击必定暴击
 */
class IronWallSkillSystem {
  static isIronWallFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.IRON_WALL;
  }

  static applyDamageReduction(amount) {
    const ratio = 1 - LittleBallHeroConstants.IRON_WALL_DAMAGE_REDUCTION;
    return Math.max(1, Math.ceil(amount * ratio));
  }

  static applyCriticalDamage(baseDamage) {
    return Math.round(
      baseDamage * LittleBallHeroConstants.IRON_WALL_CRIT_MULTIPLIER
    );
  }

  static markShieldHit(fighter) {
    fighter.ironShieldFlashUntil =
      Date.now() + LittleBallHeroConstants.IRON_WALL_SHIELD_FLASH_MS;
  }

  static markCriticalStrike(fighter, opponent) {
    fighter.ironCritFlashUntil =
      Date.now() + LittleBallHeroConstants.IRON_WALL_CRIT_FLASH_MS;
    if (opponent) {
      opponent.ironCritHitFlashUntil =
        Date.now() + LittleBallHeroConstants.IRON_WALL_CRIT_FLASH_MS;
    }
  }
}

/**
 * 橙算球技能：每次攻击后，下次攻击伤害 = 基础伤害 × 上次攻击伤害
 */
class OrangeCalcSkillSystem {
  static initFighter(fighter) {
    fighter.orangeCalcLastDamage = 0;
    fighter.orangeCalcFlashUntil = 0;
  }

  static isOrangeCalcFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.ORANGE_CALC;
  }

  static computeAttackDamage(fighter, baseDamage) {
    const lastDamage = fighter.orangeCalcLastDamage || 0;
    if (lastDamage <= 0) {
      return baseDamage;
    }

    const multiplied = baseDamage * lastDamage;
    return Math.min(
      multiplied,
      LittleBallHeroConstants.ORANGE_CALC_MAX_DAMAGE
    );
  }

  static recordAttackDamage(fighter, attackDamage) {
    fighter.orangeCalcLastDamage = attackDamage;
    fighter.orangeCalcFlashUntil =
      Date.now() + LittleBallHeroConstants.ORANGE_CALC_FLASH_MS;
  }

  static getNextDamagePreview(fighter, baseDamage) {
    return OrangeCalcSkillSystem.computeAttackDamage(fighter, baseDamage);
  }

  static drawEffect(ctx, fighter) {
    const preview = OrangeCalcSkillSystem.getNextDamagePreview(
      fighter,
      fighter.template.skillDamage
    );
    const badgeY = fighter.y - fighter.radius - 16;
    ctx.fillStyle = "rgba(26, 26, 46, 0.85)";
    ctx.fillRect(fighter.x - 22, badgeY - 10, 44, 20);
    ctx.fillStyle = "#ffc078";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`×${preview}`, fighter.x, badgeY);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    if (Date.now() < fighter.orangeCalcFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 11, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 146, 43, 0.75)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}

/**
 * 尖刺球反伤系统（受击时对攻击者造成伤害）
 */
class SpikeReflectSystem {
  static isSpikeFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.SPIKE;
  }

  static getReflectDamage(fighter) {
    return fighter.template.skillDamage;
  }

  static tryReflect(defender, attacker, skipReflect) {
    if (skipReflect || !SpikeReflectSystem.isSpikeFighter(defender)) {
      return;
    }
    if (!attacker || !attacker.isAlive() || attacker === defender) {
      return;
    }

    const reflectDamage = SpikeReflectSystem.getReflectDamage(defender);
    attacker.takeDamage(reflectDamage, null, true);
    defender.spikeFlashUntil = Date.now() + LittleBallHeroConstants.SPIKE_REFLECT_FLASH_MS;
  }
}

/**
 * 喷火球火焰弹（80% 概率触发时发射）
 */
class FlamethrowerProjectile {
  constructor(x, y, dirX, dirY, radius, ownerId, damage) {
    this.x = x;
    this.y = y;
    this.dirX = dirX;
    this.dirY = dirY;
    this.radius = radius;
    this.ownerId = ownerId;
    this.damage = damage;
    this.alive = true;
    this.spawnTime = Date.now();
  }

  update() {
    const speed = LittleBallHeroConstants.PROJECTILE_SPEED * 1.15;
    this.x += this.dirX * speed;
    this.y += this.dirY * speed;
    if (
      Date.now() - this.spawnTime >
      LittleBallHeroConstants.FLAMETHROWER_PROJECTILE_LIFETIME_MS
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
    ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 107, 53, 0.35)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
      this.x,
      this.y,
      this.radius * 0.2,
      this.x,
      this.y,
      this.radius
    );
    gradient.addColorStop(0, "#fff3bf");
    gradient.addColorStop(0.45, "#ff922b");
    gradient.addColorStop(1, "#e03131");
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = "#ffd43b";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * 技能投射物
 */
class HeroSkillProjectile {
  constructor(x, y, dirX, dirY, radius, ownerId, color, damage) {
    this.x = x;
    this.y = y;
    this.dirX = dirX;
    this.dirY = dirY;
    this.radius = radius;
    this.ownerId = ownerId;
    this.color = color;
    this.damage = damage;
    this.alive = true;
    this.spawnTime = Date.now();
  }

  update() {
    this.x += this.dirX * LittleBallHeroConstants.PROJECTILE_SPEED;
    this.y += this.dirY * LittleBallHeroConstants.PROJECTILE_SPEED;
    if (Date.now() - this.spawnTime > LittleBallHeroConstants.PROJECTILE_LIFETIME_MS) {
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
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * 墨镜球投出的回旋墨镜（命中后折返，二次伤害）
 */
class SunglassesProjectile {
  constructor(
    x,
    y,
    dirX,
    dirY,
    radius,
    ownerId,
    outboundDamage,
    returnDamage
  ) {
    this.x = x;
    this.y = y;
    this.dirX = dirX;
    this.dirY = dirY;
    this.radius = radius;
    this.ownerId = ownerId;
    this.outboundDamage = outboundDamage;
    this.returnDamage = returnDamage;
    this.alive = true;
    this.spawnTime = Date.now();
    this.isReturning = false;
    this.hasHitEnemy = false;
    this.hitEnemyId = null;
  }

  update(ownerFighter) {
    if (this.isReturning && ownerFighter && ownerFighter.isAlive()) {
      const dx = ownerFighter.x - this.x;
      const dy = ownerFighter.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.001) {
        this.dirX = dx / dist;
        this.dirY = dy / dist;
      }
      if (dist < ownerFighter.radius + this.radius + 4) {
        this.alive = false;
        return;
      }
    }

    const speed = LittleBallHeroConstants.SUNGLASSES_SPEED;
    this.x += this.dirX * speed;
    this.y += this.dirY * speed;

    if (Date.now() - this.spawnTime > LittleBallHeroConstants.PROJECTILE_LIFETIME_MS * 2) {
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

  beginReturn() {
    this.isReturning = true;
  }

  /**
   * @returns {boolean} 是否应从场上移除
   */
  handleEnemyHit(fighter, ownerFighter) {
    if (fighter.playerId === this.ownerId || !fighter.isAlive()) {
      return false;
    }

    if (!this.hasHitEnemy) {
      fighter.takeDamage(this.outboundDamage, ownerFighter);
      this.hasHitEnemy = true;
      this.hitEnemyId = fighter.playerId;
      this.beginReturn();
      return false;
    }

    if (this.isReturning && fighter.playerId === this.hitEnemyId) {
      fighter.takeDamage(this.returnDamage, ownerFighter);
      this.alive = false;
      return true;
    }

    return false;
  }

  draw(ctx) {
    const lensW = this.radius * 1.1;
    const lensH = this.radius * 0.75;
    const gap = this.radius * 0.35;
    const angle = Math.atan2(this.dirY, this.dirX);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);

    ctx.fillStyle = "#111";
    ctx.strokeStyle = this.isReturning ? "#74c0fc" : "#ffd43b";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(-gap, 0, lensW, lensH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(gap, 0, lensW, lensH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-gap + lensW * 0.3, 0);
    ctx.lineTo(gap - lensW * 0.3, 0);
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * 拳击球攻击距离（1-2 米，按球半径换算像素）
 */
class BoxingRangeHelper {
  static metersToPixels(meters, ballRadius) {
    return meters * ballRadius * LittleBallHeroConstants.BOXING_METERS_TO_RADIUS_FACTOR;
  }

  static getRangePixels(ballRadius) {
    return {
      min: BoxingRangeHelper.metersToPixels(
        LittleBallHeroConstants.BOXING_MIN_RANGE_METERS,
        ballRadius
      ),
      max: BoxingRangeHelper.metersToPixels(
        LittleBallHeroConstants.BOXING_MAX_RANGE_METERS,
        ballRadius
      ),
    };
  }

  /**
   * 最近敌人是否在拳击有效距离内（1-2 米）
   */
  static isClosestEnemyInRange(fighter, opponent) {
    if (!opponent || !opponent.isAlive()) {
      return false;
    }
    const dist = Math.hypot(opponent.x - fighter.x, opponent.y - fighter.y);
    const range = BoxingRangeHelper.getRangePixels(fighter.radius);
    return dist >= range.min && dist <= range.max;
  }
}

/**
 * 场上战斗用英雄球（自动反弹 + 自动技能）
 */
class HeroBallFighter {
  constructor(playerId, template, x, y, radius, dirX, dirY) {
    this.playerId = playerId;
    this.template = template;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.health = template.maxHealth;
    this.vx = dirX * template.moveSpeed;
    this.vy = dirY * template.moveSpeed;
    this.lastSkillTime = Date.now() - Math.random() * LittleBallHeroConstants.SKILL_INTERVAL_MS;
    this.pulseFlashUntil = 0;
    this.punchFlashUntil = 0;
    this.punchAngle = 0;
    this.spikeFlashUntil = 0;
    this.bladeSlashFlashUntil = 0;
    this.bladeSlashAngle = 0;
    this.lastBladeStackTime = Date.now();
    this.flameBurstUntil = 0;
    this.flameFizzleUntil = 0;
    this.ironShieldFlashUntil = 0;
    this.ironCritFlashUntil = 0;
    this.ironCritHitFlashUntil = 0;
    this.bladeDamage =
      template.skillType === HeroSkillType.BROKEN_BLADE
        ? template.skillDamage
        : 0;
    this.attackNumber =
      template.skillType === HeroSkillType.NUMBER_TEACHER
        ? LittleBallHeroConstants.TEACHER_START_NUMBER
        : 0;

    if (OrangeCalcSkillSystem.isOrangeCalcFighter(this)) {
      OrangeCalcSkillSystem.initFighter(this);
    }

    if (MagnetSkillSystem.isMagnetFighter(this)) {
      MagnetSkillSystem.initFighter(this);
    }

    if (DefenseBallSkillSystem.isDefenseFighter(this)) {
      DefenseBallSkillSystem.initFighter(this);
    }

    this.defenseRestrictUntil = 0;
    this.defenseRestrictSpeedRatio = 1;

    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.initFighter(this);
    }
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

  getSpeed() {
    return Math.hypot(this.vx, this.vy);
  }

  getMoveAngle() {
    const speed = this.getSpeed();
    if (speed < 0.001) {
      return this.playerId === 1 ? 0 : Math.PI;
    }
    return Math.atan2(this.vy, this.vx);
  }

  takeDamage(amount, attacker, skipReflect) {
    if (DefenseBallSkillSystem.isDefenseFighter(this)) {
      DefenseBallSkillSystem.takeDamage(this, amount, attacker, skipReflect);
      return;
    }

    let finalAmount = amount;
    if (IronWallSkillSystem.isIronWallFighter(this)) {
      finalAmount = IronWallSkillSystem.applyDamageReduction(amount);
      IronWallSkillSystem.markShieldHit(this);
    }
    this.health = Math.max(0, this.health - finalAmount);
    SpikeReflectSystem.tryReflect(this, attacker, skipReflect);
  }

  isAlive() {
    return this.health > 0;
  }

  canUseSkill(now) {
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isSkillBlocked(this)
    ) {
      return false;
    }
    const interval = this.template.skillIntervalMs;
    return now - this.lastSkillTime >= interval;
  }

  markSkillUsed(now) {
    this.lastSkillTime = now;
  }

  draw(ctx) {
    let drawColor = this.color;
    let drawGlow = this.glow;
    let decorationText = this.template.decoration || "";

    if (typeof GameEconomyService !== "undefined" && !this.template.isShopItem) {
      const inventory = GameEconomyService.getInstance().inventory;
      const colors = ShopCosmeticRenderer.resolveColors(this.template, inventory);
      drawColor = colors.color;
      drawGlow = colors.glow;
      decorationText = ShopCosmeticRenderer.resolveDecoration(
        this.template,
        inventory
      );
    }

    if (Date.now() < this.pulseFlashUntil) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, LittleBallHeroConstants.PULSE_RANGE, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 212, 59, 0.55)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
    ctx.fillStyle = drawGlow;
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = drawColor;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();

    BallMaxHealthLabelRenderer.drawAboveHead(
      ctx,
      this.x,
      this.y,
      this.radius,
      this.maxHealth,
      { offsetY: 16, textColor: drawColor }
    );

    ctx.fillStyle = "#fff";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.template.name, this.x, this.y + this.radius + 14);

    if (decorationText) {
      ShopCosmeticRenderer.drawEquippedAccessory(
        ctx,
        this.x,
        this.y,
        this.radius,
        decorationText
      );
    }

    if (this.template.id === "jiangxi_cowboy") {
      ctx.fillStyle = "#3d2914";
      ctx.font = "bold 8px system-ui, sans-serif";
      ctx.fillText("牛仔", this.x, this.y - this.radius - 6);
    }

    if (this.template.id === "sunglasses") {
      ctx.fillStyle = "#111";
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.fillText("墨镜", this.x, this.y - this.radius - 6);
    }

    if (this.template.skillType === HeroSkillType.NUMBER_TEACHER) {
      this.drawTeacherNumberBadge(ctx);
    }

    if (this.template.skillType === HeroSkillType.BOXING) {
      this.drawBoxingRange(ctx);
      this.drawBoxingPunch(ctx);
    }

    if (this.template.skillType === HeroSkillType.SPIKE) {
      this.drawSpikeRing(ctx);
    }

    if (this.template.skillType === HeroSkillType.BROKEN_BLADE) {
      this.drawBladeRange(ctx);
      this.drawBladeDamageBadge(ctx);
      this.drawBladeSlash(ctx);
    }

    if (this.template.skillType === HeroSkillType.FLAMETHROWER) {
      this.drawFlamethrowerEffect(ctx);
    }

    if (this.template.skillType === HeroSkillType.IRON_WALL) {
      this.drawIronWallEffect(ctx);
    }

    if (this.template.skillType === HeroSkillType.ELEMENT_BURST) {
      ElementBurstSystem.drawBurstFlash(ctx, this);
    }

    if (this.template.skillType === HeroSkillType.ORANGE_CALC) {
      OrangeCalcSkillSystem.drawEffect(ctx, this);
    }

    if (this.template.skillType === HeroSkillType.MAGNET) {
      MagnetSkillSystem.drawHeadMagnet(ctx, this);
      MagnetSkillSystem.drawShields(ctx, this);
    }

    if (this.template.skillType === HeroSkillType.DEFENSE) {
      DefenseBallSkillSystem.drawDefenseHead(ctx, this);
    }

    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.drawStatus(ctx, this);
    }

    if (Date.now() < this.ironCritHitFlashUntil) {
      ctx.fillStyle = "#ffd43b";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("暴击!", this.x, this.y - this.radius - 20);
      ctx.textAlign = "left";
    }

    if (Date.now() < this.spikeFlashUntil) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(105, 219, 124, 0.75)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.textAlign = "left";
  }

  drawSpikeRing(ctx) {
    ctx.strokeStyle = "#d8f5a2";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (let i = 0; i < 10; i += 1) {
      const angle = (Math.PI * 2 * i) / 10;
      const innerR = this.radius * 0.72;
      const outerR = this.radius + 4;
      ctx.beginPath();
      ctx.moveTo(
        this.x + Math.cos(angle) * innerR,
        this.y + Math.sin(angle) * innerR
      );
      ctx.lineTo(
        this.x + Math.cos(angle) * outerR,
        this.y + Math.sin(angle) * outerR
      );
      ctx.stroke();
    }
  }

  drawBladeRange(ctx) {
    const range = BrokenBladeRangeHelper.getSlashRangePixels(this.radius);
    ctx.beginPath();
    ctx.arc(this.x, this.y, range.min, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(204, 93, 232, 0.2)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.x, this.y, range.max, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(204, 93, 232, 0.4)";
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawBladeDamageBadge(ctx) {
    const text = String(this.bladeDamage);
    const badgeY = this.y - this.radius - 16;
    ctx.fillStyle = "rgba(26, 26, 46, 0.85)";
    ctx.fillRect(this.x - 18, badgeY - 10, 36, 20);
    ctx.fillStyle = "#e599f7";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, this.x, badgeY);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  drawIronWallEffect(ctx) {
    if (Date.now() < this.ironShieldFlashUntil) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(206, 212, 218, 0.85)";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    if (Date.now() < this.ironCritFlashUntil) {
      ctx.fillStyle = "#ffd43b";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("暴击", this.x, this.y + this.radius + 26);
      ctx.textAlign = "left";
    }
  }

  drawFlamethrowerEffect(ctx) {
    if (Date.now() < this.flameBurstUntil) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 12, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 146, 43, 0.35)";
      ctx.fill();
    }
    if (Date.now() < this.flameFizzleUntil) {
      ctx.fillStyle = "rgba(173, 181, 189, 0.7)";
      ctx.font = "9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("未触发", this.x, this.y - this.radius - 8);
      ctx.textAlign = "left";
    }
  }

  drawBladeSlash(ctx) {
    if (Date.now() >= this.bladeSlashFlashUntil) {
      return;
    }

    const reach = this.radius + 36;
    const arcSpan = Math.PI * 0.55;
    const startAngle = this.bladeSlashAngle - arcSpan / 2;
    const endAngle = this.bladeSlashAngle + arcSpan / 2;

    ctx.strokeStyle = "#f3f0ff";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(this.x, this.y, reach, startAngle, endAngle);
    ctx.stroke();

    ctx.strokeStyle = "#cc5de8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(
      this.x + Math.cos(this.bladeSlashAngle) * this.radius,
      this.y + Math.sin(this.bladeSlashAngle) * this.radius
    );
    ctx.lineTo(
      this.x + Math.cos(this.bladeSlashAngle) * reach,
      this.y + Math.sin(this.bladeSlashAngle) * reach
    );
    ctx.stroke();
  }

  drawTeacherNumberBadge(ctx) {
    const text = String(this.attackNumber);
    const badgeY = this.y - this.radius - 14;
    const fontSize = Math.min(16, 11 + Math.log10(this.attackNumber + 1) * 4);

    ctx.fillStyle = "rgba(26, 26, 46, 0.85)";
    ctx.fillRect(this.x - 16, badgeY - 10, 32, 20);
    ctx.fillStyle = "#ffd43b";
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, this.x, badgeY);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  drawBoxingRange(ctx) {
    const range = BoxingRangeHelper.getRangePixels(this.radius);
    ctx.beginPath();
    ctx.arc(this.x, this.y, range.min, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 135, 135, 0.2)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.x, this.y, range.max, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 135, 135, 0.35)";
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawBoxingPunch(ctx) {
    if (Date.now() >= this.punchFlashUntil) {
      return;
    }
    const reach = this.radius + 28;
    const px = this.x + Math.cos(this.punchAngle) * reach;
    const py = this.y + Math.sin(this.punchAngle) * reach;

    ctx.strokeStyle = "#ff6b6b";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(
      this.x + Math.cos(this.punchAngle) * this.radius,
      this.y + Math.sin(this.punchAngle) * this.radius
    );
    ctx.lineTo(px, py);
    ctx.stroke();

    ctx.fillStyle = "#fa5252";
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * 持续反弹物理（球体永不停止，保持最低速度）
 */
class ContinuousBouncePhysics {
  static maintainSpeed(ball) {
    const speed = ball.getSpeed();
    const minSpeed = LittleBallHeroConstants.MIN_BOUNCE_SPEED;
    const maxSpeed = LittleBallHeroConstants.MAX_BOUNCE_SPEED;
    const angle = ball.getMoveAngle();

    if (speed < minSpeed) {
      ball.vx = Math.cos(angle) * minSpeed;
      ball.vy = Math.sin(angle) * minSpeed;
    } else if (speed > maxSpeed) {
      ball.vx = (ball.vx / speed) * maxSpeed;
      ball.vy = (ball.vy / speed) * maxSpeed;
    }
  }

  static updateBall(ball, arena) {
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

    ContinuousBouncePhysics.maintainSpeed(ball);
  }

  static resolveBallCollision(a, b, applyBumpDamage = true) {
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
    if (impact <= 0) {
      return;
    }

    const restitution = LittleBallHeroConstants.BALL_BOUNCE;
    const impulse = (2 * impact * restitution) / totalMass;
    a.vx -= impulse * b.mass * nx;
    a.vy -= impulse * b.mass * ny;
    b.vx += impulse * a.mass * nx;
    b.vy += impulse * a.mass * ny;

    if (applyBumpDamage) {
      const touchDamage = LittleBallHeroConstants.BUMP_DAMAGE;
      a.takeDamage(touchDamage, b);
      b.takeDamage(touchDamage, a);
    }

    ContinuousBouncePhysics.maintainSpeed(a);
    ContinuousBouncePhysics.maintainSpeed(b);
  }
}

/**
 * 自动技能系统
 */
class HeroAutoSkillSystem {
  static tryUseSkill(fighter, opponent, projectiles, projectileRadius) {
    const now = Date.now();
    if (!fighter.canUseSkill(now) || !opponent || !opponent.isAlive()) {
      return;
    }

    const template = fighter.template;

    if (template.skillType === HeroSkillType.SPIKE) {
      return;
    }

    if (template.skillType === HeroSkillType.BOXING) {
      if (BoxingRangeHelper.isClosestEnemyInRange(fighter, opponent)) {
        fighter.markSkillUsed(now);
        HeroAutoSkillSystem.fireBoxingPunch(fighter, opponent, template.skillDamage);
      }
      return;
    }

    if (template.skillType === HeroSkillType.BROKEN_BLADE) {
      BrokenBladeSkillSystem.tick(fighter, opponent, now);
      return;
    }

    if (template.skillType === HeroSkillType.NUMBER_TEACHER) {
      fighter.markSkillUsed(now);
      HeroAutoSkillSystem.fireTeacherNumber(fighter, opponent, projectiles);
      return;
    }

    if (template.skillType === HeroSkillType.FLAMETHROWER) {
      fighter.markSkillUsed(now);
      HeroAutoSkillSystem.fireFlamethrower(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        template.skillDamage
      );
      return;
    }

    if (template.skillType === HeroSkillType.IRON_WALL) {
      fighter.markSkillUsed(now);
      HeroAutoSkillSystem.fireIronWallStrike(fighter, opponent, template.skillDamage);
      return;
    }

    if (template.skillType === HeroSkillType.ELEMENT_BURST) {
      fighter.markSkillUsed(now);
      ElementBurstSystem.summonOrbitBullets(fighter, template.skillDamage);
      return;
    }

    if (template.skillType === HeroSkillType.ORANGE_CALC) {
      fighter.markSkillUsed(now);
      HeroAutoSkillSystem.fireOrangeCalc(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        template.skillDamage
      );
      return;
    }

    if (template.skillType === HeroSkillType.MAGNET) {
      if (!MagnetSkillSystem.canActivate(fighter, now)) {
        return;
      }
      fighter.markSkillUsed(now);
      MagnetSkillSystem.activate(fighter, opponent, now);
      return;
    }

    if (template.skillType === HeroSkillType.DEFENSE) {
      fighter.markSkillUsed(now);
      DefenseBallSkillSystem.fireDefenseStrike(
        fighter,
        opponent,
        projectiles,
        projectileRadius
      );
      return;
    }

    fighter.markSkillUsed(now);

    if (template.skillType === HeroSkillType.SHOT) {
      HeroAutoSkillSystem.fireShot(fighter, opponent, projectiles, projectileRadius, template.skillDamage);
      return;
    }

    if (template.skillType === HeroSkillType.PULSE) {
      HeroAutoSkillSystem.firePulse(fighter, opponent, template.skillDamage);
      return;
    }

    if (template.skillType === HeroSkillType.BUMP) {
      HeroAutoSkillSystem.fireBump(fighter, opponent, template.skillDamage);
      return;
    }

    if (template.skillType === HeroSkillType.REVOLVER) {
      HeroAutoSkillSystem.fireRevolver(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        template.skillDamage
      );
      return;
    }

    if (template.skillType === HeroSkillType.SUNGLASSES) {
      HeroAutoSkillSystem.fireSunglasses(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        template.skillDamage,
        template.returnDamage
      );
    }
  }

  static fireIronWallStrike(fighter, opponent, damage) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }

    const critDamage = IronWallSkillSystem.applyCriticalDamage(damage);
    if (dist <= LittleBallHeroConstants.PULSE_RANGE + opponent.radius) {
      opponent.takeDamage(critDamage, fighter);
      IronWallSkillSystem.markCriticalStrike(fighter, opponent);

      const nx = dx / dist;
      const ny = dy / dist;
      opponent.vx += nx * 2;
      opponent.vy += ny * 2;
      fighter.vx -= nx * 1;
      fighter.vy -= ny * 1;
      ContinuousBouncePhysics.maintainSpeed(fighter);
      ContinuousBouncePhysics.maintainSpeed(opponent);
    }
  }

  static fireFlamethrower(fighter, opponent, projectiles, radius, damage) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }

    if (Math.random() >= LittleBallHeroConstants.FLAMETHROWER_PROC_CHANCE) {
      fighter.flameFizzleUntil =
        Date.now() + LittleBallHeroConstants.FLAMETHROWER_BURST_FLASH_MS;
      return;
    }

    const dirX = dx / dist;
    const dirY = dy / dist;
    const offset = fighter.radius + radius + 4;
    fighter.flameBurstUntil =
      Date.now() + LittleBallHeroConstants.FLAMETHROWER_BURST_FLASH_MS;

    projectiles.push(
      new FlamethrowerProjectile(
        fighter.x + dirX * offset,
        fighter.y + dirY * offset,
        dirX,
        dirY,
        radius * 1.15,
        fighter.playerId,
        damage
      )
    );
  }

  static fireTeacherNumber(fighter, opponent, projectiles) {
    if (!opponent || !opponent.isAlive()) {
      return;
    }

    const numberValue = fighter.attackNumber || LittleBallHeroConstants.TEACHER_START_NUMBER;
    projectiles.push(
      new TeacherNumberProjectile(
        fighter.x,
        fighter.y - fighter.radius - 6,
        numberValue,
        fighter.playerId,
        opponent,
        fighter
      )
    );
  }

  static fireBladeSlash(fighter, opponent, damage) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }
    const nx = dx / dist;
    const ny = dy / dist;

    fighter.bladeSlashAngle = Math.atan2(dy, dx);
    fighter.bladeSlashFlashUntil =
      Date.now() + LittleBallHeroConstants.BLADE_SLASH_FLASH_MS;
    opponent.takeDamage(damage, fighter);

    opponent.vx += nx * 2.5;
    opponent.vy += ny * 2.5;
    fighter.vx -= nx * 1.0;
    fighter.vy -= ny * 1.0;
    ContinuousBouncePhysics.maintainSpeed(fighter);
    ContinuousBouncePhysics.maintainSpeed(opponent);
  }

  static fireBoxingPunch(fighter, opponent, damage) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }
    const nx = dx / dist;
    const ny = dy / dist;

    fighter.punchAngle = Math.atan2(dy, dx);
    fighter.punchFlashUntil =
      Date.now() + LittleBallHeroConstants.BOXING_PUNCH_FLASH_MS;
    opponent.takeDamage(damage, fighter);

    opponent.vx += nx * 2;
    opponent.vy += ny * 2;
    fighter.vx -= nx * 0.8;
    fighter.vy -= ny * 0.8;
    ContinuousBouncePhysics.maintainSpeed(fighter);
    ContinuousBouncePhysics.maintainSpeed(opponent);
  }

  static fireSunglasses(
    fighter,
    opponent,
    projectiles,
    radius,
    outboundDamage,
    returnDamage
  ) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }
    const dirX = dx / dist;
    const dirY = dy / dist;
    const offset = fighter.radius + radius + 6;
    projectiles.push(
      new SunglassesProjectile(
        fighter.x + dirX * offset,
        fighter.y + dirY * offset,
        dirX,
        dirY,
        radius * 1.4,
        fighter.playerId,
        outboundDamage,
        returnDamage
      )
    );
  }

  static fireRevolver(fighter, opponent, projectiles, radius, damage) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }
    const baseAngle = Math.atan2(dy, dx);
    const spread = 0.18;
    const angles = [baseAngle - spread, baseAngle + spread];
    const offset = fighter.radius + radius + 4;

    for (const angle of angles) {
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      projectiles.push(
        new HeroSkillProjectile(
          fighter.x + dirX * offset,
          fighter.y + dirY * offset,
          dirX,
          dirY,
          radius,
          fighter.playerId,
          "#ffd43b",
          damage
        )
      );
    }
  }

  static fireOrangeCalc(fighter, opponent, projectiles, radius, baseDamage) {
    const attackDamage = OrangeCalcSkillSystem.computeAttackDamage(
      fighter,
      baseDamage
    );
    OrangeCalcSkillSystem.recordAttackDamage(fighter, attackDamage);

    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }
    const dirX = dx / dist;
    const dirY = dy / dist;
    const offset = fighter.radius + radius + 4;
    projectiles.push(
      new HeroSkillProjectile(
        fighter.x + dirX * offset,
        fighter.y + dirY * offset,
        dirX,
        dirY,
        radius,
        fighter.playerId,
        "#ffc078",
        attackDamage
      )
    );
  }

  static fireShot(fighter, opponent, projectiles, radius, damage) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }
    const dirX = dx / dist;
    const dirY = dy / dist;
    const offset = fighter.radius + radius + 4;
    projectiles.push(
      new HeroSkillProjectile(
        fighter.x + dirX * offset,
        fighter.y + dirY * offset,
        dirX,
        dirY,
        radius,
        fighter.playerId,
        fighter.color,
        damage
      )
    );
  }

  static firePulse(fighter, opponent, damage) {
    fighter.pulseFlashUntil = Date.now() + 200;
    const dist = Math.hypot(opponent.x - fighter.x, opponent.y - fighter.y);
    if (dist <= LittleBallHeroConstants.PULSE_RANGE + opponent.radius) {
      opponent.takeDamage(damage, fighter);
    }
  }

  static fireBump(fighter, opponent, damage) {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return;
    }
    const nx = dx / dist;
    const ny = dy / dist;
    opponent.vx += nx * 2.5;
    opponent.vy += ny * 2.5;
    fighter.vx -= nx * 1.2;
    fighter.vy -= ny * 1.2;
    opponent.takeDamage(damage, fighter);
    ContinuousBouncePhysics.maintainSpeed(fighter);
    ContinuousBouncePhysics.maintainSpeed(opponent);
  }
}

/**
 * 选球倒计时
 */
class PickTimer {
  constructor(limitMs) {
    this.limitMs = limitMs;
    this.startTime = Date.now();
  }

  getRemainingMs() {
    return Math.max(0, this.limitMs - (Date.now() - this.startTime));
  }

  isExpired() {
    return this.getRemainingMs() <= 0;
  }

  reset() {
    this.startTime = Date.now();
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
    this.pickStep = 1;
    this.pickTimer = null;
    this.fighters = [];
    this.projectiles = [];
    this.p1HeroId = null;
    this.p2HeroId = null;
    this.takenHeroIds = new Set();
    this.customRoster = null;
    this.arena = null;
    this.width = 0;
    this.height = 0;
    this.animationId = null;
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

  getProjectileRadius() {
    return Math.max(8, this.height * GameConstants.PROJECTILE_RADIUS_RATIO);
  }

  setCustomRoster(templates) {
    this.customRoster = templates;
  }

  getHeroes() {
    return this.customRoster || HeroRoster.getAll();
  }

  getHeroById(id) {
    const heroes = this.getHeroes();
    return heroes.find((hero) => hero.id === id) || heroes[0];
  }

  pickRandomHero(available) {
    const list = available.length > 0 ? available : this.getHeroes();
    return list[Math.floor(Math.random() * list.length)];
  }

  start(subMode) {
    this.subMode = subMode;
    this.state = "playing";
    this.phase = "pick";
    this.pickStep = 1;
    this.p1HeroId = null;
    this.p2HeroId = null;
    this.takenHeroIds = new Set();
    this.fighters = [];
    this.projectiles = [];
    this.startPickTimer();
    this.notifyPhase();

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.loop();
  }

  isTwoPlayer() {
    return this.subMode === "versus";
  }

  startPickTimer() {
    this.pickTimer = new PickTimer(LittleBallHeroConstants.PICK_TIME_LIMIT_MS);
  }

  notifyPhase() {
    if (typeof this.onPhaseChange === "function") {
      this.onPhaseChange(this.getPhaseSnapshot());
    }
  }

  getPhaseSnapshot() {
    return {
      phase: this.phase,
      pickStep: this.pickStep,
      subMode: this.subMode,
      pickRemainingMs: this.pickTimer ? this.pickTimer.getRemainingMs() : 0,
      p1HeroId: this.p1HeroId,
      p2HeroId: this.p2HeroId,
      fighters: this.fighters.map((f) => ({
        playerId: f.playerId,
        name: f.template.name,
        health: f.health,
        maxHealth: f.maxHealth,
        skillName: HeroAutoSkillSystem.getFighterSkillLabel(f),
      })),
    };
  }

  getAvailableHeroes() {
    return this.getHeroes().filter((h) => !this.takenHeroIds.has(h.id));
  }

  autoPickForCurrentStep() {
    const available = this.getAvailableHeroes();
    const hero = this.pickRandomHero(available);
    this.applyPick(hero.id, true);
  }

  applyPick(heroId, wasAuto) {
    if (this.pickStep === 1) {
      this.p1HeroId = heroId;
    } else {
      this.p2HeroId = heroId;
    }
    this.takenHeroIds.add(heroId);
    this.advancePick(wasAuto);
  }

  tryPickHero(heroId) {
    if (this.phase !== "pick" || this.takenHeroIds.has(heroId)) {
      return false;
    }
    this.applyPick(heroId, false);
    return true;
  }

  advancePick(wasAuto) {
    if (this.pickStep === 1) {
      this.pickStep = 2;

      if (!this.isTwoPlayer()) {
        const available = this.getAvailableHeroes();
        const aiHero = this.pickRandomHero(available);
        this.p2HeroId = aiHero.id;
        this.takenHeroIds.add(aiHero.id);
        this.beginBattle();
        return;
      }

      this.startPickTimer();
      this.notifyPhase();
      return;
    }

    this.beginBattle();
  }

  beginBattle() {
    const r = this.getBallRadius();
    const cy = (this.arena.top + this.arena.bottom) / 2;
    const p1Template = this.getHeroById(this.p1HeroId);
    const p2Template = this.getHeroById(this.p2HeroId);

    this.fighters = [
      new HeroBallFighter(
        1,
        p1Template,
        this.arena.left + this.width * 0.28,
        cy,
        r,
        1,
        0.2
      ),
      new HeroBallFighter(
        2,
        p2Template,
        this.arena.right - this.width * 0.28,
        cy,
        r,
        -1,
        0.2
      ),
    ];

    for (const fighter of this.fighters) {
      if (DefenseBallSkillSystem.isDefenseFighter(fighter)) {
        DefenseBallSkillSystem.rollDefenseItemForBattle(fighter);
      }
    }

    this.phase = "battle";
    this.projectiles = [];
    this.notifyPhase();
  }

  updatePickPhase() {
    if (this.pickTimer && this.pickTimer.isExpired()) {
      this.autoPickForCurrentStep();
    }
  }

  canPlayerPickNow() {
    if (this.phase !== "pick") {
      return false;
    }
    if (this.pickStep === 1) {
      return true;
    }
    return this.pickStep === 2 && this.isTwoPlayer();
  }

  getCurrentPickerTeamLabel() {
    return this.pickStep === 1 ? "红队" : "蓝队";
  }

  getPickInputContext() {
    const context = {
      emptyHint: "输入角色名或编号，下方显示对弈编号",
      blockedByTeam: "对方",
    };

    if (this.pickStep === 2 && this.p1HeroId) {
      const redHero = this.getHeroById(this.p1HeroId);
      context.emptyHint = `红队已选【${redHero.name}】，蓝队请输入其他角色名或编号`;
      context.blockedByTeam = "红队";
    }

    return context;
  }

  tryPickByInput(rawInput) {
    if (!this.canPlayerPickNow()) {
      if (this.phase === "pick" && this.pickStep === 2 && !this.isTwoPlayer()) {
        return {
          ok: false,
          message: "训练场蓝队由 AI 自动选球，双人模式才需蓝队手动输入",
        };
      }
      return { ok: false, message: "当前不可选球" };
    }

    const resolved = HeroPickInputResolver.resolve(
      this.getHeroes(),
      this.getAvailableHeroes(),
      rawInput,
      this.getPickInputContext()
    );
    if (!resolved.hero) {
      return { ok: false, message: resolved.message };
    }

    const picked = this.tryPickHero(resolved.hero.id);
    if (!picked) {
      return { ok: false, message: "选球失败，请重试" };
    }

    return {
      ok: true,
      message: `已选 ${resolved.hero.name}（对弈编号 ${resolved.pickNumber}）`,
      pickNumber: resolved.pickNumber,
      heroName: resolved.hero.name,
    };
  }

  getPickPreviewText(rawInput) {
    return HeroPickInputResolver.preview(
      this.getHeroes(),
      this.getAvailableHeroes(),
      rawInput,
      this.getPickInputContext()
    );
  }

  getFighter(playerId) {
    return this.fighters.find((f) => f.playerId === playerId);
  }

  static getPickKeyCode(index) {
    if (index >= 0 && index < 9) {
      return `Digit${index + 1}`;
    }
    if (index === 9) {
      return "Digit0";
    }
    if (index === 10) {
      return "Minus";
    }
    if (index === 11) {
      return "Equal";
    }
    if (index === 12) {
      return "BracketLeft";
    }
    if (index === 13) {
      return "BracketRight";
    }
    return null;
  }

  static getPickKeyHint(heroCount) {
    if (heroCount <= 9) {
      return `1-${heroCount}`;
    }
    if (heroCount === 10) {
      return "1-9、0";
    }
    if (heroCount === 11) {
      return "1-9、0、-";
    }
    if (heroCount === 12) {
      return "1-9、0、-、=";
    }
    if (heroCount === 13) {
      return "1-9、0、-、=、[";
    }
    return "1-9、0、-、=、[、]";
  }

  updateBattle() {
    const f1 = this.fighters[0];
    const f2 = this.fighters[1];
    if (!f1 || !f2) {
      return;
    }

    if (!ElementStatusEffectSystem.isFrozen(f1)) {
      ContinuousBouncePhysics.updateBall(f1, this.arena);
    }
    if (!ElementStatusEffectSystem.isFrozen(f2)) {
      ContinuousBouncePhysics.updateBall(f2, this.arena);
    }
    ContinuousBouncePhysics.resolveBallCollision(f1, f2);

    const now = Date.now();
    ElementStatusEffectSystem.tickFighter(f1, now);
    ElementStatusEffectSystem.tickFighter(f2, now);
    DefenseBallSkillSystem.tickMovementRestriction(f1, now);
    DefenseBallSkillSystem.tickMovementRestriction(f2, now);

    MagnetSkillSystem.tick(
      f1,
      f2,
      this.projectiles,
      this.fighters,
      this.arena,
      now
    );
    MagnetSkillSystem.tick(
      f2,
      f1,
      this.projectiles,
      this.fighters,
      this.arena,
      now
    );
    MagnetSkillSystem.onBallContact(f1, f2, this.fighters, now);
    MagnetSkillSystem.onBallContact(f2, f1, this.fighters, now);

    HeroAutoSkillSystem.tryUseSkill(f1, f2, this.projectiles, this.getProjectileRadius());
    HeroAutoSkillSystem.tryUseSkill(f2, f1, this.projectiles, this.getProjectileRadius());

    ElementBurstSystem.updateOrbitBullets(f1, f2, this.fighters);
    ElementBurstSystem.updateOrbitBullets(f2, f1, this.fighters);

    this.updateProjectiles();

    for (const fighter of this.fighters) {
      if (!fighter.isAlive()) {
        this.endGame(fighter.playerId === 1 ? 2 : 1);
        return;
      }
    }
  }

  updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const proj = this.projectiles[i];

      if (proj instanceof TeacherNumberProjectile) {
        proj.update();

        if (!proj.alive) {
          this.projectiles.splice(i, 1);
          continue;
        }

        const target = proj.target;
        if (
          target &&
          target.isAlive() &&
          CollisionDetector.circleHitsCircle(
            proj.x,
            proj.y,
            proj.radius,
            target.x,
            target.y,
            target.radius
          )
        ) {
          target.takeDamage(proj.numberValue, proj.ownerFighter);
          if (proj.ownerFighter) {
            proj.ownerFighter.attackNumber += 1;
          }
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      if (proj instanceof SunglassesProjectile) {
        const owner = this.getFighter(proj.ownerId);
        proj.update(owner);

        if (!proj.alive || proj.isOutOfBounds(this.arena)) {
          this.projectiles.splice(i, 1);
          continue;
        }

        for (const fighter of this.fighters) {
          if (
            CollisionDetector.circleHitsCircle(
              proj.x,
              proj.y,
              proj.radius,
              fighter.x,
              fighter.y,
              fighter.radius
            )
          ) {
            const removed = proj.handleEnemyHit(fighter, owner);
            if (removed || !proj.alive) {
              this.projectiles.splice(i, 1);
            }
            break;
          }
        }
        continue;
      }

      if (proj instanceof FlamethrowerProjectile) {
        proj.update();

        if (!proj.alive || proj.isOutOfBounds(this.arena)) {
          this.projectiles.splice(i, 1);
          continue;
        }

        for (const fighter of this.fighters) {
          if (fighter.playerId === proj.ownerId || !fighter.isAlive()) {
            continue;
          }
          if (
            CollisionDetector.circleHitsCircle(
              proj.x,
              proj.y,
              proj.radius,
              fighter.x,
              fighter.y,
              fighter.radius
            )
          ) {
            const shooter = this.getFighter(proj.ownerId);
            fighter.takeDamage(proj.damage, shooter);
            proj.alive = false;
            this.projectiles.splice(i, 1);
            break;
          }
        }
        continue;
      }

      proj.update();

      if (!proj.alive || proj.isOutOfBounds(this.arena)) {
        this.projectiles.splice(i, 1);
        continue;
      }

      for (const fighter of this.fighters) {
        if (fighter.playerId === proj.ownerId || !fighter.isAlive()) {
          continue;
        }
        if (
          CollisionDetector.circleHitsCircle(
            proj.x,
            proj.y,
            proj.radius,
            fighter.x,
            fighter.y,
            fighter.radius
          )
        ) {
          const shooter = this.getFighter(proj.ownerId);
          fighter.takeDamage(proj.damage, shooter);
          proj.alive = false;
          this.projectiles.splice(i, 1);
          break;
        }
      }
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
      this.updatePickPhase();
      this.notifyPhase();
    } else if (this.phase === "battle") {
      this.updateBattle();
      this.notifyPhase();
    }

    this.input.clearFrame();
  }

  drawPickScreen() {
    const heroes = this.getHeroes();
    const remainingSec = Math.ceil(
      (this.pickTimer ? this.pickTimer.getRemainingMs() : 0) / 1000
    );
    const pickerLabel =
      this.pickStep === 1
        ? "红队（玩家1）选球"
        : this.isTwoPlayer()
          ? "蓝队（玩家2）选球 · 不可与红队重复"
          : "蓝队由 AI 自动选球";

    this.ctx.fillStyle = "rgba(0,0,0,0.55)";
    this.ctx.fillRect(
      this.arena.left,
      this.arena.top,
      this.arena.right - this.arena.left,
      this.arena.bottom - this.arena.top
    );

    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#ffd43b";
    this.ctx.font = "bold 18px system-ui, sans-serif";
    this.ctx.fillText(pickerLabel, this.width / 2, this.arena.top + 32);

    this.ctx.fillStyle = remainingSec <= 3 ? "#ff6b6b" : "#ccc";
    this.ctx.font = "14px system-ui, sans-serif";
    this.ctx.fillText(
      `剩余 ${remainingSec} 秒 · 在下方输入栏输入角色名或编号，超时随机`,
      this.width / 2,
      this.arena.top + 56
    );

    const slots = HeroPickScreenLayout.computeSlots(heroes.length, this.arena);
    heroes.forEach((hero, i) => {
      const slot = slots[i];
      const taken = this.takenHeroIds.has(hero.id);

      HeroPickPreviewRenderer.draw(
        this.ctx,
        hero,
        slot.cx,
        slot.cy,
        slot.ballRadius,
        taken
      );

      this.ctx.fillStyle = taken ? "#888" : "#fff";
      this.ctx.font = "bold 12px system-ui, sans-serif";
      this.ctx.fillText(`${i + 1}. ${hero.name}`, slot.cx, slot.cy + slot.ballRadius + 18);

      const skillLabel =
        hero.skillDisplayName || HeroAutoSkillSystem.getSkillLabel(hero.skillType);
      this.ctx.fillStyle = "#aaa";
      this.ctx.font = "11px system-ui, sans-serif";
      this.ctx.fillText(`自动·${skillLabel}`, slot.cx, slot.cy + slot.ballRadius + 34);
      if (hero.decoration) {
        this.ctx.fillStyle = "#ffd43b";
        this.ctx.fillText(hero.decoration, slot.cx, slot.cy - slot.ballRadius - 10);
      }
      if (taken) {
        this.ctx.fillStyle = "#666";
        this.ctx.fillText("已选", slot.cx, slot.cy + slot.ballRadius + 48);
      }
    });
    this.ctx.textAlign = "left";
  }

  drawBackground() {
    this.ctx.fillStyle = GameConstants.BACKGROUND_COLOR;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.arena.draw(this.ctx);

    const modeLabel = this.getModeLabel();
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
      if (fighter.isAlive()) {
        fighter.draw(this.ctx);
        ElementBurstSystem.drawOrbitBullets(this.ctx, fighter);
      }
    }

    for (const proj of this.projectiles) {
      proj.draw(this.ctx);
    }

    this.ctx.fillStyle = "rgba(255, 212, 59, 0.85)";
    this.ctx.font = "13px system-ui, sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "双球自动反弹对打 · 技能自动释放 · 你只需选球",
      this.width / 2,
      this.arena.bottom + 28
    );
    this.ctx.textAlign = "left";
  }

  loop() {
    this.update();
    this.draw();

    if (this.state === "playing") {
      this.animationId = requestAnimationFrame(() => this.loop());
    }
  }

  getHealthPercent(playerId) {
    const fighter = this.getFighter(playerId);
    if (!fighter) {
      return 100;
    }
    return (fighter.health / fighter.maxHealth) * 100;
  }

  getModeLabel() {
    return this.subMode === "training" ? "小球英雄 · 训练场" : "小球英雄 · 双人";
  }
}

HeroAutoSkillSystem.getFighterSkillLabel = function getFighterSkillLabel(fighter) {
  const baseLabel =
    fighter.template.skillDisplayName ||
    HeroAutoSkillSystem.getSkillLabel(fighter.template.skillType);
  if (fighter.template.skillType === HeroSkillType.NUMBER_TEACHER) {
    return `${baseLabel}·${fighter.attackNumber}`;
  }
  if (fighter.template.skillType === HeroSkillType.BROKEN_BLADE) {
    return `${baseLabel}·${fighter.bladeDamage}`;
  }
  if (fighter.template.skillType === HeroSkillType.ORANGE_CALC) {
    const nextDamage = OrangeCalcSkillSystem.getNextDamagePreview(
      fighter,
      fighter.template.skillDamage
    );
    return `${baseLabel}·${nextDamage}`;
  }
  if (fighter.template.skillType === HeroSkillType.MAGNET) {
    const shieldCount = fighter.magnetShields ? fighter.magnetShields.length : 0;
    return `${baseLabel}·盾${shieldCount}`;
  }
  if (fighter.template.skillType === HeroSkillType.DEFENSE) {
    if (fighter.defenseItem && !fighter.defenseItem.isBroken()) {
      return `${baseLabel}·${DefenseHeadType.getLabel(fighter.defenseItem.headType)}`;
    }
    return `${baseLabel}·防具已破`;
  }
  return baseLabel;
};

HeroAutoSkillSystem.getSkillLabel = function getSkillLabel(skillType) {
  if (skillType === HeroSkillType.SHOT) {
    return "弹射";
  }
  if (skillType === HeroSkillType.FLAMETHROWER) {
    return "喷火(80%)";
  }
  if (skillType === HeroSkillType.PULSE) {
    return "震荡";
  }
  if (skillType === HeroSkillType.IRON_WALL) {
    return "减伤90%+暴击";
  }
  if (skillType === HeroSkillType.BUMP) {
    return "冲击";
  }
  if (skillType === HeroSkillType.REVOLVER) {
    return "左轮双射";
  }
  if (skillType === HeroSkillType.SUNGLASSES) {
    return "回旋墨镜";
  }
  if (skillType === HeroSkillType.BOXING) {
    return "近距重拳";
  }
  if (skillType === HeroSkillType.NUMBER_TEACHER) {
    return "追踪数字";
  }
  if (skillType === HeroSkillType.SPIKE) {
    return "受击反伤";
  }
  if (skillType === HeroSkillType.BROKEN_BLADE) {
    return "斷刀劈砍";
  }
  if (skillType === HeroSkillType.ELEMENT_BURST) {
    return "元素爆破";
  }
  if (skillType === HeroSkillType.ORANGE_CALC) {
    return "橙算叠乘";
  }
  if (skillType === HeroSkillType.MAGNET) {
    return "磁吸护盾/投磁铁";
  }
  if (skillType === HeroSkillType.DEFENSE) {
    return "随机防具头";
  }
  return "技能";
};
