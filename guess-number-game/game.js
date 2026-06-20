/**
 * 猜数字游戏 - 在 1 到 100 之间猜一个随机数
 */

const GameConstants = {
  MIN_NUMBER: 1,
  MAX_NUMBER: 100,
  FEEDBACK_DEFAULT: "开始猜吧！",
  FEEDBACK_TOO_LOW: "太小了，再大一点！",
  FEEDBACK_TOO_HIGH: "太大了，再小一点！",
  FEEDBACK_WIN: "恭喜你，猜对了！",
  FEEDBACK_INVALID: "请输入 1 到 100 之间的整数。",
  FEEDBACK_ALREADY_WON: "本局已猜对，点击「再玩一局」开始新游戏。",
};

/**
 * 随机整数生成器
 */
class RandomNumberGenerator {
  /**
   * @param {number} min 最小值（含）
   * @param {number} max 最大值（含）
   */
  constructor(min, max) {
    this.min = min;
    this.max = max;
  }

  /**
   * 生成范围内的随机整数
   * @returns {number}
   */
  generate() {
    const range = this.max - this.min + 1;
    return Math.floor(Math.random() * range) + this.min;
  }
}

/**
 * 猜数字游戏核心逻辑
 */
class GuessNumberGame {
  constructor() {
    this.generator = new RandomNumberGenerator(
      GameConstants.MIN_NUMBER,
      GameConstants.MAX_NUMBER
    );
    this.targetNumber = 0;
    this.wrongCount = 0;
    this.correctCount = 0;
    this.isRoundFinished = false;
    this.startNewRound();
  }

  /**
   * 开始新一局，重置目标数字与回合状态
   */
  startNewRound() {
    this.targetNumber = this.generator.generate();
    this.isRoundFinished = false;
    console.log("[GuessNumberGame] 新一局开始，目标数字已生成");
  }

  /**
   * 处理一次猜测
   * @param {number} guess 玩家输入
   * @returns {{ type: string, message: string }}
   */
  submitGuess(guess) {
    if (this.isRoundFinished) {
      return {
        type: "already-won",
        message: GameConstants.FEEDBACK_ALREADY_WON,
      };
    }

    if (!this.isValidGuess(guess)) {
      console.warn("[GuessNumberGame] 无效输入:", guess);
      return {
        type: "invalid",
        message: GameConstants.FEEDBACK_INVALID,
      };
    }

    if (guess < this.targetNumber) {
      this.wrongCount += 1;
      console.log("[GuessNumberGame] 猜小了，当前猜错次数:", this.wrongCount);
      return {
        type: "low",
        message: GameConstants.FEEDBACK_TOO_LOW,
      };
    }

    if (guess > this.targetNumber) {
      this.wrongCount += 1;
      console.log("[GuessNumberGame] 猜大了，当前猜错次数:", this.wrongCount);
      return {
        type: "high",
        message: GameConstants.FEEDBACK_TOO_HIGH,
      };
    }

    this.correctCount += 1;
    this.isRoundFinished = true;
    console.log(
      "[GuessNumberGame] 猜对了！数字:",
      this.targetNumber,
      "猜对次数:",
      this.correctCount
    );
    return {
      type: "win",
      message: `${GameConstants.FEEDBACK_WIN} 答案是 ${this.targetNumber}。`,
    };
  }

  /**
   * 校验猜测是否为有效整数
   * @param {number} guess
   * @returns {boolean}
   */
  isValidGuess(guess) {
    if (!Number.isInteger(guess)) {
      return false;
    }
    return (
      guess >= GameConstants.MIN_NUMBER && guess <= GameConstants.MAX_NUMBER
    );
  }
}

/**
 * 页面 UI 控制器
 */
class GuessNumberGameView {
  /**
   * @param {GuessNumberGame} game
   */
  constructor(game) {
    this.game = game;
    this.formElement = document.getElementById("guess-form");
    this.inputElement = document.getElementById("guess-input");
    this.submitButton = document.getElementById("submit-btn");
    this.feedbackElement = document.getElementById("feedback");
    this.wrongCountElement = document.getElementById("wrong-count");
    this.correctCountElement = document.getElementById("correct-count");
    this.restartButton = document.getElementById("restart-btn");
    this.bindEvents();
    this.renderStats();
    this.setFeedback(GameConstants.FEEDBACK_DEFAULT, "default");
  }

  bindEvents() {
    this.formElement.addEventListener("submit", (event) => {
      event.preventDefault();
      this.handleSubmit();
    });

    this.restartButton.addEventListener("click", () => {
      this.handleRestart();
    });
  }

  handleSubmit() {
    const rawValue = this.inputElement.value.trim();
    const guess = Number.parseInt(rawValue, 10);
    const result = this.game.submitGuess(guess);

    this.renderStats();
    this.applyFeedback(result);

    if (result.type === "win") {
      this.setRoundFinished(true);
      return;
    }

    if (result.type !== "already-won") {
      this.inputElement.select();
    }
  }

  handleRestart() {
    this.game.startNewRound();
    this.setRoundFinished(false);
    this.inputElement.value = "";
    this.renderStats();
    this.setFeedback(GameConstants.FEEDBACK_DEFAULT, "default");
    this.inputElement.focus();
  }

  renderStats() {
    this.wrongCountElement.textContent = String(this.game.wrongCount);
    this.correctCountElement.textContent = String(this.game.correctCount);
  }

  /**
   * @param {{ type: string, message: string }} result
   */
  applyFeedback(result) {
    const feedbackTypeMap = {
      low: "hint-low",
      high: "hint-high",
      win: "success",
      invalid: "error",
      "already-won": "success",
    };
    this.setFeedback(result.message, feedbackTypeMap[result.type] || "default");
  }

  /**
   * @param {string} message
   * @param {string} styleClass
   */
  setFeedback(message, styleClass) {
    this.feedbackElement.textContent = message;
    this.feedbackElement.className = "feedback";
    if (styleClass !== "default") {
      this.feedbackElement.classList.add(styleClass);
    }
  }

  /**
   * @param {boolean} finished
   */
  setRoundFinished(finished) {
    this.inputElement.disabled = finished;
    this.submitButton.disabled = finished;
    this.restartButton.classList.toggle("hidden", !finished);
  }
}

/**
 * 应用入口
 */
class GuessNumberApp {
  constructor() {
    this.game = new GuessNumberGame();
    this.view = new GuessNumberGameView(this.game);
    console.log("[GuessNumberApp] 猜数字游戏已启动");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new GuessNumberApp();
});
