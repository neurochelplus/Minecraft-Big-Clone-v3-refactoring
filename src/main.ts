import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { World, BLOCK } from "./World";
import { ItemEntity } from "./ItemEntity";
import { TOOL_DEFS, initToolTextures, TOOL_TEXTURES } from "./ToolTextures";
import { BLOCK_DEFS } from "./BlockTextures";
import { RECIPES } from "./Recipes";
import type { Recipe } from "./Recipes";
import { MobManager } from "./MobManager";
import { PlayerHand } from "./PlayerHand";
import { Inventory } from "./inventory/Inventory";
import { DragDrop } from "./inventory/DragDrop";
import { InventoryUI } from "./inventory/InventoryUI";
import { CraftingSystem } from "./crafting/CraftingSystem";
import { CraftingUI } from "./crafting/CraftingUI";
import {
  GRAVITY,
  JUMP_HEIGHT,
  JUMP_IMPULSE,
  ATTACK_RANGE,
  PUNCH_DAMAGE,
  ATTACK_COOLDOWN,
  PLAYER_HALF_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_EYE_HEIGHT,
} from "./constants/GameConstants";
import { BLOCK_NAMES, ITEM_MAP } from "./constants/BlockNames";
import { getBlockColor } from "./utils/BlockColors";
import { HotbarLabel } from "./ui/HotbarLabel";
import { HealthBar } from "./ui/HealthBar";
import { Renderer } from "./core/Renderer";
import { GameState } from "./core/GameState";
import { PlayerPhysics } from "./player/PlayerPhysics";
import { PlayerHealth } from "./player/PlayerHealth";
import { PlayerCombat } from "./player/PlayerCombat";
import { BlockCursor } from "./blocks/BlockCursor";
import { BlockBreaking } from "./blocks/BlockBreaking";
import { BlockInteraction } from "./blocks/BlockInteraction";
import { Game } from "./core/Game";
import "./style.css";

// Initialize Tool Textures
initToolTextures();

// Initialize Renderer (handles scene, camera, renderer, controls)
const gameRenderer = new Renderer();
const gameState = new GameState();
const isMobile = gameRenderer.getIsMobile();

// Get references to Three.js objects from Renderer
const scene = gameRenderer.scene;
const uiScene = gameRenderer.uiScene;
const camera = gameRenderer.camera;
const uiCamera = gameRenderer.uiCamera;
const controls = gameRenderer.controls;
const renderer = gameRenderer.renderer; // Three.js WebGLRenderer

import { Environment } from "./Environment";
import { initDebugControls } from "./DebugUtils";

// Lights - Handled by Environment
const environment = new Environment(scene);
initDebugControls(environment);

controls.addEventListener("lock", () => {
  if (isInventoryOpen) toggleInventory(); // Close inventory if locking (e.g. clicking back in)
});

controls.addEventListener("unlock", () => {
  // If we unlocked and we are not in inventory or already paused (via menu) or in CLI, then auto-pause
  if (
    !isInventoryOpen &&
    !gameState.getPaused() &&
    gameState.getGameStarted() &&
    !isCliOpen
  ) {
    showPauseMenu();
  }
});

// controls.object already added to scene in Renderer constructor

// Movement variables are now managed by PlayerPhysics

const onKeyDown = (event: KeyboardEvent) => {
  if (isCliOpen) return; // Ignore game keys when typing

  switch (event.code) {
    case "Slash":
      event.preventDefault();
      toggleCLI(true, "/");
      break;
    case "KeyT":
      if (
        !gameState.getPaused() &&
        gameState.getGameStarted() &&
        !isInventoryOpen
      ) {
        event.preventDefault();
        toggleCLI(true, "");
      }
      break;
    case "ArrowUp":
    case "KeyW":
      playerPhysics.moveForward = true;
      break;
    case "ArrowLeft":
    case "KeyA":
      playerPhysics.moveLeft = true;
      break;
    case "ArrowDown":
    case "KeyS":
      playerPhysics.moveBackward = true;
      break;
    case "ArrowRight":
    case "KeyD":
      playerPhysics.moveRight = true;
      break;
    case "Space":
      playerPhysics.jump();
      break;
    case "KeyE":
      if (!gameState.getPaused()) toggleInventory(false);
      break;
    case "Escape":
      if (isInventoryOpen) toggleInventory();
      else togglePauseMenu();
      break;
  }
};

const onKeyUp = (event: KeyboardEvent) => {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      playerPhysics.moveForward = false;
      break;
    case "ArrowLeft":
    case "KeyA":
      playerPhysics.moveLeft = false;
      break;
    case "ArrowDown":
    case "KeyS":
      playerPhysics.moveBackward = false;
      break;
    case "ArrowRight":
    case "KeyD":
      playerPhysics.moveRight = false;
      break;
  }
};

document.addEventListener("keydown", onKeyDown);
document.addEventListener("keyup", onKeyUp);

// World Generation
const world = new World(scene);

// Initialize PlayerPhysics
const playerPhysics = new PlayerPhysics(controls, world);

const entities: ItemEntity[] = [];
const mobManager = new MobManager(world, scene, entities);

// UI Lighting
const uiLight = new THREE.DirectionalLight(0xffffff, 1.5);
uiLight.position.set(1, 1, 1);
uiScene.add(uiLight);
const uiAmbient = new THREE.AmbientLight(0xffffff, 0.5);
uiScene.add(uiAmbient);

const playerHand = new PlayerHand(uiCamera, world.noiseTexture, TOOL_TEXTURES);

// Block Data (imported from constants/BlockNames.ts)

// Inventory System
const inventory = new Inventory();
const dragDrop = new DragDrop();
const inventoryUI = new InventoryUI(inventory, dragDrop, isMobile);

// Crafting System
const craftingSystem = new CraftingSystem();
const craftingUI = new CraftingUI(
  craftingSystem,
  inventory,
  inventoryUI,
  dragDrop,
  isMobile,
);

// Connect Inventory to PlayerHand and HotbarLabel
inventoryUI.onInventoryChange = () => {
  const slot = inventory.getSelectedSlotItem();
  playerHand.updateItem(slot.id);
  if (slot.id !== 0) {
    hotbarLabel.show(BLOCK_NAMES[slot.id] || "Block");
  } else {
    hotbarLabel.hide();
  }

  if (isInventoryOpen) craftingUI.updateVisuals();
};

let isInventoryOpen = false;

// UI Elements (for Menu toggling)
const inventoryMenu = document.getElementById("inventory-menu")!;

// UI Components
const hotbarLabelElement = document.getElementById("hotbar-label")!;
const hotbarLabel = new HotbarLabel(hotbarLabelElement);

// CLI Elements
let isCliOpen = false;
const cliContainer = document.createElement("div");
cliContainer.id = "cli-container";
const cliInput = document.createElement("input");
cliInput.id = "cli-input";
cliInput.type = "text";
cliInput.autocomplete = "off";
cliContainer.appendChild(cliInput);
document.body.appendChild(cliContainer);

// Disable context menu for right-click splitting
document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

function toggleCLI(open: boolean, initialChar: string = "") {
  if (open) {
    if (!gameState.getGameStarted()) return; // Don't open in menus
    isCliOpen = true;
    cliContainer.style.display = "flex";
    cliInput.value = initialChar;
    cliInput.focus();
    controls.unlock();
    // Clear move flags to stop walking when typing
    playerPhysics.moveForward = false;
    playerPhysics.moveBackward = false;
    playerPhysics.moveLeft = false;
    playerPhysics.moveRight = false;
  } else {
    isCliOpen = false;
    cliContainer.style.display = "none";
    cliInput.value = "";
    cliInput.blur();
    if (!isInventoryOpen && !gameState.getPaused()) controls.lock();
  }
}

function handleCommand(cmd: string) {
  if (!cmd.startsWith("/")) return;

  const parts = cmd.slice(1).split(" ");
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (command === "give") {
    if (args.length < 1) {
      console.log("Usage: /give <item> [amount]");
      hotbarLabel.show("Usage: /give <item> [amount]");
      return;
    }

    const itemName = args[0].toLowerCase();
    const amount = parseInt(args[1]) || 1;

    // Find block ID by name
    let targetId = 0;
    // Using ITEM_MAP from constants/BlockNames.ts

    if (ITEM_MAP[itemName]) {
      targetId = ITEM_MAP[itemName];
    } else {
      // Try to find in BLOCK_NAMES (reverse lookup?)
      // For now just numeric ID support too
      const numericId = parseInt(itemName);
      if (!isNaN(numericId) && BLOCK_NAMES[numericId]) {
        targetId = numericId;
      }
    }

    if (targetId !== 0) {
      // Add to inventory
      addItemToInventory(targetId, amount);
      hotbarLabel.show(`Gave ${amount} ${BLOCK_NAMES[targetId]}`);
    } else {
      hotbarLabel.show(`Unknown item: ${itemName}`);
    }
  }
}

function addItemToInventory(id: number, count: number) {
  inventory.addItem(id, count);
  inventoryUI.refresh();
}

cliInput.addEventListener("keydown", (e) => {
  e.stopPropagation(); // Stop game controls from triggering
  if (e.key === "Enter") {
    const cmd = cliInput.value.trim();
    if (cmd) handleCommand(cmd);
    toggleCLI(false);
  } else if (e.key === "Escape") {
    toggleCLI(false);
  }
});

// Generate CSS Noise
const canvas = document.createElement("canvas");
canvas.width = 64;
canvas.height = 64;
const ctx = canvas.getContext("2d")!;
for (let i = 0; i < 64 * 64; i++) {
  const x = i % 64;
  const y = Math.floor(i / 64);
  const v = Math.floor(Math.random() * 50 + 200); // Light noise
  ctx.fillStyle = `rgba(${v},${v},${v},0.5)`; // Semi-transparent
  ctx.fillRect(x, y, 1, 1);
}
document.body.style.setProperty("--noise-url", `url(${canvas.toDataURL()})`);

function toggleInventory(useCraftingTable = false) {
  isInventoryOpen = !isInventoryOpen;
  dragDrop.setInventoryOpen(isInventoryOpen);

  if (isInventoryOpen) {
    controls.unlock();
    inventoryMenu.style.display = "flex";

    // Set Mode
    craftingUI.setVisible(true, useCraftingTable);

    // Mobile: Hide controls
    if (isMobile) {
      document.getElementById("mobile-ui")!.style.display = "none";
      document.getElementById("joystick-zone")!.style.display = "none";
      document.getElementById("mobile-actions")!.style.display = "none";
    }

    inventoryUI.refresh();

    // Init Close Button logic if needed (once)
    if (!document.getElementById("btn-close-inv")) {
      const closeBtn = document.createElement("div");
      closeBtn.id = "btn-close-inv";
      closeBtn.innerText = "X";
      closeBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        toggleInventory();
      });
      closeBtn.addEventListener("click", (e) => {
        toggleInventory();
      });
      inventoryMenu.appendChild(closeBtn);
    }
  } else {
    // Auto-save on close
    world.saveWorld({
      position: controls.object.position,
      inventory: inventory.serialize(),
    });

    // Return crafting items to inventory
    for (let i = 0; i < 9; i++) {
      if (craftingSystem.craftingSlots[i].id !== 0) {
        inventory.addItem(
          craftingSystem.craftingSlots[i].id,
          craftingSystem.craftingSlots[i].count,
        );
        craftingSystem.craftingSlots[i].id = 0;
        craftingSystem.craftingSlots[i].count = 0;
      }
    }
    craftingSystem.craftingResult.id = 0;
    craftingSystem.craftingResult.count = 0;

    craftingUI.setVisible(false, false);

    if (isMobile) {
      const mobileUi = document.getElementById("mobile-ui");
      if (mobileUi) mobileUi.style.display = "block";
      document.getElementById("joystick-zone")!.style.display = "block";
      document.getElementById("mobile-actions")!.style.display = "flex";
    }

    controls.lock();
    inventoryMenu.style.display = "none";
    // tooltip.style.display = "none"; // Tooltip managed by InventoryUI now

    const dragged = dragDrop.getDraggedItem();
    if (dragged) {
      inventory.addItem(dragged.id, dragged.count);
      dragDrop.setDraggedItem(null);
    }
  }
}

// Hotbar Input
window.addEventListener("wheel", (event) => {
  let selected = inventory.getSelectedSlot();
  if (event.deltaY > 0) {
    selected = (selected + 1) % 9;
  } else {
    selected = (selected - 1 + 9) % 9;
  }
  inventory.setSelectedSlot(selected);
  inventoryUI.refresh();
  if (inventoryUI.onInventoryChange) inventoryUI.onInventoryChange();
});

window.addEventListener("keydown", (event) => {
  const key = parseInt(event.key);
  if (key >= 1 && key <= 9) {
    inventory.setSelectedSlot(key - 1);
    inventoryUI.refresh();
    if (inventoryUI.onInventoryChange) inventoryUI.onInventoryChange();
  }
});

// Interaction
const blockCursor = new BlockCursor(scene, camera, controls);
const cursorMesh = blockCursor.getMesh();

// --- Block Breaking System ---
const blockBreaking = new BlockBreaking(
  scene,
  camera,
  controls,
  () => inventory.getSelectedSlotItem().id,
  (x, y, z, id) => {
    // Drop Item
    if (id !== 0) {
      let toolTexture = null;
      if (TOOL_TEXTURES[id] && (id >= 20 || id === 8)) {
        toolTexture = TOOL_TEXTURES[id].texture;
      }
      entities.push(
        new ItemEntity(
          world,
          scene,
          x,
          y,
          z,
          id,
          world.noiseTexture,
          toolTexture,
        ),
      );
    }
    world.setBlock(x, y, z, 0); // AIR
  },
  cursorMesh,
);
const crackMesh = blockBreaking.getCrackMesh();

// Player Health System
const damageOverlay = document.getElementById("damage-overlay")!;
const healthBarElement = document.getElementById("health-bar")!;
const healthBar = new HealthBar(healthBarElement);

const playerHealth = new PlayerHealth(
  damageOverlay,
  healthBar,
  camera,
  controls,
  (pos) => playerPhysics.checkCollision(pos),
  () => {
    // onRespawn
    playerPhysics.setVelocity(new THREE.Vector3(0, 0, 0));
  },
);

// Combat System
const playerCombat = new PlayerCombat(
  camera,
  scene,
  controls,
  () => inventory.getSelectedSlotItem().id,
  cursorMesh,
  crackMesh,
);

// Block Interaction
const blockInteraction = new BlockInteraction(
  camera,
  scene,
  controls,
  () => inventory.getSelectedSlotItem(),
  (x, y, z, id) => {
    world.setBlock(x, y, z, id);

    const index = inventory.getSelectedSlot();
    const slot = inventory.getSlot(index);
    slot.count--;
    if (slot.count <= 0) {
      slot.id = 0;
      slot.count = 0;
    }
    inventoryUI.refresh();
    return true;
  },
  () => toggleInventory(true),
  cursorMesh,
  crackMesh,
);

const game = new Game(
  gameRenderer,
  gameState,
  world,
  environment,
  entities,
  mobManager,
  playerHand,
  playerPhysics,
  playerHealth,
  playerCombat,
  blockCursor,
  blockBreaking,
  blockInteraction,
  inventory,
  inventoryUI,
  craftingSystem,
  craftingUI,
);

function performInteract() {
  blockInteraction.interact(world);
}

document.addEventListener("mousedown", (event) => {
  if (gameState.getPaused() || !gameState.getGameStarted()) return;
  if (!controls.isLocked && !isMobile) return;
  if (isInventoryOpen) return;

  if (event.button === 0) {
    game.isAttackPressed = true;
    playerHand.punch();
    playerCombat.performAttack(); // Hit mobs
    game.blockBreaking.start(world); // Start mining block
  } else if (event.button === 2) performInteract();
});

document.addEventListener("mouseup", () => {
  game.isAttackPressed = false;
  playerHand.stopPunch();
  blockBreaking.stop();
});

// Player dimensions are handled in PlayerPhysics

// Animation Loop removed, using Game.start() at the end

// Window resize handled by Renderer class

// Mobile Controls Implementation

if (isMobile) {
  // Joystick Logic

  const joystickZone = document.getElementById("joystick-zone")!;

  const joystickStick = document.getElementById("joystick-stick")!;

  let stickStartX = 0;

  let stickStartY = 0;

  let isDraggingStick = false;

  let joystickTouchId: number | null = null;

  joystickZone.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (isDraggingStick) return;

    const touch = e.changedTouches[0];
    joystickTouchId = touch.identifier;

    // Floating Joystick: Center is where we first touch
    stickStartX = touch.clientX;
    stickStartY = touch.clientY;

    // Move stick visual to finger immediately
    joystickStick.style.transition = "none";
    joystickStick.style.transform = `translate(-50%, -50%)`; // Reset to center of container? No.
    // Actually, we usually want the stick to appear under the finger.
    // But the HTML layout has a fixed zone.
    // Let's keep the zone fixed but the "center" of logic is the start point.
    // Visual feedback: Move the stick relative to its neutral position?
    // Current CSS likely centers the stick in the zone.
    // Let's keep the stick visual centered in the zone initially, but move it relative to drag.

    // BETTER APPROACH for "Floating":
    // The visual stick starts at the center of the ZONE.
    // But logically, movement is relative to touch start.
    // To make it intuitive, we should probably snap the visual stick to the touch start?
    // Or just treat the touch start as (0,0).

    isDraggingStick = true;
  });

  joystickZone.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (!isDraggingStick || joystickTouchId === null) return;

    // Find the specific touch for the joystick
    let touch: Touch | undefined;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId) {
        touch = e.changedTouches[i];
        break;
      }
    }

    if (!touch) return;

    const dx = touch.clientX - stickStartX;
    const dy = touch.clientY - stickStartY;

    // Clamp stick visual
    const maxDist = 40;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(distance, maxDist);
    const angle = Math.atan2(dy, dx);

    const stickX = Math.cos(angle) * clampedDist;
    const stickY = Math.sin(angle) * clampedDist;

    // Update visual: The stick moves from its CSS center
    joystickStick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;

    // Update movement flags
    // Fix inversion: dy is negative when moving UP (forward)
    // moveForward should be true if dy is negative
    const threshold = 10;
    playerPhysics.moveForward = dy < -threshold;
    playerPhysics.moveBackward = dy > threshold;
    playerPhysics.moveLeft = dx < -threshold;
    playerPhysics.moveRight = dx > threshold;
  });

  const resetStick = (e: TouchEvent) => {
    if (!isDraggingStick || joystickTouchId === null) return;

    // Check if the ending touch is the joystick touch

    let touchFound = false;

    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId) {
        touchFound = true;

        break;
      }
    }

    if (touchFound) {
      isDraggingStick = false;

      joystickTouchId = null;

      joystickStick.style.transform = `translate(-50%, -50%)`;

      playerPhysics.moveForward = false;

      playerPhysics.moveBackward = false;

      playerPhysics.moveLeft = false;

      playerPhysics.moveRight = false;
    }
  };

  joystickZone.addEventListener("touchend", resetStick);

  joystickZone.addEventListener("touchcancel", resetStick);

  // Buttons

  document.getElementById("btn-jump")!.addEventListener("touchstart", (e) => {
    e.preventDefault();
    playerPhysics.jump();
  });

  const btnAttack = document.getElementById("btn-attack")!;
  let attackTouchId: number | null = null;
  let lastAttackX = 0;
  let lastAttackY = 0;

  btnAttack.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (attackTouchId !== null) return;

    const touch = e.changedTouches[0];
    attackTouchId = touch.identifier;
    lastAttackX = touch.clientX;
    lastAttackY = touch.clientY;

    game.isAttackPressed = true;
    playerHand.punch();
    playerCombat.performAttack();
    game.blockBreaking.start(world);
  });

  btnAttack.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (attackTouchId === null) return;

    let touch: Touch | undefined;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === attackTouchId) {
        touch = e.changedTouches[i];
        break;
      }
    }
    if (!touch) return;

    const dx = touch.clientX - lastAttackX;
    const dy = touch.clientY - lastAttackY;

    lastAttackX = touch.clientX;
    lastAttackY = touch.clientY;

    const SENSITIVITY = 0.005;
    controls.object.rotation.y -= dx * SENSITIVITY;
    camera.rotation.x -= dy * SENSITIVITY;
    camera.rotation.x = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, camera.rotation.x),
    );
  });

  const endAttack = (e: TouchEvent) => {
    e.preventDefault();
    if (attackTouchId === null) return;

    let touchFound = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === attackTouchId) {
        touchFound = true;
        break;
      }
    }

    if (touchFound) {
      game.isAttackPressed = false;
      playerHand.stopPunch();
      blockBreaking.stop();
      attackTouchId = null;
    }
  };

  btnAttack.addEventListener("touchend", endAttack);
  btnAttack.addEventListener("touchcancel", endAttack);

  document.getElementById("btn-place")!.addEventListener("touchstart", (e) => {
    e.preventDefault();

    performInteract();
  });

  document.getElementById("btn-inv")!.addEventListener("touchstart", (e) => {
    e.preventDefault();

    toggleInventory(false);
  });

  // Camera Look (Touch Drag on background)

  let lastLookX = 0;

  let lastLookY = 0;

  let lookTouchId: number | null = null;

  document.addEventListener("touchstart", (e) => {
    if (lookTouchId !== null) return; // Already looking with a finger

    const target = e.target as HTMLElement;

    if (
      target.closest("#joystick-zone") ||
      target.closest(".mob-btn") ||
      target.closest("#inventory-menu") ||
      target.closest("#hotbar") ||
      target.closest("#btn-inv")
    )
      return;

    const touch = e.changedTouches[0];

    lookTouchId = touch.identifier;

    lastLookX = touch.clientX;

    lastLookY = touch.clientY;
  });

  document.addEventListener(
    "touchmove",
    (e) => {
      if (lookTouchId === null) return;

      if (e.cancelable) e.preventDefault();

      const target = e.target as HTMLElement;

      if (
        target.closest("#joystick-zone") ||
        target.closest(".mob-btn") ||
        target.closest("#inventory-menu") ||
        target.closest("#hotbar") ||
        target.closest("#btn-inv")
      )
        return;

      // Find the look touch

      let touch: Touch | undefined;

      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === lookTouchId) {
          touch = e.changedTouches[i];

          break;
        }
      }

      if (!touch) return;

      const dx = touch.clientX - lastLookX;

      const dy = touch.clientY - lastLookY;

      lastLookX = touch.clientX;

      lastLookY = touch.clientY;

      // Sensitivity

      const SENSITIVITY = 0.005;

      controls.object.rotation.y -= dx * SENSITIVITY;

      camera.rotation.x -= dy * SENSITIVITY;

      camera.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, camera.rotation.x),
      );
    },
    { passive: false },
  );

  const endLook = (e: TouchEvent) => {
    if (lookTouchId === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId) {
        lookTouchId = null;

        break;
      }
    }
  };

  document.addEventListener("touchend", endLook);

  document.addEventListener("touchcancel", endLook);

  // Mobile Menu Button

  document.getElementById("btn-menu")!.addEventListener("touchstart", (e) => {
    e.preventDefault();

    togglePauseMenu();
  });
}

// --- Game State & Menus ---
// GameState handles these variables now

const mainMenu = document.getElementById("main-menu")!;
const pauseMenu = document.getElementById("pause-menu")!;
const settingsMenu = document.getElementById("settings-menu")!;

const btnNewGame = document.getElementById("btn-new-game")!;
const btnContinue = document.getElementById("btn-continue")!;
const btnResume = document.getElementById("btn-resume")!;
const btnExit = document.getElementById("btn-exit")!;

const btnSettingsMain = document.getElementById("btn-settings-main")!;
const btnSettingsPause = document.getElementById("btn-settings-pause")!;
const btnBackSettings = document.getElementById("btn-back-settings")!;
const cbShadows = document.getElementById("cb-shadows") as HTMLInputElement;
const cbClouds = document.getElementById("cb-clouds") as HTMLInputElement;

function showMainMenu() {
  gameState.setPaused(true);
  gameState.setGameStarted(false);
  mainMenu.style.display = "flex";
  pauseMenu.style.display = "none";
  settingsMenu.style.display = "none";
  inventoryMenu.style.display = "none";
  document.getElementById("ui-container")!.style.display = "none";
  if (isMobile) document.getElementById("mobile-ui")!.style.display = "none";

  controls.unlock();
}

function showPauseMenu() {
  gameState.setPaused(true);
  pauseMenu.style.display = "flex";
  mainMenu.style.display = "none";
  settingsMenu.style.display = "none";
  controls.unlock();
}

function showSettingsMenu(fromMenu: HTMLElement) {
  gameState.setPreviousMenu(fromMenu);
  fromMenu.style.display = "none";
  settingsMenu.style.display = "flex";
}

function hideSettingsMenu() {
  settingsMenu.style.display = "none";
  if (gameState.getPreviousMenu()) {
    gameState.getPreviousMenu()!.style.display = "flex";
  } else {
    showMainMenu(); // Fallback
  }
}

function hidePauseMenu() {
  gameState.setPaused(false);
  pauseMenu.style.display = "none";
  settingsMenu.style.display = "none";
  if (!isMobile) controls.lock();
  game.resetTime();
}

function togglePauseMenu() {
  if (!gameState.getGameStarted()) return;

  // If we are in settings, Go back to pause menu first?
  // Or just close everything? Let's close everything or go to pause.
  if (settingsMenu.style.display === "flex") {
    hideSettingsMenu();
    return;
  }

  if (gameState.getPaused()) {
    hidePauseMenu();
  } else {
    showPauseMenu();
  }
}

async function startGame(loadSave: boolean) {
  if (!isMobile) {
    // Must lock immediately on user gesture
    controls.lock();
  }

  // Show Loading
  btnNewGame.innerText = "Loading...";
  btnContinue.innerText = "Loading...";

  console.log("Starting game...", loadSave ? "(Loading)" : "(New Game)");

  try {
    if (!loadSave) {
      await world.deleteWorld();
      // Reset player state
      playerHealth.respawn();
      controls.object.position.set(8, 40, 20); // Override respawn pos if needed

      // Clear inventory
      inventory.clear();
      inventoryUI.refresh();
    } else {
      const data = await world.loadWorld();
      if (data.playerPosition) {
        controls.object.position.copy(data.playerPosition);
        playerPhysics.setVelocity(new THREE.Vector3(0, 0, 0));
      }
      if (data.inventory) {
        inventory.deserialize(data.inventory);
        inventoryUI.refresh();
      }
    }

    gameState.setGameStarted(true);
    gameState.setPaused(false);
    game.resetTime();
    mainMenu.style.display = "none";
    pauseMenu.style.display = "none";
    settingsMenu.style.display = "none"; // Ensure settings are closed
    document.getElementById("ui-container")!.style.display = "flex";
    if (isMobile) {
      document.getElementById("mobile-ui")!.style.display = "block";
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } catch (e) {
    console.error("Failed to start game:", e);
    alert("Error starting game: " + e);
    // Unlock if failed so user can see alert/menu
    if (!isMobile) controls.unlock();
  } finally {
    btnNewGame.innerText = "New Game";
    btnContinue.innerText = "Continue";
  }
}

// Settings Logic
cbShadows.addEventListener("change", () => {
  environment.setShadowsEnabled(cbShadows.checked);
});

cbClouds.addEventListener("change", () => {
  environment.setCloudsEnabled(cbClouds.checked);
});

// Menu Listeners
btnNewGame.addEventListener("click", () => startGame(false));
btnContinue.addEventListener("click", () => startGame(true));
btnResume.addEventListener("click", () => hidePauseMenu());

btnSettingsMain.addEventListener("click", () => showSettingsMenu(mainMenu));
btnSettingsPause.addEventListener("click", () => showSettingsMenu(pauseMenu));
btnBackSettings.addEventListener("click", () => hideSettingsMenu());

btnExit.addEventListener("click", async () => {
  // Save
  await world.saveWorld({
    position: controls.object.position,
    inventory: inventory.serialize(),
  });

  // Return to main menu
  showMainMenu();
});

// Auto-save loop
setInterval(() => {
  if (gameState.getGameStarted() && !gameState.getPaused()) {
    world.saveWorld({
      position: controls.object.position,
      inventory: inventory.serialize(),
    });
  }
}, 30000);

// Start Animation Loop immediately, but it will respect gameState
game.start();

// Initial State
showMainMenu();
