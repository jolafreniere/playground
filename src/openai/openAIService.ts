import * as fs from "fs";
import OpenAI from "openai";
//models are gpt-3.5-turbo, gpt-3.5-turbo-16k, gpt-4, gpt-4-32k
import * as dotenv from 'dotenv';
dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.API_KEY,
});

export async function createCompletion(message: string, system :string = "You are a helpful assistant", max_tokens: number = 1000, model : string = "gpt-3.5-turbo") {

      const opt : OpenAI.Chat.ChatCompletionCreateParams = {
        model: "gpt-3.5-turbo",
        max_tokens: max_tokens,
      
        n: 1,
        temperature: 0.8,
        stream: false,
        messages: [
            {
              role: "system",
              content: system ,
            },
            {
              role: "user",
              content: message,
            },
          ]
      };
    const response = await openai.chat.completions.create(opt);
    return response.choices[0].message;
}
