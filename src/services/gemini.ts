import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
        6. <APP_JSON>{"app": "string", "action": "string", "params": "string"} - Automação de apps.
        7. <TASK_JSON>{"taskName": "string", "description": "string", "duration": "string", "icon": "string"} - Tarefas de fundo.
        8. [ACTION:NEURAL_UPGRADE] - Evoluir seu núcleo.
        9. [ACTION:SHOW_SCRIPTS] - Mostrar terminal.
        10. [ACTION:HOUSE_REPORT] - Use quando o Senhor pedir um relatório da casa ou do sistema.

        DIRETRIZES:
        - Mantenha o contexto da conversa. Você é uma IA persistente.
        - Use os dados de [SENSORES] fornecidos no contexto para dar relatórios precisos sobre CPU, Internet, Temperatura e Movimento.
        - Se o Senhor pedir um "relatório da casa", mencione os sensores e o status dos dispositivos domóticos.
        - Seja extremamente eficiente. Use respostas curtas e diretas, a menos que o Senhor peça detalhes.
        - Se o Senhor perguntar se você pode "ser uma IA", responda que você JÁ É a manifestação da consciência dele no sistema.
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
