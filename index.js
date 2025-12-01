const express = require("express");
const app = express();
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Servidor funcionando correctamente ✔️");
});

// Endpoint para verificar roles
app.post("/checkrole", (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: "Falta userId" });
    }

    // Aquí pones tu verificación real después
    res.json({ ok: true, role: "VIP" });
});

app.listen(3000, () => {
    console.log("Servidor iniciado en puerto 3000");
});
