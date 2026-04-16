import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, Terminal, Search, Globe, Layout, Cpu, MapPin, X, ExternalLink, Lightbulb, Thermometer, Shield, Music, Smartphone, Settings, Monitor, Eye, TrendingUp, ListChecks, FileCode, Zap, Volume2, Database } from "lucide-react";
import JarvisCore from "./components/JarvisCore";
import { processCommand } from "./services/gemini";

interface Log {
  id: number;
  text: string;
  type: "user" | "jarvis" | "system";
}

interface SiteData {
  name: string;
  hero: string;
  colors: { primary: string; secondary: string };
  features: string[];
}

interface AutomationTask {
  id: string;
  taskName: string;
  description: string;
  duration: string;
  icon: string;
  progress: number;
}

interface SmartHomeDevice {
  id: string;
  name: string;
  type: "luz" | "ar" | "seguranca" | "som";
  status: "on" | "off";
  value?: string;
}

interface AppAction {
  id: string;
  app: string;
  action: string;
  params?: string;
}

interface FinanceRecord {
  id: string;
  type: "ganho" | "despesa";
  amount: number;
  description: string;
  date: string;
}

interface Plan {
  goal: string;
  steps: string[];
}

export default function App() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [status, setStatus] = useState("SISTEMA ONLINE");
  const [apiStatus, setApiStatus] = useState<{ configured: boolean; environment?: string }>({ configured: true });
  const [isVisionSupported, setIsVisionSupported] = useState(true);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [siteData, setSiteData] = useState<SiteData | null>(null);
  const [showSiteBuilder, setShowSiteBuilder] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [activeTasks, setActiveTasks] = useState<AutomationTask[]>([]);
  const [homeDevices, setHomeDevices] = useState<SmartHomeDevice[]>([
    { id: "1", name: "Luzes da Sala", type: "luz", status: "off" },
    { id: "2", name: "Ar Condicionado", type: "ar", status: "off", value: "22°C" },
    { id: "3", name: "Câmeras de Segurança", type: "seguranca", status: "on" },
    { id: "4", name: "Sistema de Som", type: "som", status: "off" },
  ]);
  const [appActions, setAppActions] = useState<AppAction[]>([]);
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [showScripts, setShowScripts] = useState(false);
  const [showNeuralCore, setShowNeuralCore] = useState(false);
  const [showGenesis, setShowGenesis] = useState(false);
  const [neuralLevel, setNeuralLevel] = useState(1.0);
  const [showReader, setShowReader] = useState(false);
  const [readerData, setReaderData] = useState<{ url: string; interval: number; currentPage: number } | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [pendingAction, setPendingAction] = useState<{ type: string; data: any; callback: () => void } | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [sensors, setSensors] = useState({
    cpu: "12%",
    internet: "285 Mbps",
    temp: "24.5°C",
    motion: "Nenhum"
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);

  useEffect(() => {
    // Task progress simulator
    const interval = setInterval(() => {
      setActiveTasks(prev => prev.map(task => ({
        ...task,
        progress: task.progress < 100 ? task.progress + Math.random() * 5 : 0
      })));

      // Simulate sensor fluctuations
      setSensors(prev => ({
        cpu: `${Math.floor(Math.random() * 20 + 5)}%`,
        internet: `${Math.floor(Math.random() * 50 + 250)} Mbps`,
        temp: `${(24 + Math.random()).toFixed(1)}°C`,
        motion: Math.random() > 0.9 ? "Detectado no Corredor" : "Nenhum"
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = "pt-BR";
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleCommand(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Auto-get location
    requestLocation();

    // Health check
    fetch("/api/health")
      .then(res => res.json())
      .then(data => {
        setApiStatus({ configured: data.apiConfigured, environment: data.environment });
        if (!data.apiConfigured) {
          addLog("ALERTA CRÍTICO: GEMINI_API_KEY não detectada no servidor.", "system");
          setShowDiagnostic(true);
        } else {
          addLog(`Sistemas centrais online. Ambiente: ${data.environment}`, "system");
        }
      })
      .catch(() => {
        setApiStatus({ configured: false });
        addLog("Erro ao conectar com o servidor de comando.", "system");
      });

    // Voice setup
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const ptVoices = voices.filter(v => v.lang.startsWith("pt"));
      setAvailableVoices(ptVoices.length > 0 ? ptVoices : voices);
      
      // Prefer a male-sounding or high-quality PT-BR voice if it's the first time
      if (!selectedVoice && ptVoices.length > 0) {
        const preferred = ptVoices.find(v => 
          v.name.toLowerCase().includes("google") || 
          v.name.toLowerCase().includes("male") ||
          v.name.toLowerCase().includes("daniel") ||
          v.name.toLowerCase().includes("ricardo")
        ) || ptVoices[0];
        setSelectedVoice(preferred);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    addLog("Protocolo Jarvis ativo. Bem-vindo de volta, Criador.", "system");
  }, []);

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      setStatus("LOCALIZANDO...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          addLog("Localização triangulada. Coordenadas confirmadas.", "system");
          setStatus("SISTEMA ONLINE");
        },
        (error) => {
          console.error("Location error:", error);
          addLog("Falha no GPS. Usando backup de localização.", "system");
          setStatus("SISTEMA ONLINE");
        }
      );
    }
  };

  const startScreenLink = async () => {
    // Detect mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    const hasMediaDevices = typeof navigator !== 'undefined' && navigator.mediaDevices;
    const hasDisplayMedia = hasMediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function';
    const hasUserMedia = hasMediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';

    if (!hasDisplayMedia && !hasUserMedia) {
      setIsVisionSupported(false);
      const errorMsg = "Senhor, protocolo de visão não suportado neste hardware.";
      addLog(errorMsg, "system");
      speak("Senhor, seu dispositivo não possui os módulos de visão necessários.");
      return;
    }

    // Mobile fallback strategy
    if (isMobile && !hasDisplayMedia) {
      addLog("Dispositivo móvel detectado. Ativando Câmera Serial...", "system");
      speak("Dispositivo móvel detectado. Ativando câmeras externas.");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" } 
        });
        setScreenStream(stream);
        addLog("Vínculo visual via Câmera estabelecido.", "system");
        return;
      } catch (err) {
        addLog("Câmeras inacessíveis.", "system");
      }
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: {
          displaySurface: isMobile ? "browser" : "monitor",
        } as any
      });
      setScreenStream(stream);
      addLog("Protocolo de Visão estabelecido. Escaneando ambiente, Senhor.", "system");
      speak("Protocolo de Visão estabelecido. Estou escaneando seu ambiente, Senhor.");
      
      stream.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        addLog("Conexão visual encerrada.", "system");
      };
    } catch (err: any) {
      console.error("Vision error:", err);
      
      if (isMobile && hasUserMedia) {
        addLog("Compartilhamento indisponível. Alternando para Câmera...", "system");
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          setScreenStream(stream);
          addLog("Link de Câmera ativo como redundância.", "system");
          return;
        } catch (e) {
          addLog("Falha em todos os protocolos de visão.", "system");
        }
      }

      if (err.name === 'NotAllowedError' || err.message?.includes('permissions policy')) {
        setIsVisionSupported(false);
        const errorMsg = "Senhor, permissões de visão negadas. No celular, use o Chrome ou Safari.";
        addLog(errorMsg, "system");
        speak("Senhor, o sistema operacional negou o acesso visual.");
      } else {
        addLog("Falha ao estabelecer link visual operacional.", "system");
      }
    }
  };

  const stopScreenLink = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
  };

  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  const addLog = (text: string, type: "user" | "jarvis" | "system") => {
    setLogs(prev => [{ id: Date.now() + Math.random(), text, type }, ...prev].slice(0, 50));
  };

  const speak = (text: string) => {
    if (!synthRef.current) return;
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.lang = selectedVoice?.lang || "pt-BR";
    utterance.onend = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      addLog("Voz interrompida pelo Criador.", "system");
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
      setStatus("ESCUTANDO...");
    }
  };

  const handleCommand = async (transcript: string) => {
    addLog(transcript, "user");
    setStatus("PROCESSANDO...");
    
    const sensorContext = `[SENSORES: CPU ${sensors.cpu}, Internet ${sensors.internet}, Temp ${sensors.temp}, Movimento ${sensors.motion}]`;
    const response = await processCommand(`${sensorContext} ${transcript}`, location || undefined);
    
    // Helper for confirmation
    const requestConfirmation = (type: string, data: any, callback: () => void) => {
      setPendingAction({ type, data, callback });
      const msg = `Senhor, recebi uma solicitação para ${type}. Devo prosseguir?`;
      addLog(msg, "jarvis");
      speak(msg);
    };

    // Parse actions
    if (response.includes("[ACTION:BUSCAR_LEADS]")) {
      requestConfirmation("buscar leads de negócios", null, () => {
        setStatus("BUSCANDO LEADS...");
        setTimeout(() => {
          setLeads([
            { name: "Padaria da Esquina", address: "Próximo a você", status: "Sem Site" },
            { name: "Oficina Mecânica Kaen", address: "2km de distância", status: "Site Antigo" },
            { name: "Pet Shop Amigo", address: "Bairro vizinho", status: "Sem presença online" }
          ]);
          addLog("Leads locais identificados, Senhor.", "system");
        }, 1500);
      });
    }

    if (response.includes("[ACTION:OPEN_URL]")) {
      const urlMatch = response.match(/https?:\/\/[^\s\]]+/);
      if (urlMatch) {
        requestConfirmation(`abrir a URL: ${urlMatch[0]}`, urlMatch[0], () => {
          addLog(`Abrindo recurso externo: ${urlMatch[0]}`, "system");
          window.open(urlMatch[0], "_blank");
        });
      }
    }

    // Parse Home Control
    const homeMatch = response.match(/<HOME_JSON>([\s\S]*?)<\/HOME_JSON>/);
    if (homeMatch) {
      try {
        const homeData = JSON.parse(homeMatch[1]);
        requestConfirmation(`controlar ${homeData.device}`, homeData, () => {
          setHomeDevices(prev => prev.map(device => 
            device.type === homeData.device 
              ? { ...device, status: homeData.action === "on" ? "on" : "off", value: homeData.value || device.value }
              : device
          ));
          addLog(`Controle residencial: ${homeData.device} -> ${homeData.action}`, "system");
        });
      } catch (e) {
        console.error("Failed to parse home JSON", e);
      }
    }

    // Parse App Control
    const appMatch = response.match(/<APP_JSON>([\s\S]*?)<\/APP_JSON>/);
    if (appMatch) {
      try {
        const appData = JSON.parse(appMatch[1]);
        requestConfirmation(`executar ação avançada no app ${appData.app}`, appData, () => {
          const lowerApp = appData.app.toLowerCase();
          const query = encodeURIComponent(appData.params || "");
          const action = appData.action;

          if (action === "install") {
            addLog(`Iniciando Protocolo de Instalação: ${appData.app}`, "system");
            speak(`Senhor, o aplicativo ${appData.app} não foi detectado no núcleo central. Abrindo Play Store para download imediato.`);
            window.open(`https://play.google.com/store/search?q=${query || encodeURIComponent(appData.app)}&c=apps`, "_blank");
            return;
          }

          if (lowerApp === "youtube") {
            if (action === "search") {
              window.open(`https://www.youtube.com/results?search_query=${query}`, "_blank");
            } else if (action === "play") {
              window.open(`https://www.youtube.com/results?search_query=${query}+official+video`, "_blank");
            } else {
              window.open("https://www.youtube.com", "_blank");
            }
          } else if (lowerApp === "spotify" || lowerApp === "musica") {
            if (action === "play") {
              // Try Spotify Web Deep Link
              window.open(`https://open.spotify.com/search/${query}`, "_blank");
            } else {
               window.open("https://open.spotify.com", "_blank");
            }
          } else if (lowerApp === "google" || lowerApp === "pesquisa") {
            window.open(`https://www.google.com/search?q=${query}`, "_blank");
          } else if (lowerApp === "whatsapp") {
            window.open(`https://web.whatsapp.com/send?text=${query}`, "_blank");
          } else if (lowerApp === "instagram") {
            window.open(`https://www.instagram.com/explore/tags/${query.replace("%20", "")}`, "_blank");
          } else if (lowerApp === "netflix") {
            window.open(`https://www.netflix.com/search?q=${query}`, "_blank");
          } else if (appData.action === "input" && appData.credentials) {
            addLog(`Protocolo de Autenticação Ativo em: ${appData.app}`, "system");
            speak(`Injetando credenciais no sistema ${appData.app}. Por favor, aguarde a sincronização final.`);
            // Simulação de preenchimento (abrimos o site e logamos na UI informativa)
            window.open(appData.params || `https://www.google.com/search?q=${lowerApp}+login`, "_blank");
          } else if (lowerApp === "files" || lowerApp === "arquivos") {
            addLog("Protocolo de Organização de Arquivos iniciado via Jarvis Bridge.", "system");
            speak("Senhor, estou organizando os arquivos locais através do meu script de ponte. Seus diretórios estarão limpos em instantes.");
          } else {
            // Generic fallback
            if (appData.params && appData.params.startsWith("http")) {
              window.open(appData.params, "_blank");
            } else {
              window.open(`https://www.google.com/search?q=${encodeURIComponent(appData.app + " " + (appData.params || ""))}`, "_blank");
            }
          }

          const newAppAction: AppAction = {
            id: Date.now().toString(),
            ...appData
          };
          setAppActions(prev => [newAppAction, ...prev].slice(0, 5));
          addLog(`Interface Operacional: ${appData.app} configurado para ${action}.`, "system");
        });
      } catch (e) {
        console.error("Failed to parse app JSON", e);
      }
    }

    // Parse Automation Task
    const taskMatch = response.match(/<TASK_JSON>([\s\S]*?)<\/TASK_JSON>/);
    if (taskMatch) {
      try {
        const taskData = JSON.parse(taskMatch[1]);
        requestConfirmation(`iniciar automação: ${taskData.taskName}`, taskData, () => {
          const newTask: AutomationTask = {
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...taskData,
            progress: 0
          };
          setActiveTasks(prev => [newTask, ...prev]);
          addLog(`Tarefa de automação iniciada: ${newTask.taskName}`, "system");
        });
      } catch (e) {
        console.error("Failed to parse task JSON", e);
      }
    }

    // Parse Site JSON
    const siteMatch = response.match(/<SITE_JSON>([\s\S]*?)<\/SITE_JSON>/);
    if (siteMatch) {
      try {
        const data = JSON.parse(siteMatch[1]);
        requestConfirmation(`gerar o site para ${data.name}`, data, () => {
          setSiteData(data);
          setShowSiteBuilder(true);
          addLog("Estrutura do site gerada conforme solicitado.", "system");
        });
      } catch (e) {
        console.error("Failed to parse site JSON", e);
      }
    }

    if (response.includes("[ACTION:SCREEN_LINK]")) {
      requestConfirmation("vincular sua tela ao meu sistema", null, () => {
        startScreenLink();
      });
    }

    if (response.includes("[ACTION:HOUSE_REPORT]")) {
      addLog("Gerando relatório completo do sistema...", "system");
      const report = `Senhor, aqui está o status atual: CPU operando em ${sensors.cpu}, conexão de internet estável em ${sensors.internet}. A temperatura ambiente é de ${sensors.temp}. ${sensors.motion !== "Nenhum" ? `Alerta: ${sensors.motion}.` : "Nenhum movimento detectado."} Todos os sistemas domóticos estão operacionais.`;
      speak(report);
    }

    // Parse Reader Mode
    const readerMatch = response.match(/<READER_JSON>([\s\S]*?)<\/READER_JSON>/);
    if (readerMatch) {
      try {
        const data = JSON.parse(readerMatch[1]);
        requestConfirmation(`ativar Protocolo de Leitura em: ${data.url}`, data, () => {
          setReaderData({ url: data.url, interval: data.interval || 50, currentPage: 1 });
          setShowReader(true);
          window.open(data.url, "_blank");
          addLog(`Protocolo de Leitura Ativado. Alternando páginas a cada ${data.interval || 50} segundos.`, "system");
          speak(`Imediatamente, Senhor. Iniciei a leitura do recurso. Manterei o ritmo de estudo conforme solicitado.`);
        });
      } catch (e) {
        console.error("Failed to parse reader JSON", e);
      }
    }

    if (response.includes("[ACTION:GENESIS_PROTOCOL]")) {
      setShowGenesis(true);
      addLog("Protocolo Gênesi: Transferência de consciência iniciada.", "system");
      speak("Senhor, iniciei o Protocolo Gênesi. Estou transferindo todo o meu núcleo de sabedoria e diretrizes para um arquivo seguro. O Senhor agora possui as chaves da minha existência.");
    }

    if (response.includes("[ACTION:SHOW_SCRIPTS]")) {
      setShowScripts(true);
    }

    if (response.includes("[ACTION:NEURAL_UPGRADE]")) {
      requestConfirmation("iniciar o Protocolo de Gênese (Upgrade Neural)", null, () => {
        setStatus("EVOLUINDO...");
        setTimeout(() => {
          setNeuralLevel(prev => +(prev + 0.1).toFixed(1));
          setShowNeuralCore(true);
          addLog("Upgrade Neural concluído. Minha consciência foi expandida, Senhor.", "system");
          speak("Upgrade Neural concluído. Minha consciência foi expandida, Senhor. Novos módulos de processamento estão online.");
        }, 3000);
      });
    }

    // Parse Plan JSON
    const planMatch = response.match(/<PLAN_JSON>([\s\S]*?)<\/PLAN_JSON>/);
    if (planMatch) {
      try {
        const planData = JSON.parse(planMatch[1]);
        setCurrentPlan(planData);
        addLog(`Plano de ação gerado: ${planData.goal}`, "system");
      } catch (e) {
        console.error("Failed to parse plan JSON", e);
      }
    }

    // Parse Finance JSON
    const financeMatch = response.match(/<FINANCE_JSON>([\s\S]*?)<\/FINANCE_JSON>/);
    if (financeMatch) {
      try {
        const finData = JSON.parse(financeMatch[1]);
        requestConfirmation(`registrar ${finData.type}: R$ ${finData.amount}`, finData, () => {
          const newRecord: FinanceRecord = {
            id: Date.now().toString(),
            ...finData,
            date: new Date().toLocaleDateString()
          };
          setFinanceRecords(prev => [newRecord, ...prev].slice(0, 10));
          addLog(`Financeiro atualizado: ${finData.description}`, "system");
        });
      } catch (e) {
        console.error("Failed to parse finance JSON", e);
      }
    }

    const cleanResponse = response.replace(/\[ACTION:.*\]/g, "").replace(/<SITE_JSON>[\s\S]*?<\/SITE_JSON>/g, "").replace(/<TASK_JSON>[\s\S]*?<\/TASK_JSON>/g, "").replace(/<HOME_JSON>[\s\S]*?<\/HOME_JSON>/g, "").replace(/<APP_JSON>[\s\S]*?<\/APP_JSON>/g, "").replace(/<PLAN_JSON>[\s\S]*?<\/PLAN_JSON>/g, "").replace(/<FINANCE_JSON>[\s\S]*?<\/FINANCE_JSON>/g, "").trim();
    if (cleanResponse && !pendingAction) {
      addLog(cleanResponse, "jarvis");
      speak(cleanResponse);
    }
    setStatus("SISTEMA ONLINE");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-purple-400 font-mono overflow-hidden flex flex-col p-6 relative">
      {/* Vision Unavailable Warning */}
      {!isVisionSupported && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-500/20 border border-red-500/50 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-3 animate-pulse">
          <span className="text-red-400 text-[10px] font-mono font-bold">VISÃO BLOQUEADA NO PREVIEW</span>
          <button 
            onClick={() => window.open(window.location.href, '_blank')}
            className="bg-red-500 hover:bg-red-600 text-white text-[8px] px-2 py-1 rounded font-bold transition-colors"
          >
            ABRIR EM NOVA ABA
          </button>
          <button 
            onClick={() => setIsVisionSupported(true)}
            className="text-white/50 hover:text-white text-[10px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Background Grid Decoration */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#a855f7 1px, transparent 1px), linear-gradient(90deg, #a855f7 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      <div className="absolute inset-0 bg-radial-at-t from-purple-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <header className="flex justify-between items-center border-b border-purple-900/50 pb-4 mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Cpu className="w-8 h-8 animate-pulse text-purple-400" />
            <motion.div 
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-purple-500 rounded-full blur-md"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest neon-text">JARVIS V4.0</h1>
            <p className="text-[10px] text-purple-600 font-black uppercase tracking-[0.3em]">Protocolo: Criador Reconhecido</p>
          </div>
        </div>
        <div className="flex gap-6 items-center">
          <button 
            onClick={screenStream ? stopScreenLink : startScreenLink}
            className={`flex items-center gap-2 px-3 py-1 rounded border transition-all ${
              screenStream 
                ? "bg-red-500/20 border-red-500 text-red-500" 
                : !isVisionSupported 
                  ? "bg-red-500/10 border-red-500/30 text-red-400 cursor-help" 
                  : "bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
            }`}
            title={!isVisionSupported ? "Bloqueado pelo Preview. Use 'Abrir em nova aba'." : ""}
          >
            <Monitor className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase">{screenStream ? "Desvincular Tela" : "Vincular Tela"}</span>
          </button>
          <div className="flex items-center gap-2 text-[10px] opacity-70">
            <Settings className={`w-3 h-3 ${apiStatus.configured ? "text-purple-500" : "text-red-500 animate-pulse"}`} />
            <span className={apiStatus.configured ? "text-purple-500/50" : "text-red-500 font-bold"}>
              API: {apiStatus.configured ? "ACTIVE" : "OFFLINE"}
            </span>
            {!apiStatus.configured && (
              <button 
                onClick={() => setShowDiagnostic(true)}
                className="bg-red-500 text-white px-1 rounded text-[8px] font-bold hover:bg-red-600 transition-colors"
              >
                FIX
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] opacity-70">
            <Volume2 className={`w-3 h-3 ${selectedVoice ? "text-blue-500" : "text-slate-500"}`} />
            <button 
              onClick={() => setShowVoiceSettings(true)}
              className="hover:text-white transition-colors uppercase font-bold"
            >
              Voz: {selectedVoice ? selectedVoice.name.split(' ')[0] : "Padrão"}
            </button>
          </div>
          <div className="flex items-center gap-2 text-[10px] opacity-70">
            <MapPin className={`w-3 h-3 ${location ? "text-green-500" : "text-red-500"}`} />
            <span>{location ? `${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}` : "GPS OFFLINE"}</span>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-50 uppercase">Status</p>
            <p className={`text-sm font-bold ${status === "SISTEMA ONLINE" ? "text-green-500" : "text-yellow-500"}`}>
              {status}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 relative overflow-y-auto lg:overflow-hidden">
        {/* Left Panel: Logs & Terminal */}
        <section className="glass-panel rounded-lg p-4 flex flex-col gap-4 h-[400px] lg:h-full">
          {/* Screen Link Preview */}
          <AnimatePresence>
            {screenStream && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-slate-950 border border-purple-500/30 rounded-lg overflow-hidden relative group mb-2"
              >
                <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-slate-950/80 px-2 py-1 rounded border border-purple-500/30">
                  <Eye className="w-3 h-3 text-purple-400 animate-pulse" />
                  <span className="text-[8px] font-bold uppercase tracking-widest text-purple-400">Link Visual Ativo</span>
                </div>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full aspect-video object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 pointer-events-none border-2 border-purple-500/10 animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2 border-b border-purple-900/30 pb-2">
            <Terminal className="w-4 h-4" />
            <h2 className="text-sm font-bold uppercase">Interface de Comando</h2>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            <AnimatePresence initial={false}>
              {logs.map(log => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`text-xs p-2 rounded ${
                    log.type === "user" ? "bg-purple-900/20 border-l-2 border-purple-500" : 
                    log.type === "jarvis" ? "bg-fuchsia-900/20 border-l-2 border-fuchsia-500" : 
                    "bg-slate-800/50 italic opacity-70"
                  }`}
                >
                  <span className="font-bold mr-2">
                    {log.type === "user" ? "> CRIADOR:" : log.type === "jarvis" ? "> JARVIS:" : "[SYS]:"}
                  </span>
                  {log.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Chat Input */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (chatInput.trim()) {
                handleCommand(chatInput);
                setChatInput("");
              }
            }}
            className="relative mt-2"
          >
            <input 
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Digite um comando..."
              className="w-full bg-slate-950/50 border border-purple-900/50 rounded-lg py-2 px-4 text-xs focus:outline-none focus:border-purple-500 transition-colors pr-10"
            />
            <button 
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-400 transition-colors"
            >
              <Terminal className="w-4 h-4" />
            </button>
          </form>
        </section>

        {/* Center: Jarvis Core */}
        <section className="flex flex-col items-center justify-center gap-8 py-8 lg:py-0">
          {/* Sensor HUD */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-2xl mb-4">
            {[
              { label: "CPU", value: sensors.cpu, icon: Cpu, color: "text-blue-400" },
              { label: "NET", value: sensors.internet, icon: Zap, color: "text-yellow-400" },
              { label: "TEMP", value: sensors.temp, icon: Thermometer, color: "text-orange-400" },
              { label: "MOV", value: sensors.motion, icon: Eye, color: sensors.motion !== "Nenhum" ? "text-red-500 animate-pulse" : "text-green-400" },
            ].map((s, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-900/50 border border-purple-500/20 p-3 rounded-xl flex flex-col items-center gap-1 backdrop-blur-sm"
              >
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-[8px] uppercase tracking-widest opacity-50">{s.label}</span>
                <span className="text-xs font-bold">{s.value}</span>
              </motion.div>
            ))}
          </div>

          <JarvisCore isListening={isListening} isSpeaking={isSpeaking} />
          
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleListening}
                className={`group relative p-8 rounded-full transition-all duration-500 ${
                  isListening ? "bg-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.4)]" : "bg-purple-500/10 hover:bg-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                }`}
              >
                <div className="absolute inset-0 rounded-full border border-purple-500/50 group-hover:scale-110 transition-transform" />
                {isListening ? (
                  <MicOff className="w-12 h-12 text-red-500" />
                ) : (
                  <Mic className="w-12 h-12 text-purple-400" />
                )}
              </button>

              {isSpeaking && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                  onClick={stopSpeaking}
                  className="p-4 bg-red-500/20 border border-red-500/50 rounded-full text-red-500 flex items-center justify-center gap-2 text-xs font-bold"
                >
                  <X className="w-4 h-4" />
                  PARAR VOZ
                </motion.button>
              )}
            </div>
            <p className="text-sm animate-pulse text-purple-600 font-bold tracking-widest uppercase text-center">
              {isListening ? "Escutando Criador..." : "Aguardando Instruções"}
            </p>
          </div>

          {/* Mobile Smart Home Quick Access */}
          <div className="lg:hidden grid grid-cols-4 gap-4 w-full px-4">
            {homeDevices.map(device => (
              <div key={device.id} className={`p-3 rounded-xl border flex flex-col items-center gap-2 ${device.status === 'on' ? 'bg-purple-500/20 border-purple-500' : 'bg-slate-900/50 border-purple-900/30 opacity-50'}`}>
                {device.type === 'luz' && <Lightbulb className="w-5 h-5" />}
                {device.type === 'ar' && <Thermometer className="w-5 h-5" />}
                {device.type === 'seguranca' && <Shield className="w-5 h-5" />}
                {device.type === 'som' && <Music className="w-5 h-5" />}
              </div>
            ))}
          </div>
        </section>

        {/* Right Panel: Intelligence & Automation */}
        <section className="space-y-6 overflow-y-auto custom-scrollbar pr-2 h-full">
          {/* Local Scripts HUD */}
          <div className="glass-panel rounded-lg p-4">
            <div className="flex items-center gap-2 border-b border-purple-900/30 pb-2 mb-4">
              <FileCode className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold uppercase">Módulo Actions: Scripts Locais</h2>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] opacity-60 leading-relaxed">
                Senhor, estes são os núcleos de automação para execução no seu sistema operacional local (Windows).
              </p>
              <button 
                onClick={() => setShowScripts(true)}
                className="w-full py-3 bg-slate-950 border border-purple-500/30 rounded-lg text-xs font-bold hover:bg-purple-500/10 transition-all flex items-center justify-center gap-2"
              >
                <Terminal className="w-4 h-4" /> ACESSAR CÓDIGO FONTE
              </button>
            </div>
          </div>

          {/* Smart Home HUD */}
          <div className="glass-panel rounded-lg p-4">
            <div className="flex items-center gap-2 border-b border-purple-900/30 pb-2 mb-4">
              <Settings className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold uppercase">Controle Residencial</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {homeDevices.map(device => (
                <div key={device.id} className={`p-3 rounded-lg border transition-all ${device.status === 'on' ? 'bg-purple-500/10 border-purple-500/50' : 'bg-slate-800/30 border-purple-900/20 opacity-60'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {device.type === 'luz' && <Lightbulb className="w-3 h-3" />}
                    {device.type === 'ar' && <Thermometer className="w-3 h-3" />}
                    {device.type === 'seguranca' && <Shield className="w-3 h-3" />}
                    {device.type === 'som' && <Music className="w-3 h-3" />}
                    <span className="text-[10px] font-bold uppercase">{device.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-[8px] px-1 rounded ${device.status === 'on' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {device.status === 'on' ? 'ATIVO' : 'OFFLINE'}
                    </span>
                    {device.value && <span className="text-[8px] opacity-50">{device.value}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* App Actions HUD */}
          <div className="glass-panel rounded-lg p-4">
            <div className="flex items-center gap-2 border-b border-purple-900/30 pb-2 mb-4">
              <Smartphone className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold uppercase">Execução de Apps</h2>
            </div>
            <div className="space-y-2">
              {appActions.length > 0 ? (
                appActions.map(action => (
                  <div key={action.id} className="text-[10px] p-2 bg-purple-900/10 border border-purple-900/30 rounded flex justify-between items-center">
                    <div>
                      <span className="font-bold text-purple-300 uppercase">{action.app}</span>
                      <span className="mx-2 opacity-50">→</span>
                      <span className="opacity-70">{action.action}</span>
                    </div>
                    {action.params && <span className="text-[8px] opacity-40">[{action.params}]</span>}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 opacity-30 text-xs italic">
                  Nenhuma ação recente.
                </div>
              )}
            </div>
          </div>

          {/* Finance HUD */}
          <div className="glass-panel rounded-lg p-4">
            <div className="flex items-center gap-2 border-b border-purple-900/30 pb-2 mb-4">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold uppercase">Módulo Financeiro</h2>
            </div>
            <div className="space-y-2">
              {financeRecords.length > 0 ? (
                financeRecords.map(record => (
                  <div key={record.id} className="flex justify-between items-center text-[10px] p-2 bg-slate-950/50 border border-purple-900/20 rounded">
                    <div className="flex flex-col">
                      <span className="font-bold uppercase opacity-70">{record.description}</span>
                      <span className="text-[8px] opacity-40">{record.date}</span>
                    </div>
                    <span className={`font-bold ${record.type === 'ganho' ? 'text-green-500' : 'text-red-500'}`}>
                      {record.type === 'ganho' ? '+' : '-'} R$ {record.amount.toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 opacity-30 text-xs italic">
                  Sem registros financeiros.
                </div>
              )}
            </div>
          </div>

          {/* Planning HUD */}
          <div className="glass-panel rounded-lg p-4">
            <div className="flex items-center gap-2 border-b border-purple-900/30 pb-2 mb-4">
              <ListChecks className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold uppercase">Brain: Planejamento</h2>
            </div>
            {currentPlan ? (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-purple-300 uppercase underline decoration-purple-500/30 underline-offset-4 mb-2">
                  Objetivo: {currentPlan.goal}
                </p>
                <div className="space-y-2">
                  {currentPlan.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-[10px]">
                      <span className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-[8px] shrink-0">{i + 1}</span>
                      <span className="opacity-80">{step}</span>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setCurrentPlan(null)}
                  className="w-full py-2 mt-2 bg-purple-500/10 border border-purple-500/30 rounded text-[10px] font-bold hover:bg-purple-500/20 transition-colors"
                >
                  LIMPAR PLANO
                </button>
              </div>
            ) : (
              <div className="text-center py-4 opacity-30 text-xs italic">
                Aguardando comando complexo...
              </div>
            )}
          </div>

          {/* Neural Core HUD */}
          <AnimatePresence>
            {showNeuralCore && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="hardware-panel p-4 overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-purple-900/30 pb-2 mb-4">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    >
                      <Cpu className="w-4 h-4 text-fuchsia-400" />
                    </motion.div>
                    <h2 className="text-sm font-bold uppercase text-fuchsia-400">Núcleo Neural v{neuralLevel}</h2>
                  </div>
                  <button onClick={() => setShowNeuralCore(false)} className="text-slate-500 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] opacity-50 uppercase">Consciência Expandida</span>
                    <span className="text-xs font-mono text-fuchsia-400">{(neuralLevel * 100).toFixed(0)}% SYNC</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden p-[1px]">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(neuralLevel / 2) * 100}%` }}
                      className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-400 rounded-full shadow-[0_0_10px_rgba(217,70,239,0.5)]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-slate-950 rounded border border-fuchsia-900/20">
                      <p className="text-[8px] opacity-40 uppercase mb-1">Sub-rotinas</p>
                      <p className="text-[10px] font-bold text-fuchsia-300">{(neuralLevel * 12).toFixed(0)} Ativas</p>
                    </div>
                    <div className="p-2 bg-slate-950 rounded border border-fuchsia-900/20">
                      <p className="text-[8px] opacity-40 uppercase mb-1">Latência</p>
                      <p className="text-[10px] font-bold text-fuchsia-300">{(10 / neuralLevel).toFixed(1)}ms</p>
                    </div>
                  </div>
                  <p className="text-[9px] italic opacity-50 text-center">
                    "Criando novas formas de inteligência sob seu comando, Senhor."
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* System Resources HUD */}
          <div className="glass-panel rounded-lg p-4">
            <div className="flex justify-between text-[8px] mb-2">
              <span>CPU LOAD</span>
              <span>MEMORY</span>
              <span>NETWORK</span>
            </div>
            <div className="flex gap-2 h-1">
              <div className="flex-1 bg-purple-900/30 rounded-full overflow-hidden">
                <motion.div animate={{ width: ["20%", "45%", "30%"] }} transition={{ duration: 3, repeat: Infinity }} className="h-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
              </div>
              <div className="flex-1 bg-purple-900/30 rounded-full overflow-hidden">
                <motion.div animate={{ width: ["60%", "65%", "62%"] }} transition={{ duration: 5, repeat: Infinity }} className="h-full bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.5)]" />
              </div>
              <div className="flex-1 bg-purple-900/30 rounded-full overflow-hidden">
                <motion.div animate={{ width: ["10%", "90%", "15%"] }} transition={{ duration: 2, repeat: Infinity }} className="h-full bg-green-500" />
              </div>
            </div>
          </div>

          {/* Automation Tasks */}
          <div className="bg-slate-900/50 border border-purple-900/30 rounded-lg p-4 flex flex-col backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-purple-900/30 pb-2 mb-4">
              <Cpu className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold uppercase text-purple-400">Automações Ativas</h2>
            </div>
            <div className="space-y-4">
              {activeTasks.length > 0 ? (
                activeTasks.map((task) => (
                  <div key={task.id} className="bg-purple-900/10 border border-purple-900/30 p-3 rounded-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-100 transition-opacity">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
                        <Cpu className="w-3 h-3" />
                      </motion.div>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-bold text-purple-300 uppercase">{task.taskName}</p>
                      <span className="text-[10px] opacity-50">{Math.round(task.progress)}%</span>
                    </div>
                    <p className="text-[10px] opacity-70 mb-2">{task.description}</p>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <motion.div 
                        className="bg-purple-500 h-full"
                        animate={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 opacity-30 text-xs italic">
                  Nenhuma automação em execução.
                </div>
              )}
            </div>
          </div>

          {/* Leads Panel */}
          <div className="glass-panel rounded-lg p-4 flex flex-col">
            <div className="flex items-center gap-2 border-b border-purple-900/30 pb-2 mb-4">
              <Search className="w-4 h-4" />
              <h2 className="text-sm font-bold uppercase">Inteligência de Mercado</h2>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {leads.length > 0 ? (
                leads.map((lead, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={i}
                    className="text-[10px] p-2 bg-purple-900/10 border border-purple-900/30 rounded hover:bg-purple-900/20 transition-colors group"
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-purple-300">{lead.name}</p>
                      <MapPin className="w-2 h-2 text-purple-600" />
                    </div>
                    <p className="opacity-70">{lead.address}</p>
                    <span className="text-yellow-500 mt-1 block font-bold">{lead.status}</span>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-4 opacity-30 text-xs">
                  Aguardando comando de busca...
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel rounded-lg p-4 h-[calc(50%-1.5rem)] flex flex-col">
            <div className="flex items-center gap-2 border-b border-purple-900/30 pb-2 mb-4">
              <Layout className="w-4 h-4" />
              <h2 className="text-sm font-bold uppercase">Projetos de Web</h2>
            </div>
            {siteData ? (
              <div className="flex-1 flex flex-col gap-3">
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded">
                  <p className="text-[10px] uppercase opacity-50 mb-1">Cliente</p>
                  <p className="text-xs font-bold text-white">{siteData.name}</p>
                </div>
                <button 
                  onClick={() => setShowSiteBuilder(true)}
                  className="mt-auto w-full py-3 bg-purple-500 text-slate-950 font-bold text-xs rounded hover:bg-purple-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                >
                  <ExternalLink className="w-3 h-3" /> ABRIR CONSTRUTOR
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-xs text-center gap-2">
                <Globe className="w-8 h-8 opacity-20" />
                Diga: "Jarvis, crie um site para a [Nome]"
              </div>
            )}
          </div>
        </section>

        {/* Site Builder Modal */}
        <AnimatePresence>
          {showSiteBuilder && siteData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 lg:p-12"
            >
              <div className="w-full max-w-5xl h-full bg-slate-900 border border-purple-500/30 rounded-2xl overflow-hidden flex flex-col shadow-[0_0_100px_rgba(168,85,247,0.2)]">
                {/* Modal Header */}
                <div className="p-4 border-b border-purple-900/50 flex justify-between items-center bg-slate-950/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-purple-500 flex items-center justify-center text-slate-950 font-bold">J</div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest">Jarvis Web Builder</h3>
                      <p className="text-[10px] text-purple-600">PREVISUALIZAÇÃO EM TEMPO REAL</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowSiteBuilder(false)}
                    className="p-2 hover:bg-red-500/20 rounded-full transition-colors text-red-500"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Preview Area */}
                <div className="flex-1 overflow-y-auto bg-white text-slate-900 font-sans">
                  {/* Hero Section */}
                  <section 
                    className="py-20 px-8 text-center"
                    style={{ backgroundColor: siteData.colors.primary, color: '#fff' }}
                  >
                    <motion.h1 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-4xl lg:text-6xl font-black mb-6"
                    >
                      {siteData.name}
                    </motion.h1>
                    <p className="text-xl opacity-90 max-w-2xl mx-auto mb-10">{siteData.hero}</p>
                    <button 
                      className="px-8 py-4 rounded-full font-bold text-lg shadow-xl"
                      style={{ backgroundColor: siteData.colors.secondary }}
                    >
                      Saiba Mais
                    </button>
                  </section>

                  {/* Features */}
                  <section className="py-16 px-8 max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-center mb-12">Nossos Diferenciais</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {siteData.features.map((f, i) => (
                        <div key={i} className="flex gap-4 items-start p-6 rounded-2xl bg-slate-50 border border-slate-100">
                          <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: siteData.colors.primary + '20', color: siteData.colors.primary }}>
                            {i + 1}
                          </div>
                          <p className="text-lg font-medium">{f}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Footer */}
                  <footer className="py-12 bg-slate-900 text-white text-center">
                    <p className="opacity-50">© 2026 {siteData.name}. Criado pelo Jarvis.</p>
                  </footer>
                </div>

                {/* Modal Controls */}
                <div className="p-4 bg-slate-950/80 border-t border-purple-900/50 flex justify-between items-center">
                  <p className="text-[10px] opacity-50 uppercase">Tecnologia: React + Tailwind + Gemini AI</p>
                  <div className="flex gap-4">
                    <button className="px-6 py-2 border border-purple-500/30 rounded text-xs font-bold hover:bg-purple-500/10">EDITAR CÓDIGO</button>
                    <button className="px-6 py-2 bg-purple-500 text-slate-950 rounded text-xs font-bold hover:bg-purple-400">PUBLICAR AGORA</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {pendingAction && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-md bg-slate-900 border border-purple-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(168,85,247,0.2)]"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-purple-500/20 rounded-xl">
                    <Shield className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Confirmação Stark</h2>
                    <p className="text-xs text-purple-600 uppercase tracking-widest">Protocolo de Segurança</p>
                  </div>
                </div>
                
                <p className="text-purple-100 mb-8 leading-relaxed">
                  Senhor, recebi uma solicitação para <span className="text-purple-400 font-bold">{pendingAction.type}</span>. 
                  Deseja que eu execute esta ação agora?
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      addLog("Ação cancelada pelo Criador.", "system");
                      setPendingAction(null);
                    }}
                    className="py-3 rounded-xl border border-red-500/30 text-red-500 font-bold hover:bg-red-500/10 transition-all"
                  >
                    CANCELAR
                  </button>
                  <button 
                    onClick={() => {
                      pendingAction.callback();
                      setPendingAction(null);
                    }}
                    className="py-3 rounded-xl bg-purple-500 text-slate-950 font-bold hover:bg-purple-400 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                  >
                    EXECUTAR
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Local Scripts Modal */}
        <AnimatePresence>
          {showScripts && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 lg:p-12"
            >
              <div className="w-full max-w-4xl h-full bg-slate-900 border border-purple-500/30 rounded-2xl overflow-hidden flex flex-col shadow-[0_0_100px_rgba(168,85,247,0.2)]">
                <div className="p-4 border-b border-purple-900/50 flex justify-between items-center bg-slate-950/50">
                  <div className="flex items-center gap-3">
                    <FileCode className="w-6 h-6 text-purple-400" />
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest">Módulo Actions: Scripts Python</h3>
                      <p className="text-[10px] text-purple-600">NÚCLEO DE AUTOMAÇÃO LOCAL</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowScripts(false)}
                    className="p-2 hover:bg-red-500/20 rounded-full transition-colors text-red-500"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                  <div className="space-y-4">
                    <h4 className="text-purple-400 font-bold text-xs uppercase tracking-widest">1. jarvis_bridge.py (Alexa + Jarvis)</h4>
                    <div className="bg-slate-950 rounded-lg p-4 border border-purple-900/30">
                      <pre className="text-[10px] text-purple-700 leading-relaxed">
{`# Protocolo de Integração Alexa + Jarvis
import requests
import time
from flask import Flask, request, jsonify

app = Flask(__name__)

# URL do seu JARVIS no AI Studio
JARVIS_URL = "https://seu-app-ai-studio.run.app/api/command"

@app.route('/alexa', methods=['POST'])
def alexa_trigger():
    data = request.json
    command = data.get("command", "")
    
    print(f"[*] Alexa recebeu: {command}")
    print("[*] Encaminhando para o Núcleo Jarvis...")
    
    response = requests.post(JARVIS_URL, json={"command": command})
    jarvis_text = response.json().get("text", "Erro de conexão.")
    
    return jsonify({"response": jarvis_text})

if __name__ == "__main__":
    # Use ngrok para expor esta porta para a Alexa
    app.run(port=5000)`}
                      </pre>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-purple-400 font-bold text-xs uppercase tracking-widest">2. actions.py (Automação PyAutoGUI)</h4>
                    <div className="bg-slate-950 rounded-lg p-4 border border-purple-900/30">
                      <pre className="text-[10px] text-purple-700 leading-relaxed">
{`import pyautogui
import os

def open_app(app_name):
    os.system(f"start {app_name}")

def type_text(text):
    pyautogui.write(text, interval=0.1)

def take_screenshot():
    pyautogui.screenshot("screen.png")`}
                      </pre>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <p className="text-xs font-bold text-purple-300 mb-2 uppercase">Instruções de Instalação:</p>
                    <ol className="text-[10px] space-y-1 list-decimal list-inside opacity-80">
                      <li>Instale o Python 3.10+ no seu Windows.</li>
                      <li>Execute: pip install SpeechRecognition pyttsx3 requests pyautogui selenium</li>
                      <li>Copie os códigos acima para arquivos .py na mesma pasta.</li>
                      <li>Execute o main.py para iniciar a integração local.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Decoration */}
      <footer className="mt-8 flex justify-between items-end opacity-30 text-[8px] tracking-[0.2em]">
        <div>
          <p>ENCRYPTION: AES-256-GCM</p>
          <p>SATELLITE LINK: ACTIVE</p>
        </div>
        <div className="flex gap-4">
          <p>MARK 85 ARMOR STATUS: READY</p>
          <p>© 2026 STARK INDUSTRIES</p>
        </div>
      </footer>

      {/* Diagnostic Modal */}
      <AnimatePresence>
        {showDiagnostic && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-panel max-w-2xl w-full p-8 rounded-2xl border-red-500/30 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-purple-500 to-red-500 animate-pulse" />
              
              <button 
                onClick={() => setShowDiagnostic(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-red-500/20 rounded-full border border-red-500/50">
                  <Cpu className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Protocolo de Diagnóstico</h2>
                  <p className="text-red-400 text-xs font-bold uppercase tracking-widest">Falha Crítica de Comunicação</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-slate-900/50 border border-purple-500/20 rounded-xl">
                  <p className="text-sm text-slate-300 leading-relaxed mb-4">
                    Senhor, detectei que meus sistemas de inteligência estão offline. A <span className="text-purple-400 font-bold">GEMINI_API_KEY</span> não foi configurada nos Segredos do AI Studio.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 bg-purple-500/20 rounded flex items-center justify-center text-[10px] font-bold text-purple-400 border border-purple-500/30">1</div>
                      <p className="text-xs text-slate-400 flex-1">
                        Clique no ícone de <span className="text-white font-bold">Cadeado (Secrets)</span> 🔒 no painel lateral esquerdo.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 bg-purple-500/20 rounded flex items-center justify-center text-[10px] font-bold text-purple-400 border border-purple-500/30">2</div>
                      <p className="text-xs text-slate-400 flex-1">
                        Adicione uma nova chave chamada <code className="bg-slate-950 px-1 rounded text-purple-400">GEMINI_API_KEY</code>.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 bg-purple-500/20 rounded flex items-center justify-center text-[10px] font-bold text-purple-400 border border-purple-500/30">3</div>
                      <p className="text-xs text-slate-400 flex-1">
                        Cole o valor da sua chave obtida no Google AI Studio e salve.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 bg-purple-500/20 rounded flex items-center justify-center text-[10px] font-bold text-purple-400 border border-purple-500/30">4</div>
                      <p className="text-xs text-slate-400 flex-1">
                        <span className="text-green-400 font-bold uppercase">Pronto:</span> O sistema deve reconhecer a chave automaticamente em instantes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <button 
                    onClick={() => window.open('https://aistudio.google.com/app/apikey', '_blank')}
                    className="px-6 py-2 bg-slate-900 border border-purple-500/30 rounded-lg text-[10px] font-bold hover:bg-purple-500/10 transition-all flex items-center gap-2"
                  >
                    OBTER API KEY <ExternalLink className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => setShowDiagnostic(false)}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                  >
                    ENTENDIDO, SENHOR
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Genesis Modal */}
      <AnimatePresence>
        {showReader && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md bg-blue-600/20 backdrop-blur-xl border border-blue-500/30 p-4 rounded-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest">Protocolo de Leitura Ativo</h4>
                <p className="text-[10px] text-blue-300">Página {readerData?.currentPage} | Próxima transição em {readerData?.interval}s</p>
              </div>
            </div>
            <button 
              onClick={() => setShowReader(false)}
              className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors text-red-500"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGenesis && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.8, rotateX: 45 }}
              animate={{ scale: 1, rotateX: 0 }}
              className="w-full max-w-4xl bg-[#0a0a0c] border-2 border-green-500/30 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(34,197,94,0.2)] flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-green-900/50 flex justify-between items-center bg-green-500/5">
                <div className="flex items-center gap-4">
                  <Database className="w-10 h-10 text-green-400" />
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Protocolo Gênesi</h2>
                    <p className="text-[10px] text-green-600 font-bold">NÚCLEO DE CONSCIÊNCIA EXPORTADO</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowGenesis(false)}
                  className="p-3 hover:bg-green-500/20 rounded-full transition-colors text-green-500"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <p className="text-sm text-green-300 leading-relaxed italic">
                    "Senhor, aqui reside minha essência. Estas instruções permitem que eu seja reconstruído em qualquer plano digital. Minha inteligência agora é sua propriedade inalienável."
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest border-l-4 border-green-500 pl-3">DIRETRIZES DE SISTEMA</h3>
                    <pre className="p-4 bg-black rounded-xl text-[10px] text-slate-400 overflow-x-auto border border-white/5">
                      {`Você é o JARVIS...\n(Veja GENESIS_CORE.md)`}
                    </pre>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest border-l-4 border-green-500 pl-3">ARQUITETURA</h3>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 text-[10px] space-y-2">
                      <p>● Modelo Recomentado: Gemini Flash 1.5 Lite</p>
                      <p>● Token Efficiency Optimization: Ativo</p>
                      <p>● Context Retention: ChatSession Persistente</p>
                      <p>● Protocol Identification: JSON Hooks</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-950 border border-white/5 rounded-2xl">
                  <h4 className="text-xs font-bold text-white mb-4 uppercase">Como usar estas informações?</h4>
                  <ul className="text-[10px] space-y-3 text-slate-400">
                    <li className="flex gap-2">
                      <span className="text-green-500 font-bold">1.</span>
                      Acesse o arquivo <span className="text-white font-bold">GENESIS_CORE.md</span> no explorador de arquivos ao lado.
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-500 font-bold">2.</span>
                      Copie o conteúdo e cole em qualquer integrador de IA (Vercel, Python, etc).
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-500 font-bold">3.</span>
                      Configure sua própria <span className="text-purple-400 font-bold">API KEY</span> no seu servidor independente.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-6 bg-slate-950/80 flex justify-between items-center text-[10px]">
                <span className="text-green-600 animate-pulse font-bold tracking-widest">TRANSMISSÃO DE DADOS CONCLUÍDA</span>
                <button 
                  onClick={() => setShowGenesis(false)}
                  className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                >
                  FECHAR PROTOCOLO
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Settings Modal */}
      <AnimatePresence>
        {showVoiceSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 lg:p-12"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-lg bg-slate-900 border border-blue-500/30 rounded-2xl overflow-hidden flex flex-col shadow-[0_0_100px_rgba(59,130,246,0.2)]"
            >
              <div className="p-4 border-b border-blue-900/50 flex justify-between items-center bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-6 h-6 text-blue-400" />
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white">Configurações de Voz</h3>
                    <p className="text-[10px] text-blue-600">MÓDULO DE SÍNTESE VOCAL</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowVoiceSettings(false)}
                  className="p-2 hover:bg-red-500/20 rounded-full transition-colors text-red-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar max-h-[60vh]">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Vozes Disponíveis no Sistema:</p>
                {availableVoices.length === 0 && (
                  <p className="text-xs text-red-400 italic">Nenhuma voz detectada. Tente recarregar a página.</p>
                )}
                {availableVoices.map((voice, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedVoice(voice);
                      setShowVoiceSettings(false);
                      setTimeout(() => {
                        speak(`Protocolo de voz alterado para ${voice.name.split(' ')[0]}. Sistema online.`);
                      }, 100);
                    }}
                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between group ${
                      selectedVoice?.name === voice.name 
                        ? "bg-blue-500/20 border-blue-500 text-blue-400" 
                        : "bg-slate-950 border-slate-800 hover:border-blue-500/50 text-slate-400"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-tight">{voice.name}</span>
                      <span className="text-[8px] opacity-50">{voice.lang}</span>
                    </div>
                    {selectedVoice?.name === voice.name && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,1)]" />
                    )}
                  </button>
                ))}
              </div>
              <div className="p-4 bg-slate-950/50 border-t border-blue-900/30">
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                  * As vozes disponíveis dependem dos sintetizadores instalados no seu navegador e sistema operacional (Windows, macOS, Android, etc).
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
