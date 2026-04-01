export function initBooking(app: HTMLElement, apiUrl: string) {
  const now = new Date();
  let currentYear = now.getFullYear();
  let currentMonth = now.getMonth();
  let selectedDate: string | null = null;
  let selectedSlot: { start: string; end: string } | null = null;

  const connectionId = new URLSearchParams(window.location.search).get("connectionId") ?? "1";

  function escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function renderCalendar() {
    const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();

    let daysHtml = '<span style="font-size:11px;color:#999;">日</span><span style="font-size:11px;color:#999;">月</span><span style="font-size:11px;color:#999;">火</span><span style="font-size:11px;color:#999;">水</span><span style="font-size:11px;color:#999;">木</span><span style="font-size:11px;color:#999;">金</span><span style="font-size:11px;color:#999;">土</span>';
    for (let i = 0; i < firstDay; i++) daysHtml += "<span></span>";
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isToday = today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === d;
      const isPast = new Date(dateStr) < new Date(today.toDateString());
      const isSelected = dateStr === selectedDate;
      daysHtml += `<span class="day${isToday ? " today" : ""}${isPast ? " disabled" : ""}${isSelected ? " selected" : ""}" data-date="${dateStr}">${d}</span>`;
    }

    app.innerHTML = `
      <div class="container">
        <div class="card">
          <h1>日程を選択</h1>
          <div class="calendar-nav">
            <button id="prevMonth" class="btn btn-secondary" style="width:auto;padding:8px 16px;margin:0;">◀</button>
            <strong>${currentYear}年 ${monthNames[currentMonth]}</strong>
            <button id="nextMonth" class="btn btn-secondary" style="width:auto;padding:8px 16px;margin:0;">▶</button>
          </div>
          <div class="days">${daysHtml}</div>
        </div>
        <div id="slotsContainer"></div>
      </div>
    `;

    document.getElementById("prevMonth")?.addEventListener("click", () => {
      if (currentMonth === 0) { currentYear--; currentMonth = 11; } else { currentMonth--; }
      renderCalendar();
    });

    document.getElementById("nextMonth")?.addEventListener("click", () => {
      if (currentMonth === 11) { currentYear++; currentMonth = 0; } else { currentMonth++; }
      renderCalendar();
    });

    document.querySelectorAll(".day:not(.disabled)").forEach((el) => {
      el.addEventListener("click", async () => {
        selectedDate = (el as HTMLElement).dataset.date ?? null;
        renderCalendar();
        if (selectedDate) await loadSlots(selectedDate);
      });
    });
  }

  async function loadSlots(date: string) {
    const container = document.getElementById("slotsContainer")!;
    container.innerHTML = '<div class="card loading">空き時間を確認中...</div>';
    const res = await fetch(`${apiUrl}/api/integrations/google-calendar/slots?connectionId=${connectionId}&date=${date}`);
    const data = await res.json() as { success: boolean; data: Array<{ start: string; end: string }> };
    if (!data.success || data.data.length === 0) {
      container.innerHTML = '<div class="card"><p>この日は空き時間がありません</p></div>';
      return;
    }
    container.innerHTML = `
      <div class="card">
        <h1>時間を選択</h1>
        ${data.data.map((slot, i) => `
          <div class="slot${selectedSlot?.start === slot.start ? " selected" : ""}" data-index="${i}">
            <span>${formatDate(slot.start)} - ${formatDate(slot.end).split(" ")[1]}</span>
            <span>○</span>
          </div>
        `).join("")}
        <button class="btn" id="confirmBtn" ${!selectedSlot ? "disabled" : ""}>予約を確定する</button>
      </div>
    `;
    data.data.forEach((slot, i) => {
      document.querySelector(`[data-index="${i}"]`)?.addEventListener("click", () => {
        selectedSlot = slot;
        loadSlots(date);
      });
    });
    document.getElementById("confirmBtn")?.addEventListener("click", async () => {
      if (!selectedSlot) return;
      await fetch(`${apiUrl}/api/integrations/google-calendar/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: Number(connectionId), startTime: selectedSlot.start, endTime: selectedSlot.end, title: "予約" }),
      });
      container.innerHTML = '<div class="card success"><div class="icon">✅</div><h1>予約完了</h1><p>ご予約ありがとうございます。</p></div>';
    });
  }

  renderCalendar();
}
