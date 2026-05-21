interface GutiData {
  startDate: string | null;
  records: { [date: string]: 'O' | 'X' | 'OFF' };
  offDays: number[];
  taskTitle?: string;
  lockPastDates?: boolean;
}

const holidays2026: { [key: string]: string } = {
  "2026-01-01": "元日", "2026-01-12": "成人の日", "2026-02-11": "建国記念の日",
  "2026-02-23": "天皇誕生日", "2026-03-20": "春分の日", "2026-04-29": "昭和の日",
  "2026-05-03": "憲法記念日", "2026-05-04": "みどりの日", "2026-05-05": "こどもの日",
  "2026-05-06": "振替休日", "2026-07-20": "海の日", "2026-08-11": "山の日",
  "2026-09-21": "敬老の日", "2026-09-22": "国民の休日", "2026-09-23": "秋分の日",
  "2026-10-12": "スポーツの日", "2026-11-03": "文化の日", "2026-11-23": "勤労感謝の日"
};

let currentViewYear: number;
let currentViewMonth: number;

function getJSTDate(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 9));
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function loadData(): GutiData {
  const saved = localStorage.getItem('guti_data');
  if (saved) {
    const data = JSON.parse(saved);
    if (!data.offDays) data.offDays = [];
    if (!data.taskTitle) data.taskTitle = '最低30分ヨガする';
    if (data.lockPastDates === undefined) data.lockPastDates = true; // デフォルトはON
    return data;
  }
  return { startDate: null, records: {}, offDays: [], taskTitle: '最低30分ヨガする', lockPastDates: true };
}

function saveData(data: GutiData) {
  localStorage.setItem('guti_data', JSON.stringify(data));
}

function updateTaskTitleUI() {
  const data = loadData();
  const titleEl = document.getElementById('task-title');
  if (titleEl) titleEl.textContent = data.taskTitle || '最低30分ヨガする';
}

function getMedalSVG(duration: number): string {
  if (duration >= 365) return `<svg class="medal-icon" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 12L2 9l4-6z"/><path d="M2 9h20M12 21V9M18 3l-6 6M6 3l6 6"/></svg>`;
  if (duration >= 180) return `<svg class="medal-icon" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/><circle cx="12" cy="12" r="4" fill="#cbd5e1"/></svg>`;
  if (duration >= 90) return `<svg class="medal-icon" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`;
  if (duration >= 30) return `<svg class="medal-icon" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`;
  if (duration >= 7) return `<svg class="medal-icon" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`;
  return '';
}

function updateStatsAndPastDays(data: GutiData, todayStr: string, jstToday: Date) {
  // 開始日（startDate）を、OかXが記録されている最も古い日に自動更新する
  const activeDates = Object.keys(data.records).filter(k => data.records[k] === 'O' || data.records[k] === 'X');
  if (activeDates.length > 0) {
    activeDates.sort();
    data.startDate = activeDates[0];
  } else {
    data.startDate = null;
  }

  // 開始日から今日までの間を埋める処理
  if (data.startDate) {
    const start = new Date(data.startDate);
    const today = new Date(jstToday.getFullYear(), jstToday.getMonth(), jstToday.getDate());
    for (let d = new Date(start); d < today; d.setDate(d.getDate() + 1)) {
      const dStr = formatDate(d);
      if (!data.records[dStr]) {
        data.records[dStr] = data.offDays.includes(d.getDay()) ? 'OFF' : 'X';
      }
    }
  }

  // ストリークと継続期間の計算
  let streak = 0;
  let duration = 0;
  let checkDate = new Date(jstToday.getFullYear(), jstToday.getMonth(), jstToday.getDate());
  
  const todayStatus = data.records[todayStr];
  const isTodayOffDay = data.offDays.includes(jstToday.getDay());

  if (todayStatus === 'O') {
    streak++; duration++; checkDate.setDate(checkDate.getDate() - 1);
  } else if (todayStatus === 'X') {
    // 途切れ
  } else if (isTodayOffDay || todayStatus === 'OFF') {
    duration++; checkDate.setDate(checkDate.getDate() - 1);
  } else {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  if (todayStatus !== 'X') {
    while (true) {
      const checkStr = formatDate(checkDate);
      const status = data.records[checkStr];
      const isOffDay = data.offDays.includes(checkDate.getDay());

      if (status === 'O') {
        streak++; duration++;
      } else if (status === 'OFF' || (!status && isOffDay)) {
        duration++;
      } else {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  const streakNumEl = document.getElementById('streak-number');
  const medalEl = document.getElementById('medal-display');
  if (streakNumEl) streakNumEl.textContent = String(streak);
  if (medalEl) medalEl.innerHTML = getMedalSVG(duration);
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const monthDisplay = document.getElementById('current-month-display');
  if (!grid || !monthDisplay) return;
  
  grid.innerHTML = '';
  monthDisplay.textContent = `${currentViewYear}年 ${currentViewMonth + 1}月`;

  const jstToday = getJSTDate();
  const todayStr = formatDate(jstToday);
  const data = loadData();

  updateStatsAndPastDays(data, todayStr, jstToday);
  saveData(data); // 動的計算の結果を保存

  const firstDay = new Date(currentViewYear, currentViewMonth, 1).getDay();
  const lastDate = new Date(currentViewYear, currentViewMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'day-cell empty';
    grid.appendChild(emptyCell);
  }

  for (let d = 1; d <= lastDate; d++) {
    const cellDate = new Date(currentViewYear, currentViewMonth, d);
    const dateStr = formatDate(cellDate);
    const dayOfWeek = cellDate.getDay();
    const isHoliday = holidays2026[dateStr] !== undefined;

    const cell = document.createElement('div');
    cell.className = 'day-cell';
    
    if (dayOfWeek === 0) cell.classList.add('is-sunday');
    if (dayOfWeek === 6) cell.classList.add('is-saturday');
    if (isHoliday) cell.classList.add('is-holiday');

    const dateNum = document.createElement('span');
    dateNum.className = 'date-num';
    dateNum.textContent = String(d);

    const statusSpan = document.createElement('span');
    statusSpan.className = 'status';

    let displayStatus = data.records[dateStr];
    if (!displayStatus && data.offDays.includes(dayOfWeek)) {
      displayStatus = 'OFF';
    }

    if (displayStatus) {
      statusSpan.textContent = displayStatus === 'O' ? '○' : displayStatus === 'X' ? '×' : 'OFF';
      if (displayStatus === 'O') {
        statusSpan.style.color = '#4ade80'; statusSpan.style.fontSize = '2.4rem';
      }
      if (displayStatus === 'X') {
        statusSpan.style.color = '#fca5a5'; statusSpan.style.fontSize = '1.1rem';
      }
      if (displayStatus === 'OFF') {
        statusSpan.style.color = '#9ca3af'; statusSpan.style.fontSize = '1.2rem';
      }
    }

    if (dateStr === todayStr) {
      cell.style.border = '2px solid #555';
    }

    // 未来日は編集不可、過去日はロック設定に従う
    const isFuture = dateStr > todayStr;
    const canEdit = dateStr === todayStr || (!isFuture && !data.lockPastDates);

    if (canEdit) {
      cell.classList.add('clickable');
      cell.addEventListener('click', () => {
        const current = data.records[dateStr];
        // タップで O → X → OFF → O と切り替わる（手動でOFFに上書き可能）
        if (current === 'O') {
          data.records[dateStr] = 'X';
        } else if (current === 'X') {
          data.records[dateStr] = 'OFF';
        } else {
          data.records[dateStr] = 'O';
        }
        saveData(data);
        renderCalendar(); // クリックごとに再描画＆統計計算
      });
    }

    cell.appendChild(dateNum);
    cell.appendChild(statusSpan);
    grid.appendChild(cell);
  }
}

function setupNavigation() {
  const prevBtn = document.getElementById('prev-month-btn');
  const nextBtn = document.getElementById('next-month-btn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentViewMonth--;
      if (currentViewMonth < 0) { currentViewMonth = 11; currentViewYear--; }
      renderCalendar();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentViewMonth++;
      if (currentViewMonth > 11) { currentViewMonth = 0; currentViewYear++; }
      renderCalendar();
    });
  }
}

function setupSettings() {
  const btn = document.getElementById('settings-btn');
  const modal = document.getElementById('settings-modal');
  const closeBtn = document.getElementById('close-settings-btn');
  const container = document.getElementById('off-days-container');
  const taskInput = document.getElementById('task-input') as HTMLInputElement;
  const saveTaskBtn = document.getElementById('save-task-btn');
  const lockCheckbox = document.getElementById('lock-past-checkbox') as HTMLInputElement;
  const resetBtn = document.getElementById('reset-data-btn');

  if (!btn || !modal || !closeBtn || !container) return;
  const weekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  btn.addEventListener('click', () => {
    const data = loadData();
    if (taskInput) taskInput.value = data.taskTitle || '最低30分ヨガする';
    if (lockCheckbox) lockCheckbox.checked = data.lockPastDates !== false;

    container.innerHTML = '';
    weekNames.forEach((name, index) => {
      const dayBtn = document.createElement('button');
      dayBtn.className = 'off-day-btn';
      dayBtn.textContent = name;
      if (data.offDays.includes(index)) dayBtn.classList.add('active');
      
      dayBtn.addEventListener('click', () => {
        dayBtn.classList.toggle('active');
        let currentData = loadData();
        if (dayBtn.classList.contains('active')) {
          if (!currentData.offDays.includes(index)) currentData.offDays.push(index);
        } else {
          currentData.offDays = currentData.offDays.filter(d => d !== index);
        }
        saveData(currentData);
        renderCalendar();
      });
      container.appendChild(dayBtn);
    });
    modal.classList.remove('hidden');
  });

  if (saveTaskBtn && taskInput) {
    saveTaskBtn.addEventListener('click', () => {
      const data = loadData();
      const newTitle = taskInput.value.trim();
      if (newTitle !== '') {
        data.taskTitle = newTitle;
        saveData(data);
        updateTaskTitleUI();
        const originalText = saveTaskBtn.textContent;
        saveTaskBtn.textContent = '保存完了！';
        setTimeout(() => { saveTaskBtn.textContent = originalText; }, 1500);
      }
    });
  }

  if (lockCheckbox) {
    lockCheckbox.addEventListener('change', (e) => {
      const data = loadData();
      data.lockPastDates = (e.target as HTMLInputElement).checked;
      saveData(data);
      renderCalendar();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('本当にすべての記録をリセットしますか？この操作は取り消せません。')) {
        const data = loadData();
        data.records = {};
        data.startDate = null;
        saveData(data);
        renderCalendar();
        modal.classList.add('hidden');
      }
    });
  }

  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const jstToday = getJSTDate();
  currentViewYear = jstToday.getFullYear();
  currentViewMonth = jstToday.getMonth();
  updateTaskTitleUI();
  setupNavigation();
  setupSettings();
  renderCalendar();
});