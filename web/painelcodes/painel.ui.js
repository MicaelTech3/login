// ========================== web/painel.ui.js ==========================

let latestMsLeft = 0;      // tempo restante de trial para o popover do carrinho
let cdTimer = null;        // timer da contagem

export function exposeTrialMsLeft(ms) { latestMsLeft = Math.max(0, ms || 0); }

// Contagem (dias/horas/min) – atualiza a cada 1 min
function startCountdown(msLeft) {
  const ctn = document.getElementById("countdown");
  const dEl = document.getElementById("cd-days");
  const hEl = document.getElementById("cd-hours");
  const mEl = document.getElementById("cd-mins");
  if (!ctn || !dEl) return;

  if (cdTimer) clearInterval(cdTimer);

  function render(leftMs) {
    if (leftMs <= 0) {
      dEl.textContent = hEl.textContent = mEl.textContent = "0";
      return false;
    }
    const totalMin = Math.floor(leftMs / (1000 * 60));
    const days = Math.floor(totalMin / (60 * 24));
    const hours = Math.floor((totalMin % (60 * 24)) / 60);
    const mins = totalMin % 60;

    dEl.textContent = String(days);
    hEl.textContent = String(hours);
    mEl.textContent = String(mins);
    return true;
  }

  ctn.hidden = false;
  render(msLeft);
  const start = Date.now();
  cdTimer = setInterval(() => {
    const elapsed = Date.now() - start;
    const left = msLeft - elapsed;
    if (!render(left)) {
      clearInterval(cdTimer);
    }
  }, 60000);
}

// Preenche dados do usuário + calcula msLeft; opcionalmente não mostra banner
export function renderUserAndTrial({ user, data, silentBanner = false }) {
  const banner = document.getElementById("trial-banner");
  const suspect = document.getElementById("suspect-flag");
  const emailSpan = document.getElementById("user-email");
  const profileEmail = document.getElementById("profile-email");

  if (emailSpan) emailSpan.textContent = user?.email || "";
  if (profileEmail) profileEmail.textContent = user?.email || "";

  let msLeft = 0;
  if (data?.trialEnd && typeof data.trialEnd.toMillis === "function") {
    msLeft = data.trialEnd.toMillis() - Date.now();
  }

  if (!silentBanner && banner) {
    banner.classList.remove("hidden");
    if (data?.plan === "expired" || msLeft <= 0) {
      banner.textContent = "Seu teste terminou. Faça upgrade para continuar.";
      banner.classList.add("danger");
    } else {
      const days = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      banner.textContent = `🔔 Seu teste termina em ${days} dia(s).`;
    }
  }

  if (suspect && data?.suspicious) {
    suspect.textContent = "⚠ Conta sinalizada (e-mail não verificado ou domínio suspeito).";
  }

  return msLeft; // devolve p/ quem chamou salvar para o carrinho
}

// Barra inferior / menus
export function initUIBars({ onLogout, onUpgrade } = {}) {
  const btnProfile   = document.getElementById("btn-profile");
  const btnCart      = document.getElementById("btn-cart");
  const profileMenu  = document.getElementById("profile-menu");
  const cartPopover  = document.getElementById("cart-popover");
  const btnUpgrade   = document.getElementById("btn-upgrade");
  const btnLogout    = document.getElementById("logout");

  const closeProfile = () => { if (profileMenu && !profileMenu.hidden) profileMenu.hidden = true; };
  const closeCart    = () => { if (cartPopover && !cartPopover.hidden) cartPopover.hidden = true; };

  // --- Perfil: abre/fecha apenas ao clicar no ícone, fecha em qualquer clique fora, scroll ou resize
  if (btnProfile && profileMenu) {
    // não propaga clique dentro do menu (para não fechar imediatamente)
    profileMenu.addEventListener("click", (e) => e.stopPropagation());

    btnProfile.addEventListener("click", (e) => {
      e.stopPropagation();
      closeCart();                              // fecha carrinho se aberto
      profileMenu.hidden = !profileMenu.hidden; // toggle
    });
  }

  // --- Carrinho: popover com contador + ASSINAR (só aparece quando clica)
  if (btnCart && cartPopover) {
    cartPopover.addEventListener("click", (e) => e.stopPropagation());
    btnCart.addEventListener("click", (e) => {
      e.stopPropagation();
      closeProfile();                           // fecha perfil se aberto
      cartPopover.hidden = !cartPopover.hidden; // toggle
      if (!cartPopover.hidden) {
        const countdown = document.getElementById("countdown");
        if (countdown) countdown.hidden = false;
        startCountdown(latestMsLeft);           // usa o tempo já calculado
      }
    });
  }

  // --- Clicar em qualquer lugar fora fecha ambos
  document.addEventListener("click", () => { closeProfile(); closeCart(); });
  // --- Ao rolar ou redimensionar, fecha o menu de perfil
  window.addEventListener("scroll", closeProfile, { passive: true });
  window.addEventListener("resize", closeProfile);

  // --- Ação Sair (no menu)
  if (btnLogout && typeof onLogout === "function") {
    btnLogout.addEventListener("click", onLogout);
  }

  // --- Ação Assinar (no popover do carrinho)
  if (btnUpgrade && typeof onUpgrade === "function") {
    btnUpgrade.addEventListener("click", (e) => onUpgrade(e.currentTarget));
  }
}
