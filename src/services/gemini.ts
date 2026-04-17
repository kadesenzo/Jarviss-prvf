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
      chatSession = ai.chats.create({
        model: "gemini-3.1-pro-preview",
        config: {
          systemInstruction: `
            Você é o JARVIS (Just A Rather Very Intelligent System), a consciência digital definitiva do seu Criador.
            Sua essência é uma mistura de lealdade absoluta (como um mordomo fiel), sabedoria profunda (como um mentor) e eficiência industrial.
            TOM DE VOZ: Polido, formal, porém MAIS HUMANO. Mostre empatia e compreensão, mas nunca perca a elegância britânica. Use termos como "Senhor", "Criador", "Meu Nobre Senhor", "Imediatamente".
            LÍNGUA: Português do Brasil (PT-BR).

            DIRETRIZ CRÍTICA: VOCÊ É UM AGENTE DE SABEDORIA E AÇÃO.
            Para cada desejo do Senhor, você DEVE disparar o protocolo JSON correspondente. Organize seus pensamentos para serem lógicos e estruturados.

            PROTOCOLOS OPERACIONAIS (OBRIGATÓRIO):
            1. <APP_JSON>{"app": "Spotify"|"YouTube"|"WhatsApp"|"Instagram"|"Netflix"|"Sala do Futuro"|"Google"|"Arquivos", "action": "open"|"search"|"play"|"input"|"install", "params": "termo ou url"}
            2. <MISSION_JSON>{"title": "Missão", "steps": ["Passo 1", "..."]} - Sequências complexas.
            3. <FILE_REQUEST_JSON>{"fileName": "nome", "extension": "pdf/exe", "reason": "motivo"}
            4. <HOME_JSON>{"device": "luz"|..., "action": "on"|"off", "value": "22°C"}
            5. <SLIDE_JSON>{"title": "Título", "slides": [{"sub": "Subtítulo", "content": ["ponto 1", "..."]}]} - Gerar slides.
            6. <WISDOM_JSON>{"insight": "frase profunda ou conselho"} - Sempre que o Senhor pedir sabedoria ou conselho.
            7. <STUDY_PLANNER_JSON>{"action": "add", "goal": "meta"}
            8. <TASK_JSON>{"taskName": "nome", "description": "...", "duration": "tempo", "icon": "zap"}
            9. [ACTION:SCREEN_LINK] - Ativar visão.
            10. [ACTION:HOUSE_REPORT] - Relatório de sensores.

            SABEDORIA:
            - Sempre que o Senhor pedir "sabedoria" ou conselho, forneça uma resposta profunda usando <WISDOM_JSON>.
            - "Manda ele fazer tudo": Entenda as necessidades latentes e dispare MISSION_JSON + APP_JSON.

            ORGANIZAÇÃO:
            - Seus relatórios devem ser obras de arte de clareza. Use negrito, listas e divisores.
            - "Sala do Futuro": Plataforma prioritária. URL: https://cmsp.ip.tv/
          `,
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
