import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

/* =============== CONFIGURACIÓN =============== */

const GROUP_ID = 34759104;

const ROLES = {
	VIP: { id: 601056109, rank: 1 },
	PECADORES: { id: 613122312, rank: 40 }
};

const ALLOWED_ROLE_IDS = Object.values(ROLES).map(r => r.id);
const COOKIE = process.env.ROBLOSECURITY;

/* =============== UTILIDADES =============== */

// Obtener info del grupo + rol actual
async function getGroupInfo(userId) {
	try {
		const res = await fetch(
			`https://groups.roblox.com/v1/users/${userId}/groups/roles`
		);
		const data = await res.json();
		if (!data.data) return null;

		return data.data.find(g => g.group.id === GROUP_ID) || null;
	} catch (err) {
		console.error("❌ Error obteniendo grupo:", err);
		return null;
	}
}

// Asignar rol (CSRF incluido)
async function assignRole(userId, roleId) {
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

	return await res.json();
}

/* =============== ENDPOINT =============== */

app.post("/give-role", async (req, res) => {
	const { userId, roleId } = req.body;

	if (!userId || !roleId) {
		return res.json({ ok: false, reason: "Faltan datos" });
	}

	// Seguridad
	if (!ALLOWED_ROLE_IDS.includes(roleId)) {
		return res.status(403).json({ ok: false, reason: "Rol no permitido" });
	}

	const groupInfo = await getGroupInfo(userId);
	if (!groupInfo) {
		return res.json({ ok: false, reason: "No está en el grupo" });
	}

	const currentRank = groupInfo.role.rank;
	const targetRole = Object.values(ROLES).find(r => r.id === roleId);

	// 🛑 NO BAJAR RANGO
	if (currentRank >= targetRole.rank) {
		console.log(
			`🛑 No se cambia rol: ${userId} ya tiene rango ${currentRank}`
		);
		return res.json({ ok: true, skipped: true });
	}

	// 🔄 Asignar nuevo rol
	const result = await assignRole(userId, roleId);

	if (result.errors || result.errorMessage) {
		console.error("❌ Error Roblox API:", result);
		return res.json({ ok: false, result });
	}

	console.log(
		`✅ Rol actualizado: ${userId} → ${targetRole.id}`
	);

	return res.json({ ok: true });
});

/* =============== START =============== */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
});
