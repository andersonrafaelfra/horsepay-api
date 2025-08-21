// index.js (Render)
const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();

// CORS – libere só seu domínio. (ou troque por app.use(cors()) para liberar geral)
app.use(cors({
  origin: ["https://conteudo.lat", "https://www.conteudo.lat"],
  methods: ["POST", "GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// ——— Config ———
const BASE_URL = process.env.HORSEPAY_ENV === "sandbox"
  ? "https://sandbox.horsepay.io" // ajuste se seu sandbox for diferente
  : "https://api.horsepay.io";     // host correto

const CLIENT_ID = process.env.HORSEPAY_CLIENT_ID;
const CLIENT_SECRET = process.env.HORSEPAY_CLIENT_SECRET;

// Rota de saúde (GET /) opcional
app.get("/", (_req, res) => {
  res.send("Horsepay API ok ✅");
});

// Cria pagamento PIX (R$ 10,00)
app.post("/criar-pagamento", async (req, res) => {
  try {
    // 1) Token OAuth2
    const tokenRes = await axios.post(
      `${BASE_URL}/oauth/token`,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 }
    );

    const accessToken = tokenRes.data?.access_token;
    if (!accessToken) {
      console.error("Sem access_token:", tokenRes.data);
      return res.status(500).json({ success: false, error: "Falha ao obter token" });
    }

    // 2) Criar cobrança PIX
    const payload = {
      amount: 1000, // R$ 10,00 em centavos
      description: "Acesso Premium",
      customer: {
        name: "Cliente Anônimo",
        email: "anon@sigilo.com",
        document: "00000000000"
      }
    };

    const pixRes = await axios.post(
      `${BASE_URL}/api/v1/payments/pix`,
      payload,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        timeout: 20000
      }
    );

    // Respostas comuns (ajuste os campos conforme a API retornar)
    const d = pixRes.data || {};
    const resp = {
      success: true,
      qrCode: d.qr_code || d.qrCode || d.qrcode || d.qr || null,
      pixKey: d.payload || d.pix_key || d.pixKey || null,
      transactionId: d.id || d.transaction_id || null,
      raw: d // útil pra depurar; remova em prod se quiser
    };

    if (!resp.qrCode) {
      console.error("Criou PIX mas não veio qrCode:", d);
      return res.status(500).json({ success: false, error: "PIX criado sem qrCode", data: d });
    }

    return res.json(resp);

  } catch (err) {
    // logs ricos pra você ver no Render
    const status = err.response?.status;
    const data = err.response?.data;
    console.error("Erro ao gerar pagamento:", { status, data, msg: err.message });
    return res.status(500).json({
      success: false,
      error: data?.error || data || err.message || "Erro ao gerar pagamento"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT} – base: ${BASE_URL}`);
});
