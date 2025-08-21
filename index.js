const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

app.post("/criar-pagamento", async (req, res) => {
  try {
    const tokenResponse = await axios.post("https://api.horsepay.com/oauth/token", {
      client_id: process.env.HORSEPAY_CLIENT_ID,
      client_secret: process.env.HORSEPAY_CLIENT_SECRET,
      grant_type: "client_credentials"
    });

    const accessToken = tokenResponse.data.access_token;

    const pagamento = await axios.post(
      "https://api.horsepay.com/pix/create",
      {
        amount: 1000, // 10 reais em centavos
        description: "Pagamento de Teste",
        customer: {
          name: "Cliente Teste",
          email: "cliente@email.com",
          document: "12345678900"
        }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    res.json(pagamento.data);
  } catch (err) {
    console.error("Erro ao gerar pagamento:", err.response?.data || err.message);
    res.status(500).json({ error: "Erro ao gerar pagamento" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
