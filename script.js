const plannerForm = document.querySelector("#planner-form");
const exportButton = document.querySelector("#export-button");
const planningNameInput = document.querySelector("#planning-name");
const planningMonthInput = document.querySelector("#planning-month");
const planningShiftInput = document.querySelector("#planning-shift");
const dailyNeededInput = document.querySelector("#daily-needed");
const staffNamesInput = document.querySelector("#staff-names");
const statusBanner = document.querySelector("#status-banner");
const outputTitle = document.querySelector("#output-title");
const planningHead = document.querySelector("#planning-head");
const planningBody = document.querySelector("#planning-body");

const summaryStaff = document.querySelector("#summary-staff");
const summaryDays = document.querySelector("#summary-days");
const summaryRequired = document.querySelector("#summary-required");
const summaryShift = document.querySelector("#summary-shift");

let latestPlanning = null;

const weekDays = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const monthNames = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre",
];

function parseNames(rawValue) {
  return rawValue
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean);
}

function getMonthDetails(monthValue) {
  const [yearText, monthText] = monthValue.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }

  const totalDays = new Date(year, monthIndex + 1, 0).getDate();

  return {
    year,
    monthIndex,
    totalDays,
    label: `${monthNames[monthIndex]} ${year}`,
  };
}

function buildSchedule(names, totalDays, dailyNeeded, shiftCode) {
  const assignments = new Map();
  const stats = new Map();

  names.forEach((name) => {
    assignments.set(name, Array(totalDays).fill("R"));
    stats.set(name, { worked: 0, consecutive: 0, lastDay: -10 });
  });

  const coverage = [];

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
    const sortedNames = [...names].sort((firstName, secondName) => {
      const first = stats.get(firstName);
      const second = stats.get(secondName);

      if (first.worked !== second.worked) {
        return first.worked - second.worked;
      }

      if (first.consecutive !== second.consecutive) {
        return first.consecutive - second.consecutive;
      }

      return first.lastDay - second.lastDay;
    });

    const selected = [];

    for (const name of sortedNames) {
      if (selected.length >= dailyNeeded) {
        break;
      }

      const personStats = stats.get(name);
      const workedYesterday = personStats.lastDay === dayIndex - 1;
      const nextConsecutive = workedYesterday ? personStats.consecutive + 1 : 1;

      if (nextConsecutive > 2) {
        continue;
      }

      selected.push(name);
    }

    if (selected.length < dailyNeeded) {
      for (const name of sortedNames) {
        if (selected.length >= dailyNeeded) {
          break;
        }

        if (!selected.includes(name)) {
          selected.push(name);
        }
      }
    }

    selected.forEach((name) => {
      assignments.get(name)[dayIndex] = shiftCode;
      const personStats = stats.get(name);
      const workedYesterday = personStats.lastDay === dayIndex - 1;

      personStats.worked += 1;
      personStats.consecutive = workedYesterday ? personStats.consecutive + 1 : 1;
      personStats.lastDay = dayIndex;
    });

    names.forEach((name) => {
      if (!selected.includes(name)) {
        const personStats = stats.get(name);
        personStats.consecutive = 0;
      }
    });

    coverage.push(selected.length);
  }

  return {
    assignments,
    coverage,
  };
}

function setStatus(message, tone) {
  statusBanner.textContent = message;
  statusBanner.className = `status-banner ${tone}`;
}

function renderPlanning(model) {
  const { names, monthDetails, schedule, shiftCode, dailyNeeded, title } = model;

  outputTitle.textContent = `${title} - ${monthDetails.label}`;
  planningHead.innerHTML = "";
  planningBody.innerHTML = "";

  const headerRow = document.createElement("tr");
  const labelCell = document.createElement("th");
  labelCell.textContent = "IDE";
  headerRow.appendChild(labelCell);

  for (let day = 1; day <= monthDetails.totalDays; day += 1) {
    const date = new Date(monthDetails.year, monthDetails.monthIndex, day);
    const th = document.createElement("th");
    th.innerHTML = `${day}<br>${weekDays[date.getDay()]}`;
    headerRow.appendChild(th);
  }

  const totalCell = document.createElement("th");
  totalCell.textContent = "Total";
  headerRow.appendChild(totalCell);
  planningHead.appendChild(headerRow);

  names.forEach((name) => {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.textContent = name;
    row.appendChild(nameCell);

    let workedCount = 0;

    schedule.assignments.get(name).forEach((value, index) => {
      const date = new Date(monthDetails.year, monthDetails.monthIndex, index + 1);
      const cell = document.createElement("td");
      cell.textContent = value;
      cell.classList.add("day-cell", `shift-${value.toLowerCase()}`);

      if (date.getDay() === 0 || date.getDay() === 6) {
        cell.classList.add("weekend-cell");
      }

      if (value === shiftCode) {
        workedCount += 1;
      }

      row.appendChild(cell);
    });

    const totalWorkedCell = document.createElement("td");
    totalWorkedCell.textContent = workedCount;
    totalWorkedCell.className = "coverage-ok";
    row.appendChild(totalWorkedCell);
    planningBody.appendChild(row);
  });

  const coverageRow = document.createElement("tr");
  const coverageLabel = document.createElement("td");
  coverageLabel.textContent = "Couverture";
  coverageRow.appendChild(coverageLabel);

  schedule.coverage.forEach((count, index) => {
    const date = new Date(monthDetails.year, monthDetails.monthIndex, index + 1);
    const cell = document.createElement("td");
    cell.textContent = `${count}/${dailyNeeded}`;
    cell.className = count >= dailyNeeded ? "coverage-ok" : "coverage-low";

    if (date.getDay() === 0 || date.getDay() === 6) {
      cell.classList.add("weekend-cell");
    }

    coverageRow.appendChild(cell);
  });

  const totalCoverage = document.createElement("td");
  totalCoverage.textContent = `${schedule.coverage.reduce((sum, value) => sum + value, 0)}`;
  totalCoverage.className = "coverage-ok";
  coverageRow.appendChild(totalCoverage);
  planningBody.appendChild(coverageRow);
}

function buildPlanningModel() {
  const names = parseNames(staffNamesInput.value);
  const monthDetails = getMonthDetails(planningMonthInput.value);
  const dailyNeeded = Number(dailyNeededInput.value);
  const shiftCode = planningShiftInput.value;
  const planningTitle = planningNameInput.value.trim() || "Planning IDE";

  if (!monthDetails) {
    setStatus("Le mois selectionne est invalide.", "status-warning");
    return null;
  }

  if (!names.length) {
    setStatus("Ajoute au moins un nom d'IDE pour generer le planning.", "status-warning");
    return null;
  }

  if (!Number.isInteger(dailyNeeded) || dailyNeeded < 1) {
    setStatus("Le nombre d'IDE necessaires par jour doit etre superieur a 0.", "status-warning");
    return null;
  }

  const schedule = buildSchedule(names, monthDetails.totalDays, dailyNeeded, shiftCode);
  const maxCoverage = names.length;
  const totalRequired = monthDetails.totalDays * dailyNeeded;

  const model = {
    names,
    monthDetails,
    dailyNeeded,
    shiftCode,
    title: planningTitle,
    schedule,
    totalRequired,
    maxCoverage,
  };

  summaryStaff.textContent = String(names.length);
  summaryDays.textContent = String(monthDetails.totalDays);
  summaryRequired.textContent = String(totalRequired);
  summaryShift.textContent = shiftCode === "J" ? "Jour" : "Nuit";

  if (maxCoverage < dailyNeeded) {
    setStatus(
      `Attention : ${names.length} IDE saisis pour un besoin de ${dailyNeeded} par jour. Le planning sera genere mais la couverture restera incomplete.`,
      "status-warning"
    );
  } else {
    setStatus(
      `Planning ${shiftCode === "J" ? "jour" : "nuit"} genere pour ${monthDetails.label} avec ${names.length} IDE et ${dailyNeeded} IDE attendus par jour.`,
      "status-success"
    );
  }

  return model;
}

function exportPlanningToExcel(model) {
  const { names, monthDetails, schedule, shiftCode, dailyNeeded, title } = model;

  const headerCells = [];
  for (let day = 1; day <= monthDetails.totalDays; day += 1) {
    const date = new Date(monthDetails.year, monthDetails.monthIndex, day);
    headerCells.push(`<th>${day}<br>${weekDays[date.getDay()]}</th>`);
  }

  const bodyRows = names.map((name) => {
    const cells = schedule.assignments.get(name).map((value, index) => {
      const date = new Date(monthDetails.year, monthDetails.monthIndex, index + 1);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const background = value === "J" ? "#d95d39" : value === "N" ? "#355c7d" : "#eef2f5";
      const color = value === "R" ? "#52606b" : "#ffffff";
      const border = isWeekend ? "2px solid #f1dfcf" : "1px solid #d9dee4";
      return `<td style="background:${background};color:${color};border:${border};font-weight:700;text-align:center;">${value}</td>`;
    });

    const totalWorked = schedule.assignments.get(name).filter((value) => value === shiftCode).length;

    return `<tr>
      <td style="font-weight:700;border:1px solid #d9dee4;background:#ffffff;">${name}</td>
      ${cells.join("")}
      <td style="font-weight:700;border:1px solid #d9dee4;background:#eef8f3;color:#155940;">${totalWorked}</td>
    </tr>`;
  });

  const coverageCells = schedule.coverage.map((count, index) => {
    const date = new Date(monthDetails.year, monthDetails.monthIndex, index + 1);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const background = count >= dailyNeeded ? "#dff3ea" : "#f8e2d1";
    const color = count >= dailyNeeded ? "#155940" : "#8b4c14";
    const border = isWeekend ? "2px solid #f1dfcf" : "1px solid #d9dee4";

    return `<td style="background:${background};color:${color};border:${border};font-weight:700;text-align:center;">${count}/${dailyNeeded}</td>`;
  });

  const html = `<!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; }
      table { border-collapse: collapse; }
      th { background: #fff6ed; border: 1px solid #d9dee4; padding: 8px; }
      td { padding: 8px; }
      .meta { margin-bottom: 14px; }
    </style>
  </head>
  <body>
    <div class="meta">
      <h2>${title} - ${monthDetails.label}</h2>
      <p>Type : ${shiftCode === "J" ? "Jour" : "Nuit"} | Besoin quotidien : ${dailyNeeded} IDE | Duree : 12h</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>IDE</th>
          ${headerCells.join("")}
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows.join("")}
        <tr>
          <td style="font-weight:700;border:1px solid #d9dee4;background:#ffffff;">Couverture</td>
          ${coverageCells.join("")}
          <td style="font-weight:700;border:1px solid #d9dee4;background:#eef8f3;">${schedule.coverage.reduce((sum, value) => sum + value, 0)}</td>
        </tr>
      </tbody>
    </table>
  </body>
  </html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeMonth = `${monthDetails.year}-${String(monthDetails.monthIndex + 1).padStart(2, "0")}`;

  link.href = url;
  link.download = `${title.replaceAll(" ", "_")}_${safeMonth}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

plannerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const model = buildPlanningModel();

  if (!model) {
    return;
  }

  latestPlanning = model;
  renderPlanning(model);
});

exportButton.addEventListener("click", () => {
  if (!latestPlanning) {
    const model = buildPlanningModel();

    if (!model) {
      return;
    }

    latestPlanning = model;
    renderPlanning(model);
  }

  exportPlanningToExcel(latestPlanning);
});

const initialModel = buildPlanningModel();

if (initialModel) {
  latestPlanning = initialModel;
  renderPlanning(initialModel);
}
