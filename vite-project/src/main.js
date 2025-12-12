const listaAppunti = document.getElementById("listaAppunti");

// MAPPA PROVANDO
var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
});

const map = L.map('map').setView([45.55, 10.25], 13);

osm.addTo(map);

const blueIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
const redIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

setTimeout(() => {
    map.invalidateSize();
    console.log("Mappa inizializzata correttamente");
}, 100);

const luoghiLayer = L.layerGroup().addTo(map);  

function caricaLuoghiDaPB() {
    
    fetch('http://127.0.0.1:8090/api/collections/LUOGO/records')
      .then(r => r.json())
      .then(recordsData => {
        fetch('http://127.0.0.1:8090/api/collections/LUOGO/stato')
          .then(r => r.json())
          .then(statoData => {
            luoghiLayer.clearLayers();
            listaAppunti.innerHTML = '';
            if (!recordsData || !recordsData.items) return;

            const statoMap = new Map();
            if (statoData && statoData.items) {
                for (const s of statoData.items) {
                    if (s && s.luogoId) statoMap.set(s.luogoId, s.stato);
                }
            }

            const filter = document.getElementById('filterSelect');
            const currentFilter = filter ? filter.value : 'all';
            
            for (const item of recordsData.items) {
                const lat = parseFloat(item.lat);
                const lng = parseFloat(item.lng);
                const title = item.title || item.coord || 'Punto salvato';
                const stato = (statoMap.has(item.id) ? statoMap.get(item.id) : (item.stato || 'non raggiunto'));

                if (currentFilter === 'raggiunti' && stato !== 'raggiunto') continue;
                if (currentFilter === 'non_raggiunti' && stato === 'raggiunto') continue;

                if (!isNaN(lat) && !isNaN(lng)) {
                    // scegli icona in base allo stato
                    const markerIcon = (stato === 'raggiunto') ? redIcon : blueIcon;
                    // popup con feedback
                    const popupContent = `
                        <div>
                          <strong>${escapeHtml(title)}</strong>
                          <div style="margin-top:6px" id="feedbackDisplay-${item.id}">${escapeHtml(item.feedback || '')}</div>
                          <div style="margin-top:6px"><button id="editFeedback-${item.id}">Modifica feedback</button></div>
                        </div>
                    `;
                    const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(luoghiLayer).bindPopup(popupContent);

                    // quando il popup si apre colleghiamo listener per modificare/salvare il feedback
                    marker.on('popupopen', () => {
                        const editBtn = document.getElementById(`editFeedback-${item.id}`);
                        if (!editBtn) return;
                        editBtn.addEventListener('click', (ev) => {
                            ev.stopPropagation();
                            const display = document.getElementById(`feedbackDisplay-${item.id}`);
                            if (!display) return;
                            const current = item.feedback || '';
                            display.innerHTML = `<textarea id="feedbackTextarea-${item.id}" style="width:100%" rows="4">${escapeHtml(current)}</textarea><div style="margin-top:6px"><button id="saveFeedback-${item.id}">Salva feedback</button></div>`;
                            const saveBtn = document.getElementById(`saveFeedback-${item.id}`);
                            if (!saveBtn) return;
                            saveBtn.addEventListener('click', () => {
                                const txt = document.getElementById(`feedbackTextarea-${item.id}`);
                                const val = txt ? txt.value.trim() : '';
                                fetch(`http://127.0.0.1:8090/api/collections/LUOGO/records/${item.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ feedback: val })
                                }).then(res => { if (res.ok) { caricaLuoghiDaPB(); marker.closePopup(); } else { alert('Errore salvataggio feedback'); } });
                            });
                        });
                    });

                    const div = document.createElement('div');
                    div.className = 'appunto-item';
                    if (stato === 'raggiunto') div.style.backgroundColor = '#d4edda';
                    // mostra anche il campo country se disponibile
                    let contentHtml = `<strong>${escapeHtml(title)}</strong><br/>${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                    if (item.country) contentHtml += `<br/><small>${escapeHtml(item.country)}</small>`;
                    if (item.feedback) contentHtml += `<br/><small>Feedback: ${escapeHtml(item.feedback)}</small>`;
                     div.innerHTML = contentHtml;
                     div.style.cursor = 'pointer';


                    const delBtn = document.createElement('button');
                    delBtn.textContent = 'Elimina';
                    delBtn.style.marginLeft = '8px';
                    delBtn.onclick = (ev) => { ev.stopPropagation(); if (!item.id) return; fetch(`http://127.0.0.1:8090/api/collections/LUOGO/records/${item.id}`, { method: 'DELETE' }).then(() => caricaLuoghiDaPB()); };
                    div.appendChild(delBtn);

                    // bottone toggle stato (usa PATCH sul record LUOGO)
                    const statoBtn = document.createElement('button');
                    statoBtn.textContent = (stato === 'raggiunto') ? 'Raggiunto' : 'Non raggiunto';
                    statoBtn.style.marginLeft = '8px';
                    statoBtn.onclick = (ev) => {
                        ev.stopPropagation();
                        if (!item.id) return;
                        const nuovo = (stato === 'raggiunto') ? 'non raggiunto' : 'raggiunto';
                        fetch(`http://127.0.0.1:8090/api/collections/LUOGO/records/${item.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ stato: nuovo })
                        }).then(res => { if (res.ok) caricaLuoghiDaPB(); });
                    };
                    div.appendChild(statoBtn);

                    div.addEventListener('click', () => { map.setView([lat, lng], 13); marker.openPopup(); });

                    listaAppunti.appendChild(div);
                }
            }
          });
      })
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}


caricaLuoghiDaPB();

// applica immediatamente il filtro quando l'utente cambia selezione
const filterSelectEl = document.getElementById('filterSelect');
if (filterSelectEl) {
    filterSelectEl.addEventListener('change', () => {
        caricaLuoghiDaPB();
    });
}

//RICERCA
const searchInput = document.getElementById('searchInput');
// debounce helper
function debounce(fn, wait) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  }
}

function doSearchQuery() {
  const q = (searchInput ? searchInput.value.trim().toLowerCase() : '');
  if (!q) {
    // se vuoto ripristina la lista principale
    caricaLuoghiDaPB();
    return;
  }

  fetch('http://127.0.0.1:8090/api/collections/LUOGO/records')
    .then(r => r.json())
    .then(data => {
      listaAppunti.innerHTML = '';
      luoghiLayer.clearLayers();
      if (!data || !data.items) return;
      for (const item of data.items) {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lng);
        const title = (item.title || item.coord || 'Punto salvato');
        const stato = item.stato || 'non raggiunto';
        const filter = document.getElementById('filterSelect');
        const currentFilter = filter ? filter.value : 'all';
        if (currentFilter === 'raggiunti' && stato !== 'raggiunto') continue;
        if (currentFilter === 'non_raggiunti' && stato === 'raggiunto') continue;

        const matchesTitle = title.toLowerCase().includes(q);
        const matchesCountry = item.country ? (String(item.country).toLowerCase().includes(q)) : false;

        if ((matchesTitle || matchesCountry) && !isNaN(lat) && !isNaN(lng)) {
          const markerIcon = (stato === 'raggiunto') ? redIcon : blueIcon;
          const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(luoghiLayer).bindPopup(title);

          const div = document.createElement('div');
          div.className = 'appunto-item';
          if (stato === 'raggiunto') div.style.backgroundColor = '#d4edda';
          let contentHtml = `<strong>${escapeHtml(title)}</strong><br/>${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          if (item.country) contentHtml += `<br/><small>${escapeHtml(item.country)}</small>`;
          if (item.feedback) contentHtml += `<br/><small>Feedback: ${escapeHtml(item.feedback)}</small>`;
          div.innerHTML = contentHtml;
          div.style.cursor = 'pointer';

          const delBtn = document.createElement('button');
          delBtn.textContent = 'Elimina';
          delBtn.style.marginLeft = '8px';
          delBtn.addEventListener('click', (ev) => {
              ev.stopPropagation();
              if (!confirm(`Eliminare "${title}"?`)) return;
              if (!item.id) { alert('ID record non disponibile'); return; }
              fetch(`http://127.0.0.1:8090/api/collections/LUOGO/records/${item.id}`, { method: 'DELETE' })
                .then(res => { if (res.ok) { caricaLuoghiDaPB(); } else { alert("Errore durante l'eliminazione"); } })
          });

          // bottone toggle stato (come nella lista principale)
          const statoBtn = document.createElement('button');
          statoBtn.textContent = (stato === 'raggiunto') ? 'Raggiunto' : 'Non raggiunto';
          statoBtn.style.marginLeft = '8px';
          statoBtn.addEventListener('click', (ev) => {
              ev.stopPropagation();
              if (!item.id) return;
              const nuovo = (stato === 'raggiunto') ? 'non raggiunto' : 'raggiunto';
              fetch(`http://127.0.0.1:8090/api/collections/LUOGO/records/${item.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ stato: nuovo })
              }).then(res => { if (res.ok) {
                  // aggiorna vista ricerca
                  doSearchQuery();
              } });
          });

          div.appendChild(delBtn);
          div.appendChild(statoBtn);

          div.addEventListener('click', () => {
            map.setView([lat, lng], 13);
            marker.openPopup();
          });

          listaAppunti.appendChild(div);
        }
      }
    })
}

if (searchInput) {
  const debounced = debounce(doSearchQuery, 250);
  searchInput.addEventListener('input', debounced);
  // supporta anche Enter per l'esecuzione immediata
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSearchQuery(); } });
}

function onMapClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    const popupContent = `  
        <div>
            <div><strong>Lat:</strong> ${lat.toFixed(5)}</div>
            <div><strong>Lng:</strong> ${lng.toFixed(5)}</div>
            <div style="margin-top:6px"><input id="saveTitle" placeholder="Titolo (es: Casa, Punto 1)" style="width:100%" /></div>
            <button id="saveCoordBtn" style="margin-top:6px">Salva coordinate</button>
            <div id="saveStatus" style="margin-top:6px;font-size:90%"></div>
        </div>
    `;

    const popup = L.popup()
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(map);

    setTimeout(() => {
        const btn = document.getElementById('saveCoordBtn');
        const status = document.getElementById('saveStatus');
        const titleInput = document.getElementById('saveTitle');
        if (!btn) return;

        // replace button with a clean clone to remove previous listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', () => {
            newBtn.disabled = true;
            newBtn.textContent = 'Salvando...';
            if (status) status.textContent = '';
            const titleVal = titleInput ? titleInput.value.trim() : '';

            // prima del salvataggio facciamo reverse-geocoding per ottenere il paese (country)
            fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=it`)
            .then(r => r.ok ? r.json() : null)
            .then(geo => {
                let countryName = '';
                if (geo && geo.address) {
                    // preferiamo country, altrimenti proviamo state/region
                    countryName = geo.address.country || geo.address.state || geo.address.region || '';
                }
                return fetch('http://127.0.0.1:8090/api/collections/LUOGO/records', {
                     method: 'POST',
                     headers: {
                         'Content-Type': 'application/json'
                     },
                     body: JSON.stringify({
                         lat: lat,
                         lng: lng,
                         title: titleVal,
                         coord: `${lat}|${lng}`,
                         coordinate: {
                             lat: lat,
                             lon: lng
                         },
                        country: countryName,
                        feedback: ''
                     })
                 });
            })
            .then(res => {
                if (!res || !res.ok) {
                    newBtn.disabled = false;
                    newBtn.textContent = 'Salva coordinate';
                    if (status) status.textContent = 'Errore durante il reverse-geocoding o il salvataggio.';
                    return null;
                }
                return res.json();
            })
            .then(result => {
                if (!result) return;
                caricaLuoghiDaPB();
                map.closePopup();
                newBtn.disabled = false;
                newBtn.textContent = 'Salvato';
            })
        });
    }, 50);
}

map.on('click', onMapClick);

