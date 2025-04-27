"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Edit, Trash2, Save, X, Briefcase } from "lucide-react";
import AdminLayout from "@/components/admin/admin-layout";
import { useRouter } from "next/navigation";
// Remove this import and define our own enum that matches the schema
// import { QuestionType } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Define QuestionType enum to match the Prisma schema
enum QuestionType {
  TEXT_MCQ = "TEXT_MCQ",
  IMAGE_UPLOAD_AI = "IMAGE_UPLOAD_AI",
}

interface QuizOption {
  id?: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}

interface Quiz {
  id?: string;
  question: string;
  imageUrl?: string;
  brandId: string;
  options: QuizOption[];
  questionType: QuestionType;
  imageUploadPrompt?: string | null;
  aiEvaluationCriteria?: string | null;
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [currentQuestionType, setCurrentQuestionType] = useState<QuestionType>(
    QuestionType.TEXT_MCQ
  );
  const router = useRouter();

  // Fetch quizzes and brands on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch quizzes
        const quizzesResponse = await fetch("/api/quizzes?all=true");
        if (!quizzesResponse.ok) {
          throw new Error("Failed to fetch quizzes");
        }
        const quizzesData = await quizzesResponse.json();

        // Fetch brands for the dropdown
        const brandsResponse = await fetch("/api/brands");
        if (!brandsResponse.ok) {
          throw new Error("Failed to fetch brands");
        }
        const brandsData = await brandsResponse.json();

        if (!brandsData.data || !Array.isArray(brandsData.data)) {
          console.error("Invalid brands data format:", brandsData);
          setBrands([]);
        } else {
          setBrands(brandsData.data || []);
        }

        setQuizzes(quizzesData.data || []);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load quizzes. Please try again.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Initialize a new quiz for creation
  const handleCreateQuiz = () => {
    if (brands.length === 0) {
      setError("Please create a brand first before creating a quiz");
      return;
    }

    const initialType = QuestionType.TEXT_MCQ;
    setEditingQuiz({
      question: "",
      brandId: brands.length > 0 ? brands[0].id : "",
      imageUrl: "",
      options: [
        { text: "", isCorrect: false, explanation: "" },
        { text: "", isCorrect: false, explanation: "" },
        { text: "", isCorrect: false, explanation: "" },
        { text: "", isCorrect: false, explanation: "" },
      ],
      questionType: initialType,
      imageUploadPrompt: "",
      aiEvaluationCriteria: "",
    });
    setCurrentQuestionType(initialType);
    setIsCreating(true);
  };

  // Edit an existing quiz
  const handleEditQuiz = (quiz: Quiz) => {
    const quizType = quiz.questionType || QuestionType.TEXT_MCQ;
    setEditingQuiz({ ...quiz, questionType: quizType });
    setCurrentQuestionType(quizType);
    setIsCreating(false);
  };

  // Delete a quiz
  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz?")) return;

    try {
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete quiz");
      }

      // Remove the deleted quiz from the state
      setQuizzes(quizzes.filter((quiz) => quiz.id !== quizId));
    } catch (err) {
      console.error("Error deleting quiz:", err);
      setError("Failed to delete quiz. Please try again.");
    }
  };

  // Save quiz (create or update)
  const handleSaveQuiz = async () => {
    if (!editingQuiz) return;

    // --- VALIDATION ---
    setError(null); // Clear previous errors

    // Common validation
    if (!editingQuiz.question.trim()) {
      setError("Question is required");
      return;
    }
    if (!editingQuiz.brandId) {
      setError("Brand is required");
      return;
    }

    // Type-specific validation
    if (currentQuestionType === QuestionType.TEXT_MCQ) {
      // Ensure at least one option is marked as correct
      if (!editingQuiz.options.some((option) => option.isCorrect)) {
        setError(
          "At least one option must be marked as correct for Multiple Choice questions"
        );
        return;
      }
      // Validate all options have text and explanation
      for (const option of editingQuiz.options) {
        if (!option.text.trim()) {
          setError("All options must have text for Multiple Choice questions");
          return;
        }
        if (!option.explanation.trim()) {
          setError(
            "All options must have an explanation for Multiple Choice questions"
          );
          return;
        }
      }
    } else if (currentQuestionType === QuestionType.IMAGE_UPLOAD_AI) {
      if (!editingQuiz.imageUploadPrompt?.trim()) {
        setError(
          "User Prompt (Instructions) is required for Image Upload questions"
        );
        return;
      }
      if (!editingQuiz.aiEvaluationCriteria?.trim()) {
        setError(
          "AI Evaluation Criteria (Prompt for AI) is required for Image Upload questions"
        );
        return;
      }
    }
    // --- END VALIDATION ---

    // Ensure the editingQuiz object being sent has the correct questionType
    const quizDataToSend = {
      ...editingQuiz,
      questionType: currentQuestionType, // Use the type selected in the form
    };

    // Remove options if it's an image upload question to avoid sending unnecessary data
    if (currentQuestionType === QuestionType.IMAGE_UPLOAD_AI) {
      delete (quizDataToSend as any).options; // Delete options property
    }

    try {
      const method = isCreating ? "POST" : "PUT";
      const url = isCreating
        ? "/api/quizzes"
        : `/api/quizzes/${quizDataToSend.id}`;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(quizDataToSend), // Send the potentially modified object
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to ${isCreating ? "create" : "update"} quiz`
        );
      }

      const data = await response.json();

      // Update local state with the response data (which should include the saved type)
      const savedQuiz = {
        ...data.data,
        questionType: data.data.questionType || currentQuestionType,
      }; // Ensure type is set

      if (isCreating) {
        setQuizzes([...quizzes, savedQuiz]);
      } else {
        setQuizzes(
          quizzes.map((quiz) => (quiz.id === editingQuiz.id ? savedQuiz : quiz))
        );
      }

      setEditingQuiz(null);
      setIsCreating(false);
    } catch (err: any) {
      console.error("Error saving quiz:", err);
      setError(
        err.message ||
          `Failed to ${
            isCreating ? "create" : "update"
          } quiz. Please try again.`
      );
    }
  };

  // Update quiz field
  const handleQuizChange = (
    field: keyof Quiz,
    value: string | QuestionType
  ) => {
    if (!editingQuiz) return;
    if (field === "questionType") {
      setCurrentQuestionType(value as QuestionType);
    }
    setEditingQuiz({ ...editingQuiz, [field]: value });
  };

  // Update option field
  const handleOptionChange = (index: number, field: string, value: any) => {
    if (!editingQuiz) return;
    const updatedOptions = [...editingQuiz.options];
    updatedOptions[index] = { ...updatedOptions[index], [field]: value };
    setEditingQuiz({ ...editingQuiz, options: updatedOptions });
  };

  // Set an option as correct (and others as incorrect)
  const handleSetCorrectOption = (index: number) => {
    if (!editingQuiz) return;
    const updatedOptions = editingQuiz.options.map((option, i) => ({
      ...option,
      isCorrect: i === index,
    }));
    setEditingQuiz({ ...editingQuiz, options: updatedOptions });
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Quiz Management</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout title="Quiz Management">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Quiz Management</h1>
          {brands.length === 0 ? (
            <button
              onClick={() => router.push("/admin/brands")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Briefcase className="mr-2 h-5 w-5" />
              Create Brand First
            </button>
          ) : (
            <button
              onClick={handleCreateQuiz}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
              disabled={!!editingQuiz}
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Add New Quiz
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {brands.length === 0 && !loading && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            <p className="font-medium">No brands available</p>
            <p className="text-sm">
              You need to create at least one brand before you can create
              quizzes.
            </p>
          </div>
        )}

        {editingQuiz ? (
          <div className="mt-8 p-6 border rounded-lg bg-gray-50">
            <h2 className="text-xl font-semibold mb-4">
              {isCreating ? "Create New Quiz" : "Edit Quiz"}
            </h2>

            {/* Question Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Question</label>
              <input
                type="text"
                value={editingQuiz.question}
                onChange={(e) => handleQuizChange("question", e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Enter the quiz question"
              />
            </div>

            {/* Brand Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Brand</label>
              <select
                value={editingQuiz.brandId}
                onChange={(e) => handleQuizChange("brandId", e.target.value)}
                className="w-full p-2 border rounded"
                disabled={brands.length === 0}
              >
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Image URL Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Image URL (Optional)
              </label>
              <input
                type="text"
                value={editingQuiz.imageUrl || ""}
                onChange={(e) => handleQuizChange("imageUrl", e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Enter image URL"
              />
            </div>

            {/* --- Question Type Selector --- */}
            <div className="mb-6">
              <Label htmlFor="questionType">Question Type</Label>
              <Select
                value={currentQuestionType} // Control with specific state
                onValueChange={(value) =>
                  handleQuizChange("questionType", value as QuestionType)
                }
              >
                <SelectTrigger id="questionType" className="w-full">
                  <SelectValue placeholder="Select question type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={QuestionType.TEXT_MCQ}>
                    Multiple Choice (Text)
                  </SelectItem>
                  <SelectItem value={QuestionType.IMAGE_UPLOAD_AI}>
                    Image Upload (AI Eval)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* --- Conditional Fields --- */}
            {currentQuestionType === QuestionType.TEXT_MCQ && (
              <>
                {" "}
                {/* Fragment to group MCQ fields */}
                <h3 className="text-lg font-semibold mb-3">Options</h3>
                {editingQuiz.options.map((option, index) => (
                  <div key={index} className="mb-4 p-3 border rounded bg-white">
                    {/* Option Text */}
                    <label className="block text-sm font-medium mb-1">
                      Option {index + 1} Text
                    </label>
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) =>
                        handleOptionChange(index, "text", e.target.value)
                      }
                      className="w-full p-2 border rounded mb-2"
                    />
                    {/* Option Explanation */}
                    <label className="block text-sm font-medium mb-1">
                      Explanation
                    </label>
                    <textarea
                      value={option.explanation}
                      onChange={(e) =>
                        handleOptionChange(index, "explanation", e.target.value)
                      }
                      className="w-full p-2 border rounded mb-2"
                      rows={2}
                    />
                    {/* Correct Answer Toggle */}
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={option.isCorrect}
                        onChange={() => handleSetCorrectOption(index)}
                        className="mr-2"
                        id={`correct-${index}`}
                      />
                      <label
                        htmlFor={`correct-${index}`}
                        className="text-sm font-medium"
                      >
                        Mark as Correct Answer
                      </label>
                    </div>
                  </div>
                ))}
              </>
            )}

            {currentQuestionType === QuestionType.IMAGE_UPLOAD_AI && (
              <>
                {" "}
                {/* Fragment to group Image Upload fields */}
                {/* User Prompt Input */}
                <div className="mb-4">
                  <Label htmlFor="imageUploadPrompt">
                    Prompt for User (Instructions)
                  </Label>
                  <Textarea
                    id="imageUploadPrompt"
                    value={editingQuiz.imageUploadPrompt || ""}
                    onChange={(e) =>
                      handleQuizChange("imageUploadPrompt", e.target.value)
                    }
                    className="w-full p-2 border rounded"
                    placeholder="e.g., Upload a screenshot showing you follow @roluonworld on Twitter."
                    rows={3}
                  />
                </div>
                {/* AI Criteria Input */}
                <div className="mb-4">
                  <Label htmlFor="aiEvaluationCriteria">
                    AI Evaluation Criteria (Prompt for AI)
                  </Label>
                  <Textarea
                    id="aiEvaluationCriteria"
                    value={editingQuiz.aiEvaluationCriteria || ""}
                    onChange={(e) =>
                      handleQuizChange("aiEvaluationCriteria", e.target.value)
                    }
                    className="w-full p-2 border rounded"
                    placeholder="e.g., Analyze image. Is it a Twitter profile for @roluonworld showing 'Following' button active? Respond ONLY with 'CORRECT' or 'INCORRECT'."
                    rows={5}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Crucial for AI accuracy. Be specific. Instruct AI to respond
                    simply (e.g., CORRECT/INCORRECT).
                  </p>
                </div>
              </>
            )}

            {/* Save/Cancel Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingQuiz(null)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <X className="mr-2 h-5 w-5" /> Cancel
              </button>
              <button
                onClick={handleSaveQuiz}
                className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <Save className="mr-2 h-5 w-5" /> Save Quiz
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {quizzes.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">
                  No quizzes found. Create your first quiz!
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Options
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quizzes.map((quiz) => (
                    <tr key={quiz.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {quiz.question}
                        </div>
                        {quiz.imageUrl && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {quiz.imageUrl}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {brands.find((b) => b.id === quiz.brandId)?.name ||
                            quiz.brandId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {/* Safely display options count */}
                          {quiz.options?.length ?? 0} options
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditQuiz(quiz)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => quiz.id && handleDeleteQuiz(quiz.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export const dynamic = "force-dynamic";
