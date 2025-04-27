"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Pause, Flame, CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { GameCanvas } from "./game-canvas";
import { QuizModal, QuizQuestion } from "@/components/quiz/quiz-modal";
import {
  getRandomQuizAction,
  getQuizzesByBrandAction,
} from "@/lib/quiz-actions";
import { GameStatus } from "@/types/game";
import {
  calculateXP,
  calculateRoluTokens,
  generateGameSummary,
} from "@/lib/game-rewards";
import { useAuth } from "@/contexts/auth-provider";
import { LoginButton } from "@/components/auth/login-button";
import { Button } from "@/components/ui/button";
import { useGame, GameSubmitResponse } from "@/contexts/game-context";
import ImageUploadInput from "@/components/quiz/ImageUploadInput";
import { Card } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { QuestionType } from "@prisma/client";
import { useLayoutStore } from "@/lib/store/layout";
import { useAmplitude } from "@/contexts/amplitude-provider";
import Script from "next/script";

interface GameContainerProps {
  brandId: string;
  onExit: () => void;
  onGameStatusChange?: (status: GameStatus) => void;
}

export function GameContainer({
  brandId,
  onExit,
  onGameStatusChange,
}: GameContainerProps) {
  const { t, i18n } = useTranslation();
  const { track } = useAmplitude();
  const [gameStatus, setGameStatus] = useState<GameStatus>("ready");
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [currentLane, setCurrentLane] = useState(1);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion | null>(null);
  const [gameConfig, setGameConfig] = useState<any>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Track quiz performance (attempts and overall correct for session stats)
  const [quizStats, setQuizStats] = useState({
    total: 0, // Total attempts in this session
    correct: 0, // Correct attempts in this session
  });
  // Track rewards
  const [xpEarned, setXpEarned] = useState(0);
  const [roluTokens, setRoluTokens] = useState(0);
  const [bonusRoluEarned, setBonusRoluEarned] = useState(0);
  const [quizResponses, setQuizResponses] = useState<
    Array<{
      questionId: string;
      optionId: string;
      isCorrect: boolean;
    }>
  >([]);
  const { user, updateUserStats } = useAuth();
  const [isSubmittingImage, setIsSubmittingImage] = useState(false);
  const [imageSubmitError, setImageSubmitError] = useState<string | null>(null);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    isCorrect: boolean;
    message: string;
    roluAwarded?: number;
  } | null>(null);

  // Add refs for touch controls
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);

  const router = useRouter();

  // --- Track game timing ---
  const [gameStartTime, setGameStartTime] = useState<number | null>(null); // Track game start time
  const [submissionStartTime, setSubmissionStartTime] = useState<number | null>(null); // Track image submission start
  const [countdownValue, setCountdownValue] = useState<number | null>(null); // Track countdown state

  // --- NEW/REFINED STATE FOR QUIZ FLOW ---
  // Stores all questions for the current brand/language
  const [allQuizQuestions, setAllQuizQuestions] = useState<QuizQuestion[]>([]);
  // Tracks IDs of questions answered correctly at least once
  const [correctlyAnsweredIds, setCorrectlyAnsweredIds] = useState<Set<string>>(new Set());
  // Tracks the index for the main sequence progression
  const [mainSequenceIndex, setMainSequenceIndex] = useState<number>(0);
  // Stores incorrectly answered questions to be re-asked
  const [incorrectQueue, setIncorrectQueue] = useState<Array<{ id: string; reaskAtCount: number }>>([]);
  // Counts total questions shown (main sequence + repeats)
  const [questionsShownCount, setQuestionsShownCount] = useState<number>(0);
  // --- END NEW/REFINED STATE ---

  // Get the setter from the Zustand store
  const setIsGameplayActive = useLayoutStore(
    (state) => state.setIsGameplayActive
  );

  // Ref to track correct answers reliably for the current session's reward calculation
  const correctAnswersSessionRef = useRef<number>(0);

  // Get game context to access daily Rolu limit status AND the response
  const {
    fetchDailyRoluStatus,
    submitGameResults,
    gameSubmitResponse,
  } = useGame();

  const [isSubmittingResults, setIsSubmittingResults] = useState(false); // <-- Add loading state
  const [submissionError, setSubmissionError] = useState<string | null>(null); // <-- Add error state for submission

  // Create a safe wrapper for onExit to prevent navigation issues
  const handleExit = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Track Exit Game action
    track("Action Selected", {
      source: "game_end_screen",
      action: "exitGame",
      brandId: brandId,
    });

    // Use direct DOM navigation as a fallback if problems continue
    if (typeof window !== "undefined") {
      onExit();
    }
  };

  const fetchGameConfig = async () => {
    setIsLoading(true);
    setConfigError(null);
    const loadStartTime = performance.now(); // Start timing

    try {
      const userLanguage = i18n.language || "en";
      const response = await fetch(
        `/api/game/config/${brandId}?lang=${userLanguage}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("game.loading"));
      }

      const data = await response.json();
      setGameConfig(data.config);
      // Initialize all questions first
      setAllQuizQuestions(data.config.quizzes || []);

      // --- Fetch User's Quiz Progress ---
      let initialCorrectIds = new Set<string>();
      if (user?.id) { // Only fetch if user is logged in
        try {
            console.log(`Fetching quiz progress for user ${user.id}, brand ${brandId}`);
            const progressResponse = await fetch(`/api/user/quiz-progress?brandId=${brandId}`);
            if (progressResponse.ok) {
                const progressData = await progressResponse.json();
                if (progressData.success && Array.isArray(progressData.data)) {
                    initialCorrectIds = new Set(progressData.data);
                    console.log(`Loaded ${initialCorrectIds.size} previously correct question IDs for user ${user.id} and brand ${brandId}.`);
                } else {
                     console.warn("Quiz progress fetch succeeded but data was not as expected:", progressData);
                }
            } else {
                 console.error(`Failed to fetch user quiz progress (${progressResponse.status}):`, progressResponse.statusText);
            }
        } catch (progressError) {
            console.error("Error fetching user quiz progress:", progressError);
            // Proceed without persisted progress if fetch fails
        }
      }
      // Initialize quiz state using fetched progress
      setCorrectlyAnsweredIds(initialCorrectIds);


      // Reset SESSION-specific state (keep fetched correct IDs)
      correctAnswersSessionRef.current = 0;
      setQuizStats({ total: 0, correct: 0 }); // Reset attempt stats for THIS session
      setIncorrectQueue([]);
      setMainSequenceIndex(0);
      setQuestionsShownCount(0);


      // Set initial game status to ready once config is loaded - CHANGED: Start countdown instead
      // setGameStatus("ready");
      setCountdownValue(3); // Start countdown from 3
      setGameStatus("countdown"); // Set new status for countdown phase
      if (onGameStatusChange) {
        // onGameStatusChange("ready");
        onGameStatusChange("countdown");
      }
      track("Countdown Started", { brandId }); // Track countdown start

      // If we have quizzes in the config, store them for sequential access
      if (data.config.quizzes && data.config.quizzes.length > 0) {
        setAllQuizQuestions(data.config.quizzes);
      } else {
        // Fetch all quizzes if they're not in the config
        // Note: This fetch might be redundant if the API already includes them based on lang
        // Consider optimizing this if quizzes are always in the config response.
        try {
          const quizzesResponse = await fetch(
            `/api/quizzes?brandId=${brandId}&language=${userLanguage}`
          );
          const quizzesData = await quizzesResponse.json();
          if (quizzesData.data && Array.isArray(quizzesData.data)) {
            setAllQuizQuestions(quizzesData.data);
          }
        } catch (error) {
          console.error("Error fetching all quizzes:", error);
        }
      }
      // Reset quiz flow state ONLY when config loads successfully
      setQuizResponses([]); // Clear responses for the new session

      // --- Reset ONLY SESSION-SPECIFIC quiz state ---
      // !! DO NOT reset setCorrectlyAnsweredIds here !!
      setIncorrectQueue([]);         // Clear incorrect queue for the new session
      setMainSequenceIndex(0);        // Start from the beginning of the sequence
      setQuestionsShownCount(0);      // Reset shown count for the new session
      correctAnswersSessionRef.current = 0; // Reset correct answers *for this session's rewards*
      setQuizStats({ total: 0, correct: 0 }); // Reset attempt stats *for this session*


      // Track Game Config Loaded
      track('Game Config Loaded', {
        brandId: brandId,
        loadTimeMs: performance.now() - loadStartTime,
        language: userLanguage,
        quizCount: data.config.quizzes?.length || allQuizQuestions.length,
        success: true
      });

    } catch (error) {
      console.error("Error fetching game config:", error);
      setConfigError(
        error instanceof Error ? error.message : t("game.loading")
      );
      setGameStatus("error");
      if (onGameStatusChange) {
        onGameStatusChange("error");
      }

      // Track failed Game Config Load
      track('Game Config Loaded', {
        brandId: brandId,
        loadTimeMs: performance.now() - loadStartTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });

    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGameConfig();
    // Refresh daily Rolu status when component mounts
    if (user) {
      fetchDailyRoluStatus(user.id);
    }
  }, [brandId, user]);

  // Notify parent component when game status changes
  useEffect(() => {
    if (onGameStatusChange) {
      onGameStatusChange(gameStatus);
    }
  }, [gameStatus, onGameStatusChange]);

  // Add countdown timer effect
  useEffect(() => {
    if (gameStatus === "countdown" && countdownValue !== null) {
      if (countdownValue === 1) {
        // If countdown is 1, set a timer to immediately start the game after 1s (when '1' disappears)
        const timer = setTimeout(() => {
          setGameStatus("playing");
          setCountdownValue(null); // Clear countdown value
          setGameStartTime(Date.now()); // Record game start time
          if (onGameStatusChange) {
            onGameStatusChange("playing");
          }
          track('Countdown Completed', { brandId });
          track('Game Started', {
            brandId,
            entryPoint: 'direct',
          });
        }, 1000); // Start game exactly when '1' would disappear
        return () => clearTimeout(timer);
      } else if (countdownValue > 1) {
        // If countdown is greater than 1, set a timer to decrement after 1s
        const timer = setTimeout(() => {
          setCountdownValue(countdownValue - 1);
        }, 1000); // 1 second delay between numbers
        return () => clearTimeout(timer);
      }
      // If countdownValue is 0 or less, do nothing (shouldn't happen with this logic)
    }
  }, [gameStatus, countdownValue, onGameStatusChange, brandId]); // Added brandId dependency

  // Effect to update layout state based on game status
  useEffect(() => {
    if (gameStatus === "playing" || gameStatus === "countdown") {
      setIsGameplayActive(true);
    } else {
      // Covers 'paused', 'ended', 'error', 'ready', 'loading'
      setIsGameplayActive(false);
    }
  }, [gameStatus, setIsGameplayActive]);

  // Effect to reset layout state on component unmount
  useEffect(() => {
    // Cleanup function to reset the layout state
    return () => {
      setIsGameplayActive(false);
      // Track game abandonment if game was playing
      if (gameStatus === "playing" && gameStartTime) {
        track("Game Abandoned", {
          playDurationMs: Date.now() - gameStartTime,
          currentScore: score,
          distance: distance,
          brandId: brandId,
        });
      }
    };
  }, [setIsGameplayActive]); // Dependency ensures stable reference

  // Add touch event handlers for swipe controls
  useEffect(() => {
    const gameContainer = gameContainerRef.current;
    if (!gameContainer) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (gameStatus !== "playing" || showQuiz) return;
      touchStartXRef.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (
        gameStatus !== "playing" ||
        showQuiz ||
        touchStartXRef.current === null
      )
        return;

      const touchEndX = e.changedTouches[0].clientX;
      const diffX = touchEndX - touchStartXRef.current;

      // Minimum swipe distance (in pixels)
      const minSwipeDistance = 50;

      if (Math.abs(diffX) > minSwipeDistance) {
        if (diffX > 0) {
          // Swipe right
          const newLane = Math.min(2, currentLane + 1);
          if (newLane !== currentLane) {
            handleLaneChange(newLane);
          }
        } else {
          // Swipe left
          const newLane = Math.max(0, currentLane - 1);
          if (newLane !== currentLane) {
            handleLaneChange(newLane);
          }
        }
      }

      touchStartXRef.current = null;
    };

    gameContainer.addEventListener("touchstart", handleTouchStart);
    gameContainer.addEventListener("touchend", handleTouchEnd);

    return () => {
      gameContainer.removeEventListener("touchstart", handleTouchStart);
      gameContainer.removeEventListener("touchend", handleTouchEnd);
    };
  }, [gameStatus, currentLane, showQuiz]);

  // Add keyboard event handling for arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard events when the game is playing
      if (gameStatus !== "playing" || showQuiz) return;

      console.log("Key pressed:", e.key); // Debug log

      if (e.key === "ArrowLeft") {
        console.log("Moving left from lane", currentLane);
        const newLane = Math.max(0, currentLane - 1);
        if (newLane !== currentLane) {
          handleLaneChange(newLane);
        }
      } else if (e.key === "ArrowRight") {
        console.log("Moving right from lane", currentLane);
        const newLane = Math.min(2, currentLane + 1);
        if (newLane !== currentLane) {
          handleLaneChange(newLane);
        }
      } else if (e.key === "Escape" || e.key === "p" || e.key === "P") {
        handlePauseGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gameStatus, currentLane, showQuiz]);

  const handlePauseGame = () => {
    setGameStatus("paused");
  };

  const handleResumeGame = () => {
    setGameStatus("playing");
  };

  const handleGameOver = async (finalScore: number, finalDistance: number) => {
    track("Game Ended", {
      score: finalScore,
      distance: finalDistance,
      brandId: brandId,
      playDurationMs: gameStartTime ? Date.now() - gameStartTime : 0,
      totalQuizzes: quizStats.total,
      correctQuizzes: correctAnswersSessionRef.current,
      reason: "obstacle_collision",
    });

    setScore(finalScore);
    setDistance(finalDistance);
    setGameStatus("ended"); // Set state to ended first
    if (onGameStatusChange) {
      onGameStatusChange("ended");
    }
    setIsSubmittingResults(true); // <-- Start loading state
    setSubmissionError(null); // <-- Clear previous errors

    // Calculate rewards locally *initially* (can be used as fallback or estimate if needed)
    const finalXP = calculateXP(finalDistance);
    const finalRoluTokensEstimate = calculateRoluTokens( // Rename to estimate
      finalScore,
      correctAnswersSessionRef.current,
      gameConfig?.roluPerCorrectAnswer
    );

    setXpEarned(finalXP);
    setRoluTokens(finalRoluTokensEstimate); // Store the estimate

    // Update quiz stats based on reliable ref
    setQuizStats({
      total: quizResponses.length,
      correct: correctAnswersSessionRef.current,
    });

    // Clear previous submission response from context if needed (optional, context might handle this)
    // clearGameSubmitResponse?.(); // Assuming a function like this exists in context

    // If user is logged in, submit game results to update the database
    if (user?.id) {
      try {
        // Construct the data object to potentially pass to the context function
        const submissionData = {
            score: finalScore,
            distance: finalDistance,
            // Send quiz stats directly as backend expects this format
            quizStats: {
                total: quizResponses.length,
                correct: correctAnswersSessionRef.current,
                accuracy: quizResponses.length > 0 ? (correctAnswersSessionRef.current / quizResponses.length) * 100 : 0
            },
            // Map the state array to match the QuizResult[] type expected by the context function
            quizResponses: quizResponses.map(response => ({
                questionId: response.questionId,
                optionId: response.optionId,
                correct: response.isCorrect // Map isCorrect to correct
            }))
            // Note: brandId and userId will be handled by the context function using its own state/auth info
        };

        console.log("Calling submitGameResults with data:", submissionData); // Log what's being sent
        
        // Call submitGameResults, passing the constructed data
        // Note: The context function might need updating to actually use these arguments
        const result = await submitGameResults(submissionData); 

        if (result && result.success && result.data) {
          console.log("Game submission successful:", result.data);
          // Update local bonus state from the accurate response
          setBonusRoluEarned(result.data.gameStats?.bonusRoluEarned || 0);
          setSubmissionError(null);
        } else {
          console.error("Game submission failed:", result?.error);
          setSubmissionError(result?.error || t("game.submitError"));
        }
      } catch (error) {
        console.error("Error submitting game results via context:", error);
        setSubmissionError(t("game.submitError"));
        // Fallback beacon logic (keep as is)
        const payload = {
          sessionId: gameConfig?.session?.id || `session_${Date.now()}`,
          score: finalScore,
          distance: finalDistance,
          brandId,
          xpEarned: finalXP,
          roluTokens: finalRoluTokensEstimate,
          quizStats: {
            total: quizStats.total,
            correct: correctAnswersSessionRef.current,
            accuracy:
              quizStats.total > 0
                ? (correctAnswersSessionRef.current / quizStats.total) * 100
                : 0,
          },
          userId: user.id,
          quizResponses,
        };

        navigator.sendBeacon(
          "/api/game/submit",
          new Blob([JSON.stringify(payload)], {
            type: "application/json",
          })
        );
      } finally {
        setIsSubmittingResults(false); // <-- Stop loading state regardless of outcome
      }
    } else {
      // Non-logged-in user logic (keep beacon as is)
      const payload = {
        sessionId: gameConfig?.session?.id || `session_${Date.now()}`,
        score: finalScore,
        distance: finalDistance,
        brandId,
        xpEarned: finalXP,
        roluTokens: finalRoluTokensEstimate,
        quizStats: {
          total: quizStats.total,
          correct: correctAnswersSessionRef.current,
          accuracy:
            quizStats.total > 0
              ? (correctAnswersSessionRef.current / quizStats.total) * 100
              : 0,
        },
        quizResponses,
      };

      navigator.sendBeacon(
        "/api/game/submit",
        new Blob([JSON.stringify(payload)], {
          type: "application/json",
        })
      );
      setIsSubmittingResults(false); // Stop loading for non-logged-in too
    }

    // Track Play Again action
    track("Action Selected", {
      source: "game_end_screen",
      action: "playAgain",
      brandId: brandId,
    });
  };

  const handleRestartGame = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // First set game state directly
    // setGameStatus("ready"); // Make sure this line is removed or commented out
    setCountdownValue(3); // Start countdown from 3
    setGameStatus("countdown"); // Set new status for countdown phase
    if (onGameStatusChange) {
      // Also notify parent about countdown
      onGameStatusChange("countdown");
    }
    setCurrentLane(1);
    setScore(0);
    setDistance(0); // <<< ENSURE THIS LINE REMAINS
    setShowQuiz(false);
    setCurrentQuiz(null);
    setQuizResponses([]);

    // Reset quiz flow state
    setIncorrectQueue([]);
    setMainSequenceIndex(0);
    setQuestionsShownCount(0);
    correctAnswersSessionRef.current = 0; // Reset the ref
    setQuizStats({ total: 0, correct: 0 }); // Reset display state

    // Load config in a separate non-blocking operation
    // to avoid any navigation side effects
    setTimeout(() => {
      const img = new Image();
      img.onload = () => {
        fetch(
          `/api/game/config/${brandId}?lang=${
            i18n.language || "en"
          }&t=${Date.now()}`
        )
          .then((res) => res.json())
          .then((data) => {
            if (data.config) {
              setGameConfig(data.config);
            }
          })
          .catch(() => {
            // Silent failure
          });
      };
      img.src =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; // 1px transparent GIF
    }, 50);
  };

  const handleLaneChange = (lane: number) => {
    console.log("Lane change requested to:", lane);
    setCurrentLane(lane);
  };

  const handleScoreUpdate = (newScore: number) => {
    if (gameStatus === "playing") {
      setScore(newScore);
    }
  };

  const handleDistanceUpdate = (newDistance: number) => {
    setDistance(newDistance);
  };

  // Renamed from getNextSequentialQuiz for clarity
  const getNextQuiz = async () => {
    // --- Safety Checks ---
    if (allQuizQuestions.length === 0) {
        console.error("No quiz questions available.");
        // Optionally try fetching again or handle error state
        // Fallback to ensure game continues if needed:
        setShowQuiz(false);
        if (gameStatus === 'paused') setGameStatus("playing"); // Resume if paused
        return;
    }

    // --- Check for Completion ---
    // Check if all unique questions have been answered correctly
    if (correctlyAnsweredIds.size >= allQuizQuestions.length) {
        console.log("All questions answered correctly! Quiz cycle complete.");
        setShowQuiz(false); // Don't show another quiz
         if (gameStatus === 'paused') setGameStatus("playing"); // Resume game if paused
        // Potentially trigger a different game state like "quizComplete"
        return;
    }

    // --- 1. Prioritize Incorrect Queue ---
    // Find the first incorrect question that is due based on count
    const incorrectToShow = incorrectQueue.find(q => questionsShownCount >= q.reaskAtCount);

    if (incorrectToShow) {
        const question = allQuizQuestions.find(q => q.id === incorrectToShow.id);
        if (question) {
            console.log(`Re-asking incorrect question ID: ${question.id} (due at count ${incorrectToShow.reaskAtCount}, current count ${questionsShownCount})`);
            // Remove from queue *before* showing
            setIncorrectQueue(prev => prev.filter(q => q.id !== incorrectToShow.id));
            setCurrentQuiz(question);
            setShowQuiz(true);
            setQuestionsShownCount(prev => prev + 1); // Increment count *here*
            // DO NOT ADVANCE mainSequenceIndex here
            return;
        } else {
            // Question ID in queue but not found in main list (shouldn't happen)
            console.error(`Question ID ${incorrectToShow.id} from incorrect queue not found in allQuizQuestions.`);
            // Remove the invalid entry
            setIncorrectQueue(prev => prev.filter(q => q.id !== incorrectToShow.id));
            // Continue to try and get the next main sequence question...
        }
    }

    // --- 2. Find and Show Next *Unanswered* Main Sequence Question ---
    let nextQuestionFound = false;
    let loopProtection = 0; // Prevent infinite loops if logic error occurs
    let searchIndex = mainSequenceIndex; // Start searching from the current main index

    while (!nextQuestionFound && loopProtection < allQuizQuestions.length * 2) {
        // Check if we've exhausted the main sequence in this search loop
        if (searchIndex >= allQuizQuestions.length) {
             console.log(`Reached end of main sequence search (index ${searchIndex}). Waiting for incorrect queue or next trigger.`);
             setShowQuiz(false); // Don't show a quiz now if we didn't find one
             if (gameStatus === 'paused') setGameStatus("playing");
             // Do not reset mainSequenceIndex here, let completion logic handle it if needed on next trigger
             return; // Exit, wait for next trigger
        }

        const potentialQuestion = allQuizQuestions[searchIndex];

        // Check if this question has NOT been answered correctly yet
        if (!correctlyAnsweredIds.has(potentialQuestion.id)) {
            console.log(`Showing next unanswered main sequence question index: ${searchIndex}, ID: ${potentialQuestion.id}`);
            setCurrentQuiz(potentialQuestion);
            setShowQuiz(true);
            setQuestionsShownCount(prev => prev + 1); // Increment count

            // Update mainSequenceIndex to point *after* the question we just showed for the *next* search
            setMainSequenceIndex(searchIndex + 1);
            nextQuestionFound = true; // Mark as found to exit the loop
            // return; // Exit the function since we found and showed the question
        } else {
            // This question was already answered correctly, skip it.
             console.log(`Skipping already correct question at index ${searchIndex}, ID: ${potentialQuestion.id}`);
             searchIndex++; // Move to the next index in the main sequence
        }

        loopProtection++;
        if (loopProtection >= allQuizQuestions.length * 2) {
             console.warn("Loop protection activated in getNextQuiz. Breaking loop.")
        }

        // If found, break the loop. We return outside the loop.
        if (nextQuestionFound) break;
    }

    // If loop finishes without finding an unanswered question in the main sequence
    if (!nextQuestionFound) {
        console.log("Could not find an unanswered question in the main sequence. Waiting for incorrect queue or next trigger.");
        setShowQuiz(false);
         if (gameStatus === 'paused') setGameStatus("playing");
    }
  };

  const handleQuizTrigger = (quizId: string) => { // quizId param might be unused now
    console.log(`Quiz triggered. Current count: ${questionsShownCount}, Main index: ${mainSequenceIndex}, Correct IDs: ${correctlyAnsweredIds.size}, Incorrect Queue: ${incorrectQueue.length}`);
    if (gameConfig?.quizPauseGame !== false) { // Pause unless explicitly set to false
        setGameStatus("paused");
    }
    getNextQuiz(); // Use the new function name
  };

  const handleQuizAnswer = (isCorrect: boolean, optionId: string, selectionTimeMs?: number) => {
    if (!currentQuiz) return;

    const questionId = currentQuiz.id;
    console.log(`Answered Question ID: ${questionId}, Correct: ${isCorrect}`);

    // --- Update Responses (Keep as is) ---
    setQuizResponses((prev) => [
      ...prev,
      { questionId: questionId, optionId, isCorrect },
    ]);

    // --- Update Correct Count/Ref (Keep as is for session stats/rewards) ---
    setQuizStats((prev) => ({
      total: prev.total + 1, // Total attempts
      correct: isCorrect ? prev.correct + 1 : prev.correct, // Correct attempts
    }));
    if (isCorrect) {
      correctAnswersSessionRef.current += 1; // Used for immediate reward calc? Verify usage.
    }

    // --- Update Correctly Answered Set & Incorrect Queue ---
    if (isCorrect) {
        // Update local state immediately for responsiveness
        const alreadyCorrect = correctlyAnsweredIds.has(questionId); // Check before updating set
        setCorrectlyAnsweredIds((prev) => {
             const newSet = new Set(prev);
             newSet.add(questionId);
             console.log(`Added ${questionId} to correctlyAnsweredIds. Total correct: ${newSet.size}`);
             return newSet;
        });

        // --- Save Progress to Backend (if user logged in and wasn't already marked correct) ---
        if (user?.id && !alreadyCorrect) {
            console.log(`Attempting to save correct answer for question ${questionId} to backend.`);
            // Use a separate async function to not block the UI thread
            const saveProgress = async () => {
                try {
                    const response = await fetch("/api/user/quiz-progress", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ questionId: questionId, brandId: brandId }),
                    });
                    if (!response.ok) {
                        console.error(`Failed to save quiz progress to backend (${response.status}):`, await response.text());
                    } else {
                        const result = await response.json();
                         if (result.success) {
                             console.log(`Successfully saved correct answer for question ${questionId} to backend.`);
                         } else {
                              console.error(`Backend reported failure saving quiz progress for ${questionId}:`, result.error);
                         }
                    }
                } catch (error) {
                    console.error("Error saving quiz progress:", error);
                }
            };
            saveProgress(); // Fire and forget (or add more robust handling if needed)
        }
        // --- End Save Progress ---

        // No need to explicitly remove from incorrectQueue, getNextQuiz handles removal on selection
    } else {
        // Check if it's *not* already marked as correct (it shouldn't be, but safety check)
        if (!correctlyAnsweredIds.has(questionId)) {
            setIncorrectQueue((prev) => {
                // Avoid adding duplicates if already scheduled for retry
                if (prev.some((q) => q.id === questionId)) {
                    console.log(`Question ${questionId} already in incorrect queue.`);
                    return prev;
                 }

                const reaskInterval = gameConfig?.quizRetryInterval || 3; // Get interval from config or default to 3
                const reaskAt = questionsShownCount + reaskInterval; // Schedule based on count *after* this question
                console.log(`Adding ${questionId} to incorrect queue. Re-ask after count: ${reaskAt}`);
                return [
                    ...prev,
                    { id: questionId, reaskAtCount: reaskAt },
                ];
            });
        } else {
             console.log(`Question ${questionId} was answered incorrectly, but is already in correctlyAnsweredIds. Not adding to retry queue.`);
        }
    }

    // --- Close Quiz & Resume Game (Keep delay logic) ---
    // Add small delay for feedback visibility
    setTimeout(() => {
      setShowQuiz(false);
      setCurrentQuiz(null);
      // Resume only if the game was paused by the quiz trigger
      if (gameStatus === 'paused' && gameConfig?.quizPauseGame !== false) {
          console.log("Resuming game after quiz.");
          setGameStatus("playing");
      }
    }, 1500); // 1.5 second delay

    // --- Analytics Tracking (Keep as is) ---
    track('Quiz Completed', {
      quizId: currentQuiz.id,
      brandId: brandId,
      questionType: currentQuiz.questionType,
      isCorrect: isCorrect,
      responseTimeMs: selectionTimeMs ? Date.now() - selectionTimeMs : -1 // Use passed selectionTimeMs
    });
  };

  const handleImageQuizSubmit = async (data: {
    imageUrl: string;
    imageMimeType: string;
  }) => {
    if (!currentQuiz || !user) return;

    setIsSubmittingImage(true);
    setSubmissionStartTime(Date.now()); // Set submission start time
    setImageSubmitError(null);
    setSubmissionFeedback(null);

    let result: any; // Declare result outside the try block to handle scope

    try {
      const response = await fetch("/api/quizzes/submit-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quizId: currentQuiz.id,
          userId: user.id,
          imageUrl: data.imageUrl,
          imageMimeType: data.imageMimeType,
        }),
      });

      result = await response.json(); // Assign result here

      if (!response.ok) {
        throw new Error(result.error || "Submission failed");
      }

      // Update stats and session ref if correct
      setQuizStats((prev) => ({
        total: prev.total + 1,
        correct: result.isCorrect ? prev.correct + 1 : prev.correct,
      }));
      if (result.isCorrect) {
        correctAnswersSessionRef.current += 1; // Increment the ref
        // Update local state immediately
        const alreadyCorrect = correctlyAnsweredIds.has(currentQuiz.id); // Check before updating
        setCorrectlyAnsweredIds((prev) =>
          new Set(prev).add(currentQuiz.id)
        );

        // --- Save Image Upload Progress to Backend ---
        if (user?.id && !alreadyCorrect) {
             console.log(`Attempting to save correct IMAGE answer for question ${currentQuiz.id} to backend.`);
             const saveProgress = async () => {
                try {
                    const response = await fetch("/api/user/quiz-progress", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ questionId: currentQuiz.id, brandId: brandId }), // Use currentQuiz.id
                    });
                    if (!response.ok) {
                        console.error(`Failed to save IMAGE quiz progress to backend (${response.status}):`, await response.text());
                    } else {
                        const res = await response.json();
                        if(res.success) {
                           console.log(`Successfully saved correct IMAGE answer for question ${currentQuiz.id} to backend.`);
                        } else {
                            console.error(`Backend reported failure saving IMAGE quiz progress for ${currentQuiz.id}:`, res.error);
                        }
                    }
                } catch (error) {
                    console.error("Error saving IMAGE quiz progress:", error);
                }
            };
            saveProgress();
        }
         // --- End Save Progress ---

      } else {
        // If incorrect, add to the incorrect queue for potential repeat
        setIncorrectQueue((prev) => {
          if (prev.some((q) => q.id === currentQuiz.id)) return prev;
          return [
            ...prev,
            { id: currentQuiz.id, reaskAtCount: questionsShownCount + 2 },
          ];
        });
      }

      // Show feedback message
      setSubmissionFeedback({
        isCorrect: result.isCorrect,
        message:
          result.message ||
          (result.isCorrect
            ? t("quiz.correct", "Correct!")
            : t("quiz.incorrect", "Incorrect")),
        roluAwarded: result.roluAwarded,
      });

      // If Rolu awarded, potentially update user stats (optional, depends on API design)
      if (result.roluAwarded && result.roluAwarded > 0) {
        // Optionally call updateUserStats or refresh context if needed immediately
      }

      // Track Quiz Completed (Image Upload)
      track('Quiz Completed', {
        quizId: currentQuiz.id,
        brandId: brandId,
        questionType: currentQuiz.questionType,
        isCorrect: result.isCorrect,
        responseTimeMs: submissionStartTime ? Date.now() - submissionStartTime : -1 // Use state submissionStartTime
      });

    } catch (err) {
      console.error("Image quiz submission error:", err);
      setImageSubmitError(
        err instanceof Error ? err.message : "An error occurred"
      );
      // Show generic feedback on error
      setSubmissionFeedback({
        isCorrect: false,
        // Use the caught error message if available and it's a string, otherwise generic
        message:
          err instanceof Error
            ? err.message
            : t("quiz.submissionError", "Error submitting answer"),
      });
    } finally {
      // Add delay before closing even after feedback/error
      setTimeout(() => {
        setIsSubmittingImage(false);
        setShowQuiz(false);
        setCurrentQuiz(null);
        setSubmissionFeedback(null); // Clear feedback before resuming
        setGameStatus("playing");
      }, 2500); // 2.5 second delay after showing feedback/error
    }
  };

  const handleQuizClose = () => {
    setShowQuiz(false);
    setCurrentQuiz(null);
    setSubmissionFeedback(null); // Clear feedback on manual close too
    setGameStatus("playing");
  };

  if (isLoading) {
    return (
      <div className="game-container flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">{t("game.loading")}</p>
        </div>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="mb-8">
          <div className="text-amber-400 mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-20 h-20 mx-auto"
            >
              <path
                fillRule="evenodd"
                d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">{t("game.notAvailable")}</h2>
          <p className="text-gray-600 mb-8">
            {configError.includes("not found")
              ? t("game.brandNotFound")
              : t("game.brandNotActive")}
          </p>
          <p className="text-gray-500 mb-4">{t("game.tryAnotherBrand")}</p>
        </div>
        <Button
          onClick={handleExit}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full"
        >
          {t("common.backToHome")}
        </Button>
      </div>
    );
  }
  console.log("Context gameSubmitResponse:", gameSubmitResponse); // Debug log
  return (
    <div
      className="relative w-full h-full flex flex-col"
      ref={gameContainerRef}
    >
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center">
        <button
          onClick={handleExit}
          className="text-white bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors"
          aria-label={t("game.exitGame")}
        >
          <X className="h-5 w-5" />
        </button>
        <div className="text-white bg-black/50 px-4 py-2 rounded-full text-sm font-medium">
          {t("game.score")}: {score} | {t("game.distance")}:{" "}
          {Math.floor(distance)}m
        </div>
      </div>

      {/* Add pause button */}
      {gameStatus === "playing" && (
        <div className="absolute top-16 right-4 z-10">
          <button
            onClick={handlePauseGame}
            className="text-white bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors"
            aria-label={t("game.pauseGame")}
          >
            <Pause className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="flex-1 relative">
        <GameCanvas
          // Pass "ready" during countdown so canvas initializes, otherwise pass current status
          gameStatus={
            gameStatus === "playing"
              ? "playing"
              : gameStatus === "paused"
              ? "paused"
              : gameStatus === "ended"
              ? "ended"
              : "ready"
          }
          onGameOver={handleGameOver}
          currentLane={currentLane}
          onScoreUpdate={handleScoreUpdate}
          onDistanceUpdate={handleDistanceUpdate}
          onQuizTrigger={handleQuizTrigger}
          gameConfig={gameConfig}
        />

        {/* NEW: Countdown Overlay */}
        {gameStatus === "countdown" &&
          countdownValue !== null &&
          countdownValue > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 backdrop-blur-sm">
              <span className="text-white text-9xl font-bold animate-ping duration-1000">
                {countdownValue}
              </span>
            </div>
          )}

        {gameStatus === "paused" && !showQuiz && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-8 rounded-lg text-center">
              <h2 className="text-2xl font-bold mb-4">
                {t("game.gamePaused")}
              </h2>
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={handleResumeGame}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  {t("game.resume")}
                </button>
                <button
                  onClick={handleExit}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-gray-700 transition-colors"
                >
                  {t("game.exitGame")}
                </button>
              </div>
            </div>
          </div>
        )}

        {gameStatus === "ended" && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-20" // Ensure high z-index
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="bg-white p-6 sm:p-8 rounded-lg text-center max-w-md w-[90%] max-h-[90vh] overflow-y-auto" // Added padding adjustments and overflow
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-4">{t("game.gameOver")}</h2>

              {isSubmittingResults ? (
                // --- Loading State ---
                <div className="flex flex-col items-center justify-center min-h-[200px]">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                  <p className="text-lg text-gray-600">
                    {t("game.savingResults", "Saving results...")}
                  </p>
                </div>
              ) : submissionError ? (
                // --- Error State ---
                 <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
                    <XCircle className="h-12 w-12 text-red-500 mb-4" />
                    <p className="text-lg font-semibold text-red-600 mb-2">
                      {t("game.resultsErrorTitle", "Error Saving Results")}
                    </p>
                    <p className="text-sm text-gray-600 mb-6">
                      {submissionError || t("game.resultsErrorDefault", "Could not save your results. Please try again later.")}
                    </p>
                     {/* Keep Play Again/Exit buttons accessible */}
                     <div className="flex space-x-4 justify-center mt-4">
                       <button
                          type="button"
                          onClick={handleRestartGame}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg font-medium transition-colors"
                        >
                          {t("game.playAgain")}
                        </button>
                        <button
                          type="button"
                          onClick={handleExit}
                           className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg text-lg font-medium transition-colors"
                        >
                          {t("game.exitGame")}
                        </button>
                     </div>
                  </div>
              ) : gameSubmitResponse && gameSubmitResponse.success && gameSubmitResponse.data ? (
                // --- Success State (using gameSubmitResponse) ---
                <>
                  <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Score */}
                      <div className="bg-gray-100 p-3 rounded-lg">
                        <p className="text-sm text-gray-500">{t("game.score")}</p>
                        <p className="text-xl font-bold">{gameSubmitResponse.data.gameStats.score}</p>
                      </div>
                      {/* Distance */}
                      <div className="bg-gray-100 p-3 rounded-lg">
                        <p className="text-sm text-gray-500">
                          {t("game.distance")}
                        </p>
                        <p className="text-xl font-bold">{Math.floor(gameSubmitResponse.data.gameStats.distance)}m</p>
                      </div>
                      {/* XP Earned */}
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <p className="text-sm text-blue-500">
                          {t("game.xpEarned")}
                        </p>
                        <p className="text-xl font-bold text-blue-600">
                          +{gameSubmitResponse.data.gameStats.xpEarned}
                        </p>
                      </div>
                      {/* Session ROLU Earned - Use response data */}
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <p className="text-sm text-purple-500">
                          {t("game.roluTokens")}
                        </p>
                        <p className="text-xl font-bold text-purple-600">
                          +{gameSubmitResponse.data.gameStats.roluEarned} {/* <-- FIX 1: Use server value */}
                          {user && gameSubmitResponse.data.roluLimitInfo.isLimitReached && gameSubmitResponse.data.gameStats.roluEarned < (gameSubmitResponse.data.gameStats.calculatedRolu ?? 0) && ( // Show limit only if applied
                            <span className="text-xs font-normal ml-1 text-amber-600">
                              ({t("game.limited")})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Streak Bonus - Use response data */}
                    {user && gameSubmitResponse.data.userStats.streak > 0 && (
                      <div className="bg-amber-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-1">
                              <Flame className="h-4 w-4 text-amber-500" />
                              <p className="text-sm text-amber-600">
                                {t("game.streakBonus")} ({gameSubmitResponse.data.userStats.streak} {t("game.dayStreak")})
                              </p>
                            </div>
                          <span className="text-sm py-0.5 px-2 rounded-full bg-amber-100 text-amber-700 font-semibold">
                            {(gameSubmitResponse.data.gameStats.streakMultiplier ?? 1.0).toFixed(1)}x
                          </span>
                        </div>
                        <div className="flex justify-between items-end mt-1">
                          <p className="text-xs text-amber-500">
                            {t("game.bonusRolu")}
                          </p>
                          <p className="text-lg font-medium text-amber-600">
                            +{gameSubmitResponse.data.gameStats.bonusRoluEarned} {/* <-- Use server value */}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Quiz Performance - Use response data */}
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-500">
                        {t("game.quizPerformance")}
                      </p>
                      <p className="text-lg font-medium">
                        {gameSubmitResponse.data.gameStats.quizStats?.correct ?? 0}/
                        {gameSubmitResponse.data.gameStats.quizStats?.total ?? 0}{" "}
                        {t("game.correct")}
                        {(gameSubmitResponse.data.gameStats.quizStats?.total ?? 0) > 0 && (
                          <span className="ml-2 text-sm">
                            (
                            {Math.round(
                              gameSubmitResponse.data.gameStats.quizStats?.accuracy ?? 0
                            )}
                            %)
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Daily Rolu Limit Status - Use response data */}
                    {user && (
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-sm text-purple-500 mb-1">
                          {t("game.dailyRoluTokens")}
                        </p>
                        <div className="flex justify-between text-xs">
                          <span>{t("game.earnedToday")}:</span>
                          <span className="font-medium">
                            {/* <-- FIX 2: Use server value for earnedToday and dailyLimit */}
                            {gameSubmitResponse.data.roluLimitInfo.earnedToday}/
                            {gameSubmitResponse.data.roluLimitInfo.dailyLimit}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1 mb-1">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                (gameSubmitResponse.data.roluLimitInfo.earnedToday /
                                  (gameSubmitResponse.data.roluLimitInfo.dailyLimit || 1)) * // Avoid division by zero
                                  100
                              )}%`,
                            }}
                          ></div>
                        </div>
                        {gameSubmitResponse.data.roluLimitInfo.isLimitReached && (
                          <p className="text-amber-600 text-xs">
                            {t("game.dailyLimitReached")}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Sign in prompt */}
                    {!user && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-blue-700 mb-2">
                          {t("game.signInToSave")}
                        </p>
                        <LoginButton className="mx-auto" />
                      </div>
                    )}
                  </div>

                   {/* Buttons */}
                  <div className="flex space-x-4 justify-center">
                     <button
                       type="button"
                       onClick={handleRestartGame}
                       className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg font-medium transition-colors"
                     >
                       {t("game.playAgain")}
                     </button>
                     <button
                       type="button"
                       onClick={handleExit}
                       className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg text-lg font-medium transition-colors"
                     >
                       {t("game.exitGame")}
                     </button>
                   </div>
                </>
              ) : (
                 // Fallback / Initial State if response isn't ready (Should be brief due to loading state)
                 <div className="flex flex-col items-center justify-center min-h-[200px]">
                   <p className="text-gray-600">{t("game.loadingResults", "Loading results...")}</p>
                 </div>
              )}
            </div>
          </div>
        )}

        {showQuiz && currentQuiz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            {currentQuiz.questionType === QuestionType.IMAGE_UPLOAD_AI ? (
              <Card className="w-[90%] max-w-md p-4 max-h-[90vh] overflow-auto bg-background">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    {t("quiz.imageUploadTitle", "Image Upload Task")}
                  </h3>
                  {/* Keep close button functional */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleQuizClose}
                    className="h-8 w-8"
                    disabled={isSubmittingImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {/* Show Feedback OR Upload Input */}
                {submissionFeedback ? (
                  // --- Display Feedback View ---
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    {submissionFeedback.isCorrect ? (
                      <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                    ) : (
                      <XCircle className="h-16 w-16 text-red-500 mb-4" />
                    )}
                    <p
                      className={`text-xl font-semibold ${
                        submissionFeedback.isCorrect
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {submissionFeedback.message}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t("quiz.resumingGame", "Resuming game shortly...")}
                    </p>
                  </div>
                ) : (
                  // --- Display Upload View ---
                  <>
                    <p className="mb-4 text-sm text-muted-foreground">
                      {currentQuiz.imageUploadPrompt ||
                        "Please upload the required image."}
                    </p>
                    <ImageUploadInput
                      userId={user?.id || ""}
                      quizId={currentQuiz.id}
                      onSubmit={handleImageQuizSubmit}
                      onUploadError={(errMsg) => setImageSubmitError(errMsg)}
                      // Pass loading state down to disable input during submission
                      // isDisabled={isSubmittingImage} // Need to add isDisabled prop to ImageUploadInput if needed
                    />
                    {imageSubmitError && (
                      <div className="mt-4 text-red-600 text-sm p-3 border border-red-600/50 bg-red-500/10 rounded-md flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{imageSubmitError}</span>
                      </div>
                    )}
                    {isSubmittingImage && (
                      <div className="mt-4 text-blue-600 text-sm p-3 border border-blue-600/50 bg-blue-500/10 rounded-md flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>
                          {t("quiz.evaluating", "Evaluating... Please wait.")}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </Card>
            ) : (
              <QuizModal
                question={currentQuiz}
                onClose={handleQuizClose}
                onAnswer={handleQuizAnswer}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
