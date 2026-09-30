/** Theme init script, shared by the server layout and ThemeToggle (kept out of the "use client" module so the server gets the real string). */
export const THEME_STORAGE_KEY = "pos-theme";

/** Runs before paint (inlined in <head>) so the saved theme never flashes. */
export const themeInitScript = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
