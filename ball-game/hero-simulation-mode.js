/**
 * 小球英雄 · 模拟试球场
 * 中央试球，周围 9 颗红色靶球，无胜负，可反复测试技能
 */

const HeroSimulationConstants = {
  /** 红色靶球数量 */
  DUMMY_COUNT: 9,
  /** 靶球独立玩家编号起点 */
  DUMMY_PLAYER_ID_START: 51,
  /** 靶球排列半径（相对场地中心） */
  DUMMY_RING_RADIUS_RATIO: 0.28,
  /** 靶球生命值 */
  DUMMY_MAX_HEALTH: 888,
  /** 靶球移速 */
  DUMMY_MOVE_SPEED: 7.5,
  /** 靶球质量 */
  DUMMY_MASS: 1,
  /** 靶球死亡后重生延迟（毫秒） */
  DUMMY_RESPAWN_DELAY_MS: 900,
  DUMMY_COLOR: "#e03131",
  DUMMY_GLOW: "#ff6b6b",
  DUMMY_NAME: "红靶",
};

/**
 * 模拟试球场靶球模板
 */
class SimulationDummyTemplateFactory {
  static create() {
    return new HeroBallTemplate(
      "simulation_dummy",
      HeroSimulationConstants.DUMMY_NAME,
      HeroSimulationConstants.DUMMY_COLOR,
      HeroSimulationConstants.DUMMY_GLOW,
      HeroSimulationConstants.DUMMY_MAX_HEALTH,
      HeroSimulationConstants.DUMMY_MOVE_SPEED,
      HeroSimulationConstants.DUMMY_MASS,
      HeroSkillType.BUMP,
      0,
      99999
    );
  }
}

/**
 * 模拟试球场系统
 */
class HeroSimulationMode {
  static isSimulationGame(game) {
    return (
      game &&
      typeof game.isSimulation === "function" &&
      game.isSimulation()
    );
  }

  static isSimulationDummy(fighter) {
    return Boolean(fighter && fighter.isSimulationDummy);
  }

  static initBattle(game) {
    if (!game) {
      return;
    }
    game.simulationRespawnQueue = [];
  }

  static getArenaCenter(arena) {
    return {
      x: (arena.left + arena.right) / 2,
      y: (arena.top + arena.bottom) / 2,
    };
  }

  static getDummyRingRadius(arena) {
    const arenaWidth = arena.right - arena.left;
    const arenaHeight = arena.bottom - arena.top;
    return (
      Math.min(arenaWidth, arenaHeight) *
      HeroSimulationConstants.DUMMY_RING_RADIUS_RATIO
    );
  }

  static getDummySpawnPoints(arena) {
    const center = HeroSimulationMode.getArenaCenter(arena);
    const ringRadius = HeroSimulationMode.getDummyRingRadius(arena);
    const points = [];

    for (let index = 0; index < HeroSimulationConstants.DUMMY_COUNT; index += 1) {
      const angle =
        (Math.PI * 2 * index) / HeroSimulationConstants.DUMMY_COUNT -
        Math.PI / 2;
      points.push({
        x: center.x + Math.cos(angle) * ringRadius,
        y: center.y + Math.sin(angle) * ringRadius,
        angle,
      });
    }

    return points;
  }

  static allocateDummyPlayerId(game, index) {
    return HeroSimulationConstants.DUMMY_PLAYER_ID_START + index;
  }

  static createDummyFighter(game, spawnPoint, index) {
    const radius = game.getBallRadius();
    const template = SimulationDummyTemplateFactory.create();
    const dirX = Math.cos(spawnPoint.angle + Math.PI);
    const dirY = Math.sin(spawnPoint.angle + Math.PI);
    const dummy = new HeroBallFighter(
      HeroSimulationMode.allocateDummyPlayerId(game, index),
      template,
      spawnPoint.x,
      spawnPoint.y,
      radius,
      dirX,
      dirY
    );

    dummy.isSimulationDummy = true;
    dummy.simulationSpawnX = spawnPoint.x;
    dummy.simulationSpawnY = spawnPoint.y;
    dummy.simulationSpawnAngle = spawnPoint.angle;
    dummy.simulationDummyIndex = index;
    return dummy;
  }

  static createTestFighter(game, template) {
    const center = HeroSimulationMode.getArenaCenter(game.arena);
    const radius = game.getBallRadius();
    return new HeroBallFighter(
      1,
      template,
      center.x,
      center.y,
      radius,
      1,
      0.15
    );
  }

  static spawnFighters(game) {
    const heroTemplate = game.getHeroById(game.p1HeroId);
    const fighters = [HeroSimulationMode.createTestFighter(game, heroTemplate)];
    const spawnPoints = HeroSimulationMode.getDummySpawnPoints(game.arena);

    for (let index = 0; index < spawnPoints.length; index += 1) {
      fighters.push(
        HeroSimulationMode.createDummyFighter(game, spawnPoints[index], index)
      );
    }

    for (const fighter of fighters) {
      if (DefenseBallSkillSystem.isDefenseFighter(fighter)) {
        DefenseBallSkillSystem.rollDefenseItemForBattle(fighter);
      }
    }

    return fighters;
  }

  static queueDummyRespawn(dummy, game, now) {
    if (!game.simulationRespawnQueue) {
      game.simulationRespawnQueue = [];
    }
    game.simulationRespawnQueue.push({
      dummyIndex: dummy.simulationDummyIndex,
      respawnAt: now + HeroSimulationConstants.DUMMY_RESPAWN_DELAY_MS,
    });
  }

  static removeDeadDummies(game, now) {
    for (let index = game.fighters.length - 1; index >= 0; index -= 1) {
      const fighter = game.fighters[index];
      if (!HeroSimulationMode.isSimulationDummy(fighter) || fighter.isAlive()) {
        continue;
      }
      if (!fighter.simulationRespawnQueued) {
        fighter.simulationRespawnQueued = true;
        HeroSimulationMode.queueDummyRespawn(fighter, game, now);
      }
      game.fighters.splice(index, 1);
    }
  }

  static processRespawnQueue(game, now) {
    if (!game.simulationRespawnQueue || game.simulationRespawnQueue.length === 0) {
      return;
    }

    const spawnPoints = HeroSimulationMode.getDummySpawnPoints(game.arena);
    const remaining = [];

    for (const entry of game.simulationRespawnQueue) {
      if (now < entry.respawnAt) {
        remaining.push(entry);
        continue;
      }

      const spawnPoint = spawnPoints[entry.dummyIndex];
      if (!spawnPoint) {
        continue;
      }

      const hasAliveDummy = game.fighters.some(
        (fighter) =>
          HeroSimulationMode.isSimulationDummy(fighter) &&
          fighter.isAlive() &&
          fighter.simulationDummyIndex === entry.dummyIndex
      );
      if (!hasAliveDummy) {
        game.fighters.push(
          HeroSimulationMode.createDummyFighter(game, spawnPoint, entry.dummyIndex)
        );
      }
    }

    game.simulationRespawnQueue = remaining;
  }

  static reviveTestFighter(game) {
    const testFighter = game.fighters.find(
      (fighter) =>
        fighter &&
        fighter.playerId === 1 &&
        !HeroSimulationMode.isSimulationDummy(fighter)
    );
    if (!testFighter || testFighter.isAlive()) {
      return;
    }

    const center = HeroSimulationMode.getArenaCenter(game.arena);
    testFighter.health = testFighter.maxHealth;
    testFighter.x = center.x;
    testFighter.y = center.y;
    testFighter.vx = testFighter.template.moveSpeed;
    testFighter.vy = 0.15 * testFighter.template.moveSpeed;

    if (typeof ElementStatusEffectSystem !== "undefined") {
      ElementStatusEffectSystem.initFighter(testFighter);
    }
    if (typeof SuccubusBallSkillSystem !== "undefined") {
      SuccubusBallSkillSystem.initCharmState(testFighter);
    }
  }

  static tick(game, now) {
    if (!HeroSimulationMode.isSimulationGame(game)) {
      return;
    }
    HeroSimulationMode.reviveTestFighter(game);
    HeroSimulationMode.removeDeadDummies(game, now);
    HeroSimulationMode.processRespawnQueue(game, now);
  }

  static countAliveDummies(fighters) {
    return fighters.filter(
      (fighter) =>
        HeroSimulationMode.isSimulationDummy(fighter) && fighter.isAlive()
    ).length;
  }

  static drawArenaHint(ctx, game) {
    if (!HeroSimulationMode.isSimulationGame(game)) {
      return;
    }

    const center = HeroSimulationMode.getArenaCenter(game.arena);
    const ringRadius = HeroSimulationMode.getDummyRingRadius(game.arena);

    ctx.beginPath();
    ctx.arc(center.x, center.y, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(224, 49, 49, 0.18)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(224, 49, 49, 0.75)";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("试球区", center.x, center.y - ringRadius - 12);
    ctx.textAlign = "left";
  }

  static drawDummyBadge(ctx, fighter) {
    if (!HeroSimulationMode.isSimulationDummy(fighter)) {
      return;
    }

    ctx.fillStyle = "#ffe3e3";
    ctx.font = "bold 8px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("靶", fighter.x, fighter.y - fighter.radius - 8);
    ctx.textAlign = "left";
  }
}
