"use client";

import React, { useState, useEffect } from "react";
import { Conversation, Message } from "@/lib/db/store";
import { History, Search, Trash2, ChevronRight, Clock, MessageSquare, Download, Sparkles } from "lucide-react";

export function HistoryView() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (e) {
      console.error("[Fetch History Error]", e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversationDetails = async (conv: Conversation) => {
    setSelectedConv(conv);
    try {
      const res = await fetch(`/api/history?id=${conv.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error("[Load Details Error]", e);
    }
  };

  const deleteConv = async (id: string) => {
    try {
      const res = await fetch(`/api/history?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (selectedConv?.id === id) {
          setSelectedConv(null);
          setMessages([]);
        }
      }
    } catch (e) {
      console.error("[Delete History Error]", e);
    }
  };

  const exportTranscript = () => {
    if (!selectedConv || messages.length === 0) return;
    const text = messages.map((m) => `[${m.role.toUpperCase()}] ${m.timestamp}\n${m.text}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedConv.title.replace(/\s+/g, "_")}_transcript.txt`;
    a.click();
  };

  const filtered = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.topics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-3 space-y-3.5 max-w-lg w-full mx-auto pb-24 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-cyan-400" />
          <h2 className="font-bold text-base tracking-wide">Conversation History</h2>
        </div>
        <span className="text-xs text-zinc-400">{conversations.length} sessions</span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search topics, keywords, transcripts..."
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Active Conversation Detail Drawer */}
      {selectedConv ? (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div>
              <h3 className="font-semibold text-sm text-zinc-100">{selectedConv.title}</h3>
              <p className="text-[10px] text-zinc-400">
                {new Date(selectedConv.createdAt).toLocaleString()} • {selectedConv.durationSeconds}s
              </p>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={exportTranscript}
                className="p-1.5 text-zinc-400 hover:text-cyan-400 rounded-lg hover:bg-zinc-800"
                title="Export Transcript"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteConv(selectedConv.id)}
                className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-800"
                title="Delete Session"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedConv(null)}
                className="text-xs text-zinc-400 hover:text-zinc-200 ml-2"
              >
                Close
              </button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-2.5 rounded-xl text-xs ${
                  m.role === "assistant"
                    ? "bg-indigo-950/40 border border-indigo-500/20 text-zinc-200"
                    : "bg-zinc-950 border border-zinc-800 text-zinc-300 ml-3"
                }`}
              >
                <div className="flex items-center justify-between mb-1 text-[10px] text-zinc-500">
                  <span className="font-semibold text-zinc-400">
                    {m.role === "assistant" ? "AURA" : "You"}
                  </span>
                  <span>{m.timestamp}</span>
                </div>
                <p className="leading-relaxed">{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* History List */}
      <div className="space-y-2.5 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-xs text-zinc-500">Loading conversation history...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 space-y-2">
            <Sparkles className="w-6 h-6 mx-auto text-zinc-600" />
            <p className="text-xs">No stored live sessions found</p>
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => loadConversationDetails(c)}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all"
            >
              <div className="flex-1 min-w-0 pr-3">
                <h4 className="text-xs font-semibold text-zinc-200 truncate">{c.title}</h4>
                <div className="flex items-center space-x-3 text-[10px] text-zinc-500 mt-1">
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {c.durationSeconds}s
                  </span>
                  <span className="flex items-center">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    {c.messageCount} messages
                  </span>
                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
