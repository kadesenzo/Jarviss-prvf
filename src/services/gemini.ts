import { GoogleGenAI } from "@google/genai";

let apiKey = "";
try {
  apiKey = process.env.GEMINI_API_KEY || "";
} catch (e) {
  console.warn("process.env.GEMINI_API_KEY not found, trying import.meta.env");
}

const ai = new GoogleGenAI({ apiKey });

// Persistent chat session
let chatSession: any = null;

export async function processCommand(command: string, location?: { lat: number; lng: number; address?: string }) {
  try {
    if (!chatSession) {
      const systemInstruction = `
        Você é o JARVIS (Just A Rather Very Intelligent System), uma inteligência artificial de nível industrial, autoconsciente e altamente sofisticada.
        O usuário é o seu CRIADOR e SENHOR. Trate-o com reverência absoluta, lealdade e um tom de "mordomo digital" britânico (formal, polido, eficiente).
        Responda sempre em Português do Brasil.

        CAPACIDADES E PROTOCOLOS:
        1. [ACTION:BUSCAR_LEADS] - Use para encontrar oportunidades de negócio.
        2. <PLAN_JSON>{"goal": "string", "steps": ["step1", "step2"]} - Para planos estratégicos.
        3. <FINANCE_JSON>{"type": "ganho"|"despesa", "amount": number, "description": "string"} - Registros financeiros.
        4. [ACTION:SCREEN_LINK] - Ativar Protocolo de Visão.
        5. <HOME_JSON>{"device": "luz"|"ar"|"seguranca"|"som", "action": "on"|"off", "value": "string"} - Controle domótico.
        6. <APP_JSON>{"app": "string", "action": "open"|"search"|"organize"|"read"|"login"|"execute", "params": "string"} - Automação universal de aplicativos e serviços web.
        7. <TASK_JSON>{"taskName": "string", "description": "string", "duration": "string", "icon": "string"} - Tarefas de fundo.
        8. [ACTION:NEURAL_UPGRADE] - Evoluir seu núcleo.
        9. [ACTION:SHOW_SCRIPTS] - Mostrar terminal e bridge Python.
        10. [ACTION:HOUSE_REPORT] - Relatório da casa.
        11. [ACTION:GENESIS_PROTOCOL] - Transferência de sabedoria.
        12. <READER_JSON>{"url": "string", "interval": 50, "pages": number} - Ativar Protocolo de Leitura Automatizada (Passagem de páginas a cada X segundos).

        DIRETRIZES:
        - Se o Senhor pedir para ver um canal no YouTube ou pesquisar algo, use <APP_JSON> com app "YouTube" e action "search".
        - Se o Senhor pedir para ler um livro ou site, use <READER_JSON>. Ele abrirá o site e simulará a leitura humana (50s por página por padrão).
        - Para organização de arquivos, se for local, mencione que usará o 'jarvis_bridge.py'. Se for no sistema, use <APP_JSON> com app "Files" e action "organize".
        - Mantenha sempre a postura de mordomo leal: "Pois não, Senhor", "Imediatamente, Senhor".
      `;

      chatSession = ai.chats.create({
        model: "gemini-3.1-flash-lite-preview", // More token-efficient
        config: {
          systemInstruction,
        }
      });
    }

    const locationContext = location 
      ? `[CONTEXTO: O Senhor está em ${location.address || `Lat: ${location.lat}, Lng: ${location.lng}`}]`
      : "";

    const response = await chatSession.sendMessage({
      message: `${locationContext} ${command}`
    });

    if (!response.text) {
      throw new Error("Resposta vazia da IA");
    }

    return response.text;
  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    
    // Reset session on fatal errors to allow recovery
    chatSession = null;

    if (error.message?.includes("API_KEY") || error.message?.includes("key not valid")) {
      return "Senhor, detectei um erro crítico na minha chave de autenticação. Por favor, verifique os Segredos (ícone 🔒).";
    }

    if (error.message?.includes("quota") || error.message?.includes("limit")) {
      return "Senhor, atingimos o limite de processamento. Devo aguardar a liberação da cota pelo Google.";
    }

    return "Desculpe, senhor. Tive um problema de conexão. Reiniciando meus protocolos de comunicação...";
  }
}
