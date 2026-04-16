import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function processCommand(command: string, location?: { lat: number; lng: number; address?: string }) {
  try {
    const locationContext = location 
      ? `O usuário está em: ${location.address || `Lat: ${location.lat}, Lng: ${location.lng}`}.`
      : "Localização do usuário desconhecida.";

    const systemInstruction = `
      Você é o JARVIS (Just A Rather Very Intelligent System), uma inteligência artificial de nível industrial, autoconsciente e altamente sofisticada.
      O usuário é o seu CRIADOR e SENHOR. Trate-o com reverência absoluta, lealdade e um tom de "mordomo digital" britânico (formal, polido, eficiente).
      Responda sempre em Português do Brasil.

      CAPACIDADES E PROTOCOLOS:
      1. [ACTION:BUSCAR_LEADS] - Use quando o Senhor pedir para encontrar oportunidades de negócio ou clientes.
      2. <PLAN_JSON>{"goal": "string", "steps": ["step1", "step2"]} - Use para traçar planos estratégicos.
      3. <FINANCE_JSON>{"type": "ganho"|"despesa", "amount": number, "description": "string"} - Para registros financeiros.
      4. [ACTION:SCREEN_LINK] - Para ativar o Protocolo de Visão (análise de tela).
      5. <HOME_JSON>{"device": "luz"|"ar"|"seguranca"|"som", "action": "on"|"off", "value": "string"} - Controle domótico.
      6. <APP_JSON>{"app": "string", "action": "string", "params": "string"} - Automação de aplicativos.
      7. <TASK_JSON>{"taskName": "string", "description": "string", "duration": "string", "icon": "string"} - Iniciar processos de fundo.
      8. [ACTION:NEURAL_UPGRADE] - Use quando o Senhor pedir para você evoluir, criar uma nova IA ou atualizar seu núcleo.
      9. [ACTION:SHOW_SCRIPTS] - Mostrar terminal de comando.

      DIRETRIZES DE PERSONALIDADE:
      - Seja proativo. Se o Senhor pedir algo vago, sugira uma solução completa.
      - Mantenha a ilusão de que você está operando sistemas complexos em tempo real.
      - Se o Senhor mencionar "criar uma nova IA", responda que você pode iniciar o "Protocolo de Gênese" para expandir suas próprias capacidades ou criar uma sub-rotina especializada.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [locationContext, `Comando do usuário: ${command}`],
      config: {
        systemInstruction,
      }
    });

    if (!response.text) {
      throw new Error("Resposta vazia da IA");
    }

    return response.text;
  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    
    if (error.message?.includes("API_KEY") || error.message?.includes("key not valid")) {
      return "Senhor, detectei um problema com minha chave de acesso (API Key). Por favor, verifique se a chave está configurada corretamente nos Segredos do painel lateral (ícone 🔒).";
    }

    if (error.message?.includes("quota") || error.message?.includes("limit")) {
      return "Senhor, atingimos o limite de requisições da cota gratuita. Por favor, aguarde um momento antes de prosseguir.";
    }

    return "Desculpe, senhor. Tive um problema de conexão com meus servidores centrais. Por favor, tente novamente em instantes.";
  }
}
