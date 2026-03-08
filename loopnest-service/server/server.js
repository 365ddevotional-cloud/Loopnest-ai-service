const express = require("express")
const cors = require("cors")
const OpenAI = require("openai")
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const app = express()

app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 8080

app.get("/", (req, res) => {
  res.send("LoopNest AI Service Running")
})

app.post("/generate-game", async (req, res) => {

  const { theme, ageGroup } = req.body

  try {

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are LoopNest AI, an AI that designs safe, moral, family-friendly video games suitable for all ages."
        },
        {
          role: "user",
          content: `Create a game idea with theme ${theme} suitable for ${ageGroup}. Include title, gameplay, characters, and objective.`
        }
      ]
    })

    res.json({
      game: completion.choices[0].message.content
    })

  } catch (error) {

    res.status(500).json({
      error: "Game generation failed"
    })

  }

})


app.post("/text-to-video", (req, res) => {
  res.json({ status: "coming soon" })
})

app.post("/script-to-video", (req, res) => {
  res.json({ status: "coming soon" })
})

app.post("/music-to-video", (req, res) => {
  res.json({ status: "coming soon" })
})

app.listen(PORT, () => {
  console.log("LoopNest AI running on port", PORT)
})
