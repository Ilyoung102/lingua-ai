import { useRef, useEffect } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { ChatWindow } from "./components/ChatWindow";
import { SettingsModal } from "./components/SettingsModal";
import { useTTS } from "./hooks/useTTS";
import {
  useLanguage, useChat, useUI,
  useConversation, useSettings
} from "./contexts";
import {
  saveAsJsonFile,
  getWelcomeMessage,
  parseConvFile
} from "./utils";
import { LANGUAGES } from "./constants";
import {
  LanguageProvider, GoalsProvider, ChatProvider, UIProvider,
  ConversationProvider, SettingsProvider
} from "./contexts";
import "./App.css";

function LanguageTutorApp() {
  const { lang, changeLanguage, level, changeLevel } = useLanguage();
  const { sidebarOpen, setSidebarOpen, showSettings } = useUI();
  const { addConversation, setConvList, deleteConversation } = useConversation();
  const { sessionStart } = useSettings();
  const { messages, setMessages, initializeWelcomeMessage, updateStats } = useChat();

  const { stopSpeaking } = useTTS(lang);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    stopSpeaking();
  }, [lang, stopSpeaking]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      updateStats({ time: Math.floor((Date.now() - sessionStart) / 60000) });
    }, 10000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [sessionStart, updateStats]);

  const handleSave = () => {
    const entry = saveAsJsonFile(messages, lang, level, "structured");
    if (entry) {
      addConversation(entry);
      alert("✅ 대화가 성공적으로 저장되었습니다!");
    }
  };

  const handleRestoreConv = (conv: any) => {
    try {
      if (!conv || !conv.messages || !Array.isArray(conv.messages)) {
        throw new Error("유효하지 않은 대화 데이터입니다.");
      }

      if (messages.length > 1 && window.confirm("현재 대화를 저장하고 새 대화를 불러올까요?")) {
        handleSave();
      }
      
      // Sync language and level
      const convLang = conv.langCode ? LANGUAGES.find(l => l.code === conv.langCode) : null;
      if (convLang && convLang.code !== lang.code) changeLanguage(convLang);
      if (conv.level && conv.level !== level) changeLevel(conv.level);

      setMessages(conv.messages);
      alert(`✅ "${conv.title || "대화"}" 복원되었습니다.\n지금부터 이어서 대화할 수 있습니다!`);
    } catch (err: any) {
      console.error("Restoration failed:", err);
      alert(`❌ 복원 실패: ${err.message}`);
    }
  };

  const handleNewChat = () => {
    stopSpeaking();
    const welcome: any = {
      role: "assistant",
      text: getWelcomeMessage(lang),
      ts: Date.now(),
      id: Date.now(),
    };
    initializeWelcomeMessage(welcome);
  };

  const handleLoadFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      // We need LANGUAGES constant or get it from context if possible
      // Assuming LANGUAGES is imported or we can pass it
      // Let's import it in App.tsx
      const entry = parseConvFile(file, content, LANGUAGES);
      if (entry) {
        addConversation(entry);
        if (entry.restorable) {
          handleRestoreConv(entry);
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="app-container">
      <Header onNewChat={handleNewChat} />

      {showSettings && <SettingsModal />}

      {sidebarOpen && window.innerWidth < 768 && (
        <div onClick={() => setSidebarOpen(false)} className="sidebar-overlay" />
      )}

      <div className="main-layout">
        <ChatWindow onSave={handleSave} />
        <Sidebar
          onLoadFiles={handleLoadFiles}
          onDeleteConv={deleteConversation}
          onRestoreConv={handleRestoreConv}
          onClearConvList={() => setConvList([])}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <LanguageProvider>
        <GoalsProvider>
          <ChatProvider>
            <UIProvider>
              <ConversationProvider>
                <LanguageTutorApp />
              </ConversationProvider>
            </UIProvider>
          </ChatProvider>
        </GoalsProvider>
      </LanguageProvider>
    </SettingsProvider>
  );
}
