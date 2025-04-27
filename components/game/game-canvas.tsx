"use client";

import { useRef, useEffect } from "react";
import { GameStatus } from "@/types/game";
import { useAmplitude } from "@/contexts/amplitude-provider";
import { sendHapticFeedback } from "@/lib/haptics";

interface GameCanvasProps {
  gameStatus: GameStatus;
  onGameOver: (score: number, distance: number) => void;
  currentLane: number;
  onScoreUpdate: (score: number) => void;
  onDistanceUpdate: (distance: number) => void;
  onQuizTrigger?: (quizId: string) => void;
  gameConfig?: any; // Game configuration from API
  brandId?: string; // Pass brandId for tracking
}

// Game constants
const PLAYER_HEIGHT = 50;
const PLAYER_WIDTH = 30;
const OBSTACLE_WIDTH = 60;
const OBSTACLE_HEIGHT = 60;
const COLLECTIBLE_SIZE = 40;
const BASE_OBSTACLE_FREQUENCY = 0.01; // Base frequency, can be adjusted by config
const BASE_COLLECTIBLE_FREQUENCY = 0.015; // Base frequency, can be adjusted by config
const BASE_QUIZ_ITEM_FREQUENCY = 0.005; // Base frequency, can be adjusted by config
const BASE_GAME_SPEED = 4; // Base speed, will increase with score
const GROUND_HEIGHT = 50; // Height of the ground from bottom
const SPEED_INCREASE_THRESHOLD = 200; // Score threshold for speed increase
const SPEED_INCREASE_PERCENTAGE = 10; // Percentage to increase speed by
const MAX_SPEED_MULTIPLIER = 3; // Maximum speed multiplier
const LANE_WIDTH = 100;
const LANE_SPACING = 20;
const MAX_GAME_OBJECTS = 10; // Maximum number of objects allowed on screen at once

// Particle system for visual effects
interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  life: number;
  maxLife: number;
}

// Game object types
interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  lane: number;
  type: "obstacle" | "collectible" | "quiz" | "powerup";
  value?: number;
  quizId?: string;
  imageUrl?: string;
  createdAt?: number; // Timestamp when object was created
}

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  lane: number;
}

export function GameCanvas({
  gameStatus,
  onGameOver,
  currentLane,
  onScoreUpdate,
  onDistanceUpdate,
  onQuizTrigger,
  gameConfig,
  brandId,
}: GameCanvasProps) {
  const { track } = useAmplitude();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const distanceRef = useRef<number>(0);
  const gameObjectsRef = useRef<GameObject[]>([]);
  const playerRef = useRef<Player>({
    x: 0,
    y: 0,
    width: 30,
    height: 50,
    lane: 1,
  });
  const particlesRef = useRef<Particle[]>([]);
  const framesSinceLastObstacleRef = useRef<number>(0);
  const gameSpeedRef = useRef<number>(4.5);
  const canvasWidthRef = useRef<number>(0);
  const canvasHeightRef = useRef<number>(0);
  const laneWidthRef = useRef<number>(0);

  // Add image references
  const playerImageRef = useRef<HTMLImageElement | null>(null);
  const obstacleImageRef = useRef<HTMLImageElement | null>(null);
  const collectibleImageRef = useRef<HTMLImageElement | null>(null);
  const powerupImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);

  // Game state refs
  const gameStatusRef = useRef<GameStatus>(gameStatus);
  const currentLaneRef = useRef<number>(currentLane);

  // Last update time for score and distance
  const lastUpdateRef = useRef<number>(0);
  // Frame counter for distance calculation
  const frameCounterRef = useRef<number>(0);
  // Image cache for game objects
  const imageCache = useRef<Record<string, HTMLImageElement>>({});

  // Add refs for tracking obstacle generation and game speed
  const lastObstacleFrameRef = useRef<number>(0);
  const occupiedLanesRef = useRef<Set<number>>(new Set());
  const lastSpeedIncreaseScoreRef = useRef<number>(0);

  // Add ref for tracking the last quiz obstacle
  const lastQuizObstacleRef = useRef<GameObject | null>(null);

  // Helper function to add Cloudinary optimizations
  const optimizeCloudinaryUrl = (url: string | undefined | null): string | undefined => {
    if (!url || !url.includes('/upload/')) { // Basic check for Cloudinary URL structure
        return url ?? undefined; // Return undefined if null or empty
    }
    // Check if transformations are already present
    const uploadIndex = url.indexOf('/upload/') + '/upload/'.length;
    const restOfUrl = url.substring(uploadIndex);

    // Basic check to see if common transformations like f_auto or q_auto are already there
    if (restOfUrl.includes('f_auto') || restOfUrl.includes('q_auto')) {
        return url; // Assume already optimized or manually transformed
    }

    let transformationString = 'f_auto,q_auto:good'; // Use 'good' for a balance

    // Check if there's a version component (e.g., /v12345/) immediately after /upload/
    if (/^v\d+\//.test(restOfUrl)) { // Corrected Regex
      // Insert transformation after the version
      const versionEndIndex = restOfUrl.indexOf('/') + 1;
      return url.substring(0, uploadIndex + versionEndIndex) + transformationString + '/' + restOfUrl.substring(versionEndIndex);
    } else {
      // Insert transformation directly after /upload/
      return url.substring(0, uploadIndex) + transformationString + '/' + restOfUrl;
    }
  };

  // Use game configuration if available
  const getInitialSpeed = () => {
    if (gameConfig?.settings?.initialSpeed) {
      return gameConfig.settings.initialSpeed;
    }
    return 4.5; // Default speed
  };

  const getSpeedIncreaseThreshold = () => {
    if (gameConfig?.settings?.speedIncreaseThreshold) {
      return gameConfig.settings.speedIncreaseThreshold;
    }
    return 250; // Default threshold
  };

  const getSpeedIncreasePercentage = () => {
    if (gameConfig?.settings?.speedIncreasePercentage) {
      return gameConfig.settings.speedIncreasePercentage / 100; // Convert percentage to decimal
    }
    return 0.1; // Default 10%
  };

  const getMaxSpeed = () => {
    if (gameConfig?.settings?.maxSpeed) {
      return gameConfig.settings.maxSpeed;
    }
    return 15; // Default max speed
  };

  const getObstacleFrequency = () => {
    if (gameConfig?.settings?.obstacleFrequency) {
      return gameConfig.settings.obstacleFrequency;
    }
    return 0.8; // Reduced from 2.5 to 0.8
  };

  const getCollectibleFrequency = () => {
    if (gameConfig?.settings?.collectibleFrequency) {
      return gameConfig.settings.collectibleFrequency;
    }
    return 0.5; // Reduced from 1.5 to 0.5
  };

  const getQuizFrequency = () => {
    if (gameConfig?.settings?.quizFrequency) {
      return gameConfig.settings.quizFrequency;
    }
    return 0.05; // Reduced from 0.2 to 0.05
  };

  const getMinFramesBetweenObstacles = () => {
    if (gameConfig?.settings?.minFramesBetweenObstacles) {
      return gameConfig.settings.minFramesBetweenObstacles;
    }
    return 120; // Increased from 60 to 120 frames
  };

  const getPowerupFrequency = () => {
    if (gameConfig?.settings?.powerupFrequency) {
      return gameConfig.settings.powerupFrequency;
    }
    return 0.1; // Reduced from 0.5 to 0.1
  };

  // Get lane X position
  const getLaneX = (lane: number) => {
    const canvas = canvasRef.current;
    if (!canvas || canvasWidthRef.current === 0) return 0;
    const laneWidth = canvasWidthRef.current / 3;
    // Return the center X position of the lane
    return lane * laneWidth + laneWidth / 2;
  };

  // Update player's X position based on lane
  const updatePlayerXPosition = () => {
    const player = playerRef.current;
    const canvas = canvasRef.current;
    if (!canvas || canvasWidthRef.current === 0) return;

    const laneWidth = canvasWidthRef.current / 3;

    // Use the current lane from the player object, which is updated from props
    const laneCenterX = player.lane * laneWidth + laneWidth / 2;

    // Position player centered in the lane
    player.x = laneCenterX - player.width / 2;

    console.log(`Player position updated: lane=${player.lane}, x=${player.x}`);
  };

  // Calculate current game speed based on score
  const calculateGameSpeed = (score: number) => {
    const initialSpeed = getInitialSpeed();
    const maxSpeed = getMaxSpeed();
    const threshold = getSpeedIncreaseThreshold();
    const increaseRate = getSpeedIncreasePercentage();

    // Calculate how many times we've crossed the threshold
    const thresholdCrossings = Math.floor(score / threshold);

    // Calculate new speed with percentage increase for each threshold crossing
    let newSpeed =
      initialSpeed * Math.pow(1 + increaseRate, thresholdCrossings);

    // Cap at max speed
    return Math.min(newSpeed, maxSpeed);
  };

  // Initialize game state
  const initializeGame = () => {
    gameObjectsRef.current = [];
    scoreRef.current = 0;
    distanceRef.current = 0;
    frameCounterRef.current = 0;
    occupiedLanesRef.current.clear();

    // Set initial game speed from config
    const initialSpeed = getInitialSpeed();
    console.log("Initializing game speed to:", initialSpeed);
    gameSpeedRef.current = initialSpeed;

    lastSpeedIncreaseScoreRef.current = 0;
    playerRef.current = {
      x: 0,
      y: 0,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      lane: 1,
    };
    updatePlayerXPosition();
    track('Game Initialized', { initialSpeed: initialSpeed });
  };

  // Reset game when status changes to ready
  useEffect(() => {
    if (gameStatus === "ready") {
      initializeGame();
    }
  }, [gameStatus, gameConfig]);

  // Update player lane when currentLane prop changes
  useEffect(() => {
    console.log("Current lane changed to:", currentLane);
    currentLaneRef.current = currentLane;
    playerRef.current.lane = currentLane;

    // Update player position immediately when lane changes
    if (canvasRef.current) {
      updatePlayerXPosition();
    }
  }, [currentLane]);

  // Update gameStatusRef when gameStatus prop changes
  useEffect(() => {
    const previousStatus = gameStatusRef.current;
    gameStatusRef.current = gameStatus;
    console.log("Game status changed to:", gameStatus);

    // Track Game Started event
    if (previousStatus !== 'playing' && gameStatus === "playing") {
      track('Game Started', { 
        brandId: gameConfig?.brand?.id,
        initialSpeed: getInitialSpeed()
      });
    }

    // If game is starting, apply initial speed from game config
    if (gameStatus === "playing") {
      const initialSpeed = getInitialSpeed();
      gameSpeedRef.current = initialSpeed;
    }
  }, [gameStatus, gameConfig]);

  // Set up canvas and game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize canvas to fit container, accounting for device pixel ratio
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();

      // Set the display size (CSS pixels)
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      // Set the actual backing store size (real pixels)
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      // Scale the context to ensure correct drawing operations
      ctx.scale(dpr, dpr);

      // Optionally disable image smoothing for sharper pixel art (if desired)
      // ctx.imageSmoothingEnabled = false;

      // Update internal dimension refs (optional, but good practice if used elsewhere)
      canvasWidthRef.current = rect.width; 
      canvasHeightRef.current = rect.height;

      // Re-initialize player position based on new dimensions
      const player = playerRef.current;
      player.y = rect.height - GROUND_HEIGHT - player.height; // Use CSS height
      updatePlayerXPosition();
    };

    // Initialize the game
    const setupGame = () => {
      const initStartTime = performance.now(); // Start timing init
      canvasRef.current!.focus(); // Ensure canvas can receive keyboard events
      resizeCanvas();

      // Position player at the bottom center of the canvas
      const player = playerRef.current;
      updatePlayerXPosition();

      gameStatusRef.current = gameStatus;
      currentLaneRef.current = currentLane;

      // Track Canvas Initialized
      track('Game Canvas Initialized', {
        brandId: brandId || gameConfig?.brand?.id || 'unknown',
        initTimeMs: performance.now() - initStartTime,
        devicePixelRatio: window.devicePixelRatio || 1,
        canvasWidth: canvasWidthRef.current,
        canvasHeight: canvasHeightRef.current
      });

      // Preload initial assets defined in gameConfig
      const loadInitialAsset = (assetUrl: string | undefined | null, type: string) => {
        const optimizedUrl = optimizeCloudinaryUrl(assetUrl); // Optimize URL here
        if (optimizedUrl) { // Check if URL is valid string before using
          if (!imageCache.current[optimizedUrl]) {
              console.log(`Preloading initial ${type} asset: ${optimizedUrl}`);
              const img = new Image();
              img.onload = () => {
                imageCache.current[optimizedUrl] = img;
                console.log(`${type} asset loaded.`);
              };
              img.onerror = () => console.error(`Failed to load ${type} asset: ${optimizedUrl}`);
              img.src = optimizedUrl; // Use optimized URL
          } else {
              console.log(`${type} asset already cached.`);
          }
        }
      };

      if (gameConfig?.assets) {
        loadInitialAsset(gameConfig.assets.player?.assetUrl, 'player');
        // Note: Obstacles, Collectibles, Powerups are loaded dynamically based on random selection.
        // Preloading specific ones here might not be necessary unless there's a default/fallback.
        // If you have specific default assets for these types, preload them:
        // loadInitialAsset(gameConfig.assets.obstacle?.assetUrl, 'default obstacle');
        // loadInitialAsset(gameConfig.assets.collectible?.assetUrl, 'default collectible');
        // loadInitialAsset(gameConfig.assets.powerup?.assetUrl, 'default powerup');
        loadInitialAsset(gameConfig.assets.background?.assetUrl, 'background');
      }
    };

    // Main render function
    const render = () => {
      if (!canvas || !ctx) return;

      // Helper function to trigger multiple haptics with delay
      const triggerMultipleHaptics = (count: number, type: 'impact' | 'notification', style: string, delay: number) => {
        if (count <= 0) return;
        sendHapticFeedback({ hapticsType: type, style: style as any }); // Using 'as any' due to type complexity, ensure valid style is passed
        setTimeout(() => triggerMultipleHaptics(count - 1, type, style, delay), delay);
      };

      // Clear canvas using CSS dimensions because context is scaled
      ctx.clearRect(0, 0, canvasWidthRef.current, canvasHeightRef.current);

      // Draw background and lanes using CSS dimensions
      drawLanes(ctx, canvasWidthRef.current, canvasHeightRef.current);

      // Only update game logic if game is playing
      if (gameStatusRef.current === "playing") {
        // Increment frame counter
        frameCounterRef.current++;

        // Update distance every 10 frames
        if (frameCounterRef.current % 10 === 0) {
          distanceRef.current += 1;
        }

        // Update score and distance in parent component every 100ms
        const now = performance.now();
        if (now - lastUpdateRef.current > 100) {
          onScoreUpdate(scoreRef.current);
          onDistanceUpdate(Math.floor(distanceRef.current));
          lastUpdateRef.current = now;
        }

        // Calculate current game speed based on score
        const currentGameSpeed = calculateGameSpeed(scoreRef.current);

        // Clean up occupied lanes for obstacles that have moved past the player
        occupiedLanesRef.current.clear();
        gameObjectsRef.current.forEach((obj) => {
          // Only consider obstacles that are still ahead of the player
          if (obj.type === "obstacle" && obj.y < playerRef.current.y) {
            occupiedLanesRef.current.add(obj.lane);
          }
        });

        // Check if we have too many objects on screen already
        const currentObjectCount = gameObjectsRef.current.length;
        const canGenerateNewObjects = currentObjectCount < MAX_GAME_OBJECTS;

        // Generate obstacles with improved logic
        if (
          canGenerateNewObjects &&
          Math.random() < getObstacleFrequency() &&
          frameCounterRef.current - lastObstacleFrameRef.current >
            getMinFramesBetweenObstacles()
        ) {
          // Minimum frames between obstacles

          // Get available lanes (not all lanes should be blocked)
          const availableLanes = [0, 1, 2].filter(
            (lane) => !occupiedLanesRef.current.has(lane)
          );

          // Only generate an obstacle if there's at least one lane available
          // This ensures the player always has a path
          if (availableLanes.length > 0) {
            // Choose a random lane from available lanes
            const lane =
              availableLanes[Math.floor(Math.random() * availableLanes.length)];

            // Use obstacle assets from game config if available
            let obstacleImageUrl: string | undefined;
            let obstacleWidth = OBSTACLE_WIDTH;
            let obstacleHeight = OBSTACLE_HEIGHT;

            if (
              gameConfig?.obstacles?.assets &&
              gameConfig.obstacles.assets.length > 0
            ) {
              const randomObstacle =
                gameConfig.obstacles.assets[
                  Math.floor(Math.random() * gameConfig.obstacles.assets.length)
                ];
              obstacleImageUrl = randomObstacle.assetUrl; // Get original URL
              obstacleWidth = randomObstacle.width || OBSTACLE_WIDTH;
              obstacleHeight = randomObstacle.height || OBSTACLE_HEIGHT;

              // Optimize and Preload image
              const optimizedObstacleUrl = optimizeCloudinaryUrl(obstacleImageUrl);
              if (optimizedObstacleUrl) { // Check if URL is valid after optimization
                if (!imageCache.current[optimizedObstacleUrl]) {
                  const img = new Image();
                  img.src = optimizedObstacleUrl; // Use optimized URL
                  imageCache.current[optimizedObstacleUrl] = img;
                }
                // Always assign the optimized URL if valid
                obstacleImageUrl = optimizedObstacleUrl;
              } else {
                // If optimization fails or URL is invalid, keep the original (or undefined)
                obstacleImageUrl = undefined;
              }
            }

            // Add the obstacle
            gameObjectsRef.current.push({
              x: getLaneX(lane) - obstacleWidth / 2,
              y: -obstacleHeight * 2, // Start above the screen
              width: obstacleWidth,
              height: obstacleHeight,
              lane,
              type: "obstacle",
              imageUrl: obstacleImageUrl,
              createdAt: frameCounterRef.current,
            });

            // Update the last obstacle frame
            lastObstacleFrameRef.current = frameCounterRef.current;

            // Add this lane to occupied lanes
            occupiedLanesRef.current.add(lane);
          }
        }

        // Generate collectibles
        if (
          canGenerateNewObjects &&
          Math.random() < getCollectibleFrequency()
        ) {
          // Avoid placing collectibles in lanes with obstacles
          const availableLanes = [0, 1, 2].filter(
            (lane) => !occupiedLanesRef.current.has(lane)
          );

          if (availableLanes.length > 0) {
            const lane =
              availableLanes[Math.floor(Math.random() * availableLanes.length)];

            // Use collectible assets from game config if available
            let collectibleImageUrl: string | undefined;
            let collectibleWidth = COLLECTIBLE_SIZE;
            let collectibleHeight = COLLECTIBLE_SIZE;
            let collectibleValue = 10;

            if (
              gameConfig?.collectibles?.assets &&
              gameConfig.collectibles.assets.length > 0
            ) {
              const randomCollectible =
                gameConfig.collectibles.assets[
                  Math.floor(
                    Math.random() * gameConfig.collectibles.assets.length
                  )
                ];
              collectibleImageUrl = randomCollectible.assetUrl; // Get original URL
              collectibleWidth = randomCollectible.width || COLLECTIBLE_SIZE;
              collectibleHeight = randomCollectible.height || COLLECTIBLE_SIZE;
              collectibleValue = randomCollectible.points || 10;

              // Optimize and Preload image
              const optimizedCollectibleUrl = optimizeCloudinaryUrl(collectibleImageUrl);
              if (optimizedCollectibleUrl) { // Check if URL is valid after optimization
                if (!imageCache.current[optimizedCollectibleUrl]) {
                    const img = new Image();
                    img.src = optimizedCollectibleUrl; // Use optimized URL
                    imageCache.current[optimizedCollectibleUrl] = img;
                }
                // Always assign the optimized URL if valid
                collectibleImageUrl = optimizedCollectibleUrl;
              } else {
                 // If optimization fails or URL is invalid, keep the original (or undefined)
                 collectibleImageUrl = undefined;
              }
            }

            gameObjectsRef.current.push({
              x: getLaneX(lane) - collectibleWidth / 2,
              y: -collectibleHeight * 2, // Start above the screen
              width: collectibleWidth,
              height: collectibleHeight,
              lane,
              type: "collectible",
              value: collectibleValue,
              imageUrl: collectibleImageUrl,
              createdAt: frameCounterRef.current,
            });
          }
        }

        // Generate quiz items
        if (canGenerateNewObjects && Math.random() < getQuizFrequency()) {
          // Avoid placing quiz items in lanes with obstacles
          const availableLanes = [0, 1, 2].filter(
            (lane) => !occupiedLanesRef.current.has(lane)
          );

          if (availableLanes.length > 0) {
            const lane =
              availableLanes[Math.floor(Math.random() * availableLanes.length)];

            gameObjectsRef.current.push({
              x: getLaneX(lane) - COLLECTIBLE_SIZE / 2,
              y: -COLLECTIBLE_SIZE * 2, // Start above the screen
              width: COLLECTIBLE_SIZE,
              height: COLLECTIBLE_SIZE,
              lane,
              type: "quiz",
              quizId: "random", // We'll use this to indicate we want a random quiz
              createdAt: frameCounterRef.current,
            });
          }
        }

        // Generate powerups
        if (canGenerateNewObjects && Math.random() < getPowerupFrequency()) {
          // Avoid placing powerups in lanes with obstacles
          const availableLanes = [0, 1, 2].filter(
            (lane) => !occupiedLanesRef.current.has(lane)
          );

          if (availableLanes.length > 0) {
            const lane =
              availableLanes[Math.floor(Math.random() * availableLanes.length)];

            // Use powerup assets from game config if available
            let powerupImageUrl: string | undefined;
            let powerupWidth = COLLECTIBLE_SIZE;
            let powerupHeight = COLLECTIBLE_SIZE;

            if (
              gameConfig?.powerups?.assets &&
              gameConfig.powerups.assets.length > 0
            ) {
              const randomPowerup =
                gameConfig.powerups.assets[
                  Math.floor(Math.random() * gameConfig.powerups.assets.length)
                ];
              powerupImageUrl = randomPowerup.assetUrl; // Get original URL
              powerupWidth = randomPowerup.width || COLLECTIBLE_SIZE;
              powerupHeight = randomPowerup.height || COLLECTIBLE_SIZE;

              // Optimize and Preload image
              const optimizedPowerupUrl = optimizeCloudinaryUrl(powerupImageUrl);
              if (optimizedPowerupUrl) { // Check if URL is valid after optimization
                if (!imageCache.current[optimizedPowerupUrl]) {
                  const img = new Image();
                  img.src = optimizedPowerupUrl; // Use optimized URL
                  imageCache.current[optimizedPowerupUrl] = img;
                }
                 // Always assign the optimized URL if valid
                 powerupImageUrl = optimizedPowerupUrl;
              } else {
                 // If optimization fails or URL is invalid, keep the original (or undefined)
                 powerupImageUrl = undefined;
              }
            }

            gameObjectsRef.current.push({
              x: getLaneX(lane) - powerupWidth / 2,
              y: -powerupHeight * 2, // Start above the screen
              width: powerupWidth,
              height: powerupHeight,
              lane,
              type: "powerup",
              imageUrl: powerupImageUrl,
              createdAt: frameCounterRef.current,
            });
          }
        }

        // Update game objects with collision detection
        gameObjectsRef.current = gameObjectsRef.current.filter((obj) => {
          // Move object down
          obj.y += currentGameSpeed;

          // Check collision with player
          if (checkCollision(playerRef.current, obj)) {
            if (obj.type === "obstacle") {
              gameStatusRef.current = "ended";
              triggerMultipleHaptics(10, 'impact', 'heavy', 20); // Trigger 10 times with 20ms delay
              track('Game Over', { 
                score: scoreRef.current,
                distance: Math.floor(distanceRef.current),
                reason: 'Obstacle Collision',
                brandId: gameConfig?.brand?.id
              });
              onGameOver(scoreRef.current, Math.floor(distanceRef.current));
              createGameOverParticles(playerRef.current.x, playerRef.current.y);
            } else if (obj.type === "collectible") {
              scoreRef.current += obj.value || 0;
              sendHapticFeedback({ hapticsType: 'impact', style: 'light' }); // Haptic feedback for collecting item
              track('Collected Item', { type: 'collectible', value: obj.value || 0 });
              createCollectibleParticles(obj.x, obj.y);
            } else if (obj.type === "quiz") {
              lastQuizObstacleRef.current = obj;
              sendHapticFeedback({ hapticsType: 'notification', style: 'success' }); // Haptic feedback for triggering quiz
              if (onQuizTrigger) {
                track('Triggered Quiz', { quizId: obj.quizId || 'random' });
                onQuizTrigger(obj.quizId || "random");
              }
            } else if (obj.type === "powerup") {
              sendHapticFeedback({ hapticsType: 'notification', style: 'success' }); // Haptic feedback for collecting powerup
              track('Collected Item', { type: 'powerup' });
              createPowerupParticles(obj.x, obj.y);
            }

            // Remove object from game
            return false;
          }

          // Remove object if it's off-screen (use CSS height)
          return obj.y < canvasHeightRef.current;
        });
      }

      // Draw player
      drawPlayer(ctx, playerRef.current);

      // Draw game objects
      gameObjectsRef.current.forEach((obj) => {
        if (obj.type === "obstacle") {
          drawObstacle(ctx, obj);
        } else if (obj.type === "collectible") {
          drawCollectible(ctx, obj, "collectible");
        } else if (obj.type === "quiz") {
          drawCollectible(ctx, obj, "quiz");
        } else if (obj.type === "powerup") {
          drawPowerup(ctx, obj);
        }
      });

      // Update and draw particles with error handling
      try {
        updateParticles(ctx);
      } catch (error) {
        console.error("Error updating particles:", error);
        // Clear particles if there's an error to prevent future errors
        particlesRef.current = [];
      }

      // Move obstacles out of lane when game state changes back to playing from paused
      // This assumes a quiz was just answered and we need to avoid immediate collision
      if (gameStatus === "playing" && lastQuizObstacleRef.current) {
        // Move the last obstacle that triggered the quiz out of the current lane
        const obstacle = lastQuizObstacleRef.current;
        if (obstacle && gameObjectsRef.current.includes(obstacle)) {
          // Move the obstacle to a different lane
          obstacle.lane = (obstacle.lane + 1) % 3; // Cycle through lanes (0,1,2)
          // Update obstacle x position based on new lane
          obstacle.x = getLaneX(obstacle.lane);
        }
        lastQuizObstacleRef.current = null; // Reset after handling
      }

      // Continue animation loop
      requestRef.current = requestAnimationFrame(render);
    };

    // Initialize and start the game loop
    setupGame();
    render();

    // Add event listener for window resize
    window.addEventListener("resize", resizeCanvas);

    // Clean up
    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [
    gameStatus,
    currentLane,
    onGameOver,
    onScoreUpdate,
    onDistanceUpdate,
    onQuizTrigger,
    gameConfig,
    brandId
  ]);

  // Check collision between player and game object
  const checkCollision = (player: Player, obj: GameObject) => {
    // Simple box collision detection with a smaller hitbox for better gameplay
    const playerHitboxMargin = 5; // Make player hitbox slightly smaller for better gameplay
    const objHitboxMargin = 5; // Make object hitbox slightly smaller for better gameplay

    // Create adjusted hitboxes
    const playerHitbox = {
      x: player.x + playerHitboxMargin,
      y: player.y + playerHitboxMargin,
      width: player.width - playerHitboxMargin * 2,
      height: player.height - playerHitboxMargin * 2,
    };

    const objHitbox = {
      x: obj.x + objHitboxMargin,
      y: obj.y + objHitboxMargin,
      width: obj.width - objHitboxMargin * 2,
      height: obj.height - objHitboxMargin * 2,
    };

    // Check if player and object are in the same lane and overlapping
    const collision =
      player.lane === obj.lane &&
      playerHitbox.x < objHitbox.x + objHitbox.width &&
      playerHitbox.x + playerHitbox.width > objHitbox.x &&
      playerHitbox.y < objHitbox.y + objHitbox.height &&
      playerHitbox.y + playerHitbox.height > objHitbox.y;

    // Debug visualization for collisions (uncomment for debugging)
    /*
    if (collision) {
      console.log(`Collision detected with ${obj.type} at lane ${obj.lane}`);
      console.log(`Player: x=${player.x}, y=${player.y}, w=${player.width}, h=${player.height}`);
      console.log(`Object: x=${obj.x}, y=${obj.y}, w=${obj.width}, h=${obj.height}`);
    }
    */

    return collision;
  };

  // Draw lanes with background image if available
  const drawLanes = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    ctx.save();

    // Draw background
    const backgroundImage = backgroundImageRef.current;
    if (backgroundImage && gameConfig?.assets?.background) {
      // Draw the background image using CSS dimensions
      ctx.drawImage(backgroundImage, 0, 0, width, height);
    } else {
      // Fallback to default background using CSS dimensions
      ctx.fillStyle = "#f8f9fa";
      ctx.fillRect(0, 0, width, height);
    }

    // Draw lane dividers based on CSS width
    const laneWidth = width / 3;

    ctx.strokeStyle = gameConfig?.brand?.secondaryColor || "#2980b9";
    ctx.lineWidth = 2;

    // Left lane divider
    ctx.beginPath();
    ctx.moveTo(laneWidth, 0);
    ctx.lineTo(laneWidth, height);
    ctx.stroke();

    // Right lane divider
    ctx.beginPath();
    ctx.moveTo(laneWidth * 2, 0);
    ctx.lineTo(laneWidth * 2, height);
    ctx.stroke();

    ctx.restore();
  };

  // Draw player
  const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player) => {
    ctx.save();

    // Use player image from game config if available
    const playerImage = playerImageRef.current;
    const playerAsset = gameConfig?.assets?.player;

    if (playerImage && playerAsset) {
      const width = playerAsset.width || 30;
      const height = playerAsset.height || 50;

      ctx.drawImage(
        playerImage,
        player.x,
        player.y,
        width,
        height
      );
    } else {
      // Fallback to default player rendering
      ctx.fillStyle = gameConfig?.brand?.primaryColor || "#3498db";
      ctx.beginPath();
      ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // Draw obstacle
  const drawObstacle = (ctx: CanvasRenderingContext2D, obj: GameObject) => {
    ctx.save();

    // Use obstacle image from game config if available
    const obstacleImage = obstacleImageRef.current;
    const obstacleAsset = gameConfig?.assets?.obstacle;

    if (obstacleImage && obstacleAsset && obj.type === "obstacle") {
      const width = obstacleAsset.width || 30;
      const height = obstacleAsset.height || 50;

      ctx.drawImage(
        obstacleImage,
        obj.x,
        obj.y,
        width,
        height
      );
    } else {
      // Fallback to default obstacle rendering
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(obj.x - 15, obj.y - 15, 30, 30);
    }

    ctx.restore();
  };

  // Draw collectible or quiz item
  const drawCollectible = (
    ctx: CanvasRenderingContext2D,
    obj: GameObject,
    type: "collectible" | "quiz"
  ) => {
    ctx.save();

    if (type === "collectible") {
      // Use collectible image from game config if available
      const collectibleImage = collectibleImageRef.current;
      const collectibleAsset = gameConfig?.assets?.collectible;

      if (collectibleImage && collectibleAsset) {
        const width = collectibleAsset.width || 30;
        const height = collectibleAsset.height || 50;

        ctx.drawImage(
          collectibleImage,
          obj.x,
          obj.y,
          width,
          height
        );
      } else {
        // Fallback to default collectible rendering
        ctx.fillStyle = "#f1c40f";
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === "quiz") {
      // Quiz item rendering
      ctx.fillStyle = "#9b59b6";
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, 12, 0, Math.PI * 2);
      ctx.fill();

      // Question mark
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", obj.x, obj.y);
    }

    ctx.restore();
  };

  // Add a function to draw powerups
  const drawPowerup = (ctx: CanvasRenderingContext2D, obj: GameObject) => {
    ctx.save();

    // Use powerup image from game config if available
    const powerupImage = powerupImageRef.current;
    const powerupAsset = gameConfig?.assets?.powerup;

    if (powerupImage && powerupAsset) {
      const width = powerupAsset.width || 30;
      const height = powerupAsset.height || 50;

      ctx.drawImage(
        powerupImage,
        obj.x,
        obj.y,
        width,
        height
      );
    } else {
      // Fallback to default powerup rendering
      ctx.fillStyle = "#2ecc71";
      ctx.beginPath();
      ctx.moveTo(obj.x, obj.y - 15);
      ctx.lineTo(obj.x + 15, obj.y + 15);
      ctx.lineTo(obj.x - 15, obj.y + 15);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  };

  // Create particles for collectible effect
  const createCollectibleParticles = (x: number, y: number) => {
    const particleCount = 15;
    const colors = ["#F1C40F", "#F39C12", "#FFD700", "#FFA500"];

    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push({
        x,
        y,
        size: Math.max(2, Math.random() * 5 + 2), // Ensure minimum size of 2
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 5,
        speedY: (Math.random() - 0.5) * 5,
        life: 1,
        maxLife: 1,
      });
    }
  };

  // Create particles for powerup effect
  const createPowerupParticles = (x: number, y: number) => {
    const particleCount = 20;
    const colors = ["#3498DB", "#2980B9", "#00BFFF", "#1E90FF"];

    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push({
        x,
        y,
        size: Math.max(3, Math.random() * 6 + 3), // Ensure minimum size of 3
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 6,
        speedY: (Math.random() - 0.5) * 6,
        life: 1,
        maxLife: 1,
      });
    }
  };

  // Create particles for game over effect
  const createGameOverParticles = (x: number, y: number) => {
    const particleCount = 30;
    const colors = ["#E74C3C", "#C0392B", "#FF5733", "#FF0000"];

    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push({
        x,
        y,
        size: Math.max(4, Math.random() * 8 + 4), // Ensure minimum size of 4
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 8,
        speedY: (Math.random() - 0.5) * 8,
        life: 1,
        maxLife: 1,
      });
    }
  };

  // Update and draw particles
  const updateParticles = (ctx: CanvasRenderingContext2D) => {
    particlesRef.current = particlesRef.current.filter((particle) => {
      // Update particle position
      particle.x += particle.speedX;
      particle.y += particle.speedY;

      // Decrease life
      particle.life -= 0.02;

      // Calculate particle size, ensuring it's never negative
      const particleSize = Math.max(0.1, particle.size * particle.life);

      // Draw particle
      ctx.globalAlpha = particle.life;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(
        particle.x,
        particle.y,
        particleSize, // Use the calculated size that's guaranteed to be positive
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.globalAlpha = 1;

      // Keep particle if still alive
      return particle.life > 0;
    });
  };

  // Load images when game config changes
  useEffect(() => {
    if (gameConfig) {
      // Load player image
      if (gameConfig.assets?.player?.assetUrl) {
        const img = new Image();
        img.src = gameConfig.assets.player.assetUrl;
        img.onload = () => {
          playerImageRef.current = img;
        };
      }

      // Load obstacle image
      if (gameConfig.assets?.obstacle?.assetUrl) {
        const img = new Image();
        img.src = gameConfig.assets.obstacle.assetUrl;
        img.onload = () => {
          obstacleImageRef.current = img;
        };
      }

      // Load collectible image
      if (gameConfig.assets?.collectible?.assetUrl) {
        const img = new Image();
        img.src = gameConfig.assets.collectible.assetUrl;
        img.onload = () => {
          collectibleImageRef.current = img;
        };
      }

      // Load powerup image
      if (gameConfig.assets?.powerup?.assetUrl) {
        const img = new Image();
        img.src = gameConfig.assets.powerup.assetUrl;
        img.onload = () => {
          powerupImageRef.current = img;
        };
      }

      // Load background image
      if (gameConfig.assets?.background?.assetUrl) {
        const img = new Image();
        img.src = gameConfig.assets.background.assetUrl;
        img.onload = () => {
          backgroundImageRef.current = img;
        };
      }
    }
  }, [gameConfig]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ touchAction: "none" }}
    />
  );
}
