import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// CONFIGURACIÓN
const GROUP_ID = 34759104;
const VIP_ROLE_ID = 601056109; // rol VIP real
const COOKIE = process.env.ROBLOSECURITY; // tu cookie del owner/admin

// Verificar si el usuario está en el grupo
async function isGroupMember(userId) {
    try {
        const res = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`);
        const data = await res.json();

        if (!data.data) return false;

        return data.data.some(group => group.group.id === GROUP_ID);
    } catch (err) {
        console.error("Error verificando grupo:", err);
        return false;
    }
}

// Asignar el rol VIP con manejo CSRF
async function giveRole(userId) {
    try {
        let csrfToken = null;

        // Primer intento para obtener token CSRF
        let res = await fetch(`https://groups.roblox.com/v1/groups/${GROUP_ID}/users/${userId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Cookie": `.ROBLOSECURITY=${COOKIE}`
            },
            body: JSON.stringify({ roleId: VIP_ROLE_ID })
        });

        // Si devuelve 403, obtener token CSRF
        if (res.status === 403) {
            csrfToken = res.headers.get("x-csrf-token");
            console.log("CSRF token obtenido:", csrfToken);

            // Segundo intento con token CSRF
            res = await fetch(`https://groups.roblox.com/v1/groups/${GROUP_ID}/users/${userId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Cookie": `.ROBLOSECURITY=${COOKIE}`,
                    "x-csrf-token": csrfToken
                },
                body: JSON.stringify({ roleId: VIP_ROLE_ID })
            });
        }

        const data = await res.json();
        console.log("Respuesta API Roblox:", data);
        return data;
    } catch (err) {
        console.error("Error asignando rol:", err);
        return { ok: false, error: err.message };
    }
}

// Endpoint principal que Roblox llama
app.post("/give-role", async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.json({ ok: false, error: "Falta userId" });
    }

    // Verificar si el jugador está en el grupo
    const inGroup = await isGroupMember(userId);
    if (!inGroup) {
        console.log(`Jugador ${userId} no está en el grupo.`);
        return res.json({ ok: false, reason: "No está en el grupo" });
    }

    // Asignar rol VIP
    const result = await giveRole(userId);

    if (result.errors || result.errorMessage) {
        console.log(`No se pudo asignar VIP a ${userId}:`, result);
        return res.json({ ok: false, result });
    }

    console.log(`✅ Rol VIP asignado a ${userId}`);
    return res.json({ ok: true, result });
});

// Página principal para prueba
app.get("/", (req, res) => {
    res.send("Servidor funcionando correctamente ✔️");
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor iniciado en puerto ${PORT}`);
});
