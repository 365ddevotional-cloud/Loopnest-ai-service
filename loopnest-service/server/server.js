const express = require("express")
const cors = require("cors")

const app = express()

app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 8080

app.get("/", (req, res) => {
  res.send("LoopNest AI Service Running")
})

app.post("/generate-game", (req, res) => {
  const { theme, ageGroup } = req.body

  res.json({
    title: "Adventure Quest",
    type: "platformer",
    theme: theme || "adventure",
    ageGroup: ageGroup || "all",
    objective: "Collect items and avoid obstacles",
    difficulty: "easy"
  })
})

app.post("/generate-quiz", (req, res) => {
  const { topic } = req.body

  res.json({
    title: `${topic || "General"} Quiz`,
    questions: [
      {
        question: "Which animal is the fastest?",
        options: ["Lion","Cheetah","Tiger","Horse"],
        answer: "Cheetah"
      }
    ]
  })
})

app.post("/generate-puzzle", (req, res) => {
  const { theme } = req.body

  res.json({
    type: "word-puzzle",
    theme: theme || "nature",
    words: ["tree","river","mountain"]
  })
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
