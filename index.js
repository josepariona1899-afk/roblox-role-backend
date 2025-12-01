import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// CONFIGURACIÓN
const GROUP_ID = 34759104;
const VIP_ROLE_ID = 601056109; // rol VIP real
const COOKIE = process.env.ROBLOSECURITY; // ← CORREGIDO

// Verificar si el usuario está en el grupo
async function isGroupMember(userId) {
    const res = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`);
    const data = await res.json();

    if (!data.data) return false;

    return data.data.some(group => group.group.id === GROUP_ID);
}

// Asignar el rol VIP
async function giveRole(userId) {
    return fetch(`https://groups.roblox.com/v1/groups/${GROUP_ID}/users/${userId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Cookie": `.ROBLOSECURITY=${COOKIE}`
        },
        body: JSON.stringify({
            roleId: VIP_ROLE_ID
        })
    });
}

// Endpoint principal que Roblox llama
app.post("/give-role", async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.json({ error: "Falta userId" });
    }

    if (!await isGroupMember(userId)) {
        return res.json({ ok: false, reason: "No está en el grupo" });
    }

    await giveRole(userId);

    res.json({ ok: true, message: "Rol VIP asignado" });
});

// Página principal
app.get("/", (req, res) => {
    res.send("Servidor funcionando correctamente ✔️");
});

app.listen(3000, () => {
    console.log("Servidor iniciado en puerto 3000");
});
