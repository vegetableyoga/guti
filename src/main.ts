export type OffMode = 'weekly' | 'cycle';

export interface TaskItem {
  id: string;
  title: string;
  createdAt?: string;
  startDate: string | null;
  records: { [date: string]: 'O' | 'X' | 'OFF' };
  offDays: number[];
  offMode?: OffMode;
  cycleWork?: number;
  cycleRest?: number;
}

export interface AppData {
  tasks: TaskItem[];
  activeTaskId: string;
  lockPastDates: boolean;
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

function parseDateStr(str: string): Date {
  const parts = str.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function generateId(): string {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
}

function loadData(): AppData {
  const todayStr = formatDate(getJSTDate());
  const saved = localStorage.getItem('guti_data');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (!parsed.tasks) {
      const initialTask: TaskItem = {
        id: 'default_task',
        title: parsed.taskTitle || '最低30分ヨガする',
        createdAt: todayStr,
        startDate: parsed.startDate || null,
        records: parsed.records || {},
        offDays: parsed.offDays || [],
        offMode: 'weekly',
        cycleWork: 3,
        cycleRest: 1
      };
      return {
        tasks: [initialTask],
        activeTaskId: 'default_task',
        lockPastDates: parsed.lockPastDates ?? true
      };
    }
    parsed.tasks.forEach((t: TaskItem) => {
      if (!t.createdAt) t.createdAt = t.startDate || todayStr;
      if (!t.offMode) t.offMode = 'weekly';
      if (!t.cycleWork) t.cycleWork = 3;
      if (!t.cycleRest) t.cycleRest = 1;
    });
    return parsed;
  }

  const defaultTask: TaskItem = {
    id: 'default_task',
    title: '最低30分ヨガする',
    createdAt: todayStr,
    startDate: null,
    records: {},
    offDays: [],
    offMode: 'weekly',
    cycleWork: 3,
    cycleRest: 1
  };
  return {
    tasks: [defaultTask],
    activeTaskId: 'default_task',
    lockPastDates: true
  };
}

function saveData(data: AppData) {
  localStorage.setItem('guti_data', JSON.stringify(data));
}

function getActiveTask(data: AppData): TaskItem {
  let task = data.tasks.find(t => t.id === data.activeTaskId);
  if (!task) {
    task = data.tasks[0];
    data.activeTaskId = task.id;
  }
  return task;
}

function updateTabsUI() {
  const data = loadData();
  const tabsContainer = document.getElementById('task-tabs');
  const taskTitleEl = document.getElementById('task-title');
  if (!tabsContainer) return;

  tabsContainer.innerHTML = '';
  const activeTask = getActiveTask(data);

  if (taskTitleEl) {
    taskTitleEl.textContent = activeTask.title;
  }

  data.tasks.forEach(task => {
    const tab = document.createElement('div');
    tab.className = `task-tab ${task.id === data.activeTaskId ? 'active' : ''}`;
    
    const span = document.createElement('span');
    span.textContent = task.title;
    tab.appendChild(span);

    tab.addEventListener('click', () => {
      const latestData = loadData();
      if (latestData.activeTaskId !== task.id) {
        latestData.activeTaskId = task.id;
        saveData(latestData);
        updateTabsUI();
        renderCalendar();
      }
    });

    tabsContainer.appendChild(tab);
  });
}

function getMedalSVG(duration: number): string {
  if (duration >= 365) return `<svg class="medal-icon" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 12L2 9l4-6z"/><path d="M2 9h20M12 21V9M18 3l-6 6M6 3l6 6"/></svg>`;
  if (duration >= 180) return `<svg class="medal-icon" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/><circle cx="12" cy="12" r="4" fill="#cbd5e1"/></svg>`;
  if (duration >= 90) return `<svg class="medal-icon" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`;
  if (duration >= 30) return `<svg class="medal-icon" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`;
  if (duration >= 7) return `<svg class="medal-icon" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`;
  return '';
}

function updateStatsAndPastDays(task: TaskItem, todayStr: string, jstToday: Date): Map<string, boolean> {
  const isOffComputedMap = new Map<string, boolean>();

  const activeDates = Object.keys(task.records).filter(k => task.records[k] === 'O' || task.records[k] === 'X');
  if (activeDates.length > 0) {
    activeDates.sort();
    task.startDate = activeDates[0];
  } else {
    task.startDate = null;
  }

  const effectiveStartStr = task.startDate || task.createdAt;
  if (!effectiveStartStr) return isOffComputedMap;

  const start = parseDateStr(effectiveStartStr);
  const today = parseDateStr(todayStr);

  const offMode = task.offMode || 'weekly';
  const cycleWork = task.cycleWork || 3;
  const cycleRest = task.cycleRest || 1;

  const endOfSimulation = new Date(currentViewYear, currentViewMonth + 1, 0);
  const simEnd = endOfSimulation > today ? endOfSimulation : today;

  let currentStreakInCycle = 0;
  let restDaysRemaining = 0;

  for (let d = new Date(start); d <= simEnd; d.setDate(d.getDate() + 1)) {
    const dStr = formatDate(d);
    const dayOfWeek = d.getDay();
    const isPast = d < today;

    let isScheduledOff = false;

    if (offMode === 'weekly') {
      isScheduledOff = task.offDays.includes(dayOfWeek);
    } else {
      if (restDaysRemaining > 0) {
        isScheduledOff = true;
      }
    }

    isOffComputedMap.set(dStr, isScheduledOff);

    if (isPast && !task.records[dStr]) {
      task.records[dStr] = isScheduledOff ? 'OFF' : 'X';
    }

    const actualStatus = task.records[dStr];
    if (offMode === 'cycle') {
      if (actualStatus === 'O') {
        currentStreakInCycle++;
        restDaysRemaining = 0;
        if (currentStreakInCycle >= cycleWork) {
          restDaysRemaining = cycleRest;
          currentStreakInCycle = 0;
        }
      } else if (actualStatus === 'X') {
        currentStreakInCycle = 0;
        restDaysRemaining = 0;
      } else if (actualStatus === 'OFF' || (!actualStatus && isScheduledOff)) {
        if (restDaysRemaining > 0) {
          restDaysRemaining--;
        }
      }
    }
  }

  let streak = 0;
  let duration = 0;
  let checkDate = new Date(jstToday.getFullYear(), jstToday.getMonth(), jstToday.getDate());
  
  const todayStatus = task.records[todayStr];
  const isTodayOff = isOffComputedMap.get(todayStr) ?? false;

  if (todayStatus === 'O') {
    streak++; duration++; checkDate.setDate(checkDate.getDate() - 1);
  } else if (todayStatus === 'X') {
    // 途切れ
  } else if (isTodayOff || todayStatus === 'OFF') {
    duration++; checkDate.setDate(checkDate.getDate() - 1);
  } else {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  if (todayStatus !== 'X') {
    while (true) {
      const checkStr = formatDate(checkDate);
      const status = task.records[checkStr];
      const isOff = isOffComputedMap.get(checkStr) ?? (offMode === 'weekly' && task.offDays.includes(checkDate.getDay()));

      if (status === 'O') {
        streak++; duration++;
      } else if (status === 'OFF' || (!status && isOff)) {
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

  return isOffComputedMap;
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
  const activeTask = getActiveTask(data);

  const isOffComputedMap = updateStatsAndPastDays(activeTask, todayStr, jstToday);
  saveData(data);

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

    const isAutoOff = isOffComputedMap.get(dateStr) ?? (activeTask.offMode === 'weekly' && activeTask.offDays.includes(dayOfWeek));
    let displayStatus = activeTask.records[dateStr];
    if (!displayStatus && isAutoOff) {
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

    const isFuture = dateStr > todayStr;
    const canEdit = dateStr === todayStr || (!isFuture && !data.lockPastDates);

    if (canEdit) {
      cell.classList.add('clickable');
      cell.addEventListener('click', () => {
        const latestData = loadData();
        const currentActiveTask = getActiveTask(latestData);
        const current = currentActiveTask.records[dateStr];
        if (current === 'O') {
          currentActiveTask.records[dateStr] = 'X';
        } else if (current === 'X') {
          currentActiveTask.records[dateStr] = 'OFF';
        } else {
          currentActiveTask.records[dateStr] = 'O';
        }
        saveData(latestData);
        renderCalendar();
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
  const taskInput = document.getElementById('task-input') as HTMLInputElement;
  const saveTaskBtn = document.getElementById('save-task-btn');
  const newTaskInput = document.getElementById('new-task-input') as HTMLInputElement;
  const addTaskBtn = document.getElementById('add-task-btn');
  const deleteTaskContainer = document.getElementById('delete-task-container');
  const deleteTaskBtn = document.getElementById('delete-task-btn');
  const lockCheckbox = document.getElementById('lock-past-checkbox') as HTMLInputElement;
  const resetBtn = document.getElementById('reset-data-btn');

  const modeWeeklyBtn = document.getElementById('mode-weekly-btn');
  const modeCycleBtn = document.getElementById('mode-cycle-btn');
  const weeklySection = document.getElementById('weekly-off-section');
  const cycleSection = document.getElementById('cycle-off-section');
  const container = document.getElementById('off-days-container');
  const cycleWorkSelect = document.getElementById('cycle-work-select') as HTMLSelectElement;
  const cycleRestSelect = document.getElementById('cycle-rest-select') as HTMLSelectElement;

  if (!btn || !modal || !closeBtn) return;
  const weekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // 1〜10の選択肢を生成
  if (cycleWorkSelect && cycleRestSelect) {
    cycleWorkSelect.innerHTML = '';
    cycleRestSelect.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
      const opt1 = document.createElement('option');
      opt1.value = String(i);
      opt1.textContent = String(i);
      cycleWorkSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = String(i);
      opt2.textContent = String(i);
      cycleRestSelect.appendChild(opt2);
    }
  }

  function setOffModeUI(mode: OffMode) {
    if (mode === 'weekly') {
      modeWeeklyBtn?.classList.add('active');
      modeCycleBtn?.classList.remove('active');
      if (weeklySection) weeklySection.style.display = 'block';
      if (cycleSection) cycleSection.style.display = 'none';
    } else {
      modeCycleBtn?.classList.add('active');
      modeWeeklyBtn?.classList.remove('active');
      if (weeklySection) weeklySection.style.display = 'none';
      if (cycleSection) cycleSection.style.display = 'block';
    }
  }

  function refreshModalFields() {
    const data = loadData();
    const activeTask = getActiveTask(data);

    if (taskInput) taskInput.value = activeTask.title;
    if (lockCheckbox) lockCheckbox.checked = data.lockPastDates !== false;
    if (newTaskInput) newTaskInput.value = '';

    if (deleteTaskContainer) {
      deleteTaskContainer.style.display = data.tasks.length > 1 ? 'block' : 'none';
    }

    const mode = activeTask.offMode || 'weekly';
    setOffModeUI(mode);

    if (cycleWorkSelect) cycleWorkSelect.value = String(activeTask.cycleWork || 3);
    if (cycleRestSelect) cycleRestSelect.value = String(activeTask.cycleRest || 1);

    if (container) {
      container.innerHTML = '';
      weekNames.forEach((name, index) => {
        const dayBtn = document.createElement('button');
        dayBtn.type = 'button';
        dayBtn.className = 'off-day-btn';
        dayBtn.textContent = name;
        if (activeTask.offDays.includes(index)) dayBtn.classList.add('active');
        
        dayBtn.addEventListener('click', () => {
          dayBtn.classList.toggle('active');
          const currentData = loadData();
          const currentTask = getActiveTask(currentData);
          if (dayBtn.classList.contains('active')) {
            if (!currentTask.offDays.includes(index)) currentTask.offDays.push(index);
          } else {
            currentTask.offDays = currentTask.offDays.filter(d => d !== index);
          }
          saveData(currentData);
          renderCalendar();
        });
        container.appendChild(dayBtn);
      });
    }
  }

  // モードタブの切り替え
  if (modeWeeklyBtn) {
    modeWeeklyBtn.addEventListener('click', () => {
      const data = loadData();
      const activeTask = getActiveTask(data);
      activeTask.offMode = 'weekly';
      saveData(data);
      setOffModeUI('weekly');
      renderCalendar();
    });
  }

  if (modeCycleBtn) {
    modeCycleBtn.addEventListener('click', () => {
      const data = loadData();
      const activeTask = getActiveTask(data);
      activeTask.offMode = 'cycle';
      saveData(data);
      setOffModeUI('cycle');
      renderCalendar();
    });
  }

  if (cycleWorkSelect) {
    cycleWorkSelect.addEventListener('change', () => {
      const data = loadData();
      const activeTask = getActiveTask(data);
      activeTask.cycleWork = parseInt(cycleWorkSelect.value, 10);
      saveData(data);
      renderCalendar();
    });
  }

  if (cycleRestSelect) {
    cycleRestSelect.addEventListener('change', () => {
      const data = loadData();
      const activeTask = getActiveTask(data);
      activeTask.cycleRest = parseInt(cycleRestSelect.value, 10);
      saveData(data);
      renderCalendar();
    });
  }

  btn.addEventListener('click', () => {
    refreshModalFields();
    modal.classList.remove('hidden');
  });

  if (addTaskBtn && newTaskInput) {
    addTaskBtn.addEventListener('click', () => {
      const title = newTaskInput.value.trim();
      if (!title) return;

      const data = loadData();
      const newTask: TaskItem = {
        id: generateId(),
        title,
        createdAt: formatDate(getJSTDate()),
        startDate: null,
        records: {},
        offDays: [],
        offMode: 'weekly',
        cycleWork: 3,
        cycleRest: 1
      };
      data.tasks.push(newTask);
      data.activeTaskId = newTask.id;
      saveData(data);

      updateTabsUI();
      renderCalendar();
      refreshModalFields();
      
      const originalText = addTaskBtn.textContent;
      addTaskBtn.textContent = '追加完了！';
      setTimeout(() => { addTaskBtn.textContent = originalText; }, 1200);
    });
  }

  if (saveTaskBtn && taskInput) {
    saveTaskBtn.addEventListener('click', () => {
      const data = loadData();
      const activeTask = getActiveTask(data);
      const newTitle = taskInput.value.trim();
      if (newTitle !== '') {
        activeTask.title = newTitle;
        saveData(data);
        updateTabsUI();
        const originalText = saveTaskBtn.textContent;
        saveTaskBtn.textContent = '保存完了！';
        setTimeout(() => { saveTaskBtn.textContent = originalText; }, 1200);
      }
    });
  }

  if (deleteTaskBtn) {
    deleteTaskBtn.addEventListener('click', () => {
      const data = loadData();
      if (data.tasks.length <= 1) return;

      const activeTask = getActiveTask(data);
      if (confirm(`タスク「${activeTask.title}」と記録を削除しますか？`)) {
        data.tasks = data.tasks.filter(t => t.id !== activeTask.id);
        data.activeTaskId = data.tasks[0].id;
        saveData(data);
        updateTabsUI();
        renderCalendar();
        refreshModalFields();
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
      if (confirm('すべてのタスクと記録を完全リセットしますか？この操作は取り消せません。')) {
        localStorage.removeItem('guti_data');
        updateTabsUI();
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
  updateTabsUI();
  setupNavigation();
  setupSettings();
  renderCalendar();
});
