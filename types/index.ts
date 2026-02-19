/**
 * Core type definitions for AI Caregiver Co-Pilot
 */

export interface CareRecipient {
  id: string;
  name: string;
  age?: number;
  conditions?: string[];
  medications?: string[];
  notes?: string;
}

export interface CareTask {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";
  dueAt?: Date;
  recipientId?: string;
}

export interface AIConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}
