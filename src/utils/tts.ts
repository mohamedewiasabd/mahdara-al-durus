import { Capacitor } from "@capacitor/core";

let ttsPlugin: any = null;
function getPlugin(): any {
  if (ttsPlugin !== null) return ttsPlugin;
  if (Capacitor.isNativePlatform()) {
    try {
      ttsPlugin = Capacitor.registerPlugin("TtsPlugin");
      return ttsPlugin;
    } catch {
      ttsPlugin = null;
    }
  }
  return null;
}

export function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$([^$]*)\$/g, "$1")
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\|/g, " ")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/[*-_]{2,}/g, " ")
    .replace(/^---[\s\S]*?---/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function jsonTabToSpeech(data: any): string {
  const parts: string[] = [];
  const walk = (node: any) => {
    if (!node) return;
    if (typeof node === "string") {
      parts.push(node);
    } else if (Array.isArray(node)) {
      for (const item of node) walk(item);
    } else if (typeof node === "object") {
      for (const value of Object.values(node)) walk(value);
    }
  };
  walk(data);
  return parts.filter((p) => p && p.trim().length > 0).join(". ");
}

export function speechSupported(): boolean {
  if (getPlugin()) return true;
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakingActive(): boolean {
  if (getPlugin()) return true;
  return typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.speaking;
}

export function stopSpeaking(): void {
  const plugin = getPlugin();
  if (plugin) {
    try {
      plugin.stop();
    } catch {
      /* ignore */
    }
    return;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

let endListener: any = null;
let lastSpeakPromise: Promise<void> = Promise.resolve();

export function speak(text: string, onEnd?: () => void): void {
  const clean = stripMarkdownForSpeech(text);
  if (!clean) {
    if (onEnd) onEnd();
    return;
  }
  const plugin = getPlugin();
  if (plugin) {
    stopSpeaking();
    const p = (async () => {
      if (endListener) {
        try {
          await endListener.remove();
        } catch {
          /* ignore */
        }
        endListener = null;
      }
      if (onEnd) {
        endListener = await plugin.addListener("speechEnded", () => {
          try {
            onEnd();
          } catch {
            /* ignore */
          }
        });
      }
      try {
        await plugin.speak({ text: clean, rate: 1 });
      } catch {
        if (onEnd) onEnd();
      }
    })();
    lastSpeakPromise = p;
    return;
  }
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    if (onEnd) onEnd();
    return;
  }
  stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = "ar-SA";
  utterance.rate = 1;
  const voices = window.speechSynthesis.getVoices();
  const arVoice =
    voices.find((v) => (v.lang || "").toLowerCase().startsWith("ar-ar")) ||
    voices.find((v) => (v.lang || "").toLowerCase().startsWith("ar"));
  if (arVoice) utterance.voice = arVoice;
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}