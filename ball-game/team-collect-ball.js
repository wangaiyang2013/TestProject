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
  /** 选球界面快捷键展示持续时间 */
  PICK_DISPLAY_DURATION_MS: 3200,
  /** 收藏数输入下限 */
  MIN_SAVED_NUMBER: 1,
  /** 收藏数输入上限 */
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
 * 四队收藏数登记（选球时可输入，快捷键可查看）
 */
class TeamCollectPickRegistry {
  static DEFAULT_NUMBERS = {
    [CollectorTeamId.RED]: 25,
    [CollectorTeamId.BLUE]: 11,
    [CollectorTeamId.GREEN]: 9,
    [CollectorTeamId.PURPLE]: 15,
  };

  static teamNumbers = {
    [CollectorTeamId.RED]: TeamCollectPickRegistry.DEFAULT_NUMBERS[
      CollectorTeamId.RED
    ],
    [CollectorTeamId.BLUE]: TeamCollectPickRegistry.DEFAULT_NUMBERS[
      CollectorTeamId.BLUE
    ],
    [CollectorTeamId.GREEN]: TeamCollectPickRegistry.DEFAULT_NUMBERS[
      CollectorTeamId.GREEN
    ],
    [CollectorTeamId.PURPLE]: TeamCollectPickRegistry.DEFAULT_NUMBERS[
      CollectorTeamId.PURPLE
    ],
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

  static getNumber(teamId) {
    if (!teamId) {
      return 0;
    }
    const stored = TeamCollectPickRegistry.teamNumbers[teamId];
    if (typeof stored !== "number") {
      return TeamCollectPickRegistry.DEFAULT_NUMBERS[teamId] || 0;
    }
    return stored;
  }

  static setNumber(teamId, value) {
    if (!teamId) {
      return {
        ok: false,
        message: "未知队伍，无法设置收藏数",
      };
    }
    const nextValue = TeamCollectPickRegistry.clampNumber(value);
    TeamCollectPickRegistry.teamNumbers[teamId] = nextValue;
    return {
      ok: true,
      teamId,
      value: nextValue,
      message: `${CollectorTeamId.getLabel(teamId)}收藏数已设为 ${nextValue}`,
    };
  }

  static syncCollectTemplateLabels(heroes) {
    if (!heroes) {
      return;
    }
    for (const hero of heroes) {
      if (hero.skillType !== HeroSkillType.TEAM_COLLECT) {
        continue;
      }
      const teamId = hero.collectorTeamId;
      const savedNumber = TeamCollectPickRegistry.getNumber(teamId);
      hero.name = `${CollectorTeamId.getLabel(teamId)}收集球·${savedNumber}`;
      hero.decoration = String(savedNumber);
      hero.collectSavedNumber = savedNumber;
    }
  }

  static findCollectHero(heroes, teamId, availableHeroes) {
    const source = availableHeroes || heroes;
    if (!source) {
      return null;
    }
    return (
      source.find(
        (hero) =>
          hero.skillType === HeroSkillType.TEAM_COLLECT &&
          hero.collectorTeamId === teamId
      ) || null
    );
  }

  static getAllNumberSummary() {
    return CollectorTeamId.getAll()
      .map((teamId) => {
        const number = TeamCollectPickRegistry.getNumber(teamId);
        const keyHint = CollectorTeamId.getDisplayKeyHint(teamId);
        return `${CollectorTeamId.getShortLabel(teamId)}:${number}(${keyHint})`;
      })
      .join(" · ");
  }
}

/**
 * 选球输入：设置各队收藏数（如 收25、红收25）
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
          message: "当前步骤无法设置收藏数",
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
 * 选球界面快捷键与收藏数展示
 */
class TeamCollectPickUiSystem {
  static teamShowUntil = {
    [CollectorTeamId.RED]: 0,
    [CollectorTeamId.BLUE]: 0,
    [CollectorTeamId.GREEN]: 0,
    [CollectorTeamId.PURPLE]: 0,
  };

  static lastPickMessage = "";

  static showTeamNumber(teamId, now) {
    TeamCollectPickUiSystem.teamShowUntil[teamId] =
      now + TeamCollectBallConstants.PICK_DISPLAY_DURATION_MS;
  }

  static getPickHint() {
    return `收集保存 · 输入「收25」设收藏数 · 快捷键查看/快选：${TeamCollectPickRegistry.getAllNumberSummary()}`;
  }

  static tickPickKeyboard(input, game, now) {
    if (!input || !game || game.phase !== "pick") {
      return null;
    }

    for (const teamId of CollectorTeamId.getAll()) {
      if (!TeamCollectSkillSystem.wasDisplayKeyPressed(input, teamId)) {
        continue;
      }

      const savedNumber = TeamCollectPickRegistry.getNumber(teamId);
      TeamCollectPickUiSystem.showTeamNumber(teamId, now);
      TeamCollectPickUiSystem.lastPickMessage = `${CollectorTeamId.getLabel(
        teamId
      )}收藏数：${savedNumber}`;

      const pickStep = CollectorTeamId.getPickStep(teamId);
      if (game.pickStep !== pickStep || !game.canPlayerPickNow()) {
        continue;
      }

      const collectHero = TeamCollectPickRegistry.findCollectHero(
        game.getHeroes(),
        teamId,
        game.getAvailableHeroes()
      );
      if (!collectHero) {
        TeamCollectPickUiSystem.lastPickMessage = `${CollectorTeamId.getLabel(
          teamId
        )}收集球·${savedNumber} 已被选走`;
        continue;
      }

      if (game.tryPickHero(collectHero.id)) {
        TeamCollectPickUiSystem.lastPickMessage = `已选 ${collectHero.name}（快捷键 ${CollectorTeamId.getDisplayKeyHint(
          teamId
        )}）`;
        return {
          ok: true,
          message: TeamCollectPickUiSystem.lastPickMessage,
        };
      }
    }

    return null;
  }

  static drawPickOverlay(ctx, game, arena) {
    if (!game || game.phase !== "pick") {
      return;
    }

    const now = Date.now();
    const panelX = arena.left + 12;
    const panelY = arena.bottom - 118;

    ctx.fillStyle = "rgba(26, 26, 46, 0.82)";
    ctx.fillRect(panelX, panelY, 250, 96);
    ctx.strokeStyle = "rgba(255, 212, 59, 0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, 250, 96);

    ctx.fillStyle = "#ffd43b";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("收集保存 · 各队收藏数", panelX + 10, panelY + 18);

    let rowY = panelY + 36;
    for (const teamId of CollectorTeamId.getAll()) {
      const savedNumber = TeamCollectPickRegistry.getNumber(teamId);
      const isActive = now < TeamCollectPickUiSystem.teamShowUntil[teamId];
      ctx.fillStyle = isActive
        ? CollectorTeamId.getGlow(teamId)
        : CollectorTeamId.getColor(teamId);
      ctx.font = isActive ? "bold 13px system-ui, sans-serif" : "12px system-ui, sans-serif";
      ctx.fillText(
        `${CollectorTeamId.getLabel(teamId)} ${savedNumber} · ${CollectorTeamId.getDisplayKeyHint(
          teamId
        )}`,
        panelX + 10,
        rowY
      );
      rowY += 16;
    }

    ctx.fillStyle = "#adb5bd";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("轮到你时按对应键可快选该队收集球", panelX + 10, panelY + 86);
    ctx.textAlign = "left";
  }

  static drawActiveNumberPopup(ctx, game, arena) {
    if (!game || game.phase !== "pick") {
      return;
    }

    const now = Date.now();
    let activeTeamId = null;
    for (const teamId of CollectorTeamId.getAll()) {
      if (now < TeamCollectPickUiSystem.teamShowUntil[teamId]) {
        activeTeamId = teamId;
        break;
      }
    }
    if (!activeTeamId) {
      return;
    }

    const savedNumber = TeamCollectPickRegistry.getNumber(activeTeamId);
    const centerX = (arena.left + arena.right) / 2;
    const centerY = arena.top + 92;

    ctx.fillStyle = "rgba(26, 26, 46, 0.9)";
    ctx.fillRect(centerX - 120, centerY - 28, 240, 56);
    ctx.strokeStyle = CollectorTeamId.getGlow(activeTeamId);
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX - 120, centerY - 28, 240, 56);

    ctx.textAlign = "center";
    ctx.fillStyle = CollectorTeamId.getGlow(activeTeamId);
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.fillText(
      `${CollectorTeamId.getLabel(activeTeamId)}收藏数`,
      centerX,
      centerY - 6
    );
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.fillText(String(savedNumber), centerX, centerY + 22);
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
    const teamId = TeamCollectSkillSystem.getCollectorTeamId(fighter);
    const presetNumber =
      typeof TeamCollectPickRegistry !== "undefined"
        ? TeamCollectPickRegistry.getNumber(teamId)
        : 0;
    fighter.teamCollectSavedNumber = presetNumber;
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
