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
    !game.cli.isOpen
  ) {
    game.menus.showPauseMenu();
  }
});

// controls.object already added to scene in Renderer constructor

// Movement variables are now managed by PlayerPhysics

const onKeyDown = (event: KeyboardEvent) => {
  if (game.cli.isOpen) return; // Ignore game keys when typing

  switch (event.code) {
    case "Slash":
      event.preventDefault();
      game.cli.toggle(true, "/");
      break;
    case "KeyT":
      if (
        !gameState.getPaused() &&
        gameState.getGameStarted() &&
        !isInventoryOpen
      ) {
        event.preventDefault();
        game.cli.toggle(true, "");
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
      else game.menus.togglePauseMenu();
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

// CLI Elements removed (handled by CLI class)

// Disable context menu for right-click splitting
document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

// CLI Functions removed (handled by CLI class)

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

// Mobile Controls Implementation Removed (now in MobileControls.ts)
// Events for Mobile Controls Integration:
window.addEventListener("toggle-inventory", () => {
  toggleInventory(false);
});

window.addEventListener("toggle-pause-menu", () => {
  game.menus.togglePauseMenu();
});

// --- Game State & Menus ---
// Menu Logic removed (handled by Menus class)

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

// Initial State (Menus class handles this in start(), but we can ensure it's hidden or show it if game.start() doesn't)
// game.start() calls menus.showMainMenu();
