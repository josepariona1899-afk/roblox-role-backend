import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const GROUP_ID = 34759104;

const ROLES = {
	VIP: 601056109,
	PECADORES: 613122312
};

const ALLOWED_ROLES = Object.values(ROLES);

const COOKIE = process.env.ROBLOSECURITY;

async function getGroupInfo(userId) {
	try {
		const res = await fetch(
			`https://groups.roblox.com/v1/users/${userId}/groups/roles`
		);
		const data = await res.json();

		if (!data.data) return null;

		return data.data.find(g => g.group.id === GROUP_ID) || null;
	} catch (err) {
		console.error("❌ Error obteniendo info del grupo:", err);
		return null;
	}
}

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

app.post("/give-role", async (req, res) => {
	const { userId, roleId } = req.body;

	if (!userId || !roleId) {
		return res.json({ ok: false, reason: "Faltan datos" });
	}

	if (!ALLOWED_ROLES.includes(roleId)) {
		console.warn("🚫 Rol no permitido:", roleId);
		return res.status(403).json({ ok: false, reason: "Rol no permitido" });
	}

	const groupInfo = await getGroupInfo(userId);

	if (!groupInfo) {
		console.log(`❌ Usuario ${userId} no está en el grupo`);
		return res.json({ ok: false, reason: "No está en el grupo" });
	}

	const currentRoleId = groupInfo.role.id;

	if (currentRoleId === roleId) {
		console.log(
			`ℹ Usuario ${userId} ya tiene el rol ${roleId} (${groupInfo.role.name})`
		);
		return res.json({ ok: true, skipped: true });
	}

	const result = await assignRole(userId, roleId);

	if (result.errors || result.errorMessage) {
		console.error("❌ Error Roblox API:", result);
		return res.json({ ok: false, result });
	}

	console.log(
		`✅ Rol cambiado: ${userId} | ${groupInfo.role.name} → ${roleId}`
	);

	return res.json({ ok: true });
});

app.get("/", (req, res) => {
	res.send("Servidor funcionando correctamente ✔️");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
});
