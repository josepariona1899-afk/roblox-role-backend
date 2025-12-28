import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ===== CONFIGURACIÓN =====
const GROUP_ID = 34759104;
const ALLOWED_ROLES = [
	601056109, // VIP
	613122312  // PECADORES
];

const COOKIE = process.env.ROBLOSECURITY;

// ===== UTILIDADES =====

// Verificar si el usuario está en el grupo
async function isGroupMember(userId) {
	try {
		const res = await fetch(
			`https://groups.roblox.com/v1/users/${userId}/groups/roles`
		);
		const data = await res.json();
		if (!data.data) return false;

		return data.data.some(group => group.group.id === GROUP_ID);
	} catch (err) {
		console.error("Error verificando grupo:", err);
		return false;
	}
}

// Asignar rol dinámico con CSRF
async function giveRole(userId, roleId) {
	try {
		let csrfToken = null;

		let res = await fetch(
			`https://groups.roblox.com/v1/groups/${GROUP_ID}/users/${userId}`,
			{
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					"Cookie": `.ROBLOSECURITY=${COOKIE}`
				},
				body: JSON.stringify({ roleId })
			}
		);

		// Obtener CSRF si es necesario
		if (res.status === 403) {
			csrfToken = res.headers.get("x-csrf-token");

			res = await fetch(
				`https://groups.roblox.com/v1/groups/${GROUP_ID}/users/${userId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						"Cookie": `.ROBLOSECURITY=${COOKIE}`,
						"x-csrf-token": csrfToken
					},
					body: JSON.stringify({ roleId })
				}
			);
		}

		const data = await res.json();
		return data;
	} catch (err) {
		console.error("Error asignando rol:", err);
		return { ok: false, error: err.message };
	}
}

// ===== ENDPOINT PRINCIPAL =====
app.post("/give-role", async (req, res) => {
	const { userId, roleId } = req.body;

	if (!userId || !roleId) {
		return res.json({ ok: false, reason: "Faltan datos" });
	}

	// Seguridad: solo roles permitidos
	if (!ALLOWED_ROLES.includes(roleId)) {
		console.warn("Rol no permitido:", roleId);
		return res.status(403).json({ ok: false, reason: "Rol no permitido" });
	}

	// Verificar grupo
	const inGroup = await isGroupMember(userId);
	if (!inGroup) {
		return res.json({ ok: false, reason: "No está en el grupo" });
	}

	// Asignar rol
	const result = await giveRole(userId, roleId);

	if (result.errors || result.errorMessage) {
		console.error("Error Roblox API:", result);
		return res.json({ ok: false, result });
	}

	console.log(`✅ Rol ${roleId} asignado a ${userId}`);
	return res.json({ ok: true });
});

// ===== TEST =====
app.get("/", (req, res) => {
	res.send("Servidor funcionando correctamente ✔️");
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Servidor iniciado en puerto ${PORT}`);
});
