/**
 * 全局暂停 / 退出控制
 */

const GameSessionControlConstants = {
  PAUSE_KEY: "Escape",
};

/**
 * 游戏会话暂停与退出
 */
class GameSessionControls {
  static prepareGame(game) {
    if (!game) {
      return;
    }
    game.isPaused = false;
  }

  static pause(game) {
    if (!game || game.state !== "playing" || game.isPaused) {
      return false;
    }

    game.isPaused = true;
    if (game.pickTimer && typeof game.pickTimer.pause === "function") {
      game.pickTimer.pause();
    }
    return true;
  }

  static resume(game) {
    if (!game || !game.isPaused) {
      return false;
    }

    game.isPaused = false;
    if (game.pickTimer && typeof game.pickTimer.resume === "function") {
      game.pickTimer.resume();
    }
    return true;
  }

  static exit(game) {
    if (!game) {
      return;
    }

    game.isPaused = false;
    game.state = "idle";

    if (game.animationId !== null) {
      cancelAnimationFrame(game.animationId);
      game.animationId = null;
    }

    if (game.pickTimer && typeof game.pickTimer.resume === "function") {
      game.pickTimer.resume();
    }
  }

  static shouldSkipUpdate(game) {
    return Boolean(game && game.isPaused);
  }
}
