const bugs = [
  { name: "ノコギリクワガタ", icon: "🪲", hp: 40, bonuses: { cut: 2 }, traits: ["きる +2"] },
  { name: "スズメバチ", icon: "🐝", hp: 25, bonuses: { stab: 2 }, traits: ["さす +2", "さすに毒付与"] },
  { name: "カブトムシ", icon: "🪲", hp: 50, bonuses: { pinch: 2 }, traits: ["つく +2", "毎ターン装甲 +1"] },
];

const deck = [
  { name: "きる", cost: 1, type: "cut", baseDamage: 6, text: "6ダメージ / きる効果", icon: "🗡️" },
  { name: "さす", cost: 1, type: "stab", baseDamage: 4, text: "4ダメージ / さす効果", icon: "🔪" },
  { name: "断頭", cost: 2, type: "cut", baseDamage: 12, text: "敵HP50%以上なら2倍", icon: "⚔️", execute: true },
  { name: "防御", cost: 1, type: "guard", block: 8, text: "8ブロック", icon: "🛡️" },
  { name: "つく", cost: 1, type: "pinch", baseDamage: 5, text: "5ダメージ / 防御無視", icon: "🦗" },
];

const rewards = [
  { title: "新しいカード", art: "🃏", text: "出血斬り: 8ダメージ、出血を2付与" },
  { title: "新しい虫", art: "🐜", text: "アシナガバチ: HP30、さすで毒付与" },
  { title: "虫改造", art: "🧬", text: "毒腺: さすに毒を付与" },
  { title: "回復", art: "💚", text: "チームHPを25回復" },
];

const mods = [
  { name: "鋭利な顎", text: "きる +1" },
  { name: "毒腺", text: "さすで毒付与" },
  { name: "吸血器官", text: "攻撃時 HP +1" },
];

const state = {
  turn: 1,
  maxEnergy: 3,
  energy: 3,
  block: 0,
  hp: bugs.reduce((sum, bug) => sum + bug.hp, 0),
  enemy: { name: "巨大スズメバチ", hp: 150, maxHp: 150, poison: 0 },
  log: ["ラン開始。虫の力でカードを強化しよう。"],
};

const intents = [
  { label: "攻撃 12", icon: "🗡️", damage: 12 },
  { label: "毒付与", icon: "🟣", poison: 2 },
  { label: "連撃 8×2", icon: "⚔️", damage: 16 },
  { label: "防御強化 5", icon: "🛡️", armor: 5 },
];

const $ = (selector) => document.querySelector(selector);

function bonusFor(type) {
  return bugs.reduce((sum, bug) => sum + (bug.bonuses[type] || 0), 0) + (type === "cut" ? 1 : 0);
}

function hasTrait(text) {
  return bugs.some((bug) => bug.traits.some((trait) => trait.includes(text))) || mods.some((mod) => mod.text.includes(text));
}

function damageFor(card) {
  if (!card.baseDamage) return 0;
  let damage = card.baseDamage + bonusFor(card.type);
  if (card.execute && state.enemy.hp > state.enemy.maxHp / 2) damage *= 2;
  return damage;
}

function pushLog(message) {
  state.log.unshift(message);
  state.log = state.log.slice(0, 8);
}

function playCard(card) {
  if (state.energy < card.cost || state.enemy.hp <= 0) return;
  state.energy -= card.cost;

  if (card.block) {
    state.block += card.block + 1;
    pushLog(`${card.name}で${card.block + 1}ブロックを得た。`);
  } else {
    const damage = damageFor(card);
    state.enemy.hp = Math.max(0, state.enemy.hp - damage);
    pushLog(`${card.name}で${damage}ダメージ。`);
    if (card.type === "stab" && hasTrait("毒")) {
      state.enemy.poison += 2;
      pushLog("さすシナジーで毒を2付与。シナジーインフレが始まった。");
    }
    if (mods.some((mod) => mod.name === "吸血器官")) {
      state.hp = Math.min(maxHp(), state.hp + 1);
      pushLog("吸血器官でHPを1回復。まさにビルドの勝利。");
    }
  }

  if (state.enemy.hp <= 0) {
    pushLog("勝利！ 報酬から次のビルド方針を選ぼう。");
  }
  render();
}

function maxHp() {
  return bugs.reduce((sum, bug) => sum + bug.hp, 0);
}

function endTurn() {
  if (state.enemy.poison > 0) {
    state.enemy.hp = Math.max(0, state.enemy.hp - state.enemy.poison);
    pushLog(`毒で敵に${state.enemy.poison}ダメージ。`);
    state.enemy.poison = Math.max(0, state.enemy.poison - 1);
  }

  if (state.enemy.hp > 0) {
    const intent = intents[(state.turn - 1) % intents.length];
    if (intent.damage) {
      const incoming = Math.max(0, intent.damage - state.block);
      state.hp = Math.max(0, state.hp - incoming);
      pushLog(`敵の${intent.label}。ブロック後に${incoming}ダメージ。`);
    } else if (intent.poison) {
      pushLog("敵が毒を付与。次のターンは防御か速攻かを選ぼう。");
    } else {
      pushLog("敵が防御を固めた。断頭の好機を逃すな。");
    }
  }

  state.turn += 1;
  state.energy = state.maxEnergy;
  state.block = hasTrait("毎ターン装甲") ? 1 : 0;
  render();
}

function chooseReward(reward) {
  if (reward.title === "回復") {
    state.hp = Math.min(maxHp(), state.hp + 25);
  }
  if (reward.title === "虫改造" && !mods.some((mod) => mod.name === "外骨格")) {
    mods.push({ name: "外骨格", text: "最大HP +10" });
    bugs[0].hp += 10;
  }
  pushLog(`${reward.title}を選択: ${reward.text}`);
  render();
}

function renderBugs() {
  $("#bug-list").innerHTML = bugs.map((bug) => `
    <article class="bug-card">
      <div class="bug-icon">${bug.icon}</div>
      <div><strong>${bug.name}</strong><span>HP ${bug.hp}</span>${bug.traits.map((trait) => `<span>${trait}</span>`).join("")}</div>
    </article>
  `).join("");

  $("#team-cards").innerHTML = bugs.map((bug) => `
    <article class="team-card">
      <div class="team-icon">${bug.icon}</div>
      <strong>${bug.name}</strong>
      <span>❤️ ${bug.hp}</span>
      ${bug.traits.map((trait) => `<span>${trait}</span>`).join("")}
    </article>
  `).join("");
}

function renderHand() {
  $("#hand").innerHTML = deck.map((card, index) => {
    const disabled = state.energy < card.cost || state.enemy.hp <= 0 ? " disabled" : "";
    const tilt = `${(index - 2) * 4}deg`;
    const body = card.baseDamage ? `${damageFor(card)}ダメージ` : card.text;
    return `
      <button class="card ${card.type}${disabled}" style="--tilt:${tilt}" data-card="${index}">
        <span class="cost">${card.cost}</span>
        <strong>${card.name}</strong>
        <div class="art">${card.icon}</div>
        <p>${body}<br>${card.text}</p>
      </button>
    `;
  }).join("");

  document.querySelectorAll("[data-card]").forEach((node) => {
    node.addEventListener("click", () => playCard(deck[Number(node.dataset.card)]));
  });
}

function renderRewards() {
  $("#rewards").innerHTML = rewards.map((reward, index) => `
    <article class="reward-card" data-reward="${index}">
      <strong>${reward.title}</strong>
      <div class="reward-art">${reward.art}</div>
      <p>${reward.text}</p>
    </article>
  `).join("");

  document.querySelectorAll("[data-reward]").forEach((node) => {
    node.addEventListener("click", () => chooseReward(rewards[Number(node.dataset.reward)]));
  });
}

function render() {
  const max = maxHp();
  $("#turn").textContent = state.turn;
  $("#team-hp").textContent = state.hp;
  $("#team-max-hp").textContent = max;
  $("#team-hp-bar").style.width = `${(state.hp / max) * 100}%`;
  $("#energy").textContent = state.energy;
  $("#enemy-name").textContent = state.enemy.name;
  $("#enemy-hp").textContent = state.enemy.hp;
  $("#enemy-max-hp").textContent = state.enemy.maxHp;
  $("#enemy-hp-bar").style.width = `${(state.enemy.hp / state.enemy.maxHp) * 100}%`;
  $("#enemy-status").textContent = state.enemy.poison ? `毒 ${state.enemy.poison}` : "状態異常なし";
  $("#dex-count").textContent = bugs.length;

  $("#intent-list").innerHTML = intents.map((intent, index) => `<li>${index + 1}ターン後 ${intent.icon} ${intent.label}</li>`).join("");
  $("#team-effects").innerHTML = [
    `最大HP +${max}`,
    `きる ダメージ +${bonusFor("cut")}`,
    `さす ダメージ +${bonusFor("stab")}`,
    "さすに毒付与",
    "毎ターン装甲 +1",
  ].map((effect) => `<li>${effect}</li>`).join("");
  $("#status-table").innerHTML = `
    <dt>攻撃力（きる）</dt><dd>+${bonusFor("cut")}</dd>
    <dt>攻撃力（さす）</dt><dd>+${bonusFor("stab")}</dd>
    <dt>装甲</dt><dd>${state.block}</dd>
    <dt>毒効果</dt><dd>${hasTrait("毒") ? "あり" : "なし"}</dd>
  `;
  $("#mod-list").innerHTML = mods.map((mod) => `<li><strong>${mod.name}</strong>: ${mod.text}</li>`).join("");
  $("#log").innerHTML = state.log.map((message) => `<li>${message}</li>`).join("");

  renderBugs();
  renderHand();
  renderRewards();
}

$("#end-turn").addEventListener("click", endTurn);
render();
