import { Ollama } from 'ollama'

export const ollama = new Ollama({ host: process.env.OLLAMA_BASE_URL || 'http://localhost:11434' })

export const MODEL = process.env.OLLAMA_MODEL || 'qwen:7b'

export async function chat(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await ollama.chat({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  })
  return response.message.content
}
