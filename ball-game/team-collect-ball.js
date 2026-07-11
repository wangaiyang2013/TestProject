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
