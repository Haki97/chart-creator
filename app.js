// Selezione degli elementi dal DOM
const fileInput = document.getElementById('fileInput');
const manualDataTextarea = document.getElementById('manualData');
const renderChartBtn = document.getElementById('renderChartBtn');
const downloadChartBtn = document.getElementById('downloadChartBtn');
let myChart; // Riferimento al grafico Chart.js

// 1. Caricare i dati da file
fileInput.addEventListener('change', handleFileUpload);
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const fileContent = e.target.result;
    // Proviamo prima come CSV, se non funziona passiamo a JSON
    if (file.type === 'application/json') {
      const parsedData = JSON.parse(fileContent);
      manualDataTextarea.value = JSON.stringify(parsedData, null, 2);
    } else {
      // Potresti aggiungere una vera e propria funzione di parse CSV
      // Per ora ci limitiamo a mostrare il contenuto in textarea
      manualDataTextarea.value = fileContent;
    }
  };
  reader.readAsText(file);
}

// 2. Genera il grafico quando si clicca sul pulsante
renderChartBtn.addEventListener('click', () => {
  // Leggiamo i dati dal textarea
  const dataInput = manualDataTextarea.value;

  let labels = [];
  let dataPoints = [];

  // Per semplicità, supponiamo che il CSV sia del tipo:
  // label1,10
  // label2,20
  // label3,30
  // ...
  // Oppure dati JSON del tipo:
  // [
  //   { "label": "label1", "value": 10 },
  //   { "label": "label2", "value": 20 }
  // ]
  try {
    if (dataInput.trim().startsWith('[')) {
      // Proviamo a interpretarlo come JSON
      const jsonData = JSON.parse(dataInput.trim());
      labels = jsonData.map(item => item.label);
      dataPoints = jsonData.map(item => item.value);
    } else {
      // Proviamo a interpretarlo come CSV
      const rows = dataInput.trim().split('\n');
      rows.forEach(row => {
        const [label, value] = row.split(',');
        labels.push(label);
        dataPoints.push(parseFloat(value));
      });
    }
  } catch (error) {
    alert('Errore nella lettura dei dati. Assicurati che il formato sia corretto.');
    return;
  }

  // Se esiste già un grafico, lo distruggiamo prima di ricrearlo
  if (myChart) {
    myChart.destroy();
  }

  // Creiamo un nuovo grafico
  const ctx = document.getElementById('myChart').getContext('2d');
  myChart = new Chart(ctx, {
    type: 'bar', // potresti variare con 'line', 'pie', etc.
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Valori',
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
});

// 3. Scarica il grafico come immagine
downloadChartBtn.addEventListener('click', () => {
  if (!myChart) {
    alert('Non è presente alcun grafico da scaricare!');
    return;
  }
  const link = document.createElement('a');
  link.download = 'chart.png';
  link.href = myChart.toBase64Image();
  link.click();
});
