/**
 * 商店与金币系统 - 对局获得收益 50% 金币，可购买皮肤、配饰、自创球
 */

const CoinRewardConstants = {
  BASE_MATCH_VALUE: 200,
  WIN_BONUS_VALUE: 100,
  REWARD_RATIO: 0.5,
};

const ShopStorageKeys = {
  WALLET: "ball_game_wallet_coins",
  INVENTORY: "ball_game_inventory",
  HAS_PLAYED: "ball_game_has_played_once",
};

/**
 * 商店商品类型
 */
class ShopItemType {
  static SKIN = "skin";

  static ACCESSORY = "accessory";

  static CUSTOM_BALL = "custom_ball";
}

/**
 * 对局金币奖励（本局价值的 50%）
 */
class CoinRewardCalculator {
  static calculateMatchValue(playerWon) {
    let value = CoinRewardConstants.BASE_MATCH_VALUE;
    if (playerWon) {
      value += CoinRewardConstants.WIN_BONUS_VALUE;
    }
    return value;
  }

  static calculateCoinsEarned(playerWon) {
    const matchValue = CoinRewardCalculator.calculateMatchValue(playerWon);
    return Math.floor(matchValue * CoinRewardConstants.REWARD_RATIO);
  }
}

/**
 * 本地存储读写
 */
class GameStorage {
  static readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return fallback;
      }
      return JSON.parse(raw);
    } catch (error) {
      console.warn("[GameStorage] 读取失败:", key, error);
      return fallback;
    }
  }

  static writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  static readNumber(key, fallback) {
    const raw = localStorage.getItem(key);
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  static writeNumber(key, value) {
    localStorage.setItem(key, String(value));
  }
}

/**
 * 玩家钱包
 */
class PlayerWallet {
  constructor() {
    this.coins = GameStorage.readNumber(ShopStorageKeys.WALLET, 0);
  }

  getCoins() {
    return this.coins;
  }

  addCoins(amount) {
    const value = Math.max(0, Math.floor(amount));
    this.coins += value;
    GameStorage.writeNumber(ShopStorageKeys.WALLET, this.coins);
    return value;
  }

  canAfford(price) {
    return this.coins >= price;
  }

  spend(price) {
    const cost = Math.max(0, Math.floor(price));
    if (!this.canAfford(cost)) {
      return false;
    }
    this.coins -= cost;
    GameStorage.writeNumber(ShopStorageKeys.WALLET, this.coins);
    return true;
  }
}

/**
 * 玩家背包
 */
class PlayerInventory {
  constructor() {
    const saved = GameStorage.readJson(ShopStorageKeys.INVENTORY, {});
    this.ownedSkinIds = saved.ownedSkinIds || [];
    this.ownedAccessoryIds = saved.ownedAccessoryIds || [];
    this.ownedCustomBallIds = saved.ownedCustomBallIds || [];
    this.equippedSkinId = saved.equippedSkinId || null;
    this.equippedAccessoryId = saved.equippedAccessoryId || null;
  }

  save() {
    GameStorage.writeJson(ShopStorageKeys.INVENTORY, {
      ownedSkinIds: this.ownedSkinIds,
      ownedAccessoryIds: this.ownedAccessoryIds,
      ownedCustomBallIds: this.ownedCustomBallIds,
      equippedSkinId: this.equippedSkinId,
      equippedAccessoryId: this.equippedAccessoryId,
    });
  }

  ownsItem(itemId, itemType) {
    if (itemType === ShopItemType.SKIN) {
      return this.ownedSkinIds.includes(itemId);
    }
    if (itemType === ShopItemType.ACCESSORY) {
      return this.ownedAccessoryIds.includes(itemId);
    }
    if (itemType === ShopItemType.CUSTOM_BALL) {
      return this.ownedCustomBallIds.includes(itemId);
    }
    return false;
  }

  addOwnedItem(itemId, itemType) {
    if (itemType === ShopItemType.SKIN && !this.ownedSkinIds.includes(itemId)) {
      this.ownedSkinIds.push(itemId);
    }
    if (
      itemType === ShopItemType.ACCESSORY &&
      !this.ownedAccessoryIds.includes(itemId)
    ) {
      this.ownedAccessoryIds.push(itemId);
    }
    if (
      itemType === ShopItemType.CUSTOM_BALL &&
      !this.ownedCustomBallIds.includes(itemId)
    ) {
      this.ownedCustomBallIds.push(itemId);
    }
    this.save();
  }

  equipSkin(skinId) {
    if (!this.ownedSkinIds.includes(skinId)) {
      return false;
    }
    this.equippedSkinId = skinId;
    this.save();
    return true;
  }

  equipAccessory(accessoryId) {
    if (!this.ownedAccessoryIds.includes(accessoryId)) {
      return false;
    }
    this.equippedAccessoryId = accessoryId;
    this.save();
    return true;
  }

  getEquippedSkinId() {
    return this.equippedSkinId;
  }

  getEquippedAccessoryId() {
    return this.equippedAccessoryId;
  }

  getPurchasedCustomBallTemplates() {
    return ShopCatalog.getCustomBalls()
      .filter((item) => this.ownedCustomBallIds.includes(item.id))
      .map((item) => item.toHeroTemplate());
  }
}

/**
 * 商店商品
 */
class ShopItem {
  constructor(id, itemType, name, description, price, payload) {
    this.id = id;
    this.itemType = itemType;
    this.name = name;
    this.description = description;
    this.price = price;
    this.payload = payload;
  }
}

/**
 * 可购自创球
 */
class PurchasableCustomBall extends ShopItem {
  constructor(id, name, description, price, templateConfig) {
    super(id, ShopItemType.CUSTOM_BALL, name, description, price, templateConfig);
    this.templateConfig = templateConfig;
  }

  toHeroTemplate() {
    const config = this.templateConfig;
    const template = new HeroBallTemplate(
      this.id,
      config.name,
      config.color,
      config.glow,
      config.maxHealth,
      config.moveSpeed,
      config.mass,
      config.skillType,
      config.skillDamage,
      config.skillIntervalMs,
      config.returnDamage
    );
    if (config.skillDisplayName) {
      template.skillDisplayName = config.skillDisplayName;
    }
    if (config.decoration) {
      template.decoration = config.decoration;
    }
    template.isShopItem = true;
    return template;
  }
}

/**
 * 商店目录
 */
class ShopCatalog {
  static getSkins() {
    return [
      new ShopItem(
        "skin_gold",
        ShopItemType.SKIN,
        "黄金皮肤",
        "球体变为金色光泽",
        80,
        { color: "#fcc419", glow: "#ffe066" }
      ),
      new ShopItem(
        "skin_ice",
        ShopItemType.SKIN,
        "冰霜皮肤",
        "冰蓝色寒冷光晕",
        90,
        { color: "#74c0fc", glow: "#a5d8ff" }
      ),
      new ShopItem(
        "skin_neon",
        ShopItemType.SKIN,
        "霓虹皮肤",
        "紫色霓虹赛博风",
        100,
        { color: "#be4bdb", glow: "#e599f7" }
      ),
    ];
  }

  static getAccessories() {
    return [
      new ShopItem(
        "acc_crown",
        ShopItemType.ACCESSORY,
        "皇冠配饰",
        "头顶显示皇冠装饰",
        50,
        { decoration: "👑" }
      ),
      new ShopItem(
        "acc_wings",
        ShopItemType.ACCESSORY,
        "翅膀配饰",
        "两侧显示翅膀符号",
        60,
        { decoration: "翼" }
      ),
      new ShopItem(
        "acc_halo",
        ShopItemType.ACCESSORY,
        "光环配饰",
        "头顶光环装饰",
        70,
        { decoration: "◯" }
      ),
    ];
  }

  static getCustomBalls() {
    return [
      new PurchasableCustomBall(
        "shop_ball_dragon",
        "商店·火龙球",
        "购入后出现在小球英雄选球列表",
        150,
        {
          name: "火龙球",
          color: "#ff6b6b",
          glow: "#ffa8a8",
          maxHealth: BallHealthResolver.resolve(105),
          moveSpeed: 9,
          mass: 1.05,
          skillType: HeroSkillType.SHOT,
          skillDamage: 18,
          skillIntervalMs: 1300,
          returnDamage: 14,
          decoration: "🔥",
          skillDisplayName: "龙焰弹射",
        }
      ),
      new PurchasableCustomBall(
        "shop_ball_shadow",
        "商店·暗影球",
        "购入后出现在小球英雄选球列表",
        180,
        {
          name: "暗影球",
          color: "#495057",
          glow: "#868e96",
          maxHealth: BallHealthResolver.resolve(98),
          moveSpeed: 10,
          mass: 0.95,
          skillType: HeroSkillType.SUNGLASSES,
          skillDamage: 15,
          skillIntervalMs: 1200,
          returnDamage: 12,
          decoration: "影",
          skillDisplayName: "暗影回旋",
        }
      ),
      new PurchasableCustomBall(
        "shop_ball_thunder",
        "商店·雷霆球",
        "购入后出现在小球英雄选球列表",
        200,
        {
          name: "雷霆球",
          color: "#fcc419",
          glow: "#ffe066",
          maxHealth: BallHealthResolver.resolve(92),
          moveSpeed: 10,
          mass: 1.0,
          skillType: HeroSkillType.PULSE,
          skillDamage: 20,
          skillIntervalMs: 1400,
          returnDamage: 16,
          decoration: "⚡",
          skillDisplayName: "雷霆震荡",
        }
      ),
    ];
  }

  static getAllItems() {
    return [
      ...ShopCatalog.getSkins(),
      ...ShopCatalog.getAccessories(),
      ...ShopCatalog.getCustomBalls(),
    ];
  }

  static getItemById(itemId) {
    return ShopCatalog.getAllItems().find((item) => item.id === itemId) || null;
  }
}

/**
 * 皮肤与配饰渲染
 */
class ShopCosmeticRenderer {
  static resolveColors(template, inventory) {
    const skinId = inventory.getEquippedSkinId();
    if (!skinId) {
      return { color: template.color, glow: template.glow };
    }
    const skin = ShopCatalog.getSkins().find((item) => item.id === skinId);
    if (!skin) {
      return { color: template.color, glow: template.glow };
    }
    return {
      color: skin.payload.color,
      glow: skin.payload.glow,
    };
  }

  static resolveDecoration(template, inventory) {
    if (template.decoration) {
      return template.decoration;
    }
    const accessoryId = inventory.getEquippedAccessoryId();
    if (!accessoryId) {
      return "";
    }
    const accessory = ShopCatalog.getAccessories().find(
      (item) => item.id === accessoryId
    );
    return accessory ? accessory.payload.decoration : "";
  }

  static drawEquippedAccessory(ctx, x, y, radius, decoration) {
    if (!decoration) {
      return;
    }
    ctx.fillStyle = "#ffd43b";
    ctx.font = `bold ${Math.max(10, radius * 0.42)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(decoration, x, y - radius - 10);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}

/**
 * 商店购买服务
 */
class ShopPurchaseService {
  constructor(wallet, inventory) {
    this.wallet = wallet;
    this.inventory = inventory;
  }

  purchase(itemId) {
    const item = ShopCatalog.getItemById(itemId);
    if (!item) {
      return { success: false, message: "商品不存在" };
    }
    if (this.inventory.ownsItem(item.id, item.itemType)) {
      return { success: false, message: "已拥有该商品" };
    }
    if (!this.wallet.canAfford(item.price)) {
      return { success: false, message: "金币不足" };
    }

    this.wallet.spend(item.price);
    this.inventory.addOwnedItem(item.id, item.itemType);

    if (item.itemType === ShopItemType.SKIN) {
      this.inventory.equipSkin(item.id);
    }
    if (item.itemType === ShopItemType.ACCESSORY) {
      this.inventory.equipAccessory(item.id);
    }

    let message = `购买成功：${item.name}`;
    if (item.itemType === ShopItemType.CUSTOM_BALL) {
      message += "（已加入小球英雄选球列表）";
    }

    return { success: true, message };
  }

  equipOwnedSkin(skinId) {
    if (!this.inventory.equipSkin(skinId)) {
      return { success: false, message: "尚未拥有该皮肤" };
    }
    return { success: true, message: "已装备皮肤" };
  }

  equipOwnedAccessory(accessoryId) {
    if (!this.inventory.equipAccessory(accessoryId)) {
      return { success: false, message: "尚未拥有该配饰" };
    }
    return { success: true, message: "已装备配饰" };
  }
}

/**
 * 游戏经济总线
 */
class GameEconomyService {
  constructor() {
    this.wallet = new PlayerWallet();
    this.inventory = new PlayerInventory();
    this.purchaseService = new ShopPurchaseService(this.wallet, this.inventory);
    this.hasPlayedOnce = localStorage.getItem(ShopStorageKeys.HAS_PLAYED) === "1";
  }

  static getInstance() {
    if (!GameEconomyService._instance) {
      GameEconomyService._instance = new GameEconomyService();
    }
    return GameEconomyService._instance;
  }

  markPlayedOnce() {
    this.hasPlayedOnce = true;
    localStorage.setItem(ShopStorageKeys.HAS_PLAYED, "1");
  }

  awardMatchCoins(playerWon) {
    this.markPlayedOnce();
    const matchValue = CoinRewardCalculator.calculateMatchValue(playerWon);
    const earned = CoinRewardCalculator.calculateCoinsEarned(playerWon);
    this.wallet.addCoins(earned);
    return { earned, matchValue };
  }
}

/**
 * 商店界面
 */
class ShopPanel {
  constructor(elements, economy) {
    this.elements = elements;
    this.economy = economy;
    this.activeTab = ShopItemType.SKIN;
    this.onInventoryChange = null;
    this.onBack = null;
    this.bindEvents();
    this.refresh();
  }

  bindEvents() {
    this.elements.openBtn.addEventListener("click", () => this.show());
    this.elements.closeBtn.addEventListener("click", () => this.hide());
    this.elements.backBtn.addEventListener("click", () => {
      this.hide();
      if (typeof this.onBack === "function") {
        this.onBack();
      }
    });

    for (const tabBtn of this.elements.tabButtons) {
      tabBtn.addEventListener("click", () => {
        this.activeTab = tabBtn.getAttribute("data-shop-tab");
        this.renderItems();
      });
    }
  }

  show() {
    this.elements.overlay.classList.remove("hidden");
    this.refresh();
  }

  hide() {
    this.elements.overlay.classList.add("hidden");
  }

  refresh() {
    this.elements.coinHud.textContent = `金币：${this.economy.wallet.getCoins()}`;
    this.elements.shopCoins.textContent = `当前金币：${this.economy.wallet.getCoins()}`;
    this.renderItems();
    if (typeof this.onInventoryChange === "function") {
      this.onInventoryChange();
    }
  }

  getItemsForTab() {
    if (this.activeTab === ShopItemType.SKIN) {
      return ShopCatalog.getSkins();
    }
    if (this.activeTab === ShopItemType.ACCESSORY) {
      return ShopCatalog.getAccessories();
    }
    return ShopCatalog.getCustomBalls();
  }

  renderItems() {
    const items = this.getItemsForTab();
    this.elements.list.innerHTML = "";

    for (const tabBtn of this.elements.tabButtons) {
      tabBtn.classList.toggle(
        "active",
        tabBtn.getAttribute("data-shop-tab") === this.activeTab
      );
    }

    for (const item of items) {
      const owned = this.economy.inventory.ownsItem(item.id, item.itemType);
      const card = document.createElement("div");
      card.className = "shop-item-card";

      const canBuy =
        this.economy.hasPlayedOnce &&
        !owned &&
        this.economy.wallet.canAfford(item.price);
      const locked = !this.economy.hasPlayedOnce;

      card.innerHTML = `
        <h3>${item.name}</h3>
        <p>${item.description}</p>
        <p class="shop-price">${item.price} 金币</p>
      `;

      const actionBtn = document.createElement("button");
      actionBtn.type = "button";
      actionBtn.className = "shop-buy-btn";

      if (owned) {
        actionBtn.textContent = "已拥有";
        actionBtn.disabled = true;
        if (item.itemType === ShopItemType.SKIN) {
          actionBtn.textContent = "装备";
          actionBtn.disabled = false;
          actionBtn.addEventListener("click", () => {
            const result = this.economy.purchaseService.equipOwnedSkin(item.id);
            this.elements.message.textContent = result.message;
            this.refresh();
          });
        }
        if (item.itemType === ShopItemType.ACCESSORY) {
          actionBtn.textContent = "装备";
          actionBtn.disabled = false;
          actionBtn.addEventListener("click", () => {
            const result = this.economy.purchaseService.equipOwnedAccessory(item.id);
            this.elements.message.textContent = result.message;
            this.refresh();
          });
        }
      } else if (locked) {
        actionBtn.textContent = "需先完成一局";
        actionBtn.disabled = true;
      } else if (!this.economy.wallet.canAfford(item.price)) {
        actionBtn.textContent = "金币不足";
        actionBtn.disabled = true;
      } else {
        actionBtn.textContent = "购买";
        actionBtn.addEventListener("click", () => {
          const result = this.economy.purchaseService.purchase(item.id);
          this.elements.message.textContent = result.message;
          this.refresh();
        });
      }

      card.appendChild(actionBtn);
      this.elements.list.appendChild(card);
    }
  }
}
