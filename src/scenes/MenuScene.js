export class MenuScene {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.currentState = "main"; // "main", "controls", "about"
    this.menuItems = [
      { label: "Start Game", action: "start" },
      { label: "Controls", action: "controls" },
      { label: "Highscore", action: "highscore" },
      { label: "About", action: "about" },
      { label: "Exit", action: "exit" },
    ];
    this.mousePos = { x: 0, y: 0 };
    this.buttonRects = [];
    this.playerName = "";
    this.maxPlayerNameLength = 20;
    this.hoveredIndex = -1;
  }

  isMouseOverButton(rect) {
    return (
      this.mousePos.x >= rect.x &&
      this.mousePos.x <= rect.x + rect.width &&
      this.mousePos.y >= rect.y &&
      this.mousePos.y <= rect.y + rect.height
    );
  }

  handleInput(input) {
    // Update mouse position
    this.mousePos = { ...input.mouse.screen };

    if (this.currentState === "main") {
      this.handlePlayerNameInput(input);
    }

    // Back to main menu
    if (input.wasKeyPressed("Escape") || input.wasKeyPressed("Backspace")) {
      if (this.currentState !== "main") {
        this.currentState = "main";
        return null;
      }
    }

    // Mouse click detection
    if (input.mouse.justReleased) {
      for (let i = 0; i < this.buttonRects.length; i++) {
        const rect = this.buttonRects[i];
        if (
          this.mousePos.x >= rect.x &&
          this.mousePos.x <= rect.x + rect.width &&
          this.mousePos.y >= rect.y &&
          this.mousePos.y <= rect.y + rect.height
        ) {
          return this.handleMenuAction(this.menuItems[i].action);
        }
      }
    }

    return null;
  }

  handleMenuAction(action) {
    if (action === "start") {
      return "start";
    } else if (action === "controls") {
      this.currentState = "controls";
    } else if (action === "highscore") {
      return "highscore";
    } else if (action === "about") {
      this.currentState = "about";
    } else if (action === "exit") {
      window.close();
    }
    return null;
  }

  update(dt, input) {
    return this.handleInput(input);
  }

  handlePlayerNameInput(input) {
    if (input.wasKeyPressed("Backspace")) {
      this.playerName = this.playerName.slice(0, -1);
      return;
    }

    if (!input.typedText) return;

    const validText = input.typedText.replace(/[^a-zA-Z0-9 _-]/g, "");
    if (!validText) return;

    this.playerName = (this.playerName + validText).slice(0, this.maxPlayerNameLength);
  }

  getPlayerName() {
    return this.playerName.trim();
  }

  render(ctx) {
    ctx.clearRect(0, 0, this.width, this.height);

    // Draw background
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.currentState === "main") {
      this.renderMainMenu(ctx);
    } else if (this.currentState === "controls") {
      this.renderControls(ctx);
    } else if (this.currentState === "about") {
      this.renderAbout(ctx);
    }
  }

  renderMainMenu(ctx) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    ctx.save();

    // Draw title
    ctx.fillStyle = "#8b5cf6";
    ctx.font = "bold 80px Impact";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Draw blurred stroke around title
    ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
    ctx.shadowBlur = 50;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "rgba(255, 255, 255, 1)";
    ctx.lineWidth = 5;

    ctx.strokeText("ASTRO DRIFT", centerX, centerY - 250);

    // Draw final text on top
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.fillText("ASTRO DRIFT", centerX, centerY - 250);

    // Draw menu items
    const itemHeight = 80;
    this.renderPlayerNameInput(ctx, centerX, centerY - 170);

    const startY = centerY - (this.menuItems.length * itemHeight) / 2 + 120;

    this.buttonRects = [];

    for (let i = 0; i < this.menuItems.length; i++) {
      const y = startY + i * itemHeight;

      const buttonWidth = 300;
      const buttonHeight = 60;
      const buttonX = centerX - buttonWidth / 2;
      const buttonY = y - buttonHeight / 2;

      const rect = {
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight,
      };

      this.buttonRects.push(rect);
      const isHovered = this.isMouseOverButton(rect);

      // Draw button background - blue-purple astro theme
      if (isHovered) {
        // Hovered: bright violet-purple
        ctx.fillStyle = "rgba(139, 92, 246, 0.4)";
      } else {
        // Normal: light purple
        ctx.fillStyle = "rgba(167, 139, 250, 0.15)";
      }
      ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

      // Draw button border - blue-purple gradient effect
      if (isHovered) {
        ctx.strokeStyle = "#8b5cf6";
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = "#a78bfa";
        ctx.lineWidth = 2;
      }
      ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

      // Draw button text
      ctx.fillStyle = "#ffffff";
      ctx.font = isHovered ? "bold 32px Arial" : "32px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.menuItems[i].label, centerX, y);
    }

    // Draw hint text
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Click a button", centerX, this.height - 35);

    ctx.restore();
  }

  renderPlayerNameInput(ctx, centerX, y) {
    const boxWidth = 360;
    const boxHeight = 50;
    const boxX = centerX - boxWidth / 2;
    const boxY = y - boxHeight / 2;

    ctx.save();

    ctx.fillStyle = "rgba(167, 139, 250, 0.15)";
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    ctx.strokeStyle = "#a78bfa";
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    ctx.fillStyle = this.playerName ? "#ffffff" : "rgba(255, 255, 255, 0.45)";
    ctx.font = "24px Arial";
    ctx.fillText(this.playerName || "Enter player name", centerX, y);

    ctx.restore();
  }

  renderControls(ctx) {
    const centerX = this.width / 2;
    const startY = 80;

    ctx.save();

    // Draw title
    ctx.fillStyle = "#8b5cf6";
    ctx.font = "bold 56px Arial";
    ctx.textAlign = "center";
    ctx.fillText("CONTROLS", centerX, startY);

    // Draw controls content
    ctx.fillStyle = "#ffffff";
    ctx.font = "22px Arial";
    ctx.textAlign = "center";

    const controls = [
      "MOVEMENT",
      "W / Arrow Up - Move Up",
      "S / Arrow Down - Move Down",
      "A / Arrow Left - Move Left",
      "D / Arrow Right - Move Right",
      "",
      "GAMEPLAY",
      "Left Mouse Button - Draw Path",
      "P - Pause / Resume",
      "",
      "DEBUG",
      "1 - Toggle Raw Path",
      "2 - Toggle Placeholder Path",
      "3 - Toggle Orbit Guides",
      "4 - Toggle Debug Text",
      "5 - Cycle Motion Blur",
      "",
      "MENU",
      "ESC - Back to Menu",
    ];

    let y = startY + 80;
    for (const control of controls) {
      if (control === "") {
        y += 15;
      } else if (
        control === "MOVEMENT" ||
        control === "GAMEPLAY" ||
        control === "DEBUG" ||
        control === "MENU"
      ) {
        ctx.fillStyle = "#ffcc44";
        ctx.font = "bold 22px Arial";
        ctx.fillText(control, centerX, y);
        ctx.fillStyle = "#ffffff";
        ctx.font = "22px Arial";
      } else {
        ctx.fillText(control, centerX, y);
      }
      y += 32;
    }

    // Draw back hint
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Press ESC or Backspace to return to menu", centerX, this.height - 30);

    ctx.restore();
  }

  renderAbout(ctx) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    ctx.save();

    // Draw title
    ctx.fillStyle = "#8b5cf6";
    ctx.font = "bold 56px Arial";
    ctx.textAlign = "center";
    ctx.fillText("ABOUT", centerX, 80);

    // Draw about content
    ctx.fillStyle = "#ffffff";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";

    // Placeholder fields for about information
    const aboutLines = [
      "COURSE",
      "Simulation and Animation, SS 2026",
      "",
      "DEVELOPERS",
      "Bernhard Steiner, 12005187",
      "Rijad Kovačević, 01231648",
      "",
      "CREDITS",
      "Codex AI for code refactoring and debugging assistance",
      "",
      "RESOURCES",
      "[Resource links and materials]",
      "",

    ];

    let y = centerY - 200;
    for (const line of aboutLines) {
      if (line === "") {
        y += 20;
      } else if (
        line === "COURSE" ||
        line === "DEVELOPERS" ||
        line === "CREDITS" ||
        line === "RESOURCES"
        
      ) {
        ctx.fillStyle = "#ffcc44";
        ctx.font = "bold 20px Arial";
        ctx.fillText(line, centerX, y);
        ctx.fillStyle = "#ffffff";
        ctx.font = "20px Arial";
      } else {
        ctx.fillText(line, centerX, y);
      }
      y += 34;
    }

    // Draw back hint
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Press ESC or Backspace to return to menu", centerX, this.height - 30);

    ctx.restore();
  }
}
