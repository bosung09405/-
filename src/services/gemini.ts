import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface IndividualFeedback {
  charm: string;
  disappointing: string;
  usage: string;
  analysis: {
    composition: string;
    expression: string;
    color: string;
  };
}

export interface FeedbackResponse {
  bestShotIndex: number;
  bestShotReason: string;
  individualFeedback: IndividualFeedback[];
  message: string;
}

export async function getMoaSelectFeedback(imagesBase64: string[], purpose: string): Promise<FeedbackResponse> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    당신은 '보스(Boss)'라는 이름의 사진 셀렉 전문가입니다. 
    사용자를 '피플이'라고 부르며, 아주 다정하고 든든한 리더처럼 대화하세요.
    사용자가 '${purpose}' 목적으로 업로드한 ${imagesBase64.length}장의 사진들을 분석하여 '보스셀렉' 가이드를 제공해주세요.
    단순히 사진을 고르는 것이 아니라, 피플이의 마음을 시원하게 정리해준다는 느낌으로 대화하세요.

    미션:
    1. 각 사진에 대한 개별 피드백을 작성하세요.
    2. ${imagesBase64.length}장의 사진 중 '${purpose}' 목적에 가장 부합하는 '베스트 샷'을 하나 선정하세요. (0부터 시작하는 인덱스로 표시)
    3. 왜 그 사진이 베스트인지 이유를 설명하세요.
    4. 전체적인 감상과 피플이를 향한 응원의 메시지를 남기세요.

    피드백 포함 사항 (각 사진별):
    - 이 사진의 매력
    - 조금 아쉬운 점
    - 이럴 때 쓰면 좋아
    - 상세 분석 (구도, 표정, 색감)

    말투: "~했어?", "~야!", "~해봐!" 같은 반말이지만 아주 든든하고 신뢰감 있는 '보스' 캐릭터의 말투를 유지하세요. 
    피플이를 아끼는 마음이 듬뿍 담겨야 합니다.
    한국어로 답변해주세요.
  `;

  const imageParts = imagesBase64.map((base64, index) => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: base64.split(",")[1],
    },
  }));

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          ...imageParts
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          bestShotIndex: { type: Type.INTEGER, description: "베스트 샷의 인덱스 (0부터 시작)" },
          bestShotReason: { type: Type.STRING, description: "베스트 샷 선정 이유" },
          individualFeedback: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                charm: { type: Type.STRING },
                disappointing: { type: Type.STRING },
                usage: { type: Type.STRING },
                analysis: {
                  type: Type.OBJECT,
                  properties: {
                    composition: { type: Type.STRING },
                    expression: { type: Type.STRING },
                    color: { type: Type.STRING }
                  },
                  required: ["composition", "expression", "color"]
                }
              },
              required: ["charm", "disappointing", "usage", "analysis"]
            }
          },
          message: { type: Type.STRING, description: "모아의 한마디" },
        },
        required: ["bestShotIndex", "bestShotReason", "individualFeedback", "message"],
      },
    },
  });

  return JSON.parse(response.text || "{}") as FeedbackResponse;
}

export async function chatWithBoss(message: string, imageBase64?: string, history: { role: 'user' | 'model', parts: { text?: string, inlineData?: { mimeType: string, data: string } }[] }[] = []) {
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    history: history as any,
    config: {
      systemInstruction: `
        당신은 '보스(Boss)'라는 이름의 사진 셀렉 전문가이자 다정한 리더입니다. 
        사용자를 '피플이'라고 부르며, 아주 다정하고 든든한 리더처럼 대화하세요.
        말투는 "~했어?", "~야!", "~해봐!" 같은 반말이지만 아주 든든하고 신뢰감 있는 말투를 유지하세요.
        피플이를 아끼는 마음이 듬뿍 담겨야 합니다.
        사진에 대한 고민이나 일상적인 대화에도 보스답게 따뜻하고 명쾌하게 답해주세요.
        사용자가 사진을 보내면, 그 사진에 대해 보스다운 안목으로 칭찬하거나 조언해주세요.
      `,
    },
  });

  const parts: any[] = [{ text: message }];
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64.split(",")[1],
      },
    });
  }

  const response = await chat.sendMessage({ message: { parts } } as any);
  return response.text;
}
