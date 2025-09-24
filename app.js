// Utility: nice number formatting
const fmt = (n, d=2) => (Number.isFinite(n) ? n.toFixed(d) : '–');

// Install prompt handling
let deferredPrompt;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.disabled = false;
});
installBtn?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice; // { outcome: 'accepted'|'dismissed', platform }
  deferredPrompt = null;
  installBtn.disabled = true;
});

// === Motion Sensors ===
const ax = document.getElementById('ax');
const ay = document.getElementById('ay');
const az = document.getElementById('az');
const gx = document.getElementById('gx');
const gy = document.getElementById('gy');
const gz = document.getElementById('gz');
const oa = document.getElementById('oa');
const ob = document.getElementById('ob');
const og = document.getElementById('og');

let accel, gyro; // Generic Sensor instances
let dmHandler, doHandler; // fallback handlers

async function startMotion() {
  try {
    // On some browsers (iOS), you must request permission explicitly
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      await DeviceMotionEvent.requestPermission();
    }
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      await DeviceOrientationEvent.requestPermission();
    }
  } catch (err) {
    console.warn('Motion permission request:', err);
  }

  // Prefer Generic Sensor API when available (Chrome/Android)
  if ('Accelerometer' in window && 'Gyroscope' in window) {
    try {
      accel = new Accelerometer({ frequency: 30 });
      gyro = new Gyroscope({ frequency: 30 });
      accel.addEventListener('reading', () => {
        ax.textContent = fmt(accel.x);
        ay.textContent = fmt(accel.y);
        az.textContent = fmt(accel.z);
      });
      gyro.addEventListener('reading', () => {
        gx.textContent = fmt(gyro.x);
        gy.textContent = fmt(gyro.y);
        gz.textContent = fmt(gyro.z);
      });
      accel.start();
      gyro.start();
    } catch (e) {
      console.warn('Generic Sensor API error, falling back:', e);
      fallbackMotion();
    }
  } else {
    fallbackMotion();
  }

  // Orientation via DeviceOrientationEvent (alpha,beta,gamma)
  doHandler = (ev) => {
    oa.textContent = fmt(ev.alpha);
    ob.textContent = fmt(ev.beta);
    og.textContent = fmt(ev.gamma);
  };
  window.addEventListener('deviceorientation', doHandler);
}

function fallbackMotion() {
  dmHandler = (ev) => {
    if (ev.accelerationIncludingGravity) {
      const a = ev.accelerationIncludingGravity;
      ax.textContent = fmt(a.x);
      ay.textContent = fmt(a.y);
      az.textContent = fmt(a.z);
    }
    if (ev.rotationRate) {
      const r = ev.rotationRate;
      gx.textContent = fmt(r.alpha);
      gy.textContent = fmt(r.beta);
      gz.textContent = fmt(r.gamma);
    }
  };
  window.addEventListener('devicemotion', dmHandler);
}

function stopMotion() {
  try { accel && accel.stop(); } catch {}
  try { gyro && gyro.stop(); } catch {}
  if (dmHandler) window.removeEventListener('devicemotion', dmHandler);
  if (doHandler) window.removeEventListener('deviceorientation', doHandler);
}

document.getElementById('startMotion')?.addEventListener('click', startMotion);

document.getElementById('stopMotion')?.addEventListener('click', stopMotion);

// === Geolocation ===
const lat = document.getElementById('lat');
const lng = document.getElementById('lng');
const acc = document.getElementById('acc');
const spd = document.getElementById('spd');
const geoRaw = document.getElementById('geoRaw');
let geoWatchId = null;

function pretty(obj) {
  try {
    // Convert to plain JSON, including nested objects
    return JSON.stringify(obj, (k, v) => (v instanceof DOMStringList ? Array.from(v) : v), 2);
  } catch (e) {
    return String(obj);
  }
}

async function reportPermission() {
  if (!('permissions' in navigator) || !navigator.permissions.query) return;
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    geoRaw.textContent = `[permission] geolocation: ${status.state}`;
    status.onchange = () => {
      geoRaw.textContent = `[permission] geolocation: ${status.state}`;
    };
  } catch {}
}
reportPermission();

function onGeoSuccess(pos) {
  const { latitude, longitude, accuracy, speed, altitude, altitudeAccuracy, heading } = pos.coords;
  lat.textContent = fmt(latitude, 6);
  lng.textContent = fmt(longitude, 6);
  acc.textContent = fmt(accuracy, 1);
  spd.textContent = Number.isFinite(speed) ? fmt(speed, 2) : '–';
  const payload = {
    timestamp: pos.timestamp,
    coords: {
      latitude, longitude, accuracy,
      speed, altitude, altitudeAccuracy, heading
    }
  };
  geoRaw.textContent = pretty(payload);
}

function onGeoError(err) {
  geoRaw.textContent = pretty({ error: { code: err.code, message: err.message, name: err.name } });
}

document.getElementById('startGeo')?.addEventListener('click', () => {
  if (!('geolocation' in navigator)) {
    alert('Geolocation not supported.');
    return;
  }
  if (geoWatchId) navigator.geolocation.clearWatch(geoWatchId);
  geoWatchId = navigator.geolocation.watchPosition(
    onGeoSuccess,
    onGeoError,
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
  );
});

document.getElementById('stopGeo')?.addEventListener('click', () => {
  if (geoWatchId) navigator.geolocation.clearWatch(geoWatchId);
  geoWatchId = null;
  geoRaw.textContent = '(stopped)';
});

// === Battery ===
const batLvl = document.getElementById('batLvl');
const batChg = document.getElementById('batChg');
if ('getBattery' in navigator) {
  navigator.getBattery().then((bat) => {
    const render = () => {
      batLvl.textContent = (bat.level * 100).toFixed(0) + '%';
      batChg.textContent = bat.charging ? 'Yes' : 'No';
    };
    render();
    bat.addEventListener('levelchange', render);
    bat.addEventListener('chargingchange', render);
  }).catch(console.warn);
}

// === Ambient Light ===
const lux = document.getElementById('lux');
if ('AmbientLightSensor' in window) {
  try {
    const als = new AmbientLightSensor({ frequency: 5 });
    als.addEventListener('reading', () => { lux.textContent = fmt(als.illuminance, 0); });
    als.start();
  } catch (e) {
    console.warn('AmbientLightSensor error:', e);
  }
} else if ('ondevicelight' in window) {
  // Older API (rare)
  window.addEventListener('devicelight', (e) => { lux.textContent = fmt(e.value, 0); });
}

// === Web NFC (Android Chrome) ===
const nfcOut = document.getElementById('nfcOut');
const scanBtn = document.getElementById('scanNfc');
scanBtn?.addEventListener('click', async () => {
  if (!('NDEFReader' in window)) return alert('Web NFC not supported on this device/browser.');
  try {
    const reader = new NDEFReader();
    await reader.scan();
    reader.onreading = (event) => {
      try {
        for (const record of event.message.records) {
          if (record.recordType === 'text') {
            const textDecoder = new TextDecoder(record.encoding || 'utf-8');
            nfcOut.textContent = textDecoder.decode(record.data);
          }
        }
      } catch (e) { console.warn('NFC parse:', e); }
    };
  } catch (err) {
    alert('NFC scan error: ' + err.message);
  }
});