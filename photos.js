const IMAGE_W = 600;
const IMAGE_H = 800;

const db = new Promise((resolve, reject) => {
  const request = indexedDB.open("puzzle-photos", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("photos", { keyPath: "id", autoIncrement: true });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

async function store(mode, action) {
  const store = (await db).transaction("photos", mode).objectStore("photos");
  return new Promise((resolve, reject) => {
    const request = action(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const listPhotos = () => store("readonly", (s) => s.getAll());
const savePhoto = (photo) => store("readwrite", (s) => s.put(photo));
const removePhoto = (id) => store("readwrite", (s) => s.delete(id));

async function cropToPuzzle(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.max(IMAGE_W / bitmap.width, IMAGE_H / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_W;
  canvas.height = IMAGE_H;
  canvas.getContext("2d").drawImage(bitmap, (IMAGE_W - bitmap.width * scale) / 2, (IMAGE_H - bitmap.height * scale) / 2, bitmap.width * scale, bitmap.height * scale);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
}

async function addPhoto(file) {
  return savePhoto({ blob: await cropToPuzzle(file), released: false });
}
