/**
 * 小球英雄双队团战 - 红蓝队 vs 绿紫队，30 回合制
 */

const HeroTeamBattleConstants = {
  MAX_ROUNDS: 30,
};

/**
 * 团战阵营注册表
 */
class HeroTeamRegistry {
  static TEAM_RED_BLUE = "red_blue";

  static TEAM_GREEN_PURPLE = "green_purple";

  static getTeamId(playerId) {
    if (playerId === 1 || playerId === 2) {
      return HeroTeamRegistry.TEAM_RED_BLUE;
    }
    if (playerId === 3 || playerId === 4) {
      return HeroTeamRegistry.TEAM_GREEN_PURPLE;
    }
    return null;
  }

  static areEnemies(playerIdA, playerIdB) {
    const teamA = HeroTeamRegistry.getTeamId(playerIdA);
    const teamB = HeroTeamRegistry.getTeamId(playerIdB);
    if (!teamA || !teamB) {
      return true;
    }
    return teamA !== teamB;
  }

  static isRedBlueTeam(playerId) {
    return HeroTeamRegistry.getTeamId(playerId) === HeroTeamRegistry.TEAM_RED_BLUE;
  }

  static isGreenPurpleTeam(playerId) {
    return (
      HeroTeamRegistry.getTeamId(playerId) === HeroTeamRegistry.TEAM_GREEN_PURPLE
    );
  }

  static getTeamLabel(teamId) {
    if (teamId === HeroTeamRegistry.TEAM_RED_BLUE) {
      return "红蓝队";
    }
    if (teamId === HeroTeamRegistry.TEAM_GREEN_PURPLE) {
      return "绿紫队";
    }
    return "未知队伍";
  }

  static getPlayerIdsForTeam(teamId) {
    if (teamId === HeroTeamRegistry.TEAM_RED_BLUE) {
      return [1, 2];
    }
    if (teamId === HeroTeamRegistry.TEAM_GREEN_PURPLE) {
      return [3, 4];
    }
    return [];
  }
}

/**
 * 30 回合系列赛计分
 */
class TeamBattleRoundManager {
  constructor(maxRounds) {
    this.maxRounds = maxRounds;
    this.roundNumber = 1;
    this.teamWins = {
      [HeroTeamRegistry.TEAM_RED_BLUE]: 0,
      [HeroTeamRegistry.TEAM_GREEN_PURPLE]: 0,
    };
    this.lastRoundWinnerTeamId = null;
  }

  recordRoundWin(teamId) {
    this.teamWins[teamId] += 1;
    this.lastRoundWinnerTeamId = teamId;
  }

  getRoundsRemaining() {
    return Math.max(0, this.maxRounds - this.roundNumber);
  }

  evaluateSeriesEnd() {
    const redBlueWins = this.teamWins[HeroTeamRegistry.TEAM_RED_BLUE];
    const greenPurpleWins = this.teamWins[HeroTeamRegistry.TEAM_GREEN_PURPLE];
    const roundsRemaining = this.getRoundsRemaining();

    if (redBlueWins > greenPurpleWins + roundsRemaining) {
      return HeroTeamRegistry.TEAM_RED_BLUE;
    }
    if (greenPurpleWins > redBlueWins + roundsRemaining) {
      return HeroTeamRegistry.TEAM_GREEN_PURPLE;
    }
    if (this.roundNumber >= this.maxRounds) {
      if (redBlueWins > greenPurpleWins) {
        return HeroTeamRegistry.TEAM_RED_BLUE;
      }
      if (greenPurpleWins > redBlueWins) {
        return HeroTeamRegistry.TEAM_GREEN_PURPLE;
      }
      return this.lastRoundWinnerTeamId;
    }
    return null;
  }

  advanceToNextRound() {
    this.roundNumber += 1;
  }

  getSnapshot() {
    return {
      roundNumber: this.roundNumber,
      maxRounds: this.maxRounds,
      redBlueWins: this.teamWins[HeroTeamRegistry.TEAM_RED_BLUE],
      greenPurpleWins: this.teamWins[HeroTeamRegistry.TEAM_GREEN_PURPLE],
    };
  }
}
