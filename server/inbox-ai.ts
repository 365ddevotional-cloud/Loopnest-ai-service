import OpenAI from "openai";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const FALLBACK_RESPONSES: Record<string, string> = {
  Prayer: `We are praying for you.\n\nPsalm 147:3\n"He heals the brokenhearted and binds up their wounds."\n\nOur ministry team will respond soon.`,
  Counseling: `We are here for you.\n\nIsaiah 41:10\n"Fear not, for I am with you; be not dismayed, for I am your God."\n\nOur ministry team will respond soon.`,
  "Scripture Question": `Thank you for seeking God's Word.\n\nProverbs 2:6\n"For the Lord gives wisdom; from His mouth come knowledge and understanding."\n\nOur ministry team will respond soon.`,
  Support: `Thank you for reaching out.\n\nPhilippians 4:19\n"And my God will meet all your needs according to the riches of his glory in Christ Jesus."\n\nOur ministry team will respond soon.`,
  General: `Thank you for your message.\n\nJeremiah 29:11\n"For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future."\n\nOur ministry team will respond soon.`,
};

export async function generateAIEncouragement(category: string, userMessage: string): Promise<string> {
  const prefix = "This is an automated encouragement message while our ministry team reviews your request.\n\n";
  const suffix = "\n\nOur ministry team will respond soon.";

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a compassionate Christian ministry assistant for 365 Daily Devotional. Generate a brief, warm, scriptural encouragement response for a ${category} message. Include at least one Bible verse with the full reference and quoted text. Keep the response under 150 words. Do not provide counseling or theological advice — only encouragement and scripture. Use KJV translation for scripture.`,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const aiText = response.choices[0]?.message?.content?.trim();
    if (!aiText) throw new Error("Empty AI response");

    return prefix + aiText + suffix;
  } catch (error) {
    console.error("AI encouragement generation failed, using fallback:", error);
    return prefix + (FALLBACK_RESPONSES[category] || FALLBACK_RESPONSES.General);
  }
}
