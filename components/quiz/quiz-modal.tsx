import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { QuestionType } from '@prisma/client';
import { useAmplitude } from "@/contexts/amplitude-provider";

export interface QuizQuestion {
  id: string;
  question: string;
  imageUrl?: string | null;
  options: Array<{
    id: string;
    text: string;
    explanation?: string | null;
    isCorrect: boolean;
    translatedText?: string;
    translatedExplanation?: string;
  }>;
  explanation?: string | null;
  questionType: QuestionType;
  imageUploadPrompt?: string | null;
  brandId?: string;
}

interface QuizModalProps {
  question: QuizQuestion;
  onClose: () => void;
  onAnswer: (isCorrect: boolean, optionId: string, selectionTimeMs?: number) => void;
  timeLimit?: number; // in seconds
}

export function QuizModal({
  question,
  onClose,
  onAnswer,
  timeLimit = 30,
}: QuizModalProps) {
  const { t } = useTranslation();
  const { track } = useAmplitude();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const modalRendered = useRef(false);
  const answerSelectedTime = useRef<number | null>(null);

  // Event: Quiz Viewed & Quiz Displayed
  useEffect(() => {
    // Track Quiz Viewed when question changes
    track("Quiz Viewed", {
      quizId: question.id,
      questionType: question.questionType,
      brandId: question.brandId || 'unknown' // Assuming brandId is available
    });

    // Track Quiz Displayed once after initial render
    const timeoutId = setTimeout(() => {
      if (!modalRendered.current) {
         modalRendered.current = true;
         track("Quiz Displayed", {
           quizId: question.id,
           renderTimeMs: performance.now() // Approximate render time
         });
      }
    }, 100); // Delay to allow for full render

    return () => clearTimeout(timeoutId);

  }, [question.id]); // Rerun when question ID changes

  // Event: Repeated Quiz Encountered (Placeholder - Needs history logic)
  useEffect(() => {
    const checkRepeat = async () => {
      // Placeholder: Fetch quiz history for the user
      // const history = await fetchQuizHistory(userId, question.id);
      // if (history.length > 0) {
      //   track('Repeated Quiz Encountered', {
      //      quizId: question.id,
      //      timesSeen: history.length,
      //      daysSinceLastSeen: calculateDays(history[0].timestamp)
      //   });
      // }
    };
    // checkRepeat();
  }, [question.id]);

  // Timer effect for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOptionSelect = (optionId: string) => {
    if (showExplanation) return; // Prevent changing after submission
    setSelectedOption(optionId);
    answerSelectedTime.current = Date.now(); // Record selection time

    // Event: Quiz Answer Selected
    track('Quiz Answer Selected', {
      quizId: question.id,
      optionId: optionId,
      timeToSelectMs: answerSelectedTime.current - (viewStartTime || Date.now()) // Requires viewStartTime
    });
  };

  const handleSubmit = () => {
    if (!selectedOption) return;

    const selectedOptionObj = question.options.find(
      (option) => option.id === selectedOption
    );

    if (selectedOptionObj) {
      setShowExplanation(true);
      onAnswer(selectedOptionObj.isCorrect, selectedOption, answerSelectedTime.current || undefined);
    }
  };

  // Event: Quiz Closed
  const handleClose = () => {
    track('Quiz Closed', {
      quizId: question.id,
      completionState: showExplanation ? 'completed' : 'abandoned',
      timeOpenMs: Date.now() - (viewStartTime || Date.now()) // Requires viewStartTime
    });
    onClose();
  };

  // Need to get viewStartTime (when modal became visible) for accurate timings
  const viewStartTime = useRef(Date.now()).current; 

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <Card className="w-[90%] max-w-md p-4 max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm font-medium">
            {t("quiz.timeLeft")}: {timeRemaining} {t("quiz.seconds")}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold mb-2">{question.question}</h3>
          {question.imageUrl && (
            <img
              src={question.imageUrl}
              alt="Question visual"
              className="w-full h-40 object-cover rounded-md mb-4"
            />
          )}
        </div>

        <div className="space-y-3 mb-4">
          {question.options.map((option) => (
            <div
              key={option.id}
              className={`p-3 rounded-md border cursor-pointer transition-colors ${
                selectedOption === option.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              } ${
                showExplanation && option.isCorrect
                  ? "bg-green-100 border-green-500"
                  : showExplanation &&
                    selectedOption === option.id &&
                    !option.isCorrect
                  ? "bg-red-100 border-red-500"
                  : ""
              }`}
              onClick={() => handleOptionSelect(option.id)}
            >
              <p className="font-medium">
                {option.translatedText || option.text}
              </p>
              {showExplanation && selectedOption === option.id && (
                <p className="text-sm mt-2 text-muted-foreground">
                  {option.translatedExplanation || option.explanation}
                </p>
              )}
              {showExplanation && option.isCorrect && (
                <div className="text-green-600 font-medium text-sm mt-2">
                  {t("quiz.correctAnswer")}
                </div>
              )}
              {showExplanation &&
                selectedOption === option.id &&
                !option.isCorrect && (
                  <div className="text-red-600 font-medium text-sm mt-2">
                    {t("quiz.wrongAnswer")}
                  </div>
                )}
              {showExplanation &&
                option.isCorrect &&
                (option.translatedExplanation || option.explanation) && (
                  <div className="mt-2">
                    <div className="font-medium text-xs">
                      {t("quiz.explanation")}:
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {option.translatedExplanation || option.explanation}
                    </p>
                  </div>
                )}
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!selectedOption || showExplanation}
          >
            {showExplanation ? t("quiz.nextQuestion") : t("quiz.continue")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
