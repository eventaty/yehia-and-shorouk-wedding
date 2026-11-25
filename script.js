// ============================================================
// منطق دعوة الفرح: البيانات، فتح الظرف، الصوت، اللوكيشن، العدّاد، والإفيكتات
// ============================================================

(function () {
  "use strict";

  const cfg = typeof WEDDING_CONFIG !== "undefined" ? WEDDING_CONFIG : null;
  if (!cfg) return;

  // ------------------------------------------------------------
  // 1. ربط البيانات من config.js بعناصر الصفحة + تشغيل زرار اللوكيشن
  // ------------------------------------------------------------
  function getByPath(obj, path) {
    return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
  }

  function buildLocationUrl() {
    if (cfg.venue.locationUrl && cfg.venue.locationUrl.trim() !== "") {
      return cfg.venue.locationUrl.trim();
    }
    // لو لسه مفيش لينك مباشر، نفتح Google Maps على البحث باسم القاعة والعنوان عشان الزرار يشتغل فعلاً
    const query = [cfg.venue.hallName, cfg.venue.address]
      .filter(Boolean)
      .join(" ")
      .replace(/\(.*?\)/g, "")
      .trim();
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      query || "Cairo Egypt"
    )}`;
  }

  function hydrateContent() {
    document.title = `دعوة فرح | ${cfg.couple.groom} & ${cfg.couple.bride}`;

    document.querySelectorAll("[data-bind]").forEach((el) => {
      const value = getByPath(cfg, el.getAttribute("data-bind"));
      if (typeof value === "string" && value.length > 0) {
        el.textContent = value;
      }
    });

    const locationBtn = document.getElementById("location-btn");
    if (locationBtn) {
      locationBtn.href = buildLocationUrl();
    }
  }

  // ------------------------------------------------------------
  // 2. إشعار Toast صغير
  // ------------------------------------------------------------
  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("is-shown");
    }, 3000);
  }

  // ------------------------------------------------------------
  // 3. مشغّل الأغنية في الخلفية ("ادخلي عمري" MP3) + زرار كتم صغير فقط
  // ------------------------------------------------------------
  const audioEl = document.getElementById("bg-audio");
  const muteBtn = document.getElementById("mute-toggle");
  let fadeInterval = null;
  let audioHasSource = false;

  function setupAudio() {
    if (!audioEl || !cfg.audio || !cfg.audio.src) return;

    const startSec = Math.max(0, Number(cfg.audio.startSeconds) || 0);
    audioEl.src = encodeURI(cfg.audio.src);
    audioEl.loop = false;
    audioHasSource = true;

    // تجهيز نقطة البداية (الثانية 106) أول ما بيانات الصوت تتحمّل
    audioEl.addEventListener(
      "loadedmetadata",
      () => {
        if (startSec > 0 && isFinite(audioEl.duration) && startSec < audioEl.duration) {
          try {
            audioEl.currentTime = startSec;
          } catch (_) {}
        }
      },
      { once: true }
    );
    audioEl.load();

    audioEl.addEventListener("ended", () => {
      if (!cfg.audio.loop) return;
      try {
        audioEl.currentTime = startSec;
        audioEl.play().catch(() => {});
      } catch (_) {}
    });

    audioEl.addEventListener("error", () => {
      audioHasSource = false;
      if (muteBtn) muteBtn.classList.add("hidden");
    });

    if (muteBtn) {
      muteBtn.addEventListener("click", () => {
        if (!audioHasSource) return;
        audioEl.muted = !audioEl.muted;
        const isMuted = audioEl.muted;
        muteBtn.classList.toggle("is-muted", isMuted);
        muteBtn.setAttribute("aria-pressed", String(isMuted));
        muteBtn.setAttribute(
          "aria-label",
          isMuted ? "تشغيل الصوت" : "كتم الصوت"
        );
      });
    }
  }

  function fadeInVolume(targetVol, durationMs) {
    clearInterval(fadeInterval);
    const steps = 24;
    const stepTime = Math.max(20, Math.floor(durationMs / steps));
    let currentStep = 0;

    try {
      audioEl.volume = 0;
    } catch (_) {
      return;
    }

    fadeInterval = setInterval(() => {
      currentStep += 1;
      const nextVol = Math.min(targetVol, (currentStep / steps) * targetVol);
      try {
        audioEl.volume = nextVol;
      } catch (_) {
        clearInterval(fadeInterval);
      }
      if (currentStep >= steps) clearInterval(fadeInterval);
    }, stepTime);
  }

  function startBackgroundMusic() {
    if (!audioEl || !audioHasSource) return;

    const startSec = Math.max(0, Number(cfg.audio.startSeconds) || 0);
    const targetVol = Math.min(1, Math.max(0.1, Number(cfg.audio.volume) || 0.78));
    const fadeMs = Math.max(0, Number(cfg.audio.fadeInMs) || 1800);

    const seekToHighlight = () => {
      if (startSec > 0) {
        if (!isFinite(audioEl.duration) || startSec < audioEl.duration) {
          try {
            audioEl.currentTime = startSec;
          } catch (_) {}
        }
      }
    };

    if (audioEl.readyState >= 1) {
      seekToHighlight();
    } else {
      audioEl.addEventListener("loadedmetadata", seekToHighlight, { once: true });
    }

    const playPromise = audioEl.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          if (muteBtn) muteBtn.classList.remove("hidden");
          fadeInVolume(targetVol, fadeMs);
        })
        .catch(() => {
          if (muteBtn && audioHasSource) muteBtn.classList.remove("hidden");
        });
    }
  }

  // ------------------------------------------------------------
  // 4. محرك الإفيكتات (بتلات وردية + نجوم ذهبية + شرر تفاعلي + انفجار الفتح)
  // ------------------------------------------------------------
  let spawnBurstAt = () => {};

  function setupFxCanvas() {
    const canvas = document.getElementById("fx-canvas");
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const isSmall = width < 480;
    const starCount = isSmall ? 20 : 34;
    const petalCount = isSmall ? 10 : 18;

    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2 + 0.8,
      vy: -(Math.random() * 0.3 + 0.1),
      vx: (Math.random() - 0.5) * 0.2,
      phase: Math.random() * Math.PI * 2,
      alpha: Math.random() * 0.55 + 0.2,
    }));

    const petals = Array.from({ length: petalCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 5 + 4,
      vy: Math.random() * 0.65 + 0.35,
      vx: (Math.random() - 0.5) * 0.4,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.03,
      sway: Math.random() * Math.PI * 2,
      color:
        Math.random() > 0.45
          ? "rgba(218, 152, 134, 0.34)"
          : "rgba(236, 198, 126, 0.34)",
    }));

    const bursts = [];

    spawnBurstAt = (x, y, count = 18) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const speed = Math.random() * 3.8 + 1.4;
        bursts.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.8,
          r: Math.random() * 2.8 + 1.2,
          life: 1,
          decay: Math.random() * 0.022 + 0.015,
          color:
            i % 3 === 0
              ? "#fff3d0"
              : i % 3 === 1
              ? "#e0ab54"
              : "#df9a87",
        });
      }
    };

    // شرر ذهبي لطيف عند الضغط أو اللمس في أي مكان
    document.addEventListener("pointerdown", (e) => {
      spawnBurstAt(e.clientX, e.clientY, 10);
    });

    window.addEventListener("resize", () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    function draw() {
      ctx.clearRect(0, 0, width, height);

      // 1) النجوم الذهبية المتلألئة
      for (const s of stars) {
        s.y += s.vy;
        s.x += s.vx + Math.sin(s.phase) * 0.14;
        s.phase += 0.02;

        if (s.y < -10) {
          s.y = height + 10;
          s.x = Math.random() * width;
        }
        if (s.x < -10) s.x = width + 10;
        if (s.x > width + 10) s.x = -10;

        const a = s.alpha * (0.55 + 0.45 * Math.sin(s.phase * 2));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(235, 196, 118, ${a.toFixed(3)})`;
        ctx.fill();
      }

      // 2) البتلات العائمة الناعمة
      for (const p of petals) {
        p.y += p.vy;
        p.sway += 0.02;
        p.x += p.vx + Math.sin(p.sway) * 0.35;
        p.rot += p.vrot;

        if (p.y > height + 16) {
          p.y = -16;
          p.x = Math.random() * width;
        }
        if (p.x < -16) p.x = width + 16;
        if (p.x > width + 16) p.x = -16;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 3) الشرر المتفجر عند الفتح أو اللمس
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.06;
        b.life -= b.decay;

        if (b.life <= 0) {
          bursts.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, b.life);
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      requestAnimationFrame(draw);
    }

    draw();
  }

  // ------------------------------------------------------------
  // 5. أنيميشن فتح الظرف والانتقال لقسم الدعوة
  // ------------------------------------------------------------
  function setupEnvelope() {
    const trigger = document.getElementById("envelope-trigger");
    const envelope = document.getElementById("envelope");
    const introScreen = document.getElementById("intro-screen");
    const mainEl = document.getElementById("invitation-main");
    if (!trigger || !envelope || !introScreen || !mainEl) return;

    document.body.classList.add("locked");
    let opened = false;

    function openInvitation() {
      if (opened) return;
      opened = true;

      // انفجار شرر ذهبي من منتصف الختم
      const rect = envelope.getBoundingClientRect();
      spawnBurstAt(rect.left + rect.width / 2, rect.top + rect.height * 0.52, 34);

      // تشغيل الأغنية فوراً داخل نفس ضغطة المستخدم
      startBackgroundMusic();

      // فتح الظرف وخروج الكارت
      envelope.classList.add("is-open");

      setTimeout(() => {
        introScreen.classList.add("is-leaving");
        document.body.classList.remove("locked");
        mainEl.classList.add("is-visible");
        mainEl.setAttribute("aria-hidden", "false");
        observeReveals();
      }, 1300);

      setTimeout(() => {
        introScreen.classList.add("hidden");
      }, 2250);
    }

    trigger.addEventListener("click", openInvitation);
    trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openInvitation();
      }
    });
  }

  // ------------------------------------------------------------
  // 6. شريط التقدم الذهبي مع السكرول
  // ------------------------------------------------------------
  function setupScrollProgress() {
    const bar = document.getElementById("scroll-progress");
    if (!bar) return;

    window.addEventListener(
      "scroll",
      () => {
        const scrollable =
          document.documentElement.scrollHeight - window.innerHeight;
        if (scrollable <= 0) {
          bar.style.width = "0%";
          return;
        }
        const pct = Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100));
        bar.style.width = `${pct.toFixed(1)}%`;
      },
      { passive: true }
    );
  }

  // ------------------------------------------------------------
  // 7. العدّاد التنازلي مع نبضة خفيفة كل ثانية
  // ------------------------------------------------------------
  function setupCountdown() {
    const targetTime = new Date(cfg.event.isoDate).getTime();
    if (Number.isNaN(targetTime)) return;

    const daysEl = document.getElementById("cd-days");
    const hoursEl = document.getElementById("cd-hours");
    const minutesEl = document.getElementById("cd-minutes");
    const secondsEl = document.getElementById("cd-seconds");
    const gridEl = document.getElementById("countdown-grid");
    const finishedEl = document.getElementById("countdown-finished");

    const pad = (n) => String(n).padStart(2, "0");

    function tick() {
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        if (gridEl) gridEl.classList.add("hidden");
        if (finishedEl) finishedEl.classList.remove("hidden");
        return false;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      if (daysEl) daysEl.textContent = pad(days);
      if (hoursEl) hoursEl.textContent = pad(hours);
      if (minutesEl) minutesEl.textContent = pad(minutes);
      if (secondsEl) {
        secondsEl.textContent = pad(seconds);
        secondsEl.classList.add("tick-pop");
        setTimeout(() => secondsEl.classList.remove("tick-pop"), 180);
      }
      return true;
    }

    if (tick()) {
      const timer = setInterval(() => {
        if (!tick()) clearInterval(timer);
      }, 1000);
    }
  }

  // ------------------------------------------------------------
  // 8. زر إضافة الموعد للتقويم (.ics)
  // ------------------------------------------------------------
  function setupCalendarDownload() {
    const btn = document.getElementById("calendar-btn");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const start = new Date(cfg.event.isoDate);
      if (Number.isNaN(start.getTime())) return;
      const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);

      const toIcsUtc = (d) =>
        d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

      const title = `حفل زفاف ${cfg.couple.groom} و ${cfg.couple.bride}`;
      const location = [cfg.venue.hallName, cfg.venue.address]
        .filter(Boolean)
        .join(" - ");
      const desc = `نتشرف بحضوركم لمشاركتنا فرحتنا — اللوكيشن: ${buildLocationUrl()}`;

      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//YehiaShoroukWedding//AR",
        "BEGIN:VEVENT",
        `DTSTART:${toIcsUtc(start)}`,
        `DTEND:${toIcsUtc(end)}`,
        `SUMMARY:${title}`,
        `LOCATION:${location}`,
        `DESCRIPTION:${desc}`,
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "wedding-yehia-shorouk.ics";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("تم تحميل ملف التقويم بنجاح 📅");
    });
  }

  // ------------------------------------------------------------
  // 9. أنيميشن ظهور العناصر مع السكرول
  // ------------------------------------------------------------
  function observeReveals() {
    const items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-inview"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-inview");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    items.forEach((el) => observer.observe(el));
  }

  // تشغيل كل المكونات
  hydrateContent();
  setupFxCanvas();
  setupAudio();
  setupEnvelope();
  setupScrollProgress();
  setupCountdown();
  setupCalendarDownload();
})();
