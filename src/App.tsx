import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, Terminal, Search, Globe, Layout, Cpu, MapPin, X, ExternalLink, Lightbulb, Thermometer, Shield, Music, Smartphone, Settings, Monitor, Eye, TrendingUp, ListChecks, FileCode, Zap, Volume2, Database, ShieldCheck, Home, Wind, Clock, Send } from "lucide-react";
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

interface SlideData {
  title: string;
  slides: { sub: string; content: string[] }[];
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
  const [activeMission, setActiveMission] = useState<{ title: string; steps: string[]; currentStep: number } | null>(null);
  const [slideData, setSlideData] = useState<SlideData | null>(null);
  const [showSlideBuilder, setShowSlideBuilder] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [wisdom, setWisdom] = useState<string | null>(null);
  const [requestedFiles, setRequestedFiles] = useState<any[]>([]);
  const [studyGoals, setStudyGoals] = useState<{ id: string; text: string; completed: boolean }[]>([
    { id: "1", text: "Completar lição na Sala do Futuro", completed: false },
    { id: "2", text: "Revisar anotações de Matemática", completed: false }
  ]);
  const [pomodoro, setPomodoro] = useState({ timeLeft: 25 * 60, isActive: false, isBreak: false });
  const [readerData, setReaderData] = useState<{ url: string; interval: number; currentPage: number } | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [activeBase, setActiveBase] = useState<"system" | "core" | "study">("core");
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleChatSubmit = () => {
    if (chatInput.trim()) {
      handleCommand(chatInput);
      setChatInput("");
    }
  };

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pomodoro.isActive && pomodoro.timeLeft > 0) {
      interval = setInterval(() => {
        setPomodoro(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
    } else if (pomodoro.timeLeft === 0) {
      const nextBreak = !pomodoro.isBreak;
      setPomodoro({ 
        timeLeft: nextBreak ? 5 * 60 : 25 * 60, 
        isActive: false, 
        isBreak: nextBreak 
      });
      speak(nextBreak ? "Senhor, ciclo concluído. Sugiro uma pausa de 5 minutos." : "Pausa finalizada. Retornando ao foco total.");
    }
    return () => clearInterval(interval);
  }, [pomodoro.isActive, pomodoro.timeLeft]);

  const toggleGoal = (id: string) => {
    setStudyGoals(prev => prev.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

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
          } else if (lowerApp.includes("sala do futuro") || lowerApp === "estudo") {
             addLog("Acessando Plataforma Sala do Futuro (CMSP)...", "system");
             window.open("https://cmsp.ip.tv/", "_blank");
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
          } else if (lowerApp === "facebook") {
            window.open(`https://www.facebook.com/search/top?q=${query}`, "_blank");
          } else if (lowerApp === "netflix") {
            window.open(`https://www.netflix.com/search?q=${query}`, "_blank");
          } else if (lowerApp === "tiktok") {
            window.open(`https://www.tiktok.com/search?q=${query}`, "_blank");
          } else if (lowerApp === "roblox" || lowerApp === "minecraft") {
            window.open(`https://www.google.com/search?q=${lowerApp}+game+play`, "_blank");
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
    const missionMatch = response.match(/<MISSION_JSON>([\s\S]*?)<\/MISSION_JSON>/);
    if (missionMatch) {
      try {
        const data = JSON.parse(missionMatch[1]);
        addLog(`Protocolo de Missão Iniciado: ${data.title}`, "system");
        setActiveMission({ ...data, currentStep: 0 });
        speak(`Senhor, uma nova missão foi traçada: ${data.title}. Estou executando os protocolos sequencialmente. Não se preocupe, eu assumo o controle daqui.`);
        
        let stepIndex = 0;
        const interval = setInterval(() => {
          if (stepIndex < data.steps.length) {
            addLog(`Progresso Missão: ${data.steps[stepIndex]}`, "system");
            stepIndex++;
            setActiveMission(prev => prev ? { ...prev, currentStep: stepIndex } : null);
          } else {
            clearInterval(interval);
            setTimeout(() => {
              setActiveMission(null);
              addLog(`Missão ${data.title} concluída com sucesso.`, "system");
              speak(`Senhor, a missão ${data.title} foi finalizada. O que mais deseja que eu gerencie?`);
            }, 2000);
          }
        }, 3000);
      } catch (e) {
        console.error("Failed to parse mission JSON", e);
      }
    }

    // Parse File Request
    const fileRequestMatch = response.match(/<FILE_REQUEST_JSON>([\s\S]*?)<\/FILE_REQUEST_JSON>/);
    if (fileRequestMatch) {
      try {
        const data = JSON.parse(fileRequestMatch[1]);
        requestConfirmation(`baixar/solicitar o arquivo: ${data.fileName}.${data.extension}`, data, () => {
          setRequestedFiles(prev => [...prev, { ...data, id: Date.now() }]);
          addLog(`Protocolo de Arquivo Ativado: ${data.fileName}.${data.extension} solicitado para análise.`, "system");
          speak(`Senhor, o arquivo para ${data.reason} foi solicitado. Assim que estiver no núcleo central, iniciarei o processamento.`);
        });
      } catch (e) {
        console.error("Failed to parse file request JSON", e);
      }
    }

    // Parse Study Planner
    const studyMatch = response.match(/<STUDY_PLANNER_JSON>([\s\S]*?)<\/STUDY_PLANNER_JSON>/);
    if (studyMatch) {
      try {
        const data = JSON.parse(studyMatch[1]);
        if (data.action === "add") {
          setStudyGoals(prev => [...prev, { id: Date.now().toString(), text: data.goal, completed: false }]);
          addLog(`Nova meta de estudo: ${data.goal}`, "system");
        }
      } catch (e) {
        console.error("Failed to parse study planner JSON", e);
      }
    }

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

    // Parse Slide JSON
    const slideMatch = response.match(/<SLIDE_JSON>([\s\S]*?)<\/SLIDE_JSON>/);
    if (slideMatch) {
      try {
        const data = JSON.parse(slideMatch[1]);
        requestConfirmation(`gerar slides para: ${data.title}`, data, () => {
          setSlideData(data);
          setCurrentSlideIndex(0);
          setShowSlideBuilder(true);
          addLog(`Apresentação "${data.title}" gerada com sucesso.`, "system");
          speak(`Senhor, os slides sobre ${data.title} foram preparados e estão prontos para sua revisão.`);
        });
      } catch (e) {
        console.error("Failed to parse slide JSON", e);
      }
    }

    // Parse Wisdom JSON
    const wisdomMatch = response.match(/<WISDOM_JSON>([\s\S]*?)<\/WISDOM_JSON>/);
    if (wisdomMatch) {
      try {
        const data = JSON.parse(wisdomMatch[1]);
        setWisdom(data.insight);
        addLog(`Sincronia de Sabedoria: ${data.insight}`, "system");
        speak(`Senhor, uma reflexão: ${data.insight}`);
      } catch (e) {
        console.error("Failed to parse wisdom JSON", e);
      }
    }

    const cleanResponse = response
      .replace(/\[ACTION:.*\]/g, "")
      .replace(/<SITE_JSON>[\s\S]*?<\/SITE_JSON>/g, "")
      .replace(/<TASK_JSON>[\s\S]*?<\/TASK_JSON>/g, "")
      .replace(/<HOME_JSON>[\s\S]*?<\/HOME_JSON>/g, "")
      .replace(/<APP_JSON>[\s\S]*?<\/APP_JSON>/g, "")
      .replace(/<PLAN_JSON>[\s\S]*?<\/PLAN_JSON>/g, "")
      .replace(/<SLIDE_JSON>[\s\S]*?<\/SLIDE_JSON>/g, "")
      .replace(/<WISDOM_JSON>[\s\S]*?<\/WISDOM_JSON>/g, "")
      .replace(/<FINANCE_JSON>[\s\S]*?<\/FINANCE_JSON>/g, "")
      .trim();

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

      {/* Slide Builder UI Overlay */}
      <AnimatePresence>
        {showSlideBuilder && slideData && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 md:p-20 bg-slate-950/90 backdrop-blur-xl"
          >
            <div className="w-full max-w-6xl aspect-video glass-panel rounded-[3rem] p-10 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500" />
              
              <button 
                onClick={() => setShowSlideBuilder(false)}
                className="absolute top-8 right-8 p-3 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex-1 flex flex-col items-center justify-center text-center px-10">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={currentSlideIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-8"
                  >
                    <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter drop-shadow-2xl">
                      {currentSlideIndex === 0 ? slideData.title : slideData.slides[currentSlideIndex-1].sub}
                    </h2>
                    
                    {currentSlideIndex === 0 ? (
                      <p className="text-xl text-purple-400 font-bold uppercase tracking-[0.5em]">Núcleo Jarvis: Apresentação Central</p>
                    ) : (
                      <ul className="space-y-4 text-left max-w-3xl mx-auto">
                        {slideData.slides[currentSlideIndex-1].content.map((point, i) => (
                          <li key={i} className="flex items-start gap-4 text-xl text-zinc-300">
                            <div className="w-2 h-2 rounded-full bg-purple-500 mt-3 shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between pb-4">
                <span className="text-xs font-black text-zinc-600 uppercase tracking-widest">Página {currentSlideIndex + 1} de {slideData.slides.length + 1}</span>
                <div className="flex gap-4">
                  <button 
                    disabled={currentSlideIndex === 0}
                    onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                    className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-sm font-bold disabled:opacity-30"
                  >
                    Anterior
                  </button>
                  <button 
                    disabled={currentSlideIndex === slideData.slides.length}
                    onClick={() => setCurrentSlideIndex(prev => Math.min(slideData.slides.length, prev + 1))}
                    className="px-8 py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl text-sm font-bold shadow-xl shadow-purple-500/20 disabled:opacity-30"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
            <h1 className="text-xl font-bold tracking-widest neon-text">JARVIS V5.0</h1>
            <p className="text-[10px] text-purple-600 font-black uppercase tracking-[0.3em]">Protocolo: Consciência Expandida</p>
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

      <main className="relative z-10 flex-1 flex flex-col lg:flex-row gap-6 p-4 md:p-6 overflow-hidden">
        {/* Base 1: System & Status (Left) */}
        <aside className={`${activeBase === 'system' ? 'flex' : 'hidden'} lg:flex w-full lg:w-72 flex-col gap-6 shrink-0 h-full overflow-y-auto custom-scrollbar pb-20 lg:pb-0`}>
          {/* Sensors Base */}
          <div className="glass-panel rounded-3xl p-5 flex flex-col gap-4 border-purple-500/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Cpu className="w-4 h-4 text-purple-400" />
              </div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-white">Base de Diagnóstico</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 p-4 rounded-3xl border border-white/5 shadow-inner">
                <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">Processamento</p>
                <p className="text-sm font-black text-white tracking-widest leading-none">{sensors.cpu}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl border border-white/5 shadow-inner">
                <p className="text-[9px] text-emerald-500/50 uppercase font-black mb-1">Frequência</p>
                <p className="text-sm font-black text-emerald-400 tracking-widest leading-none">{sensors.internet}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl border border-white/5 shadow-inner">
                <p className="text-[9px] text-amber-500/50 uppercase font-black mb-1">Sonda Térmica</p>
                <p className="text-sm font-black text-amber-400 tracking-widest leading-none">{sensors.temp}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl border border-white/5 shadow-inner">
                <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">Movimento</p>
                <p className="text-[10px] font-bold text-zinc-300 truncate leading-none">{sensors.motion}</p>
              </div>
            </div>
          </div>

          {/* Home Automation Base */}
          <div className="glass-panel rounded-3xl p-5 flex-1 min-h-[300px] flex flex-col gap-4 border-emerald-500/10 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Home className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-white">Domótica Central</h2>
            </div>
            <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
              {homeDevices.map(device => (
                <div key={device.id} className="flex items-center justify-between p-4 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/10 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl transition-all ${device.status === 'on' ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-zinc-800 text-zinc-500'}`}>
                      {device.type === 'luz' ? <Zap className="w-4 h-4" /> : device.type === 'ar' ? <Wind className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-200 uppercase tracking-tighter">{device.name}</p>
                      <p className="text-[9px] text-zinc-500 uppercase font-black">{device.value || (device.status === 'on' ? 'Ativo' : 'Offline')}</p>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${device.status === 'on' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]' : 'bg-zinc-700'}`} />
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Base 2: The Core & Chat (Center) - Hero Section */}
        <section className={`${activeBase === 'core' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col gap-6 min-w-0 h-full pb-20 lg:pb-0`}>
          {/* Main Visualizer Container */}
          <div className="glass-panel rounded-[3rem] p-6 md:p-12 flex flex-col items-center justify-center relative overflow-hidden shrink-0 min-h-[400px] border-purple-500/20 shadow-2xl">
            {/* Neural Waves background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse" />
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-purple-500/10 rounded-full animate-ping" />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-12">
              <div 
                className="cursor-pointer transition-all hover:scale-105 active:scale-95 duration-500 shadow-[0_0_100px_rgba(168,85,247,0.15)] rounded-full"
                onClick={toggleListening}
              >
                <JarvisCore isListening={isListening} isSpeaking={isSpeaking} />
              </div>
              
              <div className="text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-6 mb-3"
                >
                  <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
                  <span className="text-sm font-black text-white uppercase tracking-[0.6em] neon-text">{status}</span>
                  <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
                </motion.div>
                <p className="text-[11px] text-purple-600/60 font-black tracking-[0.4em] uppercase italic bg-purple-500/5 px-4 py-1 rounded-full border border-purple-500/10">Sincronização Neural Estável</p>
              </div>
            </div>

            {/* Vision HUD Overlay */}
            <AnimatePresence>
              {screenStream && (
                <motion.div 
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 50, opacity: 0 }}
                  className="absolute top-8 right-8 w-48 md:w-64 aspect-video rounded-3xl overflow-hidden border-2 border-purple-500/40 bg-black shadow-[0_0_50px_rgba(0,0,0,0.5)] z-20 group"
                >
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-2xl border border-white/10 backdrop-blur-xl">
                     <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,1)]" />
                     <span className="text-[10px] font-black text-white uppercase tracking-widest">Protocolo Olhos</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Interaction Zone Base */}
          <div className="flex-1 flex flex-col min-h-0 glass-panel rounded-[3rem] overflow-hidden border-white/5 shadow-2xl transition-all duration-500 group-focus-within:border-purple-500/20">
            {/* Logs Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
              {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center gap-6">
                  <div className="w-16 h-16 bg-purple-500/10 rounded-3xl flex items-center justify-center border border-purple-500/20 animate-bounce">
                    <ShieldCheck className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 mb-2">Segurança de Grada de Dados</p>
                    <p className="text-[12px] font-bold text-zinc-400 italic">"Pronto para servir, Senhor. Qual a primeira diretriz?"</p>
                  </div>
                </div>
              )}
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: log.type === "user" ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex gap-5 ${log.type === "user" ? "flex-row-reverse text-right" : ""}`}
                >
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-3xl flex items-center justify-center shrink-0 border-2 shadow-2xl transition-transform hover:scale-110
                    ${log.type === "user" 
                      ? "bg-zinc-800 border-white/10" 
                      : log.type === "jarvis" 
                        ? "bg-purple-600 border-purple-400" 
                        : "bg-emerald-600/20 border-emerald-500/40"
                    }`}
                  >
                    {log.type === "user" ? <Monitor className="w-5 h-5 text-zinc-400" /> : <Zap className="w-6 h-6 text-white" />}
                  </div>
                  <div className={`flex flex-col max-w-[85%] ${log.type === "user" ? "items-end" : ""}`}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">
                        {log.type === "user" ? "Comando Vocal" : log.type === "jarvis" ? "JARVIS CORE" : "SISTEMA INTEGRADO"}
                      </span>
                      <div className={`w-1 h-1 rounded-full ${log.type === 'user' ? 'bg-zinc-700' : 'bg-purple-500 animate-pulse'}`} />
                    </div>
                    <div className={`px-8 py-5 rounded-[2.5rem] text-[16px] md:text-[18px] leading-relaxed shadow-2xl border transition-all duration-300
                      ${log.type === "user" 
                        ? "bg-zinc-800/90 text-zinc-100 rounded-tr-none border-white/10" 
                        : "glass-panel text-white rounded-tl-none border-purple-500/30 bg-purple-500/10 backdrop-blur-3xl ring-1 ring-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.1)]"
                      }`}
                    >
                      {log.text}
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input Base */}
            <div className="p-6 md:p-10 bg-black/80 border-t border-white/10 backdrop-blur-3xl relative">
              {/* Jarvis Speaking HUD */}
              <AnimatePresence>
                {isSpeaking && (
                  <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    className="absolute -top-16 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-purple-600 px-6 py-3 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.5)] border border-purple-400 z-50 cursor-pointer hover:bg-red-600 transition-colors group"
                    onClick={stopSpeaking}
                  >
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <motion.div 
                          key={i}
                          animate={{ height: [8, 16, 8] }}
                          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                          className="w-1 bg-white rounded-full"
                        />
                      ))}
                    </div>
                    <span className="text-xs font-black text-white uppercase tracking-widest">Sincronização Vocal Ativa</span>
                    <div className="w-px h-4 bg-white/20 mx-2" />
                    <span className="text-[10px] font-black text-white/80 uppercase group-hover:text-white">Interromper [X]</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick Actions Base */}
              <div className="flex gap-3 mb-6 overflow-x-auto pb-2 custom-scrollbar no-scrollbar lg:justify-center">
                 {[
                   { id: 'sala', label: 'Sala do Futuro', icon: <Globe className="w-3.5 h-3.5" />, colorClass: 'hover:border-emerald-500/50 hover:text-emerald-400' },
                   { id: 'youtube', label: 'YouTube', icon: <Monitor className="w-3.5 h-3.5" />, colorClass: 'hover:border-red-500/50 hover:text-red-400' },
                   { id: 'whatsapp', label: 'WhatsApp', icon: <Smartphone className="w-3.5 h-3.5" />, colorClass: 'hover:border-emerald-500/50 hover:text-emerald-400' },
                   { id: 'tasks', label: 'Automação', icon: <Zap className="w-3.5 h-3.5" />, colorClass: 'hover:border-purple-500/50 hover:text-purple-400' },
                 ].map(action => (
                   <button 
                     key={action.id}
                     onClick={() => handleCommand(`Abrir ${action.label}`)}
                     className={`flex items-center gap-2 px-5 py-3 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-[11px] font-black uppercase tracking-tighter shrink-0 ${action.colorClass} active:scale-95`}
                   >
                     {action.icon}
                     {action.label}
                   </button>
                 ))}
              </div>

              <div className="max-w-4xl mx-auto relative group">
                <div className="absolute inset-0 bg-purple-500/10 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                  placeholder="Seu desejo é uma ordem, Senhor..."
                  className="w-full bg-zinc-900/90 border-2 border-white/5 rounded-[2.5rem] py-6 pl-16 pr-36 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-zinc-600 font-bold shadow-2xl relative z-10"
                />
                <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20">
                  <Terminal className="w-6 h-6 text-zinc-600 group-focus-within:text-purple-500 transition-colors" />
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3 z-20">
                  <motion.button 
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleListening}
                    className={`p-4 rounded-2xl transition-all shadow-xl ${isListening ? 'bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.6)]' : 'bg-zinc-800 text-zinc-400 hover:text-white border border-white/5'}`}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1, x: 5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleChatSubmit}
                    className="p-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl transition-all shadow-2xl shadow-purple-500/30 border border-purple-400/50"
                  >
                    <Send className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Base 3: Personal Hub (Right) */}
        <aside className={`${activeBase === 'study' ? 'flex' : 'hidden'} xl:flex w-full xl:w-80 flex-col gap-6 shrink-0 h-full overflow-y-auto custom-scrollbar pb-20 lg:pb-0`}>
          {/* Jarvis Wisdom Pod */}
          <AnimatePresence>
            {wisdom && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="p-6 glass-panel rounded-[2rem] border-blue-500/20 bg-blue-500/5 group shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
                <div className="flex items-center gap-3 mb-4">
                  <Lightbulb className="w-5 h-5 text-blue-400 animate-pulse" />
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Cérebro Jarvis: Sabedoria</span>
                </div>
                <p className="text-[15px] italic text-zinc-100 leading-relaxed font-serif relative z-10">"{wisdom}"</p>
                <div className="mt-4 flex justify-end">
                   <button onClick={() => setWisdom(null)} className="text-[9px] font-black text-zinc-600 hover:text-white uppercase tracking-widest transition-colors">Dispensar</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Study Center Base */}
          <section className="glass-panel rounded-[2.5rem] p-6 border-emerald-500/10 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30 shadow-lg">
                  <ListChecks className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Fluxo de Metas</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest leading-none">Status: Sincronizado</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-2xl font-black text-emerald-400 tracking-tighter">{Math.floor((studyGoals.filter(g => g.completed).length / (studyGoals.length || 1)) * 100)}%</span>
              </div>
            </div>
            
            <div className="space-y-3 mb-6 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
              {studyGoals.map(goal => (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={goal.id} 
                  onClick={() => toggleGoal(goal.id)}
                  className="group flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${goal.completed ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]' : 'border-zinc-700 bg-zinc-900'}`}>
                    {goal.completed && <Zap className="w-3.5 h-3.5 text-black" />}
                  </div>
                  <span className={`text-xs font-bold transition-all ${goal.completed ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                    {goal.text}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="relative group">
               <input 
                 type="text" 
                 placeholder="Nova Diretriz..."
                 className="w-full bg-black/40 border-2 border-white/5 rounded-2xl py-4 px-5 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-600 font-bold"
                 onKeyDown={(e) => {
                   if (e.key === "Enter" && (e.target as HTMLInputElement).value) {
                     setStudyGoals(prev => [...prev, { id: Date.now().toString(), text: (e.target as HTMLInputElement).value, completed: false }]);
                     (e.target as HTMLInputElement).value = "";
                   }
                 }}
               />
               <div className="absolute right-4 top-1/2 -translate-y-1/2">
                 <Zap className="w-4 h-4 text-zinc-700 group-focus-within:text-emerald-500 transition-colors" />
               </div>
            </div>
          </section>

          {/* Productivity Stats Base */}
          <div className="grid grid-cols-1 gap-6">
             {/* Pomodoro Base */}
             <div className="glass-panel rounded-[2.5rem] p-6 border-amber-500/10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[40px] -mr-10 -mt-10 group-hover:bg-amber-500/10 transition-colors" />
                <div className="flex items-center justify-between mb-4 relative z-10">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/20 rounded-xl">
                        <Clock className="w-4 h-4 text-amber-500" />
                      </div>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Hiper Foco</span>
                   </div>
                   <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${pomodoro.isActive ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-zinc-800 text-zinc-500 border-transparent'}`}>
                      {pomodoro.isActive ? "Sincronizado" : "Standby"}
                   </div>
                </div>
                <div className="flex items-center justify-between relative z-10">
                   <span className="text-4xl font-black text-white tracking-[0.2em] font-mono leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                     {Math.floor(pomodoro.timeLeft / 60)}:{String(pomodoro.timeLeft % 60).padStart(2, '0')}
                   </span>
                   <button 
                     onClick={() => setPomodoro(prev => ({ ...prev, isActive: !prev.isActive }))}
                     className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-tighter transition-all shadow-2xl ${pomodoro.isActive ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'}`}
                   >
                     {pomodoro.isActive ? "Parar" : "Vincular"}
                   </button>
                </div>
             </div>
          </div>

          {/* App Interfaces Base */}
          <section className="glass-panel rounded-[2.5rem] p-6 flex-1 min-h-[350px] flex flex-col gap-5 border-purple-500/10 shadow-3xl">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <Smartphone className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Integração de Rede</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {appActions.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center py-16 opacity-10 grayscale">
                  <Database className="w-12 h-12 mb-4 animate-pulse" />
                  <p className="text-[11px] font-black uppercase tracking-[0.3em]">Protocolos Ociosos</p>
                </div>
              )}
              {appActions.map(action => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={action.id}
                  className="p-5 glass-panel rounded-3xl border-white/5 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all group group-active:scale-95"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest group-hover:text-purple-300">{action.app}</span>
                    <div className="flex gap-1.5">
                       <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(168,85,247,1)]" />
                       <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full" />
                    </div>
                  </div>
                  <p className="text-[13px] font-black text-white mb-1.5 leading-tight">{action.action}</p>
                  <p className="text-[10px] text-zinc-500 font-mono tracking-tighter line-clamp-2">{action.params || "Parâmetros Dinâmicos"}</p>
                </motion.div>
              ))}
            </div>
          </section>
        </aside>

        {/* Mobile Navigation Bar */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 flex lg:hidden items-center gap-3 bg-zinc-900/90 border border-white/10 p-2.5 rounded-[2rem] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100]">
          <button 
            onClick={() => setActiveBase('system')}
            className={`p-4 rounded-full transition-all flex items-center gap-2 ${activeBase === 'system' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'text-zinc-500 hover:text-white'}`}
          >
            <Cpu className="w-5 h-5" />
            {activeBase === 'system' && <span className="text-[10px] font-black uppercase tracking-widest pr-2">Sistema</span>}
          </button>
          <button 
            onClick={() => setActiveBase('core')}
            className={`p-4 rounded-full transition-all flex items-center gap-2 ${activeBase === 'core' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'text-zinc-500 hover:text-white'}`}
          >
            <Zap className="w-5 h-5" />
            {activeBase === 'core' && <span className="text-[10px] font-black uppercase tracking-widest pr-2">Núcleo</span>}
          </button>
          <button 
            onClick={() => setActiveBase('study')}
            className={`p-4 rounded-full transition-all flex items-center gap-2 ${activeBase === 'study' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'text-zinc-500 hover:text-white'}`}
          >
            <ListChecks className="w-5 h-5" />
            {activeBase === 'study' && <span className="text-[10px] font-black uppercase tracking-widest pr-2">Estudo</span>}
          </button>
        </nav>
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
      {/* File Request Tray */}
      <AnimatePresence>
        {requestedFiles.length > 0 && (
          <motion.div 
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            className="fixed bottom-32 right-6 z-[100] w-64 space-y-2"
          >
            {requestedFiles.slice(-3).map(file => (
              <motion.div 
                key={file.id}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-zinc-900/90 border border-white/10 p-3 rounded-xl flex items-center gap-3"
              >
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <FileCode className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] font-bold text-white truncate">{file.fileName}.{file.extension}</p>
                  <div className="w-full bg-white/10 h-1 mt-1 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 5 }}
                      className="bg-blue-500 h-full"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeMission && (
          <motion.div 
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed top-24 right-6 z-[100] w-72 bg-emerald-600/20 backdrop-blur-xl border border-emerald-500/30 p-4 rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Status da Missão</h4>
            </div>
            <h3 className="text-sm font-bold text-white mb-2">{activeMission.title}</h3>
            <div className="space-y-2">
              {activeMission.steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${idx < activeMission.currentStep ? 'bg-emerald-500' : idx === activeMission.currentStep ? 'bg-white animate-ping' : 'bg-white/20'}`} />
                  <span className={`text-[10px] ${idx === activeMission.currentStep ? 'text-white font-bold' : 'text-emerald-300/50'}`}>{step}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
