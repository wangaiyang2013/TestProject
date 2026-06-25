/**
 * 自定义模式 - 自创球房间配置 8 颗球，玩法同小球英雄
 */

const SelfDefinitionConstants = {
  BALL_SLOT_COUNT: 8,
  MIN_HEALTH: BallHealthResolver.resolve(50),
  MAX_HEALTH: BallHealthResolver.resolve(200),
  MIN_SPEED: 5,
  MAX_SPEED: 14,
  MIN_MASS: 0.5,
  MAX_MASS: 2.0,
  MIN_DAMAGE: 1,
  MAX_DAMAGE: 100,
  MIN_INTERVAL_SEC: 0.5,
  MAX_INTERVAL_SEC: 5.0,
  MAX_NAME_LENGTH: 12,
  MAX_DECORATION_LENGTH: 12,
};

/**
 * 将玩家自由输入的技能名映射为引擎技能类型
 */
class CustomSkillTypeParser {
  static parse(skillTypeName) {
    const text = String(skillTypeName || "").trim().toLowerCase();
    if (!text) {
      return HeroSkillType.SHOT;
    }
    if (
      text.includes("喷火") ||
      text.includes("烈焰") ||
      text.includes("flame") ||
      text.includes("flamethrower")
    ) {
      return HeroSkillType.FLAMETHROWER;
    }
    if (
      text.includes("铁壁") ||
      text.includes("减伤") ||
      text.includes("iron") ||
      text.includes("wall")
    ) {
      return HeroSkillType.IRON_WALL;
    }
    if (
      text.includes("元素") ||
      text.includes("爆破") ||
      text.includes("element")
    ) {
      return HeroSkillType.ELEMENT_BURST;
    }
    if (text.includes("磁铁") || text.includes("磁吸") || text.includes("magnet")) {
      return HeroSkillType.MAGNET;
    }
    if (
      text.includes("防卫") ||
      text.includes("防御") ||
      text.includes("防具") ||
      text.includes("defense")
    ) {
      return HeroSkillType.DEFENSE;
    }
    if (
      text.includes("斷刀") ||
      text.includes("断刀") ||
      text.includes("blade")
    ) {
      return HeroSkillType.BROKEN_BLADE;
    }
    if (
      text.includes("劍刃") ||
      text.includes("剑刃") ||
      text.includes("sword")
    ) {
      return HeroSkillType.SWORD_BLADE;
    }
    if (
      text.includes("寒冰") ||
      text.includes("腐烂") ||
      text.includes("ice rot") ||
      text.includes("icerot")
    ) {
      return HeroSkillType.ICE_ROT;
    }
    if (
      text.includes("追踪") ||
      text.includes("tracking") ||
      text.includes("追击")
    ) {
      return HeroSkillType.TRACKING;
    }
    if (
      text.includes("旋风") ||
      text.includes("机甲") ||
      text.includes("cyclone") ||
      text.includes("mecha")
    ) {
      return HeroSkillType.CYCLONE_MECHA;
    }
    if (
      text.includes("医疗") ||
      text.includes("医护") ||
      text.includes("medical")
    ) {
      return HeroSkillType.MEDICAL;
    }
    if (text.includes("尖刺") || text.includes("反伤") || text.includes("spike")) {
      return HeroSkillType.SPIKE;
    }
    if (text.includes("数字") || text.includes("老师") || text.includes("number")) {
      return HeroSkillType.NUMBER_TEACHER;
    }
    if (text.includes("拳") || text.includes("box")) {
      return HeroSkillType.BOXING;
    }
    if (text.includes("墨镜") || text.includes("眼镜") || text.includes("sun")) {
      return HeroSkillType.SUNGLASSES;
    }
    if (text.includes("牛仔") || text.includes("左轮") || text.includes("revolver")) {
      return HeroSkillType.REVOLVER;
    }
    if (text.includes("震荡") || text.includes("脉冲") || text.includes("pulse")) {
      return HeroSkillType.PULSE;
    }
    if (text.includes("冲击") || text.includes("撞") || text.includes("bump")) {
      return HeroSkillType.BUMP;
    }
    if (text.includes("射") || text.includes("弹") || text.includes("shot")) {
      return HeroSkillType.SHOT;
    }
    return HeroSkillType.SHOT;
  }

  static normalizeSkillName(skillTypeName) {
    const trimmed = String(skillTypeName || "").trim();
    if (!trimmed) {
      return "自定义技能";
    }
    return trimmed;
  }
}

/**
 * 单颗自定义球蓝图
 */
class CustomBallBlueprint {
  constructor(slotIndex) {
    this.slotIndex = slotIndex;
    this.id = `custom_ball_${slotIndex}`;
    this.name = `自创球 ${slotIndex}`;
    this.color = "#e94560";
    this.glow = "#ff6b6b";
    this.decoration = "";
    this.maxHealth = BallHealthResolver.getDefaultMaxHealth();
    this.moveSpeed = 9;
    this.mass = 1.0;
    this.skillTypeName = "弹射";
    this.skillType = HeroSkillType.SHOT;
    this.skillDamage = 16;
    this.skillIntervalSec = 1.4;
    this.returnDamage = 12;
  }

  static createDefault(slotIndex) {
    const blueprint = new CustomBallBlueprint(slotIndex);
    const presets = CustomBallBlueprint.getDefaultPresets();
    const preset = presets[(slotIndex - 1) % presets.length];
    blueprint.name = `自创球 ${slotIndex}`;
    blueprint.color = preset.color;
    blueprint.glow = preset.glow;
    blueprint.decoration = preset.decoration;
    blueprint.skillTypeName = preset.skillTypeName;
    blueprint.skillType = CustomSkillTypeParser.parse(preset.skillTypeName);
    blueprint.skillDamage = preset.skillDamage;
    blueprint.maxHealth = preset.maxHealth;
    blueprint.moveSpeed = preset.moveSpeed;
    blueprint.mass = preset.mass;
    blueprint.skillIntervalSec = preset.skillIntervalSec;
    blueprint.returnDamage = preset.returnDamage;
    return blueprint;
  }

  static getDefaultPresets() {
    return [
      {
        color: "#e94560",
        glow: "#ff6b6b",
        decoration: "★",
        skillTypeName: "弹射",
        skillDamage: 16,
        maxHealth: BallHealthResolver.resolve(100),
        moveSpeed: 9,
        mass: 1.0,
        skillIntervalSec: 1.4,
        returnDamage: 12,
      },
      {
        color: "#51cf66",
        glow: "#8ce99a",
        decoration: "风",
        skillTypeName: "冲击波",
        skillDamage: 12,
        maxHealth: BallHealthResolver.resolve(85),
        moveSpeed: 10,
        mass: 0.85,
        skillIntervalSec: 1.2,
        returnDamage: 10,
      },
      {
        color: "#868e96",
        glow: "#ced4da",
        decoration: "盾",
        skillTypeName: "震荡",
        skillDamage: LittleBallHeroConstants.IRON_WALL_STRIKE_DAMAGE,
        maxHealth: BallHealthResolver.resolve(
          LittleBallHeroConstants.IRON_WALL_MAX_HEALTH
        ),
        moveSpeed: 8,
        mass: 1.4,
        skillIntervalSec: 1.6,
        returnDamage: 14,
      },
      {
        color: "#fcc419",
        glow: "#ffe066",
        decoration: "⚡",
        skillTypeName: "闪电弹",
        skillDamage: 14,
        maxHealth: BallHealthResolver.resolve(95),
        moveSpeed: 9,
        mass: 1.0,
        skillIntervalSec: 1.3,
        returnDamage: 11,
      },
      {
        color: "#c68642",
        glow: "#e9b872",
        decoration: "牛仔帽",
        skillTypeName: "左轮双射",
        skillDamage: 12,
        maxHealth: BallHealthResolver.resolve(92),
        moveSpeed: 10,
        mass: 0.95,
        skillIntervalSec: 1.0,
        returnDamage: 10,
      },
      {
        color: "#212529",
        glow: "#495057",
        decoration: "墨镜",
        skillTypeName: "回旋墨镜",
        skillDamage: 14,
        maxHealth: BallHealthResolver.resolve(88),
        moveSpeed: 9,
        mass: 0.9,
        skillIntervalSec: 1.3,
        returnDamage: 11,
      },
      {
        color: "#e03131",
        glow: "#ff8787",
        decoration: "拳套",
        skillTypeName: "触身重拳",
        skillDamage: 20,
        maxHealth: BallHealthResolver.resolve(96),
        moveSpeed: 9,
        mass: 1.1,
        skillIntervalSec: 1.1,
        returnDamage: 16,
      },
      {
        color: "#4c6ef5",
        glow: "#748ffc",
        decoration: "123",
        skillTypeName: "追踪数字",
        skillDamage: 1,
        maxHealth: BallHealthResolver.resolve(94),
        moveSpeed: 9,
        mass: 1.0,
        skillIntervalSec: 1.2,
        returnDamage: 1,
      },
    ];
  }

  toTemplate() {
    const skillIntervalMs = Math.round(this.skillIntervalSec * 1000);
    const template = new HeroBallTemplate(
      this.id,
      this.name,
      this.color,
      this.glow,
      this.maxHealth,
      this.moveSpeed,
      this.mass,
      this.skillType,
      this.skillDamage,
      skillIntervalMs,
      this.returnDamage
    );
    template.skillDisplayName = CustomSkillTypeParser.normalizeSkillName(this.skillTypeName);
    template.decoration = this.decoration;
    return template;
  }
}

/**
 * 自创球房间 - 管理 8 颗可编辑球体
 */
class CustomBallRoom {
  constructor() {
    this.blueprints = [];
    for (let slot = 1; slot <= SelfDefinitionConstants.BALL_SLOT_COUNT; slot += 1) {
      this.blueprints.push(CustomBallBlueprint.createDefault(slot));
    }
    this.selectedIndex = 0;
  }

  getSelectedBlueprint() {
    return this.blueprints[this.selectedIndex];
  }

  selectIndex(index) {
    if (index < 0 || index >= this.blueprints.length) {
      return;
    }
    this.selectedIndex = index;
  }

  getAllTemplates() {
    return this.blueprints.map((blueprint) => blueprint.toTemplate());
  }
}

/**
 * 数值约束工具
 */
class CustomBallValueClamper {
  static clamp(value, min, max) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return min;
    }
    return Math.max(min, Math.min(max, parsed));
  }

  static parseDamageInput(input) {
    const cleaned = String(input || "").replace(/%/g, "").trim();
    const parsed = Number(cleaned);
    if (Number.isNaN(parsed)) {
      return SelfDefinitionConstants.MIN_DAMAGE;
    }
    return CustomBallValueClamper.clamp(
      parsed,
      SelfDefinitionConstants.MIN_DAMAGE,
      SelfDefinitionConstants.MAX_DAMAGE
    );
  }

  static parseIntervalSecondsInput(input) {
    const parsed = Number(String(input || "").trim());
    if (Number.isNaN(parsed)) {
      return SelfDefinitionConstants.MIN_INTERVAL_SEC;
    }
    return CustomBallValueClamper.clamp(
      parsed,
      SelfDefinitionConstants.MIN_INTERVAL_SEC,
      SelfDefinitionConstants.MAX_INTERVAL_SEC
    );
  }

  static clampBlueprint(blueprint) {
    blueprint.maxHealth = CustomBallValueClamper.clamp(
      blueprint.maxHealth,
      SelfDefinitionConstants.MIN_HEALTH,
      SelfDefinitionConstants.MAX_HEALTH
    );
    blueprint.moveSpeed = CustomBallValueClamper.clamp(
      blueprint.moveSpeed,
      SelfDefinitionConstants.MIN_SPEED,
      SelfDefinitionConstants.MAX_SPEED
    );
    blueprint.mass = CustomBallValueClamper.clamp(
      blueprint.mass,
      SelfDefinitionConstants.MIN_MASS,
      SelfDefinitionConstants.MAX_MASS
    );
    blueprint.skillDamage = CustomBallValueClamper.clamp(
      blueprint.skillDamage,
      SelfDefinitionConstants.MIN_DAMAGE,
      SelfDefinitionConstants.MAX_DAMAGE
    );
    blueprint.skillIntervalSec = CustomBallValueClamper.clamp(
      blueprint.skillIntervalSec,
      SelfDefinitionConstants.MIN_INTERVAL_SEC,
      SelfDefinitionConstants.MAX_INTERVAL_SEC
    );
    blueprint.name = String(blueprint.name || "")
      .trim()
      .slice(0, SelfDefinitionConstants.MAX_NAME_LENGTH);
    if (!blueprint.name) {
      blueprint.name = `自创球 ${blueprint.slotIndex}`;
    }
    blueprint.skillTypeName = CustomSkillTypeParser.normalizeSkillName(blueprint.skillTypeName);
    blueprint.skillType = CustomSkillTypeParser.parse(blueprint.skillTypeName);
    blueprint.decoration = String(blueprint.decoration || "")
      .trim()
      .slice(0, SelfDefinitionConstants.MAX_DECORATION_LENGTH);
    blueprint.returnDamage = Math.round(
      CustomBallValueClamper.clamp(
        blueprint.skillDamage * 0.8,
        SelfDefinitionConstants.MIN_DAMAGE,
        SelfDefinitionConstants.MAX_DAMAGE
      )
    );
  }
}

/**
 * 自创球房间界面（HTML 表单）
 */
class CustomBallRoomPanel {
  constructor(room, elements) {
    this.room = room;
    this.elements = elements;
    this.onConfirm = null;
    this.bindEvents();
    this.renderSlots();
    this.loadBlueprintToForm(this.room.getSelectedBlueprint());
  }

  bindEvents() {
    this.elements.slotsContainer.addEventListener("click", (event) => {
      const button = event.target.closest("[data-slot-index]");
      if (!button) {
        return;
      }
      const index = Number(button.getAttribute("data-slot-index"));
      this.saveFormToBlueprint();
      this.room.selectIndex(index);
      this.renderSlots();
      this.loadBlueprintToForm(this.room.getSelectedBlueprint());
    });

    const formInputs = [
      this.elements.name,
      this.elements.color,
      this.elements.glow,
      this.elements.decoration,
      this.elements.maxHealth,
      this.elements.moveSpeed,
      this.elements.mass,
      this.elements.skillTypeName,
      this.elements.skillDamage,
      this.elements.skillIntervalSec,
    ];

    for (const input of formInputs) {
      input.addEventListener("input", () => {
        this.saveFormToBlueprint();
        this.renderSlots();
      });
      input.addEventListener("change", () => {
        this.saveFormToBlueprint();
        this.renderSlots();
      });
    }

    this.elements.confirmBtn.addEventListener("click", () => {
      this.saveFormToBlueprint();
      if (typeof this.onConfirm === "function") {
        this.onConfirm(this.room.getAllTemplates());
      }
    });
  }

  renderSlots() {
    this.elements.slotsContainer.innerHTML = "";
    this.room.blueprints.forEach((blueprint, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "self-def-slot-btn";
      if (index === this.room.selectedIndex) {
        button.classList.add("active");
      }
      button.setAttribute("data-slot-index", String(index));
      const deco = blueprint.decoration
        ? `<span class="self-def-slot-deco">${blueprint.decoration}</span>`
        : "";
      button.innerHTML = `
        <span class="self-def-slot-dot" style="background:${blueprint.color}"></span>
        ${deco}
        <span class="self-def-slot-label">${index + 1}. ${blueprint.name}</span>
      `;
      this.elements.slotsContainer.appendChild(button);
    });
  }

  loadBlueprintToForm(blueprint) {
    this.elements.name.value = blueprint.name;
    this.elements.color.value = blueprint.color;
    this.elements.glow.value = blueprint.glow;
    this.elements.decoration.value = blueprint.decoration;
    this.elements.maxHealth.value = String(blueprint.maxHealth);
    this.elements.moveSpeed.value = String(blueprint.moveSpeed);
    this.elements.mass.value = String(blueprint.mass);
    this.elements.skillTypeName.value = blueprint.skillTypeName;
    this.elements.skillDamage.value = String(blueprint.skillDamage);
    this.elements.skillIntervalSec.value = String(blueprint.skillIntervalSec);
  }

  saveFormToBlueprint() {
    const blueprint = this.room.getSelectedBlueprint();
    blueprint.name = this.elements.name.value;
    blueprint.color = this.elements.color.value;
    blueprint.glow = this.elements.glow.value;
    blueprint.decoration = this.elements.decoration.value;
    blueprint.maxHealth = Number(this.elements.maxHealth.value);
    blueprint.moveSpeed = Number(this.elements.moveSpeed.value);
    blueprint.mass = Number(this.elements.mass.value);
    blueprint.skillTypeName = this.elements.skillTypeName.value;
    blueprint.skillDamage = CustomBallValueClamper.parseDamageInput(
      this.elements.skillDamage.value
    );
    blueprint.skillIntervalSec = CustomBallValueClamper.parseIntervalSecondsInput(
      this.elements.skillIntervalSec.value
    );
    CustomBallValueClamper.clampBlueprint(blueprint);
    this.loadBlueprintToForm(blueprint);
  }

  reset() {
    this.room = new CustomBallRoom();
    this.renderSlots();
    this.loadBlueprintToForm(this.room.getSelectedBlueprint());
  }
}

/**
 * 自定义模式主游戏（继承小球英雄，使用自创球 roster）
 */
class SelfDefinitionGame extends LittleBallHeroGame {
  startWithCustomRoster(subMode, templates) {
    this.setCustomRoster(templates);
    this.start(subMode);
  }

  getModeLabel() {
    return this.subMode === "training"
      ? "自定义模式 · 训练场"
      : "自定义模式 · 双人";
  }
}
