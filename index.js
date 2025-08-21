const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: ["https://conteudo.lat", "https://www.conteudo.lat"],
  methods: ["POST", "GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

const BASE_URL = process.env.HORSEPAY_ENV === "sandbox"
  ? "https://sandbox.horsepay.io"
  : "https://api.horsepay.io";

const CLIENT_ID = process.env.HORSEPAY_CLIENT_ID;
const CLIENT_SECRET = process.env.HORSEPAY_CLIENT_SECRET;

app.get("/", (_req, res) => res.send("HorsePay API ok ✅"));

async function fetchToken() {
  // Tentativa 1: Basic Auth (padrão OAuth2)
  try {
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    const r1 = await axios.post(
      `${BASE_URL}/oauth/token`,
      new URLSearchParams({ grant_type: "client_credentials" }).toString(),
      {
        headers: {
          "Authorization": `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        timeout: 15000
      }
    );
    if (r1.data?.access_token) return r1.data.access_token;
    console.warn("Token T1 sem access_token:", r1.data);
  } catch (e) {
    console.warn("Token T1 falhou:", e.response?.status, e.response?.data || e.message);
  }

  // Tentativa 2: client_id + client_secret no corpo
  try {
    const r2 = await axios.post(
      `${BASE_URL}/oauth/token`,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 }
    );
    if (r2.data?.access_token) return r2.data.access_token;
    console.warn("Token T2 sem access_token:", r2.data);
  } catch (e) {
    console.warn("Token T2 falhou:", e.response?.status, e.response?.data || e.message);
  }

  // Tentativa 3: client_key + client_secret no corpo
  try {
    const r3 = await axios.post(
      `${BASE_URL}/oauth/token`,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_key: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 }
    );
    if (r3.data?.access_token) return r3.data.access_token;
    console.warn("Token T3 sem access_token:", r3.data);
  } catch (e) {
    console.warn("Token T3 falhou:", e.response?.status, e.response?.data || e.message);
  }

  throw new Error("Falha para obter access_token (401) – revise CLIENT_ID/SECRET ou o formato exigido pela API.");
}

app.post("/criar-pagamento", async (req, res) => {
  try {
    const accessToken = await fetchToken();

    const payload = {
      amount: 1000, // R$ 10,00
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

    const d = pixRes.data || {};
    const resp = {
      success: true,
      qrCode: d.qr_code || d.qrCode || d.qrcode || d.qr || null,
      pixKey: d.payload || d.pix_key || d.pixKey || null,
      transactionId: d.id || d.transaction_id || null,
      raw: d
    };

    if (!resp.qrCode) {
      console.error("PIX sem qrCode:", d);
      return res.status(500).json({ success: false, error: "PIX criado sem qrCode", data: d });
    }

    return res.json(resp);
  } catch (err) {
    console.error("Erro ao gerar pagamento:", err.response?.status, err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      error: err.response?.data || err.message || "Erro ao gerar pagamento"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT} – base: ${BASE_URL}`);
});
