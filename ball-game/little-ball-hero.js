/**
 * 小球英雄模式 - 仅需选球（限时）；双球持续自动反弹，技能自动释放
 */

const LittleBallHeroConstants = {
  PICK_TIME_LIMIT_MS: 8000,
  /** 进入新选球步骤后的保护时间，避免同帧或瞬间超时误触发自动选球 */
  PICK_STEP_GRACE_MS: 600,
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
  BOXING_PUNCH_FLASH_MS: 280,
  SPIKE_REFLECT_FLASH_MS: 280,
  /** 尖刺球：每场最多反伤次数 */
  SPIKE_MAX_REFLECT_COUNT: 2,
  /** 尖刺球：反伤伤害比例（削弱） */
  SPIKE_REFLECT_DAMAGE_RATIO: 0.6,
  BLADE_STACK_DAMAGE_PER_SEC: 10,
  BLADE_STACK_INTERVAL_MS: 1000,
  BLADE_SLASH_FLASH_MS: 320,
  FLAMETHROWER_PROC_CHANCE: 0.8,
  FLAMETHROWER_PROJECTILE_LIFETIME_MS: 750,
  FLAMETHROWER_BURST_FLASH_MS: 260,
  /** 铁壁丸生命值上限 */
  IRON_WALL_MAX_HEALTH: 1000,
  /** 铁壁丸出击伤害 */
  IRON_WALL_STRIKE_DAMAGE: 30,
  IRON_WALL_CRIT_FLASH_MS: 320,
  AI_PICK_DELAY_MS: 500,
  PICK_GRID_COLUMNS: 4,
  PICK_TOP_PADDING: 72,
  TEACHER_START_NUMBER: 1,
  TEACHER_NUMBER_SPEED: 6.5,
  /** 已削弱：不再追踪，仅直线飞行 */
  TEACHER_NUMBER_HOMING: 0,
  TEACHER_NUMBER_LIFETIME_MS: 1400,
  ORANGE_CALC_FLASH_MS: 280,
  /** 橙算球：每局最多叠乘次数 */
  ORANGE_CALC_MAX_MULTIPLY_COUNT: 2,
  /** 橙算球：每次叠乘实际造成的伤害（不再出现数百点爆发） */
  ORANGE_CALC_MULTIPLY_DAMAGE: 1,
  /** 四人模式参战人数 */
  FOUR_PLAYER_COUNT: 4,
  /** 双队团战总回合数 */
  TEAM_BATTLE_MAX_ROUNDS: 30,
  /** 选球队伍标签 */
  TEAM_LABEL_BY_STEP: {
    1: "红队",
    2: "蓝队",
    3: "绿队",
    4: "紫队",
  },
};

/**
 * 英雄技能类型
 */
class HeroSkillType {
  static SHOT = "shot";

  /** 喷火球专属：每次攻击 80% 概率造成喷火伤害 */
  static FLAMETHROWER = "flamethrower";

  static PULSE = "pulse";

  /** 铁壁丸专属：高生命值，出击固定伤害 */
  static IRON_WALL = "iron_wall";

  static BUMP = "bump";

  /** 江西步牛仔球专属：双发左轮射击 */
  static REVOLVER = "revolver";

  /** 墨镜球专属：投出墨镜，命中后折返造成二次伤害 */
  static SUNGLASSES = "sunglasses";

  /** 拳击球专属：触碰敌人时出拳 */
  static BOXING = "boxing";

  /** 数字老师球专属：头顶数字追踪敌人，命中后数字增长 */
  static NUMBER_TEACHER = "number_teacher";

  /** 尖刺球专属：受到攻击时反伤攻击者 */
  static SPIKE = "spike";

  /** 斷刀球专属：触碰挥刀劈砍，远离敌人时每秒叠伤 */
  static BROKEN_BLADE = "broken_blade";

  /** 元素球专属：周期召唤四颗随机元素子弹 */
  static ELEMENT_BURST = "element_burst";

  /** 橙算球专属：叠乘攻击固定低伤，每局最多叠乘2次 */
  static ORANGE_CALC = "orange_calc";

  /** 磁铁球专属：吸附敌方投射物为盾，触碰反弹或超时环射 */
  static MAGNET = "magnet";

  /** 防卫球专属：每局随机防具头，须先击破防具 */
  static DEFENSE = "defense";

  /** 劍刃球专属：触碰挥剑吸血；周期无敌释放元素弹 */
  static SWORD_BLADE = "sword_blade";

  /** 寒冰腐烂球专属：冰球减速叠层冻结；受伤后狂暴近战；踩踏吞噬 */
  static ICE_ROT = "ice_rot";

  /** 追踪球专属：贴身追击敌人，触碰追加近战（其他球贴身时也有触身加成） */
  static TRACKING = "tracking";

  /** 旋风机甲球：触碰近战；20秒后导弹齐射5秒，冷却30秒 */
  static CYCLONE_MECHA = "cyclone_mecha";

  /** 医疗球：触碰队友治疗；仅双队团战模式可选 */
  static MEDICAL = "medical";

  /** 武器球：每 3 秒向敌人释放随机武器箱武器 */
  static WEAPON_BALL = "weapon_ball";

  /** 白玉球：极速射击，击杀召唤随机球 */
  static WHITE_JADE = "white_jade";

  /** 阵营球：触碰队友阵营共鸣；仅双队团战模式可选 */
  static FACTION = "faction";

  /** 巨齿球：周身巨齿环绕，触碰高额伤害并流血 */
  static GIANT_TEETH = "giant_teeth";

  /** 装逼球：初始 5 秒普攻，每次攻击减 0.1 秒间隔，最低 0.1 秒 */
  static SHOW_OFF = "show_off";

  /** 魅魔球：每秒牵引魅惑敌人，叠满 5 层后转为舔狗攻击原队友 */
  static SUCCUBUS = "succubus";

  /** 黑帮球：在场触发黑帮事件，周期入侵打手 */
  static GANGSTER = "gangster";
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
    this.teamBattleOnly = false;
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
        BallHealthResolver.resolve(LittleBallHeroConstants.IRON_WALL_MAX_HEALTH),
        8,
        1.4,
        HeroSkillType.IRON_WALL,
        LittleBallHeroConstants.IRON_WALL_STRIKE_DAMAGE
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
      new HeroBallTemplate(
        "sword_blade",
        "劍刃球",
        "#339af0",
        "#74c0fc",
        BallHealthResolver.resolve(100),
        9,
        1.0,
        HeroSkillType.SWORD_BLADE,
        26,
        SwordBladeConstants.INVINCIBLE_DURATION_MS +
          SwordBladeConstants.ULT_COOLDOWN_AFTER_INVINCIBLE_MS
      ),
      new HeroBallTemplate(
        "ice_rot",
        "寒冰腐烂球",
        "#15aabf",
        "#99e9f2",
        BallHealthResolver.resolve(96),
        8,
        1.05,
        HeroSkillType.ICE_ROT,
        14,
        IceRotConstants.ICE_SHOT_INTERVAL_MS
      ),
      new HeroBallTemplate(
        "tracking",
        "追踪球",
        "#4c6ef5",
        "#748ffc",
        BallHealthResolver.resolve(108),
        9.5,
        1.15,
        HeroSkillType.TRACKING,
        14,
        TrackingBallConstants.CONTACT_DAMAGE_INTERVAL_MS
      ),
      new HeroBallTemplate(
        "cyclone_mecha",
        "旋风机甲球",
        "#37b24d",
        "#8ce99a",
        BallHealthResolver.resolve(112),
        9,
        1.1,
        HeroSkillType.CYCLONE_MECHA,
        16,
        CycloneMechaConstants.MELEE_INTERVAL_MS
      ),
      HeroRoster.createMedicalBallTemplate(),
      HeroRoster.createFactionBallTemplate(),
      new HeroBallTemplate(
        "weapon_ball",
        "武器球",
        "#495057",
        "#868e96",
        BallHealthResolver.resolve(98),
        9,
        1.0,
        HeroSkillType.WEAPON_BALL,
        16,
        WeaponBallConstants.SKILL_INTERVAL_MS
      ),
      new HeroBallTemplate(
        "white_jade",
        "白玉球",
        "#f8f9fa",
        "#96f2d7",
        BallHealthResolver.resolve(90),
        9.5,
        0.95,
        HeroSkillType.WHITE_JADE,
        10,
        WhiteJadeBallConstants.FIRE_INTERVAL_MS
      ),
      new HeroBallTemplate(
        "giant_teeth",
        "巨齿球",
        "#c92a2a",
        "#ff6b6b",
        BallHealthResolver.resolve(100),
        8.5,
        1.1,
        HeroSkillType.GIANT_TEETH,
        GiantTeethBallConstants.DEFAULT_SKILL_DAMAGE,
        GiantTeethBallConstants.HIT_INTERVAL_MS
      ),
      new HeroBallTemplate(
        "show_off",
        "装逼球",
        "#f59f00",
        "#ffe066",
        ShowOffBallConstants.MAX_HEALTH,
        8,
        1.0,
        HeroSkillType.SHOW_OFF,
        ShowOffBallConstants.ATTACK_DAMAGE,
        ShowOffBallConstants.START_ATTACK_INTERVAL_MS
      ),
      new HeroBallTemplate(
        "succubus",
        "魅魔球",
        "#e64980",
        "#faa2c1",
        BallHealthResolver.resolve(94),
        8.2,
        0.95,
        HeroSkillType.SUCCUBUS,
        SuccubusBallConstants.SEDUCE_TOUCH_DAMAGE,
        SuccubusBallConstants.SEDUCE_INTERVAL_MS
      ),
      new HeroBallTemplate(
        "gangster",
        "黑帮球",
        "#212529",
        "#868e96",
        BallHealthResolver.resolve(102),
        8,
        1.05,
        HeroSkillType.GANGSTER,
        14,
        GangsterBallConstants.WAVE_INTERVAL_MS
      ),
    ];
  }

  static createMedicalBallTemplate() {
    const medicalBall = new HeroBallTemplate(
      "medical",
      "医疗球",
      "#20c997",
      "#63e6be",
      BallHealthResolver.resolve(100),
      8.5,
      1.0,
      HeroSkillType.MEDICAL,
      MedicalBallConstants.DEFAULT_HEAL_AMOUNT,
      MedicalBallConstants.HEAL_INTERVAL_MS
    );
    medicalBall.teamBattleOnly = true;
    medicalBall.decoration = "医护";
    return medicalBall;
  }

  static createFactionBallTemplate() {
    const factionBall = new HeroBallTemplate(
      "faction",
      "阵营球",
      "#4c6ef5",
      "#748ffc",
      BallHealthResolver.resolve(96),
      8.8,
      1.0,
      HeroSkillType.FACTION,
      14,
      FactionBallConstants.RESONANCE_INTERVAL_MS
    );
    factionBall.teamBattleOnly = true;
    factionBall.decoration = "阵营";
    return factionBall;
  }

  static isHeroAvailableInSubMode(hero, subMode) {
    if (!hero) {
      return false;
    }
    if (
      hero.teamBattleOnly &&
      subMode !== "team_battle" &&
      subMode !== "simulation"
    ) {
      return false;
    }
    return true;
  }

  static filterHeroesForSubMode(heroes, subMode) {
    return heroes.filter((hero) =>
      HeroRoster.isHeroAvailableInSubMode(hero, subMode)
    );
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
 * 数字老师球数字弹（伤害=数字值，命中后数字+1；已削弱为直线弹，不追踪）
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
    this.spawnTime = Date.now();

    const dx = target.x - x;
    const dy = target.y - y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      this.dirX = 1;
      this.dirY = 0;
    } else {
      this.dirX = dx / dist;
      this.dirY = dy / dist;
    }
  }

  update() {
    const speed = LittleBallHeroConstants.TEACHER_NUMBER_SPEED;
    this.x += this.dirX * speed;
    this.y += this.dirY * speed;

    if (
      Date.now() - this.spawnTime >
      LittleBallHeroConstants.TEACHER_NUMBER_LIFETIME_MS
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
  static TEAM_KEYWORDS = [
    "红队",
    "蓝队",
    "绿队",
    "紫队",
    "红",
    "蓝",
    "绿",
    "紫",
    "玩家1",
    "玩家2",
    "玩家3",
    "玩家4",
    "p1",
    "p2",
    "p3",
    "p4",
  ];

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

    if (HeroPickInputResolver.isCurrentStepTeamHint(text, config.pickStep)) {
      const pickerLabel = config.currentPickerLabel || "当前队伍";
      return {
        hero: null,
        pickNumber: 0,
        message: `当前轮到${pickerLabel}选球，请输入角色名或编号`,
      };
    }

    if (HeroPickInputResolver.isTeamKeyword(text, config.pickStep)) {
      const pickerLabel = config.currentPickerLabel || "当前队伍";
      return {
        hero: null,
        pickNumber: 0,
        message: `请输入角色名或编号（当前为${pickerLabel}选球）`,
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

  static isCurrentStepTeamHint(text, pickStep) {
    const lowerText = text.toLowerCase();
    const stepKeywords = {
      1: ["红队", "红", "玩家1", "p1"],
      2: ["蓝队", "蓝", "玩家2", "p2"],
      3: ["绿队", "绿", "玩家3", "p3"],
      4: ["紫队", "紫", "玩家4", "p4"],
    };
    const allowedKeywords = pickStep ? stepKeywords[pickStep] || [] : [];
    return allowedKeywords.some(
      (keyword) => keyword.toLowerCase() === lowerText
    );
  }

  static isTeamKeyword(text, pickStep) {
    const lowerText = text.toLowerCase();
    const stepKeywords = {
      1: ["红队", "红", "玩家1", "p1"],
      2: ["蓝队", "蓝", "玩家2", "p2"],
      3: ["绿队", "绿", "玩家3", "p3"],
      4: ["紫队", "紫", "玩家4", "p4"],
    };
    const allowedKeywords = pickStep ? stepKeywords[pickStep] || [] : [];

    return HeroPickInputResolver.TEAM_KEYWORDS.some((keyword) => {
      if (
        allowedKeywords.some(
          (allowedKeyword) => allowedKeyword.toLowerCase() === lowerText
        )
      ) {
        return false;
      }
      return keyword.toLowerCase() === lowerText;
    });
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

    if (hero.skillType === HeroSkillType.SWORD_BLADE) {
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(10, radius * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("劍", cx, cy);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      return;
    }

    if (hero.skillType === HeroSkillType.ICE_ROT) {
      ctx.fillStyle = "#e3fafc";
      ctx.font = `bold ${Math.max(10, radius * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("寒", cx, cy);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      return;
    }

    if (hero.skillType === HeroSkillType.TRACKING) {
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(10, radius * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("追", cx, cy);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      return;
    }

    if (hero.skillType === HeroSkillType.CYCLONE_MECHA) {
      ctx.fillStyle = "#e9fac8";
      ctx.font = `bold ${Math.max(10, radius * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("甲", cx, cy);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      return;
    }

    if (hero.skillType === HeroSkillType.MEDICAL) {
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(10, radius * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("医", cx, cy);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      return;
    }

    if (hero.skillType === HeroSkillType.WEAPON_BALL) {
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(10, radius * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("武", cx, cy);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      return;
    }

    if (hero.skillType === HeroSkillType.WHITE_JADE) {
      ctx.fillStyle = "#212529";
      ctx.font = `bold ${Math.max(10, radius * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("玉", cx, cy);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      return;
    }

    if (hero.skillType === HeroSkillType.FACTION) {
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(10, radius * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("阵", cx, cy);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      return;
    }

    if (hero.skillType === HeroSkillType.GIANT_TEETH) {
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(10, radius * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("齿", cx, cy);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      return;
    }

    if (hero.skillType === HeroSkillType.SHOW_OFF) {
      ctx.fillStyle = "#212529";
      ctx.font = `bold ${Math.max(10, radius * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("装", cx, cy);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      return;
    }

    if (hero.skillType === HeroSkillType.SUCCUBUS) {
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(10, radius * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("魅", cx, cy);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      return;
    }

    if (hero.skillType === HeroSkillType.GANGSTER) {
      ctx.fillStyle = "#f8f9fa";
      ctx.font = `bold ${Math.max(10, radius * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("黑", cx, cy);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      return;
    }
  }
}

/**
 * 触碰近战公共判定（拳击球、斷刀球、劍刃球等）
 */
class ContactMeleeHelper {
  static isOverlapping(fighterA, fighterB) {
    return CollisionDetector.circleHitsCircle(
      fighterA.x,
      fighterA.y,
      fighterA.radius,
      fighterB.x,
      fighterB.y,
      fighterB.radius
    );
  }

  static getContactOpponents(fighter, allFighters, game) {
    return HeroBattleArenaHelper.getAliveOpponents(fighter, allFighters, game);
  }

  static isTouchingAnyOpponent(fighter, allFighters, game) {
    const opponents = ContactMeleeHelper.getContactOpponents(
      fighter,
      allFighters,
      game
    );
    return opponents.some((opponent) =>
      ContactMeleeHelper.isOverlapping(fighter, opponent)
    );
  }

  static getMeleeIntervalMs(fighter) {
    if (typeof CrazyFightSkillSystem !== "undefined") {
      return CrazyFightSkillSystem.getSkillIntervalMs(
        fighter,
        fighter.template.skillIntervalMs
      );
    }
    return fighter.template.skillIntervalMs;
  }
}

/**
 * 拳击球技能：触碰敌人时出拳
 */
class BoxingSkillSystem {
  static isBoxingFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.BOXING;
  }

  static initFighter(fighter) {
    fighter.boxingLastHitByTarget = {};
  }

  static tickContact(fighter, allFighters, game, now) {
    if (!BoxingSkillSystem.isBoxingFighter(fighter) || !fighter.isAlive()) {
      return;
    }
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isAttackBlocked(fighter)
    ) {
      return;
    }

    const opponents = ContactMeleeHelper.getContactOpponents(
      fighter,
      allFighters,
      game
    );
    const hitInterval = ContactMeleeHelper.getMeleeIntervalMs(fighter);

    for (const opponent of opponents) {
      if (!ContactMeleeHelper.isOverlapping(fighter, opponent)) {
        continue;
      }

      const lastHitTime =
        fighter.boxingLastHitByTarget[opponent.playerId] || 0;
      if (now - lastHitTime < hitInterval) {
        continue;
      }

      fighter.boxingLastHitByTarget[opponent.playerId] = now;
      HeroAutoSkillSystem.fireBoxingPunch(
        fighter,
        opponent,
        fighter.getSkillDamage()
      );
    }
  }
}

/**
 * 斷刀球技能：触碰劈砍，未触碰时每秒叠伤
 */
class BrokenBladeSkillSystem {
  static isBladeFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.BROKEN_BLADE;
  }

  static initFighter(fighter) {
    fighter.bladeLastHitByTarget = {};
  }

  static getStackIntervalMs(fighter) {
    if (typeof CrazyFightSkillSystem !== "undefined") {
      return CrazyFightSkillSystem.getBladeStackIntervalMs(fighter);
    }
    return LittleBallHeroConstants.BLADE_STACK_INTERVAL_MS;
  }

  static tick(fighter, allFighters, game, now) {
    if (!BrokenBladeSkillSystem.isBladeFighter(fighter) || !fighter.isAlive()) {
      return;
    }
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isAttackBlocked(fighter)
    ) {
      return;
    }

    const opponents = ContactMeleeHelper.getContactOpponents(
      fighter,
      allFighters,
      game
    );
    const hitInterval = ContactMeleeHelper.getMeleeIntervalMs(fighter);
    let touchingAnyone = false;

    for (const opponent of opponents) {
      if (!ContactMeleeHelper.isOverlapping(fighter, opponent)) {
        continue;
      }

      touchingAnyone = true;
      const lastHitTime =
        fighter.bladeLastHitByTarget[opponent.playerId] || 0;
      if (now - lastHitTime < hitInterval) {
        continue;
      }

      fighter.bladeLastHitByTarget[opponent.playerId] = now;
      HeroAutoSkillSystem.fireBladeSlash(
        fighter,
        opponent,
        fighter.bladeDamage
      );
    }

    if (touchingAnyone) {
      return;
    }

    if (
      now - fighter.lastBladeStackTime <
      BrokenBladeSkillSystem.getStackIntervalMs(fighter)
    ) {
      return;
    }

    fighter.bladeDamage += LittleBallHeroConstants.BLADE_STACK_DAMAGE_PER_SEC;
    fighter.lastBladeStackTime = now;
  }
}

/**
 * 铁壁丸技能：出击固定伤害
 */
class IronWallSkillSystem {
  static isIronWallFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.IRON_WALL;
  }

  static getStrikeDamage() {
    return LittleBallHeroConstants.IRON_WALL_STRIKE_DAMAGE;
  }

  static applyCriticalDamage(baseDamage, fighter) {
    return IronWallSkillSystem.getStrikeDamage();
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
 * 橙算球技能：叠乘攻击固定造成 ORANGE_CALC_MULTIPLY_DAMAGE 点伤害（每局最多叠乘2次）
 */
class OrangeCalcSkillSystem {
  static initFighter(fighter) {
    fighter.orangeCalcLastDamage = 0;
    fighter.orangeCalcFlashUntil = 0;
    fighter.orangeCalcMultiplyUsed = 0;
  }

  static isOrangeCalcFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.ORANGE_CALC;
  }

  static canMultiply(fighter) {
    const maxCount =
      typeof CrazyFightSkillSystem !== "undefined"
        ? CrazyFightSkillSystem.getOrangeCalcMaxMultiply(fighter)
        : LittleBallHeroConstants.ORANGE_CALC_MAX_MULTIPLY_COUNT;
    return fighter.orangeCalcMultiplyUsed < maxCount;
  }

  static getMultiplyRemaining(fighter) {
    const maxCount =
      typeof CrazyFightSkillSystem !== "undefined"
        ? CrazyFightSkillSystem.getOrangeCalcMaxMultiply(fighter)
        : LittleBallHeroConstants.ORANGE_CALC_MAX_MULTIPLY_COUNT;
    return Math.max(0, maxCount - fighter.orangeCalcMultiplyUsed);
  }

  static computeAttackDamage(fighter, baseDamage) {
    const lastDamage = fighter.orangeCalcLastDamage || 0;
    if (lastDamage <= 0 || !OrangeCalcSkillSystem.canMultiply(fighter)) {
      return baseDamage;
    }

    return LittleBallHeroConstants.ORANGE_CALC_MULTIPLY_DAMAGE;
  }

  static recordAttackDamage(fighter, attackDamage, baseDamage) {
    const didMultiply =
      OrangeCalcSkillSystem.canMultiply(fighter) &&
      (fighter.orangeCalcLastDamage || 0) > 0 &&
      attackDamage === LittleBallHeroConstants.ORANGE_CALC_MULTIPLY_DAMAGE;

    if (didMultiply) {
      fighter.orangeCalcMultiplyUsed += 1;
    }

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
    const multiplyLeft = OrangeCalcSkillSystem.getMultiplyRemaining(fighter);
    const badgeY = fighter.y - fighter.radius - 16;
    ctx.fillStyle = "rgba(26, 26, 46, 0.85)";
    ctx.fillRect(fighter.x - 26, badgeY - 10, 52, 20);
    ctx.fillStyle = multiplyLeft > 0 ? "#ffc078" : "#868e96";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      multiplyLeft > 0 ? `×${preview}·${multiplyLeft}` : `×${preview}`,
      fighter.x,
      badgeY
    );
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

  static initFighter(fighter) {
    fighter.spikeReflectsRemaining = LittleBallHeroConstants.SPIKE_MAX_REFLECT_COUNT;
  }

  static getReflectDamage(fighter) {
    const base = fighter.template.skillDamage;
    return Math.max(
      1,
      Math.round(base * LittleBallHeroConstants.SPIKE_REFLECT_DAMAGE_RATIO)
    );
  }

  static tryReflect(defender, attacker, skipReflect) {
    if (skipReflect || !SpikeReflectSystem.isSpikeFighter(defender)) {
      return;
    }
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isAttackBlocked(defender)
    ) {
      return;
    }
    if (!attacker || !attacker.isAlive() || attacker === defender) {
      return;
    }
    if (defender.spikeReflectsRemaining <= 0) {
      return;
    }

    defender.spikeReflectsRemaining -= 1;
    const reflectDamage = SpikeReflectSystem.getReflectDamage(defender);
    attacker.takeDamage(reflectDamage, null, true);
    defender.spikeFlashUntil = Date.now() + LittleBallHeroConstants.SPIKE_REFLECT_FLASH_MS;

    if (typeof ElementStatusEffectSystem !== "undefined") {
      const left = defender.spikeReflectsRemaining;
      ElementStatusEffectSystem.setStatusText(
        defender,
        left > 0 ? `反伤剩${left}次` : "尖刺已钝"
      );
    }
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

    if (SwordBladeSkillSystem.isSwordFighter(this)) {
      SwordBladeSkillSystem.initFighter(this);
    }

    if (BoxingSkillSystem.isBoxingFighter(this)) {
      BoxingSkillSystem.initFighter(this);
    }

    if (BrokenBladeSkillSystem.isBladeFighter(this)) {
      BrokenBladeSkillSystem.initFighter(this);
    }

    if (IceRotSkillSystem.isIceRotFighter(this)) {
      IceRotSkillSystem.initFighter(this);
    }

    if (TrackingBallSkillSystem.isTrackingFighter(this)) {
      TrackingBallSkillSystem.initFighter(this);
    }

    if (CycloneMechaSkillSystem.isCycloneMechaFighter(this)) {
      CycloneMechaSkillSystem.initFighter(this);
    }

    if (MedicalSkillSystem.isMedicalFighter(this)) {
      MedicalSkillSystem.initFighter(this);
    }

    if (WeaponBallSkillSystem.isWeaponBallFighter(this)) {
      WeaponBallSkillSystem.initFighter(this);
    }

    if (WhiteJadeBallSkillSystem.isWhiteJadeFighter(this)) {
      WhiteJadeBallSkillSystem.initFighter(this);
    }

    if (FactionBallSkillSystem.isFactionFighter(this)) {
      FactionBallSkillSystem.initFighter(this);
    }

    if (GiantTeethSkillSystem.isGiantTeethFighter(this)) {
      GiantTeethSkillSystem.initFighter(this);
    }

    if (ShowOffBallSkillSystem.isShowOffFighter(this)) {
      ShowOffBallSkillSystem.initFighter(this);
    }

    if (typeof SuccubusBallSkillSystem !== "undefined") {
      SuccubusBallSkillSystem.initCharmState(this);
    }

    if (SuccubusBallSkillSystem.isSuccubusFighter(this)) {
      SuccubusBallSkillSystem.initFighter(this);
    }

    if (GangsterBallSkillSystem.isGangsterBoss(this)) {
      GangsterBallSkillSystem.initFighter(this);
    }

    if (SpikeReflectSystem.isSpikeFighter(this)) {
      SpikeReflectSystem.initFighter(this);
    }

    this.defenseRestrictUntil = 0;
    this.defenseRestrictSpeedRatio = 1;

    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.initFighter(this);
    }

    if (typeof BallTouchBonusSystem !== "undefined") {
      BallTouchBonusSystem.initFighter(this);
    }

    this.weaponCharge = null;
    this.weaponPickupFlashUntil = 0;
    this.weaponUseFlashUntil = 0;
    this.weaponGrenadeFlashUntil = 0;
    this.weaponDaggerSlashUntil = 0;
    this.lastWeaponUseTime = 0;
    this.weaponInvincibleUntil = 0;
    this.weaponBloodHealFlashUntil = 0;
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

  takeDamage(amount, attacker, skipReflect, isTrueDamage) {
    if (SwordBladeSkillSystem.isInvincible(this)) {
      return;
    }
    if (
      typeof WeaponBoxCombatSystem !== "undefined" &&
      WeaponBoxCombatSystem.isInvincible(this)
    ) {
      return;
    }

    if (DefenseBallSkillSystem.isDefenseFighter(this)) {
      DefenseBallSkillSystem.takeDamage(
        this,
        amount,
        attacker,
        skipReflect,
        isTrueDamage
      );
      return;
    }

    let finalAmount = amount;
    if (typeof IceRotSkillSystem !== "undefined") {
      finalAmount = IceRotSkillSystem.applyVulnerabilityDamage(
        this,
        finalAmount,
        attacker
      );
    }
    const wasAlive = this.isAlive();
    this.health = Math.max(0, this.health - finalAmount);
    SpikeReflectSystem.tryReflect(this, attacker, skipReflect);
    if (
      wasAlive &&
      !this.isAlive() &&
      attacker &&
      typeof WhiteJadeBallSkillSystem !== "undefined"
    ) {
      WhiteJadeBallSkillSystem.onEnemyKilled(attacker, this);
    }
  }

  isAlive() {
    return this.health > 0;
  }

  canUseSkill(now) {
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isAttackBlocked(this)
    ) {
      return false;
    }
    let interval =
      typeof CrazyFightSkillSystem !== "undefined"
        ? CrazyFightSkillSystem.getSkillIntervalMs(
            this,
            this.template.skillIntervalMs
          )
        : this.template.skillIntervalMs;
    if (typeof BallTouchBonusSystem !== "undefined") {
      interval = Math.max(
        400,
        Math.round(interval * BallTouchBonusSystem.getSkillIntervalRatio(this))
      );
    }
    if (typeof SuccubusBallSkillSystem !== "undefined") {
      interval = Math.max(
        100,
        Math.round(
          interval * SuccubusBallSkillSystem.getCharmAttackIntervalRatio(this)
        )
      );
    }
    return now - this.lastSkillTime >= interval;
  }

  getSkillDamage(baseDamage) {
    let damage =
      baseDamage !== undefined ? baseDamage : this.template.skillDamage;
    if (typeof CrazyFightSkillSystem !== "undefined") {
      damage = CrazyFightSkillSystem.getSkillDamage(this, damage);
    }
    if (typeof FactionBallSkillSystem !== "undefined") {
      damage = FactionBallSkillSystem.applyDamageBonus(this, damage);
    }
    return damage;
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
      this.drawBoxingPunch(ctx);
    }

    if (this.template.skillType === HeroSkillType.SPIKE) {
      this.drawSpikeRing(ctx);
    }

    if (this.template.skillType === HeroSkillType.BROKEN_BLADE) {
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

    if (this.template.skillType === HeroSkillType.SWORD_BLADE) {
      SwordBladeSkillSystem.draw(ctx, this);
    }

    if (this.template.skillType === HeroSkillType.ICE_ROT) {
      IceRotSkillSystem.draw(ctx, this);
    }

    if (this.template.skillType === HeroSkillType.TRACKING) {
      TrackingBallSkillSystem.draw(ctx, this);
    }

    if (this.template.skillType === HeroSkillType.CYCLONE_MECHA) {
      CycloneMechaSkillSystem.draw(ctx, this);
    }

    if (this.template.skillType === HeroSkillType.MEDICAL) {
      MedicalSkillSystem.draw(ctx, this);
    }

    if (this.template.skillType === HeroSkillType.WEAPON_BALL) {
      WeaponBallSkillSystem.draw(ctx, this);
    }

    if (this.template.skillType === HeroSkillType.WHITE_JADE) {
      WhiteJadeBallSkillSystem.draw(ctx, this);
    }

    if (this.template.skillType === HeroSkillType.FACTION) {
      FactionBallSkillSystem.drawFactionBall(ctx, this);
    }

    if (this.template.skillType === HeroSkillType.GIANT_TEETH) {
      GiantTeethSkillSystem.draw(ctx, this);
    }

    if (this.template.skillType === HeroSkillType.SHOW_OFF) {
      ShowOffBallSkillSystem.draw(ctx, this);
    }

    if (this.template.skillType === HeroSkillType.SUCCUBUS) {
      SuccubusBallSkillSystem.draw(ctx, this);
    }

    if (typeof SuccubusBallSkillSystem !== "undefined") {
      SuccubusBallSkillSystem.drawCharmAura(ctx, this);
      SuccubusBallSkillSystem.drawSeductionMark(ctx, this);
    }

    if (typeof GangsterBallSkillSystem !== "undefined") {
      GangsterBallSkillSystem.drawBoss(ctx, this);
      GangsterBallSkillSystem.drawMinion(ctx, this);
    }

    if (typeof HeroSimulationMode !== "undefined") {
      HeroSimulationMode.drawDummyBadge(ctx, this);
    }

    if (typeof FactionBallSkillSystem !== "undefined") {
      FactionBallSkillSystem.drawResonanceAura(ctx, this);
    }

    if (this.isWhiteJadeSummon) {
      WhiteJadeBallSkillSystem.drawSummon(ctx, this);
    }

    if (typeof BallTouchBonusSystem !== "undefined") {
      BallTouchBonusSystem.draw(ctx, this);
    }

    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.drawStatus(ctx, this);
    }

    if (typeof WeaponBoxCombatSystem !== "undefined") {
      WeaponBoxCombatSystem.drawFighterWeaponBadge(ctx, this);
    }

    if (typeof CrazyFightSkillSystem !== "undefined") {
      CrazyFightSkillSystem.drawAura(ctx, this);
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

    if (this.spikeReflectsRemaining !== undefined) {
      ctx.fillStyle =
        this.spikeReflectsRemaining > 0 ? "#d8f5a2" : "#868e96";
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        this.spikeReflectsRemaining > 0
          ? `反伤${this.spikeReflectsRemaining}`
          : "已钝",
        this.x,
        this.y + this.radius + 22
      );
      ctx.textAlign = "left";
    }
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
    let minSpeed = LittleBallHeroConstants.MIN_BOUNCE_SPEED;
    let maxSpeed = LittleBallHeroConstants.MAX_BOUNCE_SPEED;
    if (typeof FactionBallSkillSystem !== "undefined") {
      const moveMultiplier = FactionBallSkillSystem.getMoveSpeedMultiplier(ball);
      minSpeed *= moveMultiplier;
      maxSpeed *= moveMultiplier;
    }
    const angle = ball.getMoveAngle();

    if (speed < minSpeed) {
      ball.vx = Math.cos(angle) * minSpeed;
      ball.vy = Math.sin(angle) * minSpeed;
    } else if (speed > maxSpeed) {
      ball.vx = (ball.vx / speed) * maxSpeed;
      ball.vy = (ball.vy / speed) * maxSpeed;
    }

    if (typeof IceRotSkillSystem !== "undefined") {
      const slowRatio = IceRotSkillSystem.getMoveSpeedRatio(ball);
      if (slowRatio < 1) {
        ball.vx *= slowRatio;
        ball.vy *= slowRatio;
      }
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

  static resolveBallCollision(a, b, options) {
    const config = options || {};
    const applyBumpDamage = config.applyBumpDamage !== false;
    const game = config.game || null;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const minDist = a.radius + b.radius;

    if (dist >= minDist) {
      return;
    }

    let nx = 0;
    let ny = 0;
    if (dist < 0.001) {
      nx = 1;
      ny = 0;
    } else {
      nx = dx / dist;
      ny = dy / dist;
    }

    const overlap = minDist - (dist < 0.001 ? 0 : dist);
    const totalMass = a.mass + b.mass;

    a.x -= (nx * overlap * b.mass) / totalMass;
    a.y -= (ny * overlap * b.mass) / totalMass;
    b.x += (nx * overlap * a.mass) / totalMass;
    b.y += (ny * overlap * a.mass) / totalMass;

    const dvx = a.vx - b.vx;
    const dvy = a.vy - b.vy;
    const impact = dvx * nx + dvy * ny;
    if (impact <= 0) {
      const repulse = 1.8;
      a.vx -= nx * repulse;
      a.vy -= ny * repulse;
      b.vx += nx * repulse;
      b.vy += ny * repulse;
      ContinuousBouncePhysics.maintainSpeed(a);
      ContinuousBouncePhysics.maintainSpeed(b);
      return;
    }

    const restitution = LittleBallHeroConstants.BALL_BOUNCE;
    const impulse = (2 * impact * restitution) / totalMass;
    a.vx -= impulse * b.mass * nx;
    a.vy -= impulse * b.mass * ny;
    b.vx += impulse * a.mass * nx;
    b.vy += impulse * a.mass * ny;

    if (applyBumpDamage) {
      const allowTeamBumpDamage =
        !game ||
        typeof game.isTeamBattle !== "function" ||
        !game.isTeamBattle() ||
        HeroTeamRegistry.areEnemies(a.playerId, b.playerId);
      if (allowTeamBumpDamage) {
        const touchDamage = LittleBallHeroConstants.BUMP_DAMAGE;
        a.takeDamage(touchDamage, b);
        b.takeDamage(touchDamage, a);
      }
    }

    ContinuousBouncePhysics.maintainSpeed(a);
    ContinuousBouncePhysics.maintainSpeed(b);
  }
}

/**
 * 自动技能系统
 */
class HeroAutoSkillSystem {
  static tryUseSkill(fighter, opponent, projectiles, projectileRadius, game) {
    const now = Date.now();
    if (!opponent || !opponent.isAlive()) {
      return;
    }
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isAttackBlocked(fighter)
    ) {
      return;
    }

    if (
      typeof WeaponBoxCombatSystem !== "undefined" &&
      WeaponBoxCombatSystem.tryUseWeapon(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        now,
        game
      )
    ) {
      return;
    }

    const template = fighter.template;

    if (template.skillType === HeroSkillType.TRACKING) {
      return;
    }

    if (template.skillType === HeroSkillType.CYCLONE_MECHA) {
      return;
    }

    if (template.skillType === HeroSkillType.MEDICAL) {
      return;
    }

    if (template.skillType === HeroSkillType.FACTION) {
      return;
    }

    if (template.skillType === HeroSkillType.GIANT_TEETH) {
      return;
    }

    if (template.skillType === HeroSkillType.SHOW_OFF) {
      ShowOffBallSkillSystem.tryAttack(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        now
      );
      return;
    }

    if (template.skillType === HeroSkillType.SUCCUBUS) {
      return;
    }

    if (template.skillType === HeroSkillType.GANGSTER) {
      return;
    }

    if (template.skillType === HeroSkillType.WEAPON_BALL) {
      WeaponBallSkillSystem.tickSkill(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        game,
        now
      );
      return;
    }

    if (template.skillType === HeroSkillType.WHITE_JADE) {
      return;
    }

    if (template.skillType === HeroSkillType.SWORD_BLADE) {
      if (SwordBladeSkillSystem.canUseUltimate(fighter, now)) {
        SwordBladeSkillSystem.activateUltimate(fighter);
      }
      return;
    }

    if (template.skillType === HeroSkillType.ICE_ROT) {
      const keepIceInCrazy =
        typeof CrazyFightSkillSystem !== "undefined" &&
        CrazyFightSkillSystem.shouldIceRotKeepIceShots(game);
      const allowIceShots =
        !IceRotSkillSystem.isCrazyBurst(fighter) || keepIceInCrazy;
      if (allowIceShots && fighter.canUseSkill(now)) {
        fighter.markSkillUsed(now);
        IceRotSkillSystem.fireIceBall(
          fighter,
          opponent,
          projectiles,
          projectileRadius,
          game
        );
      }
      return;
    }

    if (template.skillType === HeroSkillType.BROKEN_BLADE) {
      return;
    }

    if (!fighter.canUseSkill(now)) {
      return;
    }

    if (template.skillType === HeroSkillType.SPIKE) {
      return;
    }

    if (template.skillType === HeroSkillType.BOXING) {
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
        fighter.getSkillDamage()
      );
      return;
    }

    if (template.skillType === HeroSkillType.IRON_WALL) {
      fighter.markSkillUsed(now);
      HeroAutoSkillSystem.fireIronWallStrike(fighter, opponent, fighter.getSkillDamage());
      return;
    }

    if (template.skillType === HeroSkillType.ELEMENT_BURST) {
      fighter.markSkillUsed(now);
      ElementBurstSystem.summonOrbitBullets(fighter, fighter.getSkillDamage());
      return;
    }

    if (template.skillType === HeroSkillType.ORANGE_CALC) {
      fighter.markSkillUsed(now);
      HeroAutoSkillSystem.fireOrangeCalc(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        fighter.getSkillDamage()
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
      HeroAutoSkillSystem.fireShot(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        fighter.getSkillDamage()
      );
      return;
    }

    if (template.skillType === HeroSkillType.PULSE) {
      HeroAutoSkillSystem.firePulse(fighter, opponent, fighter.getSkillDamage());
      return;
    }

    if (template.skillType === HeroSkillType.BUMP) {
      HeroAutoSkillSystem.fireBump(fighter, opponent, fighter.getSkillDamage());
      return;
    }

    if (template.skillType === HeroSkillType.REVOLVER) {
      HeroAutoSkillSystem.fireRevolver(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        fighter.getSkillDamage()
      );
      return;
    }

    if (template.skillType === HeroSkillType.SUNGLASSES) {
      HeroAutoSkillSystem.fireSunglasses(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        fighter.getSkillDamage(),
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

    const strikeDamage = IronWallSkillSystem.getStrikeDamage();
    if (dist <= LittleBallHeroConstants.PULSE_RANGE + opponent.radius) {
      opponent.takeDamage(strikeDamage, fighter);
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

    const procChance =
      typeof CrazyFightSkillSystem !== "undefined"
        ? CrazyFightSkillSystem.getFlamethrowerProcChance(fighter)
        : LittleBallHeroConstants.FLAMETHROWER_PROC_CHANCE;
    if (Math.random() >= procChance) {
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
    OrangeCalcSkillSystem.recordAttackDamage(fighter, attackDamage, baseDamage);

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

  static fireShot(fighter, opponent, projectiles, radius, damage, bulletColor) {
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
        bulletColor || fighter.color,
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
    this.isPaused = false;
    this.frozenRemainingMs = limitMs;
  }

  getRemainingMs() {
    if (this.isPaused) {
      return this.frozenRemainingMs;
    }
    return Math.max(0, this.limitMs - (Date.now() - this.startTime));
  }

  isExpired() {
    return this.getRemainingMs() <= 0;
  }

  reset() {
    this.isPaused = false;
    this.startTime = Date.now();
    this.frozenRemainingMs = this.limitMs;
  }

  pause() {
    if (this.isPaused) {
      return;
    }
    this.frozenRemainingMs = this.getRemainingMs();
    this.isPaused = true;
  }

  resume() {
    if (!this.isPaused) {
      return;
    }
    this.startTime = Date.now() - (this.limitMs - this.frozenRemainingMs);
    this.isPaused = false;
  }
}

/**
 * 英雄战场辅助：多目标寻敌与碰撞
 */
class HeroBattleArenaHelper {
  static getEffectivePlayerId(fighter) {
    if (!fighter) {
      return null;
    }
    if (fighter.succubusCharmOwnerPlayerId) {
      return fighter.succubusCharmOwnerPlayerId;
    }
    return fighter.summonOwnerPlayerId || fighter.playerId;
  }

  static areAllies(fighterA, fighterB, game) {
    const idA = HeroBattleArenaHelper.getEffectivePlayerId(fighterA);
    const idB = HeroBattleArenaHelper.getEffectivePlayerId(fighterB);
    if (
      game &&
      typeof game.isTeamBattle === "function" &&
      game.isTeamBattle()
    ) {
      return !HeroTeamRegistry.areEnemies(idA, idB);
    }
    return idA === idB;
  }

  static getAliveOpponents(fighter, allFighters, game) {
    return allFighters.filter((other) => {
      if (!other.isAlive()) {
        return false;
      }
      return !HeroBattleArenaHelper.areAllies(fighter, other, game);
    });
  }

  static getNearestOpponent(fighter, allFighters, game) {
    let opponents = HeroBattleArenaHelper.getAliveOpponents(
      fighter,
      allFighters,
      game
    );
    if (game && typeof game.isTeamBattle === "function" && game.isTeamBattle()) {
      const effectiveId = HeroBattleArenaHelper.getEffectivePlayerId(fighter);
      opponents = opponents.filter((opponent) =>
        HeroTeamRegistry.areEnemies(
          effectiveId,
          HeroBattleArenaHelper.getEffectivePlayerId(opponent)
        )
      );
    }
    let nearest = null;
    let nearestDistance = Infinity;

    for (const opponent of opponents) {
      const distance = Math.hypot(
        opponent.x - fighter.x,
        opponent.y - fighter.y
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = opponent;
      }
    }

    return nearest;
  }

  static resolveAllBallCollisions(fighters, game) {
    for (let i = 0; i < fighters.length; i += 1) {
      for (let j = i + 1; j < fighters.length; j += 1) {
        const fighterA = fighters[i];
        const fighterB = fighters[j];
        if (!fighterA.isAlive() || !fighterB.isAlive()) {
          continue;
        }
        if (
          typeof TrackingBallSkillSystem !== "undefined" &&
          TrackingBallSkillSystem.resolveContactPair(fighterA, fighterB, game)
        ) {
          continue;
        }
        ContinuousBouncePhysics.resolveBallCollision(fighterA, fighterB, {
          game,
        });
      }
    }
  }

  static createFighterAtSpawn(playerId, template, spawn, arena, radius) {
    const centerX = (arena.left + arena.right) / 2;
    const centerY = (arena.top + arena.bottom) / 2;
    const direction = new DirectionVector(
      centerX - spawn.x,
      centerY - spawn.y
    ).normalize();
    const dirX =
      direction.x !== 0 || direction.y !== 0
        ? direction.x
        : playerId % 2 === 1
          ? 1
          : -1;
    const dirY =
      direction.x !== 0 || direction.y !== 0 ? direction.y : 0.2;

    return new HeroBallFighter(
      playerId,
      template,
      spawn.x,
      spawn.y,
      radius,
      dirX,
      dirY
    );
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
    this.pickStepEnteredAt = 0;
    this.fighters = [];
    this.projectiles = [];
    this.p1HeroId = null;
    this.p2HeroId = null;
    this.p3HeroId = null;
    this.p4HeroId = null;
    this.takenHeroIds = new Set();
    this.teamBattleManager = null;
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
    const heroes = this.customRoster || HeroRoster.getAll();
    return HeroRoster.filterHeroesForSubMode(heroes, this.subMode);
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
    if (typeof GameSessionControls !== "undefined") {
      GameSessionControls.prepareGame(this);
    } else {
      this.isPaused = false;
    }
    this.phase = "pick";
    this.pickStep = 1;
    this.p1HeroId = null;
    this.p2HeroId = null;
    this.p3HeroId = null;
    this.p4HeroId = null;
    this.takenHeroIds = new Set();
    this.fighters = [];
    this.projectiles = [];
    if (subMode === "team_battle") {
      this.teamBattleManager = new TeamBattleRoundManager(
        LittleBallHeroConstants.TEAM_BATTLE_MAX_ROUNDS
      );
    } else {
      this.teamBattleManager = null;
    }
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

  isFourPlayer() {
    return this.subMode === "four_player";
  }

  isTeamBattle() {
    return this.subMode === "team_battle";
  }

  isCrazyFight() {
    return this.subMode === "crazy_fight";
  }

  isTraining() {
    return this.subMode === "training";
  }

  isSimulation() {
    return this.subMode === "simulation";
  }

  isMultiplayerFourBall() {
    return this.isFourPlayer() || this.isTeamBattle();
  }

  getBattlePlayerCount() {
    if (this.isMultiplayerFourBall()) {
      return LittleBallHeroConstants.FOUR_PLAYER_COUNT;
    }
    return GameConstants.DUAL_PLAYER_COUNT;
  }

  getHumanPickCount() {
    if (this.subMode === "training" || this.subMode === "simulation") {
      return 1;
    }
    if (this.subMode === "four_player" || this.subMode === "team_battle") {
      return LittleBallHeroConstants.FOUR_PLAYER_COUNT;
    }
    return GameConstants.DUAL_PLAYER_COUNT;
  }

  canPlayerPickNow() {
    if (this.state !== "playing" || this.phase !== "pick") {
      return false;
    }
    const humanPickCount = this.getHumanPickCount();
    return this.pickStep >= 1 && this.pickStep <= humanPickCount;
  }

  getPickBlockingMessage() {
    if (this.state !== "playing") {
      return "对局已结束，请返回主菜单";
    }
    if (this.phase === "battle") {
      const humanPickCount = this.getHumanPickCount();
      const waitingHeroId = this.getHeroIdForPickStep(this.pickStep);
      if (
        this.pickStep >= 1 &&
        this.pickStep <= humanPickCount &&
        !waitingHeroId
      ) {
        return `${this.getTeamLabelForStep(
          this.pickStep
        )}选球已超时，战斗已开始；请等待本回合结束后再选球`;
      }
      if (this.isTeamBattle()) {
        return "战斗进行中，本回合结束后将重新选球";
      }
      return "战斗进行中，请等待本局结束";
    }
    if (this.phase !== "pick") {
      return "当前不可选球，请等待回合切换";
    }
    const humanPickCount = this.getHumanPickCount();
    if (this.pickStep > humanPickCount) {
      return `当前为${this.getTeamLabelForStep(humanPickCount)}选球，请等待前序队伍完成`;
    }
    return "当前不可选球，请等待回合切换";
  }

  refreshPickTimer() {
    if (this.phase === "pick") {
      this.startPickTimer();
    }
  }

  getTeamLabelForStep(step) {
    return (
      LittleBallHeroConstants.TEAM_LABEL_BY_STEP[step] || `玩家${step}`
    );
  }

  getHeroIdForPickStep(step) {
    if (step === 1) {
      return this.p1HeroId;
    }
    if (step === 2) {
      return this.p2HeroId;
    }
    if (step === 3) {
      return this.p3HeroId;
    }
    if (step === 4) {
      return this.p4HeroId;
    }
    return null;
  }

  setHeroIdForPickStep(step, heroId) {
    if (step === 1) {
      this.p1HeroId = heroId;
      return;
    }
    if (step === 2) {
      this.p2HeroId = heroId;
      return;
    }
    if (step === 3) {
      this.p3HeroId = heroId;
      return;
    }
    if (step === 4) {
      this.p4HeroId = heroId;
    }
  }

  fillTrainingAiPick() {
    const available = this.getAvailableHeroes();
    const aiHero = this.pickRandomHero(available);
    this.p2HeroId = aiHero.id;
    this.takenHeroIds.add(aiHero.id);
  }

  startPickTimer() {
    this.pickTimer = new PickTimer(LittleBallHeroConstants.PICK_TIME_LIMIT_MS);
    this.pickStepEnteredAt = Date.now();
  }

  canAutoPickByTimer() {
    if (!this.pickTimer || !this.pickTimer.isExpired()) {
      return false;
    }
    const elapsedSinceStep = Date.now() - (this.pickStepEnteredAt || 0);
    return elapsedSinceStep >= LittleBallHeroConstants.PICK_STEP_GRACE_MS;
  }

  areAllBattleHeroesSelected() {
    if (this.isSimulation()) {
      return Boolean(this.p1HeroId);
    }
    const playerCount = this.getBattlePlayerCount();
    for (let step = 1; step <= playerCount; step += 1) {
      if (!this.getHeroIdForPickStep(step)) {
        return false;
      }
    }
    return true;
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
      p3HeroId: this.p3HeroId,
      p4HeroId: this.p4HeroId,
      playerCount: this.getBattlePlayerCount(),
      teamBattle: this.teamBattleManager
        ? this.teamBattleManager.getSnapshot()
        : null,
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
    if (available.length === 0) {
      return;
    }
    const hero = this.pickRandomHero(available);
    this.applyPick(hero.id, true);
  }

  applyPick(heroId, wasAuto) {
    if (this.phase !== "pick") {
      return;
    }
    this.setHeroIdForPickStep(this.pickStep, heroId);
    this.takenHeroIds.add(heroId);
    this.advancePick(wasAuto);
  }

  tryPickHero(heroId) {
    if (this.phase !== "pick" || this.takenHeroIds.has(heroId)) {
      return false;
    }
    const hero = this.getHeroById(heroId);
    if (!HeroRoster.isHeroAvailableInSubMode(hero, this.subMode)) {
      return false;
    }
    this.applyPick(heroId, false);
    return true;
  }

  advancePick(wasAuto) {
    const humanPickCount = this.getHumanPickCount();

    if (this.pickStep < humanPickCount) {
      this.pickStep += 1;
      this.startPickTimer();
      this.notifyPhase();
      return;
    }

    if (this.subMode === "training") {
      this.fillTrainingAiPick();
    }

    if (!this.areAllBattleHeroesSelected()) {
      return;
    }

    this.beginBattle();
  }

  spawnBattleFighters() {
    if (this.isSimulation()) {
      return HeroSimulationMode.spawnFighters(this);
    }

    const r = this.getBallRadius();
    const playerCount = this.getBattlePlayerCount();
    const spawnPoints = ArenaSpawnLayout.getPoints(
      this.arena,
      this.width,
      playerCount
    );
    const fighters = [];

    for (let index = 0; index < playerCount; index += 1) {
      const playerId = index + 1;
      const heroId = this.getHeroIdForPickStep(playerId);
      const template = this.getHeroById(heroId);
      const spawn = spawnPoints[index];
      fighters.push(
        HeroBattleArenaHelper.createFighterAtSpawn(
          playerId,
          template,
          spawn,
          this.arena,
          r
        )
      );
    }

    for (const fighter of fighters) {
      if (DefenseBallSkillSystem.isDefenseFighter(fighter)) {
        DefenseBallSkillSystem.rollDefenseItemForBattle(fighter);
      }
    }

    return fighters;
  }

  beginBattle() {
    if (!this.areAllBattleHeroesSelected()) {
      return;
    }

    this.fighters = this.spawnBattleFighters();
    if (
      this.isCrazyFight() &&
      typeof CrazyFightSkillSystem !== "undefined"
    ) {
      CrazyFightSkillSystem.activateAllFighters(this.fighters);
    }
    this.phase = "battle";
    this.projectiles = [];
    if (typeof WhiteJadeBallSkillSystem !== "undefined") {
      WhiteJadeBallSkillSystem.initBattle(this);
    }
    if (typeof GangsterBallSkillSystem !== "undefined") {
      GangsterBallSkillSystem.initBattle(this);
    }
    if (typeof HeroSimulationMode !== "undefined") {
      HeroSimulationMode.initBattle(this);
    }
    if (typeof WeaponBoxSpawnSystem !== "undefined") {
      WeaponBoxSpawnSystem.initBattle(this);
    }
    this.notifyPhase();
  }

  startTeamBattlePickPhase() {
    this.phase = "pick";
    this.pickStep = 1;
    this.p1HeroId = null;
    this.p2HeroId = null;
    this.p3HeroId = null;
    this.p4HeroId = null;
    this.takenHeroIds = new Set();
    this.fighters = [];
    this.projectiles = [];
    this.startPickTimer();
    this.notifyPhase();
  }

  canFighterDamageTarget(attacker, target) {
    if (!attacker || !target) {
      return true;
    }
    if (
      typeof GangsterBallSkillSystem !== "undefined" &&
      !GangsterBallSkillSystem.canDamage(attacker, target)
    ) {
      return false;
    }
    if (HeroBattleArenaHelper.areAllies(attacker, target, this)) {
      return false;
    }
    return true;
  }

  updatePickPhase() {
    if (this.canAutoPickByTimer()) {
      this.autoPickForCurrentStep();
    }
  }

  getCurrentPickerTeamLabel() {
    return this.getTeamLabelForStep(this.pickStep);
  }

  getPickInputContext() {
    const context = {
      emptyHint: "输入角色名或编号，下方显示对弈编号",
      blockedByTeam: "对方",
      pickStep: this.pickStep,
      currentPickerLabel: this.getTeamLabelForStep(this.pickStep),
    };

    const previousPicks = [];
    for (let step = 1; step < this.pickStep; step += 1) {
      const heroId = this.getHeroIdForPickStep(step);
      if (heroId) {
        const hero = this.getHeroById(heroId);
        previousPicks.push(`${this.getTeamLabelForStep(step)}【${hero.name}】`);
      }
    }

    if (previousPicks.length > 0) {
      context.emptyHint = `已选：${previousPicks.join("、")}；${this.getTeamLabelForStep(
        this.pickStep
      )}请输入其他角色名或编号`;
      context.blockedByTeam = this.getTeamLabelForStep(1);
    }

    return context;
  }

  tryPickByInput(rawInput) {
    if (!this.canPlayerPickNow()) {
      if (
        this.phase === "pick" &&
        this.pickStep > 1 &&
        this.subMode === "training" ||
        this.subMode === "simulation"
      ) {
        return {
          ok: false,
          message:
            this.subMode === "simulation"
              ? "模拟场仅试球一次选球，请重新开局换球"
              : "训练场仅红队手动选球，请使用「双人模式」或「四人模式」",
        };
      }
      return {
        ok: false,
        message:
          typeof this.getPickBlockingMessage === "function"
            ? this.getPickBlockingMessage()
            : "当前不可选球",
      };
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
    if (index === 14) {
      return "Backslash";
    }
    if (index === 15) {
      return "Semicolon";
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
    if (heroCount === 14) {
      return "1-9、0、-、=、[、]";
    }
    if (heroCount === 15) {
      return "1-9、0、-、=、[、]、\\";
    }
    return "1-9、0、-、=、[、]、\\、; 或输入 16";
  }

  updateBattle() {
    const fighters = this.fighters.filter((fighter) => fighter);
    if (fighters.length < 2) {
      return;
    }

    const now = Date.now();

    for (const fighter of fighters) {
      if (!fighter.isAlive()) {
        continue;
      }
      if (!ElementStatusEffectSystem.isFrozen(fighter)) {
        if (
          typeof SuccubusBallSkillSystem !== "undefined" &&
          SuccubusBallSkillSystem.isCharmed(fighter)
        ) {
          SuccubusBallSkillSystem.updateCharmedMovement(
            fighter,
            fighters,
            this,
            this.arena,
            now
          );
        } else if (
          typeof GangsterBallSkillSystem !== "undefined" &&
          GangsterBallSkillSystem.isGangMinion(fighter)
        ) {
          GangsterBallSkillSystem.updateMinionMovement(
            fighter,
            fighters,
            this,
            this.arena
          );
        } else if (
          typeof TrackingBallSkillSystem !== "undefined" &&
          TrackingBallSkillSystem.isTrackingFighter(fighter)
        ) {
          const chaseTarget = HeroBattleArenaHelper.getNearestOpponent(
            fighter,
            fighters,
            this
          );
          TrackingBallSkillSystem.updateMovement(
            fighter,
            chaseTarget,
            this.arena
          );
        } else {
          ContinuousBouncePhysics.updateBall(fighter, this.arena);
        }
      }
    }

    HeroBattleArenaHelper.resolveAllBallCollisions(fighters, this);

    if (typeof SuccubusBallSkillSystem !== "undefined") {
      SuccubusBallSkillSystem.tickCharmMaintenance(fighters);
    }

    for (const fighter of fighters) {
      if (typeof BallTouchBonusSystem !== "undefined") {
        BallTouchBonusSystem.updateTouchState(fighter, fighters, this);
      }
      ElementStatusEffectSystem.tickFighter(fighter, now);
      DefenseBallSkillSystem.tickMovementRestriction(fighter, now);
      if (
        typeof BallTouchBonusSystem !== "undefined"
      ) {
        BallTouchBonusSystem.tickContactBonus(fighter, fighters, this, now);
      }
      if (
        typeof TrackingBallSkillSystem !== "undefined" &&
        TrackingBallSkillSystem.isTrackingFighter(fighter)
      ) {
        TrackingBallSkillSystem.tickContact(fighter, fighters, this, now);
      }
      if (
        typeof CycloneMechaSkillSystem !== "undefined" &&
        CycloneMechaSkillSystem.isCycloneMechaFighter(fighter)
      ) {
        CycloneMechaSkillSystem.tick(
          fighter,
          fighters,
          this,
          this.projectiles,
          now
        );
      }
      if (BoxingSkillSystem.isBoxingFighter(fighter)) {
        BoxingSkillSystem.tickContact(fighter, fighters, this, now);
      }
      if (BrokenBladeSkillSystem.isBladeFighter(fighter)) {
        BrokenBladeSkillSystem.tick(fighter, fighters, this, now);
      }
      if (SwordBladeSkillSystem.isSwordFighter(fighter)) {
        SwordBladeSkillSystem.tickContact(fighter, fighters, this, now);
      }
      if (MedicalSkillSystem.isMedicalFighter(fighter)) {
        MedicalSkillSystem.tickHeal(fighter, fighters, this, now);
      }
      if (FactionBallSkillSystem.isFactionFighter(fighter)) {
        FactionBallSkillSystem.tickResonance(fighter, fighters, this, now);
      }
      if (GiantTeethSkillSystem.isGiantTeethFighter(fighter)) {
        GiantTeethSkillSystem.tick(fighter, fighters, this, now);
      }
      if (SuccubusBallSkillSystem.isSuccubusFighter(fighter)) {
        SuccubusBallSkillSystem.tickSeduce(fighter, fighters, this, now);
      }
    }

    if (typeof GangsterBallSkillSystem !== "undefined") {
      GangsterBallSkillSystem.tick(this, fighters, now);
    }

    if (typeof HeroSimulationMode !== "undefined") {
      HeroSimulationMode.tick(this, now);
    }

    for (let i = 0; i < fighters.length; i += 1) {
      for (let j = i + 1; j < fighters.length; j += 1) {
        const fighterA = fighters[i];
        const fighterB = fighters[j];
        MagnetSkillSystem.tick(
          fighterA,
          fighterB,
          this.projectiles,
          fighters,
          this.arena,
          now
        );
        MagnetSkillSystem.tick(
          fighterB,
          fighterA,
          this.projectiles,
          fighters,
          this.arena,
          now
        );
        MagnetSkillSystem.onBallContact(fighterA, fighterB, fighters, now);
        MagnetSkillSystem.onBallContact(fighterB, fighterA, fighters, now);
      }
    }

    for (const fighter of fighters) {
      if (!fighter.isAlive()) {
        continue;
      }
      if (
        typeof GangsterBallSkillSystem !== "undefined" &&
        GangsterBallSkillSystem.isGangMinion(fighter)
      ) {
        continue;
      }
      if (
        typeof HeroSimulationMode !== "undefined" &&
        HeroSimulationMode.isSimulationDummy(fighter)
      ) {
        continue;
      }
      const opponent = HeroBattleArenaHelper.getNearestOpponent(
        fighter,
        fighters,
        this
      );
      if (!opponent) {
        continue;
      }

      if (
        typeof ElementStatusEffectSystem === "undefined" ||
        !ElementStatusEffectSystem.isAttackBlocked(fighter)
      ) {
        if (WhiteJadeBallSkillSystem.isWhiteJadeFighter(fighter)) {
          WhiteJadeBallSkillSystem.tickFire(
            fighter,
            opponent,
            this.projectiles,
            this.getProjectileRadius(),
            now
          );
        }
        HeroAutoSkillSystem.tryUseSkill(
          fighter,
          opponent,
          this.projectiles,
          this.getProjectileRadius(),
          this
        );
      }

      if (
        typeof ElementStatusEffectSystem === "undefined" ||
        !ElementStatusEffectSystem.isAttackBlocked(fighter)
      ) {
        ElementBurstSystem.updateOrbitBullets(fighter, opponent, fighters);
      }

      if (
        typeof ElementStatusEffectSystem === "undefined" ||
        !ElementStatusEffectSystem.isAttackBlocked(fighter)
      ) {
        IceRotSkillSystem.tick(fighter, opponent, now);
      }
    }

    if (typeof WeaponBoxSpawnSystem !== "undefined") {
      WeaponBoxSpawnSystem.tick(this, now);
    }

    if (typeof WhiteJadeBallSkillSystem !== "undefined") {
      WhiteJadeBallSkillSystem.processPendingSummons(fighters, this);
    }

    this.updateProjectiles();
    this.checkBattleOutcome();
  }

  checkBattleOutcome() {
    if (this.isSimulation()) {
      return;
    }
    if (this.isTeamBattle()) {
      this.checkTeamBattleOutcome();
      return;
    }

    const aliveFighters = this.fighters.filter(
      (fighter) =>
        fighter.isAlive() &&
        !(
          typeof GangsterBallSkillSystem !== "undefined" &&
          GangsterBallSkillSystem.isGangMinion(fighter)
        )
    );
    const aliveSides = new Set(
      aliveFighters.map((fighter) =>
        HeroBattleArenaHelper.getEffectivePlayerId(fighter)
      )
    );
    if (aliveSides.size <= 1 && aliveFighters.length > 0) {
      const winner = aliveFighters[0];
      this.endGame(HeroBattleArenaHelper.getEffectivePlayerId(winner));
    }
  }

  checkTeamBattleOutcome() {
    const redBlueAlive = this.fighters.filter(
      (fighter) =>
        fighter.isAlive() &&
        !(
          typeof GangsterBallSkillSystem !== "undefined" &&
          GangsterBallSkillSystem.isGangMinion(fighter)
        ) &&
        HeroTeamRegistry.isRedBlueTeam(
          HeroBattleArenaHelper.getEffectivePlayerId(fighter)
        )
    );
    const greenPurpleAlive = this.fighters.filter(
      (fighter) =>
        fighter.isAlive() &&
        !(
          typeof GangsterBallSkillSystem !== "undefined" &&
          GangsterBallSkillSystem.isGangMinion(fighter)
        ) &&
        HeroTeamRegistry.isGreenPurpleTeam(
          HeroBattleArenaHelper.getEffectivePlayerId(fighter)
        )
    );

    if (redBlueAlive.length > 0 && greenPurpleAlive.length > 0) {
      return;
    }

    const roundWinnerTeamId =
      redBlueAlive.length > 0
        ? HeroTeamRegistry.TEAM_RED_BLUE
        : HeroTeamRegistry.TEAM_GREEN_PURPLE;

    this.teamBattleManager.recordRoundWin(roundWinnerTeamId);

    const seriesWinner = this.teamBattleManager.evaluateSeriesEnd();
    if (seriesWinner) {
      this.endGame(seriesWinner);
      return;
    }

    this.teamBattleManager.advanceToNextRound();
    this.startTeamBattlePickPhase();
  }

  updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const proj = this.projectiles[i];

      if (proj instanceof TeacherNumberProjectile) {
        proj.update();

        if (!proj.alive || proj.isOutOfBounds(this.arena)) {
          this.projectiles.splice(i, 1);
          continue;
        }

        const target = proj.target;
        if (
          target &&
          target.isAlive() &&
          this.canFighterDamageTarget(proj.ownerFighter, target) &&
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

      if (proj instanceof CycloneMechaHomingMissile) {
        proj.update();

        if (!proj.alive || proj.isOutOfBounds(this.arena)) {
          this.projectiles.splice(i, 1);
          continue;
        }

        const missileTarget = proj.target;
        if (
          missileTarget &&
          missileTarget.isAlive() &&
          this.canFighterDamageTarget(proj.ownerFighter, missileTarget) &&
          CollisionDetector.circleHitsCircle(
            proj.x,
            proj.y,
            proj.radius,
            missileTarget.x,
            missileTarget.y,
            missileTarget.radius
          )
        ) {
          missileTarget.takeDamage(proj.damage, proj.ownerFighter);
          proj.alive = false;
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
          if (!fighter.isAlive()) {
            continue;
          }
          if (!this.canFighterDamageTarget(owner, fighter)) {
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
          const shooter = this.getFighter(proj.ownerId);
          if (!this.canFighterDamageTarget(shooter, fighter)) {
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
            fighter.takeDamage(proj.damage, shooter);
            proj.alive = false;
            this.projectiles.splice(i, 1);
            break;
          }
        }
        continue;
      }

      if (proj instanceof IceRotProjectile) {
        proj.update();

        if (!proj.alive || proj.isOutOfBounds(this.arena)) {
          this.projectiles.splice(i, 1);
          continue;
        }

        for (const fighter of this.fighters) {
          if (fighter.playerId === proj.ownerId || !fighter.isAlive()) {
            continue;
          }
          const shooter = this.getFighter(proj.ownerId);
          if (!this.canFighterDamageTarget(shooter, fighter)) {
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
            IceRotSkillSystem.handleProjectileHit(fighter, proj);
            proj.alive = false;
            this.projectiles.splice(i, 1);
            break;
          }
        }
        continue;
      }

      if (proj instanceof WeaponBoxProjectile) {
        proj.update();

        if (!proj.alive || proj.isOutOfBounds(this.arena)) {
          this.projectiles.splice(i, 1);
          continue;
        }

        for (const fighter of this.fighters) {
          if (fighter.playerId === proj.ownerId || !fighter.isAlive()) {
            continue;
          }
          const shooter = this.getFighter(proj.ownerId);
          if (!this.canFighterDamageTarget(shooter, fighter)) {
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
            proj.onHitTarget(fighter, this.fighters);
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
        const shooter = this.getFighter(proj.ownerId);
        if (!this.canFighterDamageTarget(shooter, fighter)) {
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

    const phaseAtFrameStart = this.phase;
    if (phaseAtFrameStart === "battle") {
      this.updateBattle();
      if (this.phase === "pick") {
        this.updatePickPhase();
      }
    } else if (phaseAtFrameStart === "pick") {
      this.updatePickPhase();
    }

    this.notifyPhase();
    this.input.clearFrame();
  }

  drawPickScreen() {
    const heroes = this.getHeroes();
    const remainingSec = Math.ceil(
      (this.pickTimer ? this.pickTimer.getRemainingMs() : 0) / 1000
    );
    const pickerLabel = `${this.getTeamLabelForStep(this.pickStep)}（玩家${this.pickStep}）选球${
      this.isMultiplayerFourBall()
        ? " · 不可与已选队伍重复"
        : ""
    }`;

    if (this.isTeamBattle() && this.teamBattleManager) {
      const score = this.teamBattleManager.getSnapshot();
      this.ctx.fillStyle = "#ffd43b";
      this.ctx.font = "bold 16px system-ui, sans-serif";
      this.ctx.fillText(
        `第 ${score.roundNumber}/${score.maxRounds} 回合选球 · 红蓝 ${score.redBlueWins} : ${score.greenPurpleWins} 绿紫`,
        this.width / 2,
        this.arena.top + 18
      );
    }

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

    if (typeof WeaponBoxSpawnSystem !== "undefined") {
      WeaponBoxSpawnSystem.draw(this.ctx, this);
    }

    for (const proj of this.projectiles) {
      proj.draw(this.ctx);
    }

    if (typeof GangsterBallSkillSystem !== "undefined") {
      GangsterBallSkillSystem.drawEventBanner(this.ctx, this);
    }

    if (typeof HeroSimulationMode !== "undefined") {
      HeroSimulationMode.drawArenaHint(this.ctx, this);
    }

    this.ctx.fillStyle = "rgba(255, 212, 59, 0.85)";
    this.ctx.font = "13px system-ui, sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      this.isSimulation()
        ? "模拟试球 · 中央试球 · 周围 9 颗红靶 · 无胜负可反复测试技能"
        : this.isTeamBattle()
        ? "双队团战 · 红蓝 vs 绿紫 · 30回合 · 每回合重选球 · 团灭对方获胜"
        : this.isCrazyFight()
          ? "疯狂对战 · 全场球体超强 · 寒冰狂暴仍发射冰弹"
          : this.isFourPlayer()
            ? "四球自动反弹混战 · 武器箱含匕首(3击共3伤)"
            : "双球自动反弹对打 · 武器箱含匕首(3击共3伤)",
      this.width / 2,
      this.arena.bottom + 28
    );
    this.ctx.textAlign = "left";
  }

  loop() {
    if (
      typeof GameSessionControls === "undefined" ||
      !GameSessionControls.shouldSkipUpdate(this)
    ) {
      this.update();
    }
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
    if (this.isSimulation()) {
      return "小球英雄 · 模拟试球";
    }
    if (this.subMode === "training") {
      return "小球英雄 · 训练场";
    }
    if (this.isCrazyFight()) {
      return "小球英雄 · 疯狂对战";
    }
    if (this.isTeamBattle()) {
      return "小球英雄 · 双队团战";
    }
    if (this.isFourPlayer()) {
      return "小球英雄 · 四人模式";
    }
    return "小球英雄 · 双人";
  }
}

HeroAutoSkillSystem.getFighterSkillLabel = function getFighterSkillLabel(fighter) {
  let baseLabel =
    fighter.template.skillDisplayName ||
    HeroAutoSkillSystem.getSkillLabel(fighter.template.skillType);
  if (
    typeof CrazyFightSkillSystem !== "undefined" &&
    CrazyFightSkillSystem.isSupercharged(fighter)
  ) {
    baseLabel = `${baseLabel}·超强`;
  }
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
    const left = OrangeCalcSkillSystem.getMultiplyRemaining(fighter);
    return left > 0
      ? `${baseLabel}·${nextDamage}·叠乘${left}`
      : `${baseLabel}·${nextDamage}·叠乘尽`;
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
  if (fighter.template.skillType === HeroSkillType.SPIKE) {
    const left =
      fighter.spikeReflectsRemaining !== undefined
        ? fighter.spikeReflectsRemaining
        : LittleBallHeroConstants.SPIKE_MAX_REFLECT_COUNT;
    return left > 0 ? `${baseLabel}·反伤${left}` : `${baseLabel}·已钝`;
  }
  if (fighter.template.skillType === HeroSkillType.SWORD_BLADE) {
    if (SwordBladeSkillSystem.isInvincible(fighter)) {
      return `${baseLabel}·无敌中`;
    }
    const cooldownSec = SwordBladeSkillSystem.getUltCooldownRemainingSec(
      fighter,
      Date.now()
    );
    if (cooldownSec > 0) {
      return `${baseLabel}·冷却${cooldownSec}s`;
    }
  }
  if (fighter.template.skillType === HeroSkillType.ICE_ROT) {
    const hp = IceRotSkillSystem.getCurrentHpDisplay(fighter);
    if (IceRotSkillSystem.isCrazyBurst(fighter)) {
      const iceTag =
        typeof CrazyFightSkillSystem !== "undefined" &&
        CrazyFightSkillSystem.isSupercharged(fighter)
          ? "·冰弹+狂暴"
          : "";
      return fighter.iceRotSwallowing
        ? `${baseLabel}·吞噬狂暴${hp}${iceTag}`
        : `${baseLabel}·狂暴${hp}·惧防卫近战${iceTag}`;
    }
    return `${baseLabel}·冰弹${hp}`;
  }
  if (fighter.template.skillType === HeroSkillType.TRACKING) {
    return `${baseLabel}·追踪追击`;
  }
  if (fighter.template.skillType === HeroSkillType.CYCLONE_MECHA) {
    const now = Date.now();
    if (CycloneMechaSkillSystem.isBursting(fighter, now)) {
      return `${baseLabel}·导弹齐射`;
    }
    const cooldownSec = CycloneMechaSkillSystem.getBurstCooldownRemainingSec(
      fighter,
      now
    );
    if (cooldownSec > 0) {
      return `${baseLabel}·导弹冷却${cooldownSec}s`;
    }
    const prepareSec = CycloneMechaSkillSystem.getBurstPrepareRemainingSec(
      fighter,
      now
    );
    if (prepareSec > 0) {
      return `${baseLabel}·导弹${prepareSec}s`;
    }
    return `${baseLabel}·触身近战`;
  }
  if (fighter.template.skillType === HeroSkillType.MEDICAL) {
    return `${baseLabel}·触身治疗`;
  }
  if (fighter.template.skillType === HeroSkillType.FACTION) {
    return FactionBallSkillSystem.hasResonance(fighter)
      ? `${baseLabel}·阵营共鸣中`
      : `${baseLabel}·触身共鸣`;
  }
  if (fighter.template.skillType === HeroSkillType.WEAPON_BALL) {
    const weaponLabel = fighter.weaponBallLastWeaponType
      ? WeaponType.getLabel(fighter.weaponBallLastWeaponType)
      : "待发射";
    return `${baseLabel}·${weaponLabel}`;
  }
  if (fighter.template.skillType === HeroSkillType.WHITE_JADE) {
    return `${baseLabel}·极速弹`;
  }
  if (fighter.template.skillType === HeroSkillType.GIANT_TEETH) {
    return `${baseLabel}·巨齿环绕`;
  }
  if (fighter.template.skillType === HeroSkillType.SHOW_OFF) {
    return `${baseLabel}·攻速${ShowOffBallSkillSystem.getIntervalDisplaySec(fighter)}s`;
  }
  if (fighter.template.skillType === HeroSkillType.SUCCUBUS) {
    const charmedCount = fighter.succubusCharmedCount || 0;
    return `${baseLabel}·舔狗${charmedCount}`;
  }
  if (fighter.template.skillType === HeroSkillType.GANGSTER) {
    const minionCount = fighter.gangActiveMinionCount || 0;
    return `${baseLabel}·黑帮事件·打手${minionCount}`;
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
    return `生命${LittleBallHeroConstants.IRON_WALL_MAX_HEALTH}+出击${LittleBallHeroConstants.IRON_WALL_STRIKE_DAMAGE}`;
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
    return "触身重拳";
  }
  if (skillType === HeroSkillType.NUMBER_TEACHER) {
    return "直线数字(无追踪)";
  }
  if (skillType === HeroSkillType.SPIKE) {
    return "受击反伤×2(削弱)";
  }
  if (skillType === HeroSkillType.BROKEN_BLADE) {
    return "触身斷刀/远离叠伤";
  }
  if (skillType === HeroSkillType.ELEMENT_BURST) {
    return "元素爆破(暴击真实伤)";
  }
  if (skillType === HeroSkillType.ORANGE_CALC) {
    return "叠乘1伤(每局限2次)";
  }
  if (skillType === HeroSkillType.MAGNET) {
    return "磁吸护盾/吸金属防具";
  }
  if (skillType === HeroSkillType.DEFENSE) {
    return "随机防具头";
  }
  if (skillType === HeroSkillType.SWORD_BLADE) {
    return "触身挥剑吸血/20秒无敌+元素/无敌后80秒冷却";
  }
  if (skillType === HeroSkillType.ICE_ROT) {
    return "冰弹/血量<100狂暴/狂暴受防卫近战最高伤";
  }
  if (skillType === HeroSkillType.TRACKING) {
    return "追踪贴身/触身连击";
  }
  if (skillType === HeroSkillType.CYCLONE_MECHA) {
    return "触身近战/20秒导弹5秒/冷却30秒";
  }
  if (skillType === HeroSkillType.MEDICAL) {
    return "触身治疗队友(仅团战)";
  }
  if (skillType === HeroSkillType.FACTION) {
    return "触身阵营共鸣/伤害+移速(仅团战)";
  }
  if (skillType === HeroSkillType.WEAPON_BALL) {
    return "每3秒随机武器射击";
  }
  if (skillType === HeroSkillType.WHITE_JADE) {
    return "0.001秒极速弹/击杀召唤随机球";
  }
  if (skillType === HeroSkillType.GIANT_TEETH) {
    return "周身巨齿/触碰高额伤害+流血";
  }
  if (skillType === HeroSkillType.SHOW_OFF) {
    return `生命${ShowOffBallConstants.MAX_HEALTH}/伤害${ShowOffBallConstants.ATTACK_DAMAGE}/攻速5s→0.1s`;
  }
  if (skillType === HeroSkillType.SUCCUBUS) {
    return "每秒牵引魅惑/5层变舔狗攻击队友";
  }
  if (skillType === HeroSkillType.GANGSTER) {
    return "黑帮事件/每5秒4打手入侵/击杀本体结束";
  }
  return "技能";
};
