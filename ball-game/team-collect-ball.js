/**
 * 收集保存球 - 红/蓝/绿/紫四队各一种，持续收集数字；按外围数字键显示收藏数
 */

const TeamCollectBallConstants = {
  /** 自动收集间隔（毫秒） */
  COLLECT_INTERVAL_MS: 1000,
  /** 每次自动收集量 */
  COLLECT_AMOUNT_PER_TICK: 1,
  /** 造成伤害时的额外收集量 */
  HIT_COLLECT_BONUS: 1,
  /** 展示收藏数持续时间 */
  DISPLAY_DURATION_MS: 2800,
  /** 被动射击伤害（收集时顺带攻击） */
  COLLECT_SHOT_DAMAGE: 6,
  DISPLAY_FLASH_MS: 320,
  /** 选球数字轮盘半径 */
  WHEEL_RADIUS: 92,
  /** 轮盘输入最大位数 */
  WHEEL_MAX_DRAFT_DIGITS: 2,
  /** 长按打开轮盘时间（毫秒） */
  LONG_PRESS_MS: 3000,
  /** 选球保存编号下限 */
  MIN_SAVED_NUMBER: 1,
};

/**
 * 收集球所属队伍标识
 */
class CollectorTeamId {
  static RED = "red";

  static BLUE = "blue";

  static GREEN = "green";

  static PURPLE = "purple";

  static getAll() {
    return [
      CollectorTeamId.RED,
      CollectorTeamId.BLUE,
      CollectorTeamId.GREEN,
      CollectorTeamId.PURPLE,
    ];
  }

  static getLabel(teamId) {
    const labels = {
      [CollectorTeamId.RED]: "红队",
      [CollectorTeamId.BLUE]: "蓝队",
      [CollectorTeamId.GREEN]: "绿队",
      [CollectorTeamId.PURPLE]: "紫队",
    };
    return labels[teamId] || "未知队";
  }

  static getShortLabel(teamId) {
    const labels = {
      [CollectorTeamId.RED]: "红",
      [CollectorTeamId.BLUE]: "蓝",
      [CollectorTeamId.GREEN]: "绿",
      [CollectorTeamId.PURPLE]: "紫",
    };
    return labels[teamId] || "?";
  }

  /** 1/2/3/4：长按3秒首次设编号或填入已存编号到输入栏 */
  static getFillKeyCodes(teamId) {
    const mapping = {
      [CollectorTeamId.RED]: ["Numpad1", "Digit1"],
      [CollectorTeamId.BLUE]: ["Numpad2", "Digit2"],
      [CollectorTeamId.GREEN]: ["Numpad3", "Digit3"],
      [CollectorTeamId.PURPLE]: ["Numpad4", "Digit4"],
    };
    return mapping[teamId] || [];
  }

  static getFillKeyHint(teamId) {
    const hints = {
      [CollectorTeamId.RED]: "1",
      [CollectorTeamId.BLUE]: "2",
      [CollectorTeamId.GREEN]: "3",
      [CollectorTeamId.PURPLE]: "4",
    };
    return hints[teamId] || "";
  }

  /** F1/F2/F3/F4：长按3秒打开轮盘修改已存编号 */
  static getEditWheelKeyCodes(teamId) {
    const mapping = {
      [CollectorTeamId.RED]: ["F1"],
      [CollectorTeamId.BLUE]: ["F2"],
      [CollectorTeamId.GREEN]: ["F3"],
      [CollectorTeamId.PURPLE]: ["F4"],
    };
    return mapping[teamId] || [];
  }

  static getEditWheelKeyHint(teamId) {
    const hints = {
      [CollectorTeamId.RED]: "F1",
      [CollectorTeamId.BLUE]: "F2",
      [CollectorTeamId.GREEN]: "F3",
      [CollectorTeamId.PURPLE]: "F4",
    };
    return hints[teamId] || "";
  }

  static getTeamIdByFillCode(code) {
    for (const teamId of CollectorTeamId.getAll()) {
      if (CollectorTeamId.getFillKeyCodes(teamId).includes(code)) {
        return teamId;
      }
    }
    return null;
  }

  static getTeamIdByEditCode(code) {
    for (const teamId of CollectorTeamId.getAll()) {
      if (CollectorTeamId.getEditWheelKeyCodes(teamId).includes(code)) {
        return teamId;
      }
    }
    return null;
  }

  static getDisplayKeyCodes(teamId) {
    return CollectorTeamId.getFillKeyCodes(teamId);
  }

  static getDisplayKeyHint(teamId) {
    return CollectorTeamId.getFillKeyHint(teamId);
  }

  static getColor(teamId) {
    const colors = {
      [CollectorTeamId.RED]: "#e03131",
      [CollectorTeamId.BLUE]: "#339af0",
      [CollectorTeamId.GREEN]: "#37b24d",
      [CollectorTeamId.PURPLE]: "#845ef7",
    };
    return colors[teamId] || "#adb5bd";
  }

  static getGlow(teamId) {
    const glows = {
      [CollectorTeamId.RED]: "#ff8787",
      [CollectorTeamId.BLUE]: "#74c0fc",
      [CollectorTeamId.GREEN]: "#8ce99a",
      [CollectorTeamId.PURPLE]: "#b197fc",
    };
    return glows[teamId] || "#dee2e6";
  }

  static getPickStep(teamId) {
    const mapping = {
      [CollectorTeamId.RED]: 1,
      [CollectorTeamId.BLUE]: 2,
      [CollectorTeamId.GREEN]: 3,
      [CollectorTeamId.PURPLE]: 4,
    };
    return mapping[teamId] || 0;
  }

  static getTeamIdByPickStep(pickStep) {
    const mapping = {
      1: CollectorTeamId.RED,
      2: CollectorTeamId.BLUE,
      3: CollectorTeamId.GREEN,
      4: CollectorTeamId.PURPLE,
    };
    return mapping[pickStep] || null;
  }
}

/**
 * 收集保存球模板工厂
 */
class TeamCollectBallTemplateFactory {
  static create(teamId) {
    const template = new HeroBallTemplate(
      `team_collect_${teamId}`,
      `${CollectorTeamId.getLabel(teamId)}收集球`,
      CollectorTeamId.getColor(teamId),
      CollectorTeamId.getGlow(teamId),
      BallHealthResolver.resolve(96),
      8.4,
      1.0,
      HeroSkillType.TEAM_COLLECT,
      TeamCollectBallConstants.COLLECT_SHOT_DAMAGE,
      TeamCollectBallConstants.COLLECT_INTERVAL_MS
    );
    template.collectorTeamId = teamId;
    template.skillDisplayName = "收集保存";
    template.decoration = "收集";
    return template;
  }

  static createAll() {
    return CollectorTeamId.getAll().map((teamId) =>
      TeamCollectBallTemplateFactory.create(teamId)
    );
  }
}

/**
 * 单队收集保存条目（编号 + 角色绑定，避免列表变化后错位）
 */
class TeamCollectSavedEntry {
  constructor(pickNumber, heroId, heroName) {
    this.pickNumber = pickNumber;
    this.heroId = heroId || "";
    this.heroName = heroName || "";
  }
}

/**
 * 四队选球编号登记（收集保存：记住常用球的列表编号，长按快捷键在选球盘显示）
 */
class TeamCollectPickRegistry {
  static teamEntries = {
    [CollectorTeamId.RED]: null,
    [CollectorTeamId.BLUE]: null,
    [CollectorTeamId.GREEN]: null,
    [CollectorTeamId.PURPLE]: null,
  };

  static clampNumber(value, maxHeroCount) {
    const parsed = Math.floor(Number(value));
    const maxAllowed = Math.max(
      TeamCollectBallConstants.MIN_SAVED_NUMBER,
      maxHeroCount || TeamCollectBallConstants.MIN_SAVED_NUMBER
    );
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    if (parsed < TeamCollectBallConstants.MIN_SAVED_NUMBER) {
      return 0;
    }
    return Math.min(parsed, maxAllowed);
  }

  static hasNumber(teamId) {
    const entry = TeamCollectPickRegistry.teamEntries[teamId];
    return entry instanceof TeamCollectSavedEntry;
  }

  static getEntry(teamId) {
    if (!teamId || !TeamCollectPickRegistry.hasNumber(teamId)) {
      return null;
    }
    return TeamCollectPickRegistry.teamEntries[teamId];
  }

  static getNumber(teamId) {
    const entry = TeamCollectPickRegistry.getEntry(teamId);
    if (!entry) {
      return 0;
    }
    return entry.pickNumber;
  }

  static setNumber(teamId, value, maxHeroCount, game) {
    if (!teamId) {
      return {
        ok: false,
        message: "未知队伍，无法保存球编号",
      };
    }
    const nextValue = TeamCollectPickRegistry.clampNumber(value, maxHeroCount);
    if (nextValue <= 0) {
      return {
        ok: false,
        message: `编号需在 1-${maxHeroCount} 之间`,
      };
    }

    let heroId = "";
    let heroName = "";
    if (game) {
      const ballInfo = TeamCollectPickRegistry.resolveBallByPickNumber(
        game,
        nextValue
      );
      if (ballInfo.hero) {
        heroId = ballInfo.hero.id;
        heroName = ballInfo.heroName;
      }
    }

    TeamCollectPickRegistry.teamEntries[teamId] = new TeamCollectSavedEntry(
      nextValue,
      heroId,
      heroName
    );

    const ballLabel = heroName ? ` · ${heroName}` : "";
    return {
      ok: true,
      teamId,
      value: nextValue,
      heroId,
      heroName,
      message: `${CollectorTeamId.getLabel(teamId)}轮盘已保存 #${nextValue}${ballLabel}`,
    };
  }

  static resolveBallByPickNumber(game, pickNumber) {
    if (!game || typeof game.getHeroes !== "function" || pickNumber <= 0) {
      return {
        pickNumber,
        hero: null,
        heroName: "",
      };
    }
    const heroes = game.getHeroes();
    const index = pickNumber - 1;
    if (index < 0 || index >= heroes.length) {
      return {
        pickNumber,
        hero: null,
        heroName: "",
      };
    }
    return {
      pickNumber,
      hero: heroes[index],
      heroName: heroes[index].name,
    };
  }

  static resolveSavedBall(game, teamId) {
    const entry = TeamCollectPickRegistry.getEntry(teamId);
    if (!entry) {
      return {
        pickNumber: 0,
        hero: null,
        heroName: "",
      };
    }
    const ballInfo = TeamCollectPickRegistry.resolveBallByPickNumber(
      game,
      entry.pickNumber
    );
    if (ballInfo.hero) {
      return ballInfo;
    }
    return {
      pickNumber: entry.pickNumber,
      hero: null,
      heroName: entry.heroName,
    };
  }

  static getAllNumberSummary() {
    return CollectorTeamId.getAll()
      .map((teamId) => {
        const fillHint = CollectorTeamId.getFillKeyHint(teamId);
        const editHint = CollectorTeamId.getEditWheelKeyHint(teamId);
        if (!TeamCollectPickRegistry.hasNumber(teamId)) {
          return `${CollectorTeamId.getShortLabel(teamId)}:空(长按${fillHint}设/长按${editHint}改)`;
        }
        const number = TeamCollectPickRegistry.getNumber(teamId);
        return `${CollectorTeamId.getShortLabel(teamId)}:#${number}(长按${fillHint}填入/长按${editHint}改)`;
      })
      .join(" · ");
  }
}

/**
 * 选球输入：保存各队常用球编号（如 收25、红收25）
 */
class TeamCollectPickInputParser {
  static _heroCount = 28;

  static TEAM_NAME_TO_ID = {
    红: CollectorTeamId.RED,
    蓝: CollectorTeamId.BLUE,
    绿: CollectorTeamId.GREEN,
    紫: CollectorTeamId.PURPLE,
  };

  static tryParse(rawInput, pickStep, game) {
    const text = String(rawInput || "").trim();
    if (!text) {
      return null;
    }

    const currentTeamMatch = text.match(/^(?:收|收藏|数)(\d+)$/);
    if (currentTeamMatch) {
      const teamId = CollectorTeamId.getTeamIdByPickStep(pickStep);
      if (!teamId) {
        return {
          handled: true,
          ok: false,
          message: "当前步骤无法保存球编号",
        };
      }
      const result = TeamCollectPickRegistry.setNumber(
        teamId,
        parseInt(currentTeamMatch[1], 10),
        TeamCollectPickInputParser._heroCount,
        game
      );
      return {
        handled: true,
        ok: result.ok,
        message: result.message,
      };
    }

    const namedTeamMatch = text.match(
      /^(红|蓝|绿|紫)(?:队)?(?:收|收藏|数)(\d+)$/
    );
    if (namedTeamMatch) {
      const teamId = TeamCollectPickInputParser.TEAM_NAME_TO_ID[namedTeamMatch[1]];
      const result = TeamCollectPickRegistry.setNumber(
        teamId,
        parseInt(namedTeamMatch[2], 10),
        TeamCollectPickInputParser._heroCount,
        game
      );
      return {
        handled: true,
        ok: result.ok,
        message: result.message,
      };
    }

    return null;
  }
}

/**
 * 选球：1-4 长按3秒设编号/填入；F1-F4 长按3秒修改编号
 */
class TeamCollectPickUiSystem {
  static openTeamId = null;

  static draftText = "";

  static lastPickMessage = "";

  static pendingPickInputValue = "";

  static _draftHeroCount = 0;

  static keyHoldStartByFillTeam = {
    [CollectorTeamId.RED]: 0,
    [CollectorTeamId.BLUE]: 0,
    [CollectorTeamId.GREEN]: 0,
    [CollectorTeamId.PURPLE]: 0,
  };

  static fillLongPressTriggeredByTeam = {
    [CollectorTeamId.RED]: false,
    [CollectorTeamId.BLUE]: false,
    [CollectorTeamId.GREEN]: false,
    [CollectorTeamId.PURPLE]: false,
  };

  static keyHoldStartByEditTeam = {
    [CollectorTeamId.RED]: 0,
    [CollectorTeamId.BLUE]: 0,
    [CollectorTeamId.GREEN]: 0,
    [CollectorTeamId.PURPLE]: 0,
  };

  static editLongPressTriggeredByTeam = {
    [CollectorTeamId.RED]: false,
    [CollectorTeamId.BLUE]: false,
    [CollectorTeamId.GREEN]: false,
    [CollectorTeamId.PURPLE]: false,
  };

  static activeHoldTeamId = null;

  static activeHoldKind = null;

  static activeHoldProgress = 0;

  static DIGIT_KEY_CODES = {
    Digit0: "0",
    Digit1: "1",
    Digit2: "2",
    Digit3: "3",
    Digit4: "4",
    Digit5: "5",
    Digit6: "6",
    Digit7: "7",
    Digit8: "8",
    Digit9: "9",
    Numpad0: "0",
    Numpad1: "1",
    Numpad2: "2",
    Numpad3: "3",
    Numpad4: "4",
    Numpad5: "5",
    Numpad6: "6",
    Numpad7: "7",
    Numpad8: "8",
    Numpad9: "9",
  };

  static isFillKeyHeld(input, teamId) {
    const codes = CollectorTeamId.getFillKeyCodes(teamId);
    return codes.some((code) => input.isDown(code));
  }

  static isEditKeyHeld(input, teamId) {
    const codes = CollectorTeamId.getEditWheelKeyCodes(teamId);
    return codes.some((code) => input.isDown(code));
  }

  static isAnyFillKeyHeld(input) {
    if (!input) {
      return false;
    }
    return CollectorTeamId.getAll().some((teamId) =>
      TeamCollectPickUiSystem.isFillKeyHeld(input, teamId)
    );
  }

  static isAnyEditKeyHeld(input) {
    if (!input) {
      return false;
    }
    return CollectorTeamId.getAll().some((teamId) =>
      TeamCollectPickUiSystem.isEditKeyHeld(input, teamId)
    );
  }

  static isWheelOpen() {
    return Boolean(TeamCollectPickUiSystem.openTeamId);
  }

  static isBlockingAutoPick(input) {
    return (
      TeamCollectPickUiSystem.isWheelOpen() ||
      TeamCollectPickUiSystem.isAnyFillKeyHeld(input) ||
      TeamCollectPickUiSystem.isAnyEditKeyHeld(input)
    );
  }

  static getHeroCountLimit() {
    return Math.max(1, TeamCollectPickUiSystem._draftHeroCount || 1);
  }

  static ALL_FILL_KEY_CODES = CollectorTeamId.getAll().flatMap((teamId) =>
    CollectorTeamId.getFillKeyCodes(teamId)
  );

  static ALL_EDIT_KEY_CODES = CollectorTeamId.getAll().flatMap((teamId) =>
    CollectorTeamId.getEditWheelKeyCodes(teamId)
  );

  static WHEEL_EDITING_KEY_CODES = [
    "Backspace",
    "ArrowUp",
    "ArrowDown",
    "Enter",
    "NumpadEnter",
    "Escape",
    "Digit0",
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Digit5",
    "Digit6",
    "Digit7",
    "Digit8",
    "Digit9",
    "Numpad0",
    "Numpad1",
    "Numpad2",
    "Numpad3",
    "Numpad4",
    "Numpad5",
    "Numpad6",
    "Numpad7",
    "Numpad8",
    "Numpad9",
  ];

  static isFillKeyCode(code) {
    return TeamCollectPickUiSystem.ALL_FILL_KEY_CODES.includes(code);
  }

  static isEditWheelKeyCode(code) {
    return TeamCollectPickUiSystem.ALL_EDIT_KEY_CODES.includes(code);
  }

  static shouldBlockInputDuringWheel(code) {
    return TeamCollectPickUiSystem.WHEEL_EDITING_KEY_CODES.includes(code);
  }

  static getCurrentPickTeamId(game) {
    if (!game || typeof game.pickStep !== "number") {
      return null;
    }
    return CollectorTeamId.getTeamIdByPickStep(game.pickStep);
  }

  static isCurrentPickTurn(teamId, game) {
    return TeamCollectPickUiSystem.getCurrentPickTeamId(game) === teamId;
  }

  static buildWrongTeamFillMessage(teamId, game) {
    const pressedLabel = CollectorTeamId.getLabel(teamId);
    const pressedKey = CollectorTeamId.getFillKeyHint(teamId);
    const currentTeamId = TeamCollectPickUiSystem.getCurrentPickTeamId(game);
    if (!currentTeamId) {
      return `${pressedLabel}（长按 ${pressedKey}）只能在对应选球回合填入编号`;
    }
    const currentLabel = CollectorTeamId.getLabel(currentTeamId);
    const currentKey = CollectorTeamId.getFillKeyHint(currentTeamId);
    return `当前轮到${currentLabel}选球，请长按 ${currentKey} 设置/填入${currentLabel}编号（${pressedKey} 是${pressedLabel}快捷键，填入的是${pressedLabel}保存，不是${currentLabel}）`;
  }

  static getHeroOwnerLabel(game, heroId) {
    if (
      !game ||
      !heroId ||
      typeof game.getPickInputContext !== "function"
    ) {
      return "其他队伍";
    }
    const context = game.getPickInputContext();
    if (context.heroOwners && context.heroOwners[heroId]) {
      return context.heroOwners[heroId];
    }
    return "其他队伍";
  }

  static validateSavedHeroAvailable(teamId, game, ballInfo) {
    if (!ballInfo || !ballInfo.hero) {
      return { ok: true, message: "" };
    }
    if (!game.takenHeroIds || !game.takenHeroIds.has(ballInfo.hero.id)) {
      return { ok: true, message: "" };
    }
    const ownerLabel = TeamCollectPickUiSystem.getHeroOwnerLabel(
      game,
      ballInfo.hero.id
    );
    const ballLabel = ballInfo.heroName || "该球";
    const editHint = CollectorTeamId.getEditWheelKeyHint(teamId);
    return {
      ok: false,
      message: `${CollectorTeamId.getLabel(
        teamId
      )}保存的【${ballLabel}】已被${ownerLabel}选走，请长按 ${editHint} 修改编号或换其他角色`,
    };
  }

  static applySavedToInput(teamId, game) {
    if (!TeamCollectPickUiSystem.isCurrentPickTurn(teamId, game)) {
      TeamCollectPickUiSystem.lastPickMessage =
        TeamCollectPickUiSystem.buildWrongTeamFillMessage(teamId, game);
      return false;
    }

    if (!TeamCollectPickRegistry.hasNumber(teamId)) {
      TeamCollectPickUiSystem.lastPickMessage = `${CollectorTeamId.getLabel(
        teamId
      )}尚未保存编号，请长按 ${CollectorTeamId.getFillKeyHint(teamId)} 共 3 秒设置`;
      return false;
    }

    const pickNumber = TeamCollectPickRegistry.getNumber(teamId);
    const ballInfo = TeamCollectPickRegistry.resolveBallByPickNumber(
      game,
      pickNumber
    );
    const availability = TeamCollectPickUiSystem.validateSavedHeroAvailable(
      teamId,
      game,
      ballInfo
    );
    if (!availability.ok) {
      TeamCollectPickUiSystem.lastPickMessage = availability.message;
      return false;
    }

    TeamCollectPickUiSystem.pendingPickInputValue = String(pickNumber);
    const ballLabel = ballInfo.heroName || "未知球";
    TeamCollectPickUiSystem.lastPickMessage = `${CollectorTeamId.getLabel(
      teamId
    )} 长按 ${CollectorTeamId.getFillKeyHint(
      teamId
    )} 3 秒 · 已填入 #${pickNumber} · ${ballLabel}`;
    return true;
  }

  static onFillKeyLongPressComplete(teamId, game) {
    if (!TeamCollectPickUiSystem.isCurrentPickTurn(teamId, game)) {
      TeamCollectPickUiSystem.lastPickMessage =
        TeamCollectPickUiSystem.buildWrongTeamFillMessage(teamId, game);
      return;
    }

    if (!TeamCollectPickRegistry.hasNumber(teamId)) {
      TeamCollectPickUiSystem.openWheel(teamId, game);
      TeamCollectPickUiSystem.lastPickMessage = `${CollectorTeamId.getLabel(
        teamId
      )}轮盘已打开，请输入 1-${TeamCollectPickUiSystem.getHeroCountLimit()}，Enter 确认保存`;
      return;
    }

    TeamCollectPickUiSystem.applySavedToInput(teamId, game);
  }

  static onEditKeyLongPressComplete(teamId, game) {
    TeamCollectPickUiSystem.openWheel(teamId, game);
    TeamCollectPickUiSystem.lastPickMessage = `${CollectorTeamId.getLabel(
      teamId
    )}修改轮盘已打开（长按 ${CollectorTeamId.getEditWheelKeyHint(
      teamId
    )}），Enter 保存新编号`;
  }

  static notifyWheelOpened(game) {
    if (game && typeof game.markWheelOpened === "function") {
      game.markWheelOpened();
    }
  }

  static openWheel(teamId, game) {
    TeamCollectPickUiSystem.openTeamId = teamId;
    if (TeamCollectPickRegistry.hasNumber(teamId)) {
      TeamCollectPickUiSystem.draftText = String(
        TeamCollectPickRegistry.getNumber(teamId)
      );
    } else {
      TeamCollectPickUiSystem.draftText = "";
    }
    TeamCollectPickUiSystem.activeHoldTeamId = null;
    TeamCollectPickUiSystem.activeHoldProgress = 0;
    TeamCollectPickUiSystem.notifyWheelOpened(game);
  }

  static closeWheel() {
    TeamCollectPickUiSystem.openTeamId = null;
    TeamCollectPickUiSystem.draftText = "";
  }

  static getDraftPickNumber() {
    const parsed = parseInt(TeamCollectPickUiSystem.draftText, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 0;
    }
    return TeamCollectPickRegistry.clampNumber(
      parsed,
      TeamCollectPickUiSystem.getHeroCountLimit()
    );
  }

  static isDraftValid() {
    const parsed = parseInt(TeamCollectPickUiSystem.draftText, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return false;
    }
    return parsed <= TeamCollectPickUiSystem.getHeroCountLimit();
  }

  static appendDraftDigit(digit) {
    if (!digit) {
      return;
    }
    const nextText = `${TeamCollectPickUiSystem.draftText}${digit}`;
    if (nextText.length > TeamCollectBallConstants.WHEEL_MAX_DRAFT_DIGITS) {
      return;
    }
    const parsed = parseInt(nextText, 10);
    if (
      Number.isFinite(parsed) &&
      parsed > TeamCollectPickUiSystem.getHeroCountLimit()
    ) {
      return;
    }
    TeamCollectPickUiSystem.draftText = nextText;
  }

  static backspaceDraft() {
    TeamCollectPickUiSystem.draftText = TeamCollectPickUiSystem.draftText.slice(
      0,
      -1
    );
  }

  static adjustDraft(delta) {
    const heroCount = TeamCollectPickUiSystem.getHeroCountLimit();
    const current = TeamCollectPickUiSystem.getDraftPickNumber();
    const base = current > 0 ? current : 1;
    const next = TeamCollectPickRegistry.clampNumber(base + delta, heroCount);
    if (next <= 0) {
      TeamCollectPickUiSystem.draftText = "";
      return;
    }
    TeamCollectPickUiSystem.draftText = String(next);
  }

  static collectPressedDigit(input) {
    for (const [code, digit] of Object.entries(
      TeamCollectPickUiSystem.DIGIT_KEY_CODES
    )) {
      if (input.wasPressed(code)) {
        return digit;
      }
    }
    return null;
  }

  static confirmWheel(game) {
    const teamId = TeamCollectPickUiSystem.openTeamId;
    const heroCount = TeamCollectPickUiSystem.getHeroCountLimit();
    const pickNumber = TeamCollectPickUiSystem.getDraftPickNumber();

    if (!teamId) {
      return null;
    }

    if (!TeamCollectPickUiSystem.isDraftValid()) {
      TeamCollectPickUiSystem.lastPickMessage = `请输入 1-${heroCount} 之间的有效编号`;
      return null;
    }

    const saveResult = TeamCollectPickRegistry.setNumber(
      teamId,
      pickNumber,
      heroCount,
      game
    );
    if (!saveResult.ok) {
      TeamCollectPickUiSystem.lastPickMessage = saveResult.message;
      return null;
    }

    const ballInfo = TeamCollectPickRegistry.resolveBallByPickNumber(
      game,
      pickNumber
    );
    TeamCollectPickUiSystem.closeWheel();

    const ballLabel = ballInfo.heroName || saveResult.heroName || "未知球";
    if (TeamCollectPickUiSystem.isCurrentPickTurn(teamId, game)) {
      const availability = TeamCollectPickUiSystem.validateSavedHeroAvailable(
        teamId,
        game,
        ballInfo
      );
      if (availability.ok) {
        TeamCollectPickUiSystem.pendingPickInputValue = String(pickNumber);
        TeamCollectPickUiSystem.lastPickMessage = `${CollectorTeamId.getLabel(
          teamId
        )} #${pickNumber} · ${ballLabel} 已填入输入栏，请点击「确认选球」`;
      } else {
        TeamCollectPickUiSystem.lastPickMessage = `${CollectorTeamId.getLabel(
          teamId
        )} #${pickNumber} · ${ballLabel} 已保存。${availability.message}`;
      }
    } else {
      TeamCollectPickUiSystem.lastPickMessage = `${CollectorTeamId.getLabel(
        teamId
      )} #${pickNumber} · ${ballLabel} 已保存（轮到该队选球时再长按 ${CollectorTeamId.getFillKeyHint(
        teamId
      )} 填入）`;
    }
    return { ok: true, message: TeamCollectPickUiSystem.lastPickMessage };
  }

  static consumePendingPickInputValue() {
    const value = TeamCollectPickUiSystem.pendingPickInputValue;
    TeamCollectPickUiSystem.pendingPickInputValue = "";
    return value;
  }

  static handleWheelEditing(input, game) {
    if (input.wasPressed("Escape")) {
      TeamCollectPickUiSystem.closeWheel();
      TeamCollectPickUiSystem.lastPickMessage = "已关闭编号轮盘（未填入编号）";
      return;
    }

    if (input.wasPressed("Backspace")) {
      TeamCollectPickUiSystem.backspaceDraft();
      return;
    }

    if (input.wasPressed("ArrowUp")) {
      TeamCollectPickUiSystem.adjustDraft(1);
      return;
    }

    if (input.wasPressed("ArrowDown")) {
      TeamCollectPickUiSystem.adjustDraft(-1);
      return;
    }

    if (input.wasPressed("Enter") || input.wasPressed("NumpadEnter")) {
      TeamCollectPickUiSystem.confirmWheel(game);
      return;
    }

    const digit = TeamCollectPickUiSystem.collectPressedDigit(input);
    if (digit) {
      TeamCollectPickUiSystem.appendDraftDigit(digit);
    }
  }

  static tickFillKeyLongPress(input, game, now) {
    for (const teamId of CollectorTeamId.getAll()) {
      if (TeamCollectPickUiSystem.isFillKeyHeld(input, teamId)) {
        if (!TeamCollectPickUiSystem.keyHoldStartByFillTeam[teamId]) {
          TeamCollectPickUiSystem.keyHoldStartByFillTeam[teamId] = now;
          TeamCollectPickUiSystem.fillLongPressTriggeredByTeam[teamId] = false;
        }

        const heldMs =
          now - TeamCollectPickUiSystem.keyHoldStartByFillTeam[teamId];
        const progress = Math.min(
          1,
          heldMs / TeamCollectBallConstants.LONG_PRESS_MS
        );
        TeamCollectPickUiSystem.activeHoldTeamId = teamId;
        TeamCollectPickUiSystem.activeHoldKind = "fill";
        TeamCollectPickUiSystem.activeHoldProgress = progress;

        if (
          heldMs >= TeamCollectBallConstants.LONG_PRESS_MS &&
          !TeamCollectPickUiSystem.fillLongPressTriggeredByTeam[teamId]
        ) {
          TeamCollectPickUiSystem.fillLongPressTriggeredByTeam[teamId] = true;
          TeamCollectPickUiSystem.onFillKeyLongPressComplete(teamId, game);
        }
        return;
      }

      TeamCollectPickUiSystem.keyHoldStartByFillTeam[teamId] = 0;
      TeamCollectPickUiSystem.fillLongPressTriggeredByTeam[teamId] = false;
    }
  }

  static tickEditKeyLongPress(input, game, now) {
    for (const teamId of CollectorTeamId.getAll()) {
      if (TeamCollectPickUiSystem.isEditKeyHeld(input, teamId)) {
        if (!TeamCollectPickUiSystem.keyHoldStartByEditTeam[teamId]) {
          TeamCollectPickUiSystem.keyHoldStartByEditTeam[teamId] = now;
          TeamCollectPickUiSystem.editLongPressTriggeredByTeam[teamId] = false;
        }

        const heldMs =
          now - TeamCollectPickUiSystem.keyHoldStartByEditTeam[teamId];
        const progress = Math.min(
          1,
          heldMs / TeamCollectBallConstants.LONG_PRESS_MS
        );
        TeamCollectPickUiSystem.activeHoldTeamId = teamId;
        TeamCollectPickUiSystem.activeHoldKind = "edit";
        TeamCollectPickUiSystem.activeHoldProgress = progress;

        if (
          heldMs >= TeamCollectBallConstants.LONG_PRESS_MS &&
          !TeamCollectPickUiSystem.editLongPressTriggeredByTeam[teamId]
        ) {
          TeamCollectPickUiSystem.editLongPressTriggeredByTeam[teamId] = true;
          TeamCollectPickUiSystem.onEditKeyLongPressComplete(teamId, game);
        }
        return;
      }

      TeamCollectPickUiSystem.keyHoldStartByEditTeam[teamId] = 0;
      TeamCollectPickUiSystem.editLongPressTriggeredByTeam[teamId] = false;
    }
  }

  static tickLongPress(input, game, now) {
    TeamCollectPickUiSystem.activeHoldTeamId = null;
    TeamCollectPickUiSystem.activeHoldKind = null;
    TeamCollectPickUiSystem.activeHoldProgress = 0;

    TeamCollectPickUiSystem.tickFillKeyLongPress(input, game, now);
    if (TeamCollectPickUiSystem.activeHoldTeamId) {
      return;
    }
    TeamCollectPickUiSystem.tickEditKeyLongPress(input, game, now);
  }

  static getPickHint() {
    const heroCount = TeamCollectPickUiSystem.getHeroCountLimit();
    return `收集保存 · 长按1-4设/填入 · 长按F1-F4修改 · 编号1-${heroCount}`;
  }

  static tickPickKeyboard(input, game, now) {
    if (!input || !game || game.phase !== "pick") {
      return null;
    }

    TeamCollectPickUiSystem._draftHeroCount = game.getHeroes().length;
    TeamCollectPickInputParser._heroCount =
      TeamCollectPickUiSystem._draftHeroCount;

    if (TeamCollectPickUiSystem.isWheelOpen()) {
      TeamCollectPickUiSystem.handleWheelEditing(input, game);
      return null;
    }

    TeamCollectPickUiSystem.tickLongPress(input, game, now);
    return null;
  }

  static getActiveHighlightPickNumber() {
    if (!TeamCollectPickUiSystem.isWheelOpen()) {
      return 0;
    }
    return TeamCollectPickUiSystem.getDraftPickNumber();
  }

  static drawPickOverlay(ctx, game, arena) {
    if (!game || game.phase !== "pick") {
      return;
    }

    const panelX = arena.left + 12;
    const panelY = arena.bottom - 118;

    ctx.fillStyle = "rgba(26, 26, 46, 0.82)";
    ctx.fillRect(panelX, panelY, 280, 96);
    ctx.strokeStyle = "rgba(255, 212, 59, 0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, 280, 96);

    ctx.fillStyle = "#ffd43b";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("收集保存 · 四队编号轮盘", panelX + 10, panelY + 18);

    let rowY = panelY + 36;
    const currentPickTeamId = TeamCollectPickUiSystem.getCurrentPickTeamId(game);
    for (const teamId of CollectorTeamId.getAll()) {
      const isOpen = TeamCollectPickUiSystem.openTeamId === teamId;
      const isCurrentTurn = currentPickTeamId === teamId;
      const hasSaved = TeamCollectPickRegistry.hasNumber(teamId);
      const savedNumber = TeamCollectPickRegistry.getNumber(teamId);
      const savedBall = hasSaved
        ? TeamCollectPickRegistry.resolveSavedBall(game, teamId)
        : null;

      ctx.fillStyle = isOpen
        ? CollectorTeamId.getGlow(teamId)
        : isCurrentTurn
          ? "#ffd43b"
          : CollectorTeamId.getColor(teamId);
      ctx.font =
        isOpen || isCurrentTurn
          ? "bold 13px system-ui, sans-serif"
          : "12px system-ui, sans-serif";

      const numberLabel = hasSaved ? `#${savedNumber}` : "空";
      const ballLabel =
        savedBall && savedBall.heroName ? savedBall.heroName : "未设置";
      const turnTag = isCurrentTurn ? " ← 当前选球" : "";
      ctx.fillText(
        `${CollectorTeamId.getLabel(teamId)} ${numberLabel} ${ballLabel}${turnTag} · 长按${CollectorTeamId.getFillKeyHint(
          teamId
        )}/F${CollectorTeamId.getPickStep(teamId)}`,
        panelX + 10,
        rowY
      );
      rowY += 16;
    }

    if (TeamCollectPickUiSystem.activeHoldTeamId) {
      const holdTeamId = TeamCollectPickUiSystem.activeHoldTeamId;
      const progress = Math.round(
        TeamCollectPickUiSystem.activeHoldProgress * 100
      );
      const keyLabel =
        TeamCollectPickUiSystem.activeHoldKind === "edit"
          ? CollectorTeamId.getEditWheelKeyHint(holdTeamId)
          : CollectorTeamId.getFillKeyHint(holdTeamId);
      ctx.fillStyle = CollectorTeamId.getGlow(holdTeamId);
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillText(
        `${CollectorTeamId.getLabel(holdTeamId)}长按 ${keyLabel} ${progress}%/3秒`,
        panelX + 10,
        panelY + 86
      );
    } else {
      ctx.fillStyle = "#adb5bd";
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(
        "长按1-4设编号/填入 · 长按F1-F4修改 · Enter保存",
        panelX + 10,
        panelY + 86
      );
    }
    ctx.textAlign = "left";
  }

  static drawWheel(ctx, game, arena) {
    if (!game || game.phase !== "pick" || !TeamCollectPickUiSystem.isWheelOpen()) {
      return;
    }

    const teamId = TeamCollectPickUiSystem.openTeamId;
    const centerX = (arena.left + arena.right) / 2;
    const centerY = (arena.top + arena.bottom) / 2 + 8;
    const radius = TeamCollectBallConstants.WHEEL_RADIUS;
    const pickNumber = TeamCollectPickUiSystem.getDraftPickNumber();
    const ballInfo = TeamCollectPickRegistry.resolveBallByPickNumber(
      game,
      pickNumber
    );

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(arena.left, arena.top, arena.right - arena.left, arena.bottom - arena.top);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 16, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(26, 26, 46, 0.94)";
    ctx.fill();
    ctx.strokeStyle = CollectorTeamId.getGlow(teamId);
    ctx.lineWidth = 4;
    ctx.stroke();

    const segmentCount = 12;
    for (let index = 0; index < segmentCount; index += 1) {
      const angle = (Math.PI * 2 * index) / segmentCount - Math.PI / 2;
      const innerR = radius + 2;
      const outerR = radius + 14;
      ctx.beginPath();
      ctx.moveTo(
        centerX + Math.cos(angle) * innerR,
        centerY + Math.sin(angle) * innerR
      );
      ctx.lineTo(
        centerX + Math.cos(angle) * outerR,
        centerY + Math.sin(angle) * outerR
      );
      ctx.strokeStyle =
        index % 3 === 0
          ? `${CollectorTeamId.getGlow(teamId)}cc`
          : "rgba(255,255,255,0.18)";
      ctx.lineWidth = index % 3 === 0 ? 3 : 1;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.strokeStyle = `${CollectorTeamId.getColor(teamId)}88`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = CollectorTeamId.getGlow(teamId);
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText(
      `${CollectorTeamId.getLabel(teamId)}编号轮盘`,
      centerX,
      centerY - radius - 28
    );

    const displayNumber =
      TeamCollectPickUiSystem.draftText.length > 0
        ? TeamCollectPickUiSystem.draftText
        : "---";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px system-ui, sans-serif";
    ctx.fillText(displayNumber, centerX, centerY + 12);

    if (pickNumber > 0 && ballInfo.heroName) {
      ctx.fillStyle = "#dee2e6";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText(ballInfo.heroName, centerX, centerY + 38);
    } else if (TeamCollectPickUiSystem.draftText.length === 0) {
      ctx.fillStyle = "#adb5bd";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText("轮盘为空，请输入编号", centerX, centerY + 38);
    } else {
      ctx.fillStyle = "#ff8787";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText("编号超出当前列表", centerX, centerY + 38);
    }

    ctx.fillStyle = "#ced4da";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(
      `编号范围 1-${TeamCollectPickUiSystem.getHeroCountLimit()} · Enter填入并关闭 · 再点确认选球`,
      centerX,
      centerY + radius + 34
    );
    ctx.textAlign = "left";
  }

  static drawSavedBallHighlight(ctx, slot, pickNumber, heroIndex) {
    if (pickNumber !== heroIndex + 1) {
      return;
    }

    ctx.beginPath();
    ctx.arc(slot.cx, slot.cy, slot.ballRadius + 10, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffd43b";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#ffd43b";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`轮盘 #${pickNumber}`, slot.cx, slot.cy - slot.ballRadius - 16);
    ctx.textAlign = "left";
  }

  static consumeLastPickMessage() {
    const message = TeamCollectPickUiSystem.lastPickMessage;
    TeamCollectPickUiSystem.lastPickMessage = "";
    return message;
  }
}

/**
 * 收集保存球技能系统
 */
class TeamCollectSkillSystem {
  static isCollectFighter(fighter) {
    return fighter && fighter.template.skillType === HeroSkillType.TEAM_COLLECT;
  }

  static getCollectorTeamId(fighter) {
    if (!TeamCollectSkillSystem.isCollectFighter(fighter)) {
      return null;
    }
    return fighter.template.collectorTeamId || null;
  }

  static initFighter(fighter) {
    fighter.teamCollectSavedNumber = 0;
    fighter.teamCollectLastTickTime = 0;
    fighter.teamCollectShowUntil = 0;
    fighter.teamCollectFlashUntil = 0;
  }

  static getCollectIntervalMs(fighter) {
    if (typeof CrazyFightSkillSystem !== "undefined") {
      return CrazyFightSkillSystem.getSkillIntervalMs(
        fighter,
        TeamCollectBallConstants.COLLECT_INTERVAL_MS
      );
    }
    return (
      fighter.template.skillIntervalMs ||
      TeamCollectBallConstants.COLLECT_INTERVAL_MS
    );
  }

  static addCollectedNumber(fighter, amount, now) {
    if (!TeamCollectSkillSystem.isCollectFighter(fighter) || amount <= 0) {
      return;
    }
    fighter.teamCollectSavedNumber += amount;
    fighter.teamCollectFlashUntil =
      now + TeamCollectBallConstants.DISPLAY_FLASH_MS;
  }

  static showCollection(fighter, now) {
    fighter.teamCollectShowUntil =
      now + TeamCollectBallConstants.DISPLAY_DURATION_MS;
  }

  static wasDisplayKeyPressed(input, teamId) {
    const codes = CollectorTeamId.getDisplayKeyCodes(teamId);
    return codes.some((code) => input.wasPressed(code));
  }

  static tickKeyboardInput(input, fighters, now) {
    if (!input || !fighters) {
      return;
    }

    for (const teamId of CollectorTeamId.getAll()) {
      if (!TeamCollectSkillSystem.wasDisplayKeyPressed(input, teamId)) {
        continue;
      }

      for (const fighter of fighters) {
        if (
          !fighter ||
          !fighter.isAlive() ||
          TeamCollectSkillSystem.getCollectorTeamId(fighter) !== teamId
        ) {
          continue;
        }
        TeamCollectSkillSystem.showCollection(fighter, now);
        if (typeof ElementStatusEffectSystem !== "undefined") {
          ElementStatusEffectSystem.setStatusText(
            fighter,
            `收藏 ${fighter.teamCollectSavedNumber}`
          );
        }
      }
    }
  }

  static tickCollect(fighter, opponent, projectiles, projectileRadius, now) {
    if (!TeamCollectSkillSystem.isCollectFighter(fighter) || !fighter.isAlive()) {
      return;
    }
    if (
      typeof ElementStatusEffectSystem !== "undefined" &&
      ElementStatusEffectSystem.isAttackBlocked(fighter)
    ) {
      return;
    }

    const interval = TeamCollectSkillSystem.getCollectIntervalMs(fighter);
    if (now - fighter.teamCollectLastTickTime < interval) {
      return;
    }

    fighter.teamCollectLastTickTime = now;
    TeamCollectSkillSystem.addCollectedNumber(
      fighter,
      TeamCollectBallConstants.COLLECT_AMOUNT_PER_TICK,
      now
    );

    if (opponent && opponent.isAlive()) {
      HeroAutoSkillSystem.fireShot(
        fighter,
        opponent,
        projectiles,
        projectileRadius,
        fighter.getSkillDamage(TeamCollectBallConstants.COLLECT_SHOT_DAMAGE),
        CollectorTeamId.getColor(
          TeamCollectSkillSystem.getCollectorTeamId(fighter)
        )
      );
    }
  }

  static onDealDamage(attacker, damageAmount, now) {
    if (
      !TeamCollectSkillSystem.isCollectFighter(attacker) ||
      damageAmount <= 0
    ) {
      return;
    }
    TeamCollectSkillSystem.addCollectedNumber(
      attacker,
      TeamCollectBallConstants.HIT_COLLECT_BONUS,
      now
    );
  }

  static draw(ctx, fighter) {
    if (!TeamCollectSkillSystem.isCollectFighter(fighter)) {
      return;
    }

    const teamId = TeamCollectSkillSystem.getCollectorTeamId(fighter);
    const now = Date.now();
    const saved = fighter.teamCollectSavedNumber || 0;

    ctx.fillStyle = CollectorTeamId.getColor(teamId);
    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `${CollectorTeamId.getShortLabel(teamId)}·${saved}`,
      fighter.x,
      fighter.y + fighter.radius + 22
    );

    if (now < fighter.teamCollectShowUntil) {
      ctx.fillStyle = "rgba(26, 26, 46, 0.88)";
      ctx.fillRect(fighter.x - 34, fighter.y - fighter.radius - 38, 68, 24);
      ctx.fillStyle = CollectorTeamId.getGlow(teamId);
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.fillText(String(saved), fighter.x, fighter.y - fighter.radius - 21);
    }

    if (now < fighter.teamCollectFlashUntil) {
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = `${CollectorTeamId.getGlow(teamId)}aa`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.textAlign = "left";
  }

  static getBattleHint(fighters) {
    const teamsPresent = new Set();
    for (const fighter of fighters) {
      const teamId = TeamCollectSkillSystem.getCollectorTeamId(fighter);
      if (teamId) {
        teamsPresent.add(teamId);
      }
    }
    if (teamsPresent.size === 0) {
      return "";
    }

    const parts = [];
    for (const teamId of CollectorTeamId.getAll()) {
      if (!teamsPresent.has(teamId)) {
        continue;
      }
      parts.push(
        `${CollectorTeamId.getShortLabel(teamId)}:${CollectorTeamId.getDisplayKeyHint(teamId)}`
      );
    }
    return `收集保存 · 按外围键查看收藏数（${parts.join(" · ")}）`;
  }
}
