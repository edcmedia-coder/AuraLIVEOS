"use client";

import React, { useState } from "react";
import { FileText, X, Upload, Check } from "lucide-react";

interface DocumentShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentAdded: () => void;
}

export function DocumentShareModal({ isOpen, onClose, onDocumentAdded }: DocumentShareModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          filename: title.toLowerCase().replace(/\s+/g, "_") + ".txt",
          fileType: "text/plain",
          content,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        onDocumentAdded();
        setTimeout(() => {
          setSuccess(false);
          setTitle("");
          setContent("");
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error("[Ingest Error]", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
      const reader = new FileReader();
      reader.onload = (event) => {
        setContent(event.target?.result as string || "");
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-sm text-zinc-100">Ingest Knowledge Document</h3>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {/* File Upload Trigger */}
          <div className="flex items-center justify-center p-4 border-2 border-dashed border-zinc-700 hover:border-purple-500/50 rounded-2xl bg-zinc-950/50 cursor-pointer text-center group">
            <label className="cursor-pointer flex flex-col items-center w-full">
              <Upload className="w-6 h-6 text-zinc-400 group-hover:text-purple-400 mb-1" />
              <span className="text-xs text-zinc-300 font-medium">Click to select TXT, MD, or Document</span>
              <span className="text-[10px] text-zinc-500 mt-0.5">Will be chunked and indexed into RAG</span>
              <input type="file" accept=".txt,.md,.json,.csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Document Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Project Roadmap 2026"
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Content / Notes</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Paste project notes, guidelines, or research content..."
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-purple-500 resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !title || !content}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium text-xs hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/20"
          >
            {success ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Document Ingested!</span>
              </>
            ) : (
              <span>Index into AURA Knowledge Base</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
