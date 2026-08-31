import { StorageEngine, KnowledgeDoc } from "../db/store";

export interface KnowledgeChunk {
  docId: string;
  docTitle: string;
  chunkIndex: number;
  text: string;
}

export class KnowledgeEngine {
  static chunkText(text: string, chunkSize = 500, overlap = 100): string[] {
    const clean = text.replace(/\r\n/g, "\n").trim();
    if (!clean) return [];

    const chunks: string[] = [];
    let start = 0;

    while (start < clean.length) {
      const end = Math.min(start + chunkSize, clean.length);
      const chunk = clean.slice(start, end);
      chunks.push(chunk);
      start += chunkSize - overlap;
    }

    return chunks;
  }

  static ingestDocument(title: string, filename: string, fileType: string, content: string): KnowledgeDoc {
    const chunks = this.chunkText(content);
    return StorageEngine.addKnowledge({
      title,
      filename,
      fileType,
      content,
      chunkCount: chunks.length,
    });
  }

  static searchKnowledge(query: string, maxResults = 3): KnowledgeChunk[] {
    const docs = StorageEngine.getKnowledge();
    if (docs.length === 0 || !query.trim()) return [];

    const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    if (queryTerms.length === 0) return [];

    const allChunks: { chunk: KnowledgeChunk; score: number }[] = [];

    docs.forEach((doc) => {
      const textChunks = this.chunkText(doc.content);
      textChunks.forEach((chunkText, idx) => {
        const lower = chunkText.toLowerCase();
        let score = 0;

        queryTerms.forEach((term) => {
          if (lower.includes(term)) {
            score += 2;
          }
        });

        if (score > 0) {
          allChunks.push({
            chunk: {
              docId: doc.id,
              docTitle: doc.title,
              chunkIndex: idx,
              text: chunkText,
            },
            score,
          });
        }
      });
    });

    allChunks.sort((a, b) => b.score - a.score);
    return allChunks.slice(0, maxResults).map((item) => item.chunk);
  }
}
