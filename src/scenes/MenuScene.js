export class MenuScene {
  constructor(width, height, assets = {}) {
    this.width = width;
    this.height = height;
    this.assets = assets;
    this.currentState = "main"; // "main", "controls", "about"
    this.menuItems = [
      { label: "START", action: "start" },
      { label: "CONTROLS", action: "controls" },
      { label: "HIGHSCORE", action: "highscore" },
      { label: "ABOUT", action: "about" },
      { label: "EXIT", action: "exit" },
    ];
    this.mousePos = { x: 0, y: 0 };
    this.buttonRects = [];
    this.playerName = "";
    this.maxPlayerNameLength = 20;
    this.hoveredIndex = -1;
    this.aboutResourcesScroll = 0;
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

    if (this.currentState === "about") {
      this.handleAboutInput(input);
    }

    // Back to main menu
    if (input.wasKeyPressed("Escape") || input.wasKeyPressed("Backspace")) {
      if (this.currentState !== "main") {
        this.currentState = "main";
        this.aboutResourcesScroll = 0;
        return null;
      }
    }

    if (this.currentState !== "main") {
      return null;
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
      this.aboutResourcesScroll = 0;
    } else if (action === "exit") {
      window.close();
    }
    return null;
  }

  handleAboutInput(input) {
    const layout = this.getAboutLayout();
    const maxScroll = this.getAboutResourcesMaxScroll(layout);
    let scrollDelta = input.mouse.wheelDelta || 0;

    if (input.wasKeyPressed("ArrowDown")) scrollDelta += 90;
    if (input.wasKeyPressed("ArrowUp")) scrollDelta -= 90;
    if (input.wasKeyPressed("PageDown")) scrollDelta += layout.resourcesViewportHeight;
    if (input.wasKeyPressed("PageUp")) scrollDelta -= layout.resourcesViewportHeight;
    if (input.wasKeyPressed("Home")) this.aboutResourcesScroll = 0;
    if (input.wasKeyPressed("End")) this.aboutResourcesScroll = maxScroll;

    if (scrollDelta !== 0) {
      this.aboutResourcesScroll = Math.max(
        0,
        Math.min(maxScroll, this.aboutResourcesScroll + scrollDelta)
      );
    }
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

    this.renderBackground(ctx);

    if (this.currentState === "main") {
      this.renderMainMenu(ctx);
    } else if (this.currentState === "controls") {
      this.renderControls(ctx);
    } else if (this.currentState === "about") {
      this.renderAbout(ctx);
    }
  }

  renderBackground(ctx) {
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

      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(0, 0, this.width, this.height);
      return;
    }

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, this.width, this.height);
  }

  renderMainMenu(ctx) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    ctx.save();

    // Draw title
    ctx.fillStyle = "#8b5cf6";
    ctx.font = "bold 100px Impact";
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

      const buttonWidth = 360;
      const buttonHeight = 68;
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
      ctx.font = isHovered ? "bold 40px Arial" : "40px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.menuItems[i].label, centerX, y);
    }

    // Draw hint text
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "20px Arial";
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
    ctx.font = "30px Arial";
    ctx.fillText(this.playerName || "Enter player name", centerX, y);

    ctx.restore();
  }

  renderControls(ctx) {
    const centerX = this.width / 2;
    const titleY = this.height < 650 ? 60 : 80;
    const startY = this.height < 650 ? 120 : 150;

    ctx.save();

    // Draw title
    ctx.fillStyle = "#8b5cf6";
    ctx.font = `${this.height < 650 ? "bold 44px" : "bold 60px"} Arial`;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(255, 255, 255, 0.75)";
    ctx.shadowBlur = 28;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = 3;
    ctx.strokeText("CONTROLS", centerX, titleY);
    ctx.fillText("CONTROLS", centerX, titleY);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";

    const columns = [
      {
        title: "GAMEPLAY",
        lines: [
          "W A S D - Move",
          "Space - Shoot",
          "Left Mouse - Drag Spline Points",
          "LShift - Nitro Boost",
          "P - Pause / Resume",
          "F - Render Update Rate",
          "G - Physics Update Rate",
          "P - Pause/Resume Game",
          "5 / Mouse Click - Sound Toggle",
          "ESC / Backspace - Back",
        ],
      },
      {
        title: "DEBUG",
        lines: [
          "1 - Path Visualization Toggle",
          "I / K - Change Traversal Speed",
          "J / L - Change Traversal Update Rate",
          "O - New Random Spline",
          "",
          "2 - Rigid Body Dynamics Toggle",
          "C - Colliders Visualization",
          "V - Momentum Visualization",
          "B - Change Spherical Colliders",
          "",
          "3 - Motion Blur Toggle",
          "M - Change Blur Mode",
          "N - Change Blur Samples",
          "",
          "4 - Hierarchical Tranformations Toggle",
          "T - Show Trajectories",
          "",
        ],
      },
    ];

    const margin = this.width < 900 ? 45 : 90;
    const gap = this.width < 900 ? 34 : 70;
    const columnWidth = (this.width - margin * 2 - gap) / 2;
    const headingFontSize = this.height < 650 ? 24 : 30;
    const lineFontSize = this.height < 650 ? 20 : 24;
    const lineHeight = this.height < 650 ? 25 : 30;
    const headingGap = this.height < 650 ? 32 : 38;

    ctx.textBaseline = "top";

    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      const x = margin + i * (columnWidth + gap);
      const columnCenterX = x + columnWidth / 2;
      let y = startY;

      ctx.textAlign = "center";
      ctx.fillStyle = "#ffcc44";
      ctx.font = `bold ${headingFontSize}px Arial`;
      ctx.fillText(column.title, columnCenterX, y, columnWidth);
      y += headingGap;

      ctx.fillStyle = "#ffffff";
      ctx.font = `${lineFontSize}px Arial`;
      ctx.textAlign = "left";

      const widestLineWidth = Math.min(
        columnWidth,
        Math.max(...column.lines.map(line => ctx.measureText(line).width))
      );
      const lineX = columnCenterX - widestLineWidth / 2;

      for (const line of column.lines) {
        ctx.fillText(line, lineX, y, columnWidth);
        y += lineHeight;
      }
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
    const layout = this.getAboutLayout();
    this.aboutResourcesScroll = Math.min(
      this.aboutResourcesScroll,
      this.getAboutResourcesMaxScroll(layout)
    );

    ctx.save();

    // Draw title
    ctx.fillStyle = "#8b5cf6";
    ctx.font = "bold 60px Arial";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(255, 255, 255, 0.75)";
    ctx.shadowBlur = 28;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = 3;
    ctx.strokeText("ABOUT", centerX, 80);
    ctx.fillText("ABOUT", centerX, 80);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";

    const columns = [
      {
        sections: [
          {
            title: "COURSE",
            lines: ["Simulation and Animation, SS 2026"],
          },
          {
            title: "DEVELOPERS",
            lines: ["Bernhard Steiner, 12005187", "Rijad Kovačević, 01231648"],
          },
          {
            title: "CREDITS",
            lines: ["Codex AI for code refactoring and debugging assistance"],
          },
        ],
      },
      {
        sections: [
          {
            title: "RESOURCES",
            lines: [
              "Game Music",
              "https://opengameart.org/content/space-boss-battle-theme",
              "",
              "Sound Effects",
              "https://sfxr.me/",
              "",
              "Assets",
              "https://kenney.nl/assets/space-shooter-remastered",
              "",
              "Sound Off",
              "https://www.flaticon.com/free-icon/no-sound_1199554",
              "",
              "Sound On",
              "https://www.flaticon.com/free-icon/volume_8466981",
              "",
              "Menu Background",
              "https://opengameart.org/content/perfectly-seamless-night-sky",
              "Sun",
              "https://www.flaticon.com/free-icon/venus_4663465",
              "Earth",
              "https://www.flaticon.com/free-icon/planet-earth_8635653",
              "Venus",
              "https://www.flaticon.com/free-icon/venus_360752",
              "Moon",
              "https://www.flaticon.com/free-icon/moon_16116384",
              "Jupiter",
              "https://www.flaticon.com/free-icon/planet_3336008",
              "Mars",
              "https://www.flaticon.com/free-icon/mars_124582",
              "Satellite",
              "https://www.flaticon.com/free-icon/satellite_129639",
            ],
          },
        ],
      },
    ];

    ctx.textBaseline = "top";

    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      const x = layout.margin + i * (layout.columnWidth + layout.gap);
      const columnCenterX = x + layout.columnWidth / 2;
      let y = layout.startY;

      if (i === 1) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, layout.startY, layout.columnWidth, layout.resourcesViewportHeight);
        ctx.clip();
        y -= this.aboutResourcesScroll;
      }

      for (const section of column.sections) {
        ctx.fillStyle = "#ffcc44";
        ctx.font = `bold ${layout.headingFontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(section.title, columnCenterX, y, layout.columnWidth);
        y += layout.lineHeight + layout.headingGap;

        ctx.fillStyle = "#ffffff";
        ctx.font = `${layout.lineFontSize}px Arial`;
        ctx.textAlign = i === 0 ? "center" : "left";

        for (const line of section.lines) {
          ctx.fillText(line, i === 0 ? columnCenterX : x, y, layout.columnWidth - (i === 1 ? 18 : 0));
          y += layout.lineHeight;
        }

        y += layout.sectionGap;
      }

      if (i === 1) {
        ctx.restore();
        this.drawAboutResourcesScrollbar(ctx, x, layout);
      }
    }

    // Draw back hint
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Press ESC or Backspace to return to menu", centerX, this.height - 30);

    ctx.restore();
  }

  getAboutLayout() {
    const centerY = this.height / 2;
    const margin = this.width < 900 ? 45 : 90;
    const gap = this.width < 900 ? 34 : 70;
    const columnWidth = (this.width - margin * 2 - gap) / 2;
    const startY = centerY - 180;

    return {
      margin,
      gap,
      columnWidth,
      startY,
      headingFontSize: this.height < 650 ? 24 : 30,
      lineFontSize: this.height < 650 ? 20 : 24,
      lineHeight: this.height < 650 ? 24 : 28,
      headingGap: this.height < 650 ? 8 : 12,
      sectionGap: this.height < 650 ? 22 : 30,
      resourcesViewportHeight: Math.max(120, this.height - startY - 70),
    };
  }

  getAboutResourcesMaxScroll(layout) {
    const resourceLineCount = 30;
    const sectionCount = 1;
    const contentHeight =
      sectionCount * (layout.lineHeight + layout.headingGap + layout.sectionGap) +
      resourceLineCount * layout.lineHeight;

    return Math.max(0, contentHeight - layout.resourcesViewportHeight);
  }

  drawAboutResourcesScrollbar(ctx, x, layout) {
    const maxScroll = this.getAboutResourcesMaxScroll(layout);
    if (maxScroll <= 0) return;

    const trackX = x + layout.columnWidth - 6;
    const trackY = layout.startY;
    const trackHeight = layout.resourcesViewportHeight;
    const thumbHeight = Math.max(32, trackHeight * (trackHeight / (trackHeight + maxScroll)));
    const thumbY = trackY + (trackHeight - thumbHeight) * (this.aboutResourcesScroll / maxScroll);

    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    ctx.fillRect(trackX, trackY, 3, trackHeight);
    ctx.fillStyle = "#a78bfa";
    ctx.fillRect(trackX - 1, thumbY, 5, thumbHeight);
    ctx.restore();
  }
}
