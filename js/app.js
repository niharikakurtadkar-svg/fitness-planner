console.log("FitZone app.js loaded");

// ============================================
//  FIREBASE CONFIG
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyDB9IxcPi1xYK-fe30kByaUv5xiWx4lHuQ",
  authDomain: "fitness-planner-f6d80.firebaseapp.com",
  databaseURL: "https://fitness-planner-f6d80-default-rtdb.firebaseio.com",
  projectId: "fitness-planner-f6d80",
  storageBucket: "fitness-planner-f6d80.firebasestorage.app",
  messagingSenderId: "419850275195",
  appId: "1:419850275195:web:7de3b20b066c3910fdd5de",
  measurementId: "G-F4W34KRH5W"
};

// Prevent double-init if page reloads
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db   = firebase.database();
console.log("Firebase connected successfully");

// ============================================
//  TOAST helper (replaces all alert() calls)
// ============================================
function toast(msg, duration = 2800) {
  let el = document.getElementById("__toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "__toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), duration);
}

// ============================================
//  AUTH
// ============================================
function signup() {
  const email = document.getElementById("email").value.trim();
  const pass  = document.getElementById("password").value;
  if (!email || !pass) return toast("⚠️ Fill in all fields");
  auth.createUserWithEmailAndPassword(email, pass)
    .then(() => {
      toast("✅ Account created! Redirecting…");
      setTimeout(() => location.href = "dashboard.html", 1500);
    })
    .catch(err => toast("❌ " + err.message));
}

function login() {
  const email = document.getElementById("email").value.trim();
  const pass  = document.getElementById("password").value;
  if (!email || !pass) return toast("⚠️ Fill in all fields");
  auth.signInWithEmailAndPassword(email, pass)
    .then(() => {
      toast("✅ Logged in! Redirecting…");
      setTimeout(() => location.href = "dashboard.html", 1500);
    })
    .catch(err => toast("❌ " + err.message));
}

function logout() {
  auth.signOut()
    .then(() => {
      toast("👋 Logged out");
      setTimeout(() => location.href = "login.html", 1000);
    })
    .catch(err => toast("❌ " + err.message));
}

// ============================================
//  BMI
// ============================================
function calculateBMI() {
  const h = parseFloat(document.getElementById("height").value);
  const w = parseFloat(document.getElementById("weightBMI").value);
  if (!h || !w) return toast("⚠️ Enter height and weight");
  const bmi = (w / ((h / 100) ** 2)).toFixed(1);
  let cat, color;
  if      (bmi < 18.5) { cat = "Underweight"; color = "#00c8ff"; }
  else if (bmi < 25)   { cat = "Normal ✅";   color = "#00ffb4"; }
  else if (bmi < 30)   { cat = "Overweight";  color = "#ffb400"; }
  else                 { cat = "Obese";        color = "#ff4060"; }
  const el = document.getElementById("bmiResult");
  if (!el) return;
  el.innerHTML = `
    <span style="font-size:2rem;font-family:'Orbitron',monospace;color:${color};">${bmi}</span>
    <br>
    <span style="color:${color};">${cat}</span>
  `;
}

// ============================================
//  WEIGHT / PROGRESS
// ============================================
let chart;

function saveWeight() {
  const w    = document.getElementById("weight").value;
  const user = auth.currentUser;
  if (!user) return toast("⚠️ Login first");
  if (!w)    return toast("⚠️ Enter your weight");
  db.ref("weights/" + user.uid).push({ weight: w, time: Date.now() })
    .then(() => toast("✅ Weight saved!"))
    .catch(err => toast("❌ " + err.message));
}

function loadWeights() {
  const user = auth.currentUser;
  if (!user) return;
  db.ref("weights/" + user.uid).on("value", snap => {
    const data = snap.val();
    const out  = document.getElementById("weightOutput");
    if (!data) {
      if (out) out.innerHTML = '<p style="color:var(--muted);text-align:center;">No entries yet</p>';
      return;
    }
    const entries = Object.values(data).sort((a, b) => a.time - b.time);
    const weights = entries.map(e => parseFloat(e.weight));
    const labels  = entries.map((_, i) => "Day " + (i + 1));
    if (out) {
      out.innerHTML = entries.map(e =>
        `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);color:var(--text);">
           <span>${new Date(e.time).toLocaleDateString()}</span>
           <span style="color:var(--neon);font-family:'Orbitron',monospace;">${e.weight} kg</span>
         </div>`
      ).join("");
    }
    const canvas = document.getElementById("weightChart");
    if (!canvas) return;
    if (chart) chart.destroy();
    chart = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Weight (kg)",
          data: weights,
          borderColor: "#00ffb4",
          backgroundColor: "rgba(0,255,180,.08)",
          borderWidth: 2,
          pointBackgroundColor: "#00ffb4",
          pointRadius: 5,
          tension: .4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: "#e0e0f0" } } },
        scales: {
          x: { ticks: { color: "#666688" }, grid: { color: "rgba(0,255,180,.06)" } },
          y: { ticks: { color: "#666688" }, grid: { color: "rgba(0,255,180,.06)" } }
        }
      }
    });
  });
}

// ============================================
//  DIET
// ============================================
const DIETS = {
  loss: [
    { meal: "Breakfast", items: "Oats with berries + green tea" },
    { meal: "Lunch",     items: "Grilled chicken salad + cucumber" },
    { meal: "Snack",     items: "Apple + a handful of almonds" },
    { meal: "Dinner",    items: "Steamed veggies + dal + brown rice" }
  ],
  gain: [
    { meal: "Breakfast", items: "Banana milkshake + 3 boiled eggs" },
    { meal: "Lunch",     items: "Chicken rice bowl + whole wheat chapati" },
    { meal: "Snack",     items: "Peanut butter toast + banana" },
    { meal: "Dinner",    items: "Paneer / fish curry + rice + milk" }
  ],
  maintain: [
    { meal: "Breakfast", items: "Poha / upma + fruit" },
    { meal: "Lunch",     items: "Dal + sabzi + roti + salad" },
    { meal: "Snack",     items: "Roasted chana / yoghurt" },
    { meal: "Dinner",    items: "Soup + grilled chicken / tofu + veggies" }
  ]
};

function showDiet() {
  const goal = document.getElementById("goal").value;
  const el   = document.getElementById("dietOutput");
  if (!goal) return toast("⚠️ Select a goal");
  if (!el)   return;
  const plan = DIETS[goal];
  el.innerHTML = plan.map(m =>
    `<div style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--border);">
       <span style="min-width:90px;font-family:'Orbitron',monospace;font-size:.75rem;color:var(--neon2);text-transform:uppercase;">${m.meal}</span>
       <span style="color:var(--text);">${m.items}</span>
     </div>`
  ).join("");
}

// ============================================
//  WORKOUT
// ============================================
const WORKOUTS = {
  loss: [
    { day: "Mon/Thu", ex: "30 min brisk walk + 3×15 squats" },
    { day: "Tue/Fri", ex: "20 min cycling + 3×12 jumping jacks" },
    { day: "Wed/Sat", ex: "HIIT (20s on / 10s off × 8 rounds)" },
    { day: "Sun",     ex: "Rest + light stretching" }
  ],
  gain: [
    { day: "Mon/Thu", ex: "Bench press 4×8 + Shoulder press 3×10" },
    { day: "Tue/Fri", ex: "Squats 4×8 + Leg press 3×12" },
    { day: "Wed/Sat", ex: "Deadlifts 4×6 + Barbell rows 3×10" },
    { day: "Sun",     ex: "Rest + foam rolling" }
  ],
  maintain: [
    { day: "Mon/Wed", ex: "Full-body circuit: 3×12 each exercise" },
    { day: "Tue/Thu", ex: "30 min jogging / swimming" },
    { day: "Fri",     ex: "Yoga / flexibility training" },
    { day: "Sat/Sun", ex: "Active rest — walk, sports" }
  ]
};

function showWorkout() {
  const goal = document.getElementById("goal").value;
  const el   = document.getElementById("workoutOutput");
  if (!goal) return toast("⚠️ Select a goal");
  if (!el)   return;
  const plan = WORKOUTS[goal];
  el.innerHTML = plan.map(w =>
    `<div style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--border);">
       <span style="min-width:80px;font-family:'Orbitron',monospace;font-size:.75rem;color:var(--neon);text-transform:uppercase;">${w.day}</span>
       <span style="color:var(--text);">${w.ex}</span>
     </div>`
  ).join("");
  const planCard = document.getElementById("planCard");
  if (planCard) planCard.style.display = "block";
}

// ============================================
//  CALORIES
// ============================================
function addCalories() {
  const cal  = document.getElementById("calories").value;
  const user = auth.currentUser;
  if (!user) return toast("⚠️ Login first");
  if (!cal)  return toast("⚠️ Enter calories");
  db.ref("calories/" + user.uid).push({ value: parseInt(cal), time: Date.now() })
    .then(() => {
      toast("✅ Calories logged!");
      document.getElementById("calories").value = "";
    })
    .catch(err => toast("❌ " + err.message));
}

function loadCalories() {
  const user = auth.currentUser;
  if (!user) return;
  db.ref("calories/" + user.uid).on("value", snap => {
    const data = snap.val();
    let total = 0;
    if (data) Object.values(data).forEach(e => total += parseInt(e.value || 0));
    const el = document.getElementById("totalCalories");
    if (el) el.textContent = total;
    const bar = document.getElementById("calBar");
    if (bar) bar.style.width = Math.min((total / 2500) * 100, 100) + "%";
  });
}

// ============================================
//  WATER
// ============================================
const DAILY_TARGET = 8;

function addWater() {
  const user = auth.currentUser;
  if (!user) return toast("⚠️ Login first");
  db.ref("water/" + user.uid).push({ time: Date.now() })
    .then(() => toast("💧 Glass logged!"))
    .catch(err => toast("❌ " + err.message));
}

function loadWater() {
  const user = auth.currentUser;
  if (!user) return;
  db.ref("water/" + user.uid).on("value", snap => {
    const count = snap.val() ? Object.keys(snap.val()).length : 0;
    const el    = document.getElementById("waterCount");
    if (el) el.textContent = count;
    const bar = document.getElementById("waterBar");
    if (bar) bar.style.width = Math.min((count / DAILY_TARGET) * 100, 100) + "%";
    const grid = document.getElementById("glassGrid");
    if (!grid) return;
    grid.querySelectorAll(".glass-btn").forEach((g, i) => {
      i < count ? g.classList.add("filled") : g.classList.remove("filled");
    });
  });
}

// ============================================
//  SLEEP
// ============================================
function addSleep() {
  const hours = document.getElementById("sleepHours").value;
  const user  = auth.currentUser;
  if (!user)  return toast("⚠️ Login first");
  if (!hours) return toast("⚠️ Enter sleep hours");
  db.ref("sleep/" + user.uid).set({ hours: parseFloat(hours) })
    .then(() => toast("✅ Sleep saved!"))
    .catch(err => toast("❌ " + err.message));
}

function loadSleep() {
  const user = auth.currentUser;
  if (!user) return;
  db.ref("sleep/" + user.uid).on("value", snap => {
    const data = snap.val();
    if (!data) return;
    const el = document.getElementById("sleepOutput");
    if (el) el.textContent = data.hours;
    const bar = document.getElementById("sleepBar");
    if (bar) bar.style.width = Math.min((data.hours / 8) * 100, 100) + "%";
  });
}

// ============================================
//  AUTO-LOAD on auth state change
// ============================================
auth.onAuthStateChanged(user => {
  if (!user) return;
  if (document.getElementById("totalCalories")) loadCalories();
  if (document.getElementById("waterCount"))    loadWater();
  if (document.getElementById("sleepOutput"))   loadSleep();
  if (document.getElementById("weightOutput"))  loadWeights();
});