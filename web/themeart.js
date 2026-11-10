/* jumptrade. line-art backgrounds for the theme portfolio cards: one motif and one color per theme */
(function () {
  const A = {
    photonics: ['#5CE1E6', '<path d="M4 50h36M4 42l36 8M4 58l36-8"/><path d="M50 26l20 46H30z"/><path d="M62 50l34-18M62 50l34-6M62 50l34 6M62 50l34 18"/>'],
    aichips: ['#7C9CFF', '<rect x="26" y="26" width="48" height="48" rx="5"/><rect x="38" y="38" width="24" height="24" rx="2"/><path d="M34 26V12M46 26V12M58 26V12M70 26V12M34 74v14M46 74v14M58 74v14M70 74v14M26 34H12M26 46H12M26 58H12M26 70H12M74 34h14M74 46h14M74 58h14M74 70h14"/>'],
    memory: ['#B48CFF', '<path d="M18 66l32-14 32 14-32 14z"/><path d="M18 50l32-14 32 14-32 14z"/><path d="M18 34l32-14 32 14-32 14z"/>'],
    semicap: ['#62D0B5', '<circle cx="50" cy="50" r="36"/><path d="M28 22v56M39 15v70M50 14v72M61 15v70M72 22v56M22 28h56M15 39h70M14 50h72M15 61h70M22 72h56"/><path d="M44 86h12"/>'],
    aipower: ['#FFC94D', '<path d="M56 8L26 54h22l-6 38 32-48H52z"/>'],
    nuclear: ['#7DF08A', '<circle cx="50" cy="50" r="5"/><ellipse cx="50" cy="50" rx="40" ry="14"/><ellipse cx="50" cy="50" rx="40" ry="14" transform="rotate(60 50 50)"/><ellipse cx="50" cy="50" rx="40" ry="14" transform="rotate(120 50 50)"/>'],
    uranium: ['#B6F25C', '<path d="M50 14l18 10v20L50 54 32 44V24z"/><path d="M30 48l18 10v20L30 88 12 78V58z"/><path d="M70 48l18 10v20L70 88 52 78V58z"/>'],
    neocloud: ['#5EB3FF', '<path d="M30 40a14 14 0 0 1 27-6 11 11 0 1 1 9 20H32a10 10 0 0 1-2-14z"/><rect x="26" y="62" width="48" height="10" rx="2"/><rect x="26" y="76" width="48" height="10" rx="2"/><path d="M33 67h4M33 81h4"/>'],
    quantum: ['#E07CFF', '<circle cx="50" cy="50" r="34"/><ellipse cx="50" cy="50" rx="34" ry="11"/><path d="M50 16v68"/><path d="M50 50l20-22"/><circle cx="70" cy="28" r="3.5"/>'],
    robotics: ['#FF9C5B', '<path d="M14 88h40"/><path d="M34 88V70l14-24 26-10"/><circle cx="34" cy="70" r="5"/><circle cx="48" cy="46" r="5"/><circle cx="74" cy="36" r="5"/><path d="M78 30l10-6M80 40l10 2"/>'],
    space: ['#9C8CFF', '<circle cx="46" cy="54" r="22"/><ellipse cx="46" cy="54" rx="40" ry="10" transform="rotate(-18 46 54)"/><path d="M80 14v10M75 19h10M18 18v6M15 21h6"/>'],
    defense: ['#9DB4C8', '<rect x="42" y="44" width="16" height="12" rx="3"/><path d="M42 46L26 30M58 46l16-16M42 54L26 70M58 54l16 16"/><circle cx="24" cy="28" r="10"/><circle cx="76" cy="28" r="10"/><circle cx="24" cy="72" r="10"/><circle cx="76" cy="72" r="10"/>'],
    cyber: ['#4DE0A0', '<path d="M50 10l32 12v24c0 22-14 36-32 44-18-8-32-22-32-44V22z"/><rect x="38" y="46" width="24" height="18" rx="3"/><path d="M42 46v-6a8 8 0 0 1 16 0v6"/>'],
    aisoftware: ['#6FA8FF', '<path d="M32 30L12 50l20 20M68 30l20 20-20 20M56 22L44 78"/>'],
    mag7: ['#FFD166', '<path d="M12 88h76"/><rect x="16" y="66" width="10" height="22"/><rect x="31" y="54" width="10" height="34"/><rect x="46" y="44" width="10" height="44"/><rect x="61" y="30" width="10" height="58"/><rect x="76" y="16" width="10" height="72"/>'],
    crypto: ['#FFAA4D', '<circle cx="50" cy="50" r="34"/><path d="M42 30v40M52 30v6M52 64v6M38 36h18a7 7 0 0 1 0 14H40M40 50h18a7 7 0 0 1 0 14H38"/>'],
    fintech: ['#5CE0C6', '<rect x="10" y="34" width="56" height="36" rx="5"/><path d="M10 46h56M18 60h14"/><path d="M74 40a14 14 0 0 1 0 24M81 33a24 24 0 0 1 0 38M88 26a34 34 0 0 1 0 52"/>'],
    glp1: ['#FF8FB8', '<rect x="22" y="40" width="56" height="20" rx="4" transform="rotate(-35 50 50)"/><path d="M73 33l10-7M80 24l8 10" /><path d="M36 58l-6 4M43 53l-6 4M50 48l-6 4" /><path d="M20 72l-8 6"/>'],
    biotech: ['#FF6FAE', '<path d="M36 10c0 20 28 20 28 40S36 70 36 90M64 10c0 20-28 20-28 40s28 20 28 40"/><path d="M40 20h20M44 30h12M44 70h12M40 80h20M38 50h24"/>'],
    rareearth: ['#C08CFF', '<path d="M50 10l22 22-22 58-22-58z"/><path d="M28 32h44M50 10v80M39 32l11 58 11-58"/>'],
    gold: ['#F5C542', '<path d="M18 80l6-16h22l6 16zM48 80l6-16h22l6 16zM33 62l6-16h22l6 16z"/>'],
    grid: ['#FFB84D', '<path d="M50 10L32 90M50 10l18 80M38 64h24M41 48h18M44 32h12M24 30h52M30 30l20 18 20-18"/><path d="M76 30c8 6 14 6 20 4M24 30c-8 6-14 6-20 4"/>'],
    storage: ['#66E08A', '<rect x="20" y="26" width="56" height="48" rx="6"/><path d="M76 42h6v16h-6"/><path d="M30 36v28M42 36v28M54 36v28"/>'],
    solar: ['#FFD24D', '<circle cx="70" cy="28" r="10"/><path d="M70 8v6M70 42v6M50 28h6M84 28h6M56 14l4 4M80 38l4 4M84 14l-4 4"/><path d="M10 84l12-32h44l12 32z"/><path d="M16 68h56M38 52l-6 32M54 52l2 32"/>'],
    dividend: ['#7DE2A8', '<ellipse cx="50" cy="76" rx="26" ry="8"/><path d="M24 76v-10c0 4 12 8 26 8s26-4 26-8v10"/><ellipse cx="50" cy="56" rx="26" ry="8"/><path d="M24 56V46c0 4 12 8 26 8s26-4 26-8v10"/><ellipse cx="50" cy="36" rx="26" ry="8"/><path d="M24 36V26c0 4 12 8 26 8s26-4 26-8v10"/>'],
    healthai: ['#FF7A7A', '<path d="M8 56h22l8-20 12 36 10-26 6 10h26"/><path d="M76 16v20M66 26h20"/>'],
    cooling: ['#7FD8FF', '<path d="M50 10v80M15 30l70 40M15 70l70-40"/><path d="M42 16l8 8 8-8M42 84l8-8 8 8M16 42l11-3-3-11M84 58l-11 3 3 11M16 58l11 3-3 11M84 42l-11-3 3-11"/>'],
    smallai: ['#A88CFF', '<circle cx="18" cy="30" r="5"/><circle cx="18" cy="70" r="5"/><circle cx="50" cy="20" r="5"/><circle cx="50" cy="50" r="5"/><circle cx="50" cy="80" r="5"/><circle cx="82" cy="50" r="5"/><path d="M23 30l22-9M23 30l22 19M23 30l22 48M23 70l22-48M23 70l22-19M23 70l22 9M55 20l22 28M55 50h22M55 80l22-28"/>']
  };
  const pick = (id) => A[id] || ['#7C9CFF', '<circle cx="50" cy="50" r="30"/><path d="M30 50h40M50 30v40"/>'];
  window.THEMEART = {
    color: (id) => pick(id)[0],
    // decorative only: hidden from screen readers
    svg: (id) => { const a = pick(id); return '<svg class="thArt" viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="' + a[0] + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + a[1] + '</svg>'; }
  };
})();
