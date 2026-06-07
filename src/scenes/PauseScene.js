export class PauseScene {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.menuItems = [
      { label: "Continue Game", action: "continue" },
      { label: "Main Menu", action: "main_menu" },
    ];
    this.mousePos = { x: 0, y: 0 };
    this.buttonRects = [];
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
    this.mousePos = { ...input.mouse.screen };

    if (input.wasKeyPressed("Escape")) {
      return "continue";
    }

    if (input.mouse.justReleased) {
      for (let i = 0; i < this.buttonRects.length; i++) {
        const rect = this.buttonRects[i];

        if (this.isMouseOverButton(rect)) {
          return this.menuItems[i].action;
        }
      }
    }

    return null;
  }

  update(dt, input) {
    return this.handleInput(input);
  }

  render(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(10, 10, 10, 0.65)";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();

    this.renderPauseMenu(ctx);
  }

  renderPauseMenu(ctx) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    ctx.save();

    ctx.fillStyle = "#8b5cf6";
    ctx.font = "bold 80px Impact";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
    ctx.shadowBlur = 50;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "rgba(255, 255, 255, 1)";
    ctx.lineWidth = 5;

    ctx.strokeText("PAUSED", centerX, centerY - 180);

    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.fillText("PAUSED", centerX, centerY - 180);

    const itemHeight = 80;
    const startY = centerY - (this.menuItems.length * itemHeight) / 2 + 80;

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
      ctx.fillText(this.menuItems[i].label, centerX, y);
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Click a button", centerX, this.height - 35);

    ctx.restore();
  }
}
