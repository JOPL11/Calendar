// src/utils/fileHandlers.js
// Check if File System Access API is available
const isFileSystemAccessAPIAvailable = () => {
  return 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
};

// Save data to a file using the best available method
export const saveToFile = async (data) => {
  // Try File System Access API first
  if (isFileSystemAccessAPIAvailable()) {
    try {
      const options = {
        suggestedName: 'calendar.json',
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] },
        }],
      };

      const handle = await window.showSaveFilePicker(options);
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      return handle;
    } catch (err) {
      console.warn('File System Access API failed, falling back to download method', err);
      // Fall through to download method
    }
  }
  
  // Fallback: Download file
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'calendar.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  // Return a dummy handle for consistency
  return { name: 'calendar.json' };
};

// Open and read a file using the best available method
export const openFromFile = async () => {
  // Try File System Access API first
  if (isFileSystemAccessAPIAvailable()) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] },
        }],
        multiple: false,
      });
      
      const file = await handle.getFile();
      const content = await file.text();
      const data = JSON.parse(content);
      
      return { data, handle };
    } catch (err) {
      console.warn('File System Access API failed, falling back to file input', err);
      // Fall through to file input method
    }
  }
  
  // Fallback: Use file input
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          resolve({ 
            data,
            // Return a dummy handle for consistency
            handle: { name: file.name }
          });
        } catch (err) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    };
    
    input.oncancel = () => reject(new Error('File selection cancelled'));
    input.click();
  });
};