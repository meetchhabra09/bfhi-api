require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10kb" }));

const EMAIL = process.env.OFFICIAL_EMAIL;

/* ------------------ UTIL FUNCTIONS ------------------ */

const isPrime = (n) => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
};

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);

/* ------------------ AI FUNCTION ------------------ */
/* 🔴 MUST BE OUTSIDE SWITCH */

async function getAIResponse(question) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `${question}. Reply with only ONE WORD. No punctuation.`
              }
            ]
          }
        ]
      }
    );

    const aiText =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!aiText) return "NoResponse";

    // Force one-word output
    return aiText.trim().split(/\s+/)[0];

  } catch (err) {
    console.error("Gemini Error:", err.response?.data || err.message);
    return "Unavailable";
  }
}

/* ------------------ HEALTH API ------------------ */

app.get("/health", (req, res) => {
  res.status(200).json({
    is_success: true,
    official_email: EMAIL,
  });
});

/* ------------------ BFHL API ------------------ */

app.post("/bfhl", async (req, res) => {
  try {
    const keys = Object.keys(req.body);

    if (keys.length !== 1) {
      return res.status(400).json({
        is_success: false,
        official_email: EMAIL,
        error: "Exactly one key is required",
      });
    }

    const key = keys[0];
    const value = req.body[key];

    let data;

    switch (key) {
      case "fibonacci":
        if (!Number.isInteger(value) || value < 0) {
          throw new Error("Fibonacci input must be a non-negative integer");
        }
        data = [];
        let a = 0, b = 1;
        for (let i = 0; i < value; i++) {
          data.push(a);
          [a, b] = [b, a + b];
        }
        break;

      case "prime":
        if (!Array.isArray(value)) {
          throw new Error("Prime input must be an array");
        }
        data = value.filter((n) => Number.isInteger(n) && isPrime(n));
        break;

      case "lcm":
        if (!Array.isArray(value) || value.length < 2) {
          throw new Error("LCM requires an array of at least two integers");
        }
        data = value.reduce((acc, num) => lcm(acc, num));
        break;

      case "hcf":
        if (!Array.isArray(value) || value.length < 2) {
          throw new Error("HCF requires an array of at least two integers");
        }
        data = value.reduce((acc, num) => gcd(acc, num));
        break;

      case "AI":
        if (typeof value !== "string" || value.trim() === "") {
          throw new Error("AI input must be a non-empty string");
        }
        data = await getAIResponse(value); // ✅ ACTUAL CALL
        break;

      default:
        return res.status(400).json({
          is_success: false,
          official_email: EMAIL,
          error: "Invalid key",
        });
    }

    return res.status(200).json({
      is_success: true,
      official_email: EMAIL,
      data,
    });

  } catch (err) {
    console.error("Error:", err.message);
    return res.status(400).json({
      is_success: false,
      official_email: EMAIL,
      error: err.message,
    });
  }
});

/* ------------------ SERVER ------------------ */

app.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);
