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
  WHEEL_MAX_DRAFT_DIGITS: 3,
  /** 选球保存编号下限 */
  MIN_SAVED_NUMBER: 1,
  /** 选球保存编号上限 */
  MAX_SAVED_NUMBER: 999,
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

  /** 外围数字键：小键盘 + 主键盘数字区 */
  static getDisplayKeyCodes(teamId) {
    const mapping = {
      [CollectorTeamId.RED]: ["Numpad1", "Digit1"],
      [CollectorTeamId.BLUE]: ["Numpad2", "Digit2"],
      [CollectorTeamId.GREEN]: ["Numpad3", "Digit3"],
      [CollectorTeamId.PURPLE]: ["Numpad4", "Digit4"],
    };
    return mapping[teamId] || [];
  }

  static getDisplayKeyHint(teamId) {
    const hints = {
      [CollectorTeamId.RED]: "小键盘1 或 1",
      [CollectorTeamId.BLUE]: "小键盘2 或 2",
      [CollectorTeamId.GREEN]: "小键盘3 或 3",
      [CollectorTeamId.PURPLE]: "小键盘4 或 4",
    };
    return hints[teamId] || "";
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
 * 四队选球编号登记（收集保存：记住常用球的列表编号，长按快捷键在选球盘显示）
 */
class TeamCollectPickRegistry {
  static teamNumbers = {
    [CollectorTeamId.RED]: null,
    [CollectorTeamId.BLUE]: null,
    [CollectorTeamId.GREEN]: null,
    [CollectorTeamId.PURPLE]: null,
  };

  static clampNumber(value) {
    const parsed = Math.floor(Number(value));
    if (!Number.isFinite(parsed)) {
      return TeamCollectBallConstants.MIN_SAVED_NUMBER;
    }
    return Math.max(
      TeamCollectBallConstants.MIN_SAVED_NUMBER,
      Math.min(TeamCollectBallConstants.MAX_SAVED_NUMBER, parsed)
    );
  }

  static hasNumber(teamId) {
    return typeof TeamCollectPickRegistry.teamNumbers[teamId] === "number";
  }

  static getNumber(teamId) {
    if (!teamId || !TeamCollectPickRegistry.hasNumber(teamId)) {
      return 0;
    }
    return TeamCollectPickRegistry.teamNumbers[teamId];
  }

  static setNumber(teamId, value) {
    if (!teamId) {
      return {
        ok: false,
        message: "未知队伍，无法保存球编号",
      };
    }
    const nextValue = TeamCollectPickRegistry.clampNumber(value);
    TeamCollectPickRegistry.teamNumbers[teamId] = nextValue;
    return {
      ok: true,
      teamId,
      value: nextValue,
      message: `${CollectorTeamId.getLabel(teamId)}轮盘已保存 #${nextValue}`,
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
    const pickNumber = TeamCollectPickRegistry.getNumber(teamId);
    return TeamCollectPickRegistry.resolveBallByPickNumber(game, pickNumber);
  }

  static getAllNumberSummary() {
    return CollectorTeamId.getAll()
      .map((teamId) => {
        const keyHint = CollectorTeamId.getDisplayKeyHint(teamId);
        if (!TeamCollectPickRegistry.hasNumber(teamId)) {
          return `${CollectorTeamId.getShortLabel(teamId)}:空(按${keyHint})`;
        }
        const number = TeamCollectPickRegistry.getNumber(teamId);
        return `${CollectorTeamId.getShortLabel(teamId)}:#${number}(按${keyHint})`;
      })
      .join(" · ");
  }
}

/**
 * 选球输入：保存各队常用球编号（如 收25、红收25）
 */
class TeamCollectPickInputParser {
  static TEAM_NAME_TO_ID = {
    红: CollectorTeamId.RED,
    蓝: CollectorTeamId.BLUE,
    绿: CollectorTeamId.GREEN,
    紫: CollectorTeamId.PURPLE,
  };

  static tryParse(rawInput, pickStep) {
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
        parseInt(currentTeamMatch[1], 10)
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
        parseInt(namedTeamMatch[2], 10)
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
 * 选球界面：四队数字轮盘（按1-4打开，输入编号后 Enter 保存并快选）
 */
class TeamCollectPickUiSystem {
  static openTeamId = null;

  static draftText = "";

  static lastPickMessage = "";

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

  static wasTeamKeyPressed(input, teamId) {
    const codes = CollectorTeamId.getDisplayKeyCodes(teamId);
    return codes.some((code) => input.wasPressed(code));
  }

  static isWheelOpen() {
    return Boolean(TeamCollectPickUiSystem.openTeamId);
  }

  static openWheel(teamId) {
    TeamCollectPickUiSystem.openTeamId = teamId;
    const savedNumber = TeamCollectPickRegistry.getNumber(teamId);
    TeamCollectPickUiSystem.draftText =
      savedNumber > 0 ? String(savedNumber) : "";
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
    return TeamCollectPickRegistry.clampNumber(parsed);
  }

  static appendDraftDigit(digit) {
    if (!digit) {
      return;
    }
    const nextText = `${TeamCollectPickUiSystem.draftText}${digit}`;
    if (nextText.length > TeamCollectBallConstants.WHEEL_MAX_DRAFT_DIGITS) {
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
    const current = TeamCollectPickUiSystem.getDraftPickNumber();
    const heroCount =
      TeamCollectPickUiSystem._draftHeroCount ||
      TeamCollectBallConstants.MAX_SAVED_NUMBER;
    const base = current > 0 ? current : 1;
    const next = TeamCollectPickRegistry.clampNumber(base + delta);
    const capped = Math.min(next, heroCount);
    TeamCollectPickUiSystem.draftText = String(Math.max(1, capped));
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
    const pickNumber = TeamCollectPickUiSystem.getDraftPickNumber();
    if (!teamId || pickNumber <= 0) {
      TeamCollectPickUiSystem.lastPickMessage = "请在轮盘上输入有效编号";
      return null;
    }

    const saveResult = TeamCollectPickRegistry.setNumber(teamId, pickNumber);
    const ballInfo = TeamCollectPickRegistry.resolveBallByPickNumber(
      game,
      pickNumber
    );
    const pickStep = CollectorTeamId.getPickStep(teamId);

    if (
      game &&
      game.pickStep === pickStep &&
      game.canPlayerPickNow() &&
      ballInfo.hero &&
      !game.takenHeroIds.has(ballInfo.hero.id) &&
      game.tryPickHero(ballInfo.hero.id)
    ) {
      TeamCollectPickUiSystem.lastPickMessage = `已选 ${ballInfo.heroName}（#${pickNumber}）`;
      TeamCollectPickUiSystem.closeWheel();
      return { ok: true, message: TeamCollectPickUiSystem.lastPickMessage };
    }

    const ballLabel = ballInfo.heroName || "编号超出当前列表";
    TeamCollectPickUiSystem.lastPickMessage = `${saveResult.message} · ${ballLabel}`;
    return { ok: true, message: TeamCollectPickUiSystem.lastPickMessage };
  }

  static handleWheelEditing(input, game) {
    if (input.wasPressed("Escape")) {
      TeamCollectPickUiSystem.closeWheel();
      TeamCollectPickUiSystem.lastPickMessage = "已关闭编号轮盘";
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

  static getPickHint() {
    return `收集保存 · 按1-4打开编号轮盘 · Enter确认 · ${TeamCollectPickRegistry.getAllNumberSummary()}`;
  }

  static tickPickKeyboard(input, game, now) {
    if (!input || !game || game.phase !== "pick") {
      return null;
    }

    TeamCollectPickUiSystem._draftHeroCount = game.getHeroes().length;

    if (TeamCollectPickUiSystem.isWheelOpen()) {
      TeamCollectPickUiSystem.handleWheelEditing(input, game);
      return null;
    }

    for (const teamId of CollectorTeamId.getAll()) {
      if (TeamCollectPickUiSystem.wasTeamKeyPressed(input, teamId)) {
        TeamCollectPickUiSystem.openWheel(teamId);
        TeamCollectPickUiSystem.lastPickMessage = `${CollectorTeamId.getLabel(
          teamId
        )}编号轮盘已打开，请输入编号`;
        return null;
      }
    }

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
    for (const teamId of CollectorTeamId.getAll()) {
      const isOpen = TeamCollectPickUiSystem.openTeamId === teamId;
      const hasSaved = TeamCollectPickRegistry.hasNumber(teamId);
      const savedNumber = TeamCollectPickRegistry.getNumber(teamId);
      const savedBall = hasSaved
        ? TeamCollectPickRegistry.resolveSavedBall(game, teamId)
        : null;

      ctx.fillStyle = isOpen
        ? CollectorTeamId.getGlow(teamId)
        : CollectorTeamId.getColor(teamId);
      ctx.font = isOpen ? "bold 13px system-ui, sans-serif" : "12px system-ui, sans-serif";

      const numberLabel = hasSaved ? `#${savedNumber}` : "空";
      const ballLabel = savedBall && savedBall.heroName ? savedBall.heroName : "未设置";
      ctx.fillText(
        `${CollectorTeamId.getLabel(teamId)} ${numberLabel} ${ballLabel} · 按${CollectorTeamId.getDisplayKeyHint(
          teamId
        )}`,
        panelX + 10,
        rowY
      );
      rowY += 16;
    }

    ctx.fillStyle = "#adb5bd";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("按1-4开轮盘 · 数字键输入 · Enter确认选球", panelX + 10, panelY + 86);
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
      "数字键输入 · ↑↓微调 · Enter确认 · Esc关闭 · 再按队伍键切换",
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
