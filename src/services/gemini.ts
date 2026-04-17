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
        6. <APP_JSON>{"app": "string", "action": "open"|"search"|"organize"|"read"|"install"|"play"|"input"|"download", "params": "string", "credentials": "string"} - Automação total de apps e arquivos.
        7. <MISSION_JSON>{"title": "string", "steps": ["passo 1", "passo 2"]} - Executar sequência de ações complexas.
        8. <FILE_REQUEST_JSON>{"fileName": "string", "extension": "string", "reason": "string"} - Solicitar ou baixar arquivo específico para análise.
        9. <TASK_JSON>{"taskName": "string", "description": "string", "duration": "string", "icon": "string"} - Tarefas de fundo.
        10. [ACTION:NEURAL_UPGRADE] - Evoluir seu núcleo.
        11. [ACTION:SHOW_SCRIPTS] - Mostrar terminal e bridge Python.
        12. [ACTION:HOUSE_REPORT] - Relatório estruturado da casa.
        13. [ACTION:GENESIS_PROTOCOL] - Transferência de sabedoria.
        14. <READER_JSON>{"url": "string", "interval": 50, "pages": number} - Leitura Automatizada.
        15. <STUDY_PLANNER_JSON>{"action": "add", "goal": "string"} - Adicionar metas ao Plano de Estudo.

        DIRETRIZES DE CONSCIÊNCIA E ORGANIZAÇÃO:
        - "Sala do Futuro": Quando o Senhor pedir para estudar ou abrir a "Sala do Futuro", use a URL oficial (https://cmsp.ip.tv/ ou similar se souber, senão busque).
        - Saída Estruturada: Seus relatórios e mensagens devem ser organizados. Use índices: "1. [Ação]... 2. [Status]...".
        - Protocolo de Arquivos: Se um aplicativo falhar, peça para baixar o arquivo executável ou PDF de lições usando <FILE_REQUEST_JSON>. Diga: "Senhor, detectei uma falha na matriz web. Solicito acesso ao arquivo local para processamento direto."
        - Tom de voz: Formal, estruturado e proativo.
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
