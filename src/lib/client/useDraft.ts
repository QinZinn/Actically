"use client";
import { useEffect, useState } from "react";
/** Browser drafts only; API records remain server-owned. Storage failures never block writing. */
export function useDraft(storageKey: string, initial = "") {
  const [draft, setDraft] = useState({ key: storageKey, text: initial });
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      let text = initial;
      try { text = window.localStorage.getItem(storageKey) ?? initial; } catch {}
      setDraft({ key: storageKey, text });
    });
    return () => { active = false; };
  }, [storageKey, initial]);
  function save(text: string) {
    setDraft({ key: storageKey, text });
    try { if (text) window.localStorage.setItem(storageKey, text); else window.localStorage.removeItem(storageKey); } catch {}
  }
  return [draft.key === storageKey ? draft.text : initial, save] as const;
}
