/* Verification runs locally to personalize the guide. Published HTML remains public. */
(() => {
    "use strict";

    function decode(value) {
        if (!/^[A-Za-z0-9_-]+$/.test(value)) {
            throw new Error("Invalid token encoding");
        }
        const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
        return Uint8Array.from(atob(base64), character => character.charCodeAt(0));
    }

    async function verify(token, publicKey, now = Math.floor(Date.now() / 1000)) {
        if (typeof token !== "string" || token.length > 4096) {
            throw new Error("Invalid token");
        }
        const parts = token.split(".");
        if (parts.length !== 3) {
            throw new Error("Invalid token");
        }
        const decoder = new TextDecoder("utf-8", { fatal: true });
        const header = JSON.parse(decoder.decode(decode(parts[0])));
        if (header.alg !== "RS256" || header.typ !== "JWT" || header.crit !== undefined) {
            throw new Error("Unsupported token");
        }
        const key = await crypto.subtle.importKey(
            "jwk", publicKey,
            { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
            false, ["verify"]
        );
        const valid = await crypto.subtle.verify(
            "RSASSA-PKCS1-v1_5", key, decode(parts[2]),
            new TextEncoder().encode(parts[0] + "." + parts[1])
        );
        if (!valid) {
            throw new Error("Invalid signature");
        }
        const claims = JSON.parse(decoder.decode(decode(parts[1])));
        const knownSystems = [2, 4, 5, 6, 7, 8, 9];
        if (claims.iss !== "YakBot" || claims.aud !== "YakBotGuide" ||
            typeof claims.guild_id !== "string" || !/^[1-9][0-9]{0,19}$/.test(claims.guild_id) ||
            !Array.isArray(claims.systems) || !claims.systems.every(id => knownSystems.includes(id)) ||
            !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) ||
            claims.exp <= now || claims.iat > now + 60 ||
            claims.exp <= claims.iat || claims.exp - claims.iat > 3600) {
            throw new Error("Invalid or expired claims");
        }
        return claims;
    }

    globalThis.YakBotGuideToken = Object.freeze({ verify });
})();
