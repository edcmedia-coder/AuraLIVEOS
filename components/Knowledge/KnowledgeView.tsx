"use client";

import React, { useState, useEffect } from "react";
import { KnowledgeDoc } from "@/lib/db/store";
import { BookOpen, Search, Trash2, FileText, Sparkles } from "lucide-react";

export function KnowledgeView() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/knowledge");
      if (res.ok) {
        const data = await res.json();
        setDocs(data.knowledge || []);
      }
    } catch (e) {
      console.error("[Fetch Knowledge Error]", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/knowledge?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.matches || []);
      }
    } catch (e) {
      console.error("[Knowledge Search Error]", e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      const res = await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setDocs((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (e) {
      console.error("[Delete Knowledge Error]", e);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-3 space-y-3.5 max-w-lg w-full mx-auto pb-24 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-purple-400" />
          <h2 className="font-bold text-base tracking-wide">Knowledge Ingestion (RAG)</h2>
        </div>
        <span className="text-xs text-zinc-400">{docs.length} documents</span>
      </div>

      {/* Grounded Search Form */}
      <form onSubmit={handleSearch} className="flex space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Test RAG chunk search query..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
          />
        </div>
        <button
          type="submit"
          className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
        >
          Query
        </button>
      </form>

      {/* RAG Search Results */}
      {searchResults.length > 0 && (
        <div className="p-3 bg-purple-950/40 border border-purple-500/30 rounded-2xl space-y-2">
          <h4 className="text-xs font-semibold text-purple-300">RAG Chunk Matches ({searchResults.length})</h4>
          {searchResults.map((match, i) => (
            <div key={i} className="p-2 bg-zinc-950/80 rounded-xl text-xs text-zinc-300">
              <span className="text-[10px] text-purple-400 font-medium block mb-0.5">
                {match.docTitle} (Chunk #{match.chunkIndex})
              </span>
              <p className="leading-relaxed">{match.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ingested Document List */}
      <div className="space-y-2.5 flex-1 overflow-y-auto">
        <h3 className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Ingested Sources</h3>
        {isLoading ? (
          <div className="text-center py-8 text-xs text-zinc-500">Loading knowledge base...</div>
        ) : docs.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 space-y-2">
            <Sparkles className="w-6 h-6 mx-auto text-zinc-600" />
            <p className="text-xs">No ingested documents in knowledge base</p>
            <p className="text-[11px] text-zinc-600">Use the Files button on the Live screen to upload documents</p>
          </div>
        ) : (
          docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all group"
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-zinc-200 truncate">{doc.title}</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {doc.chunkCount} indexed chunks • {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteDoc(doc.id)}
                className="p-1.5 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                title="Delete document"
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
