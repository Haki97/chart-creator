// DOM references
const fileInput = document.getElementById('fileInput');
const manualDataTextarea = document.getElementById('manualData');
const parseDataBtn = document.getElementById('parseDataBtn');
const hasHeaderCheckbox = document.getElementById('hasHeader');

// Table preview
const tablePreview = document.getElementById('tablePreview');

// Chart config
const xColumnSelect = document.getElementById('xColumnSelect');
const yColumnsSelect = document.getElementById('yColumnsSelect');
const chartTypeSelect = document.getElementById('chartType');

// Generate Chart button
const generateChartBtn = document.getElementById('generateChartBtn');
const downloadChartBtn = document.getElementById('downloadChartBtn');

let parsedRows = []; // con header -> array di oggetti, senza header -> array di array
let fields = [];     // intestazioni (se header=true) o colN (se header=false)
let myChart = null;  // chart instance

/****************************************************************************
 * STEP 1: Parse data from CSV / JSON
 ****************************************************************************/
parseDataBtn.addEventListener('click', () => {
  const textData = manualDataTextarea.value.trim();

  // Se il file input è stato usato
  if (fileInput.files && fileInput.files.length > 0) {
    // Leggiamo dal file selezionato
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
      const content = e.target.result;
      handleParsing(content, file.name);
    };
    reader.readAsText(file);
  } else {
    // Altrimenti, parse i dati incollati in textarea
    if (textData) {
      // Non abbiamo un "nome file", ma possiamo passare un generico
      handleParsing(textData, 'manualInput.csv');
    } else {
      alert('Nessun dato fornito!');
    }
  }
});

function handleParsing(content, fileName) {
  // Proviamo a capire se è JSON o CSV
  if (fileName.toLowerCase().endsWith('.json') || isJson(content)) {
    try {
      const jsonData = JSON.parse(content);
      // Devi convertire jsonData in una forma unificata -> array di oggetti
      // Se jsonData è già un array di oggetti, siamo a posto
      if (!Array.isArray(jsonData)) {
        alert('JSON non è un array!');
        return;
      }
      // Se ha una forma del tipo: [ {A: val, B: val, ...}, {...} ]
      parsedRows = jsonData;
      // fields -> estrai le chiavi unendo tutto
      fields = getFieldsFromJson(parsedRows);
      // Render tabella
      renderTable(parsedRows, fields);
      // Popola select
      populateColumnSelectors(fields);
    } catch (err) {
      alert('Errore nel parsing del JSON');
      console.error(err);
    }
  } else {
    // Presumiamo che sia CSV
    parseCsvData(content);
  }
}

function isJson(str) {
  return str.startsWith('{') || str.startsWith('[');
}

/****************************************************************************
 * CSV Parsing
 ****************************************************************************/
function parseCsvData(csvString) {
  const hasHeader = hasHeaderCheckbox.checked;
  const result = Papa.parse(csvString, {
    header: hasHeader,
    skipEmptyLines: true,
    delimiter: ',' // cambiare se serve ;
  });

  if (result.errors && result.errors.length > 0) {
    console.error(result.errors);
    alert('Errore nel parsing CSV (vedi console)');
    return;
  }

  if (hasHeader) {
    // array di oggetti
    parsedRows = result.data; // es. [ {A: val, B: val, ...}, {...} ]
    fields = result.meta.fields; // es. ["A","B","C","D"]
  } else {
    // array di array
    parsedRows = result.data; // es. [ ["A","B","C"], ["valA","valB","valC"] ]
    // Genera intestazioni fittizie: col1, col2, ...
    const colCount = parsedRows[0].length;
    fields = [];
    for (let i = 0; i < colCount; i++) {
      fields.push(`Col${i+1}`);
    }
  }

  // Mostra tabella
  renderTable(parsedRows, fields);
  // Popola select
  populateColumnSelectors(fields);
}

/****************************************************************************
 * 2) Render Table Preview
 ****************************************************************************/
function renderTable(data, fields) {
  tablePreview.innerHTML = '';
  const table = document.createElement('table');

  // Thead
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  fields.forEach(f => {
    const th = document.createElement('th');
    th.textContent = f;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  // Tbody
  const tbody = document.createElement('tbody');

  // Se data è array di oggetti
  if (typeof data[0] === 'object' && !Array.isArray(data[0])) {
    data.forEach(rowObj => {
      const tr = document.createElement('tr');
      fields.forEach(f => {
        const td = document.createElement('td');
        td.textContent = rowObj[f];
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  } else {
    // data è array di array
    data.forEach(rowArray => {
      const tr = document.createElement('tr');
      rowArray.forEach(cell => {
        const td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  table.appendChild(thead);
  table.appendChild(tbody);
  tablePreview.appendChild(table);
}

/****************************************************************************
 * 3) Populate column selectors (X axis, Y axis)
 ****************************************************************************/
function populateColumnSelectors(fields) {
  xColumnSelect.innerHTML = '';
  yColumnsSelect.innerHTML = '';

  fields.forEach(f => {
    const optX = document.createElement('option');
    optX.value = f;
    optX.textContent = f;
    xColumnSelect.appendChild(optX);

    const optY = document.createElement('option');
    optY.value = f;
    optY.textContent = f;
    yColumnsSelect.appendChild(optY);
  });
}

/****************************************************************************
 * 4) Generate Chart
 ****************************************************************************/
generateChartBtn.addEventListener('click', () => {
  if (!parsedRows || !fields.length) {
    alert('Nessun dato disponibile. Fai prima il parsing!');
    return;
  }

  const xCol = xColumnSelect.value;
  const yCols = Array.from(yColumnsSelect.selectedOptions).map(o => o.value);
  const chartType = chartTypeSelect.value;

  // Costruiamo labels e datasets
  let labels = [];
  let datasets = [];

  // Distinzione fra array di oggetti e array di array
  if (typeof parsedRows[0] === 'object' && !Array.isArray(parsedRows[0])) {
    // array di oggetti
    labels = parsedRows.map(row => row[xCol]);
    datasets = yCols.map(colName => {
      const data = parsedRows.map(row => parseFloat(row[colName]));
      return {
        label: colName,
        data,
        backgroundColor: randomColor(),
        borderColor: randomColor(),
        borderWidth: 1
      };
    });
  } else {
    // array di array
    // Trovare l'indice di xCol
    const xIndex = fields.indexOf(xCol);
    // Indici delle yCols
    const yIndexes = yCols.map(colName => fields.indexOf(colName));

    labels = parsedRows.map(rowArray => rowArray[xIndex]);
    datasets = yIndexes.map((yIdx, i) => {
      const colName = yCols[i];
      const data = parsedRows.map(rowArray => parseFloat(rowArray[yIdx]));
      return {
        label: colName,
        data,
        backgroundColor: randomColor(),
        borderColor: randomColor(),
        borderWidth: 1
      };
    });
  }

  createOrUpdateChart(chartType, labels, datasets);
});

/****************************************************************************
 * Create or Update Chart
 ****************************************************************************/
function createOrUpdateChart(chartType, labels, datasets) {
  // distrugge eventuale chart esistente
  if (myChart) {
    myChart.destroy();
  }
  const ctx = document.getElementById('myChart').getContext('2d');
  myChart = new Chart(ctx, {
    type: chartType,
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

/****************************************************************************
 * 5) Download Chart
 ****************************************************************************/
downloadChartBtn.addEventListener('click', () => {
  if (!myChart) {
    alert('Non c\'è alcun grafico da scaricare!');
    return;
  }
  const link = document.createElement('a');
  link.download = 'chart.png';
  link.href = myChart.toBase64Image();
  link.click();
});

/****************************************************************************
 * Helpers
 ****************************************************************************/
function getFieldsFromJson(jsonArray) {
  // Raccogli tutte le chiavi presenti nel primo (o in tutti) oggetto
  // Opzionalmente potresti voler unire tutte le chiavi presenti in tutti gli oggetti
  const firstObj = jsonArray[0];
  return Object.keys(firstObj);
}

// Generatore di colori casuali in RGBA
function randomColor() {
  const r = Math.floor(Math.random() * 255);
  const g = Math.floor(Math.random() * 255);
  const b = Math.floor(Math.random() * 255);
  return `rgba(${r}, ${g}, ${b}, 0.6)`;
}
