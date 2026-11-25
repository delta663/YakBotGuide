(() => {
    "use strict";

    const storageKey = "yakbot-guide-token-v1";
    const notice = document.getElementById("guide-status");
    const message = notice.querySelector("p");
    const clearButton = notice.querySelector("button");
    let expiryTimer;
    let generation = 0;

    function showSystems(systems) {
        document.querySelectorAll("[data-guide-system]").forEach(element => {
            element.hidden = !systems.includes(Number(element.dataset.guideSystem));
        });
        document.querySelectorAll("nav .sub").forEach(menu => {
            menu.hidden = !menu.querySelector("[data-guide-system]:not([hidden])");
        });
    }

    function clearSession(text) {
        clearTimeout(expiryTimer);
        showSystems([]);
        clearButton.hidden = true;
        message.textContent = text;
        try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be unavailable. */ }
    }

    async function start() {
        const currentGeneration = ++generation;
        clearTimeout(expiryTimer);
        showSystems([]);
        clearButton.hidden = true;
        let token;
        try {
            const parameters = new URLSearchParams(location.hash.slice(1));
            if (parameters.has("token")) {
                token = parameters.get("token");
                sessionStorage.removeItem(storageKey);
                // Keep the link token out of subsequent navigation and copied page addresses.
                history.replaceState(null, "", location.pathname + location.search);
            } else {
                token = sessionStorage.getItem(storageKey);
            }
            if (!token) {
                message.textContent = "ใช้คำสั่ง /guide ในเซิร์ฟเวอร์ Discord แล้วกดลิงก์ เพื่อดูคู่มือ YakBot สำหรับเซิร์ฟเวอร์ของคุณ";
                return;
            }
            message.textContent = "กำลังตรวจลิงก์คู่มือ…";
            const claims = await YakBotGuideToken.verify(token, YAKBOT_GUIDE_PUBLIC_KEY);
            if (currentGeneration !== generation) { return; }
            sessionStorage.setItem(storageKey, token);
            showSystems(claims.systems);
            clearButton.hidden = false;
            const expires = new Date(claims.exp * 1000).toLocaleTimeString("th-TH", {
                hour: "2-digit", minute: "2-digit", timeZoneName: "short"
            });
            const pageSystem = Number(document.querySelector("main")?.dataset.guideSystem);
            let text = "เซิร์ฟเวอร์ " + claims.guild_id + " · ลิงก์หมดอายุ " + expires;
            if (pageSystem && !claims.systems.includes(pageSystem)) {
                text += " · เซิร์ฟเวอร์นี้ไม่มีสิทธิ์คู่มือหน้านี้";
            } else if (claims.systems.length === 0) {
                text += " · ยังไม่มีคู่มือระบบที่เปิดใช้งาน กรุณาติดต่อผู้ดูแลบอท";
            }
            message.textContent = text;
            expiryTimer = setTimeout(() => {
                ++generation;
                clearSession("ลิงก์หมดอายุแล้ว กรุณาเรียก /guide ใน Discord อีกครั้ง");
            }, Math.max(0, claims.exp * 1000 - Date.now()));
        } catch {
            if (currentGeneration !== generation) { return; }
            clearSession("เปิดคู่มือจากลิงก์นี้ไม่ได้ กรุณาเรียก /guide ใหม่ และอนุญาตให้เบราว์เซอร์เก็บข้อมูลของเว็บไซต์");
        }
    }

    clearButton.addEventListener("click", () => {
        ++generation;
        clearSession("เรียก /guide ในเซิร์ฟเวอร์ที่ต้องการ แล้วเปิดลิงก์ใหม่");
    });
    window.addEventListener("hashchange", start);
    window.addEventListener("pageshow", event => {
        if (event.persisted) { start(); }
    });
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") { start(); }
    });
    start();
})();
