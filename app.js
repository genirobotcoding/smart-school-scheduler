const state = {
  apiKey: localStorage.getItem("neisApiKey") || "",
  school: JSON.parse(localStorage.getItem("selectedSchool") || "null"),
  todos: normalizeTodos(JSON.parse(localStorage.getItem("todos") || "[]")),
};

const demoSchool = {
  SCHUL_NM: "샘플중학교",
  ATPT_OFCDC_SC_CODE: "B10",
  SD_SCHUL_CODE: "7010057",
  ORG_RDNMA: "서울특별시 스마트구 일정로 12",
};

const demoMeals = [
  {
    MMEAL_SC_NM: "중식",
    DDISH_NM: "찰현미밥<br/>미역국<br/>닭갈비<br/>콩나물무침<br/>배추김치<br/>귤",
    CAL_INFO: "781.4 Kcal",
  },
];

const demoSchedules = [
  { AA_YMD: formatDate(addDays(new Date(), 1)), EVENT_NM: "동아리 활동", EVENT_CNTNT: "창의적 체험활동" },
  { AA_YMD: formatDate(addDays(new Date(), 3)), EVENT_NM: "영어 수행평가", EVENT_CNTNT: "말하기 발표" },
  { AA_YMD: formatDate(addDays(new Date(), 14)), EVENT_NM: "1학기 기말고사", EVENT_CNTNT: "시험 시작" },
];

const els = {
  apiKeyInput: document.querySelector("#apiKeyInput"),
  schoolNameInput: document.querySelector("#schoolNameInput"),
  searchButton: document.querySelector("#searchButton"),
  settingsToggle: document.querySelector("#settingsToggle"),
  settingsPanel: document.querySelector("#settingsPanel"),
  schoolResults: document.querySelector("#schoolResults"),
  schoolTitle: document.querySelector("#schoolTitle"),
  todayChip: document.querySelector("#todayChip"),
  ddayValue: document.querySelector("#ddayValue"),
  ddayLabel: document.querySelector("#ddayLabel"),
  mealStatus: document.querySelector("#mealStatus"),
  mealShort: document.querySelector("#mealShort"),
  scheduleCount: document.querySelector("#scheduleCount"),
  mealBox: document.querySelector("#mealBox"),
  scheduleList: document.querySelector("#scheduleList"),
  loadTodayButton: document.querySelector("#loadTodayButton"),
  loadWeekButton: document.querySelector("#loadWeekButton"),
  todoForm: document.querySelector("#todoForm"),
  todoInput: document.querySelector("#todoInput"),
  todoDateInput: document.querySelector("#todoDateInput"),
  todoCount: document.querySelector("#todoCount"),
  todoList: document.querySelector("#todoList"),
  schoolButtonTemplate: document.querySelector("#schoolButtonTemplate"),
};

els.apiKeyInput.value = state.apiKey;
els.todoDateInput.value = toInputDate(new Date());
els.todayChip.textContent = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "long",
}).format(new Date());

function normalizeTodos(todos) {
  return todos.map((todo) => {
    if (typeof todo === "string") return { text: todo, dueDate: toInputDate(new Date()), done: false };
    return {
      text: todo.text || "",
      dueDate: todo.dueDate || toInputDate(new Date()),
      done: Boolean(todo.done),
    };
  });
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function readableDate(yyyymmdd) {
  return `${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
}

function readableInputDate(dateValue) {
  const [year, month, day] = dateValue.split("-");
  return `${month}.${day}`;
}

function stripMealText(value) {
  return value.replace(/<br\s*\/?>/gi, ", ").replace(/\([^)]+\)/g, "").replace(/\s+/g, " ").trim();
}

function saveState() {
  localStorage.setItem("neisApiKey", state.apiKey);
  localStorage.setItem("selectedSchool", JSON.stringify(state.school));
  localStorage.setItem("todos", JSON.stringify(state.todos));
}

function showSettings(show) {
  els.settingsPanel.classList.toggle("hidden", !show);
  els.schoolResults.classList.toggle("hidden", !show);
  els.settingsToggle.textContent = show ? "닫기" : "설정";
}

async function neis(endpoint, params) {
  const url = new URL(`https://open.neis.go.kr/hub/${endpoint}`);
  url.searchParams.set("Type", "json");
  url.searchParams.set("pIndex", "1");
  url.searchParams.set("pSize", "20");
  if (state.apiKey) url.searchParams.set("KEY", state.apiKey);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url);
  if (!response.ok) throw new Error("나이스 API 응답을 받을 수 없습니다.");
  const data = await response.json();
  if (data.RESULT?.CODE && data.RESULT.CODE !== "INFO-000") return [];
  return data[endpoint]?.[1]?.row || [];
}

function setSchool(school) {
  state.school = school;
  saveState();
  els.schoolTitle.textContent = school.SCHUL_NM;
  showSettings(false);
  loadDashboard();
}

async function searchSchools() {
  const query = els.schoolNameInput.value.trim();
  state.apiKey = els.apiKeyInput.value.trim();
  saveState();

  if (!query || !state.apiKey) {
    renderSchoolResults([demoSchool], !state.apiKey ? "API 키가 없어 데모 학교를 표시합니다." : "학교명을 입력해 주세요.");
    return;
  }

  try {
    const rows = await neis("schoolInfo", { SCHUL_NM: query });
    renderSchoolResults(rows.length ? rows : [demoSchool], rows.length ? "" : "검색 결과가 없어 데모 학교를 표시합니다.");
  } catch {
    renderSchoolResults([demoSchool], "연동에 실패해 데모 학교를 표시합니다.");
  }
}

function renderSchoolResults(schools, message = "") {
  els.schoolResults.innerHTML = "";
  if (message) {
    const notice = document.createElement("div");
    notice.className = "empty-state";
    notice.textContent = message;
    els.schoolResults.append(notice);
  }

  schools.forEach((school) => {
    const button = els.schoolButtonTemplate.content.firstElementChild.cloneNode(true);
    button.innerHTML = `<strong>${school.SCHUL_NM}</strong><span>${school.ORG_RDNMA || "학교 주소 정보 없음"}</span>`;
    button.addEventListener("click", () => setSchool(school));
    els.schoolResults.append(button);
  });
}

async function loadMeals() {
  const school = state.school || demoSchool;
  if (!state.apiKey) return demoMeals;
  const rows = await neis("mealServiceDietInfo", {
    ATPT_OFCDC_SC_CODE: school.ATPT_OFCDC_SC_CODE,
    SD_SCHUL_CODE: school.SD_SCHUL_CODE,
    MLSV_YMD: formatDate(new Date()),
  });
  return rows.length ? rows : demoMeals;
}

async function loadSchedules() {
  const school = state.school || demoSchool;
  if (!state.apiKey) return demoSchedules;
  const today = new Date();
  const rows = await neis("SchoolSchedule", {
    ATPT_OFCDC_SC_CODE: school.ATPT_OFCDC_SC_CODE,
    SD_SCHUL_CODE: school.SD_SCHUL_CODE,
    AA_FROM_YMD: formatDate(today),
    AA_TO_YMD: formatDate(addDays(today, 7)),
  });
  return rows.length ? rows : demoSchedules;
}

function renderMeals(rows) {
  els.mealBox.innerHTML = "";
  rows.forEach((meal) => {
    const card = document.createElement("div");
    card.className = "meal-card";
    card.innerHTML = `<h3>${meal.MMEAL_SC_NM || "급식"}</h3><p>${stripMealText(meal.DDISH_NM || "급식 정보가 없습니다.")}</p><p>${meal.CAL_INFO || ""}</p>`;
    els.mealBox.append(card);
  });
  els.mealStatus.textContent = rows[0]?.MMEAL_SC_NM || "확인";
  els.mealShort.textContent = stripMealText(rows[0]?.DDISH_NM || "급식 정보가 없습니다.").slice(0, 28);
}

function renderSchedules(rows) {
  els.scheduleList.innerHTML = "";
  rows.forEach((item) => {
    const card = document.createElement("div");
    card.className = "schedule-item";
    card.innerHTML = `<div class="schedule-date">${readableDate(item.AA_YMD)}</div><div><h3>${item.EVENT_NM || "학교 일정"}</h3><p>${item.EVENT_CNTNT || "상세 내용 없음"}</p></div>`;
    els.scheduleList.append(card);
  });
  els.scheduleCount.textContent = `${rows.length}개`;
  updateDday(rows);
}

function updateDday(rows) {
  const exam = rows.find((item) => /시험|고사|평가/.test(item.EVENT_NM + item.EVENT_CNTNT)) || demoSchedules[2];
  const today = new Date(toInputDate(new Date()));
  const target = new Date(exam.AA_YMD.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"));
  const days = Math.ceil((target - today) / 86400000);
  els.ddayValue.textContent = days >= 0 ? `D-${days}` : "종료";
  els.ddayLabel.textContent = `${exam.EVENT_NM || "시험"}까지`;
}

async function loadDashboard() {
  els.schoolTitle.textContent = (state.school || demoSchool).SCHUL_NM;
  els.mealBox.innerHTML = `<div class="empty-state">급식 정보를 불러오는 중입니다.</div>`;
  els.scheduleList.innerHTML = `<div class="empty-state">학사일정을 불러오는 중입니다.</div>`;

  try {
    const [meals, schedules] = await Promise.all([loadMeals(), loadSchedules()]);
    renderMeals(meals);
    renderSchedules(schedules);
  } catch {
    renderMeals(demoMeals);
    renderSchedules(demoSchedules);
  }
}

function renderTodos() {
  const sortedTodos = [...state.todos].sort((a, b) => {
    if (a.done !== b.done) return Number(a.done) - Number(b.done);
    return a.dueDate.localeCompare(b.dueDate);
  });

  els.todoList.innerHTML = "";
  els.todoCount.textContent = `${state.todos.filter((todo) => !todo.done).length}개`;

  if (!state.todos.length) {
    const empty = document.createElement("li");
    empty.className = "todo-empty";
    empty.textContent = "아직 추가한 할 일이 없습니다.";
    els.todoList.append(empty);
    return;
  }

  sortedTodos.forEach((todo) => {
    const index = state.todos.indexOf(todo);
    const item = document.createElement("li");
    item.className = todo.done ? "todo-done" : "";
    item.innerHTML = `
      <label class="todo-check">
        <input type="checkbox" ${todo.done ? "checked" : ""} />
        <span>
          <strong>${todo.text}</strong>
          <small>${readableInputDate(todo.dueDate)}까지</small>
        </span>
      </label>
      <button type="button" aria-label="삭제">×</button>
    `;
    item.querySelector("input").addEventListener("change", (event) => {
      state.todos[index].done = event.target.checked;
      saveState();
      renderTodos();
    });
    item.querySelector("button").addEventListener("click", () => {
      state.todos.splice(index, 1);
      saveState();
      renderTodos();
    });
    els.todoList.append(item);
  });
}

els.settingsToggle.addEventListener("click", () => {
  showSettings(els.settingsPanel.classList.contains("hidden"));
});
els.searchButton.addEventListener("click", searchSchools);
els.loadTodayButton.addEventListener("click", loadDashboard);
els.loadWeekButton.addEventListener("click", loadDashboard);
els.schoolNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") searchSchools();
});
els.todoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = els.todoInput.value.trim();
  const dueDate = els.todoDateInput.value || toInputDate(new Date());
  if (!text) return;
  state.todos.push({ text, dueDate, done: false });
  els.todoInput.value = "";
  els.todoDateInput.value = toInputDate(new Date());
  saveState();
  renderTodos();
});

renderSchoolResults([state.school || demoSchool], state.apiKey ? "" : "API 키를 넣으면 실제 학교 검색과 급식/학사일정을 불러옵니다.");
showSettings(!state.school);
loadDashboard();
renderTodos();
