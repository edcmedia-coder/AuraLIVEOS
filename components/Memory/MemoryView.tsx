"use client";

import React, { useState, useEffect } from "react";
import { MemoryItem } from "@/lib/db/store";
import { Brain, Plus, Trash2, Search, Check, Sparkles } from "lucide-react";

export function MemoryView() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newFact, setNewFact] = useState("");
  const [newCategory, setNewCategory] = useState<MemoryItem["category"]>("fact");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/memory");
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch (e) {
      console.error("[Fetch Memories Error]", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey || !newFact) return;

    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newKey,
          fact: newFact,
          category: newCategory,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.memory) {
          setMemories((prev) => [data.memory, ...prev]);
        }
        setNewKey("");
        setNewFact("");
        setShowAddModal(false);
      }
    } catch (e) {
      console.error("[Add Memory Error]", e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/memory?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (e) {
      console.error("[Delete Memory Error]", e);
    }
  };

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to clear all persistent memories?")) {
      try {
        const res = await fetch("/api/memory?clearAll=true", { method: "DELETE" });
        if (res.ok) {
          setMemories([]);
        }
      } catch (e) {
        console.error("[Clear Memories Error]", e);
      }
    }
  };

  const filtered = memories.filter(
    (m) =>
      m.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.fact.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-3 space-y-3.5 max-w-lg w-full mx-auto pb-24 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-indigo-400" />
          <h2 className="font-bold text-base tracking-wide">Long-Term Memory Vault</h2>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Fact</span>
        </button>
      </div>

      {/* Search & Actions */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search remembered facts..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
        {memories.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-2.5 py-2 text-[11px] font-medium text-red-400 hover:bg-red-950/40 border border-red-500/30 rounded-xl"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
            <h3 className="font-semibold text-sm text-zinc-100">Add Fact to AI Memory</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Key Label</label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="e.g., Preferred Coffee Order"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="preference">Preference</option>
                  <option value="project">Project / Task</option>
                  <option value="goal">Goal</option>
                  <option value="interest">Interest</option>
                  <option value="fact">General Fact</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Fact Content</label>
                <textarea
                  value={newFact}
                  onChange={(e) => setNewFact(e.target.value)}
                  rows={3}
                  placeholder="e.g., User drinks oat milk cappuccino with no sugar."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 resize-none"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-500"
                >
                  Save Fact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Memory List */}
      <div className="space-y-2.5 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-xs text-zinc-500">Loading memories...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 space-y-2">
            <Sparkles className="w-6 h-6 mx-auto text-zinc-600" />
            <p className="text-xs">No stored memories found in vault</p>
          </div>
        ) : (
          filtered.map((m) => (
            <div
              key={m.id}
              className="flex items-start justify-between p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all group"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-semibold text-zinc-200">{m.key}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-medium uppercase tracking-wider">
                    {m.category}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">{m.fact}</p>
              </div>
              <button
                onClick={() => handleDelete(m.id)}
                className="p-1.5 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete memory"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
