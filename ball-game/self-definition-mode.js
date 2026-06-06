/**
 * 自定义模式 - 自创球房间配置 8 颗球，玩法同小球英雄
 */

const SelfDefinitionConstants = {
  BALL_SLOT_COUNT: 8,
  MIN_HEALTH: 50,
  MAX_HEALTH: 200,
  MIN_SPEED: 5,
  MAX_SPEED: 14,
  MIN_MASS: 0.5,
  MAX_MASS: 2.0,
  MIN_DAMAGE: 5,
  MAX_DAMAGE: 30,
  MIN_INTERVAL_MS: 600,
  MAX_INTERVAL_MS: 3000,
  MIN_RETURN_DAMAGE: 5,
  MAX_RETURN_DAMAGE: 25,
  MAX_NAME_LENGTH: 12,
};

/**
 * 技能类型选项（供自创球房间下拉选择）
 */
class CustomBallSkillOption {
  constructor(value, label) {
    this.value = value;
    this.label = label;
  }

  static getAll() {
    return [
      new CustomBallSkillOption(HeroSkillType.SHOT, "弹射"),
      new CustomBallSkillOption(HeroSkillType.PULSE, "震荡"),
      new CustomBallSkillOption(HeroSkillType.BUMP, "冲击"),
      new CustomBallSkillOption(HeroSkillType.REVOLVER, "左轮双射"),
      new CustomBallSkillOption(HeroSkillType.SUNGLASSES, "回旋墨镜"),
      new CustomBallSkillOption(HeroSkillType.BOXING, "近距重拳"),
      new CustomBallSkillOption(HeroSkillType.NUMBER_TEACHER, "追踪数字"),
    ];
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
    this.maxHealth = 100;
    this.moveSpeed = 9;
    this.mass = 1.0;
    this.skillType = HeroSkillType.SHOT;
    this.skillDamage = 16;
    this.skillIntervalMs = 1400;
    this.returnDamage = 12;
  }

  static createDefault(slotIndex) {
    const blueprint = new CustomBallBlueprint(slotIndex);
    const presets = CustomBallBlueprint.getDefaultPresets();
    const preset = presets[(slotIndex - 1) % presets.length];
    blueprint.name = `自创球 ${slotIndex}`;
    blueprint.color = preset.color;
    blueprint.glow = preset.glow;
    blueprint.skillType = preset.skillType;
    blueprint.skillDamage = preset.skillDamage;
    blueprint.maxHealth = preset.maxHealth;
    blueprint.moveSpeed = preset.moveSpeed;
    blueprint.mass = preset.mass;
    blueprint.skillIntervalMs = preset.skillIntervalMs;
    blueprint.returnDamage = preset.returnDamage;
    return blueprint;
  }

  static getDefaultPresets() {
    return [
      {
        color: "#e94560",
        glow: "#ff6b6b",
        skillType: HeroSkillType.SHOT,
        skillDamage: 16,
        maxHealth: 100,
        moveSpeed: 9,
        mass: 1.0,
        skillIntervalMs: 1400,
        returnDamage: 12,
      },
      {
        color: "#51cf66",
        glow: "#8ce99a",
        skillType: HeroSkillType.BUMP,
        skillDamage: 12,
        maxHealth: 85,
        moveSpeed: 10,
        mass: 0.85,
        skillIntervalMs: 1200,
        returnDamage: 10,
      },
      {
        color: "#868e96",
        glow: "#ced4da",
        skillType: HeroSkillType.PULSE,
        skillDamage: 18,
        maxHealth: 130,
        moveSpeed: 8,
        mass: 1.4,
        skillIntervalMs: 1600,
        returnDamage: 14,
      },
      {
        color: "#fcc419",
        glow: "#ffe066",
        skillType: HeroSkillType.SHOT,
        skillDamage: 14,
        maxHealth: 95,
        moveSpeed: 9,
        mass: 1.0,
        skillIntervalMs: 1300,
        returnDamage: 11,
      },
      {
        color: "#c68642",
        glow: "#e9b872",
        skillType: HeroSkillType.REVOLVER,
        skillDamage: 12,
        maxHealth: 92,
        moveSpeed: 10,
        mass: 0.95,
        skillIntervalMs: 1000,
        returnDamage: 10,
      },
      {
        color: "#212529",
        glow: "#495057",
        skillType: HeroSkillType.SUNGLASSES,
        skillDamage: 14,
        maxHealth: 88,
        moveSpeed: 9,
        mass: 0.9,
        skillIntervalMs: 1300,
        returnDamage: 11,
      },
      {
        color: "#e03131",
        glow: "#ff8787",
        skillType: HeroSkillType.BOXING,
        skillDamage: 20,
        maxHealth: 96,
        moveSpeed: 9,
        mass: 1.1,
        skillIntervalMs: 1100,
        returnDamage: 16,
      },
      {
        color: "#4c6ef5",
        glow: "#748ffc",
        skillType: HeroSkillType.NUMBER_TEACHER,
        skillDamage: 1,
        maxHealth: 94,
        moveSpeed: 9,
        mass: 1.0,
        skillIntervalMs: 1200,
        returnDamage: 1,
      },
    ];
  }

  toTemplate() {
    return new HeroBallTemplate(
      this.id,
      this.name,
      this.color,
      this.glow,
      this.maxHealth,
      this.moveSpeed,
      this.mass,
      this.skillType,
      this.skillDamage,
      this.skillIntervalMs,
      this.returnDamage
    );
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
    blueprint.skillIntervalMs = CustomBallValueClamper.clamp(
      blueprint.skillIntervalMs,
      SelfDefinitionConstants.MIN_INTERVAL_MS,
      SelfDefinitionConstants.MAX_INTERVAL_MS
    );
    blueprint.returnDamage = CustomBallValueClamper.clamp(
      blueprint.returnDamage,
      SelfDefinitionConstants.MIN_RETURN_DAMAGE,
      SelfDefinitionConstants.MAX_RETURN_DAMAGE
    );
    blueprint.name = String(blueprint.name || "")
      .trim()
      .slice(0, SelfDefinitionConstants.MAX_NAME_LENGTH);
    if (!blueprint.name) {
      blueprint.name = `自创球 ${blueprint.slotIndex}`;
    }
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
    this.populateSkillOptions();
    this.renderSlots();
    this.loadBlueprintToForm(this.room.getSelectedBlueprint());
  }

  populateSkillOptions() {
    const select = this.elements.skillType;
    select.innerHTML = "";
    for (const option of CustomBallSkillOption.getAll()) {
      const node = document.createElement("option");
      node.value = option.value;
      node.textContent = option.label;
      select.appendChild(node);
    }
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
      this.elements.maxHealth,
      this.elements.moveSpeed,
      this.elements.mass,
      this.elements.skillType,
      this.elements.skillDamage,
      this.elements.skillIntervalMs,
      this.elements.returnDamage,
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
      button.innerHTML = `
        <span class="self-def-slot-dot" style="background:${blueprint.color}"></span>
        <span class="self-def-slot-label">${index + 1}. ${blueprint.name}</span>
      `;
      this.elements.slotsContainer.appendChild(button);
    });
  }

  loadBlueprintToForm(blueprint) {
    this.elements.name.value = blueprint.name;
    this.elements.color.value = blueprint.color;
    this.elements.glow.value = blueprint.glow;
    this.elements.maxHealth.value = String(blueprint.maxHealth);
    this.elements.moveSpeed.value = String(blueprint.moveSpeed);
    this.elements.mass.value = String(blueprint.mass);
    this.elements.skillType.value = blueprint.skillType;
    this.elements.skillDamage.value = String(blueprint.skillDamage);
    this.elements.skillIntervalMs.value = String(blueprint.skillIntervalMs);
    this.elements.returnDamage.value = String(blueprint.returnDamage);
    this.updateReturnDamageVisibility(blueprint.skillType);
  }

  saveFormToBlueprint() {
    const blueprint = this.room.getSelectedBlueprint();
    blueprint.name = this.elements.name.value;
    blueprint.color = this.elements.color.value;
    blueprint.glow = this.elements.glow.value;
    blueprint.maxHealth = Number(this.elements.maxHealth.value);
    blueprint.moveSpeed = Number(this.elements.moveSpeed.value);
    blueprint.mass = Number(this.elements.mass.value);
    blueprint.skillType = this.elements.skillType.value;
    blueprint.skillDamage = Number(this.elements.skillDamage.value);
    blueprint.skillIntervalMs = Number(this.elements.skillIntervalMs.value);
    blueprint.returnDamage = Number(this.elements.returnDamage.value);
    CustomBallValueClamper.clampBlueprint(blueprint);
    this.loadBlueprintToForm(blueprint);
    this.updateReturnDamageVisibility(blueprint.skillType);
  }

  updateReturnDamageVisibility(skillType) {
    const showReturn = skillType === HeroSkillType.SUNGLASSES;
    this.elements.returnDamageRow.classList.toggle("hidden", !showReturn);
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
