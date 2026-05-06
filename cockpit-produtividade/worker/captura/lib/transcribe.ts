/**
 * Groq Whisper — transcrição de voice notes.
 *
 * Modelo: whisper-large-v3-turbo, language=pt, temp=0.
 * Vocabulary biasing via parameter `prompt`.
 */

import Groq from "groq-sdk"

let client: Groq | null = null
function getClient() {
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return client
}

export async function transcribe(
  audioBuffer: Buffer,
  opts: { vocabulary?: string[]; language?: string } = {},
): Promise<{ text: string; durationMs: number }> {
  const start = Date.now()
  const groq = getClient()

  const file = new File([audioBuffer as unknown as BlobPart], "voice.ogg", { type: "audio/ogg" })

  const promptHint = opts.vocabulary?.length
    ? `Termos relevantes: ${opts.vocabulary.join(", ")}.`
    : undefined

  const res = await groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3-turbo",
    language: opts.language ?? "pt",
    prompt: promptHint,
    response_format: "json",
    temperature: 0,
  })

  return { text: (res.text ?? "").trim(), durationMs: Date.now() - start }
}
