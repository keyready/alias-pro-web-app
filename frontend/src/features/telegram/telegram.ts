interface BackButton { show(): void; hide(): void; onClick(callback: () => void): void; offClick(callback: () => void): void; }
interface HapticFeedback { impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void; notificationOccurred(type: "error" | "success" | "warning"): void; }
interface TelegramWebApp { initData: string; colorScheme?: "light" | "dark"; BackButton?: BackButton; HapticFeedback?: HapticFeedback; ready(): void; expand(): void; onEvent(event: "themeChanged", callback: () => void): void; offEvent(event: "themeChanged", callback: () => void): void; requestFullscreen?: () => void; enableClosingConfirmation?: () => void; disableClosingConfirmation?: () => void; }
declare global { interface Window { Telegram?: { WebApp?: TelegramWebApp }; } }
const webApp = () => window.Telegram?.WebApp;
export const telegram = {
  init() { const app = webApp(); app?.ready(); app?.expand(); app?.onEvent("themeChanged", this.applyTheme); this.applyTheme(); },
  initData() { return webApp()?.initData ?? ""; },
  applyTheme() { document.documentElement.dataset.theme = webApp()?.colorScheme ?? "light"; },
  backButton: { show: () => webApp()?.BackButton?.show(), hide: () => webApp()?.BackButton?.hide(), on: (cb: () => void) => webApp()?.BackButton?.onClick(cb), off: (cb: () => void) => webApp()?.BackButton?.offClick(cb) },
  haptic: { light: () => webApp()?.HapticFeedback?.impactOccurred("light"), soft: () => webApp()?.HapticFeedback?.impactOccurred("soft"), medium: () => webApp()?.HapticFeedback?.impactOccurred("medium"), success: () => webApp()?.HapticFeedback?.notificationOccurred("success"), warning: () => webApp()?.HapticFeedback?.notificationOccurred("warning") },
  fullscreen: { enter: () => webApp()?.requestFullscreen?.() },
  closingConfirmation: { enable: () => webApp()?.enableClosingConfirmation?.(), disable: () => webApp()?.disableClosingConfirmation?.() }
};
