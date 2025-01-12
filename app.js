// DOM Elements
const fileInput = document.getElementById('fileInput');
const manualDataTextarea = document.getElementById('manualData');
const renderChartBtn = document.getElementById('renderChartBtn');
const downloadChartBtn = document.getElementById('downloadChartBtn');
const hasHeaderCheckbox = document.getElementById('hasHeader');

let myChart; // Reference to the Chart.js instance

/****************************************************************************
 * 1. Handle File Upload
 ****************************************************************************/
fileInput.addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const fileContent = e.target.result;

    // If the file is .json, parse as JSON directly
    if (file.name.toLowerCase().endsWith('.json')) {
      try {
        const parsedData = JSON.parse(fileContent);
        // Pretty-print JSON in the textarea
        manualDataTextarea.value = JSON.stringify(parsedData, null, 2);
      } catch (err) {
        alert('Error parsing JSON file. Check the console for details.');
        console.error(err);
      }
    } else {
      // It's presumably CSV. Just show it as text in the textarea
      manualDataTextarea.value = fileContent;
    }
  };
  reader.readAsText(file);
}

/****************************************************************************
 * 2. Render Chart
 ****************************************************************************/
renderChartBtn.addEventListener('click', () => {
  const inputData = manualDataTextarea.value.trim();

  // We'll attempt JSON first. If it fails, we'll handle CSV using PapaParse
  if (isJson(inputData)) {
    // Parse JSON
    try {
      const jsonData = JSON.parse(inputData);
      parseJsonData(jsonData);
    } catch (err) {
      alert('Error: Invalid JSON format.');
      console.error(err);
    }
  } else {
    // Parse CSV via PapaParse
    parseCsvData(inputData);
  }
});

/**
 * Check if the input starts with '[' or '{' to guess JSON
 */
function isJson(str) {
  return str.startsWith('{') || str.startsWith('[');
}

/****************************************************************************
 * 2.1 Parse JSON
 ****************************************************************************/
function parseJsonData(jsonData) {
  // We expect an array of objects like:
  // [
  //   { "label": "A", "value": 10 },
  //   { "label": "B", "value": 20 }
  // ]

  if (!Array.isArray(jsonData)) {
    alert('Error: JSON is not an array. Expected an array of objects.');
    return;
  }

  // Extract labels and data
  const labels = [];
  const dataPoints = [];

  jsonData.forEach(item => {
    // Adjust these keys if your JSON structure is different
    if (item.label === undefined || item.value === undefined) {
      console.warn('Missing "label" or "value" in JSON object:', item);
      return;
    }
    labels.push(item.label);
    dataPoints.push(parseFloat(item.value));
  });

  if (labels.length === 0) {
    alert('No valid data found in JSON array. Check console.');
    return;
  }

  createOrUpdateChart(labels, dataPoints);
}

/****************************************************************************
 * 2.2 Parse CSV using PapaParse
 ****************************************************************************/
function parseCsvData(csvString) {
  // If "CSV has header row" is checked, we parse with header=true
  const hasHeader = hasHeaderCheckbox.checked;

  const parseResult = Papa.parse(csvString, {
    header: hasHeader,
    skipEmptyLines: true,
    // Adjust delimiter if your CSV uses semicolons or tabs
    delimiter: ','
  });

  if (parseResult.errors && parseResult.errors.length > 0) {
    console.error('PapaParse errors:', parseResult.errors);
    alert('Error parsing CSV. Check console for more details.');
    return;
  }

  const parsedRows = parseResult.data; // This is an array of either arrays or objects
  let labels = [];
  let dataPoints = [];

  if (hasHeader) {
    // Example: Each row is an object { label: "A", value: "10" }
    for (let row of parsedRows) {
      // Adjust these keys if your CSV header is different
      if (!row.label || !row.value) {
        console.warn('Skipping invalid row:', row);
        continue;
      }
      labels.push(row.label);
      dataPoints.push(parseFloat(row.value));
    }
  } else {
    // Example: Each row is an array [ "A", "10" ]
    for (let row of parsedRows) {
      if (row.length < 2) {
        console.warn('Skipping invalid row:', row);
        continue;
      }
      labels.push(row[0]);
      dataPoints.push(parseFloat(row[1]));
    }
  }

  if (labels.length === 0 || dataPoints.length === 0) {
    alert('No valid rows found in CSV data. Check console.');
    return;
  }

  createOrUpdateChart(labels, dataPoints);
}

/****************************************************************************
 * 3. Create or Update Chart
 ****************************************************************************/
function createOrUpdateChart(labels, dataPoints) {
  // Destroy existing chart if any
  if (myChart) {
    myChart.destroy();
  }

  const ctx = document.getElementById('myChart').getContext('2d');
  myChart = new Chart(ctx, {
    type: 'bar', // change to 'line', 'pie', etc. as needed
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Values',
          data: dataPoints,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
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
 * 4. Download Chart
 ****************************************************************************/
downloadChartBtn.addEventListener('click', () => {
  if (!myChart) {
    alert('No chart to download!');
    return;
  }
  const link = document.createElement('a');
  link.download = 'chart.png';
  link.href = myChart.toBase64Image();
  link.click();
});
