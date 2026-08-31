import fs from "fs";
import path from "path";

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  durationSeconds: number;
  messageCount: number;
  summary?: string;
  topics: string[];
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  audioDurationMs?: number;
  latencyMs?: number;
  sources?: Array<{ title: string; uri: string }>;
}

export interface MemoryItem {
  id: string;
  key: string;
  fact: string;
  category: "preference" | "interest" | "fact" | "project" | "goal";
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  filename: string;
  fileType: string;
  content: string;
  chunkCount: number;
  createdAt: string;
}

export interface UserSettings {
  userName: string;
  voiceName: string; // 'Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir'
  speed: number;
  vadSensitivity: number; // 0.1 to 0.9
  bargeInThresholdMs: number; // e.g. 150ms
  aiVolume: number; // 0.0 to 1.0
  chunkSize: number; // 2048, 4096, 8192, 16384
  autoMemory: boolean;
  searchGrounding: boolean;
  highRefresh: boolean;
  personality: string;
  reducedMotion: boolean;
}

export interface AppTelemetry {
  totalVoiceSeconds: number;
  totalSessions: number;
  avgBargeInLatencyMs: number;
  totalTokens: number;
  lastSessionTime?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(filename: string, fallback: T): T {
  ensureDir();
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, JSON.stringify(fallback, null, 2));
    return fallback;
  }
  try {
    const raw = fs.readFileSync(filepath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(filename: string, data: T) {
  ensureDir();
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

// Memory initial seed
const DEFAULT_MEMORIES: MemoryItem[] = [
  {
    id: "mem_1",
    key: "Preferred Name",
    fact: "User prefers to be called Alex",
    category: "preference",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "mem_2",
    key: "Primary Project",
    fact: "Building a high-performance full-duplex real-time voice companion",
    category: "project",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_SETTINGS: UserSettings = {
  userName: "Alex",
  voiceName: "Zephyr",
  speed: 1.0,
  vadSensitivity: 0.6,
  bargeInThresholdMs: 180,
  aiVolume: 0.85,
  chunkSize: 4096,
  autoMemory: true,
  searchGrounding: true,
  highRefresh: true,
  personality:
    "Intelligent, warm, empathetic, concise, and highly responsive live conversational companion.",
  reducedMotion: false,
};

const DEFAULT_TELEMETRY: AppTelemetry = {
  totalVoiceSeconds: 142,
  totalSessions: 5,
  avgBargeInLatencyMs: 165,
  totalTokens: 12450,
  lastSessionTime: new Date().toISOString(),
};

export class StorageEngine {
  // Conversations
  static getConversations(): Conversation[] {
    return readJSON<Conversation[]>("conversations.json", []);
  }

  static saveConversation(conv: Conversation) {
    const list = this.getConversations();
    const idx = list.findIndex((c) => c.id === conv.id);
    if (idx >= 0) {
      list[idx] = conv;
    } else {
      list.unshift(conv);
    }
    writeJSON("conversations.json", list);
  }

  static deleteConversation(id: string) {
    const list = this.getConversations().filter((c) => c.id !== id);
    writeJSON("conversations.json", list);

    // Delete messages too
    const msgs = this.getMessages().filter((m) => m.conversationId !== id);
    writeJSON("messages.json", msgs);
  }

  // Messages
  static getMessages(conversationId?: string): Message[] {
    const all = readJSON<Message[]>("messages.json", []);
    if (conversationId) {
      return all.filter((m) => m.conversationId === conversationId);
    }
    return all;
  }

  static addMessage(msg: Message) {
    const all = readJSON<Message[]>("messages.json", []);
    all.push(msg);
    writeJSON("messages.json", all);

    // Update conversation metrics
    const list = this.getConversations();
    const conv = list.find((c) => c.id === msg.conversationId);
    if (conv) {
      conv.messageCount += 1;
      conv.updatedAt = new Date().toISOString();
      if (!conv.title || conv.title === "New Session") {
        conv.title = msg.text.slice(0, 36) || "Live Voice Session";
      }
      this.saveConversation(conv);
    }
  }

  // Memory Vault
  static getMemories(): MemoryItem[] {
    return readJSON<MemoryItem[]>("memories.json", DEFAULT_MEMORIES);
  }

  static addMemory(item: Omit<MemoryItem, "id" | "createdAt" | "updatedAt">): MemoryItem {
    const memories = this.getMemories();
    const newDoc: MemoryItem = {
      ...item,
      id: "mem_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memories.unshift(newDoc);
    writeJSON("memories.json", memories);
    return newDoc;
  }

  static deleteMemory(id: string) {
    const memories = this.getMemories().filter((m) => m.id !== id);
    writeJSON("memories.json", memories);
  }

  static clearAllMemories() {
    writeJSON("memories.json", []);
  }

  // Knowledge Documents
  static getKnowledge(): KnowledgeDoc[] {
    return readJSON<KnowledgeDoc[]>("knowledge.json", []);
  }

  static addKnowledge(doc: Omit<KnowledgeDoc, "id" | "createdAt">): KnowledgeDoc {
    const docs = this.getKnowledge();
    const newDoc: KnowledgeDoc = {
      ...doc,
      id: "k_" + Date.now(),
      createdAt: new Date().toISOString(),
    };
    docs.unshift(newDoc);
    writeJSON("knowledge.json", docs);
    return newDoc;
  }

  static deleteKnowledge(id: string) {
    const docs = this.getKnowledge().filter((d) => d.id !== id);
    writeJSON("knowledge.json", docs);
  }

  // Settings
  static getSettings(): UserSettings {
    return readJSON<UserSettings>("settings.json", DEFAULT_SETTINGS);
  }

  static updateSettings(partial: Partial<UserSettings>): UserSettings {
    const current = this.getSettings();
    const updated = { ...current, ...partial };
    writeJSON("settings.json", updated);
    return updated;
  }

  // Telemetry
  static getTelemetry(): AppTelemetry {
    return readJSON<AppTelemetry>("telemetry.json", DEFAULT_TELEMETRY);
  }

  static recordSessionStats(seconds: number, bargeInMs: number) {
    const telem = this.getTelemetry();
    telem.totalSessions += 1;
    telem.totalVoiceSeconds += seconds;
    if (bargeInMs > 0) {
      telem.avgBargeInLatencyMs = Math.round(
        (telem.avgBargeInLatencyMs * (telem.totalSessions - 1) + bargeInMs) /
          telem.totalSessions
      );
    }
    telem.lastSessionTime = new Date().toISOString();
    writeJSON("telemetry.json", telem);
  }
}
