import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { QuizQuestion } from "@/components/quiz/quiz-modal";
import {
  DailyRoluStatus,
  getDailyRoluStatus,
  getDefaultDailyRoluLimit,
} from "@/lib/user-service";
import { calculateXP, calculateRoluTokens } from "@/lib/game-rewards";
import { useAuth } from "@/contexts/auth-provider";

export type GameState = "ready" | "playing" | "paused" | "ended";

interface GameConfig {
  brandId: string;
  brandName?: string;
  difficulty: string;
  quizFrequency: number;
  obstacles: {
    frequency: number;
    speed: number;
    assets?: Array<{
      id: string;
      assetUrl: string;
      width: number;
      height: number;
    }>;
  };
  collectibles: {
    frequency: number;
    value: number;
    assets?: Array<{
      id: string;
      assetUrl: string;
      width: number;
      height: number;
      points?: number;
    }>;
  };
  player: {
    speed: number;
    jumpForce: number;
    asset?: {
      id: string;
      assetUrl: string;
      width: number;
      height: number;
    } | null;
  };
  background?: {
    id: string;
    assetUrl: string;
  } | null;
  session: {
    id: string;
    startTime: string;
  };
}

interface QuizResult {
  questionId: string;
  correct: boolean;
  optionId: string;
}

// Define the type for the data passed to submitGameResults
interface GameSubmissionData {
    score: number;
    distance: number;
    quizStats: {
        total: number;
        correct: number;
        accuracy: number;
    };
    // Pass data matching QuizResult type
    quizResponses?: QuizResult[]; 
}

// Add a type for game submission response
export interface GameSubmitResponse {
  success: boolean;
  data?: {
    sessionId: string;
    gameStats: {
      score: number;
      distance: number;
      xpEarned: number;
      roluEarned: number;
      bonusRoluEarned: number;
      streakMultiplier: number;
      calculatedRolu?: number;
      quizStats?: {
        total: number;
        correct: number;
        accuracy: number;
      };
    };
    userStats: {
      userId?: string; 
      totalXP: number;
      roluBalance: number;
      level: number;
      streak: number;
      maxStreak: number;
    };
    roluLimitInfo: {
      dailyLimit: number;
      earnedToday: number;
      remainingToday: number;
      isLimitReached: boolean;
    };
  };
  error?: string;
}

interface GameContextType {
  gameState: GameState;
  score: number;
  distance: number;
  currentLane: number;
  brandId: string;
  gameConfig: GameConfig | null;
  currentQuiz: QuizQuestion | null;
  quizResults: QuizResult[];
  isLoading: boolean;
  error: string | null;
  dailyRoluStatus: DailyRoluStatus | null;
  isDailyRoluLimitReached: boolean;
  gameSubmitResponse: GameSubmitResponse | null;

  // Actions
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: (finalScore: number, finalDistance: number) => void;
  restartGame: () => void;
  changeLane: (lane: number) => void;
  updateScore: (newScore: number) => void;
  updateDistance: (newDistance: number) => void;
  showQuiz: (quiz: QuizQuestion) => void;
  hideQuiz: () => void;
  submitQuizAnswer: (
    questionId: string,
    optionId: string,
    correct: boolean
  ) => void;
  // Update the signature to accept optional data
  submitGameResults: (submissionData?: GameSubmissionData) => Promise<GameSubmitResponse | undefined>; 
  fetchDailyRoluStatus: (userId?: string) => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameProviderProps {
  children: ReactNode;
  initialBrandId: string;
}

export function GameProvider({ children, initialBrandId }: GameProviderProps) {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [currentLane, setCurrentLane] = useState(1); // 0=left, 1=center, 2=right
  const [brandId, setBrandId] = useState(initialBrandId);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion | null>(null);
  // Use quizResults state name and QuizResult[] type
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyRoluStatus, setDailyRoluStatus] =
    useState<DailyRoluStatus | null>(null);
  const [isDailyRoluLimitReached, setIsDailyRoluLimitReached] = useState(false);
  const [gameSubmitResponse, setGameSubmitResponse] =
    useState<GameSubmitResponse | null>(null);

  // Fetch game configuration on mount
  useEffect(() => {
    fetchGameConfig();
  }, [brandId]);

  // Fetch daily Rolu status on mount
  useEffect(() => {
    fetchDailyRoluStatus();
  }, []);

  async function fetchGameConfig() {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/game/start?brand=${brandId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to load game configuration");
      }

      setGameConfig(data.data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading game configuration:", error);
      setError("Failed to load game. Please try again.");
      setIsLoading(false);
    }
  }

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    setDistance(0);
    setCurrentLane(1);
    setQuizResults([]); // Reset quizResults as well
  };

  const pauseGame = () => {
    setGameState("paused");
  };

  const resumeGame = () => {
    setGameState("playing");
  };

  const endGame = (finalScore: number, finalDistance: number) => {
    setScore(finalScore); // Update context state
    setDistance(finalDistance); // Update context state
    setGameState("ended");
  };

  const restartGame = () => {
    setGameState("ready");
    setScore(0);
    setDistance(0);
    setCurrentLane(1);
    setQuizResults([]); // Reset quizResults
    setGameSubmitResponse(null);

    // Only fetch Rolu status on restart if we don't have it or if previous game ended
    if (!dailyRoluStatus || gameState === "ended") {
      fetchDailyRoluStatus();
    }
  };

  const changeLane = (lane: number) => {
    setCurrentLane(lane);
  };

  const updateScore = (newScore: number) => {
    setScore(newScore);
  };

  const updateDistance = (newDistance: number) => {
    setDistance(newDistance);
  };

  const showQuiz = (quiz: QuizQuestion) => {
    setCurrentQuiz(quiz);
    setGameState("paused");
  };

  const hideQuiz = () => {
    setCurrentQuiz(null);
    setGameState("playing");
  };

  const submitQuizAnswer = (
    questionId: string,
    optionId: string,
    isCorrect: boolean // Keep argument name simple here
  ) => {
    // Update quizResults state using the QuizResult type
    setQuizResults((prev) => [
      ...prev,
      { questionId, optionId, correct: isCorrect }, // Map isCorrect to correct field
    ]);

    // Add points for correct answers (using context score)
    if (isCorrect) {
      setScore((prev) => prev + 50); 
    }
  };

  // Modify submitGameResults to accept optional data
  const submitGameResults = async (
    submissionData?: GameSubmissionData // Accept optional argument
  ): Promise<GameSubmitResponse | undefined> => {
    // Ensure user is logged in before submitting
    if (!user?.id) {
      console.warn("User not logged in. Cannot submit game results.");
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    try {
      if (!gameConfig) {
        console.error("Game config not available for submission.");
        return {
          success: false,
          error: "Game configuration missing",
        };
      }

      // Use passed data if available, otherwise fallback to context state
      const currentScore = submissionData?.score ?? score;
      const currentDistance = submissionData?.distance ?? distance;
      // Use quizStats directly from submissionData if available, otherwise calculate from context state
      const finalQuizStats = submissionData?.quizStats ?? {
        total: quizResults.length,
        correct: quizResults.filter((r) => r.correct).length, // Use correct field
        accuracy:
          quizResults.length > 0
            ? (quizResults.filter((r) => r.correct).length /
                quizResults.length) *
              100
            : 0,
      };
      // Use quizResponses (now QuizResult[]) from submissionData if available, otherwise use context state
      const finalQuizResults = submissionData?.quizResponses ?? quizResults; 

      const payload = {
        sessionId: gameConfig.session.id,
        score: currentScore, // Use determined score
        distance: currentDistance, // Use determined distance
        // Send the correct field name expected by backend (assuming it's quizResults)
        quizResults: finalQuizResults, 
        brandId, // Use context brandId
        quizStats: finalQuizStats, // Use determined quizStats
        userId: user.id, // Use context user.id
      };

      console.log("Submitting game results with payload (Context):", payload);

      const response = await fetch("/api/game/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as GameSubmitResponse;

      if (!data.success) {
        console.error("Error submitting game results (API response):", data.error);
      } else {
        // Store the entire response in state
        setGameSubmitResponse(data);

        // If game submission was successful, update daily Rolu status from the response
        if (data.data?.roluLimitInfo) {
          const newDailyRoluStatus = {
            userId: data.data.userStats?.userId || user.id, // Use user.id as fallback
            dailyLimit: data.data.roluLimitInfo.dailyLimit,
            earnedToday: data.data.roluLimitInfo.earnedToday,
            remainingToday: data.data.roluLimitInfo.remainingToday,
            limitReached: data.data.roluLimitInfo.isLimitReached,
            streak: data.data.userStats?.streak || 0,
            maxStreak: data.data.userStats?.maxStreak || 0,
            streakMultiplier: data.data.gameStats?.streakMultiplier || 1.0,
            bonusEarned: data.data.gameStats?.bonusRoluEarned || 0,
          };

          setDailyRoluStatus(newDailyRoluStatus);
          setIsDailyRoluLimitReached(data.data.roluLimitInfo.isLimitReached);
        } else {
          console.warn("Game submission response missing roluLimitInfo");
        }
      }

      return data;
    } catch (error) {
      console.error("Error submitting game results (fetch):", error);
      setGameSubmitResponse({ 
        success: false,
        error: error instanceof Error ? error.message : "Network error during submission",
      });
      return {
        success: false,
        error: "Error submitting game results",
      };
    }
  };

  // Simplified fetchDailyRoluStatus - should only be called when needed (on initial load or login)
  const fetchDailyRoluStatus = async (userId?: string) => {
    // Skip API call if we already have recent data from a game submission
    if (gameSubmitResponse && gameState === "ended") {
      return;
    }

    try {
      const status = await getDailyRoluStatus(userId);

      if (status) {
        setDailyRoluStatus(status);
        setIsDailyRoluLimitReached(status.limitReached);
      } else {
        // If we can't get the status, set default values
        setDailyRoluStatus({
          userId: "",
          dailyLimit: getDefaultDailyRoluLimit(),
          earnedToday: 0,
          remainingToday: getDefaultDailyRoluLimit(),
          limitReached: false,
          streak: 0,
          maxStreak: 0,
          streakMultiplier: 1.0,
          bonusEarned: 0,
        });
        setIsDailyRoluLimitReached(false);
      }
    } catch (error) {
      console.error("Error fetching daily Rolu status:", error);
      // Set default values
      setDailyRoluStatus({
        userId: "",
        dailyLimit: getDefaultDailyRoluLimit(),
        earnedToday: 0,
        remainingToday: getDefaultDailyRoluLimit(),
        limitReached: false,
        streak: 0,
        maxStreak: 0,
        streakMultiplier: 1.0,
        bonusEarned: 0,
      });
      setIsDailyRoluLimitReached(false);
    }
  };

  const value = {
    gameState,
    score,
    distance,
    currentLane,
    brandId,
    gameConfig,
    currentQuiz,
    quizResults, // Provide quizResults state
    isLoading,
    error,
    dailyRoluStatus,
    isDailyRoluLimitReached,
    gameSubmitResponse,
    startGame,
    pauseGame,
    resumeGame,
    endGame,
    restartGame,
    changeLane,
    updateScore,
    updateDistance,
    showQuiz,
    hideQuiz,
    submitQuizAnswer,
    submitGameResults,
    fetchDailyRoluStatus,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
