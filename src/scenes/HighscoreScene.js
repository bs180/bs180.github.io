export class HighscoreScene {
  constructor(width, height, assets = {}) {
    this.width = width;
    this.height = height;
    this.assets = assets;
    this.storageKey = "astroDrift_highscores_timeOnly";
    this.legacyStorageKey = "astroDrift_highscores";
    this.currentState = "view"; // "view", "enter_name"
    this.newScore = null; // Will hold {time} when entering name
    this.playerName = "";
    this.gameOverInfo = null;
    this.mousePos = { x: 0, y: 0 };
    this.buttonRects = [];
    this.menuItems = [
      { label: "Play Again", action: "play_again" },
      { label: "Main Menu", action: "main_menu" },
    ];

    // Load highscores from localStorage
    this.highscores = this.loadHighscores();
  }

  // Highscore management functions
  loadHighscores() {
    try {
      localStorage.removeItem(this.legacyStorageKey);
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Failed to load highscores:', e);
      return [];
    }
  }

  saveHighscores() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.highscores));
    } catch (e) {
      console.warn('Failed to save highscores:', e);
    }
  }

  addHighscore(playerName, time) {
    // Use default name if empty
    if (!playerName || playerName.trim() === "") {
      // Use current real time in HH:mm:SS format
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const timeFormatted = `${hours}:${minutes}:${seconds}`;
      playerName = `player${timeFormatted}`;
    }

    const formattedTime = typeof time === "number" ? this.formatTime(time) : time;
    const newEntry = {
      player: playerName.trim(),
      time: formattedTime,
      date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    };

    this.highscores.push(newEntry);

    // Sort by longest time first.
    this.highscores.sort((a, b) => {
      return b.time.localeCompare(a.time);
    });

    // Keep only top 10
    this.highscores = this.highscores.slice(0, 10);

    this.saveHighscores();
    return newEntry;
  }

  // Start the name entry process for a new highscore
  startNameEntry(time, playerName = "") {
    this.currentState = "enter_name";
    this.newScore = { time };
    this.playerName = playerName;
  }

  showGameOver(time, playerName) {
    this.currentState = "view";
    this.newScore = null;
    this.gameOverInfo = this.addHighscore(playerName, time);
  }

  showHighscores() {
    this.currentState = "view";
    this.newScore = null;
    this.gameOverInfo = null;
  }

  isMouseOverButton(rect) {
    return (
      this.mousePos.x >= rect.x &&
      this.mousePos.x <= rect.x + rect.width &&
      this.mousePos.y >= rect.y &&
      this.mousePos.y <= rect.y + rect.height
    );
  }

  // Handle input for name entry
  handleNameInput(input) {
    if (input.wasKeyPressed("Enter")) {
      this.addHighscore(this.playerName, this.newScore.time);
      this.currentState = "view";
      this.newScore = null;
      return "highscore_added"; // Signal that highscore was added
    }

    if (input.wasKeyPressed("Backspace")) {
      this.playerName = this.playerName.slice(0, -1);
    }

    if (input.wasKeyPressed("Escape")) {
      this.currentState = "view";
      this.newScore = null;
      return "cancelled";
    }

    if (input.typedText && this.playerName.length < 20) {
      const validText = input.typedText.replace(/[^a-zA-Z0-9 _-]/g, "");
      this.playerName = (this.playerName + validText).slice(0, 20);
    }

    return null;
  }

  handleInput(input) {
    this.mousePos = { ...input.mouse.screen };

    if (this.currentState === "enter_name") {
      return this.handleNameInput(input);
    }

    if (this.gameOverInfo && input.mouse.justReleased) {
      for (let i = 0; i < this.buttonRects.length; i++) {
        const rect = this.buttonRects[i];

        if (this.isMouseOverButton(rect)) {
          return this.menuItems[i].action;
        }
      }
    }

    // Normal highscore viewing
    if (input.wasKeyPressed("Escape") || input.wasKeyPressed("Backspace")) {
      return "back_to_menu";
    }

    return null;
  }

  update(dt, input) {
    return this.handleInput(input);
  }

  render(ctx) {
    if (!this.gameOverInfo) {
      ctx.clearRect(0, 0, this.width, this.height);
      this.renderBackground(ctx, 0.35);
    } else {
      ctx.fillStyle = "rgba(10, 10, 10, 0.65)";
      ctx.fillRect(0, 0, this.width, this.height);
    }

    if (this.currentState === "enter_name") {
      this.renderNameEntry(ctx);
    } else {
      this.renderHighscoreList(ctx);
    }
  }

  renderBackground(ctx, overlayAlpha = 0.35) {
    const background = this.assets.menuBackground;

    if (background && background.complete && background.naturalWidth > 0) {
      const scale = Math.max(
        this.width / background.naturalWidth,
        this.height / background.naturalHeight
      );
      const drawWidth = background.naturalWidth * scale;
      const drawHeight = background.naturalHeight * scale;
      const drawX = (this.width - drawWidth) / 2;
      const drawY = (this.height - drawHeight) / 2;

      ctx.drawImage(background, drawX, drawY, drawWidth, drawHeight);

      ctx.fillStyle = `rgba(0, 0, 0, ${overlayAlpha})`;
      ctx.fillRect(0, 0, this.width, this.height);
      return;
    }

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, this.width, this.height);
  }

  renderNameEntry(ctx) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    ctx.save();

    // Draw title
    ctx.fillStyle = "#8b5cf6";
    ctx.font = "bold 56px Arial";
    ctx.textAlign = "center";
    ctx.fillText("NEW HIGHSCORE!", centerX, centerY - 150);

    // Draw time info
    ctx.fillStyle = "#ffcc44";
    ctx.font = "bold 32px Arial";
    ctx.fillText(`Time: ${this.formatTime(this.newScore.time)}`, centerX, centerY - 80);

    // Draw name input prompt
    ctx.fillStyle = "#ffffff";
    ctx.font = "24px Arial";
    ctx.fillText("Enter your name:", centerX, centerY - 20);

    // Draw name input box
    const boxWidth = 300;
    const boxHeight = 50;
    const boxX = centerX - boxWidth / 2;
    const boxY = centerY + 10;

    ctx.fillStyle = "rgba(139, 92, 246, 0.2)";
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = "#8b5cf6";
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // Draw entered name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.playerName || "Anonymous", centerX, centerY + 40);

    // Draw hint
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "14px Arial";
    ctx.fillText("Press Enter to confirm, Escape to cancel", centerX, this.height - 30);

    ctx.restore();
  }

  renderHighscoreList(ctx) {
    const centerX = this.width / 2;
    const startY = 80;

    ctx.save();

    // Draw title
    ctx.fillStyle = "#8b5cf6";
    ctx.font = "bold 80px Impact";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
    ctx.shadowBlur = 35;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "rgba(255, 255, 255, 1)";
    ctx.lineWidth = 4;

    const title = this.gameOverInfo ? "GAME OVER" : "HIGHSCORE";
    ctx.strokeText(title, centerX, startY);

    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.fillText(title, centerX, startY);

    this.renderHighscoreTable(ctx, startY + 80);

    if (this.gameOverInfo) {
      this.renderButtons(ctx);
    } else {
      this.buttonRects = [];
    }

    // Draw back hint
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      this.gameOverInfo ? "Click a button" : "Press ESC or Backspace to return to menu",
      centerX,
      this.height - 35
    );

    ctx.restore();
  }

  renderHighscoreTable(ctx, y) {
    const tableWidth = 760;
    const tableX = this.width / 2 - tableWidth / 2;
    const headerHeight = 42;
    const rowHeight = 34;
    const rankWidth = 70;
    const playerWidth = 360;
    const columns = [
      tableX,
      tableX + rankWidth,
      tableX + rankWidth + playerWidth,
      tableX + tableWidth,
    ];
    const timeColumnCenter = (columns[2] + columns[3]) / 2;
    const visibleRows = Math.max(this.highscores.length, 1);
    const tableHeight = headerHeight + visibleRows * rowHeight;

    ctx.save();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1;

    if (this.gameOverInfo) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(tableX, y, tableWidth, tableHeight);
    }

    ctx.strokeRect(tableX, y, tableWidth, tableHeight);

    ctx.fillStyle = "rgba(167, 139, 250, 0.12)";
    ctx.fillRect(tableX, y, tableWidth, headerHeight);

    for (const x of columns.slice(1, -1)) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + tableHeight);
      ctx.stroke();
    }

    for (let i = 0; i <= visibleRows; i++) {
      const lineY = y + headerHeight + i * rowHeight;
      ctx.beginPath();
      ctx.moveTo(tableX, lineY);
      ctx.lineTo(tableX + tableWidth, lineY);
      ctx.stroke();
    }

    ctx.fillStyle = "#ffcc44";
    ctx.font = "bold 26px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("PLAYER NAME", columns[1] + 18, y + headerHeight / 2);
    ctx.textAlign = "center";
    ctx.fillText("TIME", timeColumnCenter, y + headerHeight / 2);

    if (this.highscores.length === 0) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.font = "22px Arial";
      ctx.textAlign = "center";
      ctx.fillText("No scores yet", tableX + tableWidth / 2, y + headerHeight + rowHeight / 2);
      ctx.restore();
      return;
    }

    ctx.font = "22px Arial";
    for (let i = 0; i < this.highscores.length; i++) {
      const hs = this.highscores[i];
      const rowY = y + headerHeight + i * rowHeight;
      const textY = rowY + rowHeight / 2;
      const isCurrentPlayer = hs === this.gameOverInfo;

      if (isCurrentPlayer) {
        ctx.fillStyle = "rgba(255, 204, 68, 0.18)";
        ctx.fillRect(tableX, rowY, tableWidth, rowHeight);
      }

      ctx.fillStyle = isCurrentPlayer ? "#ffcc44" : "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(`${i + 1}.`, tableX + rankWidth / 2, textY);

      ctx.textAlign = "left";
      ctx.fillText(hs.player, columns[1] + 18, textY);
      ctx.textAlign = "center";
      ctx.fillText(hs.time, timeColumnCenter, textY);
    }

    ctx.restore();
  }

  renderButtons(ctx) {
    const centerX = this.width / 2;
    const buttonWidth = 300;
    const buttonHeight = 60;
    const gap = 24;
    const totalWidth = buttonWidth * this.menuItems.length + gap * (this.menuItems.length - 1);
    const startX = centerX - totalWidth / 2;
    const bottomBarHeight = 64;
    const bottomGap = 16;
    const buttonY = this.height - bottomBarHeight - bottomGap - buttonHeight;

    this.buttonRects = [];

    for (let i = 0; i < this.menuItems.length; i++) {
      const buttonX = startX + i * (buttonWidth + gap);
      const rect = {
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight,
      };

      this.buttonRects.push(rect);

      const isHovered = this.isMouseOverButton(rect);

      if (isHovered) {
        ctx.fillStyle = "rgba(139, 92, 246, 0.4)";
      } else {
        ctx.fillStyle = "rgba(167, 139, 250, 0.15)";
      }
      ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

      if (isHovered) {
        ctx.strokeStyle = "#8b5cf6";
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = "#a78bfa";
        ctx.lineWidth = 2;
      }
      ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

      ctx.fillStyle = "#ffffff";
      ctx.font = isHovered ? "bold 32px Arial" : "32px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.menuItems[i].label, buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
    }
  }

  formatTime(seconds) {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const remainingSeconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
  }
}
