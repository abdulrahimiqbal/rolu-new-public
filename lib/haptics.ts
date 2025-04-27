import { MiniKit, SendHapticFeedbackInput as MiniKitSendHapticFeedbackInput } from '@worldcoin/minikit-js'

// Define the input type based on the MiniKit documentation
// Corrected based on linter feedback/library definition
export type HapticFeedbackStyleImpact = 'light' | 'medium' | 'heavy' // Removed 'soft', 'rigid' as per library error
export type HapticFeedbackStyleNotification = 'success' | 'warning' | 'error'

export type SendHapticFeedbackInput = MiniKitSendHapticFeedbackInput
// Below is the definition inferred from the MiniKit library for reference:
// export type SendHapticFeedbackInput = 
//   | { hapticsType: 'impact'; style: HapticFeedbackStyleImpact }
//   | { hapticsType: 'notification'; style: HapticFeedbackStyleNotification }
//   | { hapticsType: 'selectionChanged' }

/**
 * Triggers haptic feedback on the user's device via the World App MiniKit.
 * 
 * @param {SendHapticFeedbackInput} feedbackInput - The type and style of haptic feedback to trigger.
 */
export const sendHapticFeedback = (feedbackInput: SendHapticFeedbackInput) => {
  // MiniKit initialization should be handled elsewhere.
  // Rely on the try-catch to handle cases where it might not be ready.
  try {
    MiniKit.commands.sendHapticFeedback(feedbackInput)
  } catch (error) {
    console.error("Failed to send haptic feedback:", error);
    // Handle error appropriately, maybe disable haptics temporarily
  }
} 