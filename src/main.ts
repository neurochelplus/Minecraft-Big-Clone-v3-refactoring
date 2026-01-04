import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { World, BLOCK } from "./World";
import { ItemEntity } from "./ItemEntity";
import {
  TOOL_DEFS,
  generateToolTexture,
  generateBlockIcon,
} from "./ToolTextures";
import { BLOCK_DEFS } from "./BlockTextures";
import type { GeneratedTexture } from "./ToolTextures";
import { RECIPES } from "./Recipes";
import type { Recipe } from "./Recipes";
import { MobManager } from "./MobManager";
import { PlayerHand } from "./PlayerHand";
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
import "./style.css";

// Tool Textures Registry
const TOOL_TEXTURES: Record<number, GeneratedTexture> = {};

function initToolTextures() {
  try {
    if (!BLOCK) {
      console.error("BLOCK is undefined! World module failed to load?");
      return;
    }

    console.log("Generating tool textures...");

    TOOL_TEXTURES[BLOCK.STICK] = generateToolTexture(
      TOOL_DEFS.STICK.pattern,
      TOOL_DEFS.STICK.color,
    );

    TOOL_TEXTURES[BLOCK.WOODEN_SWORD] = generateToolTexture(
      TOOL_DEFS.WOODEN_SWORD.pattern,
      TOOL_DEFS.WOODEN_SWORD.color,
    );
    TOOL_TEXTURES[BLOCK.STONE_SWORD] = generateToolTexture(
      TOOL_DEFS.STONE_SWORD.pattern,
      TOOL_DEFS.STONE_SWORD.color,
    );

    TOOL_TEXTURES[BLOCK.WOODEN_PICKAXE] = generateToolTexture(
      TOOL_DEFS.WOODEN_PICKAXE.pattern,
      TOOL_DEFS.WOODEN_PICKAXE.color,
    );
    TOOL_TEXTURES[BLOCK.STONE_PICKAXE] = generateToolTexture(
      TOOL_DEFS.STONE_PICKAXE.pattern,
      TOOL_DEFS.STONE_PICKAXE.color,
    );

    TOOL_TEXTURES[BLOCK.WOODEN_AXE] = generateToolTexture(
      TOOL_DEFS.WOODEN_AXE.pattern,
      TOOL_DEFS.WOODEN_AXE.color,
    );
    TOOL_TEXTURES[BLOCK.STONE_AXE] = generateToolTexture(
      TOOL_DEFS.STONE_AXE.pattern,
      TOOL_DEFS.STONE_AXE.color,
    );

    TOOL_TEXTURES[BLOCK.WOODEN_SHOVEL] = generateToolTexture(
      TOOL_DEFS.WOODEN_SHOVEL.pattern,
      TOOL_DEFS.WOODEN_SHOVEL.color,
    );
    TOOL_TEXTURES[BLOCK.STONE_SHOVEL] = generateToolTexture(
      TOOL_DEFS.STONE_SHOVEL.pattern,
      TOOL_DEFS.STONE_SHOVEL.color,
    );

    // Generate Crafting Table Icon
    if (
      BLOCK_DEFS.CRAFTING_TABLE_TOP &&
      BLOCK_DEFS.CRAFTING_TABLE_TOP.pattern &&
      BLOCK_DEFS.CRAFTING_TABLE_TOP.colors
    ) {
      TOOL_TEXTURES[BLOCK.CRAFTING_TABLE] = generateBlockIcon(
        BLOCK_DEFS.CRAFTING_TABLE_TOP.pattern,
        BLOCK_DEFS.CRAFTING_TABLE_TOP.colors,
      );
    }

    console.log("Tool textures generated.");
  } catch (e) {
    console.error("Failed to generate tool textures:", e);
  }
}

// Initialize later to ensure dependencies are ready
initToolTextures();

// Initialize Renderer (handles scene, camera, renderer, controls)
const gameRenderer = new Renderer();
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

// Inventory State
const inventorySlots = Array.from({ length: 36 }, () => ({ id: 0, count: 0 }));
let selectedSlot = 0;
let isInventoryOpen = false;
let touchStartSlotIndex: number | null = null;

// Drag and Drop State
let draggedItem: { id: number; count: number } | null = null;
const dragIcon = document.getElementById("drag-icon")!;

// UI Elements
const hotbarContainer = document.getElementById("hotbar")!;
const inventoryMenu = document.getElementById("inventory-menu")!;
const inventoryGrid = document.getElementById("inventory-grid")!;
const tooltip = document.getElementById("tooltip")!;
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
  // 1. Try to stack
  for (let i = 0; i < 36; i++) {
    if (inventorySlots[i].id === id) {
      inventorySlots[i].count += count;
      refreshInventoryUI();
      return;
    }
  }
  // 2. Empty slot
  for (let i = 0; i < 36; i++) {
    if (inventorySlots[i].id === 0) {
      inventorySlots[i].id = id;
      inventorySlots[i].count = count;
      refreshInventoryUI();
      return;
    }
  }
  hotbarLabel.show("Inventory full!");
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

// getBlockColor imported from utils/BlockColors.ts

// showHotbarLabel replaced by hotbarLabel.show() method

function initSlotElement(index: number, isHotbar: boolean) {
  const div = document.createElement("div");
  div.classList.add("slot");
  div.setAttribute("data-index", index.toString());

  const icon = document.createElement("div");
  icon.classList.add("block-icon");
  icon.style.display = "none";
  div.appendChild(icon);

  const count = document.createElement("div");
  count.classList.add("slot-count");
  count.innerText = "";
  div.appendChild(count);

  div.addEventListener("mouseenter", () => {
    const slot = inventorySlots[index];
    if (isInventoryOpen && slot.id !== 0) {
      tooltip.innerText = BLOCK_NAMES[slot.id] || "Блок";
      tooltip.style.display = "block";
    }
  });

  div.addEventListener("mousemove", (e) => {
    if (isInventoryOpen) {
      tooltip.style.left = e.clientX + 10 + "px";
      tooltip.style.top = e.clientY + 10 + "px";
    }
  });

  div.addEventListener("mouseleave", () => {
    tooltip.style.display = "none";
  });

  div.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    if (isInventoryOpen) {
      handleSlotClick(index, e.button);
    }
  });

  div.addEventListener("touchstart", (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();

    if (isInventoryOpen) {
      touchStartSlotIndex = index;
      handleSlotClick(index);

      const touch = e.changedTouches[0];
      if (draggedItem) {
        dragIcon.style.left = touch.clientX + "px";
        dragIcon.style.top = touch.clientY + "px";
      }
    } else if (isHotbar) {
      selectedSlot = index;
      onHotbarChange();
    }
  });

  return div;
}

function updateSlotVisuals(index: number) {
  const slot = inventorySlots[index];
  const elements = document.querySelectorAll(`.slot[data-index="${index}"]`);

  elements.forEach((el) => {
    if (el.parentElement === hotbarContainer) {
      if (index === selectedSlot) el.classList.add("active");
      else el.classList.remove("active");
    }

    const icon = el.querySelector(".block-icon") as HTMLElement;
    const countEl = el.querySelector(".slot-count") as HTMLElement;

    if (slot.id !== 0 && slot.count > 0) {
      icon.style.display = "block";
      icon.style.backgroundColor = getBlockColor(slot.id);

      // Remove special classes first
      icon.classList.remove(
        "item-stick",
        "item-planks",
        "item-tool",
        "tool-sword",
        "tool-pickaxe",
        "tool-axe",
        "mat-wood",
        "mat-stone",
      );

      // Reset styles
      icon.style.backgroundImage = "";
      icon.style.backgroundColor = "";

      if (TOOL_TEXTURES[slot.id]) {
        icon.classList.add("item-tool"); // Keeps size/reset
        icon.style.backgroundImage = `url(${TOOL_TEXTURES[slot.id].dataUrl})`;
      } else if (slot.id === 7) {
        // Planks
        icon.classList.add("item-planks");
        icon.style.backgroundColor = getBlockColor(slot.id);
      } else if (slot.id === 9) {
        // Crafting Table
        icon.style.backgroundColor = getBlockColor(slot.id);
        // Could add special class for pattern
        icon.style.backgroundImage = "var(--noise-url)";
      } else {
        icon.style.backgroundColor = getBlockColor(slot.id);
        icon.style.backgroundImage = "var(--noise-url)"; // Restore noise for blocks
      }

      countEl.innerText = slot.count.toString();
    } else {
      icon.style.display = "none";
      countEl.innerText = "";
    }
  });
}

// --- Crafting System ---
let isCraftingOpen = false;
let isCraftingTable = false; // 2x2 or 3x3
const craftingSlots = Array.from({ length: 9 }, () => ({ id: 0, count: 0 }));
const craftingResult = { id: 0, count: 0 };

const craftingArea = document.createElement("div");
craftingArea.id = "crafting-area";
// Build Crafting UI structure
// [ Grid ] -> [ Result ]

const craftGridContainer = document.createElement("div");
craftGridContainer.id = "crafting-grid-container";
craftingArea.appendChild(craftGridContainer);

const arrowDiv = document.createElement("div");
arrowDiv.className = "crafting-arrow";
arrowDiv.innerText = "→";
craftingArea.appendChild(arrowDiv);

const resultContainer = document.createElement("div");
resultContainer.id = "crafting-result-container";
const resultSlotDiv = document.createElement("div"); // Will be init via initSlotElement
// We need custom logic for result slot because it's not part of standard inventorySlots array
resultSlotDiv.classList.add("slot");
resultSlotDiv.id = "slot-result";
const resultIcon = document.createElement("div");
resultIcon.className = "block-icon";
resultIcon.style.display = "none";
const resultCount = document.createElement("div");
resultCount.className = "slot-count";
resultSlotDiv.appendChild(resultIcon);
resultSlotDiv.appendChild(resultCount);

resultSlotDiv.addEventListener("mousedown", (e) => {
  e.stopPropagation();
  handleResultClick();
});
resultSlotDiv.addEventListener("touchstart", (e) => {
  e.stopPropagation();
  if (e.cancelable) e.preventDefault();
  handleResultClick();
});

resultContainer.appendChild(resultSlotDiv);
craftingArea.appendChild(resultContainer);

// Mobile List
const mobileCraftingList = document.createElement("div");
mobileCraftingList.id = "mobile-crafting-list";

function initCraftingUI() {
  // Insert into menu
  inventoryMenu.insertBefore(craftingArea, inventoryGrid);
  if (isMobile) {
    document.body.appendChild(mobileCraftingList); // Append to body for absolute positioning

    // Prevent camera movement when scrolling list
    mobileCraftingList.addEventListener(
      "touchmove",
      (e) => {
        e.stopPropagation();
      },
      { passive: false },
    );

    mobileCraftingList.addEventListener(
      "touchstart",
      (e) => {
        e.stopPropagation();
      },
      { passive: false },
    );
  }
}

// Call once
initCraftingUI();

function updateCraftingGridSize() {
  craftGridContainer.innerHTML = "";
  const size = isCraftingTable ? 3 : 2;
  const total = size * size;

  if (isCraftingTable) {
    craftGridContainer.classList.add("grid-3x3");
  } else {
    craftGridContainer.classList.remove("grid-3x3");
  }

  for (let i = 0; i < total; i++) {
    // Map 2x2 indices to 0,1,3,4 of 9-slot array or just use 0-3?
    // Let's use 0-8 linearly.
    // For 2x2, we use indices 0,1,2,3 of craftingSlots.

    const div = document.createElement("div");
    div.classList.add("slot");
    div.setAttribute("data-craft-index", i.toString());

    const icon = document.createElement("div");
    icon.classList.add("block-icon");
    icon.style.display = "none";
    div.appendChild(icon);

    const countEl = document.createElement("div");
    countEl.classList.add("slot-count");
    div.appendChild(countEl);

    // Events
    const handleCraftSlot = (btn: number = 0) => {
      handleCraftSlotClick(i, btn);
    };

    div.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      handleCraftSlot(e.button);
    });
    div.addEventListener("touchstart", (e) => {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      handleCraftSlot();
    });

    craftGridContainer.appendChild(div);
  }
}

function updateCraftingVisuals() {
  if (isMobile) {
    updateMobileCraftingList();
    return; // Desktop grid hidden on mobile usually? Or user wants separate UI.
    // User said "mobile needs list", implying grid is bad.
    // We'll hide grid on mobile via CSS or JS.
  }

  const size = isCraftingTable ? 3 : 2;
  const total = size * size;

  // Update Grid
  const slots = craftGridContainer.children;
  for (let i = 0; i < total; i++) {
    const slot = craftingSlots[i];
    const el = slots[i] as HTMLElement;
    const icon = el.querySelector(".block-icon") as HTMLElement;
    const countEl = el.querySelector(".slot-count") as HTMLElement;

    if (slot.id !== 0 && slot.count > 0) {
      icon.style.display = "block";

      // Cleanup classes
      icon.classList.remove("item-stick", "item-planks", "item-tool");
      icon.style.backgroundImage = "";

      if (TOOL_TEXTURES[slot.id]) {
        icon.classList.add("item-tool");
        icon.style.backgroundImage = `url(${TOOL_TEXTURES[slot.id].dataUrl})`;
      } else if (slot.id === 7) {
        icon.classList.add("item-planks");
        icon.style.backgroundColor = getBlockColor(slot.id);
      } else if (slot.id === 9) {
        icon.style.backgroundColor = getBlockColor(slot.id);
      } else {
        icon.style.backgroundColor = getBlockColor(slot.id);
        icon.style.backgroundImage = "var(--noise-url)";
      }

      countEl.innerText = slot.count.toString();
    } else {
      icon.style.display = "none";
      countEl.innerText = "";
    }
  }

  // Update Result
  if (craftingResult.id !== 0) {
    resultIcon.style.display = "block";

    // Cleanup classes
    resultIcon.classList.remove("item-stick", "item-planks", "item-tool");
    resultIcon.style.backgroundImage = "";

    if (TOOL_TEXTURES[craftingResult.id]) {
      resultIcon.classList.add("item-tool");
      resultIcon.style.backgroundImage = `url(${TOOL_TEXTURES[craftingResult.id].dataUrl})`;
    } else if (craftingResult.id === 7) {
      resultIcon.classList.add("item-planks");
      resultIcon.style.backgroundColor = getBlockColor(craftingResult.id);
    } else if (craftingResult.id === 9) {
      resultIcon.style.backgroundColor = getBlockColor(craftingResult.id);
    } else {
      resultIcon.style.backgroundColor = getBlockColor(craftingResult.id);
      resultIcon.style.backgroundImage = "var(--noise-url)";
    }

    resultCount.innerText = craftingResult.count.toString();
  } else {
    resultIcon.style.display = "none";
    resultCount.innerText = "";
  }
}

function checkRecipes() {
  // Convert current grid to a standardized "shape"
  // 1. Find bounds
  const size = isCraftingTable ? 3 : 2;
  let minX = size,
    minY = size,
    maxX = -1,
    maxY = -1;

  // Check if empty
  let isEmpty = true;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = y * size + x;
      if (craftingSlots[index].id !== 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        isEmpty = false;
      }
    }
  }

  if (isEmpty) {
    craftingResult.id = 0;
    craftingResult.count = 0;
    updateCraftingVisuals();
    return;
  }

  // 2. Extract relative pattern
  const patternWidth = maxX - minX + 1;
  const patternHeight = maxY - minY + 1;

  // Match against recipes
  for (const recipe of RECIPES) {
    // A. Shapeless (Simple ingredient count check)
    if (recipe.ingredients) {
      // Check if grid has exactly these ingredients
      // Copy ingredients to temp map
      const needed = [...recipe.ingredients];
      let match = true;
      let usedCount = 0;

      // Count total items in grid
      let gridItemCount = 0;
      for (let i = 0; i < size * size; i++)
        if (craftingSlots[i].id !== 0) gridItemCount++;

      // For each item in grid, try to find in needed list
      for (let i = 0; i < size * size; i++) {
        const slot = craftingSlots[i];
        if (slot.id === 0) continue;

        const foundIdx = needed.findIndex(
          (n) => n.id === slot.id && n.count > 0,
        ); // Assuming 1 per slot for now?
        // Recipe definition "ingredients" assumes 1 unit per slot usually
        // But my def has 'count'.
        // Standard MC shapeless: List of items required.

        if (foundIdx !== -1) {
          needed.splice(foundIdx, 1);
        } else {
          match = false;
          break;
        }
      }

      if (match && needed.length === 0) {
        craftingResult.id = recipe.result.id;
        craftingResult.count = recipe.result.count;
        updateCraftingVisuals();
        return;
      }
    }

    // B. Shaped
    if (recipe.pattern && recipe.keys) {
      if (
        recipe.pattern[0].length !== patternWidth ||
        recipe.pattern.length !== patternHeight
      ) {
        continue; // Size mismatch
      }

      let match = true;
      for (let y = 0; y < patternHeight; y++) {
        for (let x = 0; x < patternWidth; x++) {
          const rowStr = recipe.pattern[y];
          const keyChar = rowStr[x];
          const expectedId = keyChar === " " ? 0 : recipe.keys[keyChar];

          // Grid pos
          const gx = minX + x;
          const gy = minY + y;
          const gIndex = gy * size + gx;

          if (craftingSlots[gIndex].id !== expectedId) {
            match = false;
            break;
          }
        }
        if (!match) break;
      }

      if (match) {
        craftingResult.id = recipe.result.id;
        craftingResult.count = recipe.result.count;
        updateCraftingVisuals();
        return;
      }
    }
  }

  // No match
  craftingResult.id = 0;
  craftingResult.count = 0;
  updateCraftingVisuals();
}

function handleCraftSlotClick(index: number, button: number = 0) {
  const slot = craftingSlots[index];

  if (!draggedItem) {
    if (slot.id !== 0) {
      if (button === 2) {
        // Right Click: Split
        const half = Math.ceil(slot.count / 2);
        draggedItem = { id: slot.id, count: half };
        slot.count -= half;
        if (slot.count === 0) slot.id = 0;
      } else {
        // Pickup All
        draggedItem = { ...slot };
        slot.id = 0;
        slot.count = 0;
      }
      checkRecipes();
    }
  } else {
    if (slot.id === 0) {
      if (button === 2) {
        // Place One
        slot.id = draggedItem.id;
        slot.count = 1;
        draggedItem.count--;
        if (draggedItem.count === 0) draggedItem = null;
      } else {
        // Place All
        slot.id = draggedItem.id;
        slot.count = draggedItem.count;
        draggedItem = null;
      }
      checkRecipes();
    } else if (slot.id === draggedItem.id) {
      if (button === 2) {
        // Add One
        slot.count++;
        draggedItem.count--;
        if (draggedItem.count === 0) draggedItem = null;
      } else {
        // Add All
        slot.count += draggedItem.count;
        draggedItem = null;
      }
      checkRecipes();
    } else {
      // Swap
      const temp = { ...slot };
      slot.id = draggedItem.id;
      slot.count = draggedItem.count;
      draggedItem = temp;
      checkRecipes();
    }
  }
  updateCraftingVisuals();
  updateDragIcon();
}

function handleResultClick() {
  if (craftingResult.id === 0) return;

  // Check if we can pick it up
  if (!draggedItem) {
    draggedItem = { ...craftingResult };
    consumeIngredients();
  } else if (draggedItem.id === craftingResult.id) {
    draggedItem.count += craftingResult.count;
    consumeIngredients();
  }

  updateDragIcon();
  // checkRecipes is called inside consumeIngredients
}

function consumeIngredients() {
  const size = isCraftingTable ? 3 : 2;
  for (let i = 0; i < size * size; i++) {
    if (craftingSlots[i].id !== 0) {
      craftingSlots[i].count--;
      if (craftingSlots[i].count <= 0) {
        craftingSlots[i].id = 0;
        craftingSlots[i].count = 0;
      }
    }
  }
  checkRecipes();
}

// Mobile Crafting Logic
function updateMobileCraftingList() {
  mobileCraftingList.innerHTML = "";

  // Find all recipes that can be crafted from INVENTORY
  // Just a simple "can craft" check?
  // User wants a LIST of available items.
  // Showing all recipes is safer, highlighting avail ones.

  // For simplicity, let's just show all RECIPES.

  RECIPES.forEach((recipe, idx) => {
    // Filter logic for Mobile:
    // If NOT using crafting table (isCraftingTable == false), only allow 2x2 recipes.
    if (!isCraftingTable) {
      let needs3x3 = false;

      if (recipe.pattern) {
        if (recipe.pattern.length > 2 || recipe.pattern[0].length > 2) {
          needs3x3 = true;
        }
      } else if (recipe.ingredients) {
        // Shapeless: > 4 items requires 3x3
        let totalIngredients = 0;
        recipe.ingredients.forEach((i) => (totalIngredients += i.count));
        if (totalIngredients > 4) needs3x3 = true;
      }

      if (needs3x3) return; // Skip this recipe
    }

    // Calculate max craftable
    // 1. Tally Inventory
    const invMap = new Map<number, number>();
    inventorySlots.forEach((s) => {
      if (s.id !== 0) invMap.set(s.id, (invMap.get(s.id) || 0) + s.count);
    });

    // 2. Tally Recipe Requirements
    const reqMap = new Map<number, number>();
    if (recipe.ingredients) {
      recipe.ingredients.forEach((i) =>
        reqMap.set(i.id, (reqMap.get(i.id) || 0) + i.count),
      );
    } else if (recipe.pattern && recipe.keys) {
      for (const row of recipe.pattern) {
        for (const char of row) {
          if (char !== " ") {
            const id = recipe.keys[char];
            reqMap.set(id, (reqMap.get(id) || 0) + 1);
          }
        }
      }
    }

    // 3. Check sufficiency
    let canCraft = true;
    let maxCrafts = 999;

    for (const [reqId, reqCount] of reqMap) {
      const has = invMap.get(reqId) || 0;
      if (has < reqCount) {
        canCraft = false;
        maxCrafts = 0;
        break;
      } else {
        maxCrafts = Math.min(maxCrafts, Math.floor(has / reqCount));
      }
    }

    if (!canCraft) return; // Hide uncraftable? Or show disabled. "List of available for craft" implies filter.

    const btn = document.createElement("div");
    btn.className = "craft-btn";

    // Ingredients Container
    const ingContainer = document.createElement("div");
    ingContainer.className = "craft-ingredients";

    // Render unique ingredients (simplified)
    let ingCount = 0;
    for (const [reqId, reqCount] of reqMap) {
      if (ingCount >= 3) break; // Limit to 3 icons to save space

      const ingIcon = document.createElement("div");
      ingIcon.className = "block-icon";
      // Copy style logic... reusing helper would be better but inline for now
      if (TOOL_TEXTURES[reqId]) {
        ingIcon.classList.add("item-tool");
        ingIcon.style.backgroundImage = `url(${TOOL_TEXTURES[reqId].dataUrl})`;
      } else if (reqId === 7) {
        ingIcon.classList.add("item-planks");
        ingIcon.style.backgroundColor = getBlockColor(reqId);
      } else if (reqId === 9) {
        ingIcon.style.backgroundColor = getBlockColor(reqId);
      } else {
        ingIcon.style.backgroundColor = getBlockColor(reqId);
        ingIcon.style.backgroundImage = "var(--noise-url)";
      }
      ingContainer.appendChild(ingIcon);
      ingCount++;
    }
    btn.appendChild(ingContainer);

    // Arrow
    const arrow = document.createElement("div");
    arrow.className = "craft-arrow";
    arrow.innerText = "→";
    btn.appendChild(arrow);

    // Result Icon
    const icon = document.createElement("div");
    icon.className = "block-icon";
    const rId = recipe.result.id;

    if (TOOL_TEXTURES[rId]) {
      icon.classList.add("item-tool");
      icon.style.backgroundImage = `url(${TOOL_TEXTURES[rId].dataUrl})`;
    } else if (rId === 7) {
      icon.classList.add("item-planks");
      icon.style.backgroundColor = getBlockColor(rId);
    } else if (rId === 9) {
      icon.style.backgroundColor = getBlockColor(rId);
    } else {
      icon.style.backgroundColor = getBlockColor(rId);
      icon.style.backgroundImage = "var(--noise-url)";
    }

    btn.appendChild(icon);

    // Count if > 1
    if (recipe.result.count > 1) {
      const countDiv = document.createElement("div");
      countDiv.className = "slot-count";
      countDiv.innerText = recipe.result.count.toString();
      icon.appendChild(countDiv);
    }

    btn.onclick = () => {
      // Consume from inventory
      for (const [reqId, reqCount] of reqMap) {
        let remaining = reqCount;
        for (let i = 0; i < 36; i++) {
          if (inventorySlots[i].id === reqId) {
            const take = Math.min(remaining, inventorySlots[i].count);
            inventorySlots[i].count -= take;
            remaining -= take;
            if (inventorySlots[i].count === 0) inventorySlots[i].id = 0;
            if (remaining <= 0) break;
          }
        }
      }

      // Add result
      addItemToInventory(recipe.result.id, recipe.result.count);
      refreshInventoryUI(); // Updates list too
    };

    mobileCraftingList.appendChild(btn);
  });
}

function initInventoryUI() {
  hotbarContainer.innerHTML = "";
  inventoryGrid.innerHTML = "";

  // Add Close Button for Mobile
  if (!document.getElementById("btn-close-inv")) {
    const closeBtn = document.createElement("div");
    closeBtn.id = "btn-close-inv";
    closeBtn.innerText = "X";
    closeBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      toggleInventory();
    });
    closeBtn.addEventListener("click", (e) => {
      // Fallback
      toggleInventory();
    });
    inventoryMenu.appendChild(closeBtn);
  }

  // Hotbar Container (0-8)
  for (let i = 0; i < 9; i++) {
    hotbarContainer.appendChild(initSlotElement(i, true));
  }

  // Inventory Grid: Main (9-35)
  for (let i = 9; i < 36; i++) {
    inventoryGrid.appendChild(initSlotElement(i, false));
  }

  // Separator
  const separator = document.createElement("div");
  separator.className = "slot-hotbar-separator";
  separator.style.gridColumn = "1 / -1";
  inventoryGrid.appendChild(separator);

  // Inventory Grid: Hotbar Copy (0-8)
  for (let i = 0; i < 9; i++) {
    inventoryGrid.appendChild(initSlotElement(i, false));
  }
}

function refreshInventoryUI() {
  for (let i = 0; i < 36; i++) {
    updateSlotVisuals(i);
  }
  // Update hand if active slot changed count or ID
  const slot = inventorySlots[selectedSlot];
  playerHand.updateItem(slot ? slot.id : 0);

  if (isInventoryOpen) updateCraftingVisuals();
}

function toggleInventory(useCraftingTable = false) {
  isInventoryOpen = !isInventoryOpen;

  if (isInventoryOpen) {
    controls.unlock();
    inventoryMenu.style.display = "flex";

    // Set Mode
    isCraftingTable = useCraftingTable;
    craftingArea.style.display = isMobile ? "none" : "flex"; // Hide grid on mobile
    mobileCraftingList.style.display = isMobile ? "flex" : "none";

    // Mobile: Hide controls
    if (isMobile) {
      document.getElementById("mobile-ui")!.style.display = "none";
      // But keep INV button visible? No, usually close with 'E' logic or back button.
      // We need a close button on inventory menu for mobile.
      // Actually 'btn-inv' is part of mobile-ui. If we hide mobile-ui, we hide the button to close it.
      // Let's hide specific parts of mobile-ui.
      document.getElementById("joystick-zone")!.style.display = "none";
      document.getElementById("mobile-actions")!.style.display = "none";
      // We need a way to close inventory.
      // Add a close button to inventory menu?
      // Or keep btn-inv visible.
      // btn-inv is child of mobile-ui.
      // Let's just hide joystick and actions.
    }

    updateCraftingGridSize();

    // Clear crafting slots when opening/closing?
    // MC keeps items in crafting table but throws them out if you close 2x2.
    // Simplification: Return items to inventory on close.

    refreshInventoryUI();
    updateCraftingVisuals();
  } else {
    // Auto-save on close
    world.saveWorld({
      position: controls.object.position,
      inventory: inventorySlots,
    });

    // Return crafting items to inventory
    const size = isCraftingTable ? 3 : 2; // Actually we might have switched modes, but assuming we close what we opened.
    // If we closed via 'E', it's possible we were in 3x3.
    // Just clear all 9 slots to be safe.
    for (let i = 0; i < 9; i++) {
      if (craftingSlots[i].id !== 0) {
        addItemToInventory(craftingSlots[i].id, craftingSlots[i].count);
        craftingSlots[i].id = 0;
        craftingSlots[i].count = 0;
      }
    }
    craftingResult.id = 0;
    craftingResult.count = 0;
    // We already updated visuals in toggle, but UI is hidden now.

    if (isMobile) {
      mobileCraftingList.style.display = "none";
      const mobileUi = document.getElementById("mobile-ui");
      if (mobileUi) mobileUi.style.display = "block";
      document.getElementById("joystick-zone")!.style.display = "block";
      document.getElementById("mobile-actions")!.style.display = "flex";
    }

    controls.lock();
    inventoryMenu.style.display = "none";
    tooltip.style.display = "none";

    if (draggedItem) {
      for (let i = 0; i < 36; i++) {
        if (inventorySlots[i].id === 0) {
          inventorySlots[i] = draggedItem;
          break;
        } else if (inventorySlots[i].id === draggedItem.id) {
          inventorySlots[i].count += draggedItem.count;
          break;
        }
      }
      draggedItem = null;
      updateDragIcon();
    }
  }
}

function handleSlotClick(index: number, button: number = 0) {
  const slot = inventorySlots[index];

  if (!draggedItem) {
    if (slot.id !== 0) {
      if (button === 2) {
        // Right Click: Split
        const half = Math.ceil(slot.count / 2);
        draggedItem = { id: slot.id, count: half };
        slot.count -= half;
        if (slot.count === 0) slot.id = 0;
      } else {
        // Left Click: Pickup All
        draggedItem = { ...slot };
        slot.id = 0;
        slot.count = 0;
      }
    }
  } else {
    if (slot.id === 0) {
      if (button === 2) {
        // Right Click: Place One
        slot.id = draggedItem.id;
        slot.count = 1;
        draggedItem.count--;
        if (draggedItem.count === 0) draggedItem = null;
      } else {
        // Left Click: Place All
        slot.id = draggedItem.id;
        slot.count = draggedItem.count;
        draggedItem = null;
      }
    } else if (slot.id === draggedItem.id) {
      if (button === 2) {
        // Right Click: Add One
        slot.count++;
        draggedItem.count--;
        if (draggedItem.count === 0) draggedItem = null;
      } else {
        // Left Click: Add All
        slot.count += draggedItem.count;
        draggedItem = null;
      }
    } else {
      // Swap (Left Click usually, RMB might fail or swap too)
      const temp = { ...slot };
      slot.id = draggedItem.id;
      slot.count = draggedItem.count;
      draggedItem = temp;
    }
  }

  refreshInventoryUI();
  updateDragIcon();
}

function updateDragIcon() {
  dragIcon.innerHTML = "";
  if (draggedItem && draggedItem.id !== 0) {
    dragIcon.style.display = "block";
    const icon = document.createElement("div");
    icon.className = "block-icon";
    icon.style.width = "32px";
    icon.style.height = "32px";

    if (TOOL_TEXTURES[draggedItem.id]) {
      icon.classList.add("item-tool");
      icon.style.backgroundImage = `url(${TOOL_TEXTURES[draggedItem.id].dataUrl})`;
    } else if (draggedItem.id === 7) {
      icon.classList.add("item-planks");
      icon.style.backgroundColor = getBlockColor(draggedItem.id);
    } else if (draggedItem.id === 9) {
      icon.style.backgroundColor = getBlockColor(draggedItem.id);
    } else {
      icon.style.backgroundColor = getBlockColor(draggedItem.id);
    }

    const count = document.createElement("div");
    count.className = "slot-count";
    count.style.fontSize = "12px";
    count.innerText = draggedItem.count.toString();

    icon.appendChild(count);
    dragIcon.appendChild(icon);
  } else {
    dragIcon.style.display = "none";
  }
}

window.addEventListener("mousemove", (e) => {
  if (draggedItem) {
    dragIcon.style.left = e.clientX + "px";
    dragIcon.style.top = e.clientY + "px";
  }
});

window.addEventListener(
  "touchmove",
  (e) => {
    if (draggedItem && isInventoryOpen) {
      const touch = e.changedTouches[0];
      dragIcon.style.left = touch.clientX + "px";
      dragIcon.style.top = touch.clientY + "px";
    }
  },
  { passive: false },
);

window.addEventListener("touchend", (e) => {
  if (draggedItem && isInventoryOpen && touchStartSlotIndex !== null) {
    const touch = e.changedTouches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const slotEl = target?.closest(".slot");

    if (slotEl) {
      const targetIndex = parseInt(slotEl.getAttribute("data-index") || "-1");
      // If dropped on a valid slot (even the same one), handle it
      if (targetIndex !== -1) {
        handleSlotClick(targetIndex);
      }
    } else {
      // Dropped outside or invalid target - return to start slot
      handleSlotClick(touchStartSlotIndex);
    }

    touchStartSlotIndex = null;
  }
});

initInventoryUI();
refreshInventoryUI();

function onHotbarChange() {
  refreshInventoryUI();
  const slot = inventorySlots[selectedSlot];
  if (slot && slot.id !== 0) {
    hotbarLabel.show(BLOCK_NAMES[slot.id] || "Unknown Block");
    playerHand.updateItem(slot.id);
  } else {
    hotbarLabel.hide();
    playerHand.updateItem(0);
  }
}

window.addEventListener("wheel", (event) => {
  if (event.deltaY > 0) {
    selectedSlot = (selectedSlot + 1) % 9;
  } else {
    selectedSlot = (selectedSlot - 1 + 9) % 9;
  }
  onHotbarChange();
});

window.addEventListener("keydown", (event) => {
  const key = parseInt(event.key);
  if (key >= 1 && key <= 9) {
    selectedSlot = key - 1;
    onHotbarChange();
  }
});

// Interaction
const blockCursor = new BlockCursor(scene, camera, controls);
const cursorMesh = blockCursor.getMesh();

// --- Block Breaking System ---

// 1. Generate Crack Textures (Atlas)
// We'll create a 10-frame atlas on a canvas
// Block Breaking System
const blockBreaking = new BlockBreaking(
  scene,
  camera,
  controls,
  () => inventorySlots[selectedSlot].id,
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

// State
let isAttackPressed = false;

function updateBreaking(time: number) {
  blockBreaking.update(time, world);
}

function startBreaking() {
  blockBreaking.start(world);
}

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
  () => inventorySlots[selectedSlot].id,
  cursorMesh,
  crackMesh,
);

// Block Interaction
const blockInteraction = new BlockInteraction(
  camera,
  scene,
  controls,
  () => inventorySlots[selectedSlot],
  (x, y, z, id) => {
    world.setBlock(x, y, z, id);

    const slot = inventorySlots[selectedSlot];
    slot.count--;
    if (slot.count <= 0) {
      slot.id = 0;
      slot.count = 0;
    }
    refreshInventoryUI();
    return true;
  },
  () => toggleInventory(true),
  cursorMesh,
  crackMesh,
);

function performInteract() {
  blockInteraction.interact(world);
}

document.addEventListener("mousedown", (event) => {
  if (gameState.getPaused() || !gameState.getGameStarted()) return;
  if (!controls.isLocked && !isMobile) return;
  if (isInventoryOpen) return;

  if (event.button === 0) {
    isAttackPressed = true;
    playerHand.punch();
    playerCombat.performAttack(); // Hit mobs
    startBreaking(); // Start mining block
  } else if (event.button === 2) performInteract();
});

document.addEventListener("mouseup", () => {
  if (isAttackPressed) isAttackPressed = false;
  playerHand.stopPunch();
  blockBreaking.stop();
});

// Player dimensions are handled in PlayerPhysics

// Animation Loop
let prevTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  if (gameState.getPaused()) {
    renderer.render(scene, camera);
    return;
  }

  world.update(controls.object.position);

  const time = performance.now();
  const delta = (time - prevTime) / 1000;

  environment.update(delta, controls.object.position);

  // Player Hand Update
  const isMoving =
    (playerPhysics.moveForward ||
      playerPhysics.moveBackward ||
      playerPhysics.moveLeft ||
      playerPhysics.moveRight) &&
    playerPhysics.isOnGround;
  playerHand.update(delta, isMoving);

  updateBreaking(time);

  if (isAttackPressed && !gameState.getPaused() && gameState.getGameStarted()) {
    if (!blockBreaking.isBreakingNow()) startBreaking();
    playerCombat.performAttack();
  }
  // Update Entities & Pickup
  for (let i = entities.length - 1; i >= 0; i--) {
    const entity = entities[i];
    entity.update(time / 1000, delta);

    if (entity.isDead) {
      entities.splice(i, 1);
      continue;
    }

    if (entity.mesh.position.distanceTo(controls.object.position) < 2.5) {
      // Pickup logic
      const type = entity.type;

      // 1. Try to find existing slot with same type
      let targetSlot = inventorySlots.find((s) => s.id === type);

      // 2. If not found, find first empty slot
      if (!targetSlot) {
        targetSlot = inventorySlots.find((s) => s.id === 0);
        if (targetSlot) {
          targetSlot.id = type;
          targetSlot.count = 0;
        }
      }

      // 3. Add to slot if found
      if (targetSlot) {
        targetSlot.count++;
        entity.dispose();
        entities.splice(i, 1);

        // Update Hotbar label if picking up to active slot
        if (targetSlot === inventorySlots[selectedSlot]) {
          onHotbarChange();
        } else {
          refreshInventoryUI();
        }
      }
    }
  }

  // Update Mob Manager
  mobManager.update(delta, controls.object.position, environment, (amt) =>
    playerHealth.takeDamage(amt),
  );

  // Cursor Update
  if (!gameState.getPaused() && gameState.getGameStarted()) {
    blockCursor.update(world);
  }

  if (!gameState.getPaused() && gameState.getGameStarted()) {
    // Safety: Don't apply physics if the current chunk isn't loaded yet
    // This prevents falling through the world upon load/teleport
    if (
      !world.isChunkLoaded(
        controls.object.position.x,
        controls.object.position.z,
      )
    ) {
      // Still update entities/mobs even if player is frozen, but skip player physics
      // Actually, if we return here, we skip player movement code below.
      // We rely on the global world.update() at start of animate() to keep loading chunks.
      prevTime = time;
      return;
    }

    playerPhysics.update(delta);
  }

  prevTime = time;

  renderer.clear(); // Clear color & depth
  renderer.render(scene, camera);
  renderer.clearDepth(); // Clear depth for UI overlay
  renderer.render(uiScene, uiCamera);
}

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

    isAttackPressed = true;
    playerHand.punch();
    playerCombat.performAttack();
    startBreaking();
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
      isAttackPressed = false;
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
const gameState = new GameState();
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
  prevTime = performance.now();
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
      for (let i = 0; i < 36; i++) {
        inventorySlots[i] = { id: 0, count: 0 };
      }
      refreshInventoryUI();
    } else {
      const data = await world.loadWorld();
      if (data.playerPosition) {
        controls.object.position.copy(data.playerPosition);
        playerPhysics.setVelocity(new THREE.Vector3(0, 0, 0));
      }
      if (data.inventory) {
        for (let i = 0; i < 36; i++) {
          if (data.inventory[i]) {
            inventorySlots[i] = data.inventory[i];
          }
        }
        refreshInventoryUI();
      }
    }

    gameState.setGameStarted(true);
    gameState.setPaused(false);
    prevTime = performance.now();
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
    inventory: inventorySlots,
  });

  // Return to main menu
  showMainMenu();
});

// Auto-save loop
setInterval(() => {
  if (gameState.getGameStarted() && !gameState.getPaused()) {
    world.saveWorld({
      position: controls.object.position,
      inventory: inventorySlots,
    });
  }
}, 30000);

// Start Animation Loop immediately, but it will respect gameState
animate();

// Initial State
showMainMenu();
