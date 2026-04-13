const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const app = express();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // your secret key
app.use(cors());
app.use(express.json());


const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log(err));

const UserSchema = new mongoose.Schema({
  email: String,
  password: String
});

const User = mongoose.model("User", UserSchema);


// ✅ Ollama Local API
// const OLLAMA_API_URL = "http://localhost:11434/api/chat";

// app.post("/chat", async (req, res) => {
//   try {
//     const userPrompt = req.body.prompt;

//     const response = await fetch(OLLAMA_API_URL, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         model: "gemma2:2b",   // 🔑 use Gemma 2B
//         messages: [
//           { role: "system", content: "You are a gym coach AI to give workout and diet plans. If anything else asked say I can only answer workout, meal plan related queries and nothing else. Answer in 7 sentence max" },
//           { role: "user", content: userPrompt }
//         ],
//         stream: false
//       })
//     });

//     const data = await response.json();
//     console.log("Ollama response:", data);

//     if (data.message?.content) {
//       res.json({ reply: data.message.content });
//     } else {
//       res.json({ reply: "⚠️ No response from local model." });
//     }
//   } catch (err) {
//     console.error("Server error:", err);
//     res.status(500).json({ reply: "⚠️ Server error, please try again." });
//   }
// });


app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.json({ message: "User already exists" });
    }

    const newUser = new User({ email, password });
    await newUser.save();

    res.json({ message: "Signup successful" });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});


app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, password });

    if (user) {
      res.json({ message: "Login successful" });
    } else {
      res.json({ message: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});


app.post("/create-checkout-session", async (req, res) => {
  const { amount, name } = req.body;

  try { 
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name },
            unit_amount: amount, // in cents
          },
          quantity: 1,
        },
      ],
      success_url: `https://fitness-club-brown.vercel.app//result.html?status=success`,
cancel_url: `https://fitness-club-brown.vercel.app//result.html?status=cancel`,
    });

    // Return the URL for the hosted checkout page
    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: "Stripe error" });
  }
});



app.get("/", (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, "public/index.html"), "utf8");
  // Replace a placeholder with the publishable key
  html = html.replace("{{STRIPE_PUBLISHABLE_KEY}}", process.env.STRIPE_PUBLISHABLE_KEY);
  res.send(html);
});



const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
